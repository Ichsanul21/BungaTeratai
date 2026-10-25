import Badge, { type BadgeTone } from '@/Components/ui/Badge';
import Modal from '@/Components/Modal';
import { VERIFICATION_STATUS_LABELS } from '@/Constants/navigation';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { classNames, formatNumber } from '@/lib/format';
import { type PageProps } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    CalendarClock,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    FileCheck2,
    FileStack,
    FileText,
    Plus,
    Search,
} from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';

interface DocRow {
    id: number;
    document_name: string;
    document_number?: string;
    owner_type: string;
    owner_name: string;
    group_code?: string;
    category_name?: string;
    has_expiry: boolean;
    expiry_date?: string;
    verification_status: string;
    validity: string;
    days_left?: number | null;
    responsible_person?: string;
    updated_at?: string;
    source_type?: string;
    archive_number?: string;
    is_voided?: boolean;
    has_endorsement?: boolean;
    endorsement_next_date?: string;
}

// Kelompok dokumen A-G: kode tetap dipakai sebagai nilai filter persis
// seperti semula, sedangkan label dipecah dari hurufnya agar chip tampil
// ringkas (huruf mono + nama kelompok).
const GROUPS: Array<{ code: string; label: string }> = [
    { code: '', label: 'Semua' },
    { code: 'A', label: 'Perusahaan' },
    { code: 'B', label: 'Identitas Kapal' },
    { code: 'C', label: 'Sertifikat' },
    { code: 'D', label: 'Awak' },
    { code: 'E', label: 'Perjalanan' },
    { code: 'F', label: 'Operasional' },
    { code: 'G', label: 'Laporan' },
];

// Tab tampilan: kunci & urutan sama dengan TabNav lama, kini dipresentasikan
// sebagai pil berikon agar konsisten dengan halaman notifikasi.
const TABS = [
    { key: 'arsip', label: 'Arsip Semua', icon: FileStack },
    { key: 'terbitan', label: 'Terbitan', icon: FileCheck2 },
    { key: 'unggahan', label: 'Unggahan', icon: FileText },
    { key: 'expiring', label: 'Expiring & Endorsement', icon: CalendarClock },
];

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

const VALIDITY_TONES: Record<string, BadgeTone> = {
    normal: 'success',
    expiring_soon: 'warning',
    expired: 'danger',
    no_expiry: 'neutral',
};

const VALIDITY_TEXT: Record<string, string> = {
    normal: 'Normal',
    expiring_soon: '≤30 Hari',
    expired: 'Kedaluwarsa',
    no_expiry: 'Tanpa Masa Berlaku',
};

// Ubin metrik masa berlaku di hero: angka global + proporsi terhadap total,
// sekaligus filter cepat (klik menyaring, klik lagi melepas). Warna titik
// dan batang memakai token yang sudah ada: ok, warn, danger, cream.
const VALIDITY_TILES: Array<{ key: string; label: string; dot: string; bar: string }> = [
    { key: 'normal', label: 'Normal', dot: 'bg-ok', bar: 'bg-ok' },
    { key: 'expiring_soon', label: 'Segera Berakhir', dot: 'bg-warn', bar: 'bg-warn' },
    { key: 'expired', label: 'Kedaluwarsa', dot: 'bg-danger', bar: 'bg-danger' },
    { key: 'no_expiry', label: 'Tanpa Masa Berlaku', dot: 'bg-cream/50', bar: 'bg-cream/50' },
];

// Warna irisan donat komposisi pada ubin total. recharts hanya menerima
// warna sebagai string literal, jadi nilai di bawah dipetakan PERSIS dari
// token tailwind.config.js, mengikuti pola PIE_COLORS pada Dashboard,
// agar grafik dan UI tetap satu sumber kebenaran warna.
const PIE_WARNA: Record<string, string> = {
    normal: '#2F8F68',              // token ok
    expiring_soon: '#D99A2B',       // token warn
    expired: '#C94C4C',             // token danger
    no_expiry: 'rgba(239,227,211,0.5)', // token cream 50%, senada titik & batang ubin
};

// Tekstur grain halus untuk panel hero, senada dengan login, sidebar,
// dashboard, dan halaman notifikasi.
const GRAIN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E")`;

const EASE = 'cubic-bezier(0.22,1,0.36,1)';

// Kelas bersama untuk kontrol saringan & kolom meja agar konsisten.
const SELECT_CLS =
    'h-9 cursor-pointer appearance-none rounded-lg border border-hairline bg-white ps-2.5 pe-8 text-sm text-ink transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20';
const INPUT_CLS =
    'mt-1 block w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm text-ink placeholder:text-muted/70 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20';
