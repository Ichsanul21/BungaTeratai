import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { VOYAGE_STATUS_LABELS } from '@/Constants/navigation';
import { classNames, daysUntil, formatDate, formatNumber, formatRupiah } from '@/lib/format';
import { type PageProps } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Select, Skeleton } from 'antd';
import {
    AlertTriangle,
    Anchor,
    ArrowDownRight,
    ArrowRight,
    ArrowUpRight,
    BellRing,
    CalendarClock,
    ChevronRight,
    ClipboardCheck,
    FileWarning,
    Gauge,
    Landmark,
    Ship,
    ShieldCheck,
    Users,
    Waves,
} from 'lucide-react';
import { useMemo } from 'react';
import {
    Area,
    AreaChart,
    Bar,
    CartesianGrid,
    Cell,
    ComposedChart,
    Line,
    Pie,
    PieChart,
    ReferenceLine,
    ResponsiveContainer,
    Tooltip as RTooltip,
    XAxis,
    YAxis,
} from 'recharts';

/* ------------------------------------------------------------------ */
/* Palet & util                                                       */
/* ------------------------------------------------------------------ */

const VIZ = {
    income: '#BA0C2F',
    cost: '#00205B',
    profit: '#15803D',
    grid: '#E3E8F0',
    axis: '#5B6474',
    aging: ['#94A3B8', '#B45309', '#BA0C2F', '#6B0A1C'],
};

const EASE = 'cubic-bezier(0.22,1,0.36,1)';

const STATUS_TONES: Record<string, string> = {
    completed: 'bg-[#15803D]/10 text-[#15803D]',
    delayed: 'bg-[#BA0C2F]/10 text-[#BA0C2F]',
    cancelled: 'bg-[#BA0C2F]/10 text-[#BA0C2F]',
    ready_for_departure: 'bg-[#15803D]/10 text-[#15803D]',
    in_transit: 'bg-[#00205B]/10 text-[#00205B]',
    departed: 'bg-[#00205B]/10 text-[#00205B]',
    internal_review: 'bg-[#00205B]/10 text-[#00205B]',
    awaiting_external_approval: 'bg-[#B45309]/10 text-[#B45309]',
    document_preparation: 'bg-[#B45309]/10 text-[#B45309]',
    planned: 'bg-[#F5F7FA] text-[#5B6474]',
    draft: 'bg-[#F5F7FA] text-[#5B6474]',
};

const STAGE_LABELS: Array<{ key: string; label: string }> = [
    { key: 'persiapan', label: 'Persiapan' },
    { key: 'persetujuan', label: 'Persetujuan' },
    { key: 'siap', label: 'Siap' },
    { key: 'berlayar', label: 'Berlayar' },
    { key: 'selesai', label: 'Selesai' },
];

function ringkasRupiah(v: number | null | undefined): string {
    const n = Number(v ?? 0);
    const a = Math.abs(n);
    const tanda = n < 0 ? '-' : '';
    if (a >= 1_000_000_000) return `Rp ${tanda}${(a / 1_000_000_000).toLocaleString('id-ID', { maximumFractionDigits: 2 })} M`;
    if (a >= 1_000_000) return `Rp ${tanda}${(a / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt`;
    if (a >= 10_000) return `Rp ${tanda}${(a / 1_000).toLocaleString('id-ID', { maximumFractionDigits: 0 })} rb`;
    return `Rp ${tanda}${a.toLocaleString('id-ID')}`;
}

function ringkasSumbu(v: number): string {
    const a = Math.abs(v);
    const tanda = v < 0 ? '-' : '';
    if (a >= 1_000_000_000) return `${tanda}${(a / 1_000_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })}M`;
    if (a >= 1_000_000) return `${tanda}${Math.round(a / 1_000_000).toLocaleString('id-ID')}jt`;
    if (a >= 1_000) return `${tanda}${Math.round(a / 1_000).toLocaleString('id-ID')}rb`;
    return `${tanda}${Math.round(a).toLocaleString('id-ID')}`;
}

function pctChange(current: number, base: number): number | null {
    if (!base) return null;
    return ((current - base) / base) * 100;
}

