import Badge, { type BadgeTone } from '@/Components/ui/Badge';
import {
    VERIFICATION_STATUS_LABELS,
    VOYAGE_STATUS_LABELS,
} from '@/Constants/navigation';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {
    daysUntil,
    formatDate,
    formatDateTime,
    formatNumber,
    formatRupiah,
} from '@/lib/format';
import { type PageProps } from '@/types';
import { Head, Link } from '@inertiajs/react';
import {
    Activity,
    Anchor,
    ArrowLeft,
    ChevronRight,
    ClipboardList,
    Download,
    Edit,
    FileStack,
    Fuel,
    History,
    MapPin,
    Ship,
    UserRound,
    Wrench,
} from 'lucide-react';
import { Button, Descriptions, Progress, Skeleton, Tabs, Tag, Typography } from 'antd';
import { useState } from 'react';

const { Text, Title } = Typography;

const TYPE_LABELS: Record<string, string> = {
    tugboat: 'Tugboat',
    tongkang: 'Tongkang',
    kapal_penumpang: 'Kapal Penumpang',
    lainnya: 'Lainnya',
};

const NAV_LABELS: Record<string, string> = {
    laut: 'Laut',
    sungai_danau: 'Sungai/Danau',
    penyeberangan: 'Penyeberangan',
};

const STATUS_LABELS: Record<string, string> = {
    aktif: 'Aktif',
    dalam_perbaikan: 'Dalam Perbaikan',
    dock: 'Dock',
    mangkrak: 'Mangkrak',
};

const STATUS_DOT_COLORS: Record<string, string> = {
    aktif: '#2F8F68',
    dalam_perbaikan: '#D4A96A',
    dock: '#EFE3D3',
    mangkrak: '#EFE3D3',
};

const VERIF_TONES: Record<string, BadgeTone> = {
    verified: 'success',
    under_review: 'info',
    revision_required: 'warning',
    rejected: 'danger',
    uploaded: 'info',
    draft: 'neutral',
    missing: 'danger',
    archived: 'neutral',
};

const FUEL_TONES: Record<string, BadgeTone> = {
    normal: 'success',
    waspada: 'warning',
    tidak_normal: 'danger',
};

const FUEL_LABELS: Record<string, string> = {
    normal: 'Normal',
    waspada: 'Waspada',
    tidak_normal: 'Tidak Normal',
};

const GRAIN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E")`;

const EASE = 'cubic-bezier(0.22,1,0.36,1)';

function positionInfo(value?: string): { label: string; fresh: boolean } | null {
    if (!value) return null;
    const date = new Date(value.includes('T') ? value : value.replace(' ', 'T'));
    const time = date.getTime();
    if (Number.isNaN(time)) return null;
    const minutes = Math.floor((Date.now() - time) / 60000);
    let label: string;
    if (minutes < 1) label = 'baru saja';
    else if (minutes < 60) label = `${minutes} menit lalu`;
    else if (minutes < 1440) label = `${Math.floor(minutes / 60)} jam lalu`;
    else if (minutes < 43200) label = `${Math.floor(minutes / 1440)} hari lalu`;
    else
        label = date.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    return { label, fresh: Date.now() - time < 86400000 };
}

function HeroMetric({
    label,
    value,
    sub,
    gold = false,
}: {
    label: string;
    value: string;
    sub: string;
    gold?: boolean;
}) {
    return (
        <div className="min-w-0 rounded-xl border border-[#E7E1D9] bg-[#FAF7F2] p-4">
            <p className="truncate font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-[#8A8580]">
                {label}
            </p>
            <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight" style={{ color: gold ? '#D4A96A' : '#1C1B1A' }}>
                {value}
            </p>
            <p className="mt-2 truncate text-[11px] text-[#8A8580]">{sub}</p>
        </div>
    );
}