const TH_CLS =
    'px-4 py-3 text-left font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-muted';
const TD_CLS = 'px-4 py-3.5 align-middle';

// Kartu rincian irisan donat komposisi: kartu gelap kaca (bukan kartu
// putih seperti tooltip Dashboard) karena donatnya hidup di panel hero
// burgundy. Kartu ini tidak lagi memakai Tooltip recharts yang menempel
// mengikuti kursor: pada donat sekecil ini kursor selalu berada dekat
// pusat sehingga kartunya justru menutupi angka total. Kini kartu
// dirender manual di sisi luar donat oleh ubin total dan menerima entri
// komposisi yang sedang disorot (label, count, warna, pct) lewat prop d.
function KomposisiTip({ d }: { d: { label: string; count: number; warna: string; pct: number } }) {
    return (
        <div
            style={{ animation: `bt-fade 0.18s ${EASE} both` }}
            className="rounded-xl border border-white/15 bg-sidebar/95 px-3.5 py-2 shadow-[0_16px_40px_-18px_rgba(0,0,0,0.6)]"
        >
            <p className="flex items-center gap-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-cream/60">
                <span
                    aria-hidden="true"
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: d.warna }}
                />
                {d.label}
            </p>
            <p className="mt-1 text-sm font-semibold tabular-nums text-cream">
                {formatNumber(d.count)}
                <span className="ms-1 text-xs font-normal text-cream/60">dokumen</span>
            </p>
            <p className="mt-0.5 font-mono text-[11px] tabular-nums text-cream/60">
                {d.pct}% dari total
            </p>
        </div>
    );
}

