<?php

namespace App\Http\Controllers;

use App\Enums\NotificationType;
use App\Enums\VerificationStatus;
use App\Models\Approval;
use App\Models\Document;
use App\Models\DocumentCategory;
use App\Models\DocumentRequirement;
use App\Models\DocumentVersion;
use App\Models\Notification;
use App\Models\Role;
use App\Models\Vessel;
use App\Services\AuditService;
use App\Services\ReminderService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class DocumentController extends Controller
{
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Document::class);

        $query = Document::with(['category'])
            ->orderByDesc('updated_at');

        if ($search = $request->string('search')->toString()) {
            $query->where(fn ($q) => $q
                ->where('document_name', 'like', "%{$search}%")
                ->orWhere('document_number', 'like', "%{$search}%"));
        }
        if ($group = $request->string('group')->toString()) {
            $query->whereHas('category', fn ($q) => $q->where('group_code', $group));
        }
        if ($ownerType = $request->string('owner_type')->toString()) {
            $query->where('owner_type', $ownerType);
        }
        if ($vesselId = $request->integer('vessel_id')) {
            $query->where('owner_type', 'vessel')->where('owner_id', $vesselId);
        }
        if ($status = $request->string('verification')->toString()) {
            $query->where('verification_status', $status);
        }
        if ($validity = $request->string('validity')->toString()) {
            match ($validity) {
                'expired' => $query->where('has_expiry', true)
                    ->whereNotNull('expiry_date')
                    ->whereDate('expiry_date', '<', now()->toDateString()),
                'expiring_soon' => $query->where('has_expiry', true)
                    ->whereNotNull('expiry_date')
                    ->whereBetween('expiry_date', [
                        now()->toDateString(),
                        now()->addDays(30)->toDateString(),
                    ]),
                'normal' => $query->where(function ($q) {
                    $q->where('has_expiry', false)
                        ->orWhereNull('expiry_date')
                        ->orWhereDate('expiry_date', '>', now()->addDays(30)->toDateString());
                }),
                'no_expiry' => $query->where(fn ($q) => $q
                    ->where('has_expiry', false)
                    ->orWhereNull('expiry_date')),
                default => null,
            };
        }

        $reminder = app(ReminderService::class);
        $vesselNames = \App\Models\Vessel::pluck('vessel_name', 'id');
        $crewNames = \App\Models\Crew::pluck('name', 'id');

        $documents = $query->paginate(15)->withQueryString()->through(function ($doc) use ($reminder, $vesselNames, $crewNames) {
            return $this->mapDocument($doc, $reminder, $vesselNames, $crewNames);
        });

        return Inertia::render('Documents/Index', [
            'documents' => $documents,
            'filters' => $request->only(['search', 'group', 'owner_type', 'vessel_id', 'verification', 'validity']),
            'categories' => DocumentCategory::orderBy('sort')->get(['code', 'name', 'group_code']),
            'vessels' => Vessel::orderBy('vessel_name')->get(['id', 'vessel_name', 'vessel_type']),
            'groupCounts' => DocumentCategory::selectRaw('group_code, count(*) as total')
                ->groupBy('group_code')
                ->pluck('total', 'group_code'),
            'validityCounts' => $this->validityCounts($reminder),
            'canCreate' => auth()->user()?->can('create', Document::class),
            'canVerify' => auth()->user()?->can('verify-documents'),
        ]);
    }

    public function create(Request $request): Response
    {
        $this->authorize('create', Document::class);

        return Inertia::render('Documents/Create', [
            'categories' => DocumentCategory::orderBy('sort')->get(['id', 'code', 'name', 'group_code']),
            'requirements' => DocumentRequirement::orderBy('sort')
                ->get(['code', 'name', 'group_code', 'applies_to', 'applicability', 'is_conditional']),
            'vessels' => Vessel::orderBy('vessel_name')->get(['id', 'vessel_name', 'vessel_type', 'navigation_type']),
        ]);
    }

    public function store(Request $request)
    {
        $this->authorize('create', Document::class);

        $data = $request->validate([
            'document_name' => ['required', 'string', 'max:180'],
            'category_id' => ['required', 'exists:document_categories,id'],
            'owner_type' => ['required', 'in:company,vessel'],
            'owner_id' => [
                Rule::requiredIf($request->owner_type === 'vessel'),
                'nullable',
                'integer',
                Rule::exists('vessels', 'id'),
            ],
            'requirement_code' => ['nullable', 'string', 'max:40'],
            'document_number' => ['nullable', 'string', 'max:80'],
            'issue_date' => ['nullable', 'date'],
            'has_expiry' => ['required', 'boolean'],
            'expiry_date' => ['nullable', 'date'],
            'responsible_person' => ['nullable', 'string', 'max:120'],
            'archive_location' => ['nullable', 'string', 'max:180'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'file' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:10240'],
        ]);

        if ($data['has_expiry'] && empty($data['expiry_date'])) {
            return back()->withErrors(['expiry_date' => 'Tanggal kedaluwarsa wajib diisi jika dokumen punya masa berlaku.']);
        }
        if (! $data['has_expiry']) {
            $data['expiry_date'] = null; // tanpa tanggal fiktif
        }

        $file = $request->file('file');
        $path = $file->store('documents', 'local');

        $document = Document::create([
            ...collect($data)->except('file')->all(),
            'verification_status' => VerificationStatus::Uploaded->value,
            'uploaded_by' => auth()->id(),
            'file_path' => $path,
        ]);

        $version = DocumentVersion::create([
            'document_id' => $document->id,
            'version_number' => 1,
            'file_path' => $path,
            'file_mime' => $file->getMimeType(),
            'file_size' => $file->getSize(),
            'uploaded_at' => now(),
            'uploaded_by' => auth()->id(),
            'revision_notes' => 'Unggahan awal',
        ]);

        $document->update(['current_version_id' => $version->id]);

        AuditService::log('created', 'document', $document->id, null, collect($data)->except('file')->all(), "Dokumen baru: {$document->document_name}");
        app(ReminderService::class)->sync();

        return redirect()->route('documents.show', $document)
            ->with('success', 'Dokumen berhasil diunggah dan menunggu pemeriksaan.');
    }

    public function show(Document $document): Response
    {
        $this->authorize('view', $document);

        $document->load(['category', 'versions' => fn ($q) => $q->orderByDesc('version_number'), 'voyages']);

        $user = auth()->user();

        return Inertia::render('Documents/Show', [
            'document' => [
                'id' => $document->id,
                'document_name' => $document->document_name,
                'document_number' => $document->document_number,
                'requirement_code' => $document->requirement_code,
                'owner_type' => $document->owner_type,
                'owner_id' => $document->owner_id,
                'owner_name' => $document->ownerName(),
                'category' => $document->category,
                'issue_date' => $document->issue_date?->toDateString(),
                'has_expiry' => $document->has_expiry,
                'expiry_date' => $document->expiry_date?->toDateString(),
                'verification_status' => $document->verification_status,
                'responsible_person' => $document->responsible_person,
                'archive_location' => $document->archive_location,
                'notes' => $document->notes,
                'uploaded_by_name' => $document->uploader?->name,
                'created_at' => $document->created_at?->toDateTimeString(),
                'updated_at' => $document->updated_at?->toDateTimeString(),
                'current_version_id' => $document->current_version_id,
                'file_path' => $document->file_path,
                'validity' => app(ReminderService::class)
                    ->validity($document->expiry_date?->toDateString(), $document->has_expiry),
                'days_left' => app(ReminderService::class)
                    ->daysUntil($document->expiry_date?->toDateString()),
            ],
            'versions' => $document->versions->map(fn ($v) => [
                'id' => $v->id,
                'version_number' => $v->version_number,
                'uploaded_at' => $v->uploaded_at,
                'uploaded_by' => $v->uploader?->name,
                'revision_notes' => $v->revision_notes,
                'file_mime' => $v->file_mime,
                'file_size' => $v->file_size,
                'is_current' => $v->id === $document->current_version_id,
            ]),
            'approvals' => Approval::where('approvable_type', 'document')
                ->where('approvable_id', $document->id)
                ->with('approver')
                ->orderByDesc('decision_timestamp')
                ->get()
                ->map(fn ($a) => [
                    'id' => $a->id,
                    'approval_status' => $a->approval_status,
                    'approval_scope' => $a->approval_scope,
                    'approver_name' => $a->approver?->name,
                    'comments' => $a->comments,
                    'decision_timestamp' => $a->decision_timestamp,
                ]),
            'voyages' => $document->voyages->map(fn ($v) => [
                'id' => $v->id,
                'voyage_code' => $v->voyage_code,
                'voyage_status' => $v->voyage_status,
            ]),
            'actions' => [
                'can_submit' => $user?->can('submit', $document)
                    && in_array($document->verification_status, [
                        VerificationStatus::Draft->value,
                        VerificationStatus::Uploaded->value,
                        VerificationStatus::RevisionRequired->value,
                    ], true),
                'can_verify' => $user?->can('verify', $document)
                    && $document->verification_status === VerificationStatus::UnderReview->value,
                'can_edit' => $user?->can('update', $document),
                'can_upload_version' => $user?->can('update', $document),
            ],
        ]);
    }

    public function update(Request $request, Document $document)
    {
        $this->authorize('update', $document);

        $data = $request->validate([
            'document_name' => ['required', 'string', 'max:180'],
            'category_id' => ['required', 'exists:document_categories,id'],
            'requirement_code' => ['nullable', 'string', 'max:40'],
            'document_number' => ['nullable', 'string', 'max:80'],
            'issue_date' => ['nullable', 'date'],
            'has_expiry' => ['required', 'boolean'],
            'expiry_date' => ['nullable', 'date'],
            'responsible_person' => ['nullable', 'string', 'max:120'],
            'archive_location' => ['nullable', 'string', 'max:180'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        if ($data['has_expiry'] && empty($data['expiry_date'])) {
            return back()->withErrors(['expiry_date' => 'Tanggal kedaluwarsa wajib diisi jika dokumen punya masa berlaku.']);
        }
        if (! $data['has_expiry']) {
            $data['expiry_date'] = null;
        }

        $before = $document->only(array_keys($data));
        $document->update($data);

        AuditService::log('updated', 'document', $document->id, $before, $data, "Metadata dokumen diperbarui: {$document->document_name}");
        app(ReminderService::class)->sync();

        return back()->with('success', 'Metadata dokumen diperbarui.');
    }

    public function submit(Request $request, Document $document)
    {
        $this->authorize('submit', $document);

        $document->update(['verification_status' => VerificationStatus::UnderReview->value]);
        AuditService::log('submitted', 'document', $document->id, null, ['status' => 'under_review'], 'Diajukan untuk pemeriksaan', null, 'document', $document->id);

        $this->notifyRoles(['supervisor', 'super_admin'], NotificationType::ApprovalPending, 'Dokumen menunggu pemeriksaan', "\"{$document->document_name}\" diajukan untuk ditinjau.", 'document', $document->id);

        return back()->with('success', 'Dokumen diajukan untuk pemeriksaan supervisor.');
    }

    public function verify(Request $request, Document $document)
    {
        $this->authorize('verify', $document);

        $request->validate(['comments' => ['nullable', 'string', 'max:1000']]);

        $before = ['status' => $document->verification_status];
        $document->update(['verification_status' => VerificationStatus::Verified->value]);

        Approval::create([
            'approvable_type' => 'document',
            'approvable_id' => $document->id,
            'approver_id' => auth()->id(),
            'approval_scope' => 'internal',
            'approval_status' => 'approved',
            'comments' => $request->string('comments')->toString() ?: null,
            'decision_timestamp' => now(),
        ]);

        AuditService::log('verified', 'document', $document->id, $before, ['status' => 'verified'], 'Dokumen disetujui (verifikasi internal)', $request->string('comments')->toString(), 'document', $document->id);

        return back()->with('success', 'Dokumen diverifikasi (persetujuan internal).');
    }

    public function requestRevision(Request $request, Document $document)
    {
        $this->authorize('verify', $document);

        $request->validate(['comments' => ['required', 'string', 'max:1000']]);

        $before = ['status' => $document->verification_status];
        $document->update(['verification_status' => VerificationStatus::RevisionRequired->value]);

        Approval::create([
            'approvable_type' => 'document',
            'approvable_id' => $document->id,
            'approver_id' => auth()->id(),
            'approval_scope' => 'internal',
            'approval_status' => 'revision_required',
            'comments' => $request->string('comments')->toString(),
            'decision_timestamp' => now(),
        ]);

        AuditService::log('revision_required', 'document', $document->id, $before, ['status' => 'revision_required'], 'Dikembalikan untuk revisi', $request->string('comments')->toString(), 'document', $document->id);

        $this->notifyRoles(['doc_controller', 'super_admin'], NotificationType::DocRevision, 'Dokumen perlu revisi', "\"{$document->document_name}\": {$request->string('comments')}", 'document', $document->id);

        return back()->with('success', 'Dokumen dikembalikan untuk revisi.');
    }

    public function reject(Request $request, Document $document)
    {
        $this->authorize('verify', $document);

        $request->validate(['comments' => ['required', 'string', 'max:1000']]);

        $before = ['status' => $document->verification_status];
        $document->update(['verification_status' => VerificationStatus::Rejected->value]);

        Approval::create([
            'approvable_type' => 'document',
            'approvable_id' => $document->id,
            'approver_id' => auth()->id(),
            'approval_scope' => 'internal',
            'approval_status' => 'rejected',
            'comments' => $request->string('comments')->toString(),
            'decision_timestamp' => now(),
        ]);

        AuditService::log('rejected', 'document', $document->id, $before, ['status' => 'rejected'], 'Dokumen ditolak', $request->string('comments')->toString(), 'document', $document->id);

        return back()->with('success', 'Dokumen ditolak.');
    }

    public function storeVersion(Request $request, Document $document)
    {
        $this->authorize('update', $document);

        $request->validate([
            'file' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:10240'],
            'revision_notes' => ['nullable', 'string', 'max:500'],
        ]);

        $file = $request->file('file');
        $path = $file->store('documents', 'local');

        $nextVersion = (int) $document->versions()->max('version_number') + 1;
        $version = DocumentVersion::create([
            'document_id' => $document->id,
            'version_number' => $nextVersion,
            'file_path' => $path,
            'file_mime' => $file->getMimeType(),
            'file_size' => $file->getSize(),
            'uploaded_at' => now(),
            'uploaded_by' => auth()->id(),
            'revision_notes' => $request->string('revision_notes')->toString() ?: "Revisi v{$nextVersion}",
        ]);

        $document->update([
            'current_version_id' => $version->id,
            'file_path' => $path,
            'verification_status' => VerificationStatus::Uploaded->value,
        ]);

        AuditService::log('new_version', 'document', $document->id, null, ['version' => $nextVersion], "Versi baru v{$nextVersion}", $request->string('revision_notes')->toString(), 'document', $document->id);

        return back()->with('success', "Versi baru v{$nextVersion} tersimpan. Status kembali: Terunggah.");
    }

    public function download(Request $request, Document $document, ?int $versionId = null)
    {
        $this->authorize('download', $document);

        $path = $document->file_path;
        if ($versionId) {
            $version = $document->versions()->findOrFail($versionId);
            $path = $version->file_path;
        }

        abort_unless($path && Storage::disk('local')->exists($path), 404, 'File tidak ditemukan.');

        $ext = pathinfo($path, PATHINFO_EXTENSION);
        $name = preg_replace('/[^A-Za-z0-9_-]+/', '_', $document->document_name).($ext ? ".{$ext}" : '');

        return Storage::disk('local')->download($path, $name);
    }

    private function mapDocument(
        Document $doc,
        ReminderService $reminder,
        $vesselNames = null,
        $crewNames = null,
    ): array {
        $ownerName = match ($doc->owner_type) {
            'vessel' => ($vesselNames[$doc->owner_id] ?? null)
                ?? \App\Models\Vessel::whereKey($doc->owner_id)->value('vessel_name'),
            'crew' => ($crewNames[$doc->owner_id] ?? null)
                ?? \App\Models\Crew::whereKey($doc->owner_id)->value('name'),
            default => 'PT Bunga Teratai',
        };

        return [
            'id' => $doc->id,
            'document_name' => $doc->document_name,
            'document_number' => $doc->document_number,
            'requirement_code' => $doc->requirement_code,
            'owner_type' => $doc->owner_type,
            'owner_id' => $doc->owner_id,
            'owner_name' => $ownerName,
            'group_code' => $doc->category?->group_code,
            'category_name' => $doc->category?->name,
            'has_expiry' => $doc->has_expiry,
            'expiry_date' => $doc->expiry_date?->toDateString(),
            'verification_status' => $doc->verification_status,
            'validity' => $reminder->validity($doc->expiry_date?->toDateString(), $doc->has_expiry),
            'days_left' => $reminder->daysUntil($doc->expiry_date?->toDateString()),
            'responsible_person' => $doc->responsible_person,
            'updated_at' => $doc->updated_at?->toDateTimeString(),
        ];
    }

    private function validityCounts(ReminderService $reminder): array
    {
        $docs = Document::where('is_archived', false)->get(['id', 'has_expiry', 'expiry_date']);
        $counts = ['normal' => 0, 'expiring_soon' => 0, 'expired' => 0, 'no_expiry' => 0];
        foreach ($docs as $doc) {
            $counts[$reminder->validity($doc->expiry_date?->toDateString(), $doc->has_expiry)]++;
        }

        return $counts;
    }

    private function notifyRoles(array $roleSlugs, NotificationType|string $type, string $title, string $message, string $refType, int $refId): void
    {
        $typeValue = $type instanceof NotificationType ? $type->value : $type;
        $users = Role::whereIn('slug', $roleSlugs)->with('users')->get()->flatMap->users->unique('id');
        foreach ($users as $user) {
            Notification::create([
                'recipient_id' => $user->id,
                'notification_type' => $typeValue,
                'title' => $title,
                'message' => $message,
                'reference_type' => $refType,
                'reference_id' => $refId,
                'read_status' => false,
                'created_at' => now(),
            ]);
        }
    }
}
