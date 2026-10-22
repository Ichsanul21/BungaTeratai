<?php

namespace App\Http\Controllers;

use App\Policies\VesselPolicy;
use App\Services\DocumentCompletenessService;
use App\Models\Vessel;
use App\Models\Voyage;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class FleetController extends Controller
{
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Vessel::class);

        $query = Vessel::query()->orderBy('vessel_name');

        if ($search = $request->string('search')->toString()) {
            $query->where(fn ($q) => $q
                ->where('vessel_name', 'like', "%{$search}%")
                ->orWhere('registration_number', 'like', "%{$search}%"));
        }
        if ($type = $request->string('type')->toString()) {
            $query->where('vessel_type', $type);
        }
        if ($status = $request->string('status')->toString()) {
            $query->where('operational_status', $status);
        }

        $completeness = app(DocumentCompletenessService::class);

        $vessels = $query->get()->map(function (Vessel $vessel) use ($completeness) {
            $calc = $completeness->forVessel($vessel);
            $vessel->doc_completeness = $calc['percent'];

            return [
                'id' => $vessel->id,
                'vessel_name' => $vessel->vessel_name,
                'vessel_type' => $vessel->vessel_type,
                'navigation_type' => $vessel->navigation_type,
                'registration_number' => $vessel->registration_number,
                'year_built' => $vessel->year_built,
                'gt' => $vessel->gt,
                'dwt' => $vessel->dwt,
                'capacity_value' => $vessel->capacity_value,
                'capacity_unit' => $vessel->capacity_unit,
                'base_location' => $vessel->base_location,
                'operational_status' => $vessel->operational_status,
                'fuel_baseline_lph' => $vessel->fuel_baseline_lph,
                'doc_completeness' => $calc['percent'],
                'missing_count' => count($calc['missing']),
                'voyage_count' => Voyage::where('vessel_id', $vessel->id)
                ->orWhereHas('relationships', fn ($q) => $q->where('tugboat_id', $vessel->id)->orWhere('barge_id', $vessel->id))
                ->count(),
                'last_position_at' => $vessel->last_position_at,
            ];
        });

        return Inertia::render('Fleet/Index', [
            'vessels' => $vessels,
            'filters' => $request->only(['search', 'type', 'status']),
            'stats' => [
                'total' => Vessel::count(),
                'aktif' => Vessel::where('operational_status', 'aktif')->count(),
                'perlu_tinjau' => $vessels->filter(fn ($v) => $v['doc_completeness'] < 70)->count(),
            ],
            'canCreate' => auth()->user()?->can('create', Vessel::class),
        ]);
    }

    public function create(): Response
    {
        $this->authorize('create', Vessel::class);

        return Inertia::render('Fleet/Create');
    }

    public function store(Request $request)
    {
        $this->authorize('create', Vessel::class);

        $data = $request->validate([
            'vessel_name' => ['required', 'string', 'max:120'],
            'vessel_type' => ['required', 'in:tugboat,tongkang,kapal_penumpang,lainnya'],
            'navigation_type' => ['required', 'in:laut,sungai_danau,penyeberangan'],
            'registration_number' => ['nullable', 'string', 'max:60'],
            'imo' => ['nullable', 'string', 'max:20'],
            'mmsi' => ['nullable', 'string', 'max:20'],
            'call_sign' => ['nullable', 'string', 'max:20'],
            'year_built' => ['nullable', 'integer', 'between:1900,2030'],
            'length_m' => ['nullable', 'numeric', 'min:0'],
            'beam_m' => ['nullable', 'numeric', 'min:0'],
            'gt' => ['nullable', 'integer', 'min:0'],
            'dwt' => ['nullable', 'integer', 'min:0'],
            'capacity_value' => ['nullable', 'numeric', 'min:0'],
            'capacity_unit' => ['nullable', 'in:ton,penumpang'],
            'engine_spec' => ['nullable', 'string', 'max:180'],
            'fuel_spec' => ['nullable', 'string', 'max:180'],
            'fuel_baseline_lph' => ['nullable', 'numeric', 'min:0'],
            'owner' => ['nullable', 'string', 'max:120'],
            'operator' => ['nullable', 'string', 'max:120'],
            'operational_status' => ['required', 'in:aktif,dalam_perbaikan,dock,mangkrak'],
            'base_location' => ['nullable', 'string', 'max:120'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $vessel = Vessel::create($data);

        \App\Services\AuditService::log('created', 'vessel', $vessel->id, null, $data, "Kapal baru: {$vessel->vessel_name}");

        return redirect()->route('fleet.show', $vessel)->with('success', "Kapal \"{$vessel->vessel_name}\" berhasil ditambahkan.");
    }

    public function show(Vessel $vessel): Response
    {
        $this->authorize('view', $vessel);

        $completeness = app(DocumentCompletenessService::class);
        $calc = $completeness->forVessel($vessel);

        $vessel->load([
            'positions' => fn ($q) => $q->limit(20),
            'conditions' => fn ($q) => $q->limit(10),
            'services' => fn ($q) => $q->limit(10),
            'fuelLogs' => fn ($q) => $q->limit(20),
        ]);

        $vessel->doc_completeness = $calc['percent'];

        return Inertia::render('Fleet/Show', [
            'vessel' => [
                'id' => $vessel->id,
                'vessel_name' => $vessel->vessel_name,
                'vessel_type' => $vessel->vessel_type,
                'navigation_type' => $vessel->navigation_type,
                'registration_number' => $vessel->registration_number,
                'imo' => $vessel->imo,
                'mmsi' => $vessel->mmsi,
                'call_sign' => $vessel->call_sign,
                'year_built' => $vessel->year_built,
                'length_m' => $vessel->length_m,
                'beam_m' => $vessel->beam_m,
                'gt' => $vessel->gt,
                'dwt' => $vessel->dwt,
                'capacity_value' => $vessel->capacity_value,
                'capacity_unit' => $vessel->capacity_unit,
                'engine_spec' => $vessel->engine_spec,
                'fuel_spec' => $vessel->fuel_spec,
                'fuel_baseline_lph' => $vessel->fuel_baseline_lph,
                'owner' => $vessel->owner,
                'operator' => $vessel->operator,
                'operational_status' => $vessel->operational_status,
                'base_location' => $vessel->base_location,
                'doc_completeness' => $calc['percent'],
                'notes' => $vessel->notes,
                'last_lat' => $vessel->last_lat,
                'last_lng' => $vessel->last_lng,
                'last_position_at' => $vessel->last_position_at?->toIso8601String(),
                'created_at' => $vessel->created_at?->toDateString(),
            ],
            'completeness' => $calc,
            'documents' => $vessel->documents()->with('category')->latest()->get()->map([$this, 'mapDocument']),
            'voyages' => Voyage::where('vessel_id', $vessel->id)
                ->orWhereHas('relationships', fn ($q) => $q->where('tugboat_id', $vessel->id)->orWhere('barge_id', $vessel->id))
                ->latest()->limit(10)->get()->map(fn ($v) => [
                'id' => $v->id,
                'voyage_code' => $v->voyage_code,
                'origin' => $v->origin,
                'destination' => $v->destination,
                'voyage_status' => $v->voyage_status,
                'planned_departure' => $v->planned_departure?->toDateTimeString(),
            ]),
            'crews' => $vessel->assignments()->with('crew')->limit(50)->get()->map(fn ($a) => [
                'id' => $a->crew?->id,
                'name' => $a->crew?->name,
                'rank' => $a->crew?->rank,
                'role' => $a->role,
                'status' => $a->status,
                'start_date' => $a->start_date,
                'end_date' => $a->end_date,
            ]),
            'services' => $vessel->services->map(fn ($s) => [
                'id' => $s->id,
                'type' => $s->type,
                'title' => $s->title,
                'start_date' => $s->start_date,
                'end_date' => $s->end_date,
                'workshop' => $s->workshop,
                'cost' => $s->cost,
                'status' => $s->status,
            ]),
            'conditions' => $vessel->conditions->map(fn ($c) => [
                'id' => $c->id,
                'checked_at' => $c->checked_at,
                'score' => $c->score,
                'notes' => $c->notes,
                'checklist' => $c->checklist,
            ]),
            'fuelLogs' => $vessel->fuelLogs->map(fn ($f) => [
                'id' => $f->id,
                'trip_date' => $f->trip_date,
                'route' => $f->route,
                'duration_hours' => $f->duration_hours,
                'liters' => $f->liters,
                'cost' => $f->cost,
                'analysis_status' => $f->analysis_status,
                'analysis_diff_pct' => $f->analysis_diff_pct,
            ]),
            'auditLogs' => \App\Models\AuditLog::where('entity_type', 'vessel')
                ->where('entity_id', $vessel->id)
                ->latest('timestamp')->limit(20)->get()
                ->map(fn ($a) => [
                    'id' => $a->id,
                    'action' => $a->action,
                    'user_name' => $a->user?->name,
                    'change_summary' => $a->change_summary,
                    'timestamp' => $a->timestamp,
                ]),
            'canEdit' => auth()->user()?->can('update', $vessel),
        ]);
    }

    public function edit(Vessel $vessel): Response
    {
        $this->authorize('update', $vessel);

        return Inertia::render('Fleet/Edit', [
            'vessel' => $vessel,
        ]);
    }

    public function update(Request $request, Vessel $vessel)
    {
        $this->authorize('update', $vessel);

        $data = $request->validate([
            'vessel_name' => ['required', 'string', 'max:120'],
            'vessel_type' => ['required', 'in:tugboat,tongkang,kapal_penumpang,lainnya'],
            'navigation_type' => ['required', 'in:laut,sungai_danau,penyeberangan'],
            'registration_number' => ['nullable', 'string', 'max:60'],
            'imo' => ['nullable', 'string', 'max:20'],
            'mmsi' => ['nullable', 'string', 'max:20'],
            'call_sign' => ['nullable', 'string', 'max:20'],
            'year_built' => ['nullable', 'integer', 'between:1900,2030'],
            'length_m' => ['nullable', 'numeric', 'min:0'],
            'beam_m' => ['nullable', 'numeric', 'min:0'],
            'gt' => ['nullable', 'integer', 'min:0'],
            'dwt' => ['nullable', 'integer', 'min:0'],
            'capacity_value' => ['nullable', 'numeric', 'min:0'],
            'capacity_unit' => ['nullable', 'in:ton,penumpang'],
            'engine_spec' => ['nullable', 'string', 'max:180'],
            'fuel_spec' => ['nullable', 'string', 'max:180'],
            'fuel_baseline_lph' => ['nullable', 'numeric', 'min:0'],
            'owner' => ['nullable', 'string', 'max:120'],
            'operator' => ['nullable', 'string', 'max:120'],
            'operational_status' => ['required', 'in:aktif,dalam_perbaikan,dock,mangkrak'],
            'base_location' => ['nullable', 'string', 'max:120'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $before = $vessel->only(array_keys($data));
        $vessel->update($data);

        \App\Services\AuditService::log('updated', 'vessel', $vessel->id, $before, $data, "Kapal diperbarui: {$vessel->vessel_name}");

        return redirect()->route('fleet.show', $vessel)->with('success', 'Data kapal diperbarui.');
    }

    public function mapDocument($doc): array
    {
        return [
            'id' => $doc->id,
            'document_name' => $doc->document_name,
            'category_code' => $doc->category?->code,
            'category_name' => $doc->category?->name,
            'group_code' => $doc->category?->group_code,
            'document_number' => $doc->document_number,
            'requirement_code' => $doc->requirement_code,
            'has_expiry' => $doc->has_expiry,
            'expiry_date' => $doc->expiry_date?->toDateString(),
            'verification_status' => $doc->verification_status,
            'updated_at' => $doc->updated_at?->toDateTimeString(),
        ];
    }

    /** Arsip kapal (soft delete) — blokir bila masih punya perjalanan aktif. */
    public function archive(Vessel $vessel)
    {
        $this->authorize('update', $vessel);

        $active = $vessel->voyages()
            ->whereNotIn('voyage_status', ['completed', 'cancelled'])
            ->count();
        if ($active > 0) {
            return back()->with('error', "Kapal masih memiliki {$active} perjalanan aktif — selesaikan atau batalkan dulu sebelum arsip.");
        }

        \App\Services\AuditService::log('archived', 'vessel', $vessel->id, $vessel->toArray(), null, "Kapal diarsipkan: {$vessel->vessel_name}");
        $vessel->delete();

        return redirect()->route('fleet.index')->with('success', "Kapal \"{$vessel->vessel_name}\" diarsipkan.");
    }
}
