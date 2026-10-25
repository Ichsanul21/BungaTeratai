import Badge, { type BadgeTone } from '@/Components/ui/Badge';
import Card from '@/Components/ui/Card';
import StatCard from '@/Components/ui/StatCard';
import { VOYAGE_STATUS_LABELS } from '@/Constants/navigation';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { classNames, daysUntil, formatDateTime, formatNumber, formatRupiah } from '@/lib/format';
import { type PageProps } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    Anchor,
    BellRing,
    CalendarClock,
    ChevronDown,
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

// Palet visualisasi data. recharts meminta warna sebagai string literal,
// jadi nilai di bawah dipetakan PERSIS dari token tailwind.config.js
// (primary #C1121F, gold #D4A96A, hairline #E7E1D9, muted #8A8580, dst.)
// agar grafik dan UI tetap satu sumber kebenaran warna.
const VIZ = {
    pendapatan: '#C1121F', // token primary
    biaya: '#D4A96A',      // token gold
    grid: '#E7E1D9',       // token hairline
    axis: '#8A8580',       // token muted
};

const PIE_COLORS: Record<string, string> = {
    verified: '#2F8F68',          // token ok
    under_review: '#1E4668',      // token maritime
    uploaded: '#168C8C',          // token oceanteal
    revision_required: '#D99A2B', // token warn
    rejected: '#C94C4C',          // token danger
    draft: '#8A8580',             // token muted
    missing: '#C1121F',           // token primary
    archived: '#C9C0B2',          // token stone (baru di tailwind.config.js)
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

// Tekstur grain halus untuk panel hero, senada dengan login & sidebar.
const GRAIN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E")`;

const EASE = 'cubic-bezier(0.22,1,0.36,1)';

// Nominal rupiah ringkas untuk kartu keuangan yang sempit (grid 5 kolom
// di xl): nilai besar dipadatkan bertingkat supaya angka StatCard selalu
// muat satu baris. Contoh: 1.050.000.000 -> "Rp 1,05 M",
// 185.750.000 -> "Rp 185,8 jt". Angka persisnya tetap utuh di tooltip
// grafik dan modul keuangan.
function ringkasRupiah(v: number | null | undefined): string {
    const n = Number(v ?? 0);
    const a = Math.abs(n);
    const tanda = n < 0 ? '-' : '';
    // Di atas 999 juta naik satuan miliar (dibulatkan 2 desimal).
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

// Label sumbu Y grafik pendapatan: varian ringkas tanpa "Rp " dan tanpa
// spasi satuan ("1,05M", "850jt", "950rb") supaya pendek dan tidak lagi
// terpotong di sisi kiri diagram. Aturan satuan sama dengan di atas.
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

// Query filter "bersih": parameter hanya ditulis ke URL bila
// menyimpang dari bawaan (type kosong = semua jenis kapal,
// months "12" = rentang default 1 tahun dari controller).
// Kunjungan pertama tetap "/dashboard" tanpa query dan datanya
// sudah 12 bulan penuh; URL mulai memuat filter hanya ketika
// pengguna memilih nilai yang bukan default, dan kembali bersih
// saat semua filter dikembalikan ke bawaan (parameter kosong
// seperti "type=" tidak akan pernah tercetak).
function bangunQueryFilter(m: string, t: string): Record<string, string> {
    const q: Record<string, string> = {};
    if (t !== '') q.type = t;
    if (m !== '12') q.months = m;
    return q;
}

// Tooltip grafik pendapatan: kartu putih kecil dengan nilai rupiah.
function RevenueTip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-xl border border-hairline bg-white px-3.5 py-2.5 shadow-[0_16px_40px_-18px_rgba(28,27,26,0.35)]">
            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted">
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
                        <span className="text-muted">{p.name}</span>
                        <span className="ms-auto pl-4 font-mono font-semibold tabular-nums text-ink">
                            {formatRupiah(p.value)}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// Kepala seksi bernomor: penanda editorial antar blok dashboard,
// senada dengan label mono di sidebar.
function SectionHeader({ no, title, desc }: { no: string; title: string; desc?: string }) {
    return (
        <div className="mb-3 flex items-end gap-3">
            <span
                aria-hidden="true"
                className="font-mono text-[11px] font-semibold leading-5 text-gold"
            >
                {no}
            </span>
            <div className="min-w-0">
                <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-ink">
                    {title}
                </h2>
                {desc && <p className="mt-0.5 truncate text-xs text-muted">{desc}</p>}
            </div>
            <div
                aria-hidden="true"
                className="mb-1.5 h-px min-w-[1rem] flex-1 bg-gradient-to-r from-hairline via-hairline/60 to-transparent"
            />
        </div>
    );
}

function EmptyState({ text }: { text: string }) {
    return (
        <div className="flex min-h-[6rem] items-center justify-center rounded-xl border border-dashed border-hairline bg-appbg/50 px-4 py-6 text-center text-xs text-muted">
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
    filters,
    vesselTypes,
}: PageProps<{
    kpis: Record<string, number>;
    revenueSeries: Array<{ bulan: string; pendapatan: number; biaya: number }>;
    docsByStatus: Record<string, number>;
    reminders: Array<Record<string, any>>;
    recentVoyages: Array<Record<string, any>>;
    recentActivity: Array<Record<string, any>>;
    filters: { months: number; type: string };
    vesselTypes: string[];
}>) {
    const { auth } = usePage<PageProps>().props;
    const firstName = (auth.user?.name ?? '').trim().split(/\s+/)[0] ?? '';

    // ===== Filter header: nilai select diderivasi langsung dari props
    // `filters` (sumber kebenaran dari server), bukan disalin ke state
    // lokal, sehingga tampilan select SELALU sama dengan data yang
    // sedang disajikan. Default ditetapkan di controller: months 12
    // (1 tahun) dan type kosong (semua jenis kapal), jadi kunjungan
    // pertama mendarat di "/dashboard" bersih tanpa query =====
    const months = String(filters.months ?? 12);
    const type = filters.type ?? '';

    // ===== Metrik turunan: dihitung murni dari props yang sama di klien,
    // tanpa menyentuh backend. =====
    const totalPendapatan = revenueSeries.reduce((s, r) => s + (r.pendapatan ?? 0), 0);
    const totalBiaya = revenueSeries.reduce((s, r) => s + (r.biaya ?? 0), 0);
    const laba = totalPendapatan - totalBiaya;
    const marginPct = totalPendapatan > 0 ? Math.round((laba / totalPendapatan) * 100) : 0;

    const armadaTotal = kpis.armada_total ?? 0;
    const readinessPct =
        armadaTotal > 0 ? Math.round(((kpis.armada_siap ?? 0) / armadaTotal) * 100) : 0;

    // Warna ditanam sekali di sini: irisan donat dan titik legenda membaca
    // field `warna` yang sama sehingga mustahil warna label meleset dari
    // warna irisannya.
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

    // Tooltip donat butuh totalDocs untuk persentase.
    function DocsTip({ active, payload }: any) {
        if (!active || !payload?.length) return null;
        const p = payload[0];
        const pct = totalDocs > 0 ? Math.round((p.value / totalDocs) * 100) : 0;
        return (
            <div className="rounded-xl border border-hairline bg-white px-3.5 py-2 shadow-[0_16px_40px_-18px_rgba(28,27,26,0.35)]">
                <p className="text-xs font-medium text-ink">{p.name}</p>
                <p className="mt-0.5 font-mono text-[11px] text-muted">
                    {formatNumber(p.value)} dokumen · {pct}%
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

            {/* ===== 00 · Pita ringkasan eksekutif =====
                Panel gelap burgundy-merah yang membawa identitas halaman
                login & sidebar ke dalam dashboard: aurora, grain, rim emas,
                sapaan personal, filter periode, dan empat metrik turunan. */}
            <section
                className="bt-anim relative mb-7 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-sidebar via-primary-hover to-primary shadow-[0_24px_60px_-24px_rgba(69,16,22,0.55)]"
                style={{ animation: `bt-rise 0.55s ${EASE} both` }}
            >
                {/* Kedalaman panel: cahaya merah kiri-atas, cahaya emas
                    kanan-bawah, grain kertas, dan monogram BT samar. */}
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
                    <span className="pointer-events-none absolute -right-6 -top-10 hidden select-none font-mono text-[11rem] font-semibold leading-none text-white/[0.05] xl:block">
                        BT
                    </span>
                </div>
                {/* Rim emas tipis di tepi atas, tanda tangan halaman login. */}
                <div
                    aria-hidden="true"
                    className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent"
                />

                <div className="relative flex flex-col gap-6 p-6 lg:p-7 xl:flex-row xl:items-end xl:justify-between">
                    <div className="min-w-0 max-w-2xl">
                        <p className="flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-cream/60">
                            <span
                                aria-hidden="true"
                                className="bt-anim h-2 w-2 rounded-full bg-gold"
                                style={{ animation: 'bt-pulse-dot 2.4s ease-in-out infinite' }}
                            />
                            Ringkasan Eksekutif
                        </p>
                        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-cream sm:text-3xl">
                            {firstName ? (
                                <>
                                    Selamat datang kembali,{' '}
                                    <span className="text-gold">{firstName}</span>.
                                </>
                            ) : (
                                'Pusat Kendali Operasi.'
                            )}
                        </h1>
                        <p className="mt-2 max-w-xl text-sm leading-relaxed text-cream/70">
                            Indikator kesiapan bersifat internal, bukan
                            persetujuan otoritas pelayaran.
                        </p>
                    </div>

                    {/* Filter periode & jenis kapal: kontrol kaca di atas
                        panel gelap. Nilai keduanya mengikuti props `filters`
                        sehingga select selalu sinkron dengan data yang
                        sedang disajikan. */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end xl:shrink-0">
                        <label className="block">
                            <span className="mb-1 block font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-cream/50">
                                Jenis kapal
                            </span>
                            <span className="relative block">
                                <select
                                    value={type}
                                    onChange={(e) =>
                                        router.get(
                                            '/dashboard',
                                            bangunQueryFilter(months, e.target.value),
                                            { preserveState: true, replace: true },
                                        )
                                    }
                                    className="h-9 w-full cursor-pointer appearance-none rounded-lg border border-white/20 bg-white/10 pe-8 ps-3 text-sm text-cream backdrop-blur-sm transition-colors duration-200 hover:border-white/35 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30 sm:w-44"
                                >
                                    <option value="" className="text-ink">
                                        Semua Jenis Kapal
                                    </option>
                                    {vesselTypes.map((t) => (
                                        <option key={t} value={t} className="text-ink">
                                            {t.replace('_', ' ')}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown
                                    size={14}
                                    className="pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2 text-cream/60"
                                />
                            </span>
                        </label>
                        <label className="block">
                            <span className="mb-1 block font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-cream/50">
                                Rentang data
                            </span>
                            <span className="relative block">
                                <select
                                    value={months}
                                    onChange={(e) =>
                                        router.get(
                                            '/dashboard',
                                            bangunQueryFilter(e.target.value, type),
                                            { preserveState: true, replace: true },
                                        )
                                    }
                                    className="h-9 w-full cursor-pointer appearance-none rounded-lg border border-white/20 bg-white/10 pe-8 ps-3 text-sm text-cream backdrop-blur-sm transition-colors duration-200 hover:border-white/35 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30 sm:w-32"
                                >
                                    {[3, 6, 12].map((m) => (
                                        <option key={m} value={m} className="text-ink">
                                            {m} bulan
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown
                                    size={14}
                                    className="pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2 text-cream/60"
                                />
                            </span>
                        </label>
                    </div>
                </div>

                {/* Empat metrik eksekutif turunan: rasio & agregasi yang
                    tidak tersedia di StatCard bawah. */}
                <div className="relative grid grid-cols-2 gap-3 border-t border-white/[0.08] p-6 pt-5 sm:gap-4 lg:grid-cols-4 lg:p-7 lg:pt-6">
                    <div className="min-w-0 rounded-xl border border-white/[0.12] bg-white/[0.07] p-4 backdrop-blur-sm">
                        <p className="truncate font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-cream/60">
                            Kesiapan Armada
                        </p>
                        <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-cream">
                            {readinessPct}%
                        </p>
                        <div
                            aria-hidden="true"
                            className="mt-2.5 h-1 overflow-hidden rounded-full bg-white/15"
                        >
                            <div
                                className="h-full rounded-full bg-gold"
                                style={{
                                    width: `${Math.min(Math.max(readinessPct, 0), 100)}%`,
                                }}
                            />
                        </div>
                        <p className="mt-2 truncate text-[11px] text-cream/60">
                            siap administratif dari {formatNumber(armadaTotal)} kapal
                        </p>
                    </div>
                    <div className="min-w-0 rounded-xl border border-white/[0.12] bg-white/[0.07] p-4 backdrop-blur-sm">
                        <p className="truncate font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-cream/60">
                            Margin Operasional
                        </p>
                        <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-cream">
                            {marginPct}%
                        </p>
                        <p className="mt-2 truncate text-[11px] text-cream/60">
                            laba {ringkasRupiah(laba)}
                        </p>
                    </div>
                    <div className="min-w-0 rounded-xl border border-white/[0.12] bg-white/[0.07] p-4 backdrop-blur-sm">
                        <p className="truncate font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-cream/60">
                            Dokumen Perlu Perhatian
                        </p>
                        <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-cream">
                            {formatNumber(docsAttention)}
                        </p>
                        <p className="mt-2 truncate text-[11px] text-cream/60">
                            revisi · ditolak · hilang
                        </p>
                    </div>
                    <div className="min-w-0 rounded-xl border border-white/[0.12] bg-white/[0.07] p-4 backdrop-blur-sm">
                        <p className="truncate font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-cream/60">
                            Pengingat Mendesak
                        </p>
                        <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-cream">
                            {formatNumber(urgentReminders)}
                        </p>
                        <p className="mt-2 truncate text-[11px] text-cream/60">
                            jatuh tempo ≤ 7 hari / kedaluwarsa
                        </p>
                    </div>
                </div>
            </section>

            {/* ===== 01 · Armada ===== */}
            <section
                className="bt-anim mb-6"
                style={{ animation: `bt-rise 0.45s ${EASE} 70ms both` }}
            >
                <SectionHeader
                    no="01"
                    title="Armada"
                    desc="Kesiapan administratif seluruh armada terdaftar"
                />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard label="Total Armada" value={kpis.armada_total} icon={Ship} />
                    <StatCard label="Siap Administratif" value={kpis.armada_siap} icon={Anchor} tone="success" sub="kelengkapan ≥ 90%" />
                    <StatCard label="Perlu Tindak Lanjut" value={kpis.armada_tindak_lanjut} icon={FileWarning} tone="warning" sub="kelengkapan < 90%" />
                    <StatCard label="Sedang Ditinjau" value={kpis.armada_ditinjau} icon={BellRing} tone="info" sub="dokumen under review" />
                </div>
            </section>

            {/* ===== 02 · Perjalanan & Dokumen ===== */}
            <section
                className="bt-anim mb-6"
                style={{ animation: `bt-rise 0.45s ${EASE} 120ms both` }}
            >
                <SectionHeader
                    no="02"
                    title="Perjalanan & Dokumen"
                    desc="Status operasi berjalan dan umur dokumen"
                />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard label="Perjalanan Aktif" value={kpis.voyage_aktif} icon={Anchor} tone="info" onClick={() => router.get('/perjalanan?group=aktif')} />
                    <StatCard label="Menunggu Pemeriksaan" value={kpis.voyage_pending} icon={BellRing} tone="warning" onClick={() => router.get('/perjalanan?group=pending_review')} />
                    <StatCard label="Dokumen ≤30 Hari" value={kpis.docs_expiring} icon={CalendarClock} tone="warning" onClick={() => router.get('/dokumen?validity=expiring_soon')} />
                    <StatCard label="Dokumen Kedaluwarsa" value={kpis.docs_expired} icon={AlertTriangle} tone="danger" onClick={() => router.get('/dokumen?validity=expired')} />
                </div>
            </section>

            {/* ===== 03 · Keuangan & Operasional ===== */}
            <section
                className="bt-anim mb-6"
                style={{ animation: `bt-rise 0.45s ${EASE} 170ms both` }}
            >
                <SectionHeader
                    no="03"
                    title="Keuangan & Operasional"
                    desc="Posisi kas & bank, rincian likuiditas, piutang, hutang, dan operasional"
                />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                    {kpis.can_view_balances ? (
                        <>
                            <StatCard
                                label="Total Saldo Perusahaan"
                                value={ringkasRupiah(kpis.kas_total)}
                                icon={Landmark}
                                tone="success"
                                sub={`Kas ${ringkasRupiah(kpis.kas_tunai)} · Bank ${ringkasRupiah(kpis.bank_total)}`}
                                onClick={() => router.get('/keuangan?tab=kas')}
                            />
                            <StatCard
                                label="Kas Tunai"
                                value={ringkasRupiah(kpis.kas_tunai)}
                                icon={Wallet}
                                tone="success"
                                sub="Likuiditas tunai operasional"
                                onClick={() => router.get('/keuangan?tab=kas')}
                            />
                            <StatCard
                                label="Saldo Bank"
                                value={ringkasRupiah(kpis.bank_total)}
                                icon={Landmark}
                                tone="info"
                                sub="Rekening operasional bank"
                                onClick={() => router.get('/keuangan?tab=kas')}
                            />
                        </>
                    ) : (
                        <StatCard
                            label="Saldo Perusahaan"
                            value="Akses Terbatas"
                            icon={Landmark}
                            tone="neutral"
                            sub="Hanya Superadmin & Direksi"
                        />
                    )}
                    <StatCard label="Piutang Outstanding" value={ringkasRupiah(kpis.piutang)} icon={Wallet} tone="warning" onClick={() => router.get('/keuangan?tab=piutang')} />
                    <StatCard label="Hutang Outstanding" value={ringkasRupiah(kpis.hutang)} icon={Receipt} tone="danger" onClick={() => router.get('/keuangan?tab=hutang')} />
                    <StatCard label="Anomali BBM" value={kpis.anomali_bbm} icon={Fuel} tone="danger" sub="trip tidak normal" onClick={() => router.get('/operasional?tab=bbm')} />
                    <StatCard label="Perjalanan Selesai" value={kpis.voyage_selesai} icon={TrendingUp} tone="success" />
                </div>
            </section>

            {/* ===== 04 · Analitik ===== */}
            <section
                className="bt-anim mb-6"
                style={{ animation: `bt-rise 0.45s ${EASE} 220ms both` }}
            >
                <SectionHeader
                    no="04"
                    title="Analitik"
                    desc="Pendapatan vs biaya dan sebaran status dokumen"
                />
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
                    {/* Grafik pendapatan: area bergradien merah (pendapatan)
                        dan emas (biaya), tooltip & legenda kustom. */}
                    <Card
                        title="Pendapatan vs Biaya"
                        description={`Total ${months} bulan terakhir · laba ${formatRupiah(laba)}`}
                        className="xl:col-span-2"
                        actions={
                            <div className="flex items-center gap-3">
                                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted">
                                    <span
                                        aria-hidden="true"
                                        className="h-1.5 w-1.5 rounded-full"
                                        style={{ background: VIZ.pendapatan }}
                                    />
                                    Pendapatan
                                </span>
                                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted">
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

                    {/* Donat status dokumen: total di pusat, legenda dengan
                        jumlah & persentase. */}
                    <Card
                        title="Status Dokumen"
                        description="Sebaran verifikasi seluruh dokumen"
                        actions={
                            <span className="font-mono text-[11px] font-medium text-muted">
                                {formatNumber(totalDocs)} total
                            </span>
                        }
                    >
                        <div className="relative h-48">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    {/* Tanpa bingkai putih: stroke 2px di tepi
                                        tiap irisan sebelumnya menelan irisan
                                        tipis sehingga warnanya tampak
                                        terpotong atau hilang sama sekali. */}
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
                                <p className="text-2xl font-semibold tabular-nums tracking-tight text-ink">
                                    {formatNumber(totalDocs)}
                                </p>
                                <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
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
                                        <span className="min-w-0 truncate text-xs text-ink/80">
                                            {p.name}
                                        </span>
                                        <span className="ms-auto shrink-0 font-mono text-[11px] font-medium text-muted">
                                            {formatNumber(p.value)} · {pct}%
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>
                </div>
            </section>

            {/* ===== 05 · Pemantauan =====
                Ketiga kartu membatasi isinya pada max-h-[16rem] (± 4 baris)
                dengan scroll internal, sehingga kartu di sebelahnya tidak
                pernah ikut memanjang walau datanya panjang. */}
            <section
                className="bt-anim"
                style={{ animation: `bt-rise 0.45s ${EASE} 270ms both` }}
            >
                <SectionHeader
                    no="05"
                    title="Pemantauan"
                    desc="Pengingat, perjalanan, dan jejak aktivitas terbaru"
                />
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
                    {/* Reminder */}
                    <Card
                        title="Reminder Dokumen Teratas"
                        actions={
                            <Link
                                href="/notifikasi"
                                className="text-xs font-medium text-primary transition-colors duration-150 hover:underline"
                            >
                                Semua →
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
                                                className="flex items-start gap-3 rounded-xl border border-hairline p-3 transition-colors duration-200 hover:border-primary/30"
                                            >
                                                <span
                                                    className={classNames(
                                                        'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset',
                                                        expired
                                                            ? 'bg-primary/10 text-primary ring-primary/20'
                                                            : urgent
                                                              ? 'bg-warn/10 text-warn ring-warn/20'
                                                              : 'bg-appbg text-muted ring-hairline',
                                                    )}
                                                >
                                                    {expired ? (
                                                        <AlertTriangle size={15} />
                                                    ) : (
                                                        <CalendarClock size={15} />
                                                    )}
                                                </span>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-medium leading-snug text-ink">
                                                        {r.message}
                                                    </p>
                                                    <p className="mt-1 truncate font-mono text-[11px] text-muted">
                                                        berlaku s.d. {formatDateTime(r.expiry)}
                                                    </p>
                                                </div>
                                                <span
                                                    className={classNames(
                                                        'inline-flex shrink-0 items-center rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold ring-1 ring-inset',
                                                        expired
                                                            ? 'bg-primary/10 text-primary ring-primary/25'
                                                            : urgent
                                                              ? 'bg-warn/10 text-warn ring-warn/25'
                                                              : 'bg-appbg text-muted ring-hairline',
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

                    {/* Voyage terbaru */}
                    <Card
                        title="Perjalanan Terbaru"
                        actions={
                            <Link
                                href="/perjalanan"
                                className="text-xs font-medium text-primary transition-colors duration-150 hover:underline"
                            >
                                Semua →
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
                                            className="flex items-center gap-3 rounded-xl border border-hairline p-3 transition-colors duration-200 hover:border-primary/30 hover:bg-appbg/40"
                                        >
                                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-maritime/10 text-maritime ring-1 ring-inset ring-maritime/20">
                                                <Ship size={16} />
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <Link
                                                    href={`/perjalanan/${v.id}`}
                                                    className="font-mono text-[13px] font-semibold text-ink transition-colors duration-150 hover:text-primary"
                                                >
                                                    {v.voyage_code}
                                                </Link>
                                                <p className="mt-0.5 truncate text-xs text-muted">
                                                    {v.vessel_name} · {v.route}
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

                    {/* Aktivitas: garis waktu vertikal dengan titik & garis
                        penghubung yang memudar ke bawah. */}
                    <Card
                        title="Aktivitas Terbaru"
                        actions={
                            <Link
                                href="/audit"
                                className="text-xs font-medium text-primary transition-colors duration-150 hover:underline"
                            >
                                Audit →
                            </Link>
                        }
                    >
                        {recentActivity.length === 0 ? (
                            <EmptyState text="Belum ada aktivitas tercatat." />
                        ) : (
                            <div className="bt-scroll max-h-[16rem] overflow-y-auto overscroll-contain pe-1">
                                <ul className="relative space-y-4 before:absolute before:bottom-1.5 before:left-[4px] before:top-1.5 before:w-px before:bg-gradient-to-b before:from-hairline/80 before:via-hairline/40 before:to-transparent">
                                    {recentActivity.map((a) => (
                                        <li key={a.id} className="relative ps-6">
                                            <span
                                                aria-hidden="true"
                                                className="absolute left-0 top-1 h-2.5 w-2.5 rounded-full bg-maritime ring-4 ring-maritime/10"
                                            />
                                            <div className="flex items-center justify-between gap-2">
                                                <Badge tone="info">{a.action}</Badge>
                                                <span className="font-mono text-[10px] text-muted">
                                                    {formatDateTime(a.timestamp)}
                                                </span>
                                            </div>
                                            <p className="mt-1.5 text-[13px] leading-snug text-ink">
                                                {a.change_summary}
                                            </p>
                                            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
                                                <span>{a.user_name} · {a.entity_type}</span>
                                                {a.assigned_to && (
                                                    <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 font-medium text-primary">
                                                        Penugasan: {a.assigned_to}
                                                        {a.assigner_name && <span className="text-muted font-normal">(oleh {a.assigner_name})</span>}
                                                    </span>
                                                )}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </Card>
                </div>
            </section>
        </AuthenticatedLayout>
    );
}