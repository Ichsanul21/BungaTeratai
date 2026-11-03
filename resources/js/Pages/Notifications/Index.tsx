import Badge, { type BadgeTone } from '@/Components/ui/Badge';
import Card from '@/Components/ui/Card';
import EmptyState from '@/Components/ui/EmptyState';
import PageHeader from '@/Components/ui/PageHeader';
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
            <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5B6474]">
                {label}
            </h2>
            <span className="rounded-full bg-[#F5F7FA] px-1.5 py-0.5 font-mono text-[10px] font-semibold leading-none text-[#5B6474]">
                {count}
            </span>
            <div
                aria-hidden="true"
                className="h-px min-w-[1rem] flex-1"
                style={{ background: 'linear-gradient(to right, #E3E8F0, rgba(227,232,240,0.6), transparent)' }}
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
            case 'danger': return '#BA0C2F';
            case 'warning': return '#B45309';
            case 'info': return '#00205B';
            case 'success': return '#15803D';
            default: return '#5B6474';
        }
    };
    const chipStyle = (tone: BadgeTone): React.CSSProperties => {
        switch (tone) {
            case 'danger': return { background: '#BA0C2F1A', color: '#BA0C2F', border: '1px solid #BA0C2F33' };
            case 'warning': return { background: '#B453091A', color: '#B45309', border: '1px solid #B4530933' };
            case 'info': return { background: '#00205B1A', color: '#00205B', border: '1px solid #00205B33' };
            case 'success': return { background: '#15803D1A', color: '#15803D', border: '1px solid #15803D33' };
            default: return { background: '#F5F7FA', color: '#5B6474', border: '1px solid #E3E8F0' };
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
                .bt-scroll { scrollbar-width: thin; scrollbar-color: rgba(17,24,39,0.22) transparent; }
                .bt-scroll::-webkit-scrollbar { width: 5px; }
                .bt-scroll::-webkit-scrollbar-thumb { background: rgba(17,24,39,0.2); border-radius: 9999px; }
                .bt-scroll::-webkit-scrollbar-track { background: transparent; }
                @media (prefers-reduced-motion: reduce) {
                    .bt-anim, .bt-anim * { animation: none !important; }
                }
            `}</style>

            <PageHeader
                eyebrow="Pusat Notifikasi"
                title={counts.unread > 0 ? `${counts.unread} notifikasi menunggu dibaca` : 'Semua notifikasi sudah dibaca'}
                description="Pengingat dokumen, persetujuan, dan kejadian operasional. Notifikasi eksternal (email/WA) belum diaktifkan."
                metrics={[
                    { label: 'Belum Dibaca', value: counts.unread, tone: counts.unread > 0 ? 'primary' : 'neutral', sub: counts.unread > 0 ? 'menunggu ditindak' : 'tidak ada tumpukan' },
                    { label: 'Total Notifikasi', value: counts.semua, sub: 'termasuk yang sudah dibaca' },
                    { label: 'Reminder Dokumen', value: counts.reminder, tone: 'warning', sub: 'dokumen & endorsement' },
                    { label: 'Jatuh Tempo', value: due.length, tone: dueExpired > 0 ? 'danger' : 'neutral', sub: dueExpired > 0 ? `${dueExpired} sudah kedaluwarsa` : 'masa berlaku terdekat' },
                ]}
                actions={
                    counts.unread > 0 && (
                        <Button
                            type="primary"
                            onClick={markAll}
                            disabled={busy}
                            icon={<CheckCheck size={16} />}
                        >
                            Tandai semua dibaca
                        </Button>
                    )
                }
            />

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[216px_minmax(0,1fr)_360px]">
            <nav
                aria-label="Filter notifikasi"
                className="bt-anim flex flex-wrap gap-2 xl:sticky xl:top-6 xl:flex-col xl:self-start"
                style={{ animation: `bt-rise 0.45s ${EASE} 70ms both` }}
            >
                <p className="hidden font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[#5B6474] xl:mb-1 xl:block">
                    Filter
                </p>
                {tabs.map((t) => {
                    const TabIcon = t.icon;
                    const active = filter === t.key;
                    return (
                        <Link
                            key={t.key}
                            href={`/notifikasi?filter=${t.key}`}
                            className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors duration-200 xl:w-full xl:justify-between"
                            style={active
                                ? { borderColor: '#BA0C2F', background: '#BA0C2F', color: '#FFFFFF', boxShadow: '0 10px 24px -12px rgba(186,12,47,0.55)' }
                                : { borderColor: '#E3E8F0', background: '#FFFFFF', color: '#5B6474' }
                            }
                        >
                            <TabIcon size={14} />
                            {t.label}
                            {t.count !== undefined && (
                                <span
                                    className="rounded-full px-1.5 py-0.5 font-mono text-[10px] font-semibold leading-none"
                                    style={active
                                        ? { background: 'rgba(255,255,255,0.2)', color: '#FFFFFF' }
                                        : { background: '#F5F7FA', color: '#5B6474' }
                                    }
                                >
                                    {t.count}
                                </span>
                            )}
                        </Link>
                    );
                })}
            </nav>

                <div
                    className="bt-anim min-w-0 space-y-6"
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
                                                    borderColor: n.read_status ? '#E3E8F0' : 'rgba(186,12,47,0.3)',
                                                    background: n.read_status ? '#FFFFFF' : 'rgba(186,12,47,0.03)',
                                                    boxShadow: '0 1px 2px rgba(17,24,39,0.04), 0 12px 32px -24px rgba(17,24,39,0.18)',
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
                                                            <p className="text-sm font-semibold leading-snug text-[#111827]">
                                                                {n.title}
                                                            </p>
                                                            <Badge tone={meta.tone}>{meta.label}</Badge>
                                                            {!n.read_status && (
                                                                <span className="rounded-full px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-white" style={{ background: '#BA0C2F' }}>
                                                                    Baru
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="mt-1 text-sm leading-relaxed text-[#5B6474]">
                                                            {n.message}
                                                        </p>
                                                        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t pt-2.5" style={{ borderColor: '#E3E8F0' }}>
                                                            <p className="inline-flex items-center gap-1.5 font-mono text-[11px] text-[#5B6474]">
                                                                <Clock size={12} />{' '}
                                                                {formatDateTime(n.created_at)}
                                                            </p>
                                                            <div className="flex flex-wrap items-center gap-1.5">
                                                                {n.link && (
                                                                    <Link
                                                                        href={n.link}
                                                                        className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors duration-150"
                                                                        style={{
                                                                            borderColor: 'rgba(186,12,47,0.25)',
                                                                            background: 'rgba(186,12,47,0.06)',
                                                                            color: '#BA0C2F',
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
                                                                        className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg px-2 py-1 text-xs font-medium text-[#5B6474] transition-colors duration-150 hover:bg-[#F5F7FA] hover:text-[#111827]"
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
                    className="bt-anim self-start xl:sticky xl:top-6"
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
                                            ? { background: '#BA0C2F1A', color: '#BA0C2F', border: '1px solid #BA0C2F40' }
                                            : dueFilter === 'safe'
                                              ? { background: '#F5F7FA', color: '#5B6474', border: '1px solid #E3E8F0' }
                                              : { background: '#B453091A', color: '#B45309', border: '1px solid #B4530940' }
                                    }
                                >
                                    {filteredDue.length}
                                </span>
                                <Link
                                    href="/dokumen?validity=expiring_soon"
                                    className="text-xs font-medium transition-colors duration-150 hover:underline"
                                    style={{ color: '#BA0C2F' }}
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
                                                    ? { borderColor: '#BA0C2F', background: '#BA0C2F', color: '#FFFFFF' }
                                                    : { borderColor: '#E3E8F0', background: '#FFFFFF', color: '#5B6474' }
                                                }
                                            >
                                                {t.label}
                                                <span
                                                    className="font-mono text-[10px] font-semibold leading-none"
                                                    style={{ color: active ? 'rgba(255,255,255,0.75)' : '#5B6474' }}
                                                >
                                                    {dueCounts[t.key]}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                                {filteredDue.length === 0 ? (
                                    <div className="flex min-h-[6rem] items-center justify-center rounded-xl border border-dashed px-4 py-6 text-center text-xs" style={{ borderColor: '#E3E8F0', background: 'rgba(245,247,250,0.5)', color: '#5B6474' }}>
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
                                                        ? { borderColor: 'rgba(186,12,47,0.3)', background: 'rgba(186,12,47,0.04)' }
                                                        : { borderColor: '#E3E8F0' }
                                                    }
                                                >
                                                    {days === null ? (
                                                        <span className="mt-0.5 flex h-11 w-14 shrink-0 items-center justify-center rounded-lg text-[#5B6474]" style={{ background: '#F5F7FA', border: '1px solid #E3E8F0' }}>
                                                            <CalendarClock size={16} />
                                                        </span>
                                                    ) : (
                                                        <span
                                                            className="mt-0.5 flex h-11 w-14 shrink-0 flex-col items-center justify-center rounded-lg"
                                                            style={expired
                                                                ? { background: '#BA0C2F1A', color: '#BA0C2F', border: '1px solid #BA0C2F33' }
                                                                : urgent
                                                                  ? { background: '#B453091A', color: '#B45309', border: '1px solid #B4530933' }
                                                                  : { background: '#F5F7FA', color: '#5B6474', border: '1px solid #E3E8F0' }
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
                                                        <p className="text-sm font-medium leading-snug text-[#111827]">
                                                            {d.message}
                                                        </p>
                                                        <p className="mt-1 truncate font-mono text-[11px] text-[#5B6474]">
                                                            berlaku s.d. {formatDate(d.expiry)}
                                                        </p>
                                                        {d.refType === 'document' && (
                                                            <Link
                                                                href={`/dokumen/${d.refId}`}
                                                                className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium transition-colors duration-150 hover:underline"
                                                                style={{ color: '#BA0C2F' }}
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
                                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t pt-3" style={{ borderColor: '#E3E8F0' }}>
                                    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[#5B6474]">
                                        <span
                                            aria-hidden="true"
                                            className="h-1.5 w-1.5 rounded-full"
                                            style={{ background: '#BA0C2F' }}
                                        />
                                        kedaluwarsa
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[#5B6474]">
                                        <span
                                            aria-hidden="true"
                                            className="h-1.5 w-1.5 rounded-full"
                                            style={{ background: '#B45309' }}
                                        />
                                        mendesak · 7 hari ke depan
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[#5B6474]">
                                        <span
                                            aria-hidden="true"
                                            className="h-1.5 w-1.5 rounded-full"
                                            style={{ background: '#5B6474' }}
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
