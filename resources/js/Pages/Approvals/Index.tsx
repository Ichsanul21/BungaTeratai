import Badge from '@/Components/ui/Badge';
import EmptyState from '@/Components/ui/EmptyState';
import PageHeader from '@/Components/ui/PageHeader';
import TabNav from '@/Components/ui/TabNav';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { classNames, formatDateTime } from '@/lib/format';
import { type PageProps } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Table, Typography } from 'antd';
import { CheckCircle2, ClipboardCheck, FileStack, History, MessageSquare } from 'lucide-react';

const { Text } = Typography;

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

    const historyColumns = [
        {
            title: 'Nama',
            dataIndex: 'name',
            key: 'name',
            render: (name: string, record: Record<string, any>) => (
                <Link
                    href={record.link}
                    className="font-medium text-[#1C1B1A] hover:text-[#C1121F] hover:underline"
                >
                    {name}
                </Link>
            ),
        },
        {
            title: 'Jenis',
            dataIndex: 'type',
            key: 'type',
            render: (type: string) => (
                <Badge tone={type === 'voyage' ? 'info' : 'neutral'}>
                    {type === 'voyage' ? 'Perjalanan' : 'Dokumen'}
                </Badge>
            ),
        },
        {
            title: 'Lingkup',
            dataIndex: 'scope',
            key: 'scope',
            render: (scope: string) => (
                <Text type="secondary">{scope === 'external' ? 'Eksternal*' : 'Internal'}</Text>
            ),
        },
        {
            title: 'Keputusan',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => (
                <Badge
                    tone={
                        status === 'approved'
                            ? 'success'
                            : status === 'rejected'
                              ? 'danger'
                              : 'warning'
                    }
                >
                    {status === 'approved'
                        ? 'Disetujui'
                        : status === 'rejected'
                          ? 'Ditolak'
                          : 'Perlu Revisi'}
                </Badge>
            ),
        },
        {
            title: 'Pemeriksa',
            dataIndex: 'approver',
            key: 'approver',
            render: (approver: string) => <Text type="secondary">{approver}</Text>,
        },
        {
            title: 'Komentar',
            dataIndex: 'comments',
            key: 'comments',
            ellipsis: true,
            render: (comments: string | null) => (
                <Text type="secondary" italic className="line-clamp-2 text-xs">
                    {comments ?? '—'}
                </Text>
            ),
        },
        {
            title: 'Waktu',
            dataIndex: 'decision_timestamp',
            key: 'decision_timestamp',
            render: (ts: string) => (
                <Text type="secondary" className="text-xs">
                    {formatDateTime(ts)}
                </Text>
            ),
        },
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
                                className="flex items-center gap-4 rounded-xl border border-[#E7E1D9] bg-white p-4 shadow-sm transition hover:border-[#C1121F]/40"
                            >
                                <span
                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                                    style={{ background: '#1E46681A', color: '#1E4668' }}
                                >
                                    {item.type === 'voyage' ? <ClipboardCheck size={18} /> : <FileStack size={18} />}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="font-semibold text-[#1C1B1A]">{item.name}</p>
                                        <Badge tone={item.type === 'voyage' ? 'info' : 'warning'}>
                                            {item.type === 'voyage' ? 'Perjalanan' : 'Dokumen'}
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-[#8A8580]">
                                        {item.code ? `${item.code} · ` : ''}
                                        {item.owner} · {item.status}
                                    </p>
                                </div>
                                <span className="text-xs text-[#8A8580]">
                                    {formatDateTime(item.updated_at)}
                                </span>
                                <span className="text-sm font-medium text-[#C1121F]">Periksa →</span>
                            </Link>
                        ))}
                    </div>
                )
            ) : (
                <Table
                    dataSource={history}
                    columns={historyColumns}
                    rowKey={(_, i) => String(i)}
                    pagination={false}
                    size="middle"
                    locale={{ emptyText: 'Belum ada riwayat keputusan.' }}
                    rowClassName={() => 'hover:bg-[#FAF7F2]'}
                />
            )}

            <div
                className="mt-4 rounded-xl border border-[#E7E1D9] p-3 text-xs text-[#8A8580]"
                style={{ background: '#FAF7F2' }}
            >
                * Persetujuan eksternal hanya dicatat berdasarkan lampiran bukti/berkas sah dari
                pihak berwenang — sistem tidak mewakili otoritas pelayaran.
            </div>
        </AuthenticatedLayout>
    );
}
