<?php

namespace App\Http\Controllers;

use App\Enums\ApprovalStatus;
use App\Enums\ChecklistCompletion;
use App\Enums\ExternalApprovalStatus;
use App\Enums\VoyageStatus;
use App\Models\Customer;
use App\Models\Document;
use App\Models\Vessel;
use App\Models\VesselRelationship;
use App\Models\Voyage;
use App\Models\VoyageCargo;
use App\Services\AuditService;
use App\Services\DocumentCompletenessService;
use App\Services\VoyageWorkflowService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;
use Inertia\Inertia;
use Inertia\Response;

class VoyageController extends Controller
{
    public function __construct(private VoyageWorkflowService $workflow) {}

    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Voyage::class);

        $group = $request->string('group')->toString() ?: 'semua';

        $query = Voyage::with('vessel')->orderByDesc('planned_departure');

        match ($group) {
            'aktif' => $query->whereIn('voyage_status', [
                VoyageStatus::Planned->value, VoyageStatus::DocumentPreparation->value,
                VoyageStatus::InternalReview->value, VoyageStatus::AwaitingExternalApproval->value,
                VoyageStatus::ReadyForDeparture->value, VoyageStatus::Departed->value,
                VoyageStatus::InTransit->value, VoyageStatus::Delayed->value,
            ]),
            'pending_review' => $query->whereIn('voyage_status', [
                VoyageStatus::DocumentPreparation->value, VoyageStatus::InternalReview->value,
                VoyageStatus::AwaitingExternalApproval->value,
            ]),
            'completed' => $query->where('voyage_status', VoyageStatus::Completed->value),
            default => null,
        };

        if ($status = $request->string('status')->toString()) {
            $query->where('voyage_status', $status);
        }
        if ($vesselId = $request->integer('vessel_id')) {
            $query->where('vessel_id', $vesselId);
        }
        if ($search = $request->string('search')->toString()) {
            $query->where(fn ($q) => $q
                ->where('voyage_code', 'like', "%{$search}%")
                ->orWhere('origin', 'like', "%{$search}%")
                ->orWhere('destination', 'like', "%{$search}%"));
        }

        return Inertia::render('Voyages/Index', [
            'voyages' => $query->limit(100)->get()->map(fn ($v) => $this->mapVoyage($v)),
            'group' => $group,
            'filters' => $request->only(['status', 'vessel_id', 'search']),
            'vessels' => Vessel::orderBy('vessel_name')->get(['id', 'vessel_name', 'vessel_type']),
            'statusCounts' => [
                'aktif' => Voyage::whereIn('voyage_status', [
                    VoyageStatus::Planned->value, VoyageStatus::DocumentPreparation->value,
                    VoyageStatus::InternalReview->value, VoyageStatus::AwaitingExternalApproval->value,
                    VoyageStatus::ReadyForDeparture->value, VoyageStatus::Departed->value,
                    VoyageStatus::InTransit->value, VoyageStatus::Delayed->value,
                ])->count(),
                'pending_review' => Voyage::whereIn('voyage_status', [
                    VoyageStatus::DocumentPreparation->value, VoyageStatus::InternalReview->value,
                    VoyageStatus::AwaitingExternalApproval->value,
                ])->count(),
                'completed' => Voyage::where('voyage_status', VoyageStatus::Completed->value)->count(),
            ],
            'canCreate' => auth()->user()?->can('create', Voyage::class),
        ]);
    }

    public function create(): Response
    {
        $this->authorize('create', Voyage::class);

        return Inertia::render('Voyages/Create', [
            'vessels' => Vessel::orderBy('vessel_name')->get(['id', 'vessel_name', 'vessel_type', 'navigation_type']),
            'customers' => Customer::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function store(Request $request)
    {
        $this->authorize('create', Voyage::class);

        $data = $request->validate([
            'vessel_id' => ['required', 'exists:vessels,id'],
            'activity_type' => ['required', 'string', 'max:60'],
            'tugboat_id' => ['nullable', 'exists:vessels,id'],
            'barge_id' => ['nullable', 'exists:vessels,id'],
            'route_type' => ['required', 'in:laut,sungai,kombinasi'],
            'origin' => ['required', 'string', 'max:120'],
            'destination' => ['required', 'string', 'max:120'],
            'planned_departure' => ['required', 'date'],
            'estimated_arrival' => ['nullable', 'date'],
            'customer_id' => ['nullable', 'exists:customers,id'],
            'contract_no' => ['nullable', 'string', 'max:80'],
            'person_in_charge' => ['required', 'string', 'max:120'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'commodity_type' => ['nullable', 'string', 'max:60'],
            'weight_ton' => ['nullable', 'numeric', 'min:0'],
            'capacity' => ['nullable', 'integer', 'min:0'],
            'tickets_sold' => ['nullable', 'integer', 'min:0'],
        ]);

        $voyage = DB::transaction(function () use ($data) {
            $vessel = Vessel::findOrFail($data['vessel_id']);
            $isPassenger = $vessel->vessel_type === 'kapal_penumpang';
            $externalStatus = $isPassenger
                ? ExternalApprovalStatus::TidakDiperlukan->value
                : ExternalApprovalStatus::Menunggu->value;

            $voyage = Voyage::create([
                'voyage_code' => $this->nextCode(),
                'vessel_id' => $data['vessel_id'],
                'route_type' => $data['route_type'],
                'origin' => $data['origin'],
                'destination' => $data['destination'],
                'planned_departure' => $data['planned_departure'],
                'estimated_arrival' => $data['estimated_arrival'] ?? null,
                'voyage_status' => VoyageStatus::Draft->value,
                'activity_type' => $data['activity_type'],
                'person_in_charge' => $data['person_in_charge'],
                'customer_id' => $data['customer_id'] ?? null,
                'contract_no' => $data['contract_no'] ?? null,
                'external_approval_status' => $externalStatus,
                'notes' => $data['notes'] ?? null,
                'capacity' => $data['capacity'] ?? null,
                'tickets_sold' => $data['tickets_sold'] ?? null,
            ]);

            if (! $isPassenger && ($data['tugboat_id'] ?? null) && ($data['barge_id'] ?? null)) {
                VesselRelationship::create([
                    'voyage_id' => $voyage->id,
                    'tugboat_id' => $data['tugboat_id'],
                    'barge_id' => $data['barge_id'],
                ]);
            }

            if (! $isPassenger && ($data['commodity_type'] ?? null)) {
                VoyageCargo::create([
                    'voyage_id' => $voyage->id,
                    'commodity_type' => $data['commodity_type'],
                    'weight_ton' => $data['weight_ton'] ?? null,
                    'origin' => $data['origin'],
                    'destination' => $data['destination'],
                ]);
            }

            $this->workflow->recordEvent($voyage, \App\Enums\VoyageEventType::Created, 'Perjalanan dibuat oleh '.$data['person_in_charge']);
            $this->workflow->buildChecklist($voyage);

            return $voyage;
        });

        AuditService::log('created', 'voyage', $voyage->id, null, $data, "Perjalanan baru: {$voyage->voyage_code}");

        return redirect()->route('voyages.show', $voyage)->with('success', "Perjalanan {$voyage->voyage_code} dibuat dengan checklist otomatis.");
    }

    public function show(Voyage $voyage): Response
    {
        $this->authorize('view', $voyage);

        $voyage->load([
            'vessel', 'cargo', 'customer', 'relationships.tugboat', 'relationships.barge',
            'checklists.requirement', 'events', 'invoices', 'bills',
        ]);

        $this->workflow->refreshChecklistCompletion($voyage);
        $voyage->load('checklists.requirement');

        $user = auth()->user();

        $completeness = app(DocumentCompletenessService::class)->forVoyage($voyage);

        return Inertia::render('Voyages/Show', [
            'voyage' => [
                'id' => $voyage->id,
                'voyage_code' => $voyage->voyage_code,
                'vessel_id' => $voyage->vessel_id,
                'vessel_name' => $voyage->vessel?->vessel_name,
                'vessel_type' => $voyage->vessel?->vessel_type,
                'route_type' => $voyage->route_type,
                'origin' => $voyage->origin,
                'destination' => $voyage->destination,
                'planned_departure' => $voyage->planned_departure?->toDateTimeString(),
                'estimated_arrival' => $voyage->estimated_arrival?->toDateTimeString(),
                'actual_departure' => $voyage->actual_departure?->toDateTimeString(),
                'actual_arrival' => $voyage->actual_arrival?->toDateTimeString(),
                'voyage_status' => $voyage->voyage_status,
                'activity_type' => $voyage->activity_type,
                'person_in_charge' => $voyage->person_in_charge,
                'customer_name' => $voyage->customer?->name,
                'contract_no' => $voyage->contract_no,
                'external_approval_status' => $voyage->external_approval_status,
                'has_external_evidence' => (bool) $voyage->external_approval_evidence,
                'notes' => $voyage->notes,
                'capacity' => $voyage->capacity,
                'tickets_sold' => $voyage->tickets_sold,
                'boarded' => $voyage->boarded,
                'landed' => $voyage->landed,
                'cancelled' => $voyage->cancelled,
                'allowed_transitions' => VoyageWorkflowService::TRANSITIONS[$voyage->voyage_status] ?? [],
            ],
            'relationships' => $voyage->relationships->map(fn ($r) => [
                'tugboat_name' => $r->tugboat?->vessel_name,
                'barge_name' => $r->barge?->vessel_name,
            ]),
            'cargo' => $voyage->cargo,
            'checklists' => $voyage->checklists->map(fn ($c) => [
                'id' => $c->id,
                'code' => $c->requirement?->code,
                'name' => $c->requirement?->name,
                'group_code' => $c->requirement?->group_code,
                'applicability' => $c->applicability,
                'completion_status' => $c->completion_status,
                'notes' => $c->notes,
            ]),
            'completeness' => $completeness,
            'documents' => $voyage->documents()->with('category')->get()->map(fn ($d) => [
                'id' => $d->id,
                'document_name' => $d->document_name,
                'requirement_code' => $d->requirement_code,
                'verification_status' => $d->verification_status,
                'group_code' => $d->category?->group_code,
            ]),
            'events' => $voyage->events->map(fn ($e) => [
                'id' => $e->id,
                'event_type' => $e->event_type,
                'occurred_at' => $e->occurred_at,
                'user_name' => $e->user?->name,
                'source' => $e->source,
                'description' => $e->description,
            ]),
            'approvals' => $voyage->approvals()->with('approver')->orderByDesc('decision_timestamp')->get()->map(fn ($a) => [
                'id' => $a->id,
                'scope' => $a->approval_scope,
                'status' => $a->approval_status,
                'approver_name' => $a->approver?->name,
                'comments' => $a->comments,
                'decision_timestamp' => $a->decision_timestamp,
            ]),
            'expenses' => [
                'bills' => $voyage->bills->map(fn ($b) => [
                    'id' => $b->id, 'number' => $b->number, 'category' => $b->category,
                    'total' => $b->total, 'status' => $b->status, 'issue_date' => $b->issue_date,
                ]),
                'total' => (float) $voyage->bills()->sum('total'),
            ],
            'actions' => [
                'can_update' => $user?->can('update', $voyage),
                'can_approve' => $user?->can('approve', $voyage)
                    && $voyage->voyage_status === VoyageStatus::InternalReview->value
                    && ! $voyage->approvals()
                        ->where('approval_scope', 'internal')
                        ->where('approval_status', ApprovalStatus::Approved->value)
                        ->exists(),
                'can_confirm_external' => $user?->can('update', $voyage)
                    && $voyage->voyage_status === VoyageStatus::AwaitingExternalApproval->value
                    && $voyage->external_approval_status !== 'terkonfirmasi',
            ],
        ]);
    }

    public function updateStatus(Request $request, Voyage $voyage)
    {
        $this->authorize('update', $voyage);

        $data = $request->validate([
            'to' => ['required', 'string'],
            'note' => ['nullable', 'string', 'max:1000'],
        ]);

        try {
            $this->workflow->transition($voyage, $data['to'], $data['note'] ?? null);
        } catch (InvalidArgumentException $e) {
            return back()->with('error', $e->getMessage());
        }

        return back()->with('success', 'Status perjalanan diperbarui: '.$data['to']);
    }

    public function approve(Request $request, Voyage $voyage)
    {
        $this->authorize('approve', $voyage);

        $request->validate([
            'decision' => ['required', 'in:approved,revision_required,rejected'],
            'comments' => ['required', 'string', 'max:1000'],
        ]);

        $this->workflow->approveInternal(
            $voyage,
            $request->string('decision')->toString(),
            $request->string('comments')->toString(),
        );

        if ($request->string('decision')->toString() === 'approved'
            && $voyage->voyage_status === VoyageStatus::InternalReview->value) {
            // tetap di internal_review — operator maju manual ke awaiting external
        }

        return back()->with('success', 'Keputusan persetujuan internal tersimpan.');
    }

    public function confirmExternal(Request $request, Voyage $voyage)
    {
        $this->authorize('update', $voyage);

        $request->validate([
            'evidence' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:10240'],
            'source_note' => ['required', 'string', 'max:500'],
        ]);

        try {
            $this->workflow->confirmExternalApproval(
                $voyage,
                $request->file('evidence'),
                $request->string('source_note')->toString(),
            );
        } catch (InvalidArgumentException $e) {
            return back()->with('error', $e->getMessage());
        }

        return back()->with('success', 'Persetujuan eksternal tercatat dengan lampiran bukti.');
    }

    public function updateChecklistItem(Request $request, Voyage $voyage, int $itemId)
    {
        $this->authorize('update', $voyage);

        $data = $request->validate([
            'completion_status' => ['required', 'in:terpenuhi,belum,tidak_berlaku'],
            'notes' => ['nullable', 'string', 'max:500'],
            'document_id' => ['nullable', 'exists:documents,id'],
        ]);

        $item = $voyage->checklists()->findOrFail($itemId);
        $item->update($data);

        if (! empty($data['document_id'])) {
            $doc = Document::find($data['document_id']);
            if ($doc && ! $voyage->documents()->where('documents.id', $doc->id)->exists()) {
                $voyage->documents()->attach($doc->id);
            }
        }

        AuditService::log('checklist_updated', 'voyage', $voyage->id, null, $data, 'Checklist diperbarui', null, 'voyage', $voyage->id);

        return back()->with('success', 'Item checklist diperbarui.');
    }

    public function linkDocument(Request $request, Voyage $voyage)
    {
        $this->authorize('update', $voyage);

        $request->validate(['document_id' => ['required', 'exists:documents,id']]);

        $voyage->documents()->syncWithoutDetaching([$request->integer('document_id')]);

        $this->workflow->refreshChecklistCompletion($voyage);
        $this->workflow->recordEvent($voyage, \App\Enums\VoyageEventType::Uploaded, 'Dokumen ditautkan ke perjalanan (tanpa upload ulang).');

        return back()->with('success', 'Dokumen ditautkan & checklist diperbarui.');
    }

    public function addPassengerLog(Request $request, Voyage $voyage)
    {
        $this->authorize('update', $voyage);

        $data = $request->validate([
            'type' => ['required', 'in:keberangkatan,kedatangan,batal,perubahan_jumlah'],
            'count' => ['nullable', 'integer', 'min:0'],
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        $updates = [];
        if ($data['type'] === 'batal') {
            $updates['cancelled'] = ($voyage->cancelled ?? 0) + (int) ($data['count'] ?? 0);
        } elseif ($data['type'] === 'keberangkatan') {
            $updates['boarded'] = (int) ($data['count'] ?? 0);
        } elseif ($data['type'] === 'kedatangan') {
            $updates['landed'] = (int) ($data['count'] ?? 0);
        }
        if ($updates) {
            $voyage->update($updates);
        }

        $this->workflow->recordEvent(
            $voyage,
            \App\Enums\VoyageEventType::PassengerChange,
            'Log penumpang — '.ucfirst($data['type'])
                .(($data['count'] ?? null) !== null ? ": {$data['count']}" : '')
                .(($data['note'] ?? null) ? " — {$data['note']}" : ''),
        );

        return back()->with('success', 'Log penumpang tercatat.');
    }

    private function nextCode(): string
    {
        $year = now()->year;
        $seq = Voyage::whereYear('created_at', $year)->count() + 1;

        return sprintf('VYG-%d-%04d', $year, $seq);
    }

    private function mapVoyage(Voyage $v): array
    {
        return [
            'id' => $v->id,
            'voyage_code' => $v->voyage_code,
            'vessel_name' => $v->vessel?->vessel_name,
            'vessel_type' => $v->vessel?->vessel_type,
            'origin' => $v->origin,
            'destination' => $v->destination,
            'voyage_status' => $v->voyage_status,
            'activity_type' => $v->activity_type,
            'planned_departure' => $v->planned_departure?->toDateTimeString(),
            'actual_arrival' => $v->actual_arrival?->toDateTimeString(),
            'external_approval_status' => $v->external_approval_status,
            'person_in_charge' => $v->person_in_charge,
        ];
    }
}
