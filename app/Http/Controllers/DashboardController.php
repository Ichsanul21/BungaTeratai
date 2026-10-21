<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\Bill;
use App\Models\CashAccount;
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
        $months = min(12, max(1, (int) $request->integer('months', 6)));
        $vesselType = $request->string('type')->toString();

        // ===== Armada =====
        $completeness = app(DocumentCompletenessService::class);
        $ready = 0;
        $followUp = 0;
        $underReview = 0;
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
        }

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

        // ===== Keuangan =====
        $kasTotal = (float) CashAccount::sum('balance');
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

        // ===== Status dokumen (pie) =====
        $docsByStatus = Document::where('is_archived', false)
            ->groupBy('verification_status')
            ->selectRaw('verification_status, COUNT(*) as total')
            ->pluck('total', 'verification_status');

        // ===== Panels =====
        $reminders = app(ReminderService::class)->dueDocuments()->take(5)->values();
        $recentVoyages = Voyage::with('vessel')->latest()->limit(5)->get()->map(fn ($v) => [
            'id' => $v->id,
            'voyage_code' => $v->voyage_code,
            'vessel_name' => $v->vessel?->vessel_name,
            'route' => $v->origin.' → '.$v->destination,
            'voyage_status' => $v->voyage_status,
            'planned_departure' => $v->planned_departure?->toDateTimeString(),
        ]);
        $recentActivity = AuditLog::with('user')->orderByDesc('timestamp')->limit(8)->get()->map(fn ($a) => [
            'id' => $a->id,
            'action' => $a->action,
            'entity_type' => $a->entity_type,
            'user_name' => $a->user?->name ?? 'Sistem',
            'change_summary' => $a->change_summary,
            'timestamp' => $a->timestamp,
        ]);

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
                'kas_total' => $kasTotal,
                'piutang' => $piutang,
                'hutang' => $hutang,
                'anomali_bbm' => $anomaliBbm,
            ],
            'revenueSeries' => $revenueSeries,
            'docsByStatus' => $docsByStatus,
            'reminders' => $reminders,
            'recentVoyages' => $recentVoyages,
            'recentActivity' => $recentActivity,
            'filters' => ['months' => $months, 'type' => $vesselType],
            'vesselTypes' => Vessel::selectRaw('DISTINCT vessel_type')->pluck('vessel_type'),
            'unreadNotifications' => auth()->user()
                ? \App\Models\Notification::where('recipient_id', auth()->id())->where('read_status', false)->count()
                : 0,
        ]);
    }
}
