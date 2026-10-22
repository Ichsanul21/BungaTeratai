import Badge, { type BadgeTone } from '@/Components/ui/Badge';
import Card from '@/Components/ui/Card';
import EmptyState from '@/Components/ui/EmptyState';
import PageHeader from '@/Components/ui/PageHeader';
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
    ClipboardCheck,
    Fuel,
    Ship,
    Trash2,
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

    const tabs = [
        { key: 'semua', label: 'Semua', count: counts.semua },
        { key: 'unread', label: 'Belum Dibaca', count: counts.unread },
        { key: 'reminder', label: 'Reminder Dokumen', count: counts.reminder },
        { key: 'workflow', label: 'Workflow & Operasional' },
    ];

    const markAll = () => {
        setBusy(true);
        router.post('/notifikasi/read-all', {}, {
            onFinish: () => setBusy(false),
            preserveScroll: true,
        });
    };

    const deleteAllRead = () => {
        setBusy(true);
        router.post('/notifikasi/delete-read', {}, {
            onFinish: () => setBusy(false),
            preserveScroll: true,
        });
    };

    return (
        <Authenticated>
            <Head title="Notifikasi & Reminder" />

            <PageHeader
                title="Notifikasi & Reminder"
                description="Pengingat dokumen, persetujuan, dan kejadian operasional. Notifikasi eksternal (email/WA) belum diaktifkan."
                actions={
                    <>
                        {counts.unread > 0 && (
                            <button
                                type="button"
                                onClick={markAll}
                                disabled={busy}
                                className="inline-flex items-center gap-2 rounded-lg border border-hairline bg-white px-3.5 py-2 text-sm font-medium text-ink transition hover:border-primary/40 disabled:opacity-50"
                            >
                                <CheckCheck size={16} /> Tandai semua dibaca
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={deleteAllRead}
                            disabled={busy}
                            className="inline-flex items-center gap-2 rounded-lg border border-hairline bg-white px-3.5 py-2 text-sm font-medium text-primary transition hover:border-primary/40 disabled:opacity-50"
                        >
                            <Trash2 size={16} /> Hapus yang sudah dibaca
                        </button>
                    </>
                }
            />

            <div className="mb-5 flex flex-wrap gap-1.5">
                {tabs.map((t) => (
                    <Link
                        key={t.key}
                        href={`/notifikasi?filter=${t.key}`}
                        className={classNames(
                            'rounded-full border px-3.5 py-1.5 text-xs font-medium transition',
                            filter === t.key
                                ? 'border-primary bg-primary text-white'
                                : 'border-hairline bg-white text-muted hover:border-primary/40 hover:text-ink',
                        )}
                    >
                        {t.label}
                        {t.count !== undefined && <span className="ms-1.5 opacity-70">{t.count}</span>}
                    </Link>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
                <div className="space-y-3 xl:col-span-2">
                    {notifications.length === 0 ? (
                        <EmptyState
                            icon={Bell}
                            title="Tidak ada notifikasi"
                            description="Notifikasi baru akan muncul di sini."
                        />
                    ) : (
                        notifications.map((n) => {
                            const meta = TYPE_META[n.notification_type] ?? {
                                label: n.notification_type,
                                tone: 'neutral' as BadgeTone,
                                icon: Bell,
                            };
                            const Icon = meta.icon;
                            return (
                                <div
                                    key={n.id}
                                    className={classNames(
                                        'flex items-start gap-3 rounded-xl border bg-white p-4 shadow-sm',
                                        n.read_status ? 'border-hairline' : 'border-primary/30 bg-primary-tint/40',
                                    )}
                                >
                                    <span
                                        className={classNames(
                                            'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                                            meta.tone === 'danger'
                                                ? 'bg-primary/10 text-primary'
                                                : meta.tone === 'warning'
                                                  ? 'bg-warn/10 text-warn'
                                                  : meta.tone === 'info'
                                                    ? 'bg-maritime/10 text-maritime'
                                                    : 'bg-appbg text-muted',
                                        )}
                                    >
                                        <Icon size={17} />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="text-sm font-semibold text-ink">{n.title}</p>
                                            <Badge tone={meta.tone}>{meta.label}</Badge>
                                            {!n.read_status && (
                                                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                                            )}
                                        </div>
                                        <p className="mt-0.5 text-sm text-muted">{n.message}</p>
                                        <p className="mt-1 text-xs text-muted">
                                            {formatDateTime(n.created_at)}
                                        </p>
                                    </div>
                                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                                        {n.link && (
                                            <Link
                                                href={n.link}
                                                className="text-xs font-medium text-primary hover:underline"
                                            >
                                                Buka →
                                            </Link>
                                        )}
                                        {!n.read_status && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    router.post(`/notifikasi/${n.id}/read`, {}, {
                                                        preserveScroll: true,
                                                    })
                                                }
                                                className="text-xs text-muted hover:text-ink"
                                            >
                                                Tandai dibaca
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() =>
                                                router.delete(`/notifikasi/${n.id}`, {
                                                    preserveScroll: true,
                                                })
                                            }
                                            className="text-xs text-muted hover:text-primary"
                                        >
                                            Hapus
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                <Card
                    title="Reminder Dokumen Aktif"
                    description="Dokumen & sertifikat dengan masa berlaku — tanpa tanggal fiktif."
                >
                    {due.length === 0 ? (
                        <p className="text-sm text-muted">Tidak ada dokumen jatuh tempo.</p>
                    ) : (
                        <ul className="space-y-2.5">
                            {due.map((d, i) => {
                                const days = daysUntil(d.expiry);
                                return (
                                    <li
                                        key={i}
                                        className={classNames(
                                            'rounded-lg border p-3',
                                            days !== null && days < 0
                                                ? 'border-primary/30 bg-primary-tint'
                                                : 'border-hairline',
                                        )}
                                    >
                                        <p className="text-sm font-medium text-ink">{d.message}</p>
                                        <p className="mt-0.5 text-xs text-muted">
                                            Berlaku s/d {formatDate(d.expiry)} ·{' '}
                                            <span
                                                className={classNames(
                                                    'font-semibold',
                                                    days !== null && days < 0 ? 'text-primary' : 'text-warn',
                                                )}
                                            >
                                                {days !== null && days < 0
                                                    ? `kedaluwarsa ${Math.abs(days)} hari lalu`
                                                    : `${days} hari lagi`}
                                            </span>
                                        </p>
                                        {d.refType === 'document' && (
                                            <Link
                                                href={`/dokumen/${d.refId}`}
                                                className="mt-1 inline-block text-xs font-medium text-primary hover:underline"
                                            >
                                                Buka dokumen →
                                            </Link>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </Card>
            </div>
        </Authenticated>
    );
}
