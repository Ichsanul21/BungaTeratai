import Badge, { type BadgeTone } from '@/Components/ui/Badge';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { classNames, formatNumber } from '@/lib/format';
import { type PageProps } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import {
    Anchor,
    ChevronRight,
    Plus,
    Power,
    RotateCcw,
    Search,
    SearchX,
    Ship,
    ShipWheel,
    Wrench,
} from 'lucide-react';
import { FormEvent, useState } from 'react';

interface VesselRow {
    id: number;
    vessel_name: string;
    vessel_type: string;
    vessel_type_custom?: string | null;
    navigation_type: string;
    registration_number?: string;
    year_built?: number;
    gt?: number;
    dwt?: number;
    capacity_value?: number;
    capacity_unit?: string;
    base_location?: string;
    operational_status: string;
    doc_completeness: number;
    missing_count: number;
    voyage_count: number;
    last_position_at?: string;
}

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

// Chip jenis kapal pada panel saringan: kode tetap dipakai sebagai nilai
// filter persis seperti semula, "Semua" mewakili tanpa filter.
const TYPE_CHIPS: Array<{ code: string; label: string }> = [
    { code: '', label: 'Semua' },
    ...Object.entries(TYPE_LABELS).map(([code, label]) => ({ code, label })),
];

// Tab status operasional: pil berikon menggantikan dropdown lama, kunci
// tetap sama dengan nilai filter asli sehingga URL bisa dibagikan.
const STATUS_TABS: Array<{ key: string; label: string; icon: any }> = [
    { key: '', label: 'Semua', icon: Ship },
    { key: 'aktif', label: 'Aktif', icon: Anchor },
    { key: 'dalam_perbaikan', label: 'Dalam Perbaikan', icon: Wrench },
    { key: 'dock', label: 'Dock', icon: ShipWheel },
    { key: 'mangkrak', label: 'Mangkrak', icon: Power },
];

// Tekstur grain halus untuk panel hero, senada dengan login, sidebar,
// dashboard, notifikasi, dan document center.
const GRAIN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E")`;

const EASE = 'cubic-bezier(0.22,1,0.36,1)';

// Kelas bersama untuk kepala dan sel meja register, mengikuti pola
// halaman dokumen agar kedua register terasa satu keluarga.
const TH_BASE =
    'px-4 py-3 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-muted';
const TD_CLS = 'px-4 py-3.5 align-middle';

function statusTone(status: string): BadgeTone {
    if (status === 'aktif') return 'success';
    if (status === 'dalam_perbaikan') return 'warning';
    return 'danger';
}

// Rel kiri hanya dipasang pada kapal yang tidak beroperasi agar meja
// tetap tenang namun masalah langsung terlihat saat memindai, persis
// pola rel dokumen bermasalah pada halaman dokumen.
function statusRail(status: string): string {
    if (status === 'dalam_perbaikan') return 'before:bg-warn';
    if (status === 'dock' || status === 'mangkrak') return 'before:bg-primary';
    return '';
}

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

function SpecsCell({ row }: { row: VesselRow }) {
    const utama = [
        row.gt != null ? `GT ${formatNumber(row.gt)}` : null,
        row.dwt != null ? `DWT ${formatNumber(row.dwt, 2)}` : null,
    ]
        .filter(Boolean)
        .join(' · ');
    const kapasitas =
        row.capacity_value != null
            ? `${formatNumber(row.capacity_value, 2)}${row.capacity_unit ? ` ${row.capacity_unit}` : ''}`
            : null;

    if (!utama && !kapasitas) {
        return <span className="text-xs text-muted">Belum dilengkapi</span>;
    }

    return (
        <div>
            {utama && <p className="font-mono text-[13px] text-ink">{utama}</p>}
            {kapasitas && <p className="mt-0.5 text-xs text-muted">Kapasitas {kapasitas}</p>}
        </div>
    );
}