export default function DocumentsIndex({
    documents,
    tab,
    filters,
    categories,
    vessels,
    groupCounts,
    validityCounts,
    canCreate,
}: PageProps<{
    tab?: string;
    documents: {
        data: DocRow[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        from: number | null;
        to: number | null;
        prev_page_url: string | null;
        next_page_url: string | null;
    };
    filters: Record<string, any>;
    categories: Array<{ code: string; name: string; group_code: string }>;
    vessels: Array<{ id: number; vessel_name: string; vessel_type: string }>;
    groupCounts: Record<string, number>;
    validityCounts: Record<string, number>;
    canCreate?: boolean;
}>) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [letterOpen, setLetterOpen] = useState(false);
    // Indeks irisan donat komposisi yang sedang disorot (null bila tidak
    // ada). Pemicunya event mouse pada komponen Pie, pemakainya kartu
    // rincian yang dirender di sisi luar donat, bukan tooltip yang
    // mengikuti kursor.
    const [irisanAktif, setIrisanAktif] = useState<number | null>(null);
    const letterForm = useForm({
        to: '', subject: '', body: '',
        date: new Date().toISOString().slice(0, 10),
        signer: '', signer_title: '',
    });

    const group = filters.group ?? '';
    const activeTab = tab ?? 'arsip';
    const activeValidity = filters.validity ?? '';
    // Total seluruh dokumen: penjumlahan empat kategori masa berlaku.
    // Angka ini tampil di pusat donat sekaligus menjadi penyebut
    // persentase seluruh ubin hero, sehingga donat, kartu rincian, dan
    // ubin masa berlaku selalu cocok dengan matematika yang sama.
    const totalAll = VALIDITY_TILES.reduce((s, t) => s + (validityCounts[t.key] ?? 0), 0);

    // Data donat komposisi untuk ubin total: satu entri per kategori masa
    // berlaku, lengkap dengan persen yang dihitung di sini agar kartu
    // rincian cukup membaca entri tanpa perlu closure ke totalAll.
    const komposisi = VALIDITY_TILES.map((t) => {
        const count = validityCounts[t.key] ?? 0;
        return {
            key: t.key,
            label: t.label,
            count,
            warna: PIE_WARNA[t.key] ?? '#8A8580',
            pct: totalAll > 0 ? Math.round((count / totalAll) * 100) : 0,
        };
    });

    // Jumlah filter aktif untuk chip "N filter aktif + Reset".
    const activeFilterCount = [
        'search', 'group', 'owner_type', 'vessel_id', 'verification', 'validity',
    ].filter((k) => (filters[k] ?? '') !== '').length;

    const apply = (e: FormEvent) => {
        e.preventDefault();
        router.get('/dokumen', { ...filters, search }, { preserveState: true, replace: true });
    };

    const setFilter = (key: string, value: string) => {
        router.get(
            '/dokumen',
            { ...filters, [key]: value || undefined },
            { preserveState: true, replace: true },
        );
    };

    // Ubin masa berlaku bekerja ganda: klik untuk menyaring, klik lagi
    // saat aktif untuk melepas. Nilai select "Masa Berlaku" di panel
    // saringan tetap sinkron karena keduanya membaca props yang sama.
    const toggleValidity = (key: string) => {
        setFilter('validity', activeValidity === key ? '' : key);
    };

    const resetFilters = () => {
        setSearch('');
        router.get(
            '/dokumen',
            activeTab !== 'arsip' ? { tab: activeTab } : {},
            { preserveState: true, replace: true },
        );
    };

    return (
        <AuthenticatedLayout>
            <Head title="Document Center" />

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
                @keyframes bt-fade {
                    0% { opacity: 0; transform: scale(0.97); }
                    100% { opacity: 1; transform: scale(1); }
                }
                .bt-scroll { scrollbar-width: thin; scrollbar-color: rgba(28,27,26,0.22) transparent; }
                .bt-scroll::-webkit-scrollbar { width: 5px; height: 5px; }
                .bt-scroll::-webkit-scrollbar-thumb { background: rgba(28,27,26,0.2); border-radius: 9999px; }
                .bt-scroll::-webkit-scrollbar-track { background: transparent; }
                @media (prefers-reduced-motion: reduce) {
                    .bt-anim, .bt-anim * { animation: none !important; }
                }
            `}</style>

            {/* ===== 00 · Pita register dokumen =====
                Panel gelap burgundy-merah yang membawa identitas halaman
                login, sidebar, dashboard, dan notifikasi ke Document
                Center: aurora, grain, rim emas, watermark tumpukan berkas,
                sapaan kontekstual, aksi utama, serta lima ubin ringkasan
                (total dokumen dan empat masa berlaku). */}
            <section
                className="bt-anim relative mb-6 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-sidebar via-primary-hover to-primary shadow-[0_24px_60px_-24px_rgba(69,16,22,0.55)]"
                style={{ animation: `bt-rise 0.55s ${EASE} both` }}
            >
                {/* Kedalaman panel: cahaya merah kiri-atas, cahaya emas
                    kanan-bawah, grain kertas, dan watermark ikon berkas. */}
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
                    <FileStack
                        size={220}
                        strokeWidth={0.7}
                        className="absolute -right-10 -top-12 hidden select-none text-white/[0.05] xl:block"
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
                            Register Dokumen
                        </p>
                        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-cream sm:text-3xl">
                            Document Center.
                        </h1>
                        <p className="mt-2 max-w-xl text-sm leading-relaxed text-cream/70">
                            Seluruh dokumen perusahaan, kapal, awak, dan perjalanan
                            dalam satu register terpadu. Status verifikasi dan masa
                            berlaku disajikan terpisah agar keduanya tidak tertukar.
                        </p>
                    </div>

                    {canCreate && (
                        <div className="flex flex-col gap-2 sm:flex-row xl:shrink-0">
                            <button
                                type="button"
                                onClick={() => setLetterOpen(true)}
                                className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3.5 py-2 text-sm font-semibold text-cream backdrop-blur-sm transition-colors duration-200 hover:border-white/35 hover:bg-white/[0.15]"
                            >
                                <FileText size={15} aria-hidden="true" />
                                Terbitkan Surat Umum
                            </button>
                            <Link
                                href="/dokumen/create"
                                className="inline-flex items-center justify-center gap-2 rounded-lg bg-cream px-3.5 py-2 text-sm font-semibold text-sidebar shadow-[0_12px_26px_-14px_rgba(212,169,106,0.55)] transition hover:bg-cream/90"
                            >
                                <Plus size={16} aria-hidden="true" />
                                Unggah Dokumen
                            </Link>
                        </div>
                    )}
                </div>

                {/* Lima ubin ringkasan: ubin total menjadi jangkar
                    perbandingan berupa donat komposisi (total di pusat,
                    irisan per kategori masa berlaku, arahkan kursor ke
                    irisan untuk kartu rincian di sisi luar donat),
                    disusul empat ubin masa berlaku yang tetap berfungsi
                    sebagai filter cepat (aktif ditandai bingkai emas). */}
                <div className="relative grid grid-cols-2 gap-3 border-t border-white/[0.08] p-6 pt-5 sm:gap-4 lg:grid-cols-5 lg:p-7 lg:pt-6">
                    {/* Ubin jangkar: total seluruh dokumen di pusat donat
                        komposisi empat masa berlaku. Arahkan kursor ke
                        irisan donat untuk melihat jumlah dan persen kategori
                        tersebut pada kartu yang muncul DI SISI LUAR donat,
                        bukan menimpa donat, sehingga angka total di pusat
                        selalu terlihat. Bukan tombol: murni metrik,
                        penyaringan tetap di ubin masa berlaku dan panel
                        saringan. z-30 mengangkat ubin saat kartu rincian
                        melewati batas ubin: ke ubin sebelah pada grid lima
                        kolom, ke baris ubin di bawahnya pada layar kecil. */}
                    <div className="col-span-2 z-30 min-w-0 rounded-xl border border-gold/30 bg-gold/[0.08] p-4 backdrop-blur-sm lg:col-span-1">
                        <p className="flex items-center gap-1.5 truncate font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-cream/60">
                            <span
                                aria-hidden="true"
                                className="h-1.5 w-1.5 shrink-0 rounded-full bg-gold"
                            />
                            Total Dokumen
                        </p>
                        <div className="relative mt-2 h-[84px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    {/* Tanpa stroke irisan: irisan tipis tetap
                                        utuh warnanya, mengikuti pola donat
                                        status dokumen pada Dashboard. Tanpa
                                        Tooltip recharts: pada donat sekecil
                                        ini tooltip mengikuti kursor yang
                                        selalu dekat pusat sehingga menutupi
                                        angka total, jadi kartu rincian
                                        dirender manual di sisi luar donat
                                        lewat irisanAktif di bawah. */}
                                    <Pie
                                        data={komposisi}
                                        dataKey="count"
                                        nameKey="label"
                                        innerRadius={26}
                                        outerRadius={40}
                                        paddingAngle={2.5}
                                        startAngle={90}
                                        endAngle={-270}
                                        stroke="none"
                                        onMouseEnter={(_: unknown, i: number) => setIrisanAktif(i)}
                                        onMouseLeave={() => setIrisanAktif(null)}
                                        onClick={(_: unknown, i: number) => setIrisanAktif(i)}
                                    >
                                        {komposisi.map((d) => (
                                            <Cell key={d.key} fill={d.warna} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                            {/* Angka total di pusat lubang donat; overlay
                                diberi pointer-events-none agar hover irisan
                                tetap sampai ke grafik. */}
                            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                                <p className="text-lg font-semibold leading-tight tabular-nums tracking-tight text-gold">
                                    {formatNumber(totalAll)}
                                </p>
                                <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-cream/50">
                                    Total
                                </p>
                            </div>
                            {/* Kartu rincian irisan: selalu DI SISI LUAR
                                donat, tidak pernah menimpa donat, sehingga
                                angka total di pusat tetap terlihat. Layar
                                kecil: di bawah donat, sejajar tengah ubin.
                                sm ke atas: di kanan donat, sejajar tengah
                                vertikal; pada grid lima kolom kartu mengapung
                                di atas ubin sebelah (itulah gunanya z-30 pada
                                ubin). Kartu diberi pointer-events-none agar
                                tidak menghalangi apa pun di bawahnya dan
                                animasinya hanya opacity + scale halus di
                                elemen kartu, terpisah dari kelas translate
                                pembungkus posisinya. */}
                            {irisanAktif !== null && (
                                <div className="pointer-events-none absolute left-1/2 top-[calc(100%_+_10px)] z-20 -translate-x-1/2 sm:left-[calc(50%_+_50px)] sm:top-1/2 sm:translate-x-0 sm:-translate-y-1/2">
                                    <KomposisiTip d={komposisi[irisanAktif]} />
                                </div>
                            )}
                        </div>
                    </div>
                    {VALIDITY_TILES.map((t) => {
                        const count = validityCounts[t.key] ?? 0;
                        const pct = totalAll > 0 ? Math.round((count / totalAll) * 100) : 0;
                        const isActive = activeValidity === t.key;
                        return (
                            <button
                                key={t.key}
                                type="button"
                                onClick={() => toggleValidity(t.key)}
                                title={
                                    isActive
                                        ? 'Lepas filter masa berlaku'
                                        : 'Saring berdasarkan masa berlaku ini'
                                }
                                className={classNames(
                                    'min-w-0 rounded-xl border p-4 text-left backdrop-blur-sm transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/50',
                                    isActive
                                        ? 'border-gold/60 bg-gold/[0.14]'
                                        : 'border-white/[0.12] bg-white/[0.07] hover:border-white/25 hover:bg-white/[0.1]',
                                )}
                            >
                                <p className="flex items-center gap-1.5 truncate font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-cream/60">
                                    <span
                                        aria-hidden="true"
                                        className={classNames(
                                            'h-1.5 w-1.5 shrink-0 rounded-full',
                                            t.dot,
                                        )}
                                    />
                                    {t.label}
                                </p>
                                <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-cream">
                                    {formatNumber(count)}
                                </p>
                                <div
                                    aria-hidden="true"
                                    className="mt-2.5 h-1 overflow-hidden rounded-full bg-white/15"
                                >
                                    <div
                                        className={classNames('h-full rounded-full', t.bar)}
                                        style={{
                                            width: `${Math.min(Math.max(pct, 0), 100)}%`,
                                        }}
                                    />
                                </div>
                                <p className="mt-2 truncate text-[11px] text-cream/60">
                                    {isActive ? 'Filter aktif · klik untuk lepas' : `${pct}% dari total`}
                                </p>
                            </button>
                        );
                    })}
                </div>
            </section>

            {/* ===== 01 · Tab tampilan =====
                Pil berikon menggantikan TabNav underline: pilihan aktif
                memakai merah utama dengan cahaya lembut, ikon berubah emas. */}
            <nav
                className="bt-anim bt-scroll mb-4 flex gap-1.5 overflow-x-auto pe-1"
                style={{ animation: `bt-rise 0.45s ${EASE} 70ms both` }}
                aria-label="Tab tampilan dokumen"
            >
                {TABS.map(({ key, label, icon: Icon }) => {
                    const isActive = key === activeTab;
                    return (
                        <button
                            key={key}
                            type="button"
                            onClick={() =>
                                router.get('/dokumen', { ...filters, tab: key }, { preserveState: true })
                            }
                            className={classNames(
                                'inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-colors duration-200',
                                isActive
                                    ? 'border-primary bg-primary text-white shadow-[0_10px_24px_-12px_rgba(193,18,31,0.55)]'
                                    : 'border-hairline bg-white text-muted hover:border-primary/40 hover:text-ink',
                            )}
                        >
                            <Icon
                                size={15}
                                aria-hidden="true"
                                className={isActive ? 'text-gold' : ''}
                            />
                            {label}
                        </button>
                    );
                })}
            </nav>

            {/* ===== 02 · Panel saringan =====
                Kelompok A-G, pencarian, dan seluruh dropdown digabung dalam
                satu kartu agar semua alat penyaringan hidup di satu tempat.
                Chip jumlah filter aktif + tombol Reset muncul hanya saat
                ada saringan yang menyimpang dari bawaan. */}
            <div
                className="bt-anim mb-5 rounded-2xl border border-hairline bg-white p-4 shadow-[0_18px_40px_-30px_rgba(28,27,26,0.35)]"
                style={{ animation: `bt-rise 0.45s ${EASE} 110ms both` }}
            >
                <div className="flex flex-wrap items-center gap-1.5">
                    <span className="me-1 hidden font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-muted sm:inline">
                        Kelompok
                    </span>
                    {GROUPS.map((g) => {
                        const isActive = (group ?? '') === g.code;
                        return (
                            <button
                                key={g.code}
                                type="button"
                                onClick={() => setFilter('group', g.code)}
                                className={classNames(
                                    'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-200',
                                    isActive
                                        ? 'border-primary bg-primary text-white shadow-[0_8px_18px_-10px_rgba(193,18,31,0.5)]'
                                        : 'border-hairline bg-white text-muted hover:border-primary/40 hover:text-ink',
                                )}
                            >
                                {g.code && (
                                    <span
                                        className={classNames(
                                            'font-mono text-[11px] font-semibold',
                                            isActive ? 'text-gold' : 'text-primary/60',
                                        )}
                                    >
                                        {g.code}
                                    </span>
                                )}
                                {g.label}
                                {g.code && groupCounts[g.code] !== undefined && (
                                    <span
                                        className={classNames(
                                            'rounded-full px-1.5 py-0.5 font-mono text-[10px] font-medium leading-none',
                                            isActive ? 'bg-white/20 text-white' : 'bg-appbg text-muted',
                                        )}
                                    >
                                        {formatNumber(groupCounts[g.code])}
                                    </span>
                                )}
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
                            placeholder="Cari nama / nomor dokumen…"
                            aria-label="Cari dokumen"
                            className="h-9 w-full rounded-lg border border-hairline bg-white pl-9 pr-3 text-sm text-ink placeholder:text-muted/70 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                    </div>
                    <span className="relative">
                        <select
                            value={filters.owner_type ?? ''}
                            onChange={(e) => setFilter('owner_type', e.target.value)}
                            aria-label="Saring pemilik dokumen"
                            className={classNames(SELECT_CLS, 'w-36')}
                        >
                            <option value="">Semua Pemilik</option>
                            <option value="company">Perusahaan</option>
                            <option value="vessel">Kapal</option>
                        </select>
                        <ChevronDown
                            size={14}
                            aria-hidden="true"
                            className="pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2 text-muted"
                        />
                    </span>
                    <span className="relative">
                        <select
                            value={filters.vessel_id ?? ''}
                            onChange={(e) => setFilter('vessel_id', e.target.value)}
                            aria-label="Saring kapal"
                            className={classNames(SELECT_CLS, 'w-44')}
                        >
                            <option value="">Semua Kapal</option>
                            {vessels.map((v) => (
                                <option key={v.id} value={v.id}>
                                    {v.vessel_name}
                                </option>
                            ))}
                        </select>
                        <ChevronDown
                            size={14}
                            aria-hidden="true"
                            className="pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2 text-muted"
                        />
                    </span>
                    <span className="relative">
                        <select
                            value={filters.verification ?? ''}
                            onChange={(e) => setFilter('verification', e.target.value)}
                            aria-label="Saring status verifikasi"
                            className={classNames(SELECT_CLS, 'w-44')}
                        >
                            <option value="">Semua Verifikasi</option>
                            {Object.entries(VERIFICATION_STATUS_LABELS).map(([k, v]) => (
                                <option key={k} value={k}>
                                    {v}
                                </option>
                            ))}
                        </select>
                        <ChevronDown
                            size={14}
                            aria-hidden="true"
                            className="pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2 text-muted"
                        />
                    </span>
                    <span className="relative">
                        <select
                            value={filters.validity ?? ''}
                            onChange={(e) => setFilter('validity', e.target.value)}
                            aria-label="Saring masa berlaku"
                            className={classNames(SELECT_CLS, 'w-40')}
                        >
                            <option value="">Semua Masa Berlaku</option>
                            <option value="normal">Normal</option>
                            <option value="expiring_soon">≤30 Hari</option>
                            <option value="expired">Kedaluwarsa</option>
                            <option value="no_expiry">Tanpa Masa Berlaku</option>
                        </select>
                        <ChevronDown
                            size={14}
                            aria-hidden="true"
                            className="pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2 text-muted"
                        />
                    </span>
                    <button
                        type="submit"
                        className="h-9 rounded-lg bg-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover"
                    >
                        Terapkan
                    </button>
                </form>
            </div>

            {/* ===== 03 · Register =====
                Meta hasil + legenda rel kiri di atas meja, meja dokumen
                dengan rel penanda dokumen bermasalah, lalu navigasi halaman. */}
            <section className="bt-anim" style={{ animation: `bt-rise 0.45s ${EASE} 150ms both` }}>
                {documents.data.length > 0 && (
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
                            {formatNumber(documents.total)} dokumen ditemukan
                            {documents.last_page > 1 &&
                                ` · halaman ${documents.current_page} / ${documents.last_page}`}
                        </p>
                        <p className="flex items-center gap-3 text-[11px] text-muted">
                            <span className="flex items-center gap-1.5">
                                <span aria-hidden="true" className="h-3 w-[3px] rounded-full bg-warn" />
                                ≤ 30 hari
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span aria-hidden="true" className="h-3 w-[3px] rounded-full bg-primary" />
                                kedaluwarsa
                            </span>
                        </p>
                    </div>
                )}

                {documents.data.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-hairline bg-appbg/40 px-6 py-16 text-center">
                        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white text-muted shadow-sm ring-1 ring-inset ring-hairline">
                            <FileStack size={20} aria-hidden="true" />
                        </span>
                        <p className="mt-4 text-sm font-semibold text-ink">Tidak ada dokumen cocok</p>
                        <p className="mt-1 text-xs text-muted">Ubah filter atau unggah dokumen baru.</p>
                        {canCreate && (
                            <Link
                                href="/dokumen/create"
                                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover"
                            >
                                <Plus size={15} aria-hidden="true" />
                                Unggah Dokumen
                            </Link>
                        )}
                    </div>
                ) : (
                    <div className="overflow-hidden rounded-2xl border border-hairline bg-white shadow-[0_20px_44px_-32px_rgba(28,27,26,0.4)]">
                        <div className="bt-scroll overflow-x-auto">
                            <table className="w-full min-w-[48rem] text-sm">
                                <thead>
                                    <tr className="border-b border-hairline bg-appbg/70">
                                        <th scope="col" className={TH_CLS}>
                                            Dokumen
                                        </th>
                                        <th scope="col" className={TH_CLS}>
                                            Milik
                                        </th>
                                        <th scope="col" className={TH_CLS}>
                                            Masa Berlaku
                                        </th>
                                        <th scope="col" className={TH_CLS}>
                                            Status Berlaku
                                        </th>
                                        <th scope="col" className={TH_CLS}>
                                            Verifikasi
                                        </th>
                                        <th scope="col" className="px-4 py-3" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-hairline">
                                    {documents.data.map((row) => {
                                        // Rel kiri hanya dipasang pada dokumen
                                        // bermasalah (kedaluwarsa / ≤ 30 hari)
                                        // agar meja tetap tenang namun masalah
                                        // langsung terlihat saat memindai.
                                        const rail =
                                            row.validity === 'expired'
                                                ? 'before:bg-primary'
                                                : row.validity === 'expiring_soon'
                                                  ? 'before:bg-warn'
                                                  : '';
                                        const d = row.days_left ?? null;
                                        return (
                                            <tr
                                                key={row.id}
                                                id={`record-doc-${row.id}`}
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
                                                        href={`/dokumen/${row.id}`}
                                                        className="text-sm font-semibold text-ink transition-colors duration-150 hover:text-primary hover:underline"
                                                    >
                                                        {row.document_name}
                                                    </Link>
                                                    <p className="mt-0.5 text-xs text-muted">
                                                        {row.category_name ?? 'Tanpa kategori'}
                                                        {row.document_number
                                                            ? ` · No. ${row.document_number}`
                                                            : ''}
                                                        {row.archive_number ? ` · ${row.archive_number}` : ''}
                                                    </p>
                                                    <div className="mt-1 flex flex-wrap gap-1">
                                                        <Badge
                                                            tone={
                                                                row.source_type === 'terbitan'
                                                                    ? 'primary'
                                                                    : 'info'
                                                            }
                                                        >
                                                            {row.source_type === 'terbitan'
                                                                ? 'Terbitan'
                                                                : 'Unggahan'}
                                                        </Badge>
                                                        {row.is_voided && (
                                                            <Badge tone="danger">VOID</Badge>
                                                        )}
                                                        {row.has_endorsement && (
                                                            <Badge tone="warning">Endorsement</Badge>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className={TD_CLS}>
                                                    <p className="text-sm text-ink">
                                                        {row.owner_name}
                                                    </p>
                                                    <span className="mt-0.5 inline-flex items-center rounded-md bg-appbg px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wide text-muted">
                                                        {row.owner_type === 'company'
                                                            ? 'Perusahaan'
                                                            : row.owner_type === 'crew'
                                                              ? 'ABK'
                                                              : 'Kapal'}
                                                    </span>
                                                </td>
                                                <td className={TD_CLS}>
                                                    {!row.has_expiry || !row.expiry_date ? (
                                                        <span className="text-xs text-muted">
                                                            Tanpa masa berlaku
                                                        </span>
                                                    ) : d === null ? (
                                                        <div>
                                                            <p className="font-mono text-[13px] text-ink">
                                                                {row.expiry_date}
                                                            </p>
                                                            <p className="mt-0.5 text-xs text-muted">
                                                                sisa hari tidak tersedia
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <div>
                                                            <p className="font-mono text-[13px] text-ink">
                                                                {row.expiry_date}
                                                            </p>
                                                            <p
                                                                className={classNames(
                                                                    'mt-0.5 text-xs font-medium',
                                                                    d < 0
                                                                        ? 'text-primary'
                                                                        : d <= 30
                                                                          ? 'text-warn'
                                                                          : 'text-muted',
                                                                )}
                                                            >
                                                                {d < 0
                                                                    ? `lewat ${Math.abs(d)} hari`
                                                                    : `${d} hari lagi`}
                                                            </p>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className={TD_CLS}>
                                                    <Badge
                                                        tone={
                                                            VALIDITY_TONES[row.validity] ?? 'neutral'
                                                        }
                                                    >
                                                        {VALIDITY_TEXT[row.validity] ?? row.validity}
                                                    </Badge>
                                                </td>
                                                <td className={TD_CLS}>
                                                    <Badge
                                                        tone={
                                                            VERIF_TONES[row.verification_status] ??
                                                            'neutral'
                                                        }
                                                    >
                                                        {VERIFICATION_STATUS_LABELS[
                                                            row.verification_status
                                                        ] ?? row.verification_status}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-3.5 text-right align-middle">
                                                    <Link
                                                        href={`/dokumen/${row.id}`}
                                                        className="inline-flex items-center gap-1 whitespace-nowrap text-sm font-medium text-primary transition-colors duration-150 hover:underline"
                                                    >
                                                        Detail
                                                        <ChevronRight size={14} aria-hidden="true" />
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

                {documents.last_page > 1 && (
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs text-muted">
                            Menampilkan{' '}
                            <span className="font-mono font-semibold text-ink">
                                {documents.from}–{documents.to}
                            </span>{' '}
                            dari{' '}
                            <span className="font-mono font-semibold text-ink">
                                {formatNumber(documents.total)}
                            </span>{' '}
                            dokumen
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                disabled={!documents.prev_page_url}
                                onClick={() =>
                                    documents.prev_page_url &&
                                    router.get(documents.prev_page_url, {}, { preserveState: true })
                                }
                                className="inline-flex items-center gap-1 rounded-lg border border-hairline bg-white px-3 py-1.5 text-sm font-medium text-ink transition hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <ChevronLeft size={14} aria-hidden="true" />
                                Sebelumnya
                            </button>
                            <span className="rounded-lg bg-appbg px-3 py-1.5 font-mono text-xs font-medium text-muted">
                                {documents.current_page} / {documents.last_page}
                            </span>
                            <button
                                type="button"
                                disabled={!documents.next_page_url}
                                onClick={() =>
                                    documents.next_page_url &&
                                    router.get(documents.next_page_url, {}, { preserveState: true })
                                }
                                className="inline-flex items-center gap-1 rounded-lg border border-hairline bg-white px-3 py-1.5 text-sm font-medium text-ink transition hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Berikutnya
                                <ChevronRight size={14} aria-hidden="true" />
                            </button>
                        </div>
                    </div>
                )}
            </section>

            {/* ===== Modal: Terbit Surat Umum =====
                Kepala modal memakai strip gelap + rim emas agar konsisten
                dengan hero; badan formulir memakai gaya input aplikasi
                (border-hairline + fokus merah), menggantikan border-gray-300
                bawaan yang berada di luar palet. */}
            <Modal show={letterOpen} onClose={() => setLetterOpen(false)} maxWidth="lg">
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        letterForm.post('/dokumen/surat-umum', {
                            preserveScroll: true,
                            onSuccess: () => {
                                setLetterOpen(false);
                                letterForm.reset();
                            },
                        });
                    }}
                >
                    <div className="relative overflow-hidden bg-gradient-to-br from-sidebar to-primary px-6 py-5">
                        <div
                            aria-hidden="true"
                            className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent"
                        />
                        <p className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-cream/60">
                            Surat Keluar
                        </p>
                        <h2 className="mt-1 text-lg font-semibold tracking-tight text-cream">
                            Terbitkan Surat Umum
                        </h2>
                        <p className="mt-1.5 text-xs leading-relaxed text-cream/70">
                            Nomor surat dibuat otomatis mengikuti pola{' '}
                            {'{seq}/BT/{bulan romawi}/{tahun}'}. PDF berkop PT Bunga Teratai
                            diarsipkan otomatis ke register.
                        </p>
                    </div>
                    <div className="p-6">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                                <label className="block font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted">
                                    Kepada Yth. <span className="text-primary">*</span>
                                </label>
                                <input
                                    value={letterForm.data.to}
                                    onChange={(e) => letterForm.setData('to', e.target.value)}
                                    placeholder="mis. PT Sinar Laut Maritim"
                                    className={INPUT_CLS}
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="block font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted">
                                    Perihal / Subjek <span className="text-primary">*</span>
                                </label>
                                <input
                                    value={letterForm.data.subject}
                                    onChange={(e) => letterForm.setData('subject', e.target.value)}
                                    placeholder="mis. Surat Perintah Bongkar Muat"
                                    className={INPUT_CLS}
                                />
                            </div>
                            <div>
                                <label className="block font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted">
                                    Tanggal
                                </label>
                                <input
                                    type="date"
                                    value={letterForm.data.date}
                                    onChange={(e) => letterForm.setData('date', e.target.value)}
                                    className={INPUT_CLS}
                                />
                            </div>
                            <div>
                                <label className="block font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted">
                                    Penandatangan
                                </label>
                                <input
                                    value={letterForm.data.signer}
                                    onChange={(e) => letterForm.setData('signer', e.target.value)}
                                    placeholder="H. Syarif"
                                    className={INPUT_CLS}
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="block font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted">
                                    Isi Surat <span className="text-primary">*</span>
                                </label>
                                <textarea
                                    rows={6}
                                    value={letterForm.data.body}
                                    onChange={(e) => letterForm.setData('body', e.target.value)}
                                    placeholder="Dengan hormat, bersama ini kami menyampaikan ..."
                                    className={INPUT_CLS}
                                />
                                {letterForm.errors.body && (
                                    <p className="mt-1 text-xs text-primary">
                                        {letterForm.errors.body}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col-reverse gap-2 border-t border-hairline bg-appbg/50 px-6 py-4 sm:flex-row sm:justify-end">
                        <button
                            type="button"
                            onClick={() => setLetterOpen(false)}
                            className="rounded-lg border border-hairline bg-white px-4 py-2 text-sm font-medium text-ink transition hover:border-primary/40"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={letterForm.processing}
                            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover disabled:opacity-50"
                        >
                            {letterForm.processing ? 'Menerbitkan…' : 'Terbitkan & Cetak PDF'}
                        </button>
                    </div>
                </form>
            </Modal>
        </AuthenticatedLayout>
    );
}
