import Badge, { type BadgeTone } from '@/Components/ui/Badge';
import Card from '@/Components/ui/Card';
import StatCard from '@/Components/ui/StatCard';
import { VOYAGE_STATUS_LABELS } from '@/Constants/navigation';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { classNames, daysUntil, formatDateTime, formatNumber, formatRupiah } from '@/lib/format';
import { type PageProps } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Col, Row, Select, Skeleton } from 'antd';
import {
    AlertTriangle,
    Anchor,
    BellRing,
    CalendarClock,
    FileWarning,
    Fuel,
    Landmark,
    Receipt,
    Ship,
    TrendingUp,
    Wallet,
} from 'lucide-react';
import {
    Area,
    AreaChart,
    CartesianGrid,
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

const STATUS_TONES: Record<string, BadgeTone> = {
    completed: 'success', delayed: 'danger', cancelled: 'danger',
    ready_for_departure: 'success', in_transit: 'info', departed: 'info',
    internal_review: 'info', awaiting_external_approval: 'warning',
    document_preparation: 'warning', planned: 'neutral', draft: 'neutral',
};

const VIZ = {
    pendapatan: '#C1121F',
    biaya: '#D4A96A',
    grid: '#E7E1D9',
    axis: '#8A8580',
};

const PIE_COLORS: Record<string, string> = {
    verified: '#2F8F68',
    under_review: '#1E4668',
    uploaded: '#168C8C',
    revision_required: '#D99A2B',
    rejected: '#C94C4C',
    draft: '#8A8580',
    missing: '#C1121F',
    archived: '#C9C0B2',
};

const DOC_STATUS_LABELS: Record<string, string> = {
    under_review: 'Ditinjau',
    verified: 'Terverifikasi',
    uploaded: 'Terunggah',
    revision_required: 'Perlu Revisi',
    rejected: 'Ditolak',
    draft: 'Draft',
    missing: 'Hilang',
    archived: 'Arsip',
};

const GRAIN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E")`;

const EASE = 'cubic-bezier(0.22,1,0.36,1)';

function ringkasRupiah(v: number | null | undefined): string {
    const n = Number(v ?? 0);
    const a = Math.abs(n);
    const tanda = n < 0 ? '-' : '';
    const miliar = Math.round((a / 1_000_000_000) * 100) / 100;
    if (miliar >= 1) {
        return `Rp ${tanda}${miliar.toLocaleString('id-ID', { maximumFractionDigits: 2 })} M`;
    }
    if (a >= 1_000_000) {
        return `Rp ${tanda}${(a / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt`;
    }
    if (a >= 10_000) {
        return `Rp ${tanda}${(a / 1_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} rb`;
    }
    return `Rp ${tanda}${a.toLocaleString('id-ID')}`;
}

function ringkasNilaiSumbu(v: number): string {
    const a = Math.abs(v);
    const tanda = v < 0 ? '-' : '';
    const miliar = Math.round((a / 1_000_000_000) * 100) / 100;
    if (miliar >= 1) {
        return `${tanda}${miliar.toLocaleString('id-ID', { maximumFractionDigits: 2 })}M`;
    }
    if (a >= 1_000_000) {
        return `${tanda}${Math.round(a / 1_000_000)}jt`;
    }
    if (a >= 1_000) {
        return `${tanda}${Math.round(a / 1_000)}rb`;
    }
    return `${tanda}${Math.round(a)}`;
}

function bangunQueryFilter(m: string, t: string): Record<string, string> {
    const q: Record<string, string> = {};
    if (t !== '') q.type = t;
    if (m !== '12') q.months = m;
    return q;
}

function RevenueTip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-xl border border-[#E7E1D9] bg-white px-3.5 py-2.5 shadow-[0_16px_40px_-18px_rgba(28,27,26,0.35)]">
            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-[#8A8580]">
                {label}
            </p>
            <div className="mt-1.5 space-y-1">
                {payload.map((p: any) => (
                    <div key={p.dataKey ?? p.name} className="flex items-center gap-2 text-xs">
                        <span
                            aria-hidden="true"
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ background: p.color }}
                        />
                        <span className="text-[#8A8580]">{p.name}</span>
                        <span className="ms-auto pl-4 font-mono font-semibold tabular-nums text-[#1C1B1A]">
                            {formatRupiah(p.value)}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function SectionHeader({ no, title, desc }: { no: string; title: string; desc?: string }) {
    return (
        <div className="mb-3 flex items-end gap-3">
            <span
                aria-hidden="true"
                className="font-mono text-[11px] font-semibold leading-5 text-[#D4A96A]"
            >
                {no}
            </span>
            <div className="min-w-0">
                <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#1C1B1A]">
                    {title}
                </h2>
                {desc && <p className="mt-0.5 truncate text-xs text-[#8A8580]">{desc}</p>}
            </div>
            <div
                aria-hidden="true"
                className="mb-1.5 h-px min-w-[1rem] flex-1 bg-gradient-to-r from-[#E7E1D9] via-[#E7E1D9]/60 to-transparent"
            />
        </div>
    );
}

function EmptyState({ text }: { text: string }) {
    return (
        <div className="flex min-h-[6rem] items-center justify-center rounded-xl border border-dashed border-[#E7E1D9] bg-[#FAF7F2]/50 px-4 py-6 text-center text-xs text-[#8A8580]">
            {text}
        </div>
    );
}

export default function Dashboard({
    kpis,
    revenueSeries,
    docsByStatus,
    reminders,
    recentVoyages,
    recentActivity,
    vesselPositions,
    filters,
    vesselTypes,
}: PageProps<{
    kpis: Record<string, number>;
    revenueSeries: Array<{ bulan: string; pendapatan: number; biaya: number }>;
    docsByStatus: Record<string, number>;
    reminders: Array<Record<string, any>>;
    recentVoyages: Array<Record<string, any>>;
    recentActivity: Array<Record<string, any>>;
    vesselPositions: Array<Record<string, any>>;
    filters: { months: number; type: string };
    vesselTypes: string[];
}>) {
    const { auth } = usePage<PageProps>().props;
    const firstName = (auth.user?.name ?? '').trim().split(/\s+/)[0] ?? '';

    const months = String(filters.months ?? 12);
    const type = filters.type ?? '';

    const totalPendapatan = revenueSeries.reduce((s, r) => s + (r.pendapatan ?? 0), 0);
    const totalBiaya = revenueSeries.reduce((s, r) => s + (r.biaya ?? 0), 0);
    const laba = totalPendapatan - totalBiaya;
    const marginPct = totalPendapatan > 0 ? Math.round((laba / totalPendapatan) * 100) : 0;

    const armadaTotal = kpis.armada_total ?? 0;
    const readinessPct =
        armadaTotal > 0 ? Math.round(((kpis.armada_siap ?? 0) / armadaTotal) * 100) : 0;

    const pieData = Object.entries(docsByStatus).map(([k, v]) => ({
        name: DOC_STATUS_LABELS[k] ?? k,
        value: v,
        key: k,
        warna: PIE_COLORS[k] ?? '#8A8580',
    }));
    const totalDocs = pieData.reduce((s, p) => s + p.value, 0);
    const docsAttention =
        (docsByStatus.revision_required ?? 0) +
        (docsByStatus.rejected ?? 0) +
        (docsByStatus.missing ?? 0);
    const urgentReminders = reminders.filter(
        (r) => (daysUntil(r.expiry) ?? 0) <= 7,
    ).length;

    const isLoading = !kpis || !revenueSeries || !docsByStatus;

    function DocsTip({ active, payload }: any) {
        if (!active || !payload?.length) return null;
        const p = payload[0];
        const pct = totalDocs > 0 ? Math.round((p.value / totalDocs) * 100) : 0;
        return (
            <div className="rounded-xl border border-[#E7E1D9] bg-white px-3.5 py-2 shadow-[0_16px_40px_-18px_rgba(28,27,26,0.35)]">
                <p className="text-xs font-medium text-[#1C1B1A]">{p.name}</p>
                <p className="mt-0.5 font-mono text-[11px] text-[#8A8580]">
                    {formatNumber(p.value)} dokumen &middot; {pct}%
                </p>
            </div>
        );
    }

    return (
        <AuthenticatedLayout>
            <Head title="Dashboard" />

            <style>{`
                @keyframes bt-rise {
                    0% { opacity: 0; transform: translateY(16px) scale(0.995); }
                    100% { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes bt-drift-a {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    50% { transform: translate(5%, 6%) scale(1.1); }
                }
                @keyframes bt-drift-b {
                    0%, 100% { transform: translate(0, 0) scale(1.06); }
                    50% { transform: translate(-6%, -5%) scale(0.96); }
                }
                @keyframes bt-pulse-dot {
                    0%, 100% { opacity: 0.55; }
                    50% { opacity: 1; }
                }
                .bt-scroll { scrollbar-width: thin; scrollbar-color: rgba(28,27,26,0.22) transparent; }
                .bt-scroll::-webkit-scrollbar { width: 5px; }
                .bt-scroll::-webkit-scrollbar-thumb { background: rgba(28,27,26,0.2); border-radius: 9999px; }
                .bt-scroll::-webkit-scrollbar-track { background: transparent; }
                @media (prefers-reduced-motion: reduce) {
                    .bt-anim, .bt-anim * { animation: none !important; }
                }
            `}</style>

            <section
                className="bt-anim relative mb-7 overflow-hidden rounded-2xl border border-[#E7E1D9] bg-white shadow-[0_1px_3px_rgba(28,27,26,0.04),0_8px_24px_-8px_rgba(28,27,26,0.06)]"
                style={{ animation: `bt-rise 0.55s ${EASE} both` }}
            >
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 overflow-hidden"
                >
                    <div
                        className="absolute inset-0 opacity-[0.02]"
                        style={{ backgroundImage: GRAIN }}
                    />
                    <span className="pointer-events-none absolute -right-6 -top-10 hidden select-none font-mono text-[11rem] font-semibold leading-none text-[#1C1B1A]/[0.03] xl:block">
                        BT
                    </span>
                </div>
                <div
                    aria-hidden="true"
                    className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#D4A96A]/30 to-transparent"
                />

                <div className="relative flex flex-col gap-6 p-6 lg:p-7 xl:flex-row xl:items-end xl:justify-between">
                    <div className="min-w-0 max-w-2xl">
                        <p className="flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-[#8A8580]">
                            <span
                                aria-hidden="true"
                                className="bt-anim h-2 w-2 rounded-full bg-[#D4A96A]"
                                style={{ animation: 'bt-pulse-dot 2.4s ease-in-out infinite' }}
                            />
                            Ringkasan Eksekutif
                        </p>
                        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-[#1C1B1A] sm:text-3xl">
                            {firstName ? (
                                <>
                                    Selamat datang kembali,{' '}
                                    <span className="text-[#C1121F]">{firstName}</span>.
                                </>
                            ) : (
                                'Pusat Kendali Operasi.'
                            )}
                        </h1>
                        <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#8A8580]">
                            Indikator kesiapan bersifat internal, bukan
                            persetujuan otoritas pelayaran.
                        </p>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end xl:shrink-0">
                        <label className="block">
                            <span className="mb-1 block font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-[#8A8580]">
                                Jenis kapal
                            </span>
                            <Select
                                value={type}
                                onChange={(val: string) =>
                                    router.get(
                                        '/dashboard',
                                        bangunQueryFilter(months, val),
                                        { preserveState: true, replace: true },
                                    )
                                }
                                style={{ width: '100%' }}
                                className="sm:w-44"
                                popupMatchSelectWidth={false}
                                options={[
                                    { value: '', label: 'Semua Jenis Kapal' },
                                    ...vesselTypes.map((t) => ({
                                        value: t,
                                        label: t.replace('_', ' '),
                                    })),
                                ]}
                            />
                        </label>
                        <label className="block">
                            <span className="mb-1 block font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-[#8A8580]">
                                Rentang data
                            </span>
                            <Select
                                value={months}
                                onChange={(val: string) =>
                                    router.get(
                                        '/dashboard',
                                        bangunQueryFilter(val, type),
                                        { preserveState: true, replace: true },
                                    )
                                }
                                style={{ width: '100%' }}
                                className="sm:w-32"
                                popupMatchSelectWidth={false}
                                options={[3, 6, 12].map((m) => ({
                                    value: String(m),
                                    label: `${m} bulan`,
                                }))}
                            />
                        </label>
                    </div>
                </div>

                <div className="relative grid grid-cols-2 gap-3 border-t border-[#E7E1D9] p-6 pt-5 sm:gap-4 lg:grid-cols-4 lg:p-7 lg:pt-6">
                    <div className="min-w-0 rounded-xl border border-[#E7E1D9] bg-[#FAF7F2] p-4">
                        <p className="truncate font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-[#8A8580]">
                            Kesiapan Armada
                        </p>
                        <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-[#1C1B1A]">
                            {readinessPct}%
                        </p>
                        <div
                            aria-hidden="true"
                            className="mt-2.5 h-1 overflow-hidden rounded-full bg-[#E7E1D9]"
                        >
                            <div
                                className="h-full rounded-full bg-[#D4A96A]"
                                style={{
                                    width: `${Math.min(Math.max(readinessPct, 0), 100)}%`,
                                }}
                            />
                        </div>
                        <p className="mt-2 truncate text-[11px] text-[#8A8580]">
                            siap administratif dari {formatNumber(armadaTotal)} kapal
                        </p>
                    </div>
                    <div className="min-w-0 rounded-xl border border-[#E7E1D9] bg-[#FAF7F2] p-4">
                        <p className="truncate font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-[#8A8580]">
                            Margin Operasional
                        </p>
                        <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-[#1C1B1A]">
                            {marginPct}%
                        </p>
                        <p className="mt-2 truncate text-[11px] text-[#8A8580]">
                            laba {ringkasRupiah(laba)}
                        </p>
                    </div>
                    <div className="min-w-0 rounded-xl border border-[#E7E1D9] bg-[#FAF7F2] p-4">
                        <p className="truncate font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-[#8A8580]">
                            Dokumen Perlu Perhatian
                        </p>
                        <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-[#1C1B1A]">
                            {formatNumber(docsAttention)}
                        </p>
                        <p className="mt-2 truncate text-[11px] text-[#8A8580]">
                            revisi &middot; ditolak &middot; hilang
                        </p>
                    </div>
                    <div className="min-w-0 rounded-xl border border-[#E7E1D9] bg-[#FAF7F2] p-4">
                        <p className="truncate font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-[#8A8580]">
                            Pengingat Mendesak
                        </p>
                        <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-[#1C1B1A]">
                            {formatNumber(urgentReminders)}
                        </p>
                        <p className="mt-2 truncate text-[11px] text-[#8A8580]">
                            jatuh tempo &le; 7 hari / kedaluwarsa
                        </p>
                    </div>
                </div>
            </section>

            {isLoading ? (
                <div className="mb-6 rounded-xl border border-[#E7E1D9] bg-white p-6">
                    <Skeleton active paragraph={{ rows: 4 }} />
                </div>
            ) : (
                <>
                    <section
                        className="bt-anim mb-6"
                        style={{ animation: `bt-rise 0.45s ${EASE} 70ms both` }}
                    >
                        <SectionHeader
                            no="01"
                            title="Armada"
                            desc="Kesiapan administratif seluruh armada terdaftar"
                        />
                        <Row gutter={[16, 16]}>
                            <Col xs={24} sm={12} xl={6}>
                                <StatCard label="Total Armada" value={kpis.armada_total} icon={Ship} />
                            </Col>
                            <Col xs={24} sm={12} xl={6}>
                                <StatCard label="Siap Administratif" value={kpis.armada_siap} icon={Anchor} tone="success" sub="kelengkapan ≥ 90%" />
                            </Col>
                            <Col xs={24} sm={12} xl={6}>
                                <StatCard label="Perlu Tindak Lanjut" value={kpis.armada_tindak_lanjut} icon={FileWarning} tone="warning" sub="kelengkapan < 90%" />
                            </Col>
                            <Col xs={24} sm={12} xl={6}>
                                <StatCard label="Sedang Ditinjau" value={kpis.armada_ditinjau} icon={BellRing} tone="info" sub="dokumen under review" />
                            </Col>
                        </Row>
                        <Card
                            title="Posisi Terakhir Seluruh Kapal"
                            description="Koordinat posisi terakhir yang tercatat; bukan pelacakan AIS/GPS live."
                            className="mt-5"
                            actions={
                                <Link
                                    href="/operasional?tab=posisi"
                                    className="text-xs font-medium text-[#C1121F] hover:underline"
                                >
                                    Buka peta &rarr;
                                </Link>
                            }
                        >
                            {vesselPositions.length === 0 ? (
                                <EmptyState text="Belum ada kapal terdaftar." />
                            ) : (
                                <div className="max-h-64 overflow-y-auto">
                                    <ul className="divide-y divide-[#E7E1D9]">
                                        {vesselPositions.map((vessel) => (
                                            <li key={vessel.id} className="flex flex-wrap items-center gap-3 py-2.5">
                                                <span className="min-w-0 flex-1">
                                                    <span className="block truncate text-sm font-medium text-[#1C1B1A]">
                                                        {vessel.vessel_name}
                                                    </span>
                                                    <span className="block text-xs text-[#8A8580]">
                                                        {vessel.last_lat !== null && vessel.last_lat !== undefined &&
                                                        vessel.last_lng !== null && vessel.last_lng !== undefined
                                                            ? `${vessel.last_lat}, ${vessel.last_lng}`
                                                            : 'Posisi belum tercatat'}
                                                    </span>
                                                </span>
                                                <span className="text-xs text-[#8A8580]">
                                                    {formatDateTime(vessel.last_position_at)}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </Card>
                    </section>

                    <section
                        className="bt-anim mb-6"
                        style={{ animation: `bt-rise 0.45s ${EASE} 120ms both` }}
                    >
                        <SectionHeader
                            no="02"
                            title="Perjalanan & Dokumen"
                            desc="Status operasi berjalan dan umur dokumen"
                        />
                        <Row gutter={[16, 16]}>
                            <Col xs={24} sm={12} xl={6}>
                                <StatCard label="Perjalanan Aktif" value={kpis.voyage_aktif} icon={Anchor} tone="info" onClick={() => router.get('/perjalanan?group=aktif')} />
                            </Col>
                            <Col xs={24} sm={12} xl={6}>
                                <StatCard label="Menunggu Pemeriksaan" value={kpis.voyage_pending} icon={BellRing} tone="warning" onClick={() => router.get('/perjalanan?group=pending_review')} />
                            </Col>
                            <Col xs={24} sm={12} xl={6}>
                                <StatCard label="Dokumen ≤30 Hari" value={kpis.docs_expiring} icon={CalendarClock} tone="warning" onClick={() => router.get('/dokumen?validity=expiring_soon')} />
                            </Col>
                            <Col xs={24} sm={12} xl={6}>
                                <StatCard label="Dokumen Kedaluwarsa" value={kpis.docs_expired} icon={AlertTriangle} tone="danger" onClick={() => router.get('/dokumen?validity=expired')} />
                            </Col>
                        </Row>
                    </section>

                    <section
                        className="bt-anim mb-6"
                        style={{ animation: `bt-rise 0.45s ${EASE} 170ms both` }}
                    >
                        <SectionHeader
                            no="03"
                            title="Keuangan & Operasional"
                            desc="Posisi kas & bank, rincian likuiditas, piutang, hutang, dan operasional"
                        />
                        <Row gutter={[16, 16]}>
                            {kpis.can_view_balances ? (
                                <>
                                    <Col xs={24} sm={12} lg={8} xl={5}>
                                        <StatCard
                                            label="Total Saldo Perusahaan"
                                            value={ringkasRupiah(kpis.kas_total)}
                                            icon={Landmark}
                                            tone="success"
                                            sub={`Kas ${ringkasRupiah(kpis.kas_tunai)} · Bank ${ringkasRupiah(kpis.bank_total)}`}
                                            onClick={() => router.get('/keuangan?tab=kas')}
                                        />
                                    </Col>
                                    <Col xs={24} sm={12} lg={8} xl={5}>
                                        <StatCard
                                            label="Kas Tunai"
                                            value={ringkasRupiah(kpis.kas_tunai)}
                                            icon={Wallet}
                                            tone="success"
                                            sub="Likuiditas tunai operasional"
                                            onClick={() => router.get('/keuangan?tab=kas')}
                                        />
                                    </Col>
                                    <Col xs={24} sm={12} lg={8} xl={5}>
                                        <StatCard
                                            label="Saldo Bank"
                                            value={ringkasRupiah(kpis.bank_total)}
                                            icon={Landmark}
                                            tone="info"
                                            sub="Rekening operasional bank"
                                            onClick={() => router.get('/keuangan?tab=kas')}
                                        />
                                    </Col>
                                </>
                            ) : (
                                <Col xs={24} sm={12} lg={8} xl={5}>
                                    <StatCard
                                        label="Saldo Perusahaan"
                                        value="Akses Terbatas"
                                        icon={Landmark}
                                        tone="neutral"
                                        sub="Hanya Superadmin & Direksi"
                                    />
                                </Col>
                            )}
                            <Col xs={24} sm={12} xl={6}>
                                <StatCard label="Piutang Outstanding" value={ringkasRupiah(kpis.piutang)} icon={Wallet} tone="warning" onClick={() => router.get('/keuangan?tab=piutang')} />
                            </Col>
                            <Col xs={24} sm={12} xl={6}>
                                <StatCard label="Hutang Outstanding" value={ringkasRupiah(kpis.hutang)} icon={Receipt} tone="danger" onClick={() => router.get('/keuangan?tab=hutang')} />
                            </Col>
                            <Col xs={24} sm={12} xl={6}>
                                <StatCard label="Anomali BBM" value={kpis.anomali_bbm} icon={Fuel} tone="danger" sub="trip tidak normal" onClick={() => router.get('/operasional?tab=posisi')} />
                            </Col>
                            <Col xs={24} sm={12} xl={6}>
                                <StatCard label="Perjalanan Selesai" value={kpis.voyage_selesai} icon={TrendingUp} tone="success" />
                            </Col>
                        </Row>
                    </section>

                    <section
                        className="bt-anim mb-6"
                        style={{ animation: `bt-rise 0.45s ${EASE} 220ms both` }}
                    >
                        <SectionHeader
                            no="04"
                            title="Analitik"
                            desc="Pendapatan vs biaya dan sebaran status dokumen"
                        />
                        <Row gutter={[20, 20]}>
                            <Col xs={24} xl={16}>
                                <Card
                                    title="Pendapatan vs Biaya"
                                    description={`Total ${months} bulan terakhir · laba ${formatRupiah(laba)}`}
                                    actions={
                                        <div className="flex items-center gap-3">
                                            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#8A8580]">
                                                <span
                                                    aria-hidden="true"
                                                    className="h-1.5 w-1.5 rounded-full"
                                                    style={{ background: VIZ.pendapatan }}
                                                />
                                                Pendapatan
                                            </span>
                                            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#8A8580]">
                                                <span
                                                    aria-hidden="true"
                                                    className="h-1.5 w-1.5 rounded-full"
                                                    style={{ background: VIZ.biaya }}
                                                />
                                                Biaya
                                            </span>
                                        </div>
                                    }
                                >
                                    <div className="h-72">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart
                                                data={revenueSeries}
                                                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                                            >
                                                <defs>
                                                    <linearGradient id="btRevFill" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor={VIZ.pendapatan} stopOpacity={0.2} />
                                                        <stop offset="100%" stopColor={VIZ.pendapatan} stopOpacity={0.02} />
                                                    </linearGradient>
                                                    <linearGradient id="btCostFill" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor={VIZ.biaya} stopOpacity={0.22} />
                                                        <stop offset="100%" stopColor={VIZ.biaya} stopOpacity={0.02} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid vertical={false} stroke={VIZ.grid} strokeDasharray="4 6" />
                                                <XAxis
                                                    dataKey="bulan"
                                                    tickLine={false}
                                                    axisLine={false}
                                                    tickMargin={8}
                                                    tick={{ fontSize: 11, fill: VIZ.axis }}
                                                />
                                                <YAxis
                                                    width={52}
                                                    tickLine={false}
                                                    axisLine={false}
                                                    tick={{ fontSize: 11, fill: VIZ.axis }}
                                                    tickFormatter={ringkasNilaiSumbu}
                                                />
                                                <Tooltip content={<RevenueTip />} cursor={{ stroke: VIZ.grid, strokeWidth: 1 }} />
                                                <Area
                                                    type="monotone"
                                                    dataKey="pendapatan"
                                                    name="Pendapatan"
                                                    stroke={VIZ.pendapatan}
                                                    strokeWidth={2.2}
                                                    fill="url(#btRevFill)"
                                                    dot={false}
                                                    activeDot={{ r: 4, strokeWidth: 2, stroke: '#FFFFFF', fill: VIZ.pendapatan }}
                                                />
                                                <Area
                                                    type="monotone"
                                                    dataKey="biaya"
                                                    name="Biaya"
                                                    stroke={VIZ.biaya}
                                                    strokeWidth={2}
                                                    fill="url(#btCostFill)"
                                                    dot={false}
                                                    activeDot={{ r: 4, strokeWidth: 2, stroke: '#FFFFFF', fill: VIZ.biaya }}
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </Card>
                            </Col>

                            <Col xs={24} xl={8}>
                                <Card
                                    title="Status Dokumen"
                                    description="Sebaran verifikasi seluruh dokumen"
                                    actions={
                                        <span className="font-mono text-[11px] font-medium text-[#8A8580]">
                                            {formatNumber(totalDocs)} total
                                        </span>
                                    }
                                >
                                    <div className="relative h-48">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={pieData}
                                                    dataKey="value"
                                                    nameKey="name"
                                                    innerRadius={56}
                                                    outerRadius={74}
                                                    paddingAngle={2.5}
                                                    startAngle={90}
                                                    endAngle={-270}
                                                    stroke="none"
                                                >
                                                    {pieData.map((entry) => (
                                                        <Cell key={entry.key} fill={entry.warna} />
                                                    ))}
                                                </Pie>
                                                <Tooltip content={<DocsTip />} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                                            <p className="text-2xl font-semibold tabular-nums tracking-tight text-[#1C1B1A]">
                                                {formatNumber(totalDocs)}
                                            </p>
                                            <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[#8A8580]">
                                                Dokumen
                                            </p>
                                        </div>
                                    </div>
                                    <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2">
                                        {pieData.map((p) => {
                                            const pct =
                                                totalDocs > 0 ? Math.round((p.value / totalDocs) * 100) : 0;
                                            return (
                                                <div
                                                    key={p.key}
                                                    title={`${p.name}: ${formatNumber(p.value)} dokumen (${pct}%)`}
                                                    className="flex min-w-0 items-center gap-2"
                                                >
                                                    <span
                                                        aria-hidden="true"
                                                        className="h-2 w-2 shrink-0 rounded-full"
                                                        style={{ background: p.warna }}
                                                    />
                                                    <span className="min-w-0 truncate text-xs text-[#1C1B1A]/80">
                                                        {p.name}
                                                    </span>
                                                    <span className="ms-auto shrink-0 font-mono text-[11px] font-medium text-[#8A8580]">
                                                        {formatNumber(p.value)} &middot; {pct}%
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </Card>
                            </Col>
                        </Row>
                    </section>

                    <section
                        className="bt-anim"
                        style={{ animation: `bt-rise 0.45s ${EASE} 270ms both` }}
                    >
                        <SectionHeader
                            no="05"
                            title="Pemantauan"
                            desc="Pengingat, perjalanan, dan jejak aktivitas terbaru"
                        />
                        <Row gutter={[20, 20]}>
                            <Col xs={24} xl={8}>
                                <Card
                                    title="Reminder Dokumen Teratas"
                                    actions={
                                        <Link
                                            href="/notifikasi"
                                            className="text-xs font-medium text-[#C1121F] transition-colors duration-150 hover:underline"
                                        >
                                            Semua &rarr;
                                        </Link>
                                    }
                                >
                                    {reminders.length === 0 ? (
                                        <EmptyState text="Tidak ada pengingat aktif." />
                                    ) : (
                                        <div className="bt-scroll max-h-[16rem] overflow-y-auto overscroll-contain pe-1">
                                            <ul className="space-y-2">
                                                {reminders.map((r, i) => {
                                                    const d = daysUntil(r.expiry);
                                                    const expired = (d ?? 0) < 0;
                                                    const urgent = !expired && (d ?? 0) <= 7;
                                                    return (
                                                        <li
                                                            key={i}
                                                            className="flex items-start gap-3 rounded-xl border border-[#E7E1D9] p-3 transition-colors duration-200 hover:border-[#C1121F]/30"
                                                        >
                                                            <span
                                                                className={classNames(
                                                                    'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset',
                                                                    expired
                                                                        ? 'bg-[#C1121F]/10 text-[#C1121F] ring-[#C1121F]/20'
                                                                        : urgent
                                                                          ? 'bg-[#D99A2B]/10 text-[#D99A2B] ring-[#D99A2B]/20'
                                                                          : 'bg-[#FAF7F2] text-[#8A8580] ring-[#E7E1D9]',
                                                                )}
                                                            >
                                                                {expired ? (
                                                                    <AlertTriangle size={15} />
                                                                ) : (
                                                                    <CalendarClock size={15} />
                                                                )}
                                                            </span>
                                                            <div className="min-w-0 flex-1">
                                                                <p className="text-sm font-medium leading-snug text-[#1C1B1A]">
                                                                    {r.message}
                                                                </p>
                                                                <p className="mt-1 truncate font-mono text-[11px] text-[#8A8580]">
                                                                    berlaku s.d. {formatDateTime(r.expiry)}
                                                                </p>
                                                            </div>
                                                            <span
                                                                className={classNames(
                                                                    'inline-flex shrink-0 items-center rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold ring-1 ring-inset',
                                                                    expired
                                                                        ? 'bg-[#C1121F]/10 text-[#C1121F] ring-[#C1121F]/25'
                                                                        : urgent
                                                                          ? 'bg-[#D99A2B]/10 text-[#D99A2B] ring-[#D99A2B]/25'
                                                                          : 'bg-[#FAF7F2] text-[#8A8580] ring-[#E7E1D9]',
                                                                )}
                                                            >
                                                                {expired
                                                                    ? `-${Math.abs(d ?? 0)} hari`
                                                                    : `${d ?? 0} hari`}
                                                            </span>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        </div>
                                    )}
                                </Card>
                            </Col>

                            <Col xs={24} xl={8}>
                                <Card
                                    title="Perjalanan Terbaru"
                                    actions={
                                        <Link
                                            href="/perjalanan"
                                            className="text-xs font-medium text-[#C1121F] transition-colors duration-150 hover:underline"
                                        >
                                            Semua &rarr;
                                        </Link>
                                    }
                                >
                                    {recentVoyages.length === 0 ? (
                                        <EmptyState text="Belum ada perjalanan tercatat." />
                                    ) : (
                                        <div className="bt-scroll max-h-[16rem] overflow-y-auto overscroll-contain pe-1">
                                            <ul className="space-y-2">
                                                {recentVoyages.map((v) => (
                                                    <li
                                                        key={v.id}
                                                        className="flex items-center gap-3 rounded-xl border border-[#E7E1D9] p-3 transition-colors duration-200 hover:border-[#C1121F]/30 hover:bg-[#FAF7F2]/40"
                                                    >
                                                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#1E4668]/10 text-[#1E4668] ring-1 ring-inset ring-[#1E4668]/20">
                                                            <Ship size={16} />
                                                        </span>
                                                        <div className="min-w-0 flex-1">
                                                            <Link
                                                                href={`/perjalanan/${v.id}`}
                                                                className="font-mono text-[13px] font-semibold text-[#1C1B1A] transition-colors duration-150 hover:text-[#C1121F]"
                                                            >
                                                                {v.voyage_code}
                                                            </Link>
                                                            <p className="mt-0.5 truncate text-xs text-[#8A8580]">
                                                                {v.vessel_name} &middot; {v.route}
                                                            </p>
                                                        </div>
                                                        <Badge tone={STATUS_TONES[v.voyage_status] ?? 'neutral'}>
                                                            {VOYAGE_STATUS_LABELS[v.voyage_status] ?? v.voyage_status}
                                                        </Badge>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </Card>
                            </Col>

                            <Col xs={24} xl={8}>
                                <Card
                                    title="Aktivitas Terbaru"
                                    actions={
                                        <Link
                                            href="/audit"
                                            className="text-xs font-medium text-[#C1121F] transition-colors duration-150 hover:underline"
                                        >
                                            Audit &rarr;
                                        </Link>
                                    }
                                >
                                    {recentActivity.length === 0 ? (
                                        <EmptyState text="Belum ada aktivitas tercatat." />
                                    ) : (
                                        <div className="bt-scroll max-h-[16rem] overflow-y-auto overscroll-contain pe-1">
                                            <ul className="relative space-y-4 before:absolute before:bottom-1.5 before:left-[4px] before:top-1.5 before:w-px before:bg-gradient-to-b before:from-[#E7E1D9]/80 before:via-[#E7E1D9]/40 before:to-transparent">
                                                {recentActivity.map((a) => (
                                                    <li key={a.id} className="relative ps-6">
                                                        <span
                                                            aria-hidden="true"
                                                            className="absolute left-0 top-1 h-2.5 w-2.5 rounded-full bg-[#1E4668] ring-4 ring-[#1E4668]/10"
                                                        />
                                                        <div className="flex items-center justify-between gap-2">
                                                            <Badge tone="info">{a.action}</Badge>
                                                            <span className="font-mono text-[10px] text-[#8A8580]">
                                                                {formatDateTime(a.timestamp)}
                                                            </span>
                                                        </div>
                                                        <p className="mt-1.5 text-[13px] leading-snug text-[#1C1B1A]">
                                                            {a.change_summary}
                                                        </p>
                                                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-[#8A8580]">
                                                            <span>{a.user_name} &middot; {a.entity_type}</span>
                                                            {a.assigned_to && (
                                                                <span className="inline-flex items-center gap-1 rounded bg-[#C1121F]/10 px-1.5 py-0.5 font-medium text-[#C1121F]">
                                                                    Penugasan: {a.assigned_to}
                                                                    {a.assigner_name && <span className="text-[#8A8580] font-normal">(oleh {a.assigner_name})</span>}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </Card>
                            </Col>
                        </Row>
                    </section>
                </>
            )}
        </AuthenticatedLayout>
    );
}
