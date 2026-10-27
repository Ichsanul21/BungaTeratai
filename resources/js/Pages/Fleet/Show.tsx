import Badge, { type BadgeTone } from '@/Components/ui/Badge';
// [ARSIP KAPAL DINONAKTIFKAN]
// Fungsi arsipkan kapal disembunyikan sementara. Semua titik yang
// dimatikan ditandai kata "dinonaktifkan", cukup cari kata itu bila
// suatu saat ingin diaktifkan lagi: lepas komentar import ConfirmModal
// di bawah, ikon Archive pada import lucide-react, state confirmArchive
// & busy, tombol arsip di klaster aksi hero, dan ConfirmModal di akhir
// file, lalu kembalikan "router" pada import @inertiajs/react.
// import ConfirmModal from '@/Components/ui/ConfirmModal';
import {
    VERIFICATION_STATUS_LABELS,
    VOYAGE_STATUS_LABELS,
} from '@/Constants/navigation';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {
    classNames,
    daysUntil,
    formatDate,
    formatDateTime,
    formatNumber,
    formatRupiah,
} from '@/lib/format';
import { type PageProps } from '@/types';
// "router" dikeluarkan sementara: hanya dipakai fungsi arsip kapal
// yang sedang dinonaktifkan.
import { Head, Link } from '@inertiajs/react';
import {
    Activity,
    Anchor,
    // Archive, // dinonaktifkan: fungsi arsipkan kapal disembunyikan
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
    type LucideIcon,
} from 'lucide-react';
import { type ReactNode, useState } from 'react';

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

// Titik status pada panel hero gelap. Merah primary tidak terbaca di atas
// latar burgundy, jadi status berat memakai titik krem.
const STATUS_DOTS: Record<string, string> = {
    aktif: 'bg-ok',
    dalam_perbaikan: 'bg-gold',
    dock: 'bg-cream',
    mangkrak: 'bg-cream',
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

// Tekstur grain halus untuk panel hero, senada dengan login, sidebar,
// dashboard, notifikasi, document center, dan registry armada.
const GRAIN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E")`;

const EASE = 'cubic-bezier(0.22,1,0.36,1)';

// Kelas bersama kepala dan sel meja register, identik dengan registry
// armada agar halaman index dan detail terasa satu keluarga.
const TH_BASE =
    'px-4 py-3 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-muted';
const TD_CLS = 'px-4 py-3.5 align-middle';

// Ubah timestamp posisi menjadi label relatif, plus penanda masih segar
// (di bawah 24 jam). Timestamp Laravel memakai spasi, diganti "T" agar
// aman diparse Date() di semua browser termasuk Safari.
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

// Ubin metrik kaca di panel hero, pola yang sama dengan ubin ringkasan
// pada registry armada, notifikasi, dan document center.
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
        <div className="min-w-0 rounded-xl border border-white/[0.12] bg-white/[0.07] p-4 backdrop-blur-sm">
            <p className="truncate font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-cream/60">
                {label}
            </p>
            <p
                className={classNames(
                    'mt-2 text-2xl font-semibold tabular-nums tracking-tight',
                    gold ? 'text-gold' : 'text-cream',
                )}
            >
                {value}
            </p>
            <p className="mt-2 truncate text-[11px] text-cream/60">{sub}</p>
        </div>
    );
}

// Sel strip spesifikasi: nomor dan angka penting kapal selalu terlihat
// meski pengguna sedang berada di tab selain Overview.
function SpecCell({
    label,
    value,
    className = '',
}: {
    label: string;
    value: string;
    className?: string;
}) {
    return (
        <div className={classNames('min-w-0 bg-white px-4 py-3.5', className)}>
            <p className="truncate font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-muted">
                {label}
            </p>
            <p className="mt-1 truncate font-mono text-sm font-semibold text-ink" title={value}>
                {value}
            </p>
        </div>
    );
}

// Kartu putih dengan kepala bernama, mengikuti kelas kartu registry.
function Panel({
    title,
    description,
    actions,
    children,
    className = '',
}: {
    title?: string;
    description?: string;
    actions?: ReactNode;
    children: ReactNode;
    className?: string;
}) {
    return (
        <section
            className={classNames(
                'rounded-2xl border border-hairline bg-white shadow-[0_18px_40px_-30px_rgba(28,27,26,0.35)]',
                className,
            )}
        >
            {(title || actions) && (
                <header className="flex items-start justify-between gap-3 border-b border-hairline px-5 py-4">
                    <div>
                        {title && <h2 className="text-sm font-semibold text-ink">{title}</h2>}
                        {description && (
                            <p className="mt-0.5 text-xs leading-relaxed text-muted">
                                {description}
                            </p>
                        )}
                    </div>
                    {actions && <div className="flex items-center gap-2">{actions}</div>}
                </header>
            )}
            <div className="p-5">{children}</div>
        </section>
    );
}

// Baris buku besar spesifikasi: label kiri, nilai kanan, garis putus
// halus, seperti lembar registri dokumen resmi.
function LedgerRow({
    label,
    value,
    mono = false,
}: {
    label: string;
    value: any;
    mono?: boolean;
}) {
    return (
        <div className="flex items-baseline justify-between gap-4 border-b border-dashed border-hairline/80 pb-2">
            <dt className="shrink-0 text-xs font-medium text-muted">{label}</dt>
            <dd
                className={classNames(
                    'min-w-0 text-right text-[13px] font-medium text-ink',
                    mono && 'font-mono',
                )}
            >
                {value ?? '-'}
            </dd>
        </div>
    );
}

