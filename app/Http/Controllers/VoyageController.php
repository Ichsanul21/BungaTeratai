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
            // Charter SPAL (B3)
            'spal_number' => ['nullable', 'string', 'max:80'],
            'spal_date' => ['nullable', 'date'],
            'payment_terms' => ['nullable', 'in:dp_50_50,dp_100,custom'],
            'payment_terms_note' => ['nullable', 'string', 'max:240'],
            'freight_rate' => ['nullable', 'numeric', 'min:0'],
            'freight_unit' => ['nullable', 'in:MT,lumpsum'],
            'laytime_days' => ['nullable', 'integer', 'min:1'],
            'demurrage_per_day' => ['nullable', 'numeric', 'min:0'],
            'jetty_loading' => ['nullable', 'string', 'max:160'],
            'jetty_discharge' => ['nullable', 'string', 'max:160'],
            'shipper' => ['nullable', 'string', 'max:160'],
            'consignee' => ['nullable', 'string', 'max:160'],
        ]);

        $voyage = DB::transaction(function () use ($data) {
            $vessel = Vessel::findOrFail($data['vessel_id']);
            $isPassenger = $vessel->vessel_type === 'kapal_penumpang';
            $externalStatus = $isPassenger
                ? ExternalApprovalStatus::TidakDiperlukan->value
                : ExternalApprovalStatus::Menunggu->value;

            // Nomor SPAL otomatis utk charter (bila tidak diisi manual)
            $spalNumber = $data['spal_number'] ?? null;
            if (! $isPassenger && ! $spalNumber) {
                $penyewaCode = ($data['customer_id'] ?? null)
                    ? strtoupper(substr((string) Customer::find($data['customer_id'])?->name, 0, 3))
                    : 'STD';
                $kapalCode = strtoupper(substr(preg_replace('/[^A-Za-z0-9]/', '', $vessel->vessel_name), -2));
                $numbered = app(\App\Services\NumberingService::class)->next('SPAL', [
                    '{kode_penyewa}' => $penyewaCode,
                    '{kode_kapal}' => $kapalCode,
                ]);
                $spalNumber = $numbered['number'];
            }

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
                // Charter fields
                'spal_number' => $spalNumber,
                'spal_date' => $data['spal_date'] ?? ($isPassenger ? null : now()->toDateString()),
                'payment_terms' => $data['payment_terms'] ?? ($isPassenger ? null : 'dp_50_50'),
                'payment_terms_note' => $data['payment_terms_note'] ?? null,
                'freight_rate' => $data['freight_rate'] ?? null,
                'freight_unit' => $data['freight_unit'] ?? 'MT',
                'laytime_days' => $data['laytime_days'] ?? null,
                'demurrage_per_day' => $data['demurrage_per_day'] ?? null,
                'jetty_loading' => $data['jetty_loading'] ?? null,
                'jetty_discharge' => $data['jetty_discharge'] ?? null,
                'shipper' => $data['shipper'] ?? null,
                'consignee' => $data['consignee'] ?? null,
                'charter_stage' => $isPassenger ? null : 'si',
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
                'spal_number' => $voyage->spal_number,
                'spal_date' => $voyage->spal_date?->toDateString(),
                'payment_terms' => $voyage->payment_terms ?? '',
                'payment_terms_note' => $voyage->payment_terms_note ?? '',
                'freight_rate' => (string) ($voyage->freight_rate ?? ''),
                'freight_unit' => $voyage->freight_unit ?? 'MT',
                'laytime_days' => (string) ($voyage->laytime_days ?? ''),
                'demurrage_per_day' => (string) ($voyage->demurrage_per_day ?? ''),
                'jetty_loading' => $voyage->jetty_loading ?? '',
                'jetty_discharge' => $voyage->jetty_discharge ?? '',
                'shipper' => $voyage->shipper ?? '',
                'consignee' => $voyage->consignee ?? '',
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
                'spal_number' => $voyage->spal_number,
                'spal_date' => $voyage->spal_date?->toDateString(),
                'payment_terms' => $voyage->payment_terms,
                'payment_terms_note' => $voyage->payment_terms_note,
                'freight_rate' => $voyage->freight_rate,
                'freight_unit' => $voyage->freight_unit,
                'laytime_days' => $voyage->laytime_days,
                'demurrage_per_day' => $voyage->demurrage_per_day,
                'jetty_loading' => $voyage->jetty_loading,
                'jetty_discharge' => $voyage->jetty_discharge,
                'shipper' => $voyage->shipper,
                'consignee' => $voyage->consignee,
                'dsr_mt' => $voyage->dsr_mt,
                'dsr_date' => $voyage->dsr_date?->toDateString(),
                'charter_stage' => $voyage->charter_stage,
                'progress_stage' => $voyage->progress_stage,
                'allowed_transitions' => VoyageWorkflowService::TRANSITIONS[$voyage->voyage_status] ?? [],
            ],
            'fuelLogs' => $voyage->fuelLogs()->orderByDesc('trip_date')->get()->map(fn ($fl) => [
                'id' => $fl->id,
                'trip_date' => $fl->trip_date?->toDateString(),
                'liters' => $fl->liters,
                'cost' => $fl->cost,
                'duration_hours' => $fl->duration_hours,
                'distance_nm' => $fl->distance_nm,
                'weather_condition' => $fl->weather_condition,
                'speed_knots' => $fl->speed_knots,
                'delay_hours' => $fl->delay_hours,
                'analysis_status' => $fl->analysis_status,
                'analysis_diff_pct' => $fl->analysis_diff_pct,
                'explanation_note' => $fl->explanation_note,
            ]),
            'demurrage' => $this->calculateDemurrageFacts($voyage),
            'agency' => $voyage->agencyAppointments()->orderByDesc('id')->get()->map(fn ($ag) => [
                'id' => $ag->id,
                'letter_no' => $ag->letter_no,
                'letter_date' => $ag->letter_date?->toDateString(),
                'port_type' => $ag->port_type,
                'port_name' => $ag->port_name,
                'agent_name' => $ag->agent_name,
                'agent_address' => $ag->agent_address,
                'captain_name' => $ag->captain_name,
                'captain_phone' => $ag->captain_phone,
                'grt' => $ag->grt,
            ]),
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
                        'linkableDocuments' => \App\Models\Document::where('is_archived', false)
                ->where('verification_status', '!=', 'rejected')
                ->where(function ($q) use ($voyage) {
                    $q->where(function ($qq) use ($voyage) {
                        $qq->where('owner_type', 'vessel')->where('owner_id', $voyage->vessel_id);
                    })->orWhere('owner_type', 'company');
                })
                ->whereDoesntHave('voyages', fn ($vq) => $vq->where('voyages.id', $voyage->id))
                ->orderByDesc('updated_at')->limit(100)
                ->get()
                ->map(fn ($d) => [
                    'id' => $d->id,
                    'document_name' => $d->document_name,
                    'requirement_code' => $d->requirement_code,
                    'owner_name' => $d->ownerName(),
                    'group_code' => $d->category?->group_code,
                ]),'documents' => $voyage->documents()->with('category')->get()->map(fn ($d) => [
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
            'charterInvoices' => $voyage->invoices()->orderBy('id')->get()->map(fn ($i) => [
                'id' => $i->id,
                'number' => $i->number,
                'invoice_kind' => $i->invoice_kind,
                'status' => $i->status,
                'total' => $i->total,
                'paid_amount' => $i->paid_amount,
                'fp_number' => $i->fp_number,
            ]),
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

    // ===== Edit / Hapus (Fase A) =====

    public function edit(Voyage $voyage)
    {
        $this->authorize('update', $voyage);

        return Inertia::render('Voyages/Edit', [
            'voyage' => [
                'id' => $voyage->id,
                'vessel_id' => (string) $voyage->vessel_id,
                'activity_type' => $voyage->activity_type,
                'tugboat_id' => (string) ($voyage->relationships()->first()?->tugboat_id ?? ''),
                'barge_id' => (string) ($voyage->relationships()->first()?->barge_id ?? ''),
                'route_type' => $voyage->route_type,
                'origin' => $voyage->origin,
                'destination' => $voyage->destination,
                'planned_departure' => $voyage->planned_departure?->format('Y-m-d\TH:i'),
                'estimated_arrival' => $voyage->estimated_arrival?->format('Y-m-d\TH:i'),
                'customer_id' => (string) ($voyage->customer_id ?? ''),
                'contract_no' => $voyage->contract_no,
                'person_in_charge' => $voyage->person_in_charge,
                'notes' => $voyage->notes,
                'commodity_type' => $voyage->cargo()->first()?->commodity_type ?? '',
                'weight_ton' => (string) ($voyage->cargo()->first()?->weight_ton ?? ''),
                'capacity' => (string) ($voyage->capacity ?? ''),
                'tickets_sold' => (string) ($voyage->tickets_sold ?? ''),
                'voyage_status' => $voyage->voyage_status,
            ],
            'vessels' => Vessel::orderBy('vessel_name')->get(['id', 'vessel_name', 'vessel_type', 'navigation_type']),
            'customers' => Customer::orderBy('name')->get(['id', 'name']),
            'isEdit' => true,
        ]);
    }

    public function update(Request $request, Voyage $voyage)
    {
        $this->authorize('update', $voyage);

        if (in_array($voyage->voyage_status, ['departed', 'in_transit', 'arrived', 'voyage_closure', 'completed', 'cancelled'], true)) {
            return back()->with('error', 'Perjalanan yang sudah berlayar/selesai tidak dapat diedit — gunakan catatan perjalanan.');
        }

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
            // Charter SPAL (B3)
            'spal_number' => ['nullable', 'string', 'max:80'],
            'spal_date' => ['nullable', 'date'],
            'payment_terms' => ['nullable', 'in:dp_50_50,dp_100,custom'],
            'payment_terms_note' => ['nullable', 'string', 'max:240'],
            'freight_rate' => ['nullable', 'numeric', 'min:0'],
            'freight_unit' => ['nullable', 'in:MT,lumpsum'],
            'laytime_days' => ['nullable', 'integer', 'min:1'],
            'demurrage_per_day' => ['nullable', 'numeric', 'min:0'],
            'jetty_loading' => ['nullable', 'string', 'max:160'],
            'jetty_discharge' => ['nullable', 'string', 'max:160'],
            'shipper' => ['nullable', 'string', 'max:160'],
            'consignee' => ['nullable', 'string', 'max:160'],
        ]);

        $before = $voyage->only(['vessel_id', 'origin', 'destination', 'planned_departure', 'person_in_charge', 'contract_no']);

        DB::transaction(function () use ($voyage, $data) {
            $isPassenger = Vessel::find($data['vessel_id'])?->vessel_type === 'kapal_penumpang';

            $voyage->update([
                'vessel_id' => $data['vessel_id'],
                'route_type' => $data['route_type'],
                'origin' => $data['origin'],
                'destination' => $data['destination'],
                'planned_departure' => $data['planned_departure'],
                'estimated_arrival' => $data['estimated_arrival'] ?? null,
                'activity_type' => $data['activity_type'],
                'person_in_charge' => $data['person_in_charge'],
                'customer_id' => $data['customer_id'] ?? null,
                'contract_no' => $data['contract_no'] ?? null,
                'notes' => $data['notes'] ?? null,
                'capacity' => $data['capacity'] ?? null,
                'tickets_sold' => $data['tickets_sold'] ?? null,
                'spal_number' => $data['spal_number'] ?? null,
                'spal_date' => $data['spal_date'] ?? null,
                'payment_terms' => $data['payment_terms'] ?? null,
                'payment_terms_note' => $data['payment_terms_note'] ?? null,
                'freight_rate' => $data['freight_rate'] ?? null,
                'freight_unit' => $data['freight_unit'] ?? null,
                'laytime_days' => $data['laytime_days'] ?? null,
                'demurrage_per_day' => $data['demurrage_per_day'] ?? null,
                'jetty_loading' => $data['jetty_loading'] ?? null,
                'jetty_discharge' => $data['jetty_discharge'] ?? null,
                'shipper' => $data['shipper'] ?? null,
                'consignee' => $data['consignee'] ?? null,
            ]);

            // Relasi tug ↔ tongkang
            $voyage->relationships()->delete();
            if (! $isPassenger && ($data['tugboat_id'] ?? null) && ($data['barge_id'] ?? null)) {
                \App\Models\VesselRelationship::create([
                    'voyage_id' => $voyage->id,
                    'tugboat_id' => $data['tugboat_id'],
                    'barge_id' => $data['barge_id'],
                ]);
            }

            // Muatan
            $voyage->cargo()->delete();
            if (! $isPassenger && ($data['commodity_type'] ?? null)) {
                \App\Models\VoyageCargo::create([
                    'voyage_id' => $voyage->id,
                    'commodity_type' => $data['commodity_type'],
                    'weight_ton' => $data['weight_ton'] ?? null,
                    'origin' => $data['origin'],
                    'destination' => $data['destination'],
                ]);
            }
        });

        AuditService::log('updated', 'voyage', $voyage->id, $before, $data, "Perjalanan diedit: {$voyage->voyage_code}");

        return redirect()->route('voyages.show', $voyage)->with('success', 'Perjalanan diperbarui.');
    }

    // ===== Charter SPAL — Keagenan & Detail (B3) =====

    public function storeAgency(Request $request, Voyage $voyage)
    {
        $this->authorize('update', $voyage);

        $data = $request->validate([
            'port_type' => ['required', 'in:muat,bongkar,lainnya'],
            'port_name' => ['nullable', 'string', 'max:160'],
            'agent_name' => ['required', 'string', 'max:160'],
            'agent_address' => ['nullable', 'string', 'max:240'],
            'captain_name' => ['nullable', 'string', 'max:120'],
            'captain_phone' => ['nullable', 'string', 'max:40'],
            'letter_date' => ['nullable', 'date'],
        ]);

        $agency = $voyage->agencyAppointments()->create([
            ...$data,
            'grt' => $voyage->vessel?->gt,
            'created_by' => auth()->id(),
        ]);

        // Nomor surat: {seq}/{kode_penyewa}/AG/{roman}/{tahun} dari NumberingService
        $penyewa = $voyage->customer
            ? strtoupper(substr($voyage->customer->name, 0, 3))
            : 'BT';
        $numbered = app(\App\Services\NumberingService::class)->next('KEAGENAN', [
            '{kode_penyewa}' => $penyewa,
        ]);
        $agency->update(['letter_no' => $numbered['number']]);

        // Dokumen terbitan = arsip terpadu
        $doc = \App\Models\Document::create([
            'document_name' => "Penunjukan Keagenan ({$data['port_type']}) — {$voyage->voyage_code}",
            'category_id' => \App\Models\DocumentCategory::where('group_code', 'E')->value('id'),
            'document_number' => $numbered['number'],
            'owner_type' => 'vessel',
            'owner_id' => $voyage->vessel_id,
            'source_type' => 'terbitan',
            'template_id' => \App\Models\DocumentTemplate::where('code', 'KEAGENAN')->value('id'),
            'period' => now()->format('Y-m'),
            'issue_date' => now()->toDateString(),
            'has_expiry' => false,
            'verification_status' => 'verified',
            'uploaded_by' => auth()->id(),
        ]);
        $doc->voyages()->attach($voyage->id);

        AuditService::log('agency_created', 'voyage', $voyage->id, null, $data, "Surat keagenan {$data['port_type']} diterbitkan: {$numbered['number']}");

        return back()->with('success', "Surat keagenan {$data['port_type']} diterbitkan — nomor {$numbered['number']}.");
    }

    public function deleteAgency(Voyage $voyage, \App\Models\AgencyAppointment $agency)
    {
        $this->authorize('update', $voyage);
        abort_unless($agency->voyage_id === $voyage->id, 404);

        AuditService::log('agency_deleted', 'voyage', $voyage->id, $agency->toArray(), null, 'Surat keagenan dihapus');
        $agency->delete();

        return back()->with('success', 'Surat keagenan dihapus.');
    }

    /** Update detail charter (DSR & tahap) — DSR wajib sebelum pelunasan. */
    public function updateCharter(Request $request, Voyage $voyage)
    {
        $this->authorize('update', $voyage);

        $data = $request->validate([
            'dsr_mt' => ['nullable', 'numeric', 'min:0'],
            'dsr_date' => ['nullable', 'date'],
            'charter_stage' => ['required', 'in:si,spal,dp,keagenan_muat,dsr,pelunasan,keagenan_bongkar,closing'],
        ]);

        if ($data['charter_stage'] === 'pelunasan' && empty($data['dsr_mt']) && ! $voyage->dsr_mt) {
            return back()->with('error', 'Tahap pelunasan membutuhkan DSR (total muatan MT dari nakhoda) — isi DSR terlebih dahulu.');
        }

        $before = $voyage->only(['dsr_mt', 'dsr_date', 'charter_stage']);
        $voyage->update($data);

        $this->workflow->recordEvent($voyage, \App\Enums\VoyageEventType::StatusChanged, 'Tahap charter diperbarui: '.$data['charter_stage']);

        AuditService::log('charter_updated', 'voyage', $voyage->id, $before, $data, 'Detail charter SPAL diperbarui');

        return back()->with('success', 'Detail charter diperbarui (tahap: '.$data['charter_stage'].').');
    }

    public function updateProgressStage(Request $request, Voyage $voyage)
    {
        $this->authorize('update', $voyage);

        $data = $request->validate([
            'progress_stage' => ['required', 'in:penerimaan_si,ke_spal,spog,sandar_loading,waiting_desk,bunker'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $stageLabels = [
            'penerimaan_si' => 'Penerimaan SI',
            'ke_spal' => 'Ke SPAL',
            'spog' => 'SPOG',
            'sandar_loading' => 'Sandar Loading',
            'waiting_desk' => 'Waiting (Desk)',
            'bunker' => 'Bunker',
        ];

        $oldStage = $voyage->progress_stage;
        $newStage = $data['progress_stage'];
        $voyage->update(['progress_stage' => $newStage]);

        $label = $stageLabels[$newStage] ?? $newStage;
        $desc = "Progress tahapan kapal diubah ke: {$label}" . (! empty($data['notes']) ? " - {$data['notes']}" : '');

        $this->workflow->recordEvent($voyage, \App\Enums\VoyageEventType::StatusChanged, $desc);
        AuditService::log('progress_stage_updated', 'voyage', $voyage->id, ['progress_stage' => $oldStage], $data, $desc);

        return back()->with('success', "Progress kapal diperbarui: {$label}");
    }

    public function storeFuelLog(Request $request, Voyage $voyage)
    {
        $this->authorize('update', $voyage);

        $data = $request->validate([
            'trip_date' => ['required', 'date'],
            'duration_hours' => ['required', 'numeric', 'min:0.1'],
            'distance_nm' => ['nullable', 'numeric', 'min:0'],
            'liters' => ['required', 'numeric', 'min:0.1'],
            'cost' => ['nullable', 'numeric', 'min:0'],
            'weather_condition' => ['nullable', 'string', 'max:60'],
            'speed_knots' => ['nullable', 'numeric', 'min:0'],
            'delay_hours' => ['nullable', 'numeric', 'min:0'],
            'explanation_note' => ['nullable', 'string', 'max:1000'],
        ]);

        $vessel = $voyage->vessel;
        if (! $vessel) {
            return back()->with('error', 'Kapal tidak ditemukan untuk perjalanan ini.');
        }

        $log = app(\App\Services\FuelAnalysisService::class)->record(
            vessel: $vessel,
            tripDate: $data['trip_date'],
            route: "{$voyage->origin} → {$voyage->destination}",
            cargoType: $voyage->cargo?->commodity_type,
            durationHours: (float) $data['duration_hours'],
            distanceNm: ! empty($data['distance_nm']) ? (float) $data['distance_nm'] : null,
            liters: (float) $data['liters'],
            cost: ! empty($data['cost']) ? (float) $data['cost'] : 0,
            explanation: $data['explanation_note'] ?? null,
            voyageId: $voyage->id,
            weatherCondition: $data['weather_condition'] ?? null,
            speedKnots: ! empty($data['speed_knots']) ? (float) $data['speed_knots'] : null,
            delayHours: ! empty($data['delay_hours']) ? (float) $data['delay_hours'] : null,
        );

        AuditService::log('fuel_log_created', 'voyage', $voyage->id, null, $data, "Catatan BBM perjalanan ditambahkan: {$log->liters} L");

        return back()->with('success', "Data BBM perjalanan tersimpan ({$log->liters} L — status: {$log->analysis_status}).");
    }

    private function calculateDemurrageFacts(Voyage $voyage): array
    {
        $laytimeDays = (float) ($voyage->laytime_days ?? 0);
        $demurrageRate = (float) ($voyage->demurrage_per_day ?? 0);

        $loadingEvent = $voyage->events()->where('description', 'like', '%Sandar Loading%')->oldest('occurred_at')->first();
        $startTime = $loadingEvent?->occurred_at ?? $voyage->actual_departure ?? $voyage->planned_departure;
        $endTime = $voyage->actual_arrival ?? now();

        $elapsedHours = $startTime ? max(0, $startTime->diffInHours($endTime)) : 0;
        $elapsedDays = round($elapsedHours / 24, 1);

        $demurrageDays = ($laytimeDays > 0 && $elapsedDays > $laytimeDays)
            ? round($elapsedDays - $laytimeDays, 1)
            : 0;

        $demurrageAmount = $demurrageDays * $demurrageRate;

        return [
            'laytime_days' => $laytimeDays,
            'demurrage_rate' => $demurrageRate,
            'elapsed_days' => $elapsedDays,
            'demurrage_days' => $demurrageDays,
            'demurrage_amount' => $demurrageAmount,
            'status' => $laytimeDays <= 0
                ? 'Tidak diatur di kontrak SPAL'
                : ($demurrageDays > 0 ? "Melebihi laytime ({$demurrageDays} hari)" : 'Dalam batas laytime'),
        ];
    }
}
