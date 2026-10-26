import Badge, { type BadgeTone } from '@/Components/ui/Badge';
import DataTable from '@/Components/ui/DataTable';
import PageHeader from '@/Components/ui/PageHeader';
import { VOYAGE_STATUS_LABELS } from '@/Constants/navigation';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { classNames, formatDateTime } from '@/lib/format';
import { type PageProps } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Anchor, Plus, Search } from 'lucide-react';
import { FormEvent, useState } from 'react';

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

    const groups = [
        { key: 'semua', label: 'Semua' },
        { key: 'aktif', label: 'Aktif', count: statusCounts.aktif },
        { key: 'pending_review', label: 'Menunggu Pemeriksaan', count: statusCounts.pending_review },
        { key: 'completed', label: 'Selesai', count: statusCounts.completed },
    ];

    const apply = (e: FormEvent) => {
        e.preventDefault();
        router.get('/perjalanan', { group, search }, { preserveState: true, replace: true });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Voyage Management" />

            <PageHeader
                title="Voyage Management"
                description="Perencanaan hingga penutupan perjalanan — checklist dinamis, persetujuan internal, dan bukti persetujuan eksternal."
                actions={
                    canCreate && (
                        <Link
                            href="/perjalanan/create"
                            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover"
                        >
                            <Plus size={16} /> Buat Perjalanan
                        </Link>
                    )
                }
            />

            <div className="mb-5 flex flex-wrap items-center gap-1.5">
                {groups.map((g) => (
                    <Link
                        key={g.key}
                        href={`/perjalanan?group=${g.key}`}
                        className={classNames(
                            'rounded-full border px-3.5 py-1.5 text-xs font-medium transition',
                            group === g.key
                                ? 'border-primary bg-primary text-white'
                                : 'border-hairline bg-white text-muted hover:border-primary/40 hover:text-ink',
                        )}
                    >
                        {g.label}
                        {g.count !== undefined && <span className="ms-1.5 opacity-70">{g.count}</span>}
                    </Link>
                ))}
            </div>

            <form onSubmit={apply} className="mb-5 flex max-w-lg gap-2">
                <div className="relative flex-1">
                    <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Cari kode / rute…"
                        className="h-9 w-full rounded-lg border-hairline bg-white pl-9 pr-3 text-sm focus:border-primary focus:ring-primary"
                    />
                </div>
                <button type="submit" className="h-9 rounded-lg bg-ink px-3.5 text-sm font-medium text-white hover:bg-black">
                    Cari
                </button>
            </form>

            <DataTable
                columns={[
                    {
                        key: 'voyage_code',
                        label: 'Kode',
                        render: (r: any) => (
                            <Link
                                href={`/perjalanan/${r.id}`}
                                className="font-semibold text-ink hover:text-primary hover:underline"
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
                                <p className="font-medium text-ink">{r.vessel_name}</p>
                                <p className="text-xs capitalize text-muted">
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
                            <Link href={`/perjalanan/${r.id}`} className="text-sm font-medium text-primary hover:underline">
                                Detail →
                            </Link>
                        ),
                    },
                ]}
                rows={voyages}
                emptyTitle="Belum ada perjalanan"
                emptyDescription="Buat perjalanan pertama — sistem akan membuat checklist otomatis sesuai kapal & muatan."
                emptyIcon={Anchor}
            />
        </AuthenticatedLayout>
    );
}
