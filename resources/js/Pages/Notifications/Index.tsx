import Badge, { type BadgeTone } from '@/Components/ui/Badge';
import Card from '@/Components/ui/Card';
import EmptyState from '@/Components/ui/EmptyState';
import Authenticated from '@/Layouts/AuthenticatedLayout';
import { classNames, daysUntil, formatDate, formatDateTime } from '@/lib/format';
import { type PageProps } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import {
    AlertTriangle,
    Bell,
    BellRing,
    CalendarClock,
    CheckCheck,
    ChevronRight,
    ClipboardCheck,
    Clock,
    Fuel,
    Ship,
} from 'lucide-react';
import { useState } from 'react';

const TYPE_META: Record<string, { label: string; tone: BadgeTone; icon: any }> = {
    dokumen_mendekati_kedaluwarsa: { label: 'Reminder Dokumen', tone: 'warning', icon: CalendarClock },
    dokumen_kedaluwarsa: { label: 'Dokumen Kedaluwarsa', tone: 'danger', icon: AlertTriangle },
    endorsement_jatuh_tempo: { label: 'Endorsement', tone: 'warning', icon: CalendarClock },
    endorsement_kedaluwarsa: { label: 'Endorsement Jatuh Tempo', tone: 'danger', icon: AlertTriangle },
    berkas_perjalanan_belum_lengkap: { label: 'Berkas Perjalanan', tone: 'warning', icon: ClipboardCheck },
    dokumen_membutuhkan_revisi: { label: 'Revisi Dokumen', tone: 'warning', icon: AlertTriangle },
    persetujuan_internal_menunggu: { label: 'Persetujuan', tone: 'info', icon: ClipboardCheck },
    jadwal_keberangkatan_mendekat: { label: 'Keberangkatan', tone: 'info', icon: Ship },
    perjalanan_terlambat: { label: 'Keterlambatan', tone: 'danger', icon: Fuel },
    laporan_kedatangan_belum_diisi: { label: 'Laporan Kedatangan', tone: 'warning', icon: ClipboardCheck },
    penutupan_perjalanan_belum_selesai: { label: 'Penutupan', tone: 'warning', icon: ClipboardCheck },
};

// Tekstur grain halus untuk panel hero, senada dengan login, sidebar,
// dan dashboard.
const GRAIN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E")`;

const EASE = 'cubic-bezier(0.22,1,0.36,1)';

// Kepala kelompok hari: label mono + jumlah + garis gradien memudar,
// senada dengan kepala seksi bernomor di dashboard.
function GroupHeader({ label, count }: { label: string; count: number }) {
    return (
        <div className="mb-2.5 flex items-center gap-2.5">
            <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                {label}
            </h2>
            <span className="rounded-full bg-appbg px-1.5 py-0.5 font-mono text-[10px] font-semibold leading-none text-muted">
                {count}
            </span>
            <div
                aria-hidden="true"
                className="h-px min-w-[1rem] flex-1 bg-gradient-to-r from-hairline via-hairline/60 to-transparent"
            />
        </div>
    );
}