// Ring gauge kelengkapan dokumen: ambang warna sama dengan registry
// (90% aman, 70% waspada, di bawahnya merah).
function RingGauge({ percent }: { percent: number }) {
    const clamped = Math.min(100, Math.max(0, percent));
    const circumference = 2 * Math.PI * 15.5;
    const stroke = clamped >= 90 ? 'stroke-ok' : clamped >= 70 ? 'stroke-warn' : 'stroke-primary';
    const text = clamped >= 90 ? 'text-ok' : clamped >= 70 ? 'text-warn' : 'text-primary';
    return (
        <div className="relative h-28 w-28 shrink-0">
            <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90" aria-hidden="true">
                <circle
                    cx="18"
                    cy="18"
                    r="15.5"
                    fill="none"
                    strokeWidth="4"
                    className="stroke-hairline"
                />
                <circle
                    cx="18"
                    cy="18"
                    r="15.5"
                    fill="none"
                    strokeWidth="4"
                    strokeLinecap="round"
                    className={stroke}
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference * (1 - clamped / 100)}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={classNames('font-mono text-xl font-semibold tabular-nums', text)}>
                    {formatNumber(clamped, 1)}%
                </span>
                <span className="mt-0.5 font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-muted">
                    Lengkap
                </span>
            </div>
        </div>
    );
}

// Sparkline mini tanpa dependensi: dipakai untuk tren skor kondisi.
function Sparkline({ values, className = '' }: { values: number[]; className?: string }) {
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
        <svg viewBox="0 0 100 28" preserveAspectRatio="none" className={className} aria-hidden="true">
            <polyline
                points={points}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
            />
        </svg>
    );
}

// Warna teks dan chip skor kondisi, ambang sama dengan versi lama.
function scoreText(score: number): string {
    if (score >= 85) return 'text-ok';
    if (score >= 70) return 'text-warn';
    return 'text-primary';
}
function scoreChip(score: number): string {
    if (score >= 85) return 'bg-ok/10 text-ok';
    if (score >= 70) return 'bg-warn/10 text-warn';
    return 'bg-primary/10 text-primary';
}

// Empty state dashed, gaya yang sama dengan registry armada.
function EmptyBlock({
    icon: Icon,
    title,
    description,
    action,
}: {
    icon?: LucideIcon;
    title: string;
    description?: string;
    action?: ReactNode;
}) {
    return (
        <div className="rounded-2xl border border-dashed border-hairline bg-appbg/40 px-6 py-12 text-center">
            {Icon && (
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white text-muted shadow-sm ring-1 ring-inset ring-hairline">
                    <Icon size={20} aria-hidden="true" />
                </span>
            )}
            <p className="mt-4 text-sm font-semibold text-ink">{title}</p>
            {description && <p className="mt-1 text-xs text-muted">{description}</p>}
            {action && <div className="mt-5">{action}</div>}
        </div>
    );
}

interface RegColumn<T = any> {
    key: string;
    label: string;
    align?: 'left' | 'center' | 'right';
    render?: (row: T) => ReactNode;
}

