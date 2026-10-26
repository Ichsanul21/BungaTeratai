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
        // Default rentang 12 bulan (1 tahun): kunjungan pertama tanpa
        // parameter `months` tetap menyajikan data 12 bulan penuh,
        // sehingga URL bisa dipertahankan bersih di "/dashboard".
        $months = min(12, max(1, (int) $request->integer('months', 12)));
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
            'assigner_name' => $a->assigner_name ?? ($a->after['assigner_name'] ?? null),
            'assigned_to' => $a->assigned_to ?? ($a->after['assigned_to'] ?? null),
        ]);
        $vesselPositions = Vessel::orderBy('vessel_name')->get([
            'id', 'vessel_name', 'vessel_type', 'last_lat', 'last_lng',
            'last_position_at', 'operational_status',
        ])->map(fn ($vessel) => [
            'id' => $vessel->id,
            'vessel_name' => $vessel->vessel_name,
            'vessel_type' => $vessel->vessel_type,
            'last_lat' => $vessel->last_lat,
            'last_lng' => $vessel->last_lng,
            'last_position_at' => $vessel->last_position_at,
            'operational_status' => $vessel->operational_status,
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
            'docsByStatus' => $docsByStatus,
            'reminders' => $reminders,
            'recentVoyages' => $recentVoyages,
            'recentActivity' => $recentActivity,
            'vesselPositions' => $vesselPositions,
            'filters' => ['months' => $months, 'type' => $vesselType],
            'vesselTypes' => Vessel::selectRaw('DISTINCT vessel_type')->pluck('vessel_type'),
            'unreadNotifications' => auth()->user()
                ? \App\Models\Notification::where('recipient_id', auth()->id())->where('read_status', false)->count()
                : 0,
        ]);
    }
}