// Bilah kelengkapan dokumen dengan garis penanda ambang 90%: kapal di
// bawah garis ini masuk hitungan "perlu tindak lanjut" di hero.
function CompletenessCell({ pct, missing }: { pct: number; missing: number }) {
    const width = Math.min(100, Math.max(0, pct));
    const tone =
        pct >= 90 ? 'bg-ok' : pct >= 70 ? 'bg-warn' : 'bg-primary';
    const text =
        pct >= 90 ? 'text-ok' : pct >= 70 ? 'text-warn' : 'text-primary';
    return (
        <div className="w-40 max-w-full">
            <div className="flex items-center gap-2.5">
                <div className="relative h-1.5 min-w-0 flex-1">
                    <div className="h-full overflow-hidden rounded-full bg-appbg ring-1 ring-inset ring-hairline">
                        <div
                            className={classNames('h-full rounded-full', tone)}
                            style={{ width: `${width}%` }}
                        />
                    </div>
                    <span
                        title="Ambang tindak lanjut dokumen: 90%"
                        aria-hidden="true"
                        className="absolute left-[90%] top-1/2 h-3.5 w-px -translate-y-1/2 bg-ink/25"
                    />
                </div>
                <span
                    className={classNames(
                        'shrink-0 font-mono text-[13px] font-semibold tabular-nums',
                        text,
                    )}
                >
                    {formatNumber(pct, 1)}%
                </span>
            </div>
            <p
                className={classNames(
                    'mt-1 text-xs',
                    missing > 0 ? 'text-muted' : 'text-ok',
                )}
            >
                {missing > 0 ? `${missing} dokumen kurang` : 'Lengkap'}
            </p>
        </div>
    );
}

// Ubin metrik kaca di panel hero, pola yang sama dengan ubin ringkasan
// pada halaman notifikasi dan document center.
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

