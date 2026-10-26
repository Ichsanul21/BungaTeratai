<?php

namespace App\Http\Controllers;

use App\Models\FuelLog;
use App\Models\InventoryBalance;
use App\Models\InventoryMovement;
use App\Models\Service;
use App\Models\ServiceItem;
use App\Models\Vessel;
use App\Models\VesselCondition;
use App\Models\VesselPosition;
use App\Models\Voyage;
use App\Models\VoyageEvent;
use App\Services\AuditService;
use App\Services\FuelAnalysisService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class OperationsController extends Controller
{
    public function index(Request $request): Response
    {
        $tab = $request->string('tab')->toString() ?: 'posisi';
        if (!in_array($tab, ['posisi', 'checklist', 'logs'], true)) {
            $tab = 'posisi';
        }
        $user = auth()->user();
        $canManage = $user?->can('operations.manage') ?? false;

        $props = match ($tab) {
            'kondisi' => $this->kondisiProps(),
            'servis' => $this->servisProps(),
            'bbm' => $this->bbmProps(),
            'checklist' => $this->checklistProps(),
            'logs' => $this->logsProps(),
            default => $this->posisiProps(),
        };

        return Inertia::render('Operations/Index', [
            'tab' => $tab,
            'canManage' => $canManage,
            ...$props,
        ]);
    }

    private function posisiProps(): array
    {
        $activeStatuses = [
            'planned', 'document_preparation', 'internal_review', 'awaiting_external_approval',
            'ready_for_departure', 'departed', 'in_transit', 'delayed',
        ];
        $vessels = Vessel::orderBy('vessel_name')->get([
            'id', 'vessel_name', 'vessel_type', 'fuel_baseline_lph', 'last_lat', 'last_lng', 'last_position_at',
            'operational_status', 'base_location',
        ]);
        $vesselIds = $vessels->modelKeys();
        $conditionsByVessel = VesselCondition::whereIn('vessel_id', $vesselIds)
            ->where('id', function ($query) {
                $query->select('latest.id')
                    ->from('vessel_conditions as latest')
                    ->whereColumn('latest.vessel_id', 'vessel_conditions.vessel_id')
                    ->orderByDesc('latest.checked_at')
                    ->orderByDesc('latest.id')
                    ->limit(1);
            })->get()->keyBy('vessel_id');
        $fuelByVessel = FuelLog::whereIn('vessel_id', $vesselIds)
                ->where('id', function ($query) {
                $query->select('latest.id')
                    ->from('fuel_logs as latest')
                    ->whereColumn('latest.vessel_id', 'fuel_logs.vessel_id')
                    ->orderByDesc('latest.trip_date')
                    ->orderByDesc('latest.id')
                    ->limit(1);
            })->get()->keyBy('vessel_id');
        $activeVoyages = Voyage::with('relationships')
            ->whereIn('voyage_status', $activeStatuses)
            ->where(function ($query) use ($vesselIds) {
                $query->whereIn('vessel_id', $vesselIds)
                    ->orWhereHas('relationships', function ($relationshipQuery) use ($vesselIds) {
                        $relationshipQuery->whereIn('tugboat_id', $vesselIds)
                            ->orWhereIn('barge_id', $vesselIds);
                    });
            })
            ->orderByDesc('planned_departure')->orderByDesc('id')->get();
        $voyagesByVessel = collect();
        foreach ($activeVoyages as $voyage) {
            $relatedVesselIds = collect([$voyage->vessel_id])
                ->merge($voyage->relationships->flatMap(fn ($relationship) => [
                    $relationship->tugboat_id,
                    $relationship->barge_id,
                ]))
                ->filter()
                ->unique();
            foreach ($relatedVesselIds as $relatedVesselId) {
                if (in_array($relatedVesselId, $vesselIds) && !$voyagesByVessel->has($relatedVesselId)) {
                    $voyagesByVessel->put($relatedVesselId, $voyage);
                }
            }
        }

        $vessels = $vessels->map(fn ($vessel) => [
            'id' => $vessel->id,
            'vessel_name' => $vessel->vessel_name,
            'vessel_type' => $vessel->vessel_type,
            'vessel_type_custom' => $vessel->vessel_type_custom,
            'fuel_baseline_lph' => $vessel->fuel_baseline_lph,
            'last_lat' => $vessel->last_lat,
            'last_lng' => $vessel->last_lng,
            'last_position_at' => $vessel->last_position_at,
            'operational_status' => $vessel->operational_status,
            'base_location' => $vessel->base_location,
            'condition' => $conditionsByVessel->get($vessel->id)?->only(['score', 'checked_at', 'checklist']),
            'fuel' => $fuelByVessel->get($vessel->id)?->only([
                'id', 'trip_date', 'route', 'liters', 'cost', 'duration_hours',
                'analysis_status', 'analysis_diff_pct',
            ]),
            'voyage' => $voyagesByVessel->get($vessel->id)?->only([
                'id', 'voyage_code', 'voyage_status', 'origin', 'destination',
            ]),
        ]);

        return [
            'vessels' => $vessels,
            'recentPositions' => VesselPosition::with('vessel')
                ->orderByDesc('recorded_at')->limit(50)->get()
                ->map(fn ($p) => [
                    'id' => $p->id,
                    'vessel_name' => $p->vessel?->vessel_name,
                    'lat' => $p->lat,
                    'lng' => $p->lng,
                    'speed_knots' => $p->speed_knots,
                    'recorded_at' => $p->recorded_at,
                    'source' => $p->source,
                ]),
        ];
    }

    public function storePosition(Request $request)
    {
        Gate::authorize('operations.manage');

        $data = $request->validate([
            'vessel_id' => ['required', 'exists:vessels,id'],
            'lat' => ['required', 'numeric', 'between:-90,90'],
            'lng' => ['required', 'numeric', 'between:-180,180'],
        ]);

        $vessel = Vessel::findOrFail($data['vessel_id']);
        $recordedAt = now();
        $before = $vessel->only(['last_lat', 'last_lng', 'last_position_at']);

        DB::transaction(function () use ($vessel, $data, $recordedAt) {
            VesselPosition::create([
                'vessel_id' => $vessel->id,
                'lat' => $data['lat'],
                'lng' => $data['lng'],
                'recorded_at' => $recordedAt,
                'source' => 'manual',
            ]);
            $vessel->update([
                'last_lat' => $data['lat'],
                'last_lng' => $data['lng'],
                'last_position_at' => $recordedAt,
            ]);
        });

        AuditService::log(
            'position_updated',
            'vessel',
            $vessel->id,
            $before,
            ['last_lat' => $data['lat'], 'last_lng' => $data['lng'], 'last_position_at' => $recordedAt],
            "Posisi kapal diperbarui: {$vessel->vessel_name}",
        );

        return back()->with('success', 'Posisi kapal berhasil diperbarui.');
    }

    public function vesselHistory(Vessel $vessel)
    {
        return response()->json([
            'conditions' => VesselCondition::with('user')
                ->where('vessel_id', $vessel->id)
                ->orderByDesc('checked_at')->orderByDesc('id')->get()
                ->map(fn ($condition) => [
                    'id' => $condition->id,
                    'vessel_id' => $condition->vessel_id,
                    'vessel_name' => $vessel->vessel_name,
                    'checked_at' => $condition->checked_at,
                    'score' => $condition->score,
                    'notes' => $condition->notes,
                    'checklist' => $condition->checklist,
                    'checked_by_name' => $condition->user?->name,
                ]),
            'services' => Service::with('serviceItems.item')
                ->where('vessel_id', $vessel->id)
                ->orderByDesc('start_date')->orderByDesc('id')->get()
                ->map(fn ($service) => [
                    'id' => $service->id,
                    'vessel_id' => $service->vessel_id,
                    'vessel_name' => $vessel->vessel_name,
                    'type' => $service->type,
                    'title' => $service->title,
                    'start_date' => $service->start_date,
                    'end_date' => $service->end_date,
                    'workshop' => $service->workshop,
                    'cost' => $service->cost,
                    'status' => $service->status,
                    'notes' => $service->notes,
                    'items' => $service->serviceItems->map(fn ($item) => [
                        'item_id' => $item->item_id,
                        'item_name' => $item->item?->name,
                        'qty' => $item->qty,
                    ]),
                ]),
            'logs' => FuelLog::where('vessel_id', $vessel->id)
                ->orderByDesc('trip_date')->orderByDesc('id')->get()
                ->map(fn ($fuel) => [
                    'id' => $fuel->id,
                    'vessel_id' => $fuel->vessel_id,
                    'vessel_name' => $vessel->vessel_name,
                    'trip_date' => $fuel->trip_date,
                    'route' => $fuel->route,
                    'cargo_type' => $fuel->cargo_type,
                    'duration_hours' => $fuel->duration_hours,
                    'distance_nm' => $fuel->distance_nm,
                    'liters' => $fuel->liters,
                    'cost' => $fuel->cost,
                    'lph' => $fuel->duration_hours > 0 ? round($fuel->liters / $fuel->duration_hours, 2) : 0,
                    'baseline_lph' => $fuel->baseline_lph_snapshot,
                    'analysis_status' => $fuel->analysis_status,
                    'analysis_diff_pct' => $fuel->analysis_diff_pct,
                    'explanation_note' => $fuel->explanation_note,
                    'weather_condition' => $fuel->weather_condition,
                    'speed_knots' => $fuel->speed_knots,
                    'delay_hours' => $fuel->delay_hours,
                    'voyage_id' => $fuel->voyage_id,
                ]),
            'items' => \App\Models\InventoryItem::orderBy('name')->get(['id', 'sku', 'name', 'unit'])
                ->map(fn ($item) => [
                    'id' => $item->id,
                    'sku' => $item->sku,
                    'name' => $item->name,
                    'unit' => $item->unit,
                    'stok_kantor' => InventoryBalance::where('item_id', $item->id)
                        ->where('location_type', 'kantor')->sum('qty'),
                ]),
            'voyages' => Voyage::where('vessel_id', $vessel->id)
                ->orderByDesc('id')->get(['id', 'voyage_code', 'vessel_id']),
        ]);
    }

    private function kondisiProps(): array
    {
        return [
            'conditions' => VesselCondition::with(['vessel', 'user'])
                ->orderByDesc('checked_at')->limit(40)->get()
                ->map(fn ($c) => [
                    'id' => $c->id,
                    'vessel_id' => $c->vessel_id,
                    'vessel_name' => $c->vessel?->vessel_name,
                    'checked_at' => $c->checked_at,
                    'score' => $c->score,
                    'notes' => $c->notes,
                    'checklist' => $c->checklist,
                    'checked_by_name' => $c->user?->name,
                ]),
            'vessels' => Vessel::orderBy('vessel_name')->get(['id', 'vessel_name']),
        ];
    }

    private function servisProps(): array
    {
        return [
            'services' => Service::with(['vessel', 'serviceItems.item'])
                ->orderByDesc('start_date')->limit(50)->get()
                ->map(fn ($s) => [
                    'id' => $s->id,
                    'vessel_id' => $s->vessel_id,
                    'vessel_name' => $s->vessel?->vessel_name,
                    'type' => $s->type,
                    'title' => $s->title,
                    'start_date' => $s->start_date,
                    'end_date' => $s->end_date,
                    'workshop' => $s->workshop,
                    'cost' => $s->cost,
                    'status' => $s->status,
                    'items' => $s->serviceItems->map(fn ($i) => [
                        'item_id' => $i->item_id, 'item_name' => $i->item?->name, 'qty' => $i->qty,
                    ]),
                ]),
            'vessels' => Vessel::orderBy('vessel_name')->get(['id', 'vessel_name']),
            'items' => \App\Models\InventoryItem::orderBy('name')
                ->get(['id', 'sku', 'name', 'unit'])
                ->map(fn ($i) => [
                    'id' => $i->id, 'sku' => $i->sku, 'name' => $i->name, 'unit' => $i->unit,
                    'stok_kantor' => InventoryBalance::where('item_id', $i->id)
                        ->where('location_type', 'kantor')->sum('qty'),
                ]),
        ];
    }

    private function bbmProps(): array
    {
        $logs = \App\Models\FuelLog::with('vessel')
            ->orderByDesc('trip_date')->orderByDesc('id')->limit(100)->get()
            ->map(fn ($f) => [
                'id' => $f->id,
                'vessel_id' => $f->vessel_id,
                'vessel_name' => $f->vessel?->vessel_name,
                'trip_date' => $f->trip_date,
                'route' => $f->route,
                'cargo_type' => $f->cargo_type,
                'duration_hours' => $f->duration_hours,
                'distance_nm' => $f->distance_nm,
                'liters' => $f->liters,
                'cost' => $f->cost,
                'lph' => $f->duration_hours > 0 ? round($f->liters / $f->duration_hours, 2) : 0,
                'baseline_lph' => $f->baseline_lph_snapshot,
                'analysis_status' => $f->analysis_status,
                'analysis_diff_pct' => $f->analysis_diff_pct,
                'explanation_note' => $f->explanation_note,
                'weather_condition' => $f->weather_condition,
                'speed_knots' => $f->speed_knots,
                'delay_hours' => $f->delay_hours,
                'voyage_id' => $f->voyage_id,
            ]);

        $monthLogs = \App\Models\FuelLog::whereMonth('trip_date', now()->month)
            ->whereYear('trip_date', now()->year);

        return [
            'logs' => $logs,
            'vessels' => Vessel::whereNotNull('fuel_baseline_lph')
                ->orderBy('vessel_name')
                ->get(['id', 'vessel_name', 'fuel_baseline_lph', 'vessel_type']),
            'voyages' => Voyage::orderByDesc('id')->limit(40)->get(['id', 'voyage_code', 'vessel_id']),
            'kpis' => [
                'liter_bulan' => (float) (clone $monthLogs)->sum('liters'),
                'biaya_bulan' => (float) (clone $monthLogs)->sum('cost'),
                'anomali' => \App\Models\FuelLog::where('analysis_status', 'tidak_normal')->count(),
                'trip_bulan' => (clone $monthLogs)->count(),
            ],
        ];
    }

    private function checklistProps(): array
    {
        $voyages = Voyage::with(['vessel', 'checklists'])
            ->whereIn('voyage_status', ['document_preparation', 'internal_review', 'awaiting_external_approval', 'planned'])
            ->orderByDesc('planned_departure')->limit(30)->get()
            ->map(fn ($v) => [
                'id' => $v->id,
                'voyage_code' => $v->voyage_code,
                'vessel_name' => $v->vessel?->vessel_name,
                'voyage_status' => $v->voyage_status,
                'planned_departure' => $v->planned_departure,
                'wajib_total' => $v->checklists->where('applicability', 'wajib')->count(),
                'wajib_terpenuhi' => $v->checklists->where('applicability', 'wajib')
                    ->where('completion_status', 'terpenuhi')->count(),
                'kondisional' => $v->checklists->where('applicability', 'kondisional')->count(),
            ]);

        return ['checklistVoyages' => $voyages];
    }

    private function logsProps(): array
    {
        return [
            'voyageEvents' => VoyageEvent::with(['voyage.vessel', 'user'])
                ->whereIn('event_type', ['departed', 'arrived', 'cancelled', 'delayed', 'passenger_change', 'closed'])
                ->orderByDesc('occurred_at')->limit(60)->get()
                ->map(fn ($e) => [
                    'id' => $e->id,
                    'voyage_code' => $e->voyage?->voyage_code,
                    'vessel_name' => $e->voyage?->vessel?->vessel_name,
                    'event_type' => $e->event_type,
                    'description' => $e->description,
                    'occurred_at' => $e->occurred_at,
                    'user_name' => $e->user?->name,
                ]),
        ];
    }

    public function storeCondition(Request $request)
    {
        Gate::authorize('operations.manage');

        $data = $request->validate([
            'vessel_id' => ['required', 'exists:vessels,id'],
            'checked_at' => ['required', 'date'],
            'score' => ['required', 'integer', 'between:0,100'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'mesin' => ['required', 'in:baik,cukup,perlu_perbaikan'],
            'navigasi' => ['required', 'in:baik,cukup,perlu_perbaikan'],
            'keselamatan' => ['required', 'in:baik,cukup,perlu_perbaikan'],
            'dek' => ['required', 'in:baik,cukup,perlu_perbaikan'],
            'kamar' => ['required', 'in:baik,cukup,perlu_perbaikan'],
        ]);

        VesselCondition::create([
            'vessel_id' => $data['vessel_id'],
            'checked_at' => $data['checked_at'],
            'score' => $data['score'],
            'notes' => $data['notes'] ?? null,
            'checklist' => [
                'mesin' => $data['mesin'],
                'navigasi' => $data['navigasi'],
                'keselamatan' => $data['keselamatan'],
                'dek' => $data['dek'],
                'kamar' => $data['kamar'],
            ],
            'checked_by' => auth()->id(),
        ]);

        AuditService::log('condition_checked', 'vessel', $data['vessel_id'], null, $data, 'Pemeriksaan kondisi kapal');

        return back()->with('success', 'Hasil pemeriksaan kondisi tersimpan.');
    }

    public function storeService(Request $request)
    {
        Gate::authorize('operations.manage');

        $this->normalizeCurrencyInput($request, 'cost');

        $data = $request->validate([
            'vessel_id' => ['required', 'exists:vessels,id'],
            'type' => ['required', 'in:rutin,urgent,drydock,pemeriksaan'],
            'title' => ['required', 'string', 'max:180'],
            'start_date' => ['required', 'date'],
            'end_date' => ['nullable', 'date'],
            'workshop' => ['nullable', 'string', 'max:120'],
            'cost' => ['nullable', 'numeric', 'min:0'],
            'status' => ['required', 'in:rencana,proses,selesai'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'items' => ['nullable', 'array'],
            'items.*.item_id' => ['required', 'exists:inventory_items,id'],
            'items.*.qty' => ['required', 'numeric', 'min:0.01'],
        ]);

        $service = DB::transaction(function () use ($data) {
            $service = Service::create(collect($data)->except('items')->all());

            foreach ($data['items'] ?? [] as $item) {
                ServiceItem::create([
                    'service_id' => $service->id,
                    'item_id' => $item['item_id'],
                    'qty' => $item['qty'],
                ]);

                // Saat servis selesai → kurangi stok kantor & catat mutasi
                if ($data['status'] === 'selesai') {
                    $balance = InventoryBalance::where('item_id', $item['item_id'])
                        ->where('location_type', 'kantor')
                        ->lockForUpdate()
                        ->first();
                    if ($balance) {
                        $balance->decrement('qty', $item['qty']);
                    }
                    InventoryMovement::create([
                        'item_id' => $item['item_id'],
                        'type' => 'keluar',
                        'qty' => $item['qty'],
                        'from_location' => 'kantor',
                        'ref_type' => 'service',
                        'ref_id' => $service->id,
                        'movement_date' => now()->toDateString(),
                        'user_id' => auth()->id(),
                        'notes' => "Pemakaian untuk servis: {$service->title}",
                    ]);
                }
            }

            return $service;
        });

        AuditService::log('service_created', 'vessel', $data['vessel_id'], null, $data, "Servis baru: {$service->title}");

        return back()->with('success', 'Catatan servis tersimpan'.($data['status'] === 'selesai' ? ' & stok sparepart dipotong.' : '.'));
    }

    public function storeFuel(Request $request)
    {
        Gate::authorize('operations.manage');

        $this->normalizeCurrencyInput($request, 'cost');

        $data = $request->validate([
            'vessel_id' => ['required', 'exists:vessels,id'],
            'voyage_id' => ['nullable', 'exists:voyages,id'],
            'trip_date' => ['required', 'date'],
            'route' => ['required', 'string', 'max:180'],
            'cargo_type' => ['nullable', 'string', 'max:60'],
            'duration_hours' => ['required', 'numeric', 'min:0.1'],
            'distance_nm' => ['nullable', 'numeric', 'min:0'],
            'liters' => ['required', 'numeric', 'min:0.1'],
            'cost' => ['nullable', 'numeric', 'min:0'],
            'weather_condition' => ['nullable', 'string', 'max:120'],
            'speed_knots' => ['nullable', 'numeric', 'min:0'],
            'delay_hours' => ['nullable', 'numeric', 'min:0'],
            'explanation' => ['nullable', 'string', 'max:1000'],
        ]);

        $analysis = app(FuelAnalysisService::class);
        $vessel = Vessel::findOrFail($data['vessel_id']);

        $preview = $analysis->analyze(
            (float) $data['liters'],
            (float) $data['duration_hours'],
            $vessel->fuel_baseline_lph,
        );

        if ($preview['status'] === 'tidak_normal' && empty($data['explanation'])) {
            throw ValidationException::withMessages([
                'explanation' => 'Konsumsi Tidak Normal ('.$preview['diff_pct'].'%) memerlukan catatan penjelasan.',
            ]);
        }

        $analysis->record(
            $vessel,
            $data['trip_date'],
            $data['route'],
            $data['cargo_type'] ?? null,
            (float) $data['duration_hours'],
            isset($data['distance_nm']) && $data['distance_nm'] !== null ? (float) $data['distance_nm'] : null,
            (float) $data['liters'],
            (float) ($data['cost'] ?? 0),
            $data['explanation'] ?? null,
            ! empty($data['voyage_id']) ? (int) $data['voyage_id'] : null,
            $data['weather_condition'] ?? null,
            ! empty($data['speed_knots']) ? (float) $data['speed_knots'] : null,
            ! empty($data['delay_hours']) ? (float) $data['delay_hours'] : null,
        );

        AuditService::log('fuel_logged', 'vessel', $vessel->id, null, $data, 'Log trip BBM', null, null, null);

        return back()->with('success', 'Trip BBM tercatat - analisis: '.mb_strtoupper($preview['status']).' ('.$preview['diff_pct'].'%).');
    }

    // ===== CRUD tambahan (Fase A) =====

    public function updateCondition(Request $request, VesselCondition $condition)
    {
        Gate::authorize('operations.manage');

        $data = $request->validate([
            'vessel_id' => ['required', 'exists:vessels,id'],
            'checked_at' => ['required', 'date'],
            'score' => ['required', 'integer', 'between:0,100'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'mesin' => ['required', 'in:baik,cukup,perlu_perbaikan'],
            'navigasi' => ['required', 'in:baik,cukup,perlu_perbaikan'],
            'keselamatan' => ['required', 'in:baik,cukup,perlu_perbaikan'],
            'dek' => ['required', 'in:baik,cukup,perlu_perbaikan'],
            'kamar' => ['required', 'in:baik,cukup,perlu_perbaikan'],
        ]);

        $before = $condition->only(['score', 'notes', 'checklist']);
        $condition->update([
            'vessel_id' => $data['vessel_id'],
            'checked_at' => $data['checked_at'],
            'score' => $data['score'],
            'notes' => $data['notes'] ?? null,
            'checklist' => [
                'mesin' => $data['mesin'],
                'navigasi' => $data['navigasi'],
                'keselamatan' => $data['keselamatan'],
                'dek' => $data['dek'],
                'kamar' => $data['kamar'],
            ],
        ]);

        AuditService::log('condition_updated', 'vessel', $condition->vessel_id, $before, $data, 'Pemeriksaan kondisi diperbarui');

        return back()->with('success', 'Pemeriksaan kondisi diperbarui.');
    }

    public function deleteCondition(VesselCondition $condition)
    {
        Gate::authorize('operations.manage');

        AuditService::log('condition_deleted', 'vessel', $condition->vessel_id, $condition->toArray(), null, 'Pemeriksaan kondisi dihapus');
        $condition->delete();

        return back()->with('success', 'Pemeriksaan kondisi dihapus.');
    }

    public function updateService(Request $request, Service $service)
    {
        Gate::authorize('operations.manage');

        $this->normalizeCurrencyInput($request, 'cost');

        $data = $request->validate([
            'vessel_id' => ['required', 'exists:vessels,id'],
            'type' => ['required', 'in:rutin,urgent,drydock,pemeriksaan'],
            'title' => ['required', 'string', 'max:180'],
            'start_date' => ['required', 'date'],
            'end_date' => ['nullable', 'date'],
            'workshop' => ['nullable', 'string', 'max:120'],
            'cost' => ['nullable', 'numeric', 'min:0'],
            'status' => ['required', 'in:rencana,proses,selesai'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'items' => ['nullable', 'array'],
            'items.*.item_id' => ['required', 'exists:inventory_items,id'],
            'items.*.qty' => ['required', 'numeric', 'min:0.01'],
        ]);

        $wasSelesai = $service->status === 'selesai';
        $before = $service->only(['title', 'status', 'cost', 'type']);

        DB::transaction(function () use ($data, $service, $wasSelesai) {
            $becomesSelesai = $data['status'] === 'selesai';

            // Balikkan pemotongan stok lama bila sebelumnya sudah selesai
            if ($wasSelesai) {
                foreach ($service->serviceItems as $old) {
                    $this->restoreStock($old->item_id, $old->qty, 'Penyesuaian: servis dibatalkan/diedit', $service);
                }
            }
            $service->serviceItems()->delete();

            $service->update(collect($data)->except('items')->all());

            foreach ($data['items'] ?? [] as $item) {
                ServiceItem::create([
                    'service_id' => $service->id,
                    'item_id' => $item['item_id'],
                    'qty' => $item['qty'],
                ]);
                if ($becomesSelesai) {
                    $this->consumeStock($item['item_id'], $item['qty'], "Pemakaian servis: {$service->title}", $service);
                }
            }
        });

        AuditService::log('service_updated', 'vessel', $service->vessel_id, $before, $data, "Servis diperbarui: {$service->title}");

        return back()->with('success', 'Catatan servis diperbarui.');
    }

    public function deleteService(Service $service)
    {
        Gate::authorize('operations.manage');

        $before = $service->only(['title', 'status', 'cost', 'type']);
        $status = $service->status;

        DB::transaction(function () use ($service, $status) {
            if ($status === 'selesai') {
                foreach ($service->serviceItems as $old) {
                    $this->restoreStock($old->item_id, $old->qty, 'Penyesuaian: catatan servis dihapus', $service);
                }
            }
            $service->serviceItems()->delete();
            $service->delete();
        });

        AuditService::log('service_deleted', 'vessel', $service->vessel_id, $before, null, 'Catatan servis dihapus (stok dipulihkan bila ada)');

        return back()->with('success', 'Catatan servis dihapus.');
    }

    public function updateFuel(Request $request, FuelLog $fuel)
    {
        Gate::authorize('operations.manage');

        $this->normalizeCurrencyInput($request, 'cost');

        $data = $request->validate([
            'vessel_id' => ['required', 'exists:vessels,id'],
            'voyage_id' => ['nullable', 'exists:voyages,id'],
            'trip_date' => ['required', 'date'],
            'route' => ['required', 'string', 'max:180'],
            'cargo_type' => ['nullable', 'string', 'max:60'],
            'duration_hours' => ['required', 'numeric', 'min:0.1'],
            'distance_nm' => ['nullable', 'numeric', 'min:0'],
            'liters' => ['required', 'numeric', 'min:0.1'],
            'cost' => ['nullable', 'numeric', 'min:0'],
            'weather_condition' => ['nullable', 'string', 'max:120'],
            'speed_knots' => ['nullable', 'numeric', 'min:0'],
            'delay_hours' => ['nullable', 'numeric', 'min:0'],
            'explanation' => ['nullable', 'string', 'max:1000'],
        ]);

        $vessel = Vessel::findOrFail($data['vessel_id']);
        $analysis = app(FuelAnalysisService::class)->analyze(
            (float) $data['liters'],
            (float) $data['duration_hours'],
            $vessel->fuel_baseline_lph,
        );

        if ($analysis['status'] === 'tidak_normal' && empty($data['explanation'])) {
            return back()->withInput()
                ->with('error', 'Konsumsi TIDAK NORMAL ('.$analysis['diff_pct'].'%) - catatan penjelasan wajib diisi.');
        }

        $before = $fuel->only(['route', 'liters', 'duration_hours', 'cost', 'analysis_status']);
        $fuel->update([
            'vessel_id' => $vessel->id,
            'voyage_id' => ! empty($data['voyage_id']) ? (int) $data['voyage_id'] : $fuel->voyage_id,
            'trip_date' => $data['trip_date'],
            'route' => $data['route'],
            'cargo_type' => $data['cargo_type'] ?? null,
            'duration_hours' => $data['duration_hours'],
            'distance_nm' => $data['distance_nm'] ?? null,
            'liters' => $data['liters'],
            'cost' => $data['cost'] ?? 0,
            'weather_condition' => $data['weather_condition'] ?? $fuel->weather_condition,
            'speed_knots' => ! empty($data['speed_knots']) ? (float) $data['speed_knots'] : $fuel->speed_knots,
            'delay_hours' => ! empty($data['delay_hours']) ? (float) $data['delay_hours'] : $fuel->delay_hours,
            'baseline_lph_snapshot' => $vessel->fuel_baseline_lph,
            'analysis_status' => $analysis['status'],
            'analysis_diff_pct' => $analysis['diff_pct'],
            'explanation_note' => $data['explanation'] ?? null,
        ]);

        AuditService::log('fuel_updated', 'vessel', $vessel->id, $before, $data, 'Log BBM diperbarui (analisis dihitung ulang)');

        return back()->with('success', 'Log BBM diperbarui - analisis: '.mb_strtoupper($analysis['status']).' ('.$analysis['diff_pct'].'%).');
    }

    public function deleteFuel(FuelLog $fuel)
    {
        Gate::authorize('operations.manage');

        AuditService::log('fuel_deleted', 'vessel', $fuel->vessel_id, $fuel->toArray(), null, 'Log BBM dihapus');
        $fuel->delete();

        return back()->with('success', 'Log BBM dihapus.');
    }

    private function consumeStock(int $itemId, float $qty, string $note, Service $service): void
    {
        $balance = InventoryBalance::where('item_id', $itemId)
            ->where('location_type', 'kantor')
            ->lockForUpdate()
            ->first();
        if ($balance) {
            $balance->decrement('qty', $qty);
        }
        InventoryMovement::create([
            'item_id' => $itemId,
            'type' => 'keluar',
            'qty' => $qty,
            'from_location' => 'kantor',
            'ref_type' => 'service',
            'ref_id' => $service->id,
            'movement_date' => now()->toDateString(),
            'user_id' => auth()->id(),
            'notes' => $note,
        ]);
    }

    private function normalizeCurrencyInput(Request $request, string $field): void
    {
        if (! $request->filled($field) || ! is_string($request->input($field))) {
            return;
        }

        $value = str_replace(' ', '', trim($request->input($field)));
        if (str_contains($value, ',')) {
            $value = str_replace('.', '', $value);
            $value = str_replace(',', '.', $value);
        } elseif (preg_match('/^\d{1,3}(?:\.\d{3})+$/', $value)) {
            $value = str_replace('.', '', $value);
        }

        $request->merge([$field => $value]);
    }

    private function restoreStock(int $itemId, float $qty, string $note, Service $service): void
    {
        $balance = InventoryBalance::where('item_id', $itemId)
            ->where('location_type', 'kantor')
            ->lockForUpdate()
            ->first();
        if ($balance) {
            $balance->increment('qty', $qty);
        } else {
            InventoryBalance::create(['item_id' => $itemId, 'location_type' => 'kantor', 'qty' => $qty]);
        }
        InventoryMovement::create([
            'item_id' => $itemId,
            'type' => 'penyesuaian',
            'qty' => $qty,
            'to_location' => 'kantor',
            'ref_type' => 'service',
            'ref_id' => $service->id,
            'movement_date' => now()->toDateString(),
            'user_id' => auth()->id(),
            'notes' => $note,
        ]);
    }
}
