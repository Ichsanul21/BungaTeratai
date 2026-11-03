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
    aktif: '#15803D',
    dalam_perbaikan: '#00205B',
    dock: '#FFFFFF',
    mangkrak: '#FFFFFF',
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
        <div className="min-w-0 rounded-xl border border-[#E3E8F0] bg-[#F5F7FA] p-4">
            <p className="truncate font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-[#5B6474]">
                {label}
            </p>
            <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight" style={{ color: gold ? '#00205B' : '#111827' }}>
                {value}
            </p>
            <p className="mt-2 truncate text-[11px] text-[#5B6474]">{sub}</p>
        </div>
    );
}

function RingGauge({ percent }: { percent: number }) {
    const clamped = Math.min(100, Math.max(0, percent));
    const circumference = 2 * Math.PI * 15.5;
    const strokeColor = clamped >= 90 ? '#15803D' : clamped >= 70 ? '#B45309' : '#BA0C2F';
    const textColor = clamped >= 90 ? '#15803D' : clamped >= 70 ? '#B45309' : '#BA0C2F';
    return (
        <div className="relative h-28 w-28 shrink-0">
            <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90" aria-hidden="true">
                <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="4" stroke="#E3E8F0" />
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
                <span className="mt-0.5 font-mono text-[9px] font-medium uppercase tracking-[0.14em]" style={{ color: '#5B6474' }}>
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
                className="bt-anim relative mb-6 overflow-hidden rounded-2xl border border-[#E3E8F0] bg-white shadow-[0_1px_3px_rgba(17,24,39,0.04),0_8px_24px_-8px_rgba(17,24,39,0.06)]"
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
                            className="inline-flex items-center gap-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-[#5B6474] transition-colors hover:text-[#BA0C2F]"
                        >
                            <ArrowLeft size={13} aria-hidden="true" />
                            Registry Armada
                        </Link>
                        <p className="mt-3 flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-[#5B6474]">
                            <span
                                aria-hidden="true"
                                className="bt-anim h-2 w-2 rounded-full"
                                style={{ background: '#00205B', animation: 'bt-pulse-dot 2.4s ease-in-out infinite' }}
                            />
                            Detail Kapal
                        </p>
                        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-[#111827] sm:text-3xl">
                            {vessel.vessel_name}
                        </h1>
                        <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[#5B6474]">
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
                            <span className="inline-flex items-center gap-2 rounded-full border border-[#E3E8F0] bg-[#F5F7FA] px-3 py-1 text-xs font-semibold text-[#111827]">
                                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ background: STATUS_DOT_COLORS[vessel.operational_status] ?? '#5B6474' }} />
                                {STATUS_LABELS[vessel.operational_status] ?? vessel.operational_status}
                            </span>
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 xl:shrink-0">
                        {canEdit && (
                            <Link
                                href={`/armada/${vessel.id}/edit`}
                                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#BA0C2F] px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-[#8E0924]"
                            >
                                <Edit size={16} aria-hidden="true" />
                                Edit Data
                            </Link>
                        )}
                    </div>
                </div>

                <div className="relative grid grid-cols-2 gap-3 border-t border-[#E3E8F0] p-6 pt-5 sm:gap-4 lg:grid-cols-4 lg:p-7 lg:pt-6">
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
                className="bt-anim mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border bg-white shadow-[0_18px_40px_-30px_rgba(17,24,39,0.35)] sm:grid-cols-3 lg:grid-cols-5"
                style={{ animation: `bt-rise 0.45s ${EASE} 70ms both`, borderColor: '#E3E8F0' }}
            >
                {[
                    { label: 'Nomor Registrasi', value: vessel.registration_number ?? '-' },
                    { label: 'Tahun Buat', value: vessel.year_built != null ? String(vessel.year_built) : '-' },
                    { label: 'GT', value: vessel.gt != null ? formatNumber(vessel.gt) : '-' },
                    { label: 'DWT', value: vessel.dwt != null ? formatNumber(vessel.dwt, 2) : '-' },
                    { label: 'Kapasitas', value: capacityLabel ?? '-', colSpan: 'col-span-2 sm:col-span-1' },
                ].map((item, idx) => (
                    <div key={idx} className={`border-r border-b border-[#E3E8F0] px-4 py-3.5 ${item.colSpan || ''}`}>
                        <p className="truncate font-mono text-[10px] font-medium uppercase tracking-[0.16em]" style={{ color: '#5B6474' }}>
                            {item.label}
                        </p>
                        <p className="mt-1 truncate font-mono text-sm font-semibold" style={{ color: '#111827' }} title={item.value}>
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
                    <div className="rounded-2xl border bg-white p-5 shadow-[0_18px_40px_-30px_rgba(17,24,39,0.35)]" style={{ borderColor: '#E3E8F0' }}>
                        <h2 className="text-sm font-semibold" style={{ color: '#111827' }}>Kelengkapan Dokumen</h2>
                        <p className="mt-0.5 text-xs" style={{ color: '#5B6474' }}>Indikator internal, bukan penilaian nakhoda atau persetujuan otoritas.</p>
                        <div className="mt-5 flex items-center gap-5">
                            <RingGauge percent={completeness.percent} />
                            <div className="min-w-0">
                                <p className="text-sm font-medium" style={{ color: '#111827' }}>
                                    {completeness.met} dari {completeness.total} dokumen wajib terpenuhi
                                </p>
                                <p className="mt-1 text-xs leading-relaxed" style={{ color: '#5B6474' }}>
                                    {completeness.missing.length > 0
                                        ? `${completeness.missing.length} dokumen belum terpenuhi. Kapal masuk ambang tindak lanjut bila kelengkapan di bawah 90%.`
                                        : 'Seluruh dokumen wajib telah terpenuhi.'}
                                </p>
                            </div>
                        </div>
                        {completeness.missing.length > 0 && (
                            <div className="mt-5 border-t pt-4" style={{ borderColor: '#E3E8F0' }}>
                                <p className="mb-2 font-mono text-[10px] font-medium uppercase tracking-[0.16em]" style={{ color: '#5B6474' }}>
                                    Perlu Ditindaklanjuti ({completeness.missing.length})
                                </p>
                                <ul className="space-y-1.5">
                                    {completeness.missing.map((m) => (
                                        <li key={m.code} className="flex items-start justify-between gap-3 rounded-lg px-3 py-2 text-xs" style={{ background: '#F5F7FA' }}>
                                            <span className="min-w-0" style={{ color: '#111827' }}>
                                                <span className="font-mono font-semibold" style={{ color: '#BA0C2F' }}>{m.group_code}</span>
                                                <span className="mx-1.5" style={{ color: '#5B6474' }} aria-hidden="true">·</span>
                                                {m.name}
                                            </span>
                                            <span className="shrink-0 font-medium" style={{ color: '#BA0C2F' }}>{m.reason}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        <Link href="/dokumen" className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold transition-colors duration-150 hover:underline" style={{ color: '#BA0C2F' }}>
                            Kelola di Document Center
                            <ChevronRight size={13} aria-hidden="true" />
                        </Link>
                    </div>

                    <div className="rounded-2xl border bg-white p-5 shadow-[0_18px_40px_-30px_rgba(17,24,39,0.35)] xl:col-span-2" style={{ borderColor: '#E3E8F0' }}>
                        <h2 className="text-sm font-semibold" style={{ color: '#111827' }}>Identitas & Spesifikasi</h2>
                        <p className="mt-0.5 text-xs" style={{ color: '#5B6474' }}>Data registri teknis dan administrasi kapal.</p>
                        <div className="mt-5 grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2 2xl:grid-cols-3">
                            <div>
                                <h3 className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: '#BA0C2F' }}>Identifikasi & Komunikasi</h3>
                                <dl className="mt-3 space-y-3">
                                    {[
                                        { label: 'IMO', value: vessel.imo },
                                        { label: 'MMSI', value: vessel.mmsi },
                                        { label: 'Call Sign', value: vessel.call_sign },
                                    ].map((item) => (
                                        <div key={item.label} className="flex items-baseline justify-between gap-4 border-b border-dashed pb-2" style={{ borderColor: 'rgba(227,232,240,0.8)' }}>
                                            <dt className="shrink-0 text-xs font-medium" style={{ color: '#5B6474' }}>{item.label}</dt>
                                            <dd className="min-w-0 text-right text-[13px] font-medium font-mono" style={{ color: '#111827' }}>{item.value ?? '-'}</dd>
                                        </div>
                                    ))}
                                </dl>
                            </div>
                            <div>
                                <h3 className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: '#BA0C2F' }}>Dimensi & Mesin</h3>
                                <dl className="mt-3 space-y-3">
                                    {[
                                        { label: 'Panjang (LOA)', value: vessel.length_m ? `${formatNumber(vessel.length_m, 2)} m` : null, mono: true },
                                        { label: 'Lebar (Beam)', value: vessel.beam_m ? `${formatNumber(vessel.beam_m, 2)} m` : null, mono: true },
                                        { label: 'Mesin', value: vessel.engine_spec, mono: false },
                                        { label: 'Bahan Bakar', value: vessel.fuel_spec, mono: false },
                                        { label: 'Baseline BBM', value: vessel.fuel_baseline_lph ? `${formatNumber(vessel.fuel_baseline_lph, 1)} L/jam` : null, mono: true },
                                    ].map((item) => (
                                        <div key={item.label} className="flex items-baseline justify-between gap-4 border-b border-dashed pb-2" style={{ borderColor: 'rgba(227,232,240,0.8)' }}>
                                            <dt className="shrink-0 text-xs font-medium" style={{ color: '#5B6474' }}>{item.label}</dt>
                                            <dd className={`min-w-0 text-right text-[13px] font-medium ${item.mono ? 'font-mono' : ''}`} style={{ color: '#111827' }}>{item.value ?? '-'}</dd>
                                        </div>
                                    ))}
                                </dl>
                            </div>
                            <div>
                                <h3 className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: '#BA0C2F' }}>Administrasi</h3>
                                <dl className="mt-3 space-y-3">
                                    {[
                                        { label: 'Pemilik', value: vessel.owner, mono: false },
                                        { label: 'Operator', value: vessel.operator, mono: false },
                                        { label: 'Terdaftar Sejak', value: vessel.created_at ? formatDate(vessel.created_at) : null, mono: true },
                                    ].map((item) => (
                                        <div key={item.label} className="flex items-baseline justify-between gap-4 border-b border-dashed pb-2" style={{ borderColor: 'rgba(227,232,240,0.8)' }}>
                                            <dt className="shrink-0 text-xs font-medium" style={{ color: '#5B6474' }}>{item.label}</dt>
                                            <dd className={`min-w-0 text-right text-[13px] font-medium ${item.mono ? 'font-mono' : ''}`} style={{ color: '#111827' }}>{item.value ?? '-'}</dd>
                                        </div>
                                    ))}
                                </dl>
                            </div>
                        </div>
                        {vessel.notes && (
                            <div className="mt-5 rounded-lg border-l-2 px-3.5 py-2.5 text-xs leading-relaxed" style={{ borderColor: '#BA0C2F', background: '#F5F7FA', color: '#5B6474' }}>
                                <span className="font-semibold" style={{ color: '#111827' }}>Catatan: </span>
                                {vessel.notes}
                            </div>
                        )}
                        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border px-3.5 py-2.5 text-xs" style={{ borderColor: '#E3E8F0', color: '#5B6474' }}>
                            <MapPin size={14} aria-hidden="true" style={{ color: '#BA0C2F' }} />
                            <span className="font-semibold" style={{ color: '#111827' }}>Posisi terakhir</span>
                            <span className="font-mono">{vessel.last_lat ?? '-'}, {vessel.last_lng ?? '-'}</span>
                            {pos && (
                                <>
                                    <span aria-hidden="true">·</span>
                                    <span className="inline-flex items-center gap-1.5">
                                        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ background: pos.fresh ? '#15803D' : '#5B6474' }} />
                                        {pos.label}
                                    </span>
                                    <span aria-hidden="true">·</span>
                                    <span>{formatDateTime(vessel.last_position_at)}</span>
                                </>
                            )}
                            <span className="ms-auto rounded px-1.5 py-0.5 font-medium" style={{ background: 'rgba(180,83,9,0.1)', color: '#B45309' }}>SIMULASI</span>
                        </div>
                    </div>
                </div>
            )}

            {tab === 'dokumen' && (
                <section className="bt-anim" style={{ animation: `bt-rise 0.45s ${EASE} 150ms both` }}>
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-white px-4 py-3" style={{ borderColor: '#E3E8F0' }}>
                        <div className="text-sm" style={{ color: '#5B6474' }}>
                            <span className="font-medium" style={{ color: '#111827' }}>Berkas Offline (PSC):</span> manifest dokumen aktif + masa berlaku + checksum — diunduh sebelum berlayar agar bisa ditunjukkan saat inspeksi tanpa internet.
                        </div>
                        <div className="flex items-center gap-3">
                            {packMsg && <span className="text-xs font-medium" style={{ color: '#15803D' }}>{packMsg}</span>}
                            <Button onClick={() => void downloadOfflinePack()} loading={packBusy} icon={<Download size={13} />}>
                                {packBusy ? 'Menyiapkan…' : 'Unduh Berkas Offline'}
                            </Button>
                        </div>
                    </div>
                    <div className="overflow-hidden rounded-2xl border bg-white shadow-[0_20px_44px_-32px_rgba(17,24,39,0.4)]" style={{ borderColor: '#E3E8F0' }}>
                        {documents.length === 0 ? (
                            <div className="px-6 py-12 text-center" style={{ background: 'rgba(245,247,250,0.4)' }}>
                                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm">
                                    <FileStack size={20} aria-hidden="true" style={{ color: '#5B6474' }} />
                                </span>
                                <p className="mt-4 text-sm font-semibold" style={{ color: '#111827' }}>Belum ada dokumen kapal</p>
                                <p className="mt-1 text-xs" style={{ color: '#5B6474' }}>Unggah dokumen identitas dan sertifikat kapal di Document Center.</p>
                                <Link href="/dokumen/create" className="mt-5 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90" style={{ background: '#BA0C2F' }}>
                                    Unggah Dokumen
                                </Link>
                            </div>
                        ) : (
                            <table className="w-full" style={{ minWidth: '52rem' }}>
                                <thead>
                                    <tr className="border-b" style={{ borderColor: '#E3E8F0', background: 'rgba(245,247,250,0.7)' }}>
                                        <th className="px-4 py-3 text-left font-mono text-[10px] font-medium uppercase tracking-[0.16em]" style={{ color: '#5B6474' }}>Dokumen</th>
                                        <th className="px-4 py-3 text-left font-mono text-[10px] font-medium uppercase tracking-[0.16em]" style={{ color: '#5B6474' }}>Grup</th>
                                        <th className="px-4 py-3 text-left font-mono text-[10px] font-medium uppercase tracking-[0.16em]" style={{ color: '#5B6474' }}>Kategori</th>
                                        <th className="px-4 py-3 text-left font-mono text-[10px] font-medium uppercase tracking-[0.16em]" style={{ color: '#5B6474' }}>Nomor</th>
                                        <th className="px-4 py-3 text-left font-mono text-[10px] font-medium uppercase tracking-[0.16em]" style={{ color: '#5B6474' }}>Berlaku s/d</th>
                                        <th className="px-4 py-3 text-left font-mono text-[10px] font-medium uppercase tracking-[0.16em]" style={{ color: '#5B6474' }}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {documents.map((row) => {
                                        const d = row.has_expiry ? daysUntil(row.expiry_date) : null;
                                        const railColor = row.verification_status === 'rejected' || (d !== null && d < 0) ? '#BA0C2F' : row.verification_status === 'revision_required' ? '#B45309' : null;
                                        return (
                                            <tr key={row.id} className="border-b transition-colors duration-150 hover:bg-[#F5F7FA]/50" style={{ borderColor: '#E3E8F0' }}>
                                                <td className="relative px-4 py-3.5 align-middle">
                                                    {railColor && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full" style={{ background: railColor }} />}
                                                    <Link href={`/dokumen/${row.id}`} className="text-sm font-semibold transition-colors duration-150 hover:underline" style={{ color: '#111827' }}>
                                                        {row.document_name}
                                                    </Link>
                                                </td>
                                                <td className="px-4 py-3.5 align-middle">
                                                    <span className="rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold" style={{ background: '#F5F7FA', color: '#00205B' }}>
                                                        {row.group_code}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3.5 align-middle">
                                                    <span className="text-[13px]" style={{ color: '#5B6474' }}>{row.category_name}</span>
                                                </td>
                                                <td className="px-4 py-3.5 align-middle">
                                                    <span className="font-mono text-[13px]" style={{ color: '#111827' }}>{row.document_number ?? '-'}</span>
                                                </td>
                                                <td className="px-4 py-3.5 align-middle">
                                                    {!row.has_expiry ? (
                                                        <span className="text-xs" style={{ color: '#5B6474' }}>Tanpa masa berlaku</span>
                                                    ) : (
                                                        <span className={`text-[13px] ${d !== null && d < 0 ? 'font-semibold' : d !== null && d <= 30 ? 'font-semibold' : ''}`} style={{ color: d !== null && d < 0 ? '#BA0C2F' : d !== null && d <= 30 ? '#B45309' : '#111827' }}>
                                                            {row.expiry_date}
                                                            {d !== null && (
                                                                <span className="ms-1.5 text-xs font-normal" style={{ color: '#5B6474' }}>
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
                    <div className="overflow-hidden rounded-2xl border bg-white shadow-[0_20px_44px_-32px_rgba(17,24,39,0.4)]" style={{ borderColor: '#E3E8F0' }}>
                        {voyages.length === 0 ? (
                            <div className="px-6 py-12 text-center" style={{ background: 'rgba(245,247,250,0.4)' }}>
                                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm">
                                    <Anchor size={20} aria-hidden="true" style={{ color: '#5B6474' }} />
                                </span>
                                <p className="mt-4 text-sm font-semibold" style={{ color: '#111827' }}>Belum ada riwayat perjalanan</p>
                                <p className="mt-1 text-xs" style={{ color: '#5B6474' }}>Perjalanan kapal ini akan tampil setelah dibuat di Voyage Management.</p>
                            </div>
                        ) : (
                            <table className="w-full" style={{ minWidth: '40rem' }}>
                                <thead>
                                    <tr className="border-b" style={{ borderColor: '#E3E8F0', background: 'rgba(245,247,250,0.7)' }}>
                                        <th className="px-4 py-3 text-left font-mono text-[10px] font-medium uppercase tracking-[0.16em]" style={{ color: '#5B6474' }}>Kode</th>
                                        <th className="px-4 py-3 text-left font-mono text-[10px] font-medium uppercase tracking-[0.16em]" style={{ color: '#5B6474' }}>Rute</th>
                                        <th className="px-4 py-3 text-left font-mono text-[10px] font-medium uppercase tracking-[0.16em]" style={{ color: '#5B6474' }}>Jadwal Berangkat</th>
                                        <th className="px-4 py-3 text-left font-mono text-[10px] font-medium uppercase tracking-[0.16em]" style={{ color: '#5B6474' }}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {voyages.map((row) => {
                                        const railColor = row.voyage_status === 'delayed' ? '#B45309' : row.voyage_status === 'cancelled' ? '#BA0C2F' : null;
                                        return (
                                            <tr key={row.id} className="border-b transition-colors duration-150 hover:bg-[#F5F7FA]/50" style={{ borderColor: '#E3E8F0' }}>
                                                <td className="relative px-4 py-3.5 align-middle">
                                                    {railColor && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full" style={{ background: railColor }} />}
                                                    <span className="font-mono text-[13px] font-semibold" style={{ color: '#111827' }}>{row.voyage_code}</span>
                                                </td>
                                                <td className="px-4 py-3.5 align-middle">
                                                    <span className="text-[13px]" style={{ color: '#111827' }}>
                                                        {row.origin} <span style={{ color: '#5B6474' }} aria-hidden="true">→</span> {row.destination}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3.5 align-middle">
                                                    <span className="font-mono text-[13px]" style={{ color: '#111827' }}>{formatDateTime(row.planned_departure)}</span>
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
                    <div className="overflow-hidden rounded-2xl border bg-white shadow-[0_20px_44px_-32px_rgba(17,24,39,0.4)]" style={{ borderColor: '#E3E8F0' }}>
                        {crews.length === 0 ? (
                            <div className="px-6 py-12 text-center" style={{ background: 'rgba(245,247,250,0.4)' }}>
                                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm">
                                    <UserRound size={20} aria-hidden="true" style={{ color: '#5B6474' }} />
                                </span>
                                <p className="mt-4 text-sm font-semibold" style={{ color: '#111827' }}>Belum ada awak ditempatkan</p>
                                <p className="mt-1 text-xs" style={{ color: '#5B6474' }}>Penempatan ABK dikelola di menu SDM & Karyawan.</p>
                            </div>
                        ) : (
                            <table className="w-full" style={{ minWidth: '48rem' }}>
                                <thead>
                                    <tr className="border-b" style={{ borderColor: '#E3E8F0', background: 'rgba(245,247,250,0.7)' }}>
                                        <th className="px-4 py-3 text-left font-mono text-[10px] font-medium uppercase tracking-[0.16em]" style={{ color: '#5B6474' }}>Nama</th>
                                        <th className="px-4 py-3 text-left font-mono text-[10px] font-medium uppercase tracking-[0.16em]" style={{ color: '#5B6474' }}>Jabatan Pelayaran</th>
                                        <th className="px-4 py-3 text-left font-mono text-[10px] font-medium uppercase tracking-[0.16em]" style={{ color: '#5B6474' }}>Penempatan</th>
                                        <th className="px-4 py-3 text-left font-mono text-[10px] font-medium uppercase tracking-[0.16em]" style={{ color: '#5B6474' }}>Mulai</th>
                                        <th className="px-4 py-3 text-left font-mono text-[10px] font-medium uppercase tracking-[0.16em]" style={{ color: '#5B6474' }}>Selesai</th>
                                        <th className="px-4 py-3 text-left font-mono text-[10px] font-medium uppercase tracking-[0.16em]" style={{ color: '#5B6474' }}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {crews.map((row) => (
                                        <tr key={row.id} className="border-b transition-colors duration-150 hover:bg-[#F5F7FA]/50" style={{ borderColor: '#E3E8F0' }}>
                                            <td className="px-4 py-3.5 align-middle">
                                                <span className="text-sm font-semibold" style={{ color: '#111827' }}>{row.name}</span>
                                            </td>
                                            <td className="px-4 py-3.5 align-middle">
                                                <span className="text-[13px] capitalize" style={{ color: '#111827' }}>{row.rank?.replace('_', ' ')}</span>
                                            </td>
                                            <td className="px-4 py-3.5 align-middle">
                                                <span className="text-[13px]" style={{ color: '#111827' }}>{row.role}</span>
                                            </td>
                                            <td className="px-4 py-3.5 align-middle">
                                                <span className="font-mono text-[13px]" style={{ color: '#111827' }}>{formatDate(row.start_date)}</span>
                                            </td>
                                            <td className="px-4 py-3.5 align-middle">
                                                <span className="font-mono text-[13px]" style={{ color: '#111827' }}>{formatDate(row.end_date)}</span>
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
                    <div className="overflow-hidden rounded-2xl border bg-white shadow-[0_20px_44px_-32px_rgba(17,24,39,0.4)]" style={{ borderColor: '#E3E8F0' }}>
                        {services.length === 0 ? (
                            <div className="px-6 py-12 text-center" style={{ background: 'rgba(245,247,250,0.4)' }}>
                                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm">
                                    <Wrench size={20} aria-hidden="true" style={{ color: '#5B6474' }} />
                                </span>
                                <p className="mt-4 text-sm font-semibold" style={{ color: '#111827' }}>Belum ada catatan servis</p>
                                <p className="mt-1 text-xs" style={{ color: '#5B6474' }}>Pemeliharaan dan pemeriksaan dicatat di menu Operations.</p>
                            </div>
                        ) : (
                            <table className="w-full" style={{ minWidth: '56rem' }}>
                                <thead>
                                    <tr className="border-b" style={{ borderColor: '#E3E8F0', background: 'rgba(245,247,250,0.7)' }}>
                                        <th className="px-4 py-3 text-left font-mono text-[10px] font-medium uppercase tracking-[0.16em]" style={{ color: '#5B6474' }}>Servis</th>
                                        <th className="px-4 py-3 text-left font-mono text-[10px] font-medium uppercase tracking-[0.16em]" style={{ color: '#5B6474' }}>Jenis</th>
                                        <th className="px-4 py-3 text-left font-mono text-[10px] font-medium uppercase tracking-[0.16em]" style={{ color: '#5B6474' }}>Bengkel</th>
                                        <th className="px-4 py-3 text-left font-mono text-[10px] font-medium uppercase tracking-[0.16em]" style={{ color: '#5B6474' }}>Mulai</th>
                                        <th className="px-4 py-3 text-left font-mono text-[10px] font-medium uppercase tracking-[0.16em]" style={{ color: '#5B6474' }}>Selesai</th>
                                        <th className="px-4 py-3 text-right font-mono text-[10px] font-medium uppercase tracking-[0.16em]" style={{ color: '#5B6474' }}>Biaya</th>
                                        <th className="px-4 py-3 text-left font-mono text-[10px] font-medium uppercase tracking-[0.16em]" style={{ color: '#5B6474' }}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {services.map((row) => (
                                        <tr key={row.id} className="border-b transition-colors duration-150 hover:bg-[#F5F7FA]/50" style={{ borderColor: '#E3E8F0' }}>
                                            <td className="px-4 py-3.5 align-middle">
                                                <span className="text-sm font-semibold" style={{ color: '#111827' }}>{row.title}</span>
                                            </td>
                                            <td className="px-4 py-3.5 align-middle">
                                                <Badge tone={row.type === 'drydock' ? 'info' : 'neutral'}>{row.type}</Badge>
                                            </td>
                                            <td className="px-4 py-3.5 align-middle">
                                                <span className="text-[13px]" style={{ color: '#111827' }}>{row.workshop ?? '-'}</span>
                                            </td>
                                            <td className="px-4 py-3.5 align-middle">
                                                <span className="font-mono text-[13px]" style={{ color: '#111827' }}>{formatDate(row.start_date)}</span>
                                            </td>
                                            <td className="px-4 py-3.5 align-middle">
                                                <span className="font-mono text-[13px]" style={{ color: '#111827' }}>{formatDate(row.end_date)}</span>
                                            </td>
                                            <td className="px-4 py-3.5 align-middle text-right">
                                                <span className="font-mono text-[13px] font-semibold tabular-nums" style={{ color: '#111827' }}>{formatRupiah(row.cost)}</span>
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
                    <div className="rounded-2xl border bg-white p-5 shadow-[0_18px_40px_-30px_rgba(17,24,39,0.35)]" style={{ borderColor: '#E3E8F0' }}>
                        <h2 className="text-sm font-semibold" style={{ color: '#111827' }}>Riwayat Kondisi Kapal</h2>
                        <p className="mt-0.5 text-xs" style={{ color: '#5B6474' }}>Skor ceklis pemeriksaan, skala 0 sampai 100.</p>
                        {conditions.length === 0 ? (
                            <div className="mt-5 px-6 py-12 text-center" style={{ background: 'rgba(245,247,250,0.4)' }}>
                                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm">
                                    <Activity size={20} aria-hidden="true" style={{ color: '#5B6474' }} />
                                </span>
                                <p className="mt-4 text-sm font-semibold" style={{ color: '#111827' }}>Belum ada pemeriksaan kondisi</p>
                                <p className="mt-1 text-xs" style={{ color: '#5B6474' }}>Ceklis kondisi dicatat dari menu Operations.</p>
                            </div>
                        ) : (
                            <>
                                <div className="mt-5 flex items-center justify-between gap-4 rounded-xl px-4 py-3.5" style={{ background: 'rgba(245,247,250,0.7)' }}>
                                    <div>
                                        <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em]" style={{ color: '#5B6474' }}>Skor Terakhir</p>
                                        <p className="mt-1 font-mono text-2xl font-semibold tabular-nums" style={{ color: Number(conditions[0].score) >= 85 ? '#15803D' : Number(conditions[0].score) >= 70 ? '#B45309' : '#BA0C2F' }}>
                                            {formatNumber(conditions[0].score)}
                                            <span className="text-sm font-medium" style={{ color: '#5B6474' }}> /100</span>
                                        </p>
                                    </div>
                                    {conditions.length > 1 && (
                                        <div className="text-right">
                                            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em]" style={{ color: '#5B6474' }}>Tren</p>
                                            <Sparkline
                                                values={[...conditions].reverse().map((c) => Number(c.score))}
                                                color={Number(conditions[0].score) >= 85 ? '#15803D' : Number(conditions[0].score) >= 70 ? '#B45309' : '#BA0C2F'}
                                            />
                                        </div>
                                    )}
                                </div>
                                <ul className="mt-4 space-y-2.5">
                                    {conditions.map((c) => (
                                        <li key={c.id} className="rounded-xl border px-4 py-3" style={{ borderColor: '#E3E8F0' }}>
                                            <div className="flex items-center justify-between gap-3">
                                                <span className="font-mono text-[11px]" style={{ color: '#5B6474' }}>{formatDateTime(c.checked_at)}</span>
                                                <span className="rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold tabular-nums" style={{
                                                    background: Number(c.score) >= 85 ? 'rgba(21,128,61,0.1)' : Number(c.score) >= 70 ? 'rgba(180,83,9,0.1)' : 'rgba(186,12,47,0.1)',
                                                    color: Number(c.score) >= 85 ? '#15803D' : Number(c.score) >= 70 ? '#B45309' : '#BA0C2F',
                                                }}>
                                                    Skor {formatNumber(c.score)}
                                                </span>
                                            </div>
                                            {c.notes && <p className="mt-1.5 text-sm" style={{ color: '#111827' }}>{c.notes}</p>}
                                        </li>
                                    ))}
                                </ul>
                            </>
                        )}
                    </div>

                    <div className="rounded-2xl border bg-white p-5 shadow-[0_18px_40px_-30px_rgba(17,24,39,0.35)]" style={{ borderColor: '#E3E8F0' }}>
                        <h2 className="text-sm font-semibold" style={{ color: '#111827' }}>Monitoring BBM</h2>
                        <p className="mt-0.5 text-xs" style={{ color: '#5B6474' }}>Konsumsi aktual perjalanan dibandingkan baseline kapal.</p>
                        {fuelLogs.length === 0 ? (
                            <div className="mt-5 px-6 py-12 text-center" style={{ background: 'rgba(245,247,250,0.4)' }}>
                                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm">
                                    <Fuel size={20} aria-hidden="true" style={{ color: '#5B6474' }} />
                                </span>
                                <p className="mt-4 text-sm font-semibold" style={{ color: '#111827' }}>Belum ada trip BBM</p>
                                <p className="mt-1 text-xs" style={{ color: '#5B6474' }}>Log trip BBM dicatat dari menu Operations.</p>
                            </div>
                        ) : (
                            <>
                                <div className="mt-5 grid grid-cols-2 gap-3">
                                    <div className="rounded-xl px-4 py-3.5" style={{ background: 'rgba(245,247,250,0.7)' }}>
                                        <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em]" style={{ color: '#5B6474' }}>Rata-rata Konsumsi</p>
                                        <p className="mt-1 font-mono text-2xl font-semibold tabular-nums" style={{ color: '#111827' }}>
                                            {formatNumber(avgLph, 1)}
                                            <span className="text-sm font-medium" style={{ color: '#5B6474' }}> L/jam</span>
                                        </p>
                                        <p className="mt-1 text-[11px]" style={{ color: '#5B6474' }}>
                                            {formatNumber(totalLiters, 2)} L dalam {formatNumber(totalHours, 1)} jam
                                        </p>
                                    </div>
                                    <div className="rounded-xl px-4 py-3.5" style={{ background: 'rgba(245,247,250,0.7)' }}>
                                        <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em]" style={{ color: '#5B6474' }}>Baseline Kapal</p>
                                        <p className="mt-1 font-mono text-2xl font-semibold tabular-nums" style={{ color: '#111827' }}>
                                            {baseline != null ? (
                                                <>
                                                    {formatNumber(baseline, 1)}
                                                    <span className="text-sm font-medium" style={{ color: '#5B6474' }}> L/jam</span>
                                                </>
                                            ) : '-'}
                                        </p>
                                        <p className="mt-1 text-[11px] font-medium" style={{ color: baselineDiff != null && Math.abs(baselineDiff) > 10 ? '#BA0C2F' : '#5B6474' }}>
                                            {baselineDiff != null ? `${baselineDiff > 0 ? '+' : ''}${formatNumber(baselineDiff, 1)}% dari baseline` : 'baseline belum diatur'}
                                        </p>
                                    </div>
                                </div>
                                <ul className="mt-4 space-y-2.5">
                                    {fuelLogs.map((f) => {
                                        const lph = f.duration_hours > 0 ? f.liters / f.duration_hours : 0;
                                        return (
                                            <li key={f.id} className="rounded-xl border px-4 py-3" style={{ borderColor: '#E3E8F0' }}>
                                                <div className="flex items-center justify-between gap-3">
                                                    <p className="min-w-0 truncate text-sm font-semibold" style={{ color: '#111827' }}>{f.route}</p>
                                                    <Badge tone={FUEL_TONES[f.analysis_status] ?? 'neutral'}>
                                                        {FUEL_LABELS[f.analysis_status] ?? f.analysis_status}
                                                        {` (${f.analysis_diff_pct > 0 ? '+' : ''}${formatNumber(f.analysis_diff_pct, 1)}%)`}
                                                    </Badge>
                                                </div>
                                                <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs" style={{ color: '#5B6474' }}>
                                                    <span>{formatDate(f.trip_date)}</span>
                                                    <span aria-hidden="true">·</span>
                                                    <span className="font-mono">{formatNumber(f.duration_hours, 1)} jam</span>
                                                    <span aria-hidden="true">·</span>
                                                    <span className="font-mono">{formatNumber(f.liters, 2)} L</span>
                                                    <span aria-hidden="true">·</span>
                                                    <span className="font-mono font-semibold" style={{ color: '#111827' }}>{formatNumber(lph, 1)} L/jam</span>
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
                    <div className="overflow-hidden rounded-2xl border bg-white shadow-[0_20px_44px_-32px_rgba(17,24,39,0.4)]" style={{ borderColor: '#E3E8F0' }}>
                        {auditLogs.length === 0 ? (
                            <div className="px-6 py-12 text-center" style={{ background: 'rgba(245,247,250,0.4)' }}>
                                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm">
                                    <History size={20} aria-hidden="true" style={{ color: '#5B6474' }} />
                                </span>
                                <p className="mt-4 text-sm font-semibold" style={{ color: '#111827' }}>Belum ada aktivitas</p>
                            </div>
                        ) : (
                            <table className="w-full" style={{ minWidth: '44rem' }}>
                                <thead>
                                    <tr className="border-b" style={{ borderColor: '#E3E8F0', background: 'rgba(245,247,250,0.7)' }}>
                                        <th className="px-4 py-3 text-left font-mono text-[10px] font-medium uppercase tracking-[0.16em]" style={{ color: '#5B6474' }}>Waktu</th>
                                        <th className="px-4 py-3 text-left font-mono text-[10px] font-medium uppercase tracking-[0.16em]" style={{ color: '#5B6474' }}>Pengguna</th>
                                        <th className="px-4 py-3 text-left font-mono text-[10px] font-medium uppercase tracking-[0.16em]" style={{ color: '#5B6474' }}>Aksi</th>
                                        <th className="px-4 py-3 text-left font-mono text-[10px] font-medium uppercase tracking-[0.16em]" style={{ color: '#5B6474' }}>Ringkasan</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {auditLogs.map((row) => (
                                        <tr key={row.id} className="border-b transition-colors duration-150 hover:bg-[#F5F7FA]/50" style={{ borderColor: '#E3E8F0' }}>
                                            <td className="px-4 py-3.5 align-middle">
                                                <span className="font-mono text-[13px]" style={{ color: '#111827' }}>{formatDateTime(row.timestamp)}</span>
                                            </td>
                                            <td className="px-4 py-3.5 align-middle">
                                                <span className="text-[13px] font-medium" style={{ color: '#111827' }}>{row.user_name ?? 'Sistem'}</span>
                                            </td>
                                            <td className="px-4 py-3.5 align-middle">
                                                <Badge tone="info">{row.action}</Badge>
                                            </td>
                                            <td className="px-4 py-3.5 align-middle">
                                                <span className="text-[13px]" style={{ color: '#5B6474' }}>{row.change_summary ?? '-'}</span>
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
