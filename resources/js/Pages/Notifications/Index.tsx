import Badge, { type BadgeTone } from '@/Components/ui/Badge';
import Card from '@/Components/ui/Card';
import EmptyState from '@/Components/ui/EmptyState';
import Authenticated from '@/Layouts/AuthenticatedLayout';
import { classNames, daysUntil, formatDate, formatDateTime } from '@/lib/format';
import { type PageProps } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Button, Row, Col, Statistic } from 'antd';
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

const GRAIN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E")`;

const EASE = 'cubic-bezier(0.22,1,0.36,1)';

function GroupHeader({ label, count }: { label: string; count: number }) {
    return (
        <div className="mb-2.5 flex items-center gap-2.5">
            <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8A8580]">
                {label}
            </h2>
            <span className="rounded-full bg-[#FAF7F2] px-1.5 py-0.5 font-mono text-[10px] font-semibold leading-none text-[#8A8580]">
                {count}
            </span>
            <div
                aria-hidden="true"
                className="h-px min-w-[1rem] flex-1"
                style={{ background: 'linear-gradient(to right, #E7E1D9, rgba(231,225,217,0.6), transparent)' }}
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

    const railTone = (tone: BadgeTone): string => {
        switch (tone) {
            case 'danger': return '#C1121F';
            case 'warning': return '#D99A2B';
            case 'info': return '#1E4668';
            case 'success': return '#2F8F68';
            default: return '#8A8580';
        }
    };
    const chipStyle = (tone: BadgeTone): React.CSSProperties => {
        switch (tone) {
            case 'danger': return { background: '#C1121F1A', color: '#C1121F', border: '1px solid #C1121F33' };
            case 'warning': return { background: '#D99A2B1A', color: '#D99A2B', border: '1px solid #D99A2B33' };
            case 'info': return { background: '#1E46681A', color: '#1E4668', border: '1px solid #1E466833' };
            case 'success': return { background: '#2F8F681A', color: '#2F8F68', border: '1px solid #2F8F6833' };
            default: return { background: '#FAF7F2', color: '#8A8580', border: '1px solid #E7E1D9' };
        }
    };

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

            <section
                className="bt-anim relative mb-7 overflow-hidden rounded-2xl border border-[#E7E1D9] bg-white shadow-[0_1px_3px_rgba(28,27,26,0.04),0_8px_24px_-8px_rgba(28,27,26,0.06)]"
                style={{
                    animation: `bt-rise 0.55s ${EASE} both`,
                }}
            >
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 overflow-hidden"
                >
                    <div
                        className="absolute inset-0 opacity-[0.02]"
                        style={{ backgroundImage: GRAIN }}
                    />
                    <BellRing
                        aria-hidden="true"
                        size={180}
                        strokeWidth={1.5}
                        className="pointer-events-none absolute -right-8 -top-10 text-[#1C1B1A]/[0.03]"
                        style={{ transform: 'rotate(8deg)' }}
                    />
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
                                className="bt-anim h-2 w-2 rounded-full"
                                style={{ background: '#D4A96A', animation: 'bt-pulse-dot 2.4s ease-in-out infinite' }}
                            />
                            Pusat Notifikasi
                        </p>
                        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-[#1C1B1A] sm:text-3xl">
                            {counts.unread > 0 ? (
                                <>
                                    <span className="text-[#C1121F]">{counts.unread}</span> notifikasi
                                    menunggu dibaca.
                                </>
                            ) : (
                                'Semua notifikasi sudah dibaca.'
                            )}
                        </h1>
                        <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#8A8580]">
                            Pengingat dokumen, persetujuan, dan kejadian operasional.
                            Notifikasi eksternal (email/WA) belum diaktifkan.
                        </p>
                    </div>

                    <div className="flex flex-col gap-2.5 sm:flex-row xl:shrink-0">
                        {counts.unread > 0 && (
                            <Button
                                type="primary"
                                onClick={markAll}
                                disabled={busy}
                                icon={<CheckCheck size={16} />}
                            >
                                Tandai semua dibaca
                            </Button>
                        )}
                    </div>
                </div>

                <div className="relative grid grid-cols-2 gap-3 border-t border-[#E7E1D9] p-6 pt-5 sm:gap-4 lg:grid-cols-4 lg:p-7 lg:pt-6">
                    <div className="min-w-0 rounded-xl border border-[#E7E1D9] bg-[#FAF7F2] p-4">
                        <p className="truncate font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-[#8A8580]">
                            Belum Dibaca
                        </p>
                        <p
                            className="mt-2 text-2xl font-semibold tabular-nums tracking-tight"
                            style={{ color: counts.unread > 0 ? '#D4A96A' : '#1C1B1A' }}
                        >
                            {counts.unread}
                        </p>
                        <p className="mt-2 truncate text-[11px] text-[#8A8580]">
                            {counts.unread > 0 ? 'menunggu ditindak' : 'tidak ada tumpukan'}
                        </p>
                    </div>
                    <div className="min-w-0 rounded-xl border border-[#E7E1D9] bg-[#FAF7F2] p-4">
                        <p className="truncate font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-[#8A8580]">
                            Total Notifikasi
                        </p>
                        <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-[#1C1B1A]">
                            {counts.semua}
                        </p>
                        <p className="mt-2 truncate text-[11px] text-[#8A8580]">
                            termasuk yang sudah dibaca
                        </p>
                    </div>
                    <div className="min-w-0 rounded-xl border border-[#E7E1D9] bg-[#FAF7F2] p-4">
                        <p className="truncate font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-[#8A8580]">
                            Reminder Dokumen
                        </p>
                        <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-[#1C1B1A]">
                            {counts.reminder}
                        </p>
                        <p className="mt-2 truncate text-[11px] text-[#8A8580]">
                            dokumen &amp; endorsement
                        </p>
                    </div>
                    <div className="min-w-0 rounded-xl border border-[#E7E1D9] bg-[#FAF7F2] p-4">
                        <p className="truncate font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-[#8A8580]">
                            Dokumen Jatuh Tempo
                        </p>
                        <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-[#1C1B1A]">
                            {due.length}
                        </p>
                        <p className="mt-2 truncate text-[11px] text-[#8A8580]">
                            {dueExpired > 0 ? `${dueExpired} sudah kedaluwarsa` : 'masa berlaku terdekat'}
                        </p>
                    </div>
                </div>
            </section>

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
                            className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors duration-200"
                            style={active
                                ? { borderColor: '#C1121F', background: '#C1121F', color: '#FFFFFF', boxShadow: '0 10px 24px -12px rgba(193,18,31,0.55)' }
                                : { borderColor: '#E7E1D9', background: '#FFFFFF', color: '#8A8580' }
                            }
                        >
                            <TabIcon size={14} />
                            {t.label}
                            {t.count !== undefined && (
                                <span
                                    className="rounded-full px-1.5 py-0.5 font-mono text-[10px] font-semibold leading-none"
                                    style={active
                                        ? { background: 'rgba(255,255,255,0.2)', color: '#FFFFFF' }
                                        : { background: '#FAF7F2', color: '#8A8580' }
                                    }
                                >
                                    {t.count}
                                </span>
                            )}
                        </Link>
                    );
                })}
            </nav>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
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
                                                className="relative overflow-hidden rounded-xl border bg-white p-4 transition duration-200"
                                                style={{
                                                    borderColor: n.read_status ? '#E7E1D9' : 'rgba(193,18,31,0.3)',
                                                    background: n.read_status ? '#FFFFFF' : 'rgba(193,18,31,0.03)',
                                                    boxShadow: '0 1px 2px rgba(28,27,26,0.04), 0 12px 32px -24px rgba(28,27,26,0.18)',
                                                }}
                                            >
                                                <span
                                                    aria-hidden="true"
                                                    className="absolute inset-y-0 left-0 w-1"
                                                    style={{
                                                        background: railTone(meta.tone),
                                                        opacity: n.read_status ? 0.4 : 1,
                                                    }}
                                                />
                                                <div className="flex items-start gap-3.5 ps-2.5">
                                                    <span
                                                        className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                                                        style={chipStyle(meta.tone)}
                                                    >
                                                        <Icon size={17} />
                                                    </span>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                                            <p className="text-sm font-semibold leading-snug text-[#1C1B1A]">
                                                                {n.title}
                                                            </p>
                                                            <Badge tone={meta.tone}>{meta.label}</Badge>
                                                            {!n.read_status && (
                                                                <span className="rounded-full px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-white" style={{ background: '#C1121F' }}>
                                                                    Baru
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="mt-1 text-sm leading-relaxed text-[#8A8580]">
                                                            {n.message}
                                                        </p>
                                                        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t pt-2.5" style={{ borderColor: '#E7E1D9' }}>
                                                            <p className="inline-flex items-center gap-1.5 font-mono text-[11px] text-[#8A8580]">
                                                                <Clock size={12} />{' '}
                                                                {formatDateTime(n.created_at)}
                                                            </p>
                                                            <div className="flex flex-wrap items-center gap-1.5">
                                                                {n.link && (
                                                                    <Link
                                                                        href={n.link}
                                                                        className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors duration-150"
                                                                        style={{
                                                                            borderColor: 'rgba(193,18,31,0.25)',
                                                                            background: 'rgba(193,18,31,0.06)',
                                                                            color: '#C1121F',
                                                                        }}
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
                                                                        className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg px-2 py-1 text-xs font-medium text-[#8A8580] transition-colors duration-150 hover:bg-[#FAF7F2] hover:text-[#1C1B1A]"
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
                                    className="rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold"
                                    style={
                                        dueFilter === 'expired'
                                            ? { background: '#C1121F1A', color: '#C1121F', border: '1px solid #C1121F40' }
                                            : dueFilter === 'safe'
                                              ? { background: '#FAF7F2', color: '#8A8580', border: '1px solid #E7E1D9' }
                                              : { background: '#D99A2B1A', color: '#D99A2B', border: '1px solid #D99A2B40' }
                                    }
                                >
                                    {filteredDue.length}
                                </span>
                                <Link
                                    href="/dokumen?validity=expiring_soon"
                                    className="text-xs font-medium transition-colors duration-150 hover:underline"
                                    style={{ color: '#C1121F' }}
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
                                                className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors duration-200"
                                                style={active
                                                    ? { borderColor: '#C1121F', background: '#C1121F', color: '#FFFFFF' }
                                                    : { borderColor: '#E7E1D9', background: '#FFFFFF', color: '#8A8580' }
                                                }
                                            >
                                                {t.label}
                                                <span
                                                    className="font-mono text-[10px] font-semibold leading-none"
                                                    style={{ color: active ? 'rgba(255,255,255,0.75)' : '#8A8580' }}
                                                >
                                                    {dueCounts[t.key]}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                                {filteredDue.length === 0 ? (
                                    <div className="flex min-h-[6rem] items-center justify-center rounded-xl border border-dashed px-4 py-6 text-center text-xs" style={{ borderColor: '#E7E1D9', background: 'rgba(250,247,242,0.5)', color: '#8A8580' }}>
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
                                                    className="flex items-start gap-3 rounded-xl border p-3 transition-colors duration-200"
                                                    style={expired
                                                        ? { borderColor: 'rgba(193,18,31,0.3)', background: 'rgba(193,18,31,0.04)' }
                                                        : { borderColor: '#E7E1D9' }
                                                    }
                                                >
                                                    {days === null ? (
                                                        <span className="mt-0.5 flex h-11 w-14 shrink-0 items-center justify-center rounded-lg text-[#8A8580]" style={{ background: '#FAF7F2', border: '1px solid #E7E1D9' }}>
                                                            <CalendarClock size={16} />
                                                        </span>
                                                    ) : (
                                                        <span
                                                            className="mt-0.5 flex h-11 w-14 shrink-0 flex-col items-center justify-center rounded-lg"
                                                            style={expired
                                                                ? { background: '#C1121F1A', color: '#C1121F', border: '1px solid #C1121F33' }
                                                                : urgent
                                                                  ? { background: '#D99A2B1A', color: '#D99A2B', border: '1px solid #D99A2B33' }
                                                                  : { background: '#FAF7F2', color: '#8A8580', border: '1px solid #E7E1D9' }
                                                            }
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
                                                        <p className="text-sm font-medium leading-snug text-[#1C1B1A]">
                                                            {d.message}
                                                        </p>
                                                        <p className="mt-1 truncate font-mono text-[11px] text-[#8A8580]">
                                                            berlaku s.d. {formatDate(d.expiry)}
                                                        </p>
                                                        {d.refType === 'document' && (
                                                            <Link
                                                                href={`/dokumen/${d.refId}`}
                                                                className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium transition-colors duration-150 hover:underline"
                                                                style={{ color: '#C1121F' }}
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
                                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t pt-3" style={{ borderColor: '#E7E1D9' }}>
                                    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[#8A8580]">
                                        <span
                                            aria-hidden="true"
                                            className="h-1.5 w-1.5 rounded-full"
                                            style={{ background: '#C1121F' }}
                                        />
                                        kedaluwarsa
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[#8A8580]">
                                        <span
                                            aria-hidden="true"
                                            className="h-1.5 w-1.5 rounded-full"
                                            style={{ background: '#D99A2B' }}
                                        />
                                        mendesak · 7 hari ke depan
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[#8A8580]">
                                        <span
                                            aria-hidden="true"
                                            className="h-1.5 w-1.5 rounded-full"
                                            style={{ background: '#8A8580' }}
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
