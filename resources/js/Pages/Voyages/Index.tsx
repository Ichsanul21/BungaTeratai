import Badge, { type BadgeTone } from '@/Components/ui/Badge';
import DataTable from '@/Components/ui/DataTable';
import EmptyState from '@/Components/ui/EmptyState';
import PageHeader from '@/Components/ui/PageHeader';
import { VOYAGE_STATUS_LABELS } from '@/Constants/navigation';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { formatDateTime } from '@/lib/format';
import { type PageProps } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Anchor, Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { Button, Input, Skeleton, Tabs, Tag } from 'antd';

const STATUS_TONES: Record<string, BadgeTone> = {
    draft: 'neutral',
    planned: 'info',
    document_preparation: 'warning',
    internal_review: 'info',
    awaiting_external_approval: 'warning',
    ready_for_departure: 'success',
    departed: 'info',
    in_transit: 'info',
    arrived: 'success',
    voyage_closure: 'info',
    completed: 'success',
    delayed: 'danger',
    cancelled: 'danger',
};

export default function VoyagesIndex({
    voyages,
    group,
    filters,
    statusCounts,
    canCreate,
}: PageProps<{
    voyages: Array<Record<string, any>>;
    group: string;
    filters: Record<string, any>;
    vessels: Array<{ id: number; vessel_name: string }>;
    statusCounts: { aktif: number; pending_review: number; completed: number };
    canCreate?: boolean;
}>) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [loading] = useState(false);

    const groups = [
        { key: 'semua', label: 'Semua' },
        { key: 'aktif', label: 'Aktif', count: statusCounts.aktif },
        { key: 'pending_review', label: 'Menunggu Pemeriksaan', count: statusCounts.pending_review },
        { key: 'completed', label: 'Selesai', count: statusCounts.completed },
    ];

    const apply = () => {
        router.get('/perjalanan', { group, search }, { preserveState: true, replace: true });
    };

    const tabItems = groups.map((g) => ({
        key: g.key,
        label: (
            <span className="inline-flex items-center gap-2">
                {g.label}
                {g.count !== undefined && (
                    <span
                        className={`inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 py-0.5 text-xs ${
                            group === g.key
                                ? 'bg-[#C1121F]/10 text-[#C1121F]'
                                : 'bg-[#FAF7F2] text-[#8A8580]'
                        }`}
                    >
                        {g.count}
                    </span>
                )}
            </span>
        ),
    }));

    const columns = [
        {
            key: 'voyage_code',
            label: 'Kode',
            render: (r: any) => (
                <Link
                    href={`/perjalanan/${r.id}`}
                    className="font-semibold text-[#1C1B1A] hover:text-[#C1121F] hover:underline"
                >
                    {r.voyage_code}
                </Link>
            ),
        },
        {
            key: 'vessel_name',
            label: 'Vessel & Aktivitas',
            render: (r: any) => (
                <div>
                    <p className="font-medium text-[#1C1B1A]">{r.vessel_name}</p>
                    <p className="text-xs capitalize text-[#8A8580]">
                        {r.activity_type?.replace('_', ' ')}
                    </p>
                </div>
            ),
        },
        {
            key: 'origin',
            label: 'Rute',
            render: (r: any) => `${r.origin} → ${r.destination}`,
        },
        {
            key: 'planned_departure',
            label: 'Jadwal',
            render: (r: any) => formatDateTime(r.planned_departure),
        },
        {
            key: 'voyage_status',
            label: 'Status',
            render: (r: any) => (
                <Badge tone={STATUS_TONES[r.voyage_status] ?? 'neutral'}>
                    {VOYAGE_STATUS_LABELS[r.voyage_status] ?? r.voyage_status}
                </Badge>
            ),
        },
        {
            key: 'external_approval_status',
            label: 'Persetujuan Eksternal',
            render: (r: any) => (
                <Badge
                    tone={
                        r.external_approval_status === 'terkonfirmasi'
                            ? 'success'
                            : r.external_approval_status === 'menunggu'
                              ? 'warning'
                              : 'neutral'
                    }
                >
                    {r.external_approval_status === 'terkonfirmasi'
                        ? 'Terkonfirmasi'
                        : r.external_approval_status === 'menunggu'
                          ? 'Menunggu'
                          : 'Tidak Berlaku'}
                </Badge>
            ),
        },
        {
            key: 'id',
            label: '',
            className: 'text-right',
            render: (r: any) => (
                <Link href={`/perjalanan/${r.id}`} className="text-sm font-medium text-[#C1121F] hover:underline">
                    Detail →
                </Link>
            ),
        },
    ];

    return (
        <AuthenticatedLayout>
            <Head title="Voyage Management" />

            <PageHeader
                title="Voyage Management"
                description="Perencanaan hingga penutupan perjalanan: checklist dinamis, persetujuan internal, dan bukti persetujuan eksternal."
                actions={
                    canCreate && (
                        <Link href="/perjalanan/create">
                            <Button type="primary" icon={<Plus size={16} />}>
                                Buat Perjalanan
                            </Button>
                        </Link>
                    )
                }
            />

            <Tabs
                activeKey={group}
                onChange={(key) => router.get('/perjalanan', { group: key }, { preserveState: true, replace: true })}
                items={tabItems}
                className="mb-5"
            />

            <div className="mb-5 flex max-w-lg gap-2">
                <Input.Search
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onSearch={apply}
                    placeholder="Cari kode / rute..."
                    enterButton="Cari"
                    allowClear
                    prefix={<Search size={15} className="text-[#8A8580]" />}
                />
            </div>

            <Skeleton loading={loading} active paragraph={{ rows: 6 }}>
                <DataTable
                    columns={columns}
                    rows={voyages}
                    emptyTitle="Belum ada perjalanan"
                    emptyDescription="Buat perjalanan pertama. Sistem akan membuat checklist otomatis sesuai kapal & muatan."
                    emptyIcon={Anchor}
                />
            </Skeleton>
        </AuthenticatedLayout>
    );
}