export default function FleetIndex({
    vessels,
    filters,
    stats,
    canCreate,
}: PageProps<{
    vessels: VesselRow[];
    filters: Record<string, string | number | undefined>;
    stats: { total: number; aktif: number; perlu_tinjau: number };
    canCreate?: boolean;
}>) {
    const [search, setSearch] = useState((filters.search as string) ?? '');

    const activeStatus = (filters.status as string) ?? '';
    const activeType = (filters.type as string) ?? '';

    // Jumlah filter aktif untuk chip "N filter aktif + Reset", dihitung
    // dari nilai yang benar-benar dikenal server.
    const activeFilterCount = ['search', 'type', 'status'].filter(
        (k) => (filters[k] ?? '') !== '',
    ).length;

    const activePct = stats.total > 0 ? Math.round((stats.aktif / stats.total) * 100) : 0;
    const nonOperational = Math.max(0, stats.total - stats.aktif);
    const isFilteredEmpty = vessels.length === 0 && activeFilterCount > 0 && stats.total > 0;

    const setFilter = (key: 'type' | 'status', value: string) => {
        router.get(
            '/armada',
            { ...filters, [key]: value || undefined },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const apply = (e: FormEvent) => {
        e.preventDefault();
        router.get(
            '/armada',
            { ...filters, search: search || undefined },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const resetFilters = () => {
        setSearch('');
        router.get('/armada', {}, { preserveState: true, preserveScroll: true, replace: true });
    };

    // Jumlah pada tab hanya ditampilkan bila angkanya otoritatif dari
    // server (total dan aktif); status lain dibiarkan tanpa angka.
    const tabCount = (key: string): number | undefined =>
        key === '' ? stats.total : key === 'aktif' ? stats.aktif : undefined;

    // Judul dinamis: angka paling penting terbaca sebelum menelusuri
    // daftar, pola yang sama dengan pita Pusat Notifikasi.
    const headline =
        stats.total === 0 ? (
            'Registry armada masih kosong.'
        ) : stats.perlu_tinjau > 0 ? (
            <>
                <span className="text-gold">{formatNumber(stats.perlu_tinjau)}</span> kapal
                menunggu tindak lanjut dokumen.
            </>
        ) : stats.aktif < stats.total ? (
            <>
                <span className="text-gold">{formatNumber(stats.aktif)}</span> dari{' '}
                {formatNumber(stats.total)} kapal siap beroperasi.
            </>
        ) : (
            'Seluruh armada siap beroperasi.'
        );

    return (
        <AuthenticatedLayout>
            <Head title="Fleet Management" />

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

            {/* ===== 00 · Pita registry armada =====
                Panel gelap burgundy-merah yang membawa identitas halaman
                login, sidebar, dashboard, notifikasi, dan document center
                ke Fleet Management: aurora, grain, rim emas, watermark
                kapal (senada ikon armada pada sidebar), judul dinamis,
                aksi utama, serta empat ubin ringkasan armada. */}
            <section
                className="bt-anim relative mb-6 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-sidebar via-primary-hover to-primary shadow-[0_24px_60px_-24px_rgba(69,16,22,0.55)]"
                style={{ animation: `bt-rise 0.55s ${EASE} both` }}
            >
                {/* Kedalaman panel: cahaya merah kiri-atas, cahaya emas
                    kanan-bawah, grain kertas, dan watermark kemudi. */}
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
                        size={220}
                        strokeWidth={0.7}
                        className="absolute -right-10 -top-12 hidden rotate-[8deg] select-none text-white/[0.05] xl:block"
                    />
                </div>
                {/* Rim emas tipis di tepi atas, tanda tangan antar halaman. */}
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
                            Registry Armada
                        </p>
                        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-cream sm:text-3xl">
                            {headline}
                        </h1>
                        <p className="mt-2 max-w-xl text-sm leading-relaxed text-cream/70">
                            Data induk seluruh kapal perusahaan: status operasional,
                            spesifikasi teknis, dan kelengkapan dokumen dalam satu
                            register terpadu.
                        </p>
                    </div>

                    {canCreate && (
                        <div className="flex flex-col gap-2 sm:flex-row xl:shrink-0">
                            <Link
                                href="/armada/create"
                                className="inline-flex items-center justify-center gap-2 rounded-lg bg-cream px-3.5 py-2 text-sm font-semibold text-sidebar shadow-[0_12px_26px_-14px_rgba(212,169,106,0.55)] transition hover:bg-cream/90"
                            >
                                <Plus size={16} aria-hidden="true" />
                                Tambah Kapal
                            </Link>
                        </div>
                    )}
                </div>

                {/* Empat ubin ringkasan: cermin angka di atas register.
                    Setelah InputLabel diberi ekspor default, navigasi ke
                    halaman tambah kapal kembali normal. */}
                <div className="relative grid grid-cols-2 gap-3 border-t border-white/[0.08] p-6 pt-5 sm:gap-4 lg:grid-cols-4 lg:p-7 lg:pt-6">
                    <HeroMetric
                        label="Total Armada"
                        value={formatNumber(stats.total)}
                        sub="kapal terdaftar di registry"
                    />
                    <HeroMetric
                        label="Siap Beroperasi"
                        value={formatNumber(stats.aktif)}
                        sub={`${activePct}% dari total armada`}
                    />
                    <HeroMetric
                        label="Perlu Tindak Lanjut"
                        value={formatNumber(stats.perlu_tinjau)}
                        sub="kelengkapan dokumen di bawah 90%"
                        gold={stats.perlu_tinjau > 0}
                    />
                    <HeroMetric
                        label="Tidak Operasional"
                        value={formatNumber(nonOperational)}
                        sub="perbaikan · dock · mangkrak"
                    />
                </div>
            </section>

            {/* ===== 01 · Tab status operasional =====
                Pil berikon menggantikan dropdown status lama, konsisten
                dengan tab tampilan pada halaman dokumen dan tab filter
                pada halaman notifikasi. */}
            <nav
                className="bt-anim bt-scroll mb-4 flex gap-1.5 overflow-x-auto pe-1"
                style={{ animation: `bt-rise 0.45s ${EASE} 70ms both` }}
                aria-label="Filter status armada"
            >
                {STATUS_TABS.map(({ key, label, icon: Icon }) => {
                    const isActive = activeStatus === key;
                    const count = tabCount(key);
                    return (
                        <button
                            key={key || 'semua'}
                            type="button"
                            onClick={() => setFilter('status', key)}
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
                                        isActive ? 'bg-white/20 text-white' : 'bg-appbg text-muted',
                                    )}
                                >
                                    {formatNumber(count)}
                                </span>
                            )}
                        </button>
                    );
                })}
            </nav>

            {/* ===== 02 · Panel saringan =====
                Chip jenis kapal dan pencarian nama digabung dalam satu
                kartu agar semua alat penyaringan hidup di satu tempat,
                pola yang sama dengan panel saringan halaman dokumen. */}
            <div
                className="bt-anim mb-5 rounded-2xl border border-hairline bg-white p-4 shadow-[0_18px_40px_-30px_rgba(28,27,26,0.35)]"
                style={{ animation: `bt-rise 0.45s ${EASE} 110ms both` }}
            >
                <div className="flex flex-wrap items-center gap-1.5">
                    <span className="me-1 hidden font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-muted sm:inline">
                        Jenis
                    </span>
                    {TYPE_CHIPS.map((t) => {
                        const isActive = activeType === t.code;
                        return (
                            <button
                                key={t.code || 'semua'}
                                type="button"
                                onClick={() => setFilter('type', t.code)}
                                className={classNames(
                                    'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-200',
                                    isActive
                                        ? 'border-primary bg-primary text-white shadow-[0_8px_18px_-10px_rgba(193,18,31,0.5)]'
                                        : 'border-hairline bg-white text-muted hover:border-primary/40 hover:text-ink',
                                )}
                            >
                                {t.label}
                            </button>
                        );
                    })}
                    {activeFilterCount > 0 && (
                        <span className="ms-auto inline-flex items-center gap-2 whitespace-nowrap text-xs text-muted">
                            <span className="font-mono">{activeFilterCount} filter aktif</span>
                            <button
                                type="button"
                                onClick={resetFilters}
                                className="font-medium text-primary transition-colors duration-150 hover:underline"
                            >
                                Reset
                            </button>
                        </span>
                    )}
                </div>
                <div aria-hidden="true" className="my-3.5 h-px bg-hairline/60" />
                <form onSubmit={apply} className="flex flex-wrap items-center gap-2">
                    <div className="relative min-w-56 flex-1">
                        <Search
                            size={15}
                            aria-hidden="true"
                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                        />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Cari nama kapal atau nomor registrasi…"
                            aria-label="Cari kapal"
                            className="h-9 w-full rounded-lg border border-hairline bg-white pl-9 pr-3 text-sm text-ink placeholder:text-muted/70 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                    </div>
                    <button
                        type="submit"
                        className="h-9 rounded-lg bg-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover"
                    >
                        Terapkan
                    </button>
                </form>
            </div>

            {/* ===== 03 · Register =====
                Meta hasil + legenda rel kiri di atas meja, meja kapal
                dengan rel penanda kapal tidak beroperasi, kolom
                spesifikasi mono, dan bilah kelengkapan dokumen. */}
            <section className="bt-anim" style={{ animation: `bt-rise 0.45s ${EASE} 150ms both` }}>
                {vessels.length > 0 && (
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
                            {formatNumber(vessels.length)} kapal ditemukan
                        </p>
                        <p className="flex items-center gap-3 text-[11px] text-muted">
                            <span className="flex items-center gap-1.5">
                                <span aria-hidden="true" className="h-3 w-[3px] rounded-full bg-warn" />
                                dalam perbaikan
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span aria-hidden="true" className="h-3 w-[3px] rounded-full bg-primary" />
                                dock · mangkrak
                            </span>
                        </p>
                    </div>
                )}

                {vessels.length === 0 ? (
                    isFilteredEmpty ? (
                        <div className="rounded-2xl border border-dashed border-hairline bg-appbg/40 px-6 py-16 text-center">
                            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white text-muted shadow-sm ring-1 ring-inset ring-hairline">
                                <SearchX size={20} aria-hidden="true" />
                            </span>
                            <p className="mt-4 text-sm font-semibold text-ink">
                                Tidak ada kapal cocok
                            </p>
                            <p className="mt-1 text-xs text-muted">
                                Ubah kata kunci, jenis, atau status yang dipakai.
                            </p>
                            <button
                                type="button"
                                onClick={resetFilters}
                                className="mt-5 inline-flex items-center gap-2 rounded-lg border border-hairline bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-primary/40 hover:text-primary"
                            >
                                <RotateCcw size={15} aria-hidden="true" />
                                Hapus Filter
                            </button>
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-dashed border-hairline bg-appbg/40 px-6 py-16 text-center">
                            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white text-muted shadow-sm ring-1 ring-inset ring-hairline">
                                <Ship size={20} aria-hidden="true" />
                            </span>
                            <p className="mt-4 text-sm font-semibold text-ink">
                                Belum ada kapal terdaftar
                            </p>
                            <p className="mt-1 text-xs text-muted">
                                Tambahkan kapal pertama untuk memulai pendataan armada.
                            </p>
                            {canCreate && (
                                <Link
                                    href="/armada/create"
                                    className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover"
                                >
                                    <Plus size={15} aria-hidden="true" />
                                    Tambah Kapal Pertama
                                </Link>
                            )}
                        </div>
                    )
                ) : (
                    <div className="overflow-hidden rounded-2xl border border-hairline bg-white shadow-[0_20px_44px_-32px_rgba(28,27,26,0.4)]">
                        <div className="bt-scroll overflow-x-auto">
                            <table className="w-full min-w-[52rem] text-sm">
                                <thead>
                                    <tr className="border-b border-hairline bg-appbg/70">
                                        <th scope="col" className={classNames(TH_BASE, 'text-left')}>
                                            Kapal
                                        </th>
                                        <th scope="col" className={classNames(TH_BASE, 'text-left')}>
                                            Spesifikasi
                                        </th>
                                        <th scope="col" className={classNames(TH_BASE, 'text-left')}>
                                            Pangkalan
                                        </th>
                                        <th scope="col" className={classNames(TH_BASE, 'text-left')}>
                                            Status
                                        </th>
                                        <th scope="col" className={classNames(TH_BASE, 'text-left')}>
                                            Kelengkapan Dokumen
                                        </th>
                                        <th scope="col" className={classNames(TH_BASE, 'text-center')}>
                                            Perjalanan
                                        </th>
                                        <th scope="col" className={classNames(TH_BASE, 'text-right')}>
                                            <span className="sr-only">Aksi</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-hairline">
                                    {vessels.map((row) => {
                                        const rail = statusRail(row.operational_status);
                                        const pos = positionInfo(row.last_position_at);
                                        return (
                                            <tr
                                                key={row.id}
                                                id={`record-vessel-${row.id}`}
                                                className="transition-colors duration-150 hover:bg-appbg/50"
                                            >
                                                <td
                                                    className={classNames(
                                                        'relative',
                                                        TD_CLS,
                                                        rail &&
                                                            'before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3px] before:rounded-full',
                                                        rail,
                                                    )}
                                                >
                                                    <Link
                                                        href={`/armada/${row.id}`}
                                                        className="text-sm font-semibold text-ink transition-colors duration-150 hover:text-primary hover:underline"
                                                    >
                                                        {row.vessel_name}
                                                    </Link>
                                                    <p className="mt-0.5 text-xs text-muted">
                                                        {row.vessel_type === 'lainnya' && row.vessel_type_custom
                                                            ? row.vessel_type_custom
                                                            : TYPE_LABELS[row.vessel_type] ?? row.vessel_type}
                                                        {' · '}
                                                        {NAV_LABELS[row.navigation_type] ??
                                                            row.navigation_type}
                                                        {row.year_built ? ` · ${row.year_built}` : ''}
                                                        {row.registration_number
                                                            ? ` · Reg. ${row.registration_number}`
                                                            : ''}
                                                    </p>
                                                </td>
                                                <td className={TD_CLS}>
                                                    <SpecsCell row={row} />
                                                </td>
                                                <td className={TD_CLS}>
                                                    {row.base_location ? (
                                                        <p className="text-sm text-ink">
                                                            {row.base_location}
                                                        </p>
                                                    ) : (
                                                        <p className="text-xs text-muted">
                                                            Belum diatur
                                                        </p>
                                                    )}
                                                    {pos && (
                                                        <p className="mt-0.5 flex items-center gap-1.5 font-mono text-[11px] text-muted">
                                                            <span
                                                                aria-hidden="true"
                                                                className={classNames(
                                                                    'h-1.5 w-1.5 rounded-full',
                                                                    pos.fresh ? 'bg-ok' : 'bg-stone',
                                                                )}
                                                            />
                                                            Posisi terakhir {pos.label}
                                                        </p>
                                                    )}
                                                </td>
                                                <td className={TD_CLS}>
                                                    <Badge tone={statusTone(row.operational_status)}>
                                                        {STATUS_LABELS[row.operational_status] ??
                                                            row.operational_status}
                                                    </Badge>
                                                </td>
                                                <td className={TD_CLS}>
                                                    <CompletenessCell
                                                        pct={row.doc_completeness}
                                                        missing={row.missing_count}
                                                    />
                                                </td>
                                                <td className={classNames(TD_CLS, 'text-center')}>
                                                    <span className="text-sm font-semibold tabular-nums text-ink">
                                                        {formatNumber(row.voyage_count)}
                                                    </span>
                                                </td>
                                                <td className={classNames(TD_CLS, 'text-right')}>
                                                    <Link
                                                        href={`/armada/${row.id}`}
                                                        className="inline-flex items-center gap-1 whitespace-nowrap text-sm font-semibold text-primary transition-colors duration-150 hover:underline"
                                                    >
                                                        Detail
                                                        <ChevronRight
                                                            size={14}
                                                            aria-hidden="true"
                                                        />
                                                    </Link>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </section>
        </AuthenticatedLayout>
    );
}