export default function NotificationsIndex({
    notifications,
    filter,
    counts,
    due,
}: PageProps<{
    notifications: Array<Record<string, any>>;
    filter: string;
    counts: { semua: number; unread: number; reminder: number };
    due: Array<Record<string, any>>;
}>) {
    const [busy, setBusy] = useState(false);

    // Filter kategori pada panel reminder (murni di klien, tanpa round-trip
    // ke server, karena datanya sudah dikirim lengkap lewat props).
    const [dueFilter, setDueFilter] = useState<'all' | 'expired' | 'urgent' | 'safe'>('all');

    const tabs: Array<{ key: string; label: string; count?: number; icon: any }> = [
        { key: 'semua', label: 'Semua', count: counts.semua, icon: Bell },
        { key: 'unread', label: 'Belum Dibaca', count: counts.unread, icon: BellRing },
        { key: 'reminder', label: 'Reminder Dokumen', count: counts.reminder, icon: CalendarClock },
        { key: 'workflow', label: 'Workflow & Operasional', icon: ClipboardCheck },
    ];

    const markAll = () => {
        setBusy(true);
        router.post('/notifikasi/read-all', {}, {
            onFinish: () => setBusy(false),
            preserveScroll: true,
        });
    };

    // ===== Kelompok umur notifikasi (Hari Ini / Kemarin / dst.) =====
    // created_at Laravel berformat "YYYY-MM-DD HH:mm:ss"; spasi diganti "T"
    // agar aman diparse Date() di semua browser (termasuk Safari).
    const bucketOf = (raw: any): string => {
        const t = new Date(String(raw ?? '').replace(' ', 'T')).getTime();
        if (Number.isNaN(t)) return 'Riwayat';
        const now = new Date();
        const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        if (t >= startToday) return 'Hari Ini';
        if (t >= startToday - 86400000) return 'Kemarin';
        if (t >= startToday - 7 * 86400000) return '7 Hari Terakhir';
        return 'Riwayat';
    };

    const groups: Array<{ label: string; items: Array<Record<string, any>> }> = [];
    notifications.forEach((n) => {
        const label = bucketOf(n.created_at);
        const current = groups[groups.length - 1];
        if (current && current.label === label) current.items.push(n);
        else groups.push({ label, items: [n] });
    });

    // ===== Reminder diurutkan dari yang paling mendesak =====
    const urgencyOf = (item: Record<string, any>): number => {
        const d = daysUntil(item.expiry);
        return d === null ? Number.POSITIVE_INFINITY : d;
    };
    const sortedDue = [...due].sort((a, b) => {
        const ua = urgencyOf(a);
        const ub = urgencyOf(b);
        return ua === ub ? 0 : ua - ub;
    });
    const dueExpired = due.filter((d) => (daysUntil(d.expiry) ?? 0) < 0).length;

    // ===== Kategori urgensi reminder (kosakata sama dengan legenda kartu) =====
    const dueBucket = (item: Record<string, any>): 'expired' | 'urgent' | 'safe' => {
        const d = daysUntil(item.expiry);
        if (d === null) return 'safe';
        if (d < 0) return 'expired';
        if (d <= 7) return 'urgent';
        return 'safe';
    };
    const dueCounts = {
        all: sortedDue.length,
        expired: sortedDue.filter((x) => dueBucket(x) === 'expired').length,
        urgent: sortedDue.filter((x) => dueBucket(x) === 'urgent').length,
        safe: sortedDue.filter((x) => dueBucket(x) === 'safe').length,
    };
    const filteredDue =
        dueFilter === 'all' ? sortedDue : sortedDue.filter((x) => dueBucket(x) === dueFilter);
    const dueTabs: Array<{ key: 'all' | 'expired' | 'urgent' | 'safe'; label: string }> = [
        { key: 'all', label: 'Semua' },
        { key: 'expired', label: 'Kedaluwarsa' },
        { key: 'urgent', label: 'Mendesak' },
        { key: 'safe', label: 'Belum Mendesak' },
    ];

    // Warna rel kiri & chip ikon mengikuti tone notifikasi (pola ring-inset
    // yang sama dengan daftar reminder di dashboard).
    const railTone = (tone: BadgeTone): string => {
        switch (tone) {
            case 'danger': return 'bg-primary';
            case 'warning': return 'bg-warn';
            case 'info': return 'bg-maritime';
            case 'success': return 'bg-ok';
            default: return 'bg-stone';
        }
    };
    const chipTone = (tone: BadgeTone): string => {
        switch (tone) {
            case 'danger': return 'bg-primary/10 text-primary ring-primary/20';
            case 'warning': return 'bg-warn/10 text-warn ring-warn/20';
            case 'info': return 'bg-maritime/10 text-maritime ring-maritime/20';
            case 'success': return 'bg-ok/10 text-ok ring-ok/20';
            default: return 'bg-appbg text-muted ring-hairline';
        }
    };

    // Panel reminder kini menempel mengikuti scroll memakai position: sticky
    // murni CSS (xl:sticky xl:top-24), persis seperti rel pratinjau register
    // pada halaman unggah dokumen: tanpa pengukuran JS, tanpa state dok, dan
    // tanpa bayangan tambahan saat menempel. self-start menjaga kartu tidak
    // meregang mengikuti tinggi kolom daftar sehingga sticky tetap bekerja.

    return (
        <Authenticated>
            <Head title="Notifikasi & Reminder" />

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

            {/* ===== 00 · Pita Pusat Notifikasi =====
                Panel gelap burgundy-merah dengan aurora, grain, rim emas,
                dan judul dinamis: jumlah belum dibaca langsung terbaca
                sebelum menelusuri daftar. */}
            <section
                className="bt-anim relative mb-7 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-sidebar via-primary-hover to-primary shadow-[0_24px_60px_-24px_rgba(69,16,22,0.55)]"
                style={{ animation: `bt-rise 0.55s ${EASE} both` }}
            >
                {/* Kedalaman panel: cahaya merah kiri-atas, cahaya emas
                    kanan-bawah, grain kertas, dan lonceng samar. */}
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
                    <BellRing
                        aria-hidden="true"
                        size={180}
                        strokeWidth={1.5}
                        className="pointer-events-none absolute -right-8 -top-10 rotate-[8deg] text-white/[0.05]"
                    />
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
                            Pusat Notifikasi
                        </p>
                        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-cream sm:text-3xl">
                            {counts.unread > 0 ? (
                                <>
                                    <span className="text-gold">{counts.unread}</span> notifikasi
                                    menunggu dibaca.
                                </>
                            ) : (
                                'Semua notifikasi sudah dibaca.'
                            )}
                        </h1>
                        <p className="mt-2 max-w-xl text-sm leading-relaxed text-cream/70">
                            Pengingat dokumen, persetujuan, dan kejadian operasional.
                            Notifikasi eksternal (email/WA) belum diaktifkan.
                        </p>
                    </div>

                    {/* Aksi massal: tandai semua sebagai dibaca; notifikasi
                        adalah histori permanen sehingga tidak bisa dihapus. */}
                    <div className="flex flex-col gap-2.5 sm:flex-row xl:shrink-0">
                        {counts.unread > 0 && (
                            <button
                                type="button"
                                onClick={markAll}
                                disabled={busy}
                                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-cream px-4 py-2.5 text-sm font-semibold text-sidebar shadow-[0_10px_24px_-12px_rgba(0,0,0,0.5)] transition-colors duration-200 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 disabled:opacity-50"
                            >
                                <CheckCheck size={16} /> Tandai semua dibaca
                            </button>
                        )}
                    </div>
                </div>

                {/* Empat metrik ringkas: cermin angka di atas daftar. */}
                <div className="relative grid grid-cols-2 gap-3 border-t border-white/[0.08] p-6 pt-5 sm:gap-4 lg:grid-cols-4 lg:p-7 lg:pt-6">
                    <div className="min-w-0 rounded-xl border border-white/[0.12] bg-white/[0.07] p-4 backdrop-blur-sm">
                        <p className="truncate font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-cream/60">
                            Belum Dibaca
                        </p>
                        <p
                            className={classNames(
                                'mt-2 text-2xl font-semibold tabular-nums tracking-tight',
                                counts.unread > 0 ? 'text-gold' : 'text-cream',
                            )}
                        >
                            {counts.unread}
                        </p>
                        <p className="mt-2 truncate text-[11px] text-cream/60">
                            {counts.unread > 0 ? 'menunggu ditindak' : 'tidak ada tumpukan'}
                        </p>
                    </div>
                    <div className="min-w-0 rounded-xl border border-white/[0.12] bg-white/[0.07] p-4 backdrop-blur-sm">
                        <p className="truncate font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-cream/60">
                            Total Notifikasi
                        </p>
                        <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-cream">
                            {counts.semua}
                        </p>
                        <p className="mt-2 truncate text-[11px] text-cream/60">
                            termasuk yang sudah dibaca
                        </p>
                    </div>
                    <div className="min-w-0 rounded-xl border border-white/[0.12] bg-white/[0.07] p-4 backdrop-blur-sm">
                        <p className="truncate font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-cream/60">
                            Reminder Dokumen
                        </p>
                        <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-cream">
                            {counts.reminder}
                        </p>
                        <p className="mt-2 truncate text-[11px] text-cream/60">
                            dokumen &amp; endorsement
                        </p>
                    </div>
                    <div className="min-w-0 rounded-xl border border-white/[0.12] bg-white/[0.07] p-4 backdrop-blur-sm">
                        <p className="truncate font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-cream/60">
                            Dokumen Jatuh Tempo
                        </p>
                        <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-cream">
                            {due.length}
                        </p>
                        <p className="mt-2 truncate text-[11px] text-cream/60">
                            {dueExpired > 0 ? `${dueExpired} sudah kedaluwarsa` : 'masa berlaku terdekat'}
                        </p>
                    </div>
                </div>
            </section>

            {/* ===== Filter: tab pil berikon dengan jumlah ===== */}
            <nav
                aria-label="Filter notifikasi"
                className="bt-anim mb-5 flex flex-wrap gap-2"
                style={{ animation: `bt-rise 0.45s ${EASE} 70ms both` }}
            >
                {tabs.map((t) => {
                    const TabIcon = t.icon;
                    const active = filter === t.key;
                    return (
                        <Link
                            key={t.key}
                            href={`/notifikasi?filter=${t.key}`}
                            className={classNames(
                                'inline-flex items-center gap-2 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors duration-200',
                                active
                                    ? 'border-primary bg-primary text-white shadow-[0_10px_24px_-12px_rgba(193,18,31,0.55)]'
                                    : 'border-hairline bg-white text-muted hover:border-primary/40 hover:text-ink',
                            )}
                        >
                            <TabIcon size={14} />
                            {t.label}
                            {t.count !== undefined && (
                                <span
                                    className={classNames(
                                        'rounded-full px-1.5 py-0.5 font-mono text-[10px] font-semibold leading-none',
                                        active ? 'bg-white/20 text-white' : 'bg-appbg text-muted',
                                    )}
                                >
                                    {t.count}
                                </span>
                            )}
                        </Link>
                    );
                })}
            </nav>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
                {/* ===== 01 · Aliran notifikasi, dikelompokkan per hari ===== */}
                <div
                    className="bt-anim min-w-0 space-y-6 xl:col-span-2"
                    style={{ animation: `bt-rise 0.45s ${EASE} 120ms both` }}
                >
                    {notifications.length === 0 ? (
                        <EmptyState
                            icon={Bell}
                            title="Tidak ada notifikasi"
                            description="Notifikasi baru akan muncul di sini seiring aktivitas dokumen, persetujuan, dan perjalanan armada."
                        />
                    ) : (
                        groups.map((g) => (
                            <section key={g.label}>
                                <GroupHeader label={g.label} count={g.items.length} />
                                <ul className="space-y-2.5">
                                    {g.items.map((n) => {
                                        const meta = TYPE_META[n.notification_type] ?? {
                                            label: n.notification_type,
                                            tone: 'neutral' as BadgeTone,
                                            icon: Bell,
                                        };
                                        const Icon = meta.icon;
                                        return (
                                            <li
                                                key={n.id}
                                                className={classNames(
                                                    'relative overflow-hidden rounded-xl border bg-white p-4 shadow-[0_1px_2px_rgba(28,27,26,0.04),0_12px_32px_-24px_rgba(28,27,26,0.18)] transition duration-200 hover:-translate-y-0.5 hover:border-primary/30',
                                                    n.read_status
                                                        ? 'border-hairline'
                                                        : 'border-primary/30 bg-primary-tint/30',
                                                )}
                                            >
                                                {/* Rel aksen kiri: jenis masalah
                                                    terbaca sekilas tanpa
                                                    membaca teks. */}
                                                <span
                                                    aria-hidden="true"
                                                    className={classNames(
                                                        'absolute inset-y-0 left-0 w-1',
                                                        railTone(meta.tone),
                                                        n.read_status ? 'opacity-40' : '',
                                                    )}
                                                />
                                                <div className="flex items-start gap-3.5 ps-2.5">
                                                    <span
                                                        className={classNames(
                                                            'mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset',
                                                            chipTone(meta.tone),
                                                        )}
                                                    >
                                                        <Icon size={17} />
                                                    </span>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                                            <p className="text-sm font-semibold leading-snug text-ink">
                                                                {n.title}
                                                            </p>
                                                            <Badge tone={meta.tone}>{meta.label}</Badge>
                                                            {!n.read_status && (
                                                                <span className="rounded-full bg-primary px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-white">
                                                                    Baru
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="mt-1 text-sm leading-relaxed text-muted">
                                                            {n.message}
                                                        </p>
                                                        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-hairline pt-2.5">
                                                            <p className="inline-flex items-center gap-1.5 font-mono text-[11px] text-muted">
                                                                <Clock size={12} />{' '}
                                                                {formatDateTime(n.created_at)}
                                                            </p>
                                                            <div className="flex flex-wrap items-center gap-1.5">
                                                                {n.link && (
                                                                    <Link
                                                                        href={n.link}
                                                                        className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-primary/25 bg-primary-tint/60 px-2.5 py-1 text-xs font-semibold text-primary transition-colors duration-150 hover:border-primary/50 hover:bg-primary-tint"
                                                                    >
                                                                        Buka <ChevronRight size={13} />
                                                                    </Link>
                                                                )}
                                                                {!n.read_status && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            router.post(
                                                                                `/notifikasi/${n.id}/read`,
                                                                                {},
                                                                                { preserveScroll: true },
                                                                            )
                                                                        }
                                                                        className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg px-2 py-1 text-xs font-medium text-muted transition-colors duration-150 hover:bg-appbg hover:text-ink"
                                                                    >
                                                                        <CheckCheck size={13} /> Tandai dibaca
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </section>
                        ))
                    )}
                </div>

                {/* ===== 02 · Panel reminder dokumen =====
                    Menempel di bawah topbar pada layar xl ke atas
                    (xl:top-24), sama seperti pratinjau register pada
                    halaman unggah dokumen: menempel rapi saat digulir
                    tanpa bayangan tambahan. Tinggi isi tetap dibatasi
                    max-h + scroll internal sehingga panel tidak ikut
                    memanjang. */}
                <div
                    className="bt-anim self-start xl:sticky xl:top-24"
                    style={{ animation: `bt-rise 0.45s ${EASE} 170ms both` }}
                >
                    <Card
                        title="Reminder Dokumen Aktif"
                        description="Masa berlaku terdekat, paling mendesak di atas"
                        actions={
                            <>
                                <span
                                    className={classNames(
                                        'rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold ring-1 ring-inset',
                                        dueFilter === 'expired'
                                            ? 'bg-primary/10 text-primary ring-primary/25'
                                            : dueFilter === 'safe'
                                              ? 'bg-appbg text-muted ring-hairline'
                                              : 'bg-warn/10 text-warn ring-warn/25',
                                    )}
                                >
                                    {filteredDue.length}
                                </span>
                                <Link
                                    href="/dokumen?validity=expiring_soon"
                                    className="text-xs font-medium text-primary transition-colors duration-150 hover:underline"
                                >
                                    Kelola →
                                </Link>
                            </>
                        }
                    >
                        {sortedDue.length === 0 ? (
                            <EmptyState
                                icon={CalendarClock}
                                title="Tidak ada dokumen jatuh tempo"
                                description="Reminder akan muncul otomatis saat masa berlaku dokumen mendekat."
                            />
                        ) : (
                            <>
                                {/* Filter kategori: murni di klien, jumlah per
                                    kategori dihitung dari data yang sama. */}
                                <div
                                    role="group"
                                    aria-label="Filter reminder dokumen"
                                    className="mb-3 flex flex-wrap gap-1.5"
                                >
                                    {dueTabs.map((t) => {
                                        const active = dueFilter === t.key;
                                        return (
                                            <button
                                                key={t.key}
                                                type="button"
                                                onClick={() => setDueFilter(t.key)}
                                                className={classNames(
                                                    'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                                                    active
                                                        ? 'border-primary bg-primary text-white'
                                                        : 'border-hairline bg-white text-muted hover:border-primary/40 hover:text-ink',
                                                )}
                                            >
                                                {t.label}
                                                <span
                                                    className={classNames(
                                                        'font-mono text-[10px] font-semibold leading-none',
                                                        active ? 'text-white/75' : 'text-muted',
                                                    )}
                                                >
                                                    {dueCounts[t.key]}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                                {filteredDue.length === 0 ? (
                                    <div className="flex min-h-[6rem] items-center justify-center rounded-xl border border-dashed border-hairline bg-appbg/50 px-4 py-6 text-center text-xs text-muted">
                                        Tidak ada reminder pada kategori ini.
                                    </div>
                                ) : (
                                <div className="bt-scroll max-h-[24rem] overflow-y-auto overscroll-contain pe-1">
                                    <ul className="space-y-2.5">
                                        {filteredDue.map((d, i) => {
                                            const days = daysUntil(d.expiry);
                                            const expired = days !== null && days < 0;
                                            const urgent = !expired && days !== null && days <= 7;
                                            return (
                                                <li
                                                    key={i}
                                                    className={classNames(
                                                        'flex items-start gap-3 rounded-xl border p-3 transition-colors duration-200',
                                                        expired
                                                            ? 'border-primary/30 bg-primary-tint/40'
                                                            : 'border-hairline hover:border-warn/40',
                                                    )}
                                                >
                                                    {days === null ? (
                                                        <span className="mt-0.5 flex h-11 w-14 shrink-0 items-center justify-center rounded-lg bg-appbg text-muted ring-1 ring-inset ring-hairline">
                                                            <CalendarClock size={16} />
                                                        </span>
                                                    ) : (
                                                        <span
                                                            className={classNames(
                                                                'mt-0.5 flex h-11 w-14 shrink-0 flex-col items-center justify-center rounded-lg ring-1 ring-inset',
                                                                expired
                                                                    ? 'bg-primary/10 text-primary ring-primary/20'
                                                                    : urgent
                                                                      ? 'bg-warn/10 text-warn ring-warn/20'
                                                                      : 'bg-appbg text-muted ring-hairline',
                                                            )}
                                                        >
                                                            <span className="text-base font-semibold leading-none tabular-nums">
                                                                {Math.abs(days)}
                                                            </span>
                                                            <span className="mt-1 font-mono text-[9px] font-medium uppercase tracking-[0.06em]">
                                                                {expired ? 'hari lalu' : 'hari lagi'}
                                                            </span>
                                                        </span>
                                                    )}
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-sm font-medium leading-snug text-ink">
                                                            {d.message}
                                                        </p>
                                                        <p className="mt-1 truncate font-mono text-[11px] text-muted">
                                                            berlaku s.d. {formatDate(d.expiry)}
                                                        </p>
                                                        {d.refType === 'document' && (
                                                            <Link
                                                                href={`/dokumen/${d.refId}`}
                                                                className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-primary transition-colors duration-150 hover:underline"
                                                            >
                                                                Buka dokumen{' '}
                                                                <ChevronRight size={12} />
                                                            </Link>
                                                        )}
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                                )}
                                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-hairline pt-3">
                                    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                                        <span
                                            aria-hidden="true"
                                            className="h-1.5 w-1.5 rounded-full bg-primary"
                                        />
                                        kedaluwarsa
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                                        <span
                                            aria-hidden="true"
                                            className="h-1.5 w-1.5 rounded-full bg-warn"
                                        />
                                        mendesak · 7 hari ke depan
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                                        <span
                                            aria-hidden="true"
                                            className="h-1.5 w-1.5 rounded-full bg-stone"
                                        />
                                        belum mendesak
                                    </span>
                                </div>
                            </>
                        )}
                    </Card>
                </div>
            </div>
        </Authenticated>
    );
}