// Meja register lokal untuk halaman detail: cangkang, kepala mono, dan
// rel kiri persis registry armada, sehingga tab dokumen, perjalanan,
// awak, pemeliharaan, dan aktivitas terasa satu keluarga dengannya.
function RegisterTable<T extends Record<string, any>>({
    columns,
    rows,
    rowKey = 'id',
    rail,
    meta,
    legend,
    minW = 'min-w-[44rem]',
    emptyIcon,
    emptyTitle,
    emptyDescription,
    emptyAction,
}: {
    columns: RegColumn<T>[];
    rows: T[];
    rowKey?: string;
    rail?: (row: T) => string;
    meta?: string;
    legend?: Array<{ tone: 'warn' | 'primary'; label: string }>;
    minW?: string;
    emptyIcon?: LucideIcon;
    emptyTitle: string;
    emptyDescription?: string;
    emptyAction?: ReactNode;
}) {
    if (rows.length === 0) {
        return (
            <EmptyBlock
                icon={emptyIcon}
                title={emptyTitle}
                description={emptyDescription}
                action={emptyAction}
            />
        );
    }

    return (
        <div>
            {(meta || (legend && legend.length > 0)) && (
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
                        {meta}
                    </p>
                    {legend && legend.length > 0 && (
                        <p className="flex items-center gap-3 text-[11px] text-muted">
                            {legend.map((l) => (
                                <span key={l.label} className="flex items-center gap-1.5">
                                    <span
                                        aria-hidden="true"
                                        className={classNames(
                                            'h-3 w-[3px] rounded-full',
                                            l.tone === 'warn' ? 'bg-warn' : 'bg-primary',
                                        )}
                                    />
                                    {l.label}
                                </span>
                            ))}
                        </p>
                    )}
                </div>
            )}
            <div className="overflow-hidden rounded-2xl border border-hairline bg-white shadow-[0_20px_44px_-32px_rgba(28,27,26,0.4)]">
                <div className="bt-scroll overflow-x-auto">
                    <table className={classNames('w-full text-sm', minW)}>
                        <thead>
                            <tr className="border-b border-hairline bg-appbg/70">
                                {columns.map((col) => (
                                    <th
                                        key={col.key}
                                        scope="col"
                                        className={classNames(
                                            TH_BASE,
                                            col.align === 'center'
                                                ? 'text-center'
                                                : col.align === 'right'
                                                  ? 'text-right'
                                                  : 'text-left',
                                        )}
                                    >
                                        {col.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-hairline">
                            {rows.map((row, idx) => {
                                const r = rail ? rail(row) : '';
                                return (
                                    <tr
                                        key={row[rowKey] ?? idx}
                                        className="transition-colors duration-150 hover:bg-appbg/50"
                                    >
                                        {columns.map((col, ci) => (
                                            <td
                                                key={col.key}
                                                className={classNames(
                                                    'relative',
                                                    TD_CLS,
                                                    col.align === 'center' && 'text-center',
                                                    col.align === 'right' && 'text-right',
                                                    ci === 0 &&
                                                        r &&
                                                        'before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3px] before:rounded-full',
                                                    ci === 0 && r,
                                                )}
                                            >
                                                {col.render ? col.render(row) : (row[col.key] ?? '-')}
                                            </td>
                                        ))}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
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
    // State arsipkan kapal dinonaktifkan sementara.
    // const [confirmArchive, setConfirmArchive] = useState(false);
    // const [busy, setBusy] = useState(false);

    // Berkas Offline (PSC): manifest dokumen aktif + checksum dari /api/sync/pack
    // — diunduh sekali sebelum berlayar / saat inspeksi, dibuka tanpa internet.
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
                  formatNumber(
                      vessel.capacity_value,
                      vessel.capacity_unit === 'penumpang' ? 0 : 1,
                  ),
                  vessel.capacity_unit === 'penumpang' ? 'penumpang' : vessel.capacity_unit,
              ]
                .filter(Boolean)
                .join(' ')
            : null;

    const tabs: Array<{ key: string; label: string; icon: LucideIcon; count?: number }> = [
        { key: 'overview', label: 'Overview', icon: Anchor },
        { key: 'dokumen', label: 'Dokumen', icon: FileStack, count: documents.length },
        {
            key: 'perjalanan',
            label: 'Riwayat Perjalanan',
            icon: ClipboardList,
            count: voyages.length,
        },
        { key: 'awak', label: 'Awak Kapal', icon: UserRound, count: crews.length },
        { key: 'pemeliharaan', label: 'Pemeliharaan', icon: Wrench, count: services.length },
        {
            key: 'kondisi',
            label: 'Kondisi & BBM',
            icon: Fuel,
            count: conditions.length + fuelLogs.length,
        },
        { key: 'aktivitas', label: 'Riwayat Aktivitas', icon: History, count: auditLogs.length },
    ];

    // Agregat monitoring BBM untuk ringkasan di atas daftar trip.
    const totalHours = fuelLogs.reduce((s, f) => s + (Number(f.duration_hours) || 0), 0);
    const totalLiters = fuelLogs.reduce((s, f) => s + (Number(f.liters) || 0), 0);
    const avgLph = totalHours > 0 ? totalLiters / totalHours : 0;
    const baseline =
        vessel.fuel_baseline_lph != null ? Number(vessel.fuel_baseline_lph) : null;
    const baselineDiff = baseline ? ((avgLph - baseline) / baseline) * 100 : null;

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
                .bt-scroll { scrollbar-width: thin; scrollbar-color: rgba(28,27,26,0.22) transparent; }
                .bt-scroll::-webkit-scrollbar { width: 5px; height: 5px; }
                .bt-scroll::-webkit-scrollbar-thumb { background: rgba(28,27,26,0.2); border-radius: 9999px; }
                .bt-scroll::-webkit-scrollbar-track { background: transparent; }
                @media (prefers-reduced-motion: reduce) {
                    .bt-anim, .bt-anim * { animation: none !important; }
                }
            `}</style>

            {/* ===== 00 · Pita detail kapal =====
                Kelanjutan panel registry armada: aurora, grain, rim emas,
                dan watermark kapal (senada ikon armada pada sidebar), lalu
                empat ubin ringkasan kondisi kapal ini. Jalan pulang ada di
                kiri atas, seragam dengan halaman unggah dokumen serta
                formulir tambah dan edit kapal. */}
            <section
                className="bt-anim relative mb-6 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-sidebar via-primary-hover to-primary shadow-[0_24px_60px_-24px_rgba(69,16,22,0.55)]"
                style={{ animation: `bt-rise 0.55s ${EASE} both` }}
            >
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 overflow-hidden"
                >
                    <div
                        className="bt-anim absolute -left-24 -top-32 h-80 w-80 rounded-full blur-3xl"
                        style={{
                            background:
                                'radial-gradient(circle at center, rgba(193,18,31,0.4), transparent 65%)',
                            animation: 'bt-drift-a 26s ease-in-out infinite',
                        }}
                    />
                    <div
                        className="bt-anim absolute -bottom-36 -right-28 h-96 w-96 rounded-full blur-3xl"
                        style={{
                            background:
                                'radial-gradient(circle at center, rgba(212,169,106,0.22), transparent 70%)',
                            animation: 'bt-drift-b 34s ease-in-out infinite',
                        }}
                    />
                    <div
                        className="absolute inset-0 opacity-[0.06] mix-blend-overlay"
                        style={{ backgroundImage: GRAIN }}
                    />
                    <Ship
                        size={230}
                        strokeWidth={0.7}
                        className="absolute -right-8 -top-14 hidden rotate-[8deg] select-none text-white/[0.05] xl:block"
                    />
                </div>
                {/* Rim emas tipis di tepi atas, tanda tangan antar halaman. */}
                <div
                    aria-hidden="true"
                    className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent"
                />

                <div className="relative flex flex-col gap-6 p-6 lg:p-7 xl:flex-row xl:items-end xl:justify-between">
                    <div className="min-w-0 max-w-2xl">
                        <Link
                            href="/armada"
                            className="inline-flex items-center gap-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-cream/60 transition-colors hover:text-cream"
                        >
                            <ArrowLeft size={13} aria-hidden="true" />
                            Registry Armada
                        </Link>
                        <p className="mt-3 flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-cream/60">
                            <span
                                aria-hidden="true"
                                className="bt-anim h-2 w-2 rounded-full bg-gold"
                                style={{ animation: 'bt-pulse-dot 2.4s ease-in-out infinite' }}
                            />
                            Detail Kapal
                        </p>
                        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-cream sm:text-3xl">
                            {vessel.vessel_name}
                        </h1>
                        <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-cream/70">
                            <span>
                                {vessel.vessel_type === 'lainnya' && vessel.vessel_type_custom
                                    ? vessel.vessel_type_custom
                                    : TYPE_LABELS[vessel.vessel_type] ?? vessel.vessel_type}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>
                                {NAV_LABELS[vessel.navigation_type] ?? vessel.navigation_type}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>{vessel.base_location ?? 'Pangkalan belum diatur'}</span>
                        </p>
                        <p className="mt-3.5">
                            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-cream backdrop-blur-sm">
                                <span
                                    aria-hidden="true"
                                    className={classNames(
                                        'h-1.5 w-1.5 rounded-full',
                                        STATUS_DOTS[vessel.operational_status] ?? 'bg-cream',
                                    )}
                                />
                                {STATUS_LABELS[vessel.operational_status] ??
                                    vessel.operational_status}
                            </span>
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 xl:shrink-0">
                        {canEdit && (
                            <>
                                <Link
                                    href={`/armada/${vessel.id}/edit`}
                                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-cream px-3.5 py-2 text-sm font-semibold text-sidebar shadow-[0_12px_26px_-14px_rgba(212,169,106,0.55)] transition hover:bg-cream/90"
                                >
                                    <Edit size={16} aria-hidden="true" />
                                    Edit Data
                                </Link>
                                {/* Tombol arsipkan kapal dinonaktifkan sementara.
                                <button
                                    type="button"
                                    onClick={() => setConfirmArchive(true)}
                                    title="Arsipkan kapal"
                                    aria-label="Arsipkan kapal"
                                    className="inline-flex h-[38px] w-[38px] items-center justify-center rounded-lg border border-white/20 bg-white/10 text-cream/80 backdrop-blur-sm transition hover:border-white/40 hover:text-cream"
                                >
                                    <Archive size={16} aria-hidden="true" />
                                </button>
                                */}
                            </>
                        )}
                    </div>
                </div>

                {/* Empat ubin ringkasan: cermin angka kapal ini di atas
                    tab detail. */}
                <div className="relative grid grid-cols-2 gap-3 border-t border-white/[0.08] p-6 pt-5 sm:gap-4 lg:grid-cols-4 lg:p-7 lg:pt-6">
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
                    <HeroMetric
                        label="Riwayat Perjalanan"
                        value={formatNumber(voyages.length)}
                        sub="perjalanan tercatat"
                    />
                    <HeroMetric
                        label="Awak Aktif"
                        value={formatNumber(activeCrews)}
                        sub={`dari ${formatNumber(crews.length)} penempatan ABK`}
                    />
                </div>
            </section>

            {/* ===== 01 · Strip spesifikasi registry =====
                Angka kunci tetap terlihat di semua tab karena isi tab
                saling bergantian, jadi identitas teknis kapal tidak
                pernah hilang dari layar. */}
            <div
                className="bt-anim mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-hairline bg-hairline shadow-[0_18px_40px_-30px_rgba(28,27,26,0.35)] sm:grid-cols-3 lg:grid-cols-5"
                style={{ animation: `bt-rise 0.45s ${EASE} 70ms both` }}
            >
                <SpecCell label="Nomor Registrasi" value={vessel.registration_number ?? '-'} />
                <SpecCell
                    label="Tahun Buat"
                    value={vessel.year_built != null ? String(vessel.year_built) : '-'}
                />
                <SpecCell label="GT" value={vessel.gt != null ? formatNumber(vessel.gt) : '-'} />
                <SpecCell
                    label="DWT"
                    value={vessel.dwt != null ? formatNumber(vessel.dwt, 2) : '-'}
                />
                <SpecCell
                    label="Kapasitas"
                    value={capacityLabel ?? '-'}
                    className="col-span-2 sm:col-span-1"
                />
            </div>

            {/* ===== 02 · Tab bagian =====
                Pil berikon menggantikan TabNav bergaris bawah, konsisten
                dengan pil status pada registry armada. */}
            <nav
                className="bt-anim bt-scroll mb-5 flex gap-1.5 overflow-x-auto pe-1"
                style={{ animation: `bt-rise 0.45s ${EASE} 110ms both` }}
                aria-label="Bagian detail kapal"
            >
                {tabs.map(({ key, label, icon: Icon, count }) => {
                    const isActive = key === tab;
                    return (
                        <button
                            key={key}
                            type="button"
                            onClick={() => setTab(key)}
                            className={classNames(
                                'inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors duration-200',
                                isActive
                                    ? 'border-primary bg-primary text-white shadow-[0_10px_24px_-12px_rgba(193,18,31,0.55)]'
                                    : 'border-hairline bg-white text-muted hover:border-primary/40 hover:text-ink',
                            )}
                        >
                            <Icon
                                size={14}
                                aria-hidden="true"
                                className={isActive ? 'text-gold' : ''}
                            />
                            {label}
                            {count !== undefined && (
                                <span
                                    className={classNames(
                                        'rounded-full px-1.5 py-0.5 font-mono text-[10px] font-semibold leading-none',
                                        isActive
                                            ? 'bg-white/20 text-white'
                                            : 'bg-appbg text-muted',
                                    )}
                                >
                                    {formatNumber(count)}
                                </span>
                            )}
                        </button>
                    );
                })}
            </nav>

            {/* ===== 03 · Overview =====
                Ring gauge kelengkapan dokumen dengan daftar tindak lanjut,
                plus lembar spesifikasi bergaya buku besar registri. */}
            {tab === 'overview' && (
                <div
                    className="bt-anim grid grid-cols-1 gap-5 xl:grid-cols-3"
                    style={{ animation: `bt-rise 0.45s ${EASE} 150ms both` }}
                >
                    <Panel
                        title="Kelengkapan Dokumen"
                        description="Indikator internal, bukan penilaian nakhoda atau persetujuan otoritas."
                    >
                        <div className="flex items-center gap-5">
                            <RingGauge percent={completeness.percent} />
                            <div className="min-w-0">
                                <p className="text-sm font-medium text-ink">
                                    {completeness.met} dari {completeness.total} dokumen wajib
                                    terpenuhi
                                </p>
                                <p className="mt-1 text-xs leading-relaxed text-muted">
                                    {completeness.missing.length > 0
                                        ? `${completeness.missing.length} dokumen belum terpenuhi. Kapal masuk ambang tindak lanjut bila kelengkapan di bawah 90%.`
                                        : 'Seluruh dokumen wajib telah terpenuhi.'}
                                </p>
                            </div>
                        </div>

                        {completeness.missing.length > 0 && (
                            <div className="mt-5 border-t border-hairline pt-4">
                                <p className="mb-2 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-muted">
                                    Perlu Ditindaklanjuti ({completeness.missing.length})
                                </p>
                                <ul className="space-y-1.5">
                                    {completeness.missing.map((m) => (
                                        <li
                                            key={m.code}
                                            className="flex items-start justify-between gap-3 rounded-lg bg-primary-tint px-3 py-2 text-xs"
                                        >
                                            <span className="min-w-0 text-ink">
                                                <span className="font-mono font-semibold text-primary">
                                                    {m.group_code}
                                                </span>
                                                <span className="mx-1.5 text-muted" aria-hidden="true">
                                                    ·
                                                </span>
                                                {m.name}
                                            </span>
                                            <span className="shrink-0 font-medium text-primary">
                                                {m.reason}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <Link
                            href="/dokumen"
                            className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-primary transition-colors duration-150 hover:underline"
                        >
                            Kelola di Document Center
                            <ChevronRight size={13} aria-hidden="true" />
                        </Link>
                    </Panel>

                    <Panel
                        title="Identitas & Spesifikasi"
                        description="Data registri teknis dan administrasi kapal."
                        className="xl:col-span-2"
                    >
                        <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2 2xl:grid-cols-3">
                            <section>
                                <h3 className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                                    Identifikasi & Komunikasi
                                </h3>
                                <dl className="mt-3 space-y-3">
                                    <LedgerRow label="IMO" value={vessel.imo} mono />
                                    <LedgerRow label="MMSI" value={vessel.mmsi} mono />
                                    <LedgerRow label="Call Sign" value={vessel.call_sign} mono />
                                </dl>
                            </section>
                            <section>
                                <h3 className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                                    Dimensi & Mesin
                                </h3>
                                <dl className="mt-3 space-y-3">
                                    <LedgerRow
                                        label="Panjang (LOA)"
                                        value={vessel.length_m ? `${formatNumber(vessel.length_m, 2)} m` : null}
                                        mono
                                    />
                                    <LedgerRow
                                        label="Lebar (Beam)"
                                        value={vessel.beam_m ? `${formatNumber(vessel.beam_m, 2)} m` : null}
                                        mono
                                    />
                                    <LedgerRow label="Mesin" value={vessel.engine_spec} />
                                    <LedgerRow label="Bahan Bakar" value={vessel.fuel_spec} />
                                    <LedgerRow
                                        label="Baseline BBM"
                                        value={
                                            vessel.fuel_baseline_lph
                                                ? `${formatNumber(vessel.fuel_baseline_lph, 1)} L/jam`
                                                : null
                                        }
                                        mono
                                    />
                                </dl>
                            </section>
                            <section>
                                <h3 className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                                    Administrasi
                                </h3>
                                <dl className="mt-3 space-y-3">
                                    <LedgerRow label="Pemilik" value={vessel.owner} />
                                    <LedgerRow label="Operator" value={vessel.operator} />
                                    <LedgerRow
                                        label="Terdaftar Sejak"
                                        value={vessel.created_at ? formatDate(vessel.created_at) : null}
                                        mono
                                    />
                                </dl>
                            </section>
                        </div>

                        {vessel.notes && (
                            <div className="mt-5 rounded-lg border-l-2 border-primary bg-appbg px-3.5 py-2.5 text-xs leading-relaxed text-muted">
                                <span className="font-semibold text-ink">Catatan: </span>
                                {vessel.notes}
                            </div>
                        )}

                        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border border-hairline px-3.5 py-2.5 text-xs text-muted">
                            <MapPin size={14} aria-hidden="true" className="text-primary" />
                            <span className="font-semibold text-ink">Posisi terakhir</span>
                            <span className="font-mono">
                                {vessel.last_lat ?? '-'}, {vessel.last_lng ?? '-'}
                            </span>
                            {pos && (
                                <>
                                    <span aria-hidden="true">·</span>
                                    <span className="inline-flex items-center gap-1.5">
                                        <span
                                            aria-hidden="true"
                                            className={classNames(
                                                'h-1.5 w-1.5 rounded-full',
                                                pos.fresh ? 'bg-ok' : 'bg-stone',
                                            )}
                                        />
                                        {pos.label}
                                    </span>
                                    <span aria-hidden="true">·</span>
                                    <span>{formatDateTime(vessel.last_position_at)}</span>
                                </>
                            )}
                            <span className="ms-auto rounded bg-warn/10 px-1.5 py-0.5 font-medium text-warn">
                                SIMULASI
                            </span>
                        </div>
                    </Panel>
                </div>
            )}

            {/* ===== 04 · Dokumen =====
                Register dokumen kapal dengan rel kiri untuk dokumen
                bermasalah, senada dengan register pada Document Center. */}
            {tab === 'dokumen' && (
                <section
                    className="bt-anim"
                    style={{ animation: `bt-rise 0.45s ${EASE} 150ms both` }}
                >
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-hairline bg-white px-4 py-3">
                        <div className="text-sm text-muted">
                            <span className="font-medium text-ink">Berkas Offline (PSC):</span>{' '}
                            manifest dokumen aktif + masa berlaku + checksum — diunduh sebelum
                            berlayar agar bisa ditunjukkan saat inspeksi tanpa internet.
                        </div>
                        <div className="flex items-center gap-3">
                            {packMsg && <span className="text-xs font-medium text-ok">{packMsg}</span>}
                            <button
                                type="button"
                                onClick={() => void downloadOfflinePack()}
                                disabled={packBusy}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-hairline px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-primary/40 disabled:opacity-50"
                            >
                                <Download size={13} />
                                {packBusy ? 'Menyiapkan…' : 'Unduh Berkas Offline'}
                            </button>
                        </div>
                    </div>
                    <RegisterTable
                        meta={`${formatNumber(documents.length)} dokumen`}
                        legend={[
                            { tone: 'warn', label: 'perlu revisi' },
                            { tone: 'primary', label: 'ditolak · kedaluwarsa' },
                        ]}
                        rail={(row) => {
                            const d = row.has_expiry ? daysUntil(row.expiry_date) : null;
                            if (
                                row.verification_status === 'rejected' ||
                                (d !== null && d < 0)
                            ) {
                                return 'before:bg-primary';
                            }
                            if (row.verification_status === 'revision_required') {
                                return 'before:bg-warn';
                            }
                            return '';
                        }}
                        columns={[
                            {
                                key: 'document_name',
                                label: 'Dokumen',
                                render: (row) => (
                                    <Link
                                        href={`/dokumen/${row.id}`}
                                        className="text-sm font-semibold text-ink transition-colors duration-150 hover:text-primary hover:underline"
                                    >
                                        {row.document_name}
                                    </Link>
                                ),
                            },
                            {
                                key: 'group_code',
                                label: 'Grup',
                                render: (row) => (
                                    <span className="rounded bg-appbg px-1.5 py-0.5 font-mono text-[11px] font-semibold text-maritime">
                                        {row.group_code}
                                    </span>
                                ),
                            },
                            {
                                key: 'category_name',
                                label: 'Kategori',
                                render: (row) => (
                                    <span className="text-[13px] text-muted">
                                        {row.category_name}
                                    </span>
                                ),
                            },
                            {
                                key: 'document_number',
                                label: 'Nomor',
                                render: (row) => (
                                    <span className="font-mono text-[13px] text-ink">
                                        {row.document_number ?? '-'}
                                    </span>
                                ),
                            },
                            {
                                key: 'expiry_date',
                                label: 'Berlaku s/d',
                                render: (row) => {
                                    if (!row.has_expiry) {
                                        return (
                                            <span className="text-xs text-muted">
                                                Tanpa masa berlaku
                                            </span>
                                        );
                                    }
                                    const d = daysUntil(row.expiry_date);
                                    return (
                                        <span
                                            className={classNames(
                                                'text-[13px]',
                                                d !== null && d < 0
                                                    ? 'font-semibold text-primary'
                                                    : d !== null && d <= 30
                                                      ? 'font-semibold text-warn'
                                                      : 'text-ink',
                                            )}
                                        >
                                            {row.expiry_date}
                                            {d !== null && (
                                                <span className="ms-1.5 text-xs font-normal text-muted">
                                                    {d < 0
                                                        ? `lewat ${Math.abs(d)} hr`
                                                        : `${d} hr lagi`}
                                                </span>
                                            )}
                                        </span>
                                    );
                                },
                            },
                            {
                                key: 'verification_status',
                                label: 'Status',
                                render: (row) => (
                                    <Badge tone={VERIF_TONES[row.verification_status] ?? 'neutral'}>
                                        {VERIFICATION_STATUS_LABELS[row.verification_status] ??
                                            row.verification_status}
                                    </Badge>
                                ),
                            },
                        ]}
                        rows={documents}
                        rowKey="id"
                        minW="min-w-[52rem]"
                        emptyIcon={FileStack}
                        emptyTitle="Belum ada dokumen kapal"
                        emptyDescription="Unggah dokumen identitas dan sertifikat kapal di Document Center."
                        emptyAction={
                            <Link
                                href="/dokumen/create"
                                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover"
                            >
                                Unggah Dokumen
                            </Link>
                        }
                    />
                </section>
            )}

            {/* ===== 05 · Riwayat perjalanan ===== */}
            {tab === 'perjalanan' && (
                <section
                    className="bt-anim"
                    style={{ animation: `bt-rise 0.45s ${EASE} 150ms both` }}
                >
                    <RegisterTable
                        meta={`${formatNumber(voyages.length)} perjalanan`}
                        legend={[
                            { tone: 'warn', label: 'terlambat' },
                            { tone: 'primary', label: 'dibatalkan' },
                        ]}
                        rail={(row) =>
                            row.voyage_status === 'delayed'
                                ? 'before:bg-warn'
                                : row.voyage_status === 'cancelled'
                                  ? 'before:bg-primary'
                                  : ''
                        }
                        columns={[
                            {
                                key: 'voyage_code',
                                label: 'Kode',
                                render: (row) => (
                                    <span className="font-mono text-[13px] font-semibold text-ink">
                                        {row.voyage_code}
                                    </span>
                                ),
                            },
                            {
                                key: 'origin',
                                label: 'Rute',
                                render: (row) => (
                                    <span className="text-[13px] text-ink">
                                        {row.origin}{' '}
                                        <span className="text-muted" aria-hidden="true">
                                            →
                                        </span>{' '}
                                        {row.destination}
                                    </span>
                                ),
                            },
                            {
                                key: 'planned_departure',
                                label: 'Jadwal Berangkat',
                                render: (row) => (
                                    <span className="font-mono text-[13px] text-ink">
                                        {formatDateTime(row.planned_departure)}
                                    </span>
                                ),
                            },
                            {
                                key: 'voyage_status',
                                label: 'Status',
                                render: (row) => (
                                    <Badge
                                        tone={
                                            row.voyage_status === 'completed'
                                                ? 'success'
                                                : row.voyage_status === 'cancelled' ||
                                                    row.voyage_status === 'delayed'
                                                  ? 'danger'
                                                  : 'info'
                                        }
                                    >
                                        {VOYAGE_STATUS_LABELS[row.voyage_status] ??
                                            row.voyage_status}
                                    </Badge>
                                ),
                            },
                        ]}
                        rows={voyages}
                        rowKey="id"
                        minW="min-w-[40rem]"
                        emptyIcon={Anchor}
                        emptyTitle="Belum ada riwayat perjalanan"
                        emptyDescription="Perjalanan kapal ini akan tampil setelah dibuat di Voyage Management."
                    />
                </section>
            )}

            {/* ===== 06 · Awak kapal ===== */}
            {tab === 'awak' && (
                <section
                    className="bt-anim"
                    style={{ animation: `bt-rise 0.45s ${EASE} 150ms both` }}
                >
                    <RegisterTable
                        meta={`${formatNumber(crews.length)} penempatan`}
                        columns={[
                            {
                                key: 'name',
                                label: 'Nama',
                                render: (row) => (
                                    <span className="text-sm font-semibold text-ink">
                                        {row.name}
                                    </span>
                                ),
                            },
                            {
                                key: 'rank',
                                label: 'Jabatan Pelayaran',
                                render: (row) => (
                                    <span className="text-[13px] capitalize text-ink">
                                        {row.rank?.replace('_', ' ')}
                                    </span>
                                ),
                            },
                            {
                                key: 'role',
                                label: 'Penempatan',
                                render: (row) => (
                                    <span className="text-[13px] text-ink">{row.role}</span>
                                ),
                            },
                            {
                                key: 'start_date',
                                label: 'Mulai',
                                render: (row) => (
                                    <span className="font-mono text-[13px] text-ink">
                                        {formatDate(row.start_date)}
                                    </span>
                                ),
                            },
                            {
                                key: 'end_date',
                                label: 'Selesai',
                                render: (row) => (
                                    <span className="font-mono text-[13px] text-ink">
                                        {formatDate(row.end_date)}
                                    </span>
                                ),
                            },
                            {
                                key: 'status',
                                label: 'Status',
                                render: (row) => (
                                    <Badge tone={row.status === 'aktif' ? 'success' : 'neutral'}>
                                        {row.status}
                                    </Badge>
                                ),
                            },
                        ]}
                        rows={crews}
                        rowKey="id"
                        minW="min-w-[48rem]"
                        emptyIcon={UserRound}
                        emptyTitle="Belum ada awak ditempatkan"
                        emptyDescription="Penempatan ABK dikelola di menu SDM & Karyawan."
                    />
                </section>
            )}

            {/* ===== 07 · Pemeliharaan ===== */}
            {tab === 'pemeliharaan' && (
                <section
                    className="bt-anim"
                    style={{ animation: `bt-rise 0.45s ${EASE} 150ms both` }}
                >
                    <RegisterTable
                        meta={`${formatNumber(services.length)} catatan servis`}
                        columns={[
                            {
                                key: 'title',
                                label: 'Servis',
                                render: (row) => (
                                    <span className="text-sm font-semibold text-ink">
                                        {row.title}
                                    </span>
                                ),
                            },
                            {
                                key: 'type',
                                label: 'Jenis',
                                render: (row) => (
                                    <Badge tone={row.type === 'drydock' ? 'info' : 'neutral'}>
                                        {row.type}
                                    </Badge>
                                ),
                            },
                            {
                                key: 'workshop',
                                label: 'Bengkel',
                                render: (row) => (
                                    <span className="text-[13px] text-ink">
                                        {row.workshop ?? '-'}
                                    </span>
                                ),
                            },
                            {
                                key: 'start_date',
                                label: 'Mulai',
                                render: (row) => (
                                    <span className="font-mono text-[13px] text-ink">
                                        {formatDate(row.start_date)}
                                    </span>
                                ),
                            },
                            {
                                key: 'end_date',
                                label: 'Selesai',
                                render: (row) => (
                                    <span className="font-mono text-[13px] text-ink">
                                        {formatDate(row.end_date)}
                                    </span>
                                ),
                            },
                            {
                                key: 'cost',
                                label: 'Biaya',
                                align: 'right',
                                render: (row) => (
                                    <span className="font-mono text-[13px] font-semibold tabular-nums text-ink">
                                        {formatRupiah(row.cost)}
                                    </span>
                                ),
                            },
                            {
                                key: 'status',
                                label: 'Status',
                                render: (row) => (
                                    <Badge
                                        tone={
                                            row.status === 'selesai'
                                                ? 'success'
                                                : row.status === 'proses'
                                                  ? 'warning'
                                                  : 'neutral'
                                        }
                                    >
                                        {row.status}
                                    </Badge>
                                ),
                            },
                        ]}
                        rows={services}
                        rowKey="id"
                        minW="min-w-[56rem]"
                        emptyIcon={Wrench}
                        emptyTitle="Belum ada catatan servis"
                        emptyDescription="Pemeliharaan dan pemeriksaan dicatat di menu Operations."
                    />
                </section>
            )}

            {/* ===== 08 · Kondisi & BBM =====
                Ringkasan skor terakhir dengan tren sparkline, lalu
                monitoring BBM dengan pembanding baseline. Daftar diasumsikan
                terbaru dulu, dibalik agar tren dibaca kiri ke kanan. */}
            {tab === 'kondisi' && (
                <div
                    className="bt-anim grid grid-cols-1 gap-5 xl:grid-cols-2"
                    style={{ animation: `bt-rise 0.45s ${EASE} 150ms both` }}
                >
                    <Panel
                        title="Riwayat Kondisi Kapal"
                        description="Skor ceklis pemeriksaan, skala 0 sampai 100."
                    >
                        {conditions.length === 0 ? (
                            <EmptyBlock
                                icon={Activity}
                                title="Belum ada pemeriksaan kondisi"
                                description="Ceklis kondisi dicatat dari menu Operations."
                            />
                        ) : (
                            <>
                                <div className="mb-4 flex items-center justify-between gap-4 rounded-xl bg-appbg/70 px-4 py-3.5">
                                    <div>
                                        <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-muted">
                                            Skor Terakhir
                                        </p>
                                        <p
                                            className={classNames(
                                                'mt-1 font-mono text-2xl font-semibold tabular-nums',
                                                scoreText(Number(conditions[0].score)),
                                            )}
                                        >
                                            {formatNumber(conditions[0].score)}
                                            <span className="text-sm font-medium text-muted">
                                                {' '}
                                                /100
                                            </span>
                                        </p>
                                    </div>
                                    {conditions.length > 1 && (
                                        <div className="text-right">
                                            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-muted">
                                                Tren
                                            </p>
                                            <Sparkline
                                                values={[...conditions]
                                                    .reverse()
                                                    .map((c) => Number(c.score))}
                                                className={classNames(
                                                    'mt-2 h-8 w-36',
                                                    scoreText(Number(conditions[0].score)),
                                                )}
                                            />
                                        </div>
                                    )}
                                </div>
                                <ul className="space-y-2.5">
                                    {conditions.map((c) => (
                                        <li
                                            key={c.id}
                                            className="rounded-xl border border-hairline px-4 py-3"
                                        >
                                            <div className="flex items-center justify-between gap-3">
                                                <span className="font-mono text-[11px] text-muted">
                                                    {formatDateTime(c.checked_at)}
                                                </span>
                                                <span
                                                    className={classNames(
                                                        'rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold tabular-nums',
                                                        scoreChip(Number(c.score)),
                                                    )}
                                                >
                                                    Skor {formatNumber(c.score)}
                                                </span>
                                            </div>
                                            {c.notes && (
                                                <p className="mt-1.5 text-sm text-ink">{c.notes}</p>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </>
                        )}
                    </Panel>

                    <Panel
                        title="Monitoring BBM"
                        description="Konsumsi aktual perjalanan dibandingkan baseline kapal."
                    >
                        {fuelLogs.length === 0 ? (
                            <EmptyBlock
                                icon={Fuel}
                                title="Belum ada trip BBM"
                                description="Log trip BBM dicatat dari menu Operations."
                            />
                        ) : (
                            <>
                                <div className="mb-4 grid grid-cols-2 gap-3">
                                    <div className="rounded-xl bg-appbg/70 px-4 py-3.5">
                                        <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-muted">
                                            Rata-rata Konsumsi
                                        </p>
                                        <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-ink">
                                            {formatNumber(avgLph, 1)}
                                            <span className="text-sm font-medium text-muted">
                                                {' '}
                                                L/jam
                                            </span>
                                        </p>
                                        <p className="mt-1 text-[11px] text-muted">
                                            {formatNumber(totalLiters, 2)} L dalam{' '}
                                            {formatNumber(totalHours, 1)} jam
                                        </p>
                                    </div>
                                    <div className="rounded-xl bg-appbg/70 px-4 py-3.5">
                                        <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-muted">
                                            Baseline Kapal
                                        </p>
                                        <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-ink">
                                            {baseline != null ? (
                                                <>
                                                    {formatNumber(baseline, 1)}
                                                    <span className="text-sm font-medium text-muted">
                                                        {' '}
                                                        L/jam
                                                    </span>
                                                </>
                                            ) : (
                                                '-'
                                            )}
                                        </p>
                                        <p
                                            className={classNames(
                                                'mt-1 text-[11px] font-medium',
                                                baselineDiff != null && Math.abs(baselineDiff) > 10
                                                    ? 'text-primary'
                                                    : 'text-muted',
                                            )}
                                        >
                                            {baselineDiff != null
                                                ? `${baselineDiff > 0 ? '+' : ''}${formatNumber(baselineDiff, 1)}% dari baseline`
                                                : 'baseline belum diatur'}
                                        </p>
                                    </div>
                                </div>
                                <ul className="space-y-2.5">
                                    {fuelLogs.map((f) => {
                                        const lph =
                                            f.duration_hours > 0
                                                ? f.liters / f.duration_hours
                                                : 0;
                                        return (
                                            <li
                                                key={f.id}
                                                className="rounded-xl border border-hairline px-4 py-3"
                                            >
                                                <div className="flex items-center justify-between gap-3">
                                                    <p className="min-w-0 truncate text-sm font-semibold text-ink">
                                                        {f.route}
                                                    </p>
                                                    <Badge
                                                        tone={FUEL_TONES[f.analysis_status] ?? 'neutral'}
                                                    >
                                                        {FUEL_LABELS[f.analysis_status] ??
                                                            f.analysis_status}
                                                        {` (${f.analysis_diff_pct > 0 ? '+' : ''}${formatNumber(f.analysis_diff_pct, 1)}%)`}
                                                    </Badge>
                                                </div>
                                                <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                                                    <span>{formatDate(f.trip_date)}</span>
                                                    <span aria-hidden="true">·</span>
                                                    <span className="font-mono">
                                                        {formatNumber(f.duration_hours, 1)} jam
                                                    </span>
                                                    <span aria-hidden="true">·</span>
                                                    <span className="font-mono">
                                                        {formatNumber(f.liters, 2)} L
                                                    </span>
                                                    <span aria-hidden="true">·</span>
                                                    <span className="font-mono font-semibold text-ink">
                                                        {formatNumber(lph, 1)} L/jam
                                                    </span>
                                                </p>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </>
                        )}
                    </Panel>
                </div>
            )}

            {/* ===== 09 · Riwayat aktivitas ===== */}
            {tab === 'aktivitas' && (
                <section
                    className="bt-anim"
                    style={{ animation: `bt-rise 0.45s ${EASE} 150ms both` }}
                >
                    <RegisterTable
                        meta={`${formatNumber(auditLogs.length)} aktivitas`}
                        columns={[
                            {
                                key: 'timestamp',
                                label: 'Waktu',
                                render: (row) => (
                                    <span className="font-mono text-[13px] text-ink">
                                        {formatDateTime(row.timestamp)}
                                    </span>
                                ),
                            },
                            {
                                key: 'user_name',
                                label: 'Pengguna',
                                render: (row) => (
                                    <span className="text-[13px] font-medium text-ink">
                                        {row.user_name ?? 'Sistem'}
                                    </span>
                                ),
                            },
                            {
                                key: 'action',
                                label: 'Aksi',
                                render: (row) => <Badge tone="info">{row.action}</Badge>,
                            },
                            {
                                key: 'change_summary',
                                label: 'Ringkasan',
                                render: (row) => (
                                    <span className="text-[13px] text-muted">
                                        {row.change_summary ?? '-'}
                                    </span>
                                ),
                            },
                        ]}
                        rows={auditLogs}
                        rowKey="id"
                        minW="min-w-[44rem]"
                        emptyIcon={History}
                        emptyTitle="Belum ada aktivitas"
                    />
                </section>
            )}

            {/* Modal arsipkan kapal dinonaktifkan sementara.
            <ConfirmModal
                show={confirmArchive}
                title="Arsipkan kapal ini?"
                message={`Kapal "${vessel.vessel_name}" akan disembunyikan dari daftar armada (soft delete). Data tetap tersimpan dan dapat dipulihkan lewat database. Diblokir bila masih ada perjalanan aktif.`}
                confirmLabel="Arsipkan"
                tone="warning"
                processing={busy}
                onClose={() => setConfirmArchive(false)}
                onConfirm={() => {
                    setBusy(true);
                    router.post(`/armada/${vessel.id}/archive`, {}, {
                        onFinish: () => {
                            setBusy(false);
                            setConfirmArchive(false);
                        },
                    });
                }}
            />
            */}
        </AuthenticatedLayout>
    );
}