function Money({ value, className }: { value: number | null | undefined; className?: string }) {
    return (
        <span className={classNames('tabular-nums', className)}>
            {formatRupiah(Number(value ?? 0))}
        </span>
    );
}
function Delta({ value, label, invert = false }: { value: number | null; label: string; invert?: boolean }) {
    if (value === null || !Number.isFinite(value)) {
        return <span className="text-[10px] text-[#5B6474]">{label}</span>;
    }
    const up = value >= 0;
    const good = invert ? !up : up;
    return (
        <span className="inline-flex items-center gap-1 text-[10px] text-[#5B6474]">
            <span className={classNames('inline-flex items-center font-semibold', good ? 'text-[#15803D]' : 'text-[#BA0C2F]')}>
                {up ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                {Math.abs(Math.round(value))}%
            </span>
            {label}
        </span>
    );
}

/* ------------------------------------------------------------------ */
/* Kerangka panel                                                     */
/* ------------------------------------------------------------------ */

function Panel({ className = '', children }: { className?: string; children: React.ReactNode }) {
    return (
        <section
            className={classNames(
                'bt-rise rounded-[20px] border border-[#E3E8F0] bg-white p-5 shadow-[0_1px_2px_rgba(17,24,39,0.04),0_18px_40px_-34px_rgba(17,24,39,0.35)]',
                className,
            )}
        >
            {children}
        </section>
    );
}

function PanelHead({
    title,
    hint,
    action,
}: {
    title: string;
    hint?: string;
    action?: React.ReactNode;
}) {
    return (
        <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
                <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#111827]">{title}</h2>
                {hint && <p className="mt-0.5 truncate text-[11px] text-[#5B6474]">{hint}</p>}
            </div>
            {action && <div className="shrink-0">{action}</div>}
        </div>
    );
}

function SeeAll({ href, label = 'Semua' }: { href: string; label?: string }) {
    return (
        <Link href={href} className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-[#BA0C2F] hover:underline">
            {label} <ChevronRight size={12} />
        </Link>
    );
}

/* ------------------------------------------------------------------ */
/* Strip "hari ini"                                                   */
/* ------------------------------------------------------------------ */

function StripCell({
    icon: Icon,
    label,
    value,
    sub,
    tone = 'neutral',
    href,
    danger,
}: {
    icon: any;
    label: string;
    value: React.ReactNode;
    sub?: string;
    tone?: 'neutral' | 'primary' | 'navy' | 'success' | 'warning';
    href: string;
    danger?: boolean;
}) {
    const color =
        tone === 'primary' ? '#BA0C2F'
        : tone === 'navy' ? '#00205B'
        : tone === 'success' ? '#15803D'
        : tone === 'warning' ? '#B45309'
        : '#111827';

    return (
        <Link
            href={href}
            className={classNames(
                'group relative flex min-w-0 items-start gap-2.5 bg-white px-4 py-3 transition-colors hover:bg-[#F5F7FA]',
                danger && 'before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-full before:bg-[#BA0C2F]',
            )}
        >
            <span
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
                style={{ background: `${color}14`, color }}
            >
                <Icon size={15} />
            </span>
            <span className="min-w-0">
                <span className="block truncate text-[9.5px] font-medium uppercase tracking-[0.12em] text-[#5B6474]">
                    {label}
                </span>
                <span className="mt-0.5 block text-[20px] font-semibold leading-none tabular-nums" style={{ color }}>
                    {value}
                </span>
                {sub && <span className="mt-1 block truncate text-[10px] text-[#5B6474]">{sub}</span>}
            </span>
            <ArrowRight
                size={12}
                className="ms-auto mt-1 shrink-0 text-[#5B6474] opacity-0 transition-opacity group-hover:opacity-100"
            />
        </Link>
    );
}

/* ------------------------------------------------------------------ */
/* Chart tooltip                                                      */
/* ------------------------------------------------------------------ */

function PerfTip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;
    const income = Number(payload.find((p: any) => p.dataKey === 'pendapatan')?.value ?? 0);
    const cost = Number(payload.find((p: any) => p.dataKey === 'biaya')?.value ?? 0);
    const margin = income > 0 ? Math.round(((income - cost) / income) * 100) : 0;

    return (
        <div className="rounded-xl border border-[#E3E8F0] bg-white px-3.5 py-2.5 shadow-[0_16px_40px_-18px_rgba(17,24,39,0.35)]">
            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-[#5B6474]">{label}</p>
            <div className="mt-1.5 space-y-1 text-xs">
                <div className="flex items-center justify-between gap-6">
                    <span className="flex items-center gap-1.5 text-[#5B6474]">
                        <span className="h-2 w-2 rounded-full" style={{ background: VIZ.income }} /> Pendapatan
                    </span>
                    <span className="font-mono font-semibold tabular-nums text-[#111827]">{formatRupiah(income)}</span>
                </div>
                <div className="flex items-center justify-between gap-6">
                    <span className="flex items-center gap-1.5 text-[#5B6474]">
                        <span className="h-2 w-2 rounded-full" style={{ background: VIZ.cost }} /> Biaya
                    </span>
                    <span className="font-mono font-semibold tabular-nums text-[#111827]">{formatRupiah(cost)}</span>
                </div>
                <div className="flex items-center justify-between gap-6">
                    <span className="flex items-center gap-1.5 text-[#5B6474]">
                        <span className="h-2 w-2 rounded-full" style={{ background: VIZ.profit }} /> Laba
                    </span>
                    <span className="font-mono font-semibold tabular-nums text-[#15803D]">{formatRupiah(income - cost)}</span>
                </div>
                <div className="flex items-center justify-between gap-6 border-t border-[#E3E8F0] pt-1">
                    <span className="text-[#5B6474]">Margin</span>
                    <span className="font-mono font-semibold tabular-nums text-[#15803D]">{margin}%</span>
                </div>
            </div>
        </div>
    );
}

function FuelTip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;
    const value = Number(payload[0]?.value ?? 0);
    return (
        <div className="rounded-lg border border-[#E3E8F0] bg-white px-2.5 py-1.5 text-[11px] shadow-lg">
            <span className="text-[#5B6474]">{label}: </span>
            <span className="font-mono font-semibold text-[#111827]">{ringkasRupiah(value)}</span>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Halaman                                                            */
/* ------------------------------------------------------------------ */

export default function Dashboard({
    kpis,
    cashAccountsSummary = [],
    revenueSeries,
    reminders,
    filters,
    periodCompare,
    completenessBuckets,
    topReceivables = [],
    topPayables = [],
    arAging,
    apAging,
    activeVoyageRows = [],
    voyageStages = {},
    voyageLate = 0,
    attentionVessels = [],
    approvalQueue = 0,
    docsReview = 0,
    docsEndorsement = 0,
    crewOnboard = 0,
    certExpiring = 0,
    horCompliance = null,
    horLogs = 0,
    cashFlow30 = { in: 0, out: 0, net: 0 },
    fuel30 = { cost: 0, liters: 0, trips: 0, lph: 0, baseline: 0, anomalies: 0 },
    fuelSeries = [],
    opsToday = { sailing: 0, repair: 0, active_vessels: 0 },
}: PageProps<{
    kpis: Record<string, any>;
    cashAccountsSummary?: Array<Record<string, any>>;
    revenueSeries: Array<{ bulan: string; pendapatan: number; biaya: number }>;
    reminders: Array<Record<string, any>>;
    filters: { months: number; type: string };
    periodCompare: { revenue: number; cost: number };
    completenessBuckets: { high: number; mid: number; low: number };
    topReceivables?: Array<Record<string, any>>;
    topPayables?: Array<Record<string, any>>;
    arAging?: { buckets: Record<string, number>; overdue: number; total: number; count: number };
    apAging?: { buckets: Record<string, number>; overdue: number; total: number; count: number };
    activeVoyageRows?: Array<Record<string, any>>;
    voyageStages?: Record<string, number>;
    voyageLate?: number;
    attentionVessels?: Array<Record<string, any>>;
    approvalQueue?: number;
    docsReview?: number;
    docsEndorsement?: number;
    crewOnboard?: number;
    certExpiring?: number;
    horCompliance?: number | null;
    horLogs?: number;
    cashFlow30?: { in: number; out: number; net: number };
    fuel30?: { cost: number; liters: number; trips: number; lph: number; baseline: number; anomalies: number };
    fuelSeries?: Array<{ bulan: string; biaya: number; liter: number }>;
    opsToday?: { sailing: number; repair: number; active_vessels: number };
}>) {
    const months = String(filters.months ?? 6);

    const totals = useMemo(() => {
        const income = revenueSeries.reduce((sum, row) => sum + (row.pendapatan ?? 0), 0);
        const cost = revenueSeries.reduce((sum, row) => sum + (row.biaya ?? 0), 0);
        return {
            income,
            cost,
            profit: income - cost,
            prevProfit: (periodCompare?.revenue ?? 0) - (periodCompare?.cost ?? 0),
            margin: income > 0 ? Math.round(((income - cost) / income) * 100) : 0,
        };
    }, [revenueSeries, periodCompare]);

    const chartData = useMemo(
        () => revenueSeries.map((row) => ({ ...row, laba: (row.pendapatan ?? 0) - (row.biaya ?? 0) })),
        [revenueSeries],
    );

    const buckets = completenessBuckets ?? { high: 0, mid: 0, low: 0 };
    const fleetTotal = buckets.high + buckets.mid + buckets.low || 1;
    const readiness = Math.round((buckets.high / fleetTotal) * 100);

    const docsTotal = Number(kpis.docs_total ?? 0);
    const docsExpired = Number(kpis.docs_expired ?? 0);
    const docsExpiring = Number(kpis.docs_expiring ?? 0);
    const docsRest = Math.max(0, docsTotal - docsExpired - docsExpiring);
    const docsMax = Math.max(docsTotal, 1);

    const agingTotal = Number(arAging?.total ?? 0) + Number(apAging?.total ?? 0);
    const apOverdueRatio = (apAging?.count ?? 0) > 0 ? (apAging?.overdue ?? 0) / (apAging?.count ?? 1) : 0;

    const fuelEfficiency = fuel30.baseline > 0 ? ((fuel30.lph - fuel30.baseline) / fuel30.baseline) * 100 : null;
    const profitDelta = totals.prevProfit > 0 ? pctChange(totals.profit, totals.prevProfit) : null;

    const loading = !kpis || !revenueSeries;

    const changeMonths = (value: string) => {
        router.get('/dashboard', value === '6' ? {} : { months: value }, { preserveState: true, replace: true });
    };

    const fleetPie = [
        { name: '≥90%', value: buckets.high, color: '#15803D' },
        { name: '70–89%', value: buckets.mid, color: '#B45309' },
        { name: '<70%', value: buckets.low, color: '#BA0C2F' },
    ];

    return (
        <AuthenticatedLayout>
            <Head title="Dashboard" />
            <>
                <style>{`
                    @keyframes bt-rise { 0% { opacity: 0; transform: translateY(10px); } 100% { opacity: 1; transform: translateY(0); } }
                    .bt-rise { animation: bt-rise .45s ${EASE} both; }
                    @media (prefers-reduced-motion: reduce) { .bt-rise { animation: none; } }
                `}</style>

                {/* Header */}
                <div className="mb-5">
                    <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[#5B6474]">
                        Ringkasan Operasional · {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                    <h1 className="mt-1.5 text-[28px] font-semibold leading-tight tracking-tight text-[#111827]">
                        Pusat Kendali Operasi
                    </h1>
                </div>


                {loading ? (
                    <Panel><Skeleton active paragraph={{ rows: 10 }} /></Panel>
                ) : (
                    <div className="space-y-5">
                        {/* Strip hari ini */}
                        <div className="bt-rise grid grid-cols-2 gap-px overflow-hidden rounded-[20px] border border-[#E3E8F0] bg-[#E3E8F0] shadow-[0_1px_2px_rgba(17,24,39,0.04)] sm:grid-cols-3 xl:grid-cols-6">
                            <StripCell
                                icon={Waves}
                                label="Berlayar"
                                value={opsToday.sailing}
                                sub={`${opsToday.active_vessels} armada aktif`}
                                tone="navy"
                                href="/operasional"
                            />
                            <StripCell
                                icon={Anchor}
                                label="Voyage Aktif"
                                value={kpis.voyage_aktif ?? 0}
                                sub={voyageLate > 0 ? `${voyageLate} terlambat` : 'semua sesuai jadwal'}
                                tone={voyageLate > 0 ? 'warning' : 'neutral'}
                                danger={voyageLate > 0}
                                href="/perjalanan"
                            />
                            <StripCell
                                icon={ClipboardCheck}
                                label="Antrean Approval"
                                value={approvalQueue}
                                sub={`${docsReview} dokumen diperiksa`}
                                tone="primary"
                                href="/persetujuan"
                            />
                            <StripCell
                                icon={FileWarning}
                                label="Dokumen ≤30 hari"
                                value={docsExpiring}
                                sub={`${docsExpired} kedaluwarsa`}
                                tone={docsExpired > 0 ? 'warning' : 'neutral'}
                                danger={docsExpired > 0}
                                href="/dokumen?validity=expiring_soon"
                            />
                            <StripCell
                                icon={Ship}
                                label="Armada Aktif"
                                value={opsToday.active_vessels}
                                sub={`${opsToday.repair} perbaikan`}
                                tone="success"
                                href="/armada"
                            />
                            <StripCell
                                icon={Users}
                                label="ABK Onboard"
                                value={crewOnboard}
                                sub={`${certExpiring} sertifikat ≤30 hari`}
                                tone={certExpiring > 0 ? 'warning' : 'neutral'}
                                href="/sdm"
                            />
                        </div>

                        {/* Kinerja + kas */}
                        <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
                            <Panel className="xl:col-span-7">
                                <PanelHead
                                    title="Kinerja Keuangan"
                                    hint={`Akumulasi ${months} bulan terakhir`}
                                    action={
                                        <div className="flex items-center gap-2">
                                            <Select
                                                size="small"
                                                value={months}
                                                onChange={changeMonths}
                                                style={{ width: 104 }}
                                                options={[3, 6, 12].map((value) => ({ value: String(value), label: `${value} bulan` }))}
                                            />
                                            <SeeAll href="/keuangan" label="Keuangan" />
                                        </div>
                                    }
                                />

                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <p className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-[#5B6474]">Pendapatan</p>
                                        <Money value={totals.income} className="mt-1 block text-[22px] font-semibold leading-none text-[#BA0C2F]" />
                                        <div className="mt-1"><Delta value={pctChange(totals.income, periodCompare?.revenue ?? 0)} label="vs periode lalu" /></div>
                                    </div>
                                    <div>
                                        <p className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-[#5B6474]">Biaya</p>
                                        <Money value={totals.cost} className="mt-1 block text-[22px] font-semibold leading-none text-[#00205B]" />
                                        <div className="mt-1"><Delta value={pctChange(totals.cost, periodCompare?.cost ?? 0)} label="vs periode lalu" invert /></div>
                                    </div>
                                    <div>
                                        <p className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-[#5B6474]">Laba</p>
                                        <Money value={totals.profit} className="mt-1 block text-[22px] font-semibold leading-none text-[#15803D]" />
                                        <div className="mt-1"><Delta value={profitDelta} label={profitDelta === null ? 'tanpa pembanding' : 'vs periode lalu'} /></div>
                                    </div>
                                </div>

                                <div className="mt-3 flex items-center justify-between">
                                    <span className={classNames('rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold', totals.margin >= 0 ? 'bg-[#15803D]/10 text-[#15803D]' : 'bg-[#BA0C2F]/10 text-[#BA0C2F]')}>
                                        margin {totals.margin}%
                                    </span>
                                    <div className="flex items-center gap-3 text-[10px] text-[#5B6474]">
                                        <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full" style={{ background: VIZ.income }} /> Pendapatan</span>
                                        <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full" style={{ background: VIZ.cost }} /> Biaya</span>
                                        <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full" style={{ background: VIZ.profit }} /> Laba</span>
                                    </div>
                                </div>

                                <div className="mt-2 h-[208px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ComposedChart data={chartData} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barGap={2}>
                                            <defs>
                                                <linearGradient id="btIncome" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor={VIZ.income} stopOpacity={1} />
                                                    <stop offset="100%" stopColor={VIZ.income} stopOpacity={0.55} />
                                                </linearGradient>
                                                <linearGradient id="btCost" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor={VIZ.cost} stopOpacity={0.95} />
                                                    <stop offset="100%" stopColor={VIZ.cost} stopOpacity={0.45} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid vertical={false} stroke={VIZ.grid} strokeDasharray="4 6" />
                                            <XAxis dataKey="bulan" tickLine={false} axisLine={false} tickMargin={6} tick={{ fontSize: 10, fill: VIZ.axis }} />
                                            <YAxis width={44} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: VIZ.axis }} tickFormatter={ringkasSumbu} />
                                            <RTooltip cursor={{ fill: 'rgba(17,24,39,0.04)' }} content={<PerfTip />} />
                                            <ReferenceLine y={0} stroke="#CBD5E1" />
                                            <Bar dataKey="pendapatan" name="Pendapatan" fill="url(#btIncome)" radius={[5, 5, 0, 0]} maxBarSize={18} />
                                            <Bar dataKey="biaya" name="Biaya" fill="url(#btCost)" radius={[5, 5, 0, 0]} maxBarSize={18} />
                                            <Line type="monotone" dataKey="laba" name="Laba" stroke={VIZ.profit} strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                </div>
                            </Panel>

                            <Panel className="xl:col-span-5">
                                <PanelHead title="Kas & Bank" hint="Saldo terkini seluruh akun" action={<SeeAll href="/keuangan?tab=kas" label="Kas" />} />
                                {kpis.can_view_balances ? (
                                    <>
                                        <Money value={kpis.kas_total} className={classNames('block text-[30px] font-semibold leading-none', Number(kpis.kas_total) < 0 ? 'text-[#BA0C2F]' : 'text-[#111827]')} />
                                        <div className="mt-2 flex flex-wrap items-center gap-2">
                                            <span className={classNames('inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold', cashFlow30.net >= 0 ? 'bg-[#15803D]/10 text-[#15803D]' : 'bg-[#BA0C2F]/10 text-[#BA0C2F]')}>
                                                {cashFlow30.net >= 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                                                arus 30 h: {ringkasRupiah(cashFlow30.net)}
                                            </span>
                                            <span className="font-mono text-[10px] text-[#5B6474]">
                                                in {ringkasRupiah(cashFlow30.in)} · out {ringkasRupiah(cashFlow30.out)}
                                            </span>
                                        </div>

                                        <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-[#E3E8F0]">
                                            <div style={{ width: `${(Number(kpis.kas_tunai ?? 0) / Math.max(Number(kpis.kas_total ?? 0), 1)) * 100}%`, background: '#00205B' }} />
                                            <div style={{ width: `${(Number(kpis.bank_total ?? 0) / Math.max(Number(kpis.kas_total ?? 0), 1)) * 100}%`, background: '#BA0C2F' }} />
                                        </div>
                                        <div className="mt-1.5 flex items-center gap-3 text-[10px] text-[#5B6474]">
                                            <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-[#00205B]" /> Kas {ringkasRupiah(kpis.kas_tunai)}</span>
                                            <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-[#BA0C2F]" /> Bank {ringkasRupiah(kpis.bank_total)}</span>
                                        </div>

                                        <ul className="mt-3 space-y-1.5">
                                            {cashAccountsSummary.slice(0, 3).map((account: any) => {
                                                const value = Number(account.balance ?? 0);
                                                return (
                                                    <li key={account.id} className="flex items-center gap-2 rounded-xl border border-[#E3E8F0] px-2.5 py-1.5">
                                                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#F5F7FA] text-[#00205B]">
                                                            <Landmark size={13} />
                                                        </span>
                                                        <span className="min-w-0 flex-1">
                                                            <span className="block truncate text-[11px] font-medium text-[#111827]">{account.name}</span>
                                                            <span className="block font-mono text-[9px] uppercase tracking-[0.1em] text-[#5B6474]">{account.type}</span>
                                                        </span>
                                                        <Money value={value} className={classNames('text-[11px] font-semibold', value < 0 ? 'text-[#BA0C2F]' : 'text-[#111827]')} />
                                                    </li>
                                                );
                                            })}
                                            {cashAccountsSummary.length === 0 && (
                                                <li className="rounded-xl border border-dashed border-[#E3E8F0] px-3 py-3 text-center text-[11px] text-[#5B6474]">
                                                    Belum ada akun kas/bank.
                                                </li>
                                            )}
                                        </ul>
                                    </>
                                ) : (
                                    <div className="rounded-xl border border-dashed border-[#E3E8F0] bg-[#F5F7FA] px-4 py-6 text-center">
                                        <p className="text-sm font-medium text-[#111827]">Akses terbatas</p>
                                        <p className="mt-1 text-[11px] text-[#5B6474]">Saldo hanya untuk Superadmin & Direksi.</p>
                                    </div>
                                )}
                            </Panel>
                        </div>

                        {/* Piutang · Hutang · BBM */}
                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                            <AgingCard
                                title="Piutang"
                                hint={`${arAging?.count ?? 0} invoice terbuka`}
                                data={arAging}
                                rows={topReceivables}
                                href="/keuangan?tab=piutang"
                                accent="#BA0C2F"
                            />
                            <AgingCard
                                title="Hutang"
                                hint={`${apAging?.count ?? 0} bill terbuka · ${apAging?.overdue ?? 0} jatuh tempo`}
                                data={apAging}
                                rows={topPayables}
                                href="/keuangan?tab=hutang"
                                accent="#00205B"
                                alert={apOverdueRatio > 0.5}
                            />

                            <Panel>
                                <PanelHead
                                    title="BBM 30 Hari"
                                    hint={`${fuel30.trips} pengisian · ${formatNumber(fuel30.liters, 0)} L`}
                                    action={<SeeAll href="/operasional?tab=bbm" label="BBM" />}
                                />
                                <div className="flex items-end justify-between gap-3">
                                    <Money value={fuel30.cost} className="text-[24px] font-semibold leading-none text-[#111827]" />
                                    <span className={classNames('rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold', fuel30.anomalies > 0 ? 'bg-[#B45309]/10 text-[#B45309]' : 'bg-[#15803D]/10 text-[#15803D]')}>
                                        {fuel30.anomalies > 0 ? `${fuel30.anomalies} anomali` : 'normal'}
                                    </span>
                                </div>

                                <div className="mt-3 h-[74px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={fuelSeries} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="btFuel" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="#00205B" stopOpacity={0.35} />
                                                    <stop offset="100%" stopColor="#00205B" stopOpacity={0.02} />
                                                </linearGradient>
                                            </defs>
                                            <RTooltip content={<FuelTip />} />
                                            <Area type="monotone" dataKey="biaya" stroke="#00205B" strokeWidth={2} fill="url(#btFuel)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>

                                <div className="mt-2 grid grid-cols-2 gap-2">
                                    <div className="rounded-xl bg-[#F5F7FA] px-3 py-2">
                                        <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#5B6474]">Efisiensi</p>
                                        <p className="mt-0.5 text-[13px] font-semibold tabular-nums text-[#111827]">
                                            {formatNumber(fuel30.lph, 1)} <span className="text-[10px] font-normal text-[#5B6474]">L/jam</span>
                                        </p>
                                        <p className="mt-0.5 text-[10px] text-[#5B6474]">
                                            baseline {formatNumber(fuel30.baseline, 1)}
                                            {fuelEfficiency !== null && (
                                                <span className={fuelEfficiency > 0 ? 'text-[#BA0C2F]' : 'text-[#15803D]'}>
                                                    {' '}· {fuelEfficiency > 0 ? '+' : ''}{Math.round(fuelEfficiency)}%
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                    <div className="rounded-xl bg-[#F5F7FA] px-3 py-2">
                                        <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#5B6474]">Rata-rata</p>
                                        <p className="mt-0.5 text-[13px] font-semibold tabular-nums text-[#111827]">
                                            {ringkasRupiah(fuel30.trips > 0 ? fuel30.cost / fuel30.trips : 0)}
                                        </p>
                                        <p className="mt-0.5 text-[10px] text-[#5B6474]">per pengisian</p>
                                    </div>
                                </div>
                            </Panel>
                        </div>

                        {/* Perjalanan + kesiapan */}
                        <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
                            <Panel className="xl:col-span-8">
                                <PanelHead
                                    title="Perjalanan Aktif"
                                    hint={`${kpis.voyage_aktif ?? 0} berjalan · ${voyageLate} terlambat`}
                                    action={<SeeAll href="/perjalanan" label="Semua" />}
                                />

                                <div className="mb-4 grid grid-cols-5 gap-1.5">
                                    {STAGE_LABELS.map((stage, index) => {
                                        const count = Number(voyageStages[stage.key] ?? 0);
                                        const active = stage.key === 'berlayar';
                                        return (
                                            <div
                                                key={stage.key}
                                                className={classNames(
                                                    'relative rounded-lg border px-2 py-1.5 text-center',
                                                    active ? 'border-[#BA0C2F]/30 bg-[#BA0C2F]/[0.06]' : 'border-[#E3E8F0] bg-[#F5F7FA]/60',
                                                )}
                                            >
                                                <p className={classNames('text-[15px] font-semibold leading-none tabular-nums', active ? 'text-[#BA0C2F]' : 'text-[#111827]')}>
                                                    {count}
                                                </p>
                                                <p className="mt-1 truncate text-[9px] font-medium uppercase tracking-[0.06em] text-[#5B6474]">{stage.label}</p>
                                                {index < STAGE_LABELS.length - 1 && (
                                                    <ArrowRight size={10} className="absolute -right-[7px] top-1/2 z-10 -translate-y-1/2 text-[#CBD5E1]" />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="border-b border-[#E3E8F0] text-[9px] uppercase tracking-[0.12em] text-[#5B6474]">
                                                <th className="py-2 pe-3 font-medium">Perjalanan</th>
                                                <th className="py-2 pe-3 font-medium">Rute</th>
                                                <th className="py-2 pe-3 font-medium">Checklist</th>
                                                <th className="py-2 pe-3 font-medium">Status</th>
                                                <th className="py-2 font-medium">Berangkat</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#E3E8F0]">
                                            {activeVoyageRows.map((row) => {
                                                const late = row.planned_departure && new Date(row.planned_departure).getTime() < new Date(new Date().toDateString()).getTime()
                                                    && !['departed', 'in_transit', 'completed'].includes(row.voyage_status);
                                                return (
                                                    <tr key={row.id} className="group hover:bg-[#F5F7FA]/70">
                                                        <td className="py-2 pe-3">
                                                            <Link href={`/perjalanan/${row.id}`} className="font-mono text-[11px] font-semibold text-[#111827] hover:text-[#BA0C2F]">
                                                                {row.voyage_code}
                                                            </Link>
                                                            <div className="max-w-[11rem] truncate text-[10px] text-[#5B6474]">{row.vessel_name}</div>
                                                        </td>
                                                        <td className="max-w-[12rem] truncate py-2 pe-3 text-[11px] text-[#5B6474]">{row.route}</td>
                                                        <td className="py-2 pe-3">
                                                            <div className="flex items-center gap-1.5">
                                                                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[#E3E8F0]">
                                                                    <div
                                                                        className="h-full rounded-full"
                                                                        style={{
                                                                            width: `${row.checklist_percent ?? 0}%`,
                                                                            background: (row.checklist_percent ?? 0) >= 90 ? '#15803D' : (row.checklist_percent ?? 0) >= 50 ? '#B45309' : '#BA0C2F',
                                                                        }}
                                                                    />
                                                                </div>
                                                                <span className="font-mono text-[9px] tabular-nums text-[#5B6474]">{row.checklist_percent ?? 0}%</span>
                                                            </div>
                                                        </td>
                                                        <td className="py-2 pe-3">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className={classNames('rounded-full px-1.5 py-0.5 text-[9px] font-semibold', STATUS_TONES[row.voyage_status] ?? 'bg-[#F5F7FA] text-[#5B6474]')}>
                                                                    {VOYAGE_STATUS_LABELS[row.voyage_status] ?? row.voyage_status}
                                                                </span>
                                                                {late && (
                                                                    <span className="rounded-full bg-[#BA0C2F] px-1.5 py-0.5 text-[8.5px] font-semibold uppercase tracking-wide text-white">
                                                                        telat
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="whitespace-nowrap py-2 text-[10px] text-[#5B6474]">{formatDate(row.planned_departure)}</td>
                                                    </tr>
                                                );
                                            })}
                                            {activeVoyageRows.length === 0 && (
                                                <tr><td colSpan={5} className="py-6 text-center text-[11px] text-[#5B6474]">Tidak ada perjalanan aktif.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </Panel>

                            <Panel className="xl:col-span-4">
                                <PanelHead title="Kesiapan Armada" hint={`${buckets.high}/${fleetTotal} kapal siap dokumen`} action={<SeeAll href="/armada" label="Armada" />} />

                                <div className="relative mx-auto h-[132px] w-[132px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={fleetPie} dataKey="value" innerRadius={46} outerRadius={62} paddingAngle={2} stroke="none" startAngle={90} endAngle={-270}>
                                                {fleetPie.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                                            </Pie>
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-[24px] font-semibold leading-none tabular-nums text-[#111827]">{readiness}%</span>
                                        <span className="mt-0.5 text-[9px] uppercase tracking-[0.1em] text-[#5B6474]">siap</span>
                                    </div>
                                </div>

                                <div className="mt-2 grid grid-cols-3 gap-1.5">
                                    {fleetPie.map((entry) => (
                                        <div key={entry.name} className="rounded-lg border border-[#E3E8F0] px-1.5 py-1 text-center">
                                            <span className="mx-auto block h-1 w-4 rounded-full" style={{ background: entry.color }} />
                                            <p className="mt-1 text-[13px] font-semibold tabular-nums text-[#111827]">{entry.value}</p>
                                            <p className="text-[8.5px] uppercase tracking-[0.06em] text-[#5B6474]">{entry.name}</p>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-3">
                                    <p className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-[#5B6474]">Perlu tindakan</p>
                                    <ul className="space-y-1.5">
                                        {attentionVessels.slice(0, 3).map((vessel: any) => (
                                            <li key={vessel.id}>
                                                <Link href={`/armada/${vessel.id}`} className="flex items-center gap-2 rounded-lg border border-[#E3E8F0] px-2 py-1.5 hover:border-[#BA0C2F]/40 hover:bg-[#F5F7FA]/60">
                                                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#BA0C2F]/10 text-[#BA0C2F]"><Ship size={12} /></span>
                                                    <span className="min-w-0 flex-1">
                                                        <span className="block truncate text-[10.5px] font-medium text-[#111827]">{vessel.name}</span>
                                                        <span className="block text-[9px] text-[#5B6474]">{vessel.missing} dokumen kurang</span>
                                                    </span>
                                                    <span className="font-mono text-[10px] font-semibold text-[#BA0C2F]">{formatNumber(vessel.percent, 0)}%</span>
                                                </Link>
                                            </li>
                                        ))}
                                        {attentionVessels.length === 0 && (
                                            <li className="rounded-lg border border-dashed border-[#E3E8F0] px-3 py-3 text-center text-[10px] text-[#5B6474]">
                                                Seluruh armada memenuhi ambang.
                                            </li>
                                        )}
                                    </ul>
                                </div>
                            </Panel>
                        </div>

                        {/* Dokumen + SDM */}
                        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                            <Panel>
                                <PanelHead
                                    title="Dokumen"
                                    hint={`${docsTotal} arsip aktif · ${docsReview} menunggu verifikasi`}
                                    action={<SeeAll href="/dokumen" label="Arsip" />}
                                />

                                <div className="flex h-3 overflow-hidden rounded-full bg-[#E3E8F0]">
                                    <div style={{ width: `${(docsExpired / docsMax) * 100}%`, background: '#BA0C2F' }} title={`Kedaluwarsa: ${docsExpired}`} />
                                    <div style={{ width: `${(docsExpiring / docsMax) * 100}%`, background: '#B45309' }} title={`≤30 hari: ${docsExpiring}`} />
                                    <div style={{ width: `${(docsRest / docsMax) * 100}%`, background: '#94A3B8' }} title={`Aman: ${docsRest}`} />
                                </div>
                                <div className="mt-2 grid grid-cols-4 gap-1.5">
                                    {[
                                        { label: 'Kedaluwarsa', value: docsExpired, color: '#BA0C2F' },
                                        { label: '≤30 hari', value: docsExpiring, color: '#B45309' },
                                        { label: 'Endorsement', value: docsEndorsement, color: '#00205B' },
                                        { label: 'Aman', value: docsRest, color: '#94A3B8' },
                                    ].map((item) => (
                                        <div key={item.label} className="rounded-lg bg-[#F5F7FA] px-2 py-1.5">
                                            <p className="truncate text-[8.5px] uppercase tracking-[0.06em] text-[#5B6474]">{item.label}</p>
                                            <p className="mt-0.5 text-[14px] font-semibold tabular-nums" style={{ color: item.color }}>{item.value}</p>
                                        </div>
                                    ))}
                                </div>

                                <ul className="mt-3 space-y-1.5">
                                    {reminders.slice(0, 4).map((reminder: any, index: number) => {
                                        const days = daysUntil(reminder.expiry);
                                        const expired = (days ?? 0) < 0;
                                        const urgent = !expired && (days ?? 0) <= 7;
                                        return (
                                            <li key={index} className="flex items-center gap-2 rounded-lg border border-[#E3E8F0] px-2.5 py-1.5">
                                                <span className={classNames('flex h-6 w-6 shrink-0 items-center justify-center rounded-md', expired ? 'bg-[#BA0C2F]/10 text-[#BA0C2F]' : urgent ? 'bg-[#B45309]/10 text-[#B45309]' : 'bg-[#F5F7FA] text-[#5B6474]')}>
                                                    {expired ? <AlertTriangle size={12} /> : <CalendarClock size={12} />}
                                                </span>
                                                <span className="min-w-0 flex-1 truncate text-[10.5px] text-[#111827]">{reminder.message}</span>
                                                <span className={classNames('shrink-0 rounded-full px-1.5 py-0.5 font-mono text-[9px] font-semibold', expired ? 'bg-[#BA0C2F]/10 text-[#BA0C2F]' : urgent ? 'bg-[#B45309]/10 text-[#B45309]' : 'bg-[#F5F7FA] text-[#5B6474]')}>
                                                    {expired ? `-${Math.abs(days ?? 0)}h` : `${days ?? 0}h`}
                                                </span>
                                            </li>
                                        );
                                    })}
                                    {reminders.length === 0 && (
                                        <li className="rounded-lg border border-dashed border-[#E3E8F0] px-3 py-3 text-center text-[10px] text-[#5B6474]">Tidak ada pengingat aktif.</li>
                                    )}
                                </ul>
                            </Panel>

                            <Panel>
                                <PanelHead title="Kepatuhan & SDM" hint="Antrean approval, awak, dan jam istirahat" action={<SeeAll href="/sdm" label="SDM" />} />

                                <div className="grid grid-cols-3 gap-3">
                                    <div className="rounded-xl border border-[#E3E8F0] p-3">
                                        <p className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.08em] text-[#5B6474]"><ClipboardCheck size={10} /> Approval</p>
                                        <p className="mt-1 text-[20px] font-semibold leading-none tabular-nums text-[#111827]">{approvalQueue}</p>
                                        <p className="mt-1 text-[9.5px] text-[#5B6474]">menunggu keputusan</p>
                                    </div>
                                    <div className="rounded-xl border border-[#E3E8F0] p-3">
                                        <p className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.08em] text-[#5B6474]"><Users size={10} /> ABK</p>
                                        <p className="mt-1 text-[20px] font-semibold leading-none tabular-nums text-[#111827]">{crewOnboard}</p>
                                        <p className="mt-1 text-[9.5px] text-[#5B6474]">penempatan aktif</p>
                                    </div>
                                    <div className="rounded-xl border border-[#E3E8F0] p-3">
                                        <p className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.08em] text-[#5B6474]"><ShieldCheck size={10} /> Sertifikat</p>
                                        <p className="mt-1 text-[20px] font-semibold leading-none tabular-nums text-[#B45309]">{certExpiring}</p>
                                        <p className="mt-1 text-[9.5px] text-[#5B6474]">≤30 hari</p>
                                    </div>
                                </div>

                                <div className="mt-3 flex items-center gap-3 rounded-xl border border-[#E3E8F0] p-3">
                                    <div
                                        className="relative flex h-[62px] w-[62px] shrink-0 items-center justify-center rounded-full"
                                        style={{
                                            background: horCompliance === null
                                                ? '#E3E8F0'
                                                : `conic-gradient(${horCompliance >= 90 ? '#15803D' : horCompliance >= 70 ? '#B45309' : '#BA0C2F'} ${horCompliance}%, #E3E8F0 0)`,
                                        }}
                                    >
                                        <div className="flex h-[48px] w-[48px] flex-col items-center justify-center rounded-full bg-white">
                                            <span className="text-[14px] font-semibold leading-none tabular-nums text-[#111827]">
                                                {horCompliance === null ? '—' : `${horCompliance}%`}
                                            </span>
                                            <span className="mt-0.5 text-[8px] uppercase tracking-[0.06em] text-[#5B6474]">HoR</span>
                                        </div>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[11px] font-medium text-[#111827]">Kepatuhan jam istirahat</p>
                                        <p className="mt-0.5 text-[10px] text-[#5B6474]">
                                            {horCompliance === null
                                                ? `Belum ada catatan 7 hari terakhir`
                                                : `${horLogs} catatan · 7 hari terakhir`}
                                        </p>
                                        <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-[#F5F7FA] px-2 py-0.5 text-[9px] text-[#5B6474]">
                                            <Gauge size={9} /> target ≥90%
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-3 flex items-center justify-between rounded-xl bg-[#F5F7FA] px-3 py-2">
                                    <span className="flex items-center gap-1.5 text-[10.5px] text-[#5B6474]"><BellRing size={12} /> Pengingat mendesak</span>
                                    <span className="font-mono text-[12px] font-semibold text-[#BA0C2F]">
                                        {reminders.filter((r: any) => (daysUntil(r.expiry) ?? 0) <= 7).length}
                                    </span>
                                </div>
                            </Panel>
                        </div>
                    </div>
                )}
            </>
        </AuthenticatedLayout>
    );
}

/* ------------------------------------------------------------------ */
/* Kartu aging (piutang / hutang)                                     */
/* ------------------------------------------------------------------ */

function AgingCard({
    title,
    hint,
    data,
    rows,
    href,
    accent,
    alert,
}: {
    title: string;
    hint: string;
    data?: { buckets: Record<string, number>; overdue: number; total: number; count: number };
    rows: Array<Record<string, any>>;
    href: string;
    accent: string;
    alert?: boolean;
}) {
    const buckets = data?.buckets ?? { current: 0, d1_30: 0, d31_60: 0, d60_plus: 0 };
    const total = Math.max(Number(data?.total ?? 0), 1);
    const segments = [
        { key: 'current', label: 'Belum jatuh tempo', color: VIZ.aging[0] },
        { key: 'd1_30', label: '1–30 hari', color: VIZ.aging[1] },
        { key: 'd31_60', label: '31–60 hari', color: VIZ.aging[2] },
        { key: 'd60_plus', label: '>60 hari', color: VIZ.aging[3] },
    ];

    return (
        <Panel className={alert ? 'ring-1 ring-[#BA0C2F]/25' : ''}>
            <PanelHead
                title={title}
                hint={hint}
                action={<SeeAll href={href} label="Detail" />}
            />

            <div className="flex items-end justify-between gap-2">
                <Money value={data?.total ?? 0} className="text-[24px] font-semibold leading-none" />
                <span className="rounded-full px-2 py-0.5 font-mono text-[9.5px] font-semibold" style={{ background: `${accent}14`, color: accent }}>
                    {data?.count ?? 0} dokumen
                </span>
            </div>

            <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-[#E3E8F0]">
                {segments.map((segment) => {
                    const value = Number(buckets[segment.key] ?? 0);
                    return <div key={segment.key} style={{ width: `${(value / total) * 100}%`, background: segment.color }} title={`${segment.label}: ${formatRupiah(value)}`} />;
                })}
            </div>
            <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-0.5">
                {segments.map((segment) => (
                    <span key={segment.key} className="flex items-center justify-between gap-1 text-[9px] text-[#5B6474]">
                        <span className="inline-flex items-center gap-1 truncate">
                            <span className="h-1.5 w-1.5 rounded-full" style={{ background: segment.color }} />
                            {segment.label}
                        </span>
                        <span className="font-mono tabular-nums">{ringkasRupiah(Number(buckets[segment.key] ?? 0))}</span>
                    </span>
                ))}
            </div>

            <ul className="mt-3 divide-y divide-[#E3E8F0]">
                {rows.slice(0, 3).map((row: any) => {
                    const danger = (row.days_left ?? 0) < 0;
                    return (
                        <li key={row.id} className="flex items-center gap-2 py-1.5">
                            <span className="min-w-0 flex-1">
                                <span className="block truncate font-mono text-[10px] font-semibold text-[#111827]">{row.number}</span>
                                <span className="block truncate text-[9.5px] text-[#5B6474]">{row.party}</span>
                            </span>
                            <span className="shrink-0 text-right">
                                <Money value={row.remaining} className="block text-[10.5px] font-semibold text-[#111827]" />
                                <span className={classNames('block font-mono text-[9px]', danger ? 'text-[#BA0C2F]' : 'text-[#5B6474]')}>
                                    {row.days_left === null ? '—' : danger ? `${Math.abs(row.days_left)} hari lewat` : `${row.days_left} hari lagi`}
                                </span>
                            </span>
                        </li>
                    );
                })}
                {rows.length === 0 && (
                    <li className="py-3 text-center text-[10px] text-[#5B6474]">Tidak ada dokumen terbuka.</li>
                )}
            </ul>
        </Panel>
    );
}
