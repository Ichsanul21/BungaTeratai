<?php

namespace App\Http\Controllers;

use App\Models\Bill;
use App\Models\CashAccount;
use App\Models\CashTransaction;
use App\Models\Document;
use App\Models\FuelLog;
use App\Models\Invoice;
use App\Models\Vessel;
use App\Models\Voyage;
use App\Services\DocumentCompletenessService;
use App\Services\ReminderService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        // Default rentang 12 bulan (1 tahun): kunjungan pertama tanpa
        // parameter `months` tetap menyajikan data 12 bulan penuh,
        // sehingga URL bisa dipertahankan bersih di "/dashboard".
        $months = min(12, max(1, (int) $request->integer('months', 6)));
        $vesselType = $request->string('type')->toString();

        // ===== Armada =====
        $completeness = app(DocumentCompletenessService::class);
        $ready = 0;
        $followUp = 0;
        $underReview = 0;
        $bucketHigh = 0;
        $bucketMid = 0;
        $bucketLow = 0;
        $attentionVessels = [];
        $vesselsForCalc = Vessel::when($vesselType, fn ($q) => $q->where('vessel_type', $vesselType))->get();

        $pendingDocsByVessel = Document::where('verification_status', 'under_review')
            ->where('owner_type', 'vessel')
            ->groupBy('owner_id')
            ->pluck('owner_id', 'owner_id');

        foreach ($vesselsForCalc as $vessel) {
            $calc = $completeness->forVessel($vessel);
            $isPending = $pendingDocsByVessel->has($vessel->id);
            if ($isPending) {
                $underReview++;
            }
            if ($calc['percent'] >= 90 && ! $isPending) {
                $ready++;
            } elseif ($calc['percent'] < 90) {
                $followUp++;
            }

            if ($calc['percent'] >= 90) {
                $bucketHigh++;
            } elseif ($calc['percent'] >= 70) {
                $bucketMid++;
            } else {
                $bucketLow++;
            }

            if ($calc['percent'] < 90) {
                $attentionVessels[] = [
                    'id' => $vessel->id,
                    'name' => $vessel->vessel_name,
                    'percent' => $calc['percent'],
                    'missing' => count($calc['missing']),
                ];
            }
        }
        usort($attentionVessels, fn ($a, $b) => $a['percent'] <=> $b['percent']);
        $attentionVessels = array_slice($attentionVessels, 0, 5);

        // ===== Perjalanan =====
        $activeStatuses = [
            'planned', 'document_preparation', 'internal_review', 'awaiting_external_approval',
            'ready_for_departure', 'departed', 'in_transit', 'delayed',
        ];
        $voyageAktif = Voyage::whereIn('voyage_status', $activeStatuses)->count();
        $voyagePending = Voyage::whereIn('voyage_status', [
            'document_preparation', 'internal_review', 'awaiting_external_approval',
        ])->count();
        $voyageSelesai = Voyage::where('voyage_status', 'completed')->count();

        // ===== Dokumen =====
        $docsExpiring = Document::where('has_expiry', true)
            ->whereNotNull('expiry_date')
            ->where('is_archived', false)
            ->whereDate('expiry_date', '>=', now()->toDateString())
            ->whereDate('expiry_date', '<=', now()->addDays(30)->toDateString())
            ->count();
        $docsExpired = Document::where('has_expiry', true)
            ->whereNotNull('expiry_date')
            ->where('is_archived', false)
            ->whereDate('expiry_date', '<', now()->toDateString())
            ->count();
        $docsReview = Document::where('verification_status', 'under_review')
            ->where('is_archived', false)
            ->count();
        $docsEndorsement = Document::where('has_endorsement', true)
            ->whereNotNull('endorsement_next_date')
            ->where('is_archived', false)
            ->whereDate('endorsement_next_date', '<=', now()->addDays(60)->toDateString())
            ->count();

        // ===== Keuangan =====
        $user = auth()->user();
        $canViewBalances = $user?->can('finance.view-balances') ?? false;
        $kasTotal = $canViewBalances ? (float) CashAccount::sum('balance') : null;
        $kasTunai = $canViewBalances ? (float) CashAccount::where('type', 'kas')->sum('balance') : null;
        $bankTotal = $canViewBalances ? (float) CashAccount::where('type', 'bank')->sum('balance') : null;
        $cashAccountsSummary = $canViewBalances
            ? CashAccount::get(['id', 'name', 'type', 'balance', 'account_number'])
            : collect();
        $piutang = (float) Invoice::whereIn('status', ['unpaid', 'partial'])
            ->selectRaw('COALESCE(SUM(total - paid_amount),0) as sisa')->value('sisa');
        $hutang = (float) Bill::whereIn('status', ['unpaid', 'partial'])
            ->selectRaw('COALESCE(SUM(total - paid_amount),0) as sisa')->value('sisa');
        $anomaliBbm = FuelLog::where('analysis_status', 'tidak_normal')->count();

        // ===== Grafik pendapatan N bulan =====
        $revenueSeries = [];
        for ($i = $months - 1; $i >= 0; $i--) {
            $month = now()->subMonths($i);
            $revenueSeries[] = [
                'bulan' => $month->format('M Y'),
                'pendapatan' => (float) Invoice::whereMonth('issue_date', $month->month)
                    ->whereYear('issue_date', $month->year)
                    ->sum('total'),
                'biaya' => (float) Bill::whereMonth('issue_date', $month->month)
                    ->whereYear('issue_date', $month->year)
                    ->sum('total'),
            ];
        }

        // ===== Panels =====
        $reminders = app(ReminderService::class)->dueDocuments()->take(5)->values();

        // ===== Arus kas 30 hari =====
        $cashIn30 = (float) CashTransaction::whereDate('date', '>=', now()->subDays(30)->toDateString())
            ->where('direction', 'in')->sum('amount');
        $cashOut30 = (float) CashTransaction::whereDate('date', '>=', now()->subDays(30)->toDateString())
            ->where('direction', 'out')->sum('amount');

        // ===== Aging piutang & hutang =====
        $aging = function (string $model): array {
            $rows = $model::whereIn('status', ['unpaid', 'partial'])
                ->get(['total', 'paid_amount', 'due_date']);

            $buckets = ['current' => 0.0, 'd1_30' => 0.0, 'd31_60' => 0.0, 'd60_plus' => 0.0];
            $overdue = 0;
            $today = now()->startOfDay()->timestamp;

            foreach ($rows as $row) {
                $remaining = (float) $row->total - (float) $row->paid_amount;
                if ($remaining <= 0) {
                    continue;
                }
                $days = $row->due_date
                    ? (int) floor(($row->due_date->startOfDay()->timestamp - $today) / 86400)
                    : 0;

                if ($days > 0) {
                    $buckets['current'] += $remaining;
                } elseif ($days >= -30) {
                    $buckets['d1_30'] += $remaining;
                    $overdue++;
                } elseif ($days >= -60) {
                    $buckets['d31_60'] += $remaining;
                    $overdue++;
                } else {
                    $buckets['d60_plus'] += $remaining;
                    $overdue++;
                }
            }

            return [
                'buckets' => $buckets,
                'overdue' => $overdue,
                'total' => array_sum($buckets),
                'count' => $rows->count(),
            ];
        };
        $arAging = $aging(Invoice::class);
        $apAging = $aging(Bill::class);

        // ===== BBM 30 hari + seri 6 bulan =====
        $fuelRows = FuelLog::whereDate('trip_date', '>=', now()->subDays(30)->toDateString())
            ->get(['liters', 'cost', 'duration_hours', 'baseline_lph_snapshot', 'analysis_status']);

        $fuelLiters = (float) $fuelRows->sum('liters');
        $fuelHours = (float) $fuelRows->sum('duration_hours');
        $fuelBaselines = $fuelRows->pluck('baseline_lph_snapshot')->filter(fn ($v) => (float) $v > 0);

        $fuel30 = [
            'cost' => (float) $fuelRows->sum('cost'),
            'liters' => $fuelLiters,
            'trips' => $fuelRows->count(),
            'lph' => $fuelHours > 0 ? $fuelLiters / $fuelHours : 0.0,
            'baseline' => $fuelBaselines->isNotEmpty() ? (float) $fuelBaselines->avg() : 0.0,
            'anomalies' => $fuelRows->where('analysis_status', '!=', 'normal')->count(),
        ];

        $fuelSeries = [];
        for ($i = 5; $i >= 0; $i--) {
            $month = now()->subMonths($i);
            $fuelSeries[] = [
                'bulan' => $month->format('M'),
                'biaya' => (float) FuelLog::whereMonth('trip_date', $month->month)
                    ->whereYear('trip_date', $month->year)->sum('cost'),
                'liter' => (float) FuelLog::whereMonth('trip_date', $month->month)
                    ->whereYear('trip_date', $month->year)->sum('liters'),
            ];
        }

        // ===== Tahapan perjalanan =====
        $stageMap = [
            'persiapan' => ['planned', 'document_preparation'],
            'persetujuan' => ['internal_review', 'awaiting_external_approval'],
            'siap' => ['ready_for_departure'],
            'berlayar' => ['departed', 'in_transit', 'delayed'],
            'selesai' => ['completed'],
        ];
        $voyageStages = [];
        foreach ($stageMap as $key => $statuses) {
            $voyageStages[$key] = Voyage::whereIn('voyage_status', $statuses)->count();
        }

        $voyageLate = Voyage::where(function ($query) {
            $query->where('voyage_status', 'delayed')
                ->orWhere(function ($late) {
                    $late->whereDate('planned_departure', '<', now()->toDateString())
                        ->whereIn('voyage_status', [
                            'planned', 'document_preparation', 'internal_review',
                            'awaiting_external_approval', 'ready_for_departure',
                        ]);
                });
        })->count();

        $approvalQueue = $docsReview + Voyage::where('voyage_status', 'internal_review')->count();

        // ===== Snapshot armada =====
        $vesselSailing = Voyage::whereIn('voyage_status', ['departed', 'in_transit', 'delayed'])
            ->distinct('vessel_id')->count('vessel_id');
        $vesselRepair = Vessel::whereIn('operational_status', ['dalam_perbaikan', 'dock'])->count();

        // ===== Perbandingan periode sebelumnya (owner view) =====
        $prevRevenue = 0.0;
        $prevCost = 0.0;
        for ($i = ($months * 2) - 1; $i >= $months; $i--) {
            $month = now()->subMonths($i);
            $prevRevenue += (float) Invoice::whereMonth('issue_date', $month->month)
                ->whereYear('issue_date', $month->year)->sum('total');
            $prevCost += (float) Bill::whereMonth('issue_date', $month->month)
                ->whereYear('issue_date', $month->year)->sum('total');
        }

        // ===== Piutang & hutang teratas =====
        $daysLeft = fn ($due) => $due
            ? (int) floor(($due->startOfDay()->timestamp - now()->startOfDay()->timestamp) / 86400)
            : null;

        $topReceivables = Invoice::with('customer')
            ->whereIn('status', ['unpaid', 'partial'])
            ->orderByRaw('(total - paid_amount) DESC')
            ->limit(4)
            ->get(['id', 'number', 'customer_id', 'total', 'paid_amount', 'due_date', 'status'])
            ->map(fn ($inv) => [
                'id' => $inv->id,
                'number' => $inv->number,
                'party' => $inv->customer?->name ?? 'Tanpa pelanggan',
                'remaining' => (float) ($inv->total - $inv->paid_amount),
                'due_date' => $inv->due_date?->toDateString(),
                'days_left' => $daysLeft($inv->due_date),
                'status' => $inv->status,
            ]);

        $topPayables = Bill::with('supplier')
            ->whereIn('status', ['unpaid', 'partial'])
            ->orderByRaw('(total - paid_amount) DESC')
            ->limit(4)
            ->get(['id', 'number', 'supplier_id', 'total', 'paid_amount', 'due_date', 'status'])
            ->map(fn ($bill) => [
                'id' => $bill->id,
                'number' => $bill->number,
                'party' => $bill->supplier?->name ?? 'Tanpa supplier',
                'remaining' => (float) ($bill->total - $bill->paid_amount),
                'due_date' => $bill->due_date?->toDateString(),
                'days_left' => $daysLeft($bill->due_date),
                'status' => $bill->status,
            ]);

        // ===== Perjalanan aktif + progres checklist =====
        $activeVoyageRows = Voyage::with('vessel')
            ->whereIn('voyage_status', $activeStatuses)
            ->orderByDesc('planned_departure')
            ->limit(5)
            ->get()
            ->map(function ($v) {
                $total = \App\Models\VoyageChecklist::where('voyage_id', $v->id)->count();
                $done = \App\Models\VoyageChecklist::where('voyage_id', $v->id)
                    ->where('completion_status', 'terpenuhi')->count();

                return [
                    'id' => $v->id,
                    'voyage_code' => $v->voyage_code,
                    'vessel_name' => $v->vessel?->vessel_name,
                    'route' => $v->origin.' → '.$v->destination,
                    'voyage_status' => $v->voyage_status,
                    'planned_departure' => $v->planned_departure?->toDateString(),
                    'checklist_percent' => $total > 0 ? (int) round(($done / $total) * 100) : 0,
                ];
            });

        // ===== Kepatuhan & SDM =====
        $crewOnboard = \App\Models\CrewAssignment::where('status', 'aktif')->distinct('crew_id')->count('crew_id');
        $certExpiring = \App\Models\CrewCertificate::whereNotNull('expiry_date')
            ->whereDate('expiry_date', '>=', now()->toDateString())
            ->whereDate('expiry_date', '<=', now()->addDays(30)->toDateString())
            ->count();
        $horLogs = \App\Models\HoursOfRestLog::whereDate('log_date', '>=', now()->subDays(7)->toDateString())->count();
        $horCompliance = $horLogs > 0
            ? (int) round((float) \App\Models\HoursOfRestLog::whereDate('log_date', '>=', now()->subDays(7)->toDateString())
                ->selectRaw('AVG(CASE WHEN is_compliant THEN 1.0 ELSE 0.0 END) as p')->value('p') * 100)
            : null;

        return Inertia::render('Dashboard', [
            'kpis' => [
                'armada_total' => $vesselsForCalc->count(),
                'armada_siap' => $ready,
                'armada_tindak_lanjut' => $followUp,
                'armada_ditinjau' => $underReview,
                'voyage_aktif' => $voyageAktif,
                'voyage_pending' => $voyagePending,
                'voyage_selesai' => $voyageSelesai,
                'docs_expiring' => $docsExpiring,
                'docs_expired' => $docsExpired,
                'docs_total' => Document::where('is_archived', false)->count(),
                'can_view_balances' => $canViewBalances,
                'kas_total' => $kasTotal,
                'kas_tunai' => $kasTunai,
                'bank_total' => $bankTotal,
                'piutang' => $piutang,
                'hutang' => $hutang,
                'anomali_bbm' => $anomaliBbm,
            ],
            'cashAccountsSummary' => $cashAccountsSummary,
            'revenueSeries' => $revenueSeries,
            'reminders' => $reminders,
            'filters' => ['months' => $months, 'type' => $vesselType],
            'vesselTypes' => Vessel::selectRaw('DISTINCT vessel_type')->pluck('vessel_type'),
            'periodCompare' => [
                'revenue' => $prevRevenue,
                'cost' => $prevCost,
            ],
            'completenessBuckets' => [
                'high' => $bucketHigh,
                'mid' => $bucketMid,
                'low' => $bucketLow,
            ],
            'topReceivables' => $topReceivables,
            'topPayables' => $topPayables,
            'arAging' => $arAging,
            'apAging' => $apAging,
            'activeVoyageRows' => $activeVoyageRows,
            'voyageStages' => $voyageStages,
            'voyageLate' => $voyageLate,
            'attentionVessels' => $attentionVessels,
            'approvalQueue' => $approvalQueue,
            'docsReview' => $docsReview,
            'docsEndorsement' => $docsEndorsement,
            'crewOnboard' => $crewOnboard,
            'certExpiring' => $certExpiring,
            'horCompliance' => $horCompliance,
            'horLogs' => $horLogs,
            'cashFlow30' => [
                'in' => $cashIn30,
                'out' => $cashOut30,
                'net' => $cashIn30 - $cashOut30,
            ],
            'fuel30' => $fuel30,
            'fuelSeries' => $fuelSeries,
            'opsToday' => [
                'sailing' => $vesselSailing,
                'repair' => $vesselRepair,
                'active_vessels' => Vessel::where('operational_status', 'aktif')->count(),
            ],
            'unreadNotifications' => auth()->user()
                ? \App\Models\Notification::where('recipient_id', auth()->id())->where('read_status', false)->count()
                : 0,
        ]);
    }
}