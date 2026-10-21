import Badge from '@/Components/ui/Badge';
import EmptyState from '@/Components/ui/EmptyState';
import PageHeader from '@/Components/ui/PageHeader';
import TabNav from '@/Components/ui/TabNav';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { classNames, formatDateTime } from '@/lib/format';
import { type PageProps } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { CheckCircle2, ClipboardCheck, FileStack, History, MessageSquare } from 'lucide-react';

export default function ApprovalsIndex({
    tab,
    pending,
    history,
    counts,
}: PageProps<{
    tab: string;
    pending: Array<Record<string, any>>;
    history: Array<Record<string, any>>;
    counts: { pending: number; approved: number; revision: number };
}>) {
    const tabs = [
        { key: 'pending', label: 'Menunggu Pemeriksaan', icon: ClipboardCheck, count: counts.pending },
        { key: 'approved', label: 'Disetujui', icon: CheckCircle2, count: counts.approved },
        { key: 'revision', label: 'Perlu Revisi', icon: MessageSquare, count: counts.revision },
        { key: 'history', label: 'Histori Lengkap', icon: History },
    ];

    return (
        <AuthenticatedLayout>
            <Head title="Approvals" />

            <PageHeader
                title="Approvals"
                description="Pemeriksaan & persetujuan internal dokumen dan perjalanan. Persetujuan internal ≠ persetujuan otoritas pelayaran."
            />

            <TabNav
                tabs={tabs}
                active={tab}
                onChange={(key) => router.get('/persetujuan', { tab: key }, { preserveState: true })}
            />

            {tab === 'pending' ? (
                pending.length === 0 ? (
                    <EmptyState
                        icon={ClipboardCheck}
                        title="Tidak ada yang menunggu"
                        description="Dokumen berstatus Under Review dan perjalanan tahap Pemeriksaan Internal akan tampil di sini."
                    />
                ) : (
                    <div className="space-y-3">
                        {pending.map((item, i) => (
                            <Link
                                key={i}
                                href={item.link}
                                className="flex items-center gap-4 rounded-xl border border-hairline bg-white p-4 shadow-sm transition hover:border-primary/40"
                            >
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-maritime/10 text-maritime">
                                    {item.type === 'voyage' ? <ClipboardCheck size={18} /> : <FileStack size={18} />}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="font-semibold text-ink">{item.name}</p>
                                        <Badge tone={item.type === 'voyage' ? 'info' : 'warning'}>
                                            {item.type === 'voyage' ? 'Perjalanan' : 'Dokumen'}
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-muted">
                                        {item.code ? `${item.code} · ` : ''}
                                        {item.owner} · {item.status}
                                    </p>
                                </div>
                                <span className="text-xs text-muted">
                                    {formatDateTime(item.updated_at)}
                                </span>
                                <span className="text-sm font-medium text-primary">Periksa →</span>
                            </Link>
                        ))}
                    </div>
                )
            ) : (
                <div className="overflow-hidden rounded-xl border border-hairline bg-white shadow-sm">
                    <table className="min-w-full divide-y divide-hairline text-sm">
                        <thead className="bg-appbg">
                            <tr>
                                {['Nama', 'Jenis', 'Lingkup', 'Keputusan', 'Pemeriksa', 'Komentar', 'Waktu'].map(
                                    (h) => (
                                        <th
                                            key={h}
                                            className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted"
                                        >
                                            {h}
                                        </th>
                                    ),
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-hairline">
                            {history.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-muted">
                                        Belum ada riwayat keputusan.
                                    </td>
                                </tr>
                            ) : (
                                history.map((h, i) => (
                                    <tr key={i} className="hover:bg-appbg">
                                        <td className="px-4 py-3">
                                            <Link
                                                href={h.link}
                                                className="font-medium text-ink hover:text-primary hover:underline"
                                            >
                                                {h.name}
                                            </Link>
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge tone={h.type === 'voyage' ? 'info' : 'neutral'}>
                                                {h.type === 'voyage' ? 'Perjalanan' : 'Dokumen'}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3 text-muted">
                                            {h.scope === 'external' ? 'Eksternal*' : 'Internal'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge
                                                tone={
                                                    h.status === 'approved'
                                                        ? 'success'
                                                        : h.status === 'rejected'
                                                          ? 'danger'
                                                          : 'warning'
                                                }
                                            >
                                                {h.status === 'approved'
                                                    ? 'Disetujui'
                                                    : h.status === 'rejected'
                                                      ? 'Ditolak'
                                                      : 'Perlu Revisi'}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3 text-muted">{h.approver}</td>
                                        <td className={classNames('max-w-56 px-4 py-3 text-muted')}>
                                            <span className="line-clamp-2 text-xs italic">
                                                {h.comments ?? '—'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-muted">
                                            {formatDateTime(h.decision_timestamp)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            <p className="mt-4 rounded-xl border border-hairline bg-appbg p-3 text-xs text-muted">
                * Persetujuan eksternal hanya dicatat berdasarkan lampiran bukti/berkas sah dari
                pihak berwenang — sistem tidak mewakili otoritas pelayaran.
            </p>
        </AuthenticatedLayout>
    );
}
