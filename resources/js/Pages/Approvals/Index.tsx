import Badge from '@/Components/ui/Badge';
import EmptyState from '@/Components/ui/EmptyState';
import PageHeader from '@/Components/ui/PageHeader';
import TabNav from '@/Components/ui/TabNav';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { classNames, formatDateTime } from '@/lib/format';
import { type PageProps } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Table, Typography } from 'antd';
import { CheckCircle2, ClipboardCheck, FileStack, History, MessageSquare, ArrowRight } from 'lucide-react';

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

    const ageHours = (value: string) => {
        const time = new Date(value).getTime();
        return Number.isFinite(time) ? (Date.now() - time) / 3_600_000 : 0;
    };
    const oldestHours = pending.reduce((max, item) => Math.max(max, ageHours(item.updated_at)), 0);
    const oldestLabel = oldestHours >= 24
        ? `${Math.floor(oldestHours / 24)} hari`
        : `${Math.max(1, Math.floor(oldestHours))} jam`;

    const historyColumns = [
        {
            title: 'Nama',
            dataIndex: 'name',
            key: 'name',
            render: (name: string, record: Record<string, any>) => (
                <Link
                    href={record.link}
                    className="font-medium text-[#111827] hover:text-[#BA0C2F] hover:underline"
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
                metrics={[
                    { label: 'Menunggu', value: counts.pending, tone: counts.pending > 0 ? 'primary' : 'neutral', sub: 'antrean aktif' },
                    { label: 'Disetujui', value: counts.approved, tone: 'success', sub: 'keputusan internal' },
                    { label: 'Perlu Revisi', value: counts.revision, tone: 'warning', sub: 'dikembalikan' },
                    { label: 'Antrean Tertua', value: counts.pending > 0 ? oldestLabel : '—', tone: oldestHours >= 24 ? 'danger' : 'neutral', sub: 'sejak diperbarui' },
                ]}
            />

            <TabNav
                tabs={tabs}
                active={tab}
                onChange={(key) => router.get('/persetujuan', { tab: key }, { preserveState: true })}
            />

            <div className="mt-3">
            {tab === 'pending' ? (
                pending.length === 0 ? (
                    <EmptyState
                        icon={ClipboardCheck}
                        title="Tidak ada yang menunggu"
                        description="Dokumen berstatus Under Review dan perjalanan tahap Pemeriksaan Internal akan tampil di sini."
                    />
                ) : (
                    <div className="space-y-3">
                        {pending.map((item, i) => {
                            const hours = ageHours(item.updated_at);
                            const ageTone = hours >= 24 ? 'danger' : hours >= 4 ? 'warning' : 'neutral';
                            return (
                                <Link
                                    key={i}
                                    href={item.link}
                                    className="group flex items-center gap-4 rounded-2xl border border-[#E3E8F0] bg-white p-4 shadow-[0_1px_2px_rgba(17,24,39,0.04)] transition hover:border-[#BA0C2F]/40 hover:shadow-[0_10px_28px_-20px_rgba(17,24,39,0.4)]"
                                >
                                    <span
                                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                                        style={{ background: 'rgba(0,32,91,0.08)', color: '#00205B' }}
                                    >
                                        {item.type === 'voyage' ? <ClipboardCheck size={18} /> : <FileStack size={18} />}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="font-semibold text-[#111827]">{item.name}</p>
                                            <Badge tone={item.type === 'voyage' ? 'info' : 'warning'}>
                                                {item.type === 'voyage' ? 'Perjalanan' : 'Dokumen'}
                                            </Badge>
                                            <Badge tone={ageTone}>
                                                {hours >= 24 ? `${Math.floor(hours / 24)} hari` : `${Math.max(1, Math.floor(hours))} jam`}
                                            </Badge>
                                        </div>
                                        <p className="mt-0.5 text-xs text-[#5B6474]">
                                            {item.code ? `${item.code} · ` : ''}
                                            {item.owner} · {item.status}
                                        </p>
                                    </div>
                                    <span className="hidden shrink-0 text-xs tabular-nums text-[#5B6474] sm:block">
                                        {formatDateTime(item.updated_at)}
                                    </span>
                                    <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-[#BA0C2F]">
                                        Periksa
                                        <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                                    </span>
                                </Link>
                            );
                        })}
                    </div>
                )
            ) : (
                <div className="overflow-hidden rounded-2xl border border-[#E3E8F0] bg-white">
                    <Table
                        dataSource={history}
                        columns={historyColumns}
                        rowKey={(_, i) => String(i)}
                        pagination={false}
                        size="middle"
                        locale={{ emptyText: 'Belum ada riwayat keputusan.' }}
                        rowClassName={() => 'hover:bg-[#F5F7FA]'}
                    />
                </div>
            )}
            </div>

            <div
                className="mt-4 rounded-xl border border-[#E3E8F0] p-3 text-xs text-[#5B6474]"
                style={{ background: '#F5F7FA' }}
            >
                * Persetujuan eksternal hanya dicatat berdasarkan lampiran bukti/berkas sah dari
                pihak berwenang — sistem tidak mewakili otoritas pelayaran.
            </div>
        </AuthenticatedLayout>
    );
}