function RingGauge({ percent }: { percent: number }) {
    const clamped = Math.min(100, Math.max(0, percent));
    const circumference = 2 * Math.PI * 15.5;
    const strokeColor = clamped >= 90 ? '#2F8F68' : clamped >= 70 ? '#D99A2B' : '#C1121F';
    const textColor = clamped >= 90 ? '#2F8F68' : clamped >= 70 ? '#D99A2B' : '#C1121F';
    return (
        <div className="relative h-28 w-28 shrink-0">
            <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90" aria-hidden="true">
                <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="4" stroke="#E7E1D9" />
                <circle
                    cx="18"
                    cy="18"
                    r="15.5"
                    fill="none"
                    strokeWidth="4"
                    strokeLinecap="round"
                    stroke={strokeColor}
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference * (1 - clamped / 100)}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-mono text-xl font-semibold tabular-nums" style={{ color: textColor }}>
                    {formatNumber(clamped, 1)}%
                </span>
                <span className="mt-0.5 font-mono text-[9px] font-medium uppercase tracking-[0.14em]" style={{ color: '#8A8580' }}>
                    Lengkap
                </span>
            </div>
        </div>
    );
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
    if (values.length < 2) return null;
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min || 1;
    const points = values
        .map((v, i) => {
            const x = (i / (values.length - 1)) * 100;
            const y = 26 - ((v - min) / range) * 22;
            return `${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(' ');
    return (
        <svg viewBox="0 0 100 28" preserveAspectRatio="none" className="mt-2 h-8 w-36" aria-hidden="true">
            <polyline
                points={points}
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
            />
        </svg>
    );
}

export default function FleetShow({
    vessel,
    completeness,
    documents,
    voyages,
    crews,
    services,
    conditions,
    fuelLogs,
    auditLogs,
    canEdit,
}: PageProps<{
    vessel: Record<string, any>;
    completeness: {
        total: number;
        met: number;
        percent: number;
        missing: Array<{ code: string; name: string; group_code: string; reason: string }>;
        items: Array<any>;
    };
    documents: Array<Record<string, any>>;
    voyages: Array<Record<string, any>>;
    crews: Array<Record<string, any>>;
    services: Array<Record<string, any>>;
    conditions: Array<Record<string, any>>;
    fuelLogs: Array<Record<string, any>>;
    auditLogs: Array<Record<string, any>>;
    canEdit?: boolean;
}>) {
    const [tab, setTab] = useState('overview');
    const [packBusy, setPackBusy] = useState(false);
    const [packMsg, setPackMsg] = useState<string | null>(null);

    const downloadOfflinePack = async () => {
        setPackBusy(true);
        setPackMsg(null);
        try {
            const xsrfMatch = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
            const xsrf = xsrfMatch ? decodeURIComponent(xsrfMatch[1]) : '';
            const res = await fetch(`/api/sync/pack/${vessel.id}`, {
                credentials: 'same-origin',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-XSRF-TOKEN': xsrf,
                    Accept: 'application/json',
                },
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = `Berkas-Offline-${String(vessel.vessel_name).replace(/[^A-Za-z0-9]+/g, '-')}-${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            URL.revokeObjectURL(url);
            setPackMsg('Berkas offline terunduh — simpan di perangkat kapal.');
        } catch {
            setPackMsg('Gagal mengunduh (perlu login & koneksi).');
        } finally {
            setPackBusy(false);
            window.setTimeout(() => setPackMsg(null), 6000);
        }
    };

    const pos = positionInfo(vessel.last_position_at);
    const activeCrews = crews.filter((c) => c.status === 'aktif').length;

    const capacityLabel =
        vessel.capacity_value != null
            ? [
                  formatNumber(vessel.capacity_value, vessel.capacity_unit === 'penumpang' ? 0 : 1),
                  vessel.capacity_unit === 'penumpang' ? 'penumpang' : vessel.capacity_unit,
              ]
                  .filter(Boolean)
                  .join(' ')
            : null;

    const totalHours = fuelLogs.reduce((s, f) => s + (Number(f.duration_hours) || 0), 0);
    const totalLiters = fuelLogs.reduce((s, f) => s + (Number(f.liters) || 0), 0);
    const avgLph = totalHours > 0 ? totalLiters / totalHours : 0;
    const baseline = vessel.fuel_baseline_lph != null ? Number(vessel.fuel_baseline_lph) : null;
    const baselineDiff = baseline ? ((avgLph - baseline) / baseline) * 100 : null;

    const tabItems = [
        { key: 'overview', label: 'Overview', icon: Anchor },
        { key: 'dokumen', label: `Dokumen (${documents.length})`, icon: FileStack },
        { key: 'perjalanan', label: `Riwayat Perjalanan (${voyages.length})`, icon: ClipboardList },
        { key: 'awak', label: `Awak Kapal (${crews.length})`, icon: UserRound },
        { key: 'pemeliharaan', label: `Pemeliharaan (${services.length})`, icon: Wrench },
        { key: 'kondisi', label: `Kondisi & BBM (${conditions.length + fuelLogs.length})`, icon: Fuel },
        { key: 'aktivitas', label: `Riwayat Aktivitas (${auditLogs.length})`, icon: History },
    ];

    return (
        <AuthenticatedLayout>
            <Head title={`Fleet Management / ${vessel.vessel_name}`} />

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
                @media (prefers-reduced-motion: reduce) {
                    .bt-anim, .bt-anim * { animation: none !important; }
                }
            `}</style>

            <section
                className="bt-anim relative mb-6 overflow-hidden rounded-2xl border border-[#E7E1D9] bg-white shadow-[0_1px_3px_rgba(28,27,26,0.04),0_8px_24px_-8px_rgba(28,27,26,0.06)]"
                style={{
                    animation: `bt-rise 0.55s ${EASE} both`,
                }}
            >
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: GRAIN }} />
                </div>

                <div className="relative flex flex-col gap-6 p-6 lg:p-7 xl:flex-row xl:items-end xl:justify-between">
                    <div className="min-w-0 max-w-2xl">
                        <Link
                            href="/armada"
                            className="inline-flex items-center gap-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-[#8A8580] transition-colors hover:text-[#C1121F]"
                        >
                            <ArrowLeft size={13} aria-hidden="true" />
                            Registry Armada
                        </Link>
                        <p className="mt-3 flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-[#8A8580]">
                            <span
                                aria-hidden="true"
                                className="bt-anim h-2 w-2 rounded-full"
                                style={{ background: '#D4A96A', animation: 'bt-pulse-dot 2.4s ease-in-out infinite' }}
                            />
                            Detail Kapal
                        </p>
                        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-[#1C1B1A] sm:text-3xl">
                            {vessel.vessel_name}
                        </h1>
                        <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[#8A8580]">
                            <span>
                                {vessel.vessel_type === 'lainnya' && vessel.vessel_type_custom
                                    ? vessel.vessel_type_custom
                                    : TYPE_LABELS[vessel.vessel_type] ?? vessel.vessel_type}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>{NAV_LABELS[vessel.navigation_type] ?? vessel.navigation_type}</span>
                            <span aria-hidden="true">·</span>
                            <span>{vessel.base_location ?? 'Pangkalan belum diatur'}</span>
                        </p>
                        <p className="mt-3.5">
                            <span className="inline-flex items-center gap-2 rounded-full border border-[#E7E1D9] bg-[#FAF7F2] px-3 py-1 text-xs font-semibold text-[#1C1B1A]">
                                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ background: STATUS_DOT_COLORS[vessel.operational_status] ?? '#8A8580' }} />
                                {STATUS_LABELS[vessel.operational_status] ?? vessel.operational_status}
                            </span>
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 xl:shrink-0">
                        {canEdit && (
                            <Link
                                href={`/armada/${vessel.id}/edit`}
                                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#C1121F] px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-[#A00F19]"
                            >
                                <Edit size={16} aria-hidden="true" />
                                Edit Data
                            </Link>
                        )}
                    </div>
                </div>

                <div className="relative grid grid-cols-2 gap-3 border-t border-[#E7E1D9] p-6 pt-5 sm:gap-4 lg:grid-cols-4 lg:p-7 lg:pt-6">
                    <HeroMetric
                        label="Kelengkapan Dokumen"
                        value={`${formatNumber(completeness.percent, 1)}%`}
                        sub={`${completeness.met} dari ${completeness.total} dokumen wajib`}
                        gold={completeness.percent < 90}
                    />
                    <HeroMetric
                        label="Dokumen Kurang"
                        value={formatNumber(completeness.missing.length)}
                        sub="dari daftar dokumen wajib"
                        gold={completeness.missing.length > 0}
                    />
                    <HeroMetric label="Riwayat Perjalanan" value={formatNumber(voyages.length)} sub="perjalanan tercatat" />
                    <HeroMetric label="Awak Aktif" value={formatNumber(activeCrews)} sub={`dari ${formatNumber(crews.length)} penempatan ABK`} />
                </div>
            </section>

            <div
                className="bt-anim mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border bg-white shadow-[0_18px_40px_-30px_rgba(28,27,26,0.35)] sm:grid-cols-3 lg:grid-cols-5"
                style={{ animation: `bt-rise 0.45s ${EASE} 70ms both`, borderColor: '#E7E1D9' }}
            >
                {[
                    { label: 'Nomor Registrasi', value: vessel.registration_number ?? '-' },
                    { label: 'Tahun Buat', value: vessel.year_built != null ? String(vessel.year_built) : '-' },
                    { label: 'GT', value: vessel.gt != null ? formatNumber(vessel.gt) : '-' },
                    { label: 'DWT', value: vessel.dwt != null ? formatNumber(vessel.dwt, 2) : '-' },
                    { label: 'Kapasitas', value: capacityLabel ?? '-', colSpan: 'col-span-2 sm:col-span-1' },
                ].map((item, idx) => (
                    <div key={idx} className={`border-r border-b border-[#E7E1D9] px-4 py-3.5 ${item.colSpan || ''}`}>
                        <p className="truncate font-mono text-[10px] font-medium uppercase tracking-[0.16em]" style={{ color: '#8A8580' }}>
                            {item.label}
                        </p>
                        <p className="mt-1 truncate font-mono text-sm font-semibold" style={{ color: '#1C1B1A' }} title={item.value}>
                            {item.value}
                        </p>
                    </div>
                ))}
            </div>

            <div className="bt-anim mb-5" style={{ animation: `bt-rise 0.45s ${EASE} 110ms both` }}>
                <Tabs
                    activeKey={tab}
                    onChange={setTab}
                    items={tabItems.map(({ key, label, icon: Icon }) => ({
                        key,
                        label: (
                            <span className="inline-flex items-center gap-2">
                                <Icon size={14} aria-hidden="true" />
                                {label}
                            </span>
                        ),
                    }))}
                    type="card"
                />
            </div>

            {tab === 'overview' && (
                <div className="bt-anim grid grid-cols-1 gap-5 xl:grid-cols-3" style={{ animation: `bt-rise 0.45s ${EASE} 150ms both` }}>
                    <div className="rounded-2xl border bg-white p-5 shadow-[0_18px_40px_-30px_rgba(28,27,26,0.35)]" style={{ borderColor: '#E7E1D9' }}>
                        <h2 className="text-sm font-semibold" style={{ color: '#1C1B1A' }}>Kelengkapan Dokumen</h2>
                        <p className="mt-0.5 text-xs" style={{ color: '#8A8580' }}>Indikator internal, bukan penilaian nakhoda atau persetujuan otoritas.</p>
                        <div className="mt-5 flex items-center gap-5">
                            <RingGauge percent={completeness.percent} />
                            <div className="min-w-0">
                                <p className="text-sm font-medium" style={{ color: '#1C1B1A' }}>
                                    {completeness.met} dari {completeness.total} dokumen wajib terpenuhi
                                </p>
                                <p className="mt-1 text-xs leading-relaxed" style={{ color: '#8A8580' }}>
                                    {completeness.missing.length > 0
                                        ? `${completeness.missing.length} dokumen belum terpenuhi. Kapal masuk ambang tindak lanjut bila kelengkapan di bawah 90%.`
                                        : 'Seluruh dokumen wajib telah terpenuhi.'}
                                </p>
                            </div>
                        </div>
                        {completeness.missing.length > 0 && (
                            <div className="mt-5 border-t pt-4" style={{ borderColor: '#E7E1D9' }}>
                                <p className="mb-2 font-mono text-[10px] font-medium uppercase tracking-[0.16em]" style={{ color: '#8A8580' }}>
                                    Perlu Ditindaklanjuti ({completeness.missing.length})
                                </p>
                                <ul className="space-y-1.5">
                                    {completeness.missing.map((m) => (
                                        <li key={m.code} className="flex items-start justify-between gap-3 rounded-lg px-3 py-2 text-xs" style={{ background: '#FAF7F2' }}>
                                            <span className="min-w-0" style={{ color: '#1C1B1A' }}>
                                                <span className="font-mono font-semibold" style={{ color: '#C1121F' }}>{m.group_code}</span>
                                                <span className="mx-1.5" style={{ color: '#8A8580' }} aria-hidden="true">·</span>
                                                {m.name}
                                            </span>
                                            <span className="shrink-0 font-medium" style={{ color: '#C1121F' }}>{m.reason}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        <Link href="/dokumen" className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold transition-colors duration-150 hover:underline" style={{ color: '#C1121F' }}>
                            Kelola di Document Center
                            <ChevronRight size={13} aria-hidden="true" />
                        </Link>
                    </div>

                    <div className="rounded-2xl border bg-white p-5 shadow-[0_18px_40px_-30px_rgba(28,27,26,0.35)] xl:col-span-2" style={{ borderColor: '#E7E1D9' }}>
                        <h2 className="text-sm font-semibold" style={{ color: '#1C1B1A' }}>Identitas & Spesifikasi</h2>
                        <p className="mt-0.5 text-xs" style={{ color: '#8A8580' }}>Data registri teknis dan administrasi kapal.</p>
                        <div className="mt-5 grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2 2xl:grid-cols-3">
                            <div>
                                <h3 className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: '#C1121F' }}>Identifikasi & Komunikasi</h3>
                                <dl className="mt-3 space-y-3">
                                    {[
                                        { label: 'IMO', value: vessel.imo },
                                        { label: 'MMSI', value: vessel.mmsi },
                                        { label: 'Call Sign', value: vessel.call_sign },
                                    ].map((item) => (
                                        <div key={item.label} className="flex items-baseline justify-between gap-4 border-b border-dashed pb-2" style={{ borderColor: 'rgba(231,225,217,0.8)' }}>
                                            <dt className="shrink-0 text-xs font-medium" style={{ color: '#8A8580' }}>{item.label}</dt>
                                            <dd className="min-w-0 text-right text-[13px] font-medium font-mono" style={{ color: '#1C1B1A' }}>{item.value ?? '-'}</dd>
                                        </div>
                                    ))}
                                </dl>
                            </div>
                            <div>
                                <h3 className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: '#C1121F' }}>Dimensi & Mesin</h3>
                                <dl className="mt-3 space-y-3">
                                    {[
                                        { label: 'Panjang (LOA)', value: vessel.length_m ? `${formatNumber(vessel.length_m, 2)} m` : null, mono: true },
                                        { label: 'Lebar (Beam)', value: vessel.beam_m ? `${formatNumber(vessel.beam_m, 2)} m` : null, mono: true },
                                        { label: 'Mesin', value: vessel.engine_spec, mono: false },
                                        { label: 'Bahan Bakar', value: vessel.fuel_spec, mono: false },
                                        { label: 'Baseline BBM', value: vessel.fuel_baseline_lph ? `${formatNumber(vessel.fuel_baseline_lph, 1)} L/jam` : null, mono: true },
                                    ].map((item) => (
                                        <div key={item.label} className="flex items-baseline justify-between gap-4 border-b border-dashed pb-2" style={{ borderColor: 'rgba(231,225,217,0.8)' }}>
                                            <dt className="shrink-0 text-xs font-medium" style={{ color: '#8A8580' }}>{item.label}</dt>
                                            <dd className={`min-w-0 text-right text-[13px] font-medium ${item.mono ? 'font-mono' : ''}`} style={{ color: '#1C1B1A' }}>{item.value ?? '-'}</dd>
                                        </div>
                                    ))}
                                </dl>
                            </div>
                            <div>
                                <h3 className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: '#C1121F' }}>Administrasi</h3>
                                <dl className="mt-3 space-y-3">
                                    {[
                                        { label: 'Pemilik', value: vessel.owner, mono: false },
                                        { label: 'Operator', value: vessel.operator, mono: false },
                                        { label: 'Terdaftar Sejak', value: vessel.created_at ? formatDate(vessel.created_at) : null, mono: true },
                                    ].map((item) => (
                                        <div key={item.label} className="flex items-baseline justify-between gap-4 border-b border-dashed pb-2" style={{ borderColor: 'rgba(231,225,217,0.8)' }}>
                                            <dt className="shrink-0 text-xs font-medium" style={{ color: '#8A8580' }}>{item.label}</dt>
                                            <dd className={`min-w-0 text-right text-[13px] font-medium ${item.mono ? 'font-mono' : ''}`} style={{ color: '#1C1B1A' }}>{item.value ?? '-'}</dd>
                                        </div>
                                    ))}
                                </dl>
                            </div>
                        </div>
                        {vessel.notes && (
                            <div className="mt-5 rounded-lg border-l-2 px-3.5 py-2.5 text-xs leading-relaxed" style={{ borderColor: '#C1121F', background: '#FAF7F2', color: '#8A8580' }}>
                                <span className="font-semibold" style={{ color: '#1C1B1A' }}>Catatan: </span>
                                {vessel.notes}
                            </div>
                        )}
                        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border px-3.5 py-2.5 text-xs" style={{ borderColor: '#E7E1D9', color: '#8A8580' }}>
                            <MapPin size={14} aria-hidden="true" style={{ color: '#C1121F' }} />
                            <span className="font-semibold" style={{ color: '#1C1B1A' }}>Posisi terakhir</span>
                            <span className="font-mono">{vessel.last_lat ?? '-'}, {vessel.last_lng ?? '-'}</span>
                            {pos && (
                                <>
                                    <span aria-hidden="true">·</span>
                                    <span className="inline-flex items-center gap-1.5">
                                        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ background: pos.fresh ? '#2F8F68' : '#8A8580' }} />
                                        {pos.label}
                                    </span>
                                    <span aria-hidden="true">·</span>
                                    <span>{formatDateTime(vessel.last_position_at)}</span>
                                </>
                            )}
                            <span className="ms-auto rounded px-1.5 py-0.5 font-medium" style={{ background: 'rgba(217,154,43,0.1)', color: '#D99A2B' }}>SIMULASI</span>
                        </div>
                    </div>
                </div>
            )}

            {tab === 'dokumen' && (
                <section className="bt-anim" style={{ animation: `bt-rise 0.45s ${EASE} 150ms both` }}>
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-white px-4 py-3" style={{ borderColor: '#E7E1D9' }}>
                        <div className="text-sm" style={{ color: '#8A8580' }}>
                            <span className="font-medium" style={{ color: '#1C1B1A' }}>Berkas Offline (PSC):</span> manifest dokumen aktif + masa berlaku + checksum — diunduh sebelum berlayar agar bisa ditunjukkan saat inspeksi tanpa internet.
                        </div>
                        <div className="flex items-center gap-3">
                            {packMsg && <span className="text-xs font-medium" style={{ color: '#2F8F68' }}>{packMsg}</span>}
                            <Button onClick={() => void downloadOfflinePack()} loading={packBusy} icon={<Download size={13} />}>
                                {packBusy ? 'Menyiapkan…' : 'Unduh Berkas Offline'}
                            </Button>
                        </div>
                    </div>
                    <div className="overflow-hidden rounded-2xl border bg-white shadow-[0_20px_44px_-32px_rgba(28,27,26,0.4)]" style={{ borderColor: '#E7E1D9' }}>
                        {documents.length === 0 ? (
                            <div className="px-6 py-12 text-center" style={{ background: 'rgba(250,247,242,0.4)' }}>
                                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm">
                                    <FileStack size={20} aria-hidden="true" style={{ color: '#8A8580' }} />
                                </span>
                                <p className="mt-4 text-sm font-semibold" style={{ color: '#1C1B1A' }}>Belum ada dokumen kapal</p>
                                <p className="mt-1 text-xs" style={{ color: '#8A8580' }}>Unggah dokumen identitas dan sertifikat kapal di Document Center.</p>
                                <Link href="/dokumen/create" className="mt-5 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90" style={{ background: '#C1121F' }}>
                                    Unggah Dokumen
                                </Link>
                            </div>
                        ) : (
                            <table className="w-full" style={{ minWidth: '52rem' }}>
                                <thead>
                                    <tr className="border-b" style={{ borderColor: '#E7E1D9', background: 'rgba(250,247,242,0.7)' }}>
                                        <th className="px-4 py-3 text-left font-mono text-[10px] font-medium uppercase tracking-[0.16em]" style={{ color: '#8A8580' }}>Dokumen</th>
                                        <th className="px-4 py-3 text-left font-mono text-[10px] font-medium uppercase tracking-[0.16em]" style={{ color: '#8A8580' }}>Grup</th>
                                        <th className="px-4 py-3 text-left font-mono text-[10px] font-medium uppercase tracking-[0.16em]" style={{ color: '#8A8580' }}>Kategori</th>
                                        <th className="px-4 py-3 text-left font-mono text-[10px] font-medium uppercase tracking-[0.16em]" style={{ color: '#8A8580' }}>Nomor</th>
                                        <th className="px-4 py-3 text-left font-mono text-[10px] font-medium uppercase tracking-[0.16em]" style={{ color: '#8A8580' }}>Berlaku s/d</th>
                                        <th className="px-4 py-3 text-left font-mono text-[10px] font-medium uppercase tracking-[0.16em]" style={{ color: '#8A8580' }}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {documents.map((row) => {
                                        const d = row.has_expiry ? daysUntil(row.expiry_date) : null;
                                        const railColor = row.verification_status === 'rejected' || (d !== null && d < 0) ? '#C1121F' : row.verification_status === 'revision_required' ? '#D99A2B' : null;
                                        return (
                                            <tr key={row.id} className="border-b transition-colors duration-150 hover:bg-[#FAF7F2]/50" style={{ borderColor: '#E7E1D9' }}>
                                                <td className="relative px-4 py-3.5 align-middle">
                                                    {railColor && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full" style={{ background: railColor }} />}
                                                    <Link href={`/dokumen/${row.id}`} className="text-sm font-semibold transition-colors duration-150 hover:underline" style={{ color: '#1C1B1A' }}>
                                                        {row.document_name}
                                                    </Link>
                                                </td>
                                                <td className="px-4 py-3.5 align-middle">
                                                    <span className="rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold" style={{ background: '#FAF7F2', color: '#1E4668' }}>
                                                        {row.group_code}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3.5 align-middle">
                                                    <span className="text-[13px]" style={{ color: '#8A8580' }}>{row.category_name}</span>
                                                </td>
                                                <td className="px-4 py-3.5 align-middle">
                                                    <span className="font-mono text-[13px]" style={{ color: '#1C1B1A' }}>{row.document_number ?? '-'}</span>
                                                </td>
                                                <td className="px-4 py-3.5 align-middle">
                                                    {!row.has_expiry ? (
                                                        <span className="text-xs" style={{ color: '#8A8580' }}>Tanpa masa berlaku</span>
                                                    ) : (
                                                        <span className={`text-[13px] ${d !== null && d < 0 ? 'font-semibold' : d !== null && d <= 30 ? 'font-semibold' : ''}`} style={{ color: d !== null && d < 0 ? '#C1121F' : d !== null && d <= 30 ? '#D99A2B' : '#1C1B1A' }}>
                                                            {row.expiry_date}
                                                            {d !== null && (
                                                                <span className="ms-1.5 text-xs font-normal" style={{ color: '#8A8580' }}>
                                                                    {d < 0 ? `lewat ${Math.abs(d)} hr` : `${d} hr lagi`}
                                                                </span>
                                                            )}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3.5 align-middle">
                                                    <Badge tone={VERIF_TONES[row.verification_status] ?? 'neutral'}>
                                                        {VERIFICATION_STATUS_LABELS[row.verification_status] ?? row.verification_status}
                                                    </Badge>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </section>
            )}

            {tab === 'perjalanan' && (
                <section className="bt-anim" style={{ animation: `bt-rise 0.45s ${EASE} 150ms both` }}>
                    <div className="overflow-hidden rounded-2xl border bg-white shadow-[0_20px_44px_-32px_rgba(28,27,26,0.4)]" style={{ borderColor: '#E7E1D9' }}>
                        {voyages.length === 0 ? (
                            <div className="px-6 py-12 text-center" style={{ background: 'rgba(250,247,242,0.4)' }}>
                                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm">
                                    <Anchor size={20} aria-hidden="true" style={{ color: '#8A8580' }} />
                                </span>
                                <p className="mt-4 text-sm font-semibold" style={{ color: '#1C1B1A' }}>Belum ada riwayat perjalanan</p>
                                <p className="mt-1 text-xs" style={{ color: '#8A8580' }}>Perjalanan kapal ini akan tampil setelah dibuat di Voyage Management.</p>
                            </div>
                        ) : (
                            <table className="w-full" style={{ minWidth: '40rem' }}>
                                <thead>
                                    <tr className="border-b" style={{ borderColor: '#E7E1D9', background: 'rgba(250,247,242,0.7)' }}>
                                        <th className="px-4 py-3 text-left font-mono text-[10px] font-medium uppercase tracking-[0.16em]" style={{ color: '#8A8580' }}>Kode</th>
                                        <th className="px-4 py-3 text-left font-mono text-[10px] font-medium uppercase tracking-[0.16em]" style={{ color: '#8A8580' }}>Rute</th>
                                        <th className="px-4 py-3 text-left font-mono text-[10px] font-medium uppercase tracking-[0.16em]" style={{ color: '#8A8580' }}>Jadwal Berangkat</th>
                                        <th className="px-4 py-3 text-left font-mono text-[10px] font-medium uppercase tracking-[0.16em]" style={{ color: '#8A8580' }}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {voyages.map((row) => {
                                        const railColor = row.voyage_status === 'delayed' ? '#D99A2B' : row.voyage_status === 'cancelled' ? '#C1121F' : null;
                                        return (
                                            <tr key={row.id} className="border-b transition-colors duration-150 hover:bg-[#FAF7F2]/50" style={{ borderColor: '#E7E1D9' }}>
                                                <td className="relative px-4 py-3.5 align-middle">
                                                    {railColor && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full" style={{ background: railColor }} />}
                                                    <span className="font-mono text-[13px] font-semibold" style={{ color: '#1C1B1A' }}>{row.voyage_code}</span>
                                                </td>
                                                <td className="px-4 py-3.5 align-middle">
                                                    <span className="text-[13px]" style={{ color: '#1C1B1A' }}>
                                                        {row.origin} <span style={{ color: '#8A8580' }} aria-hidden="true">→</span> {row.destination}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3.5 align-middle">
                                                    <span className="font-mono text-[13px]" style={{ color: '#1C1B1A' }}>{formatDateTime(row.planned_departure)}</span>
                                                </td>
                                                <td className="px-4 py-3.5 align-middle">
                                                    <Badge tone={row.voyage_status === 'completed' ? 'success' : row.voyage_status === 'cancelled' || row.voyage_status === 'delayed' ? 'danger' : 'info'}>
                                                        {VOYAGE_STATUS_LABELS[row.voyage_status] ?? row.voyage_status}
                                                    </Badge>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </section>
            )}

            {tab === 'awak' && (
                <section className="bt-anim" style={{ animation: `bt-rise 0.45s ${EASE} 150ms both` }}>
                    <div className="overflow-hidden rounded-2xl border bg-white shadow-[0_20px_44px_-32px_rgba(28,27,26,0.4)]" style={{ borderColor: '#E7E1D9' }}>
                        {crews.length === 0 ? (
                            <div className="px-6 py-12 text-center" style={{ background: 'rgba(250,247,242,0.4)' }}>
                                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm">
                                    <UserRound size={20} aria-hidden="true" style={{ color: '#8A8580' }} />
                                </span>
                                <p className="mt-4 text-sm font-semibold" style={{ color: '#1C1B1A' }}>Belum ada awak ditempatkan</p>
                                <p className="mt-1 text-xs" style={{ color: '#8A8580' }}>Penempatan ABK dikelola di menu SDM & Karyawan.</p>
                            </div>
                        ) : (
                            <table className="w-full" style={{ minWidth: '48rem' }}>
                                <thead>
                                    <tr className="border-b" style={{ borderColor: '#E7E1D9', background: 'rgba(250,247,242,0.7)' }}>
                                        <th className="px-4 py-3 text-left font-mono text-[10px] font-medium uppercase tracking-[0.16em]" style={{ color: '#8A8580' }}>Nama</th>
                                        <th className="px-4 py-3 text-left font-mono text-[10px] font-medium uppercase tracking-[0.16em]" style={{ color: '#8A8580' }}>Jabatan Pelayaran</th>
                                        <th className="px-4 py-3 text-left font-mono text-[10px] font-medium uppercase tracking-[0.16em]" style={{ color: '#8A8580' }}>Penempatan</th>
                                        <th className="px-4 py-3 text-left font-mono text-[10px] font-medium uppercase tracking-[0.16em]" style={{ color: '#8A8580' }}>Mulai</th>
                                        <th className="px-4 py-3 text-left font-mono text-[10px] font-medium uppercase tracking-[0.16em]" style={{ color: '#8A8580' }}>Selesai</th>
                                        <th className="px-4 py-3 text-left font-mono text-[10px] font-medium uppercase tracking-[0.16em]" style={{ color: '#8A8580' }}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {crews.map((row) => (
                                        <tr key={row.id} className="border-b transition-colors duration-150 hover:bg-[#FAF7F2]/50" style={{ borderColor: '#E7E1D9' }}>
                                            <td className="px-4 py-3.5 align-middle">
                                                <span className="text-sm font-semibold" style={{ color: '#1C1B1A' }}>{row.name}</span>
                                            </td>
                                            <td className="px-4 py-3.5 align-middle">
                                                <span className="text-[13px] capitalize" style={{ color: '#1C1B1A' }}>{row.rank?.replace('_', ' ')}</span>
                                            </td>
                                            <td className="px-4 py-3.5 align-middle">
                                                <span className="text-[13px]" style={{ color: '#1C1B1A' }}>{row.role}</span>
                                            </td>
                                            <td className="px-4 py-3.5 align-middle">
                                                <span className="font-mono text-[13px]" style={{ color: '#1C1B1A' }}>{formatDate(row.start_date)}</span>
                                            </td>
                                            <td className="px-4 py-3.5 align-middle">
                                                <span className="font-mono text-[13px]" style={{ color: '#1C1B1A' }}>{formatDate(row.end_date)}</span>
                                            </td>
                                            <td className="px-4 py-3.5 align-middle">
                                                <Badge tone={row.status === 'aktif' ? 'success' : 'neutral'}>{row.status}</Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </section>
            )}

            {tab === 'pemeliharaan' && (
                <section className="bt-anim" style={{ animation: `bt-rise 0.45s ${EASE} 150ms both` }}>
                    <div className="overflow-hidden rounded-2xl border bg-white shadow-[0_20px_44px_-32px_rgba(28,27,26,0.4)]" style={{ borderColor: '#E7E1D9' }}>
                        {services.length === 0 ? (
                            <div className="px-6 py-12 text-center" style={{ background: 'rgba(250,247,242,0.4)' }}>
                                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm">
                                    <Wrench size={20} aria-hidden="true" style={{ color: '#8A8580' }} />
                                </span>
                                <p className="mt-4 text-sm font-semibold" style={{ color: '#1C1B1A' }}>Belum ada catatan servis</p>
                                <p className="mt-1 text-xs" style={{ color: '#8A8580' }}>Pemeliharaan dan pemeriksaan dicatat di menu Operations.</p>
                            </div>
                        ) : (
                            <table className="w-full" style={{ minWidth: '56rem' }}>
                                <thead>
                                    <tr className="border-b" style={{ borderColor: '#E7E1D9', background: 'rgba(250,247,242,0.7)' }}>
                                        <th className="px-4 py-3 text-left font-mono text-[10px] font-medium uppercase tracking-[0.16em]" style={{ color: '#8A8580' }}>Servis</th>
                                        <th className="px-4 py-3 text-left font-mono text-[10px] font-medium uppercase tracking-[0.16em]" style={{ color: '#8A8580' }}>Jenis</th>
                                        <th className="px-4 py-3 text-left font-mono text-[10px] font-medium uppercase tracking-[0.16em]" style={{ color: '#8A8580' }}>Bengkel</th>
                                        <th className="px-4 py-3 text-left font-mono text-[10px] font-medium uppercase tracking-[0.16em]" style={{ color: '#8A8580' }}>Mulai</th>
                                        <th className="px-4 py-3 text-left font-mono text-[10px] font-medium uppercase tracking-[0.16em]" style={{ color: '#8A8580' }}>Selesai</th>
                                        <th className="px-4 py-3 text-right font-mono text-[10px] font-medium uppercase tracking-[0.16em]" style={{ color: '#8A8580' }}>Biaya</th>
                                        <th className="px-4 py-3 text-left font-mono text-[10px] font-medium uppercase tracking-[0.16em]" style={{ color: '#8A8580' }}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {services.map((row) => (
                                        <tr key={row.id} className="border-b transition-colors duration-150 hover:bg-[#FAF7F2]/50" style={{ borderColor: '#E7E1D9' }}>
                                            <td className="px-4 py-3.5 align-middle">
                                                <span className="text-sm font-semibold" style={{ color: '#1C1B1A' }}>{row.title}</span>
                                            </td>
                                            <td className="px-4 py-3.5 align-middle">
                                                <Badge tone={row.type === 'drydock' ? 'info' : 'neutral'}>{row.type}</Badge>
                                            </td>
                                            <td className="px-4 py-3.5 align-middle">
                                                <span className="text-[13px]" style={{ color: '#1C1B1A' }}>{row.workshop ?? '-'}</span>
                                            </td>
                                            <td className="px-4 py-3.5 align-middle">
                                                <span className="font-mono text-[13px]" style={{ color: '#1C1B1A' }}>{formatDate(row.start_date)}</span>
                                            </td>
                                            <td className="px-4 py-3.5 align-middle">
                                                <span className="font-mono text-[13px]" style={{ color: '#1C1B1A' }}>{formatDate(row.end_date)}</span>
                                            </td>
                                            <td className="px-4 py-3.5 align-middle text-right">
                                                <span className="font-mono text-[13px] font-semibold tabular-nums" style={{ color: '#1C1B1A' }}>{formatRupiah(row.cost)}</span>
                                            </td>
                                            <td className="px-4 py-3.5 align-middle">
                                                <Badge tone={row.status === 'selesai' ? 'success' : row.status === 'proses' ? 'warning' : 'neutral'}>{row.status}</Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </section>
            )}

            {tab === 'kondisi' && (
                <div className="bt-anim grid grid-cols-1 gap-5 xl:grid-cols-2" style={{ animation: `bt-rise 0.45s ${EASE} 150ms both` }}>
                    <div className="rounded-2xl border bg-white p-5 shadow-[0_18px_40px_-30px_rgba(28,27,26,0.35)]" style={{ borderColor: '#E7E1D9' }}>
                        <h2 className="text-sm font-semibold" style={{ color: '#1C1B1A' }}>Riwayat Kondisi Kapal</h2>
                        <p className="mt-0.5 text-xs" style={{ color: '#8A8580' }}>Skor ceklis pemeriksaan, skala 0 sampai 100.</p>
                        {conditions.length === 0 ? (
                            <div className="mt-5 px-6 py-12 text-center" style={{ background: 'rgba(250,247,242,0.4)' }}>
                                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm">
                                    <Activity size={20} aria-hidden="true" style={{ color: '#8A8580' }} />
                                </span>
                                <p className="mt-4 text-sm font-semibold" style={{ color: '#1C1B1A' }}>Belum ada pemeriksaan kondisi</p>
                                <p className="mt-1 text-xs" style={{ color: '#8A8580' }}>Ceklis kondisi dicatat dari menu Operations.</p>
                            </div>
                        ) : (
                            <>
                                <div className="mt-5 flex items-center justify-between gap-4 rounded-xl px-4 py-3.5" style={{ background: 'rgba(250,247,242,0.7)' }}>
                                    <div>
                                        <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em]" style={{ color: '#8A8580' }}>Skor Terakhir</p>
                                        <p className="mt-1 font-mono text-2xl font-semibold tabular-nums" style={{ color: Number(conditions[0].score) >= 85 ? '#2F8F68' : Number(conditions[0].score) >= 70 ? '#D99A2B' : '#C1121F' }}>
                                            {formatNumber(conditions[0].score)}
                                            <span className="text-sm font-medium" style={{ color: '#8A8580' }}> /100</span>
                                        </p>
                                    </div>
                                    {conditions.length > 1 && (
                                        <div className="text-right">
                                            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em]" style={{ color: '#8A8580' }}>Tren</p>
                                            <Sparkline
                                                values={[...conditions].reverse().map((c) => Number(c.score))}
                                                color={Number(conditions[0].score) >= 85 ? '#2F8F68' : Number(conditions[0].score) >= 70 ? '#D99A2B' : '#C1121F'}
                                            />
                                        </div>
                                    )}
                                </div>
                                <ul className="mt-4 space-y-2.5">
                                    {conditions.map((c) => (
                                        <li key={c.id} className="rounded-xl border px-4 py-3" style={{ borderColor: '#E7E1D9' }}>
                                            <div className="flex items-center justify-between gap-3">
                                                <span className="font-mono text-[11px]" style={{ color: '#8A8580' }}>{formatDateTime(c.checked_at)}</span>
                                                <span className="rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold tabular-nums" style={{
                                                    background: Number(c.score) >= 85 ? 'rgba(47,143,104,0.1)' : Number(c.score) >= 70 ? 'rgba(217,154,43,0.1)' : 'rgba(193,18,31,0.1)',
                                                    color: Number(c.score) >= 85 ? '#2F8F68' : Number(c.score) >= 70 ? '#D99A2B' : '#C1121F',
                                                }}>
                                                    Skor {formatNumber(c.score)}
                                                </span>
                                            </div>
                                            {c.notes && <p className="mt-1.5 text-sm" style={{ color: '#1C1B1A' }}>{c.notes}</p>}
                                        </li>
                                    ))}
                                </ul>
                            </>
                        )}
                    </div>

                    <div className="rounded-2xl border bg-white p-5 shadow-[0_18px_40px_-30px_rgba(28,27,26,0.35)]" style={{ borderColor: '#E7E1D9' }}>
                        <h2 className="text-sm font-semibold" style={{ color: '#1C1B1A' }}>Monitoring BBM</h2>
                        <p className="mt-0.5 text-xs" style={{ color: '#8A8580' }}>Konsumsi aktual perjalanan dibandingkan baseline kapal.</p>
                        {fuelLogs.length === 0 ? (
                            <div className="mt-5 px-6 py-12 text-center" style={{ background: 'rgba(250,247,242,0.4)' }}>
                                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm">
                                    <Fuel size={20} aria-hidden="true" style={{ color: '#8A8580' }} />
                                </span>
                                <p className="mt-4 text-sm font-semibold" style={{ color: '#1C1B1A' }}>Belum ada trip BBM</p>
                                <p className="mt-1 text-xs" style={{ color: '#8A8580' }}>Log trip BBM dicatat dari menu Operations.</p>
                            </div>
                        ) : (
                            <>
                                <div className="mt-5 grid grid-cols-2 gap-3">
                                    <div className="rounded-xl px-4 py-3.5" style={{ background: 'rgba(250,247,242,0.7)' }}>
                                        <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em]" style={{ color: '#8A8580' }}>Rata-rata Konsumsi</p>
                                        <p className="mt-1 font-mono text-2xl font-semibold tabular-nums" style={{ color: '#1C1B1A' }}>
                                            {formatNumber(avgLph, 1)}
                                            <span className="text-sm font-medium" style={{ color: '#8A8580' }}> L/jam</span>
                                        </p>
                                        <p className="mt-1 text-[11px]" style={{ color: '#8A8580' }}>
                                            {formatNumber(totalLiters, 2)} L dalam {formatNumber(totalHours, 1)} jam
                                        </p>
                                    </div>
                                    <div className="rounded-xl px-4 py-3.5" style={{ background: 'rgba(250,247,242,0.7)' }}>
                                        <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em]" style={{ color: '#8A8580' }}>Baseline Kapal</p>
                                        <p className="mt-1 font-mono text-2xl font-semibold tabular-nums" style={{ color: '#1C1B1A' }}>
                                            {baseline != null ? (
                                                <>
                                                    {formatNumber(baseline, 1)}
                                                    <span className="text-sm font-medium" style={{ color: '#8A8580' }}> L/jam</span>
                                                </>
                                            ) : '-'}
                                        </p>
                                        <p className="mt-1 text-[11px] font-medium" style={{ color: baselineDiff != null && Math.abs(baselineDiff) > 10 ? '#C1121F' : '#8A8580' }}>
                                            {baselineDiff != null ? `${baselineDiff > 0 ? '+' : ''}${formatNumber(baselineDiff, 1)}% dari baseline` : 'baseline belum diatur'}
                                        </p>
                                    </div>
                                </div>
                                <ul className="mt-4 space-y-2.5">
                                    {fuelLogs.map((f) => {
                                        const lph = f.duration_hours > 0 ? f.liters / f.duration_hours : 0;
                                        return (
                                            <li key={f.id} className="rounded-xl border px-4 py-3" style={{ borderColor: '#E7E1D9' }}>
                                                <div className="flex items-center justify-between gap-3">
                                                    <p className="min-w-0 truncate text-sm font-semibold" style={{ color: '#1C1B1A' }}>{f.route}</p>
                                                    <Badge tone={FUEL_TONES[f.analysis_status] ?? 'neutral'}>
                                                        {FUEL_LABELS[f.analysis_status] ?? f.analysis_status}
                                                        {` (${f.analysis_diff_pct > 0 ? '+' : ''}${formatNumber(f.analysis_diff_pct, 1)}%)`}
                                                    </Badge>
                                                </div>
                                                <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs" style={{ color: '#8A8580' }}>
                                                    <span>{formatDate(f.trip_date)}</span>
                                                    <span aria-hidden="true">·</span>
                                                    <span className="font-mono">{formatNumber(f.duration_hours, 1)} jam</span>
                                                    <span aria-hidden="true">·</span>
                                                    <span className="font-mono">{formatNumber(f.liters, 2)} L</span>
                                                    <span aria-hidden="true">·</span>
                                                    <span className="font-mono font-semibold" style={{ color: '#1C1B1A' }}>{formatNumber(lph, 1)} L/jam</span>
                                                </p>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </>
                        )}
                    </div>
                </div>
            )}

            {tab === 'aktivitas' && (
                <section className="bt-anim" style={{ animation: `bt-rise 0.45s ${EASE} 150ms both` }}>
                    <div className="overflow-hidden rounded-2xl border bg-white shadow-[0_20px_44px_-32px_rgba(28,27,26,0.4)]" style={{ borderColor: '#E7E1D9' }}>
                        {auditLogs.length === 0 ? (
                            <div className="px-6 py-12 text-center" style={{ background: 'rgba(250,247,242,0.4)' }}>
                                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm">
                                    <History size={20} aria-hidden="true" style={{ color: '#8A8580' }} />
                                </span>
                                <p className="mt-4 text-sm font-semibold" style={{ color: '#1C1B1A' }}>Belum ada aktivitas</p>
                            </div>
                        ) : (
                            <table className="w-full" style={{ minWidth: '44rem' }}>
                                <thead>
                                    <tr className="border-b" style={{ borderColor: '#E7E1D9', background: 'rgba(250,247,242,0.7)' }}>
                                        <th className="px-4 py-3 text-left font-mono text-[10px] font-medium uppercase tracking-[0.16em]" style={{ color: '#8A8580' }}>Waktu</th>
                                        <th className="px-4 py-3 text-left font-mono text-[10px] font-medium uppercase tracking-[0.16em]" style={{ color: '#8A8580' }}>Pengguna</th>
                                        <th className="px-4 py-3 text-left font-mono text-[10px] font-medium uppercase tracking-[0.16em]" style={{ color: '#8A8580' }}>Aksi</th>
                                        <th className="px-4 py-3 text-left font-mono text-[10px] font-medium uppercase tracking-[0.16em]" style={{ color: '#8A8580' }}>Ringkasan</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {auditLogs.map((row) => (
                                        <tr key={row.id} className="border-b transition-colors duration-150 hover:bg-[#FAF7F2]/50" style={{ borderColor: '#E7E1D9' }}>
                                            <td className="px-4 py-3.5 align-middle">
                                                <span className="font-mono text-[13px]" style={{ color: '#1C1B1A' }}>{formatDateTime(row.timestamp)}</span>
                                            </td>
                                            <td className="px-4 py-3.5 align-middle">
                                                <span className="text-[13px] font-medium" style={{ color: '#1C1B1A' }}>{row.user_name ?? 'Sistem'}</span>
                                            </td>
                                            <td className="px-4 py-3.5 align-middle">
                                                <Badge tone="info">{row.action}</Badge>
                                            </td>
                                            <td className="px-4 py-3.5 align-middle">
                                                <span className="text-[13px]" style={{ color: '#8A8580' }}>{row.change_summary ?? '-'}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </section>
            )}
        </AuthenticatedLayout>
    );
}
