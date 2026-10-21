<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\Document;
use App\Models\FuelLog;
use App\Models\Invoice;
use App\Models\Service;
use App\Models\Vessel;
use App\Models\Voyage;
use App\Services\DocumentCompletenessService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ReportsController extends Controller
{
    public function index(Request $request): Response
    {
        $tab = $request->string('tab')->toString() ?: 'armada';
        $vesselId = $request->integer('vessel_id');
        $from = $request->string('from')->toString() ?: now()->startOfYear()->toDateString();
        $to = $request->string('to')->toString() ?: now()->toDateString();

        $completeness = app(DocumentCompletenessService::class);

        $data = match ($tab) {
            'dokumen' => $this->dokumen($vesselId),
            'perjalanan' => $this->perjalanan($vesselId, $from, $to),
            'operasional' => $this->operasional($vesselId, $from, $to),
            default => $this->armada(),
        };

        return Inertia::render('Reports/Index', [
            'tab' => $tab,
            'filters' => ['vessel_id' => $vesselId, 'from' => $from, 'to' => $to],
            'vessels' => Vessel::orderBy('vessel_name')->get(['id', 'vessel_name', 'vessel_type']),
            ...$data,
        ]);
    }

    private function armada(): array
    {
        $completeness = app(DocumentCompletenessService::class);

        return [
            'rows' => Vessel::orderBy('vessel_name')->get()->map(function ($v) use ($completeness) {
                $calc = $completeness->forVessel($v);

                return [
                    'id' => $v->id,
                    'vessel_name' => $v->vessel_name,
                    'vessel_type' => $v->vessel_type,
                    'navigation_type' => $v->navigation_type,
                    'operational_status' => $v->operational_status,
                    'base_location' => $v->base_location,
                    'year_built' => $v->year_built,
                    'kelengkapan' => $calc['percent'],
                    'kurang' => count($calc['missing']),
                    'voyages' => $v->voyages()->count(),
                ];
            }),
            'summary' => [
                'total' => Vessel::count(),
                'aktif' => Vessel::where('operational_status', 'aktif')->count(),
            ],
        ];
    }

    private function dokumen(int $vesselId): array
    {
        $q = Document::with('category')->where('is_archived', false)->orderBy('document_name');
        if ($vesselId) {
            $q->where('owner_type', 'vessel')->where('owner_id', $vesselId);
        }

        return [
            'rows' => $q->limit(300)->get()->map(fn ($d) => [
                'id' => $d->id,
                'document_name' => $d->document_name,
                'group_code' => $d->category?->group_code,
                'owner_type' => $d->owner_type,
                'owner_name' => $d->ownerName(),
                'verification_status' => $d->verification_status,
                'has_expiry' => $d->has_expiry,
                'expiry_date' => $d->expiry_date?->toDateString(),
                'days_left' => $d->has_expiry && $d->expiry_date
                    ? (int) now()->startOfDay()->diffInDays($d->expiry_date, false)
                    : null,
            ]),
            'summary' => [
                'total' => Document::where('is_archived', false)->count(),
                'verified' => Document::where('verification_status', 'verified')->count(),
                'expiring' => Document::where('has_expiry', true)
                    ->whereBetween('expiry_date', [now()->toDateString(), now()->addDays(30)->toDateString()])
                    ->count(),
                'expired' => Document::where('has_expiry', true)
                    ->whereDate('expiry_date', '<', now()->toDateString())
                    ->count(),
            ],
        ];
    }

    private function perjalanan(int $vesselId, string $from, string $to): array
    {
        $q = Voyage::with('vessel')
            ->whereBetween('planned_departure', [$from, $to.' 23:59:59'])
            ->orderByDesc('planned_departure');
        if ($vesselId) {
            $q->where('vessel_id', $vesselId);
        }

        $voyages = $q->limit(300)->get();

        return [
            'rows' => $voyages->map(fn ($v) => [
                'id' => $v->id,
                'voyage_code' => $v->voyage_code,
                'vessel_name' => $v->vessel?->vessel_name,
                'origin' => $v->origin,
                'destination' => $v->destination,
                'voyage_status' => $v->voyage_status,
                'planned_departure' => $v->planned_departure?->toDateString(),
                'actual_arrival' => $v->actual_arrival?->toDateString(),
                'biaya' => (float) $v->bills()->sum('total'),
            ]),
            'summary' => [
                'total' => $voyages->count(),
                'selesai' => $voyages->where('voyage_status', 'completed')->count(),
                'tertunda' => $voyages->where('voyage_status', 'delayed')->count(),
                'dibatalkan' => $voyages->where('voyage_status', 'cancelled')->count(),
            ],
        ];
    }

    private function operasional(int $vesselId, string $from, string $to): array
    {
        $bbm = FuelLog::with('vessel')
            ->whereBetween('trip_date', [$from, $to])
            ->when($vesselId, fn ($q) => $q->where('vessel_id', $vesselId))
            ->orderByDesc('trip_date')->limit(200)->get();

        return [
            'rows' => $bbm->map(fn ($f) => [
                'id' => $f->id,
                'vessel_name' => $f->vessel?->vessel_name,
                'trip_date' => $f->trip_date,
                'route' => $f->route,
                'duration_hours' => $f->duration_hours,
                'liters' => $f->liters,
                'cost' => $f->cost,
                'lph' => $f->duration_hours > 0 ? round($f->liters / $f->duration_hours, 2) : 0,
                'analysis_status' => $f->analysis_status,
                'analysis_diff_pct' => $f->analysis_diff_pct,
            ]),
            'summary' => [
                'trips' => $bbm->count(),
                'liter' => (float) $bbm->sum('liters'),
                'biaya' => (float) $bbm->sum('cost'),
                'anomali' => $bbm->where('analysis_status', 'tidak_normal')->count(),
                'servis_biaya' => (float) Service::whereBetween('start_date', [$from, $to])
                    ->when($vesselId, fn ($q) => $q->where('vessel_id', $vesselId))
                    ->sum('cost'),
                'pendapatan' => (float) Invoice::whereBetween('issue_date', [$from, $to])->sum('total'),
            ],
        ];
    }
}
