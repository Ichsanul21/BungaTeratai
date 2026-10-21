import Badge, { type BadgeTone } from '@/Components/ui/Badge';
import DataTable from '@/Components/ui/DataTable';
import EmptyState from '@/Components/ui/EmptyState';
import PageHeader from '@/Components/ui/PageHeader';
import StatCard from '@/Components/ui/StatCard';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { classNames, formatNumber } from '@/lib/format';
import { type PageProps } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Anchor, Plus, Search, Ship, ShipWheel, Wrench } from 'lucide-react';
import { FormEvent, useState } from 'react';

interface VesselRow {
    id: number;
    vessel_name: string;
    vessel_type: string;
    navigation_type: string;
    registration_number?: string;
    year_built?: number;
    gt?: number;
    dwt?: number;
    capacity_value?: number;
    capacity_unit?: string;
    base_location?: string;
    operational_status: string;
    doc_completeness: number;
    missing_count: number;
    voyage_count: number;
    last_position_at?: string;
}

const TYPE_LABELS: Record<string, string> = {
    tugboat: 'Tugboat',
    tongkang: 'Tongkang',
    kapal_penumpang: 'Kapal Penumpang',
    lainnya: 'Lainnya',
};

const NAV_LABELS: Record<string, string> = {
    laut: 'Laut',
    sungai_danau: 'Sungai/Danau',
    penyeberangan: 'Penyeberangan',
};

const STATUS_LABELS: Record<string, string> = {
    aktif: 'Aktif',
    dalam_perbaikan: 'Dalam Perbaikan',
    dock: 'Dock',
    mangkrak: 'Mangkrak',
};

function statusTone(status: string): BadgeTone {
    if (status === 'aktif') return 'success';
    if (status === 'dalam_perbaikan') return 'warning';
    return 'danger';
}

function completenessTone(pct: number): BadgeTone {
    if (pct >= 90) return 'success';
    if (pct >= 70) return 'warning';
    return 'danger';
}

function CompletenessBar({ pct }: { pct: number }) {
    return (
        <div className="flex items-center gap-2">
            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-appbg">
                <div
                    className={classNames(
                        'h-full rounded-full',
                        pct >= 90 ? 'bg-ok' : pct >= 70 ? 'bg-warn' : 'bg-primary',
                    )}
                    style={{ width: `${Math.min(100, pct)}%` }}
                />
            </div>
            <span className="text-xs font-semibold tabular-nums text-ink">
                {formatNumber(pct, 1)}%
            </span>
        </div>
    );
}

export default function FleetIndex({
    vessels,
    filters,
    stats,
    canCreate,
}: PageProps<{
    vessels: VesselRow[];
    filters: Record<string, string | number | undefined>;
    stats: { total: number; aktif: number; perlu_tinjau: number };
    canCreate?: boolean;
}>) {
    const [search, setSearch] = useState((filters.search as string) ?? '');
    const [type, setType] = useState((filters.type as string) ?? '');
    const [status, setStatus] = useState((filters.status as string) ?? '');

    const applyFilters = (e: FormEvent) => {
        e.preventDefault();
        router.get(
            '/armada',
            { search, type, status },
            { preserveState: true, replace: true },
        );
    };

    return (
        <AuthenticatedLayout>
            <Head title="Fleet Management" />

            <PageHeader
                title="Fleet Management"
                description="Data induk armada — status operasional dan kelengkapan dokumen per kapal."
                actions={
                    canCreate && (
                        <Link
                            href="/armada/create"
                            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover"
                        >
                            <Plus size={16} /> Tambah Kapal
                        </Link>
                    )
                }
            />

            <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StatCard label="Total Armada" value={stats.total} icon={Ship} />
                <StatCard
                    label="Status Aktif"
                    value={stats.aktif}
                    icon={Anchor}
                    tone="success"
                />
                <StatCard
                    label="Perlu Tindak Lanjut Dokumen"
                    value={stats.perlu_tinjau}
                    icon={Wrench}
                    tone="warning"
                    sub="kelengkapan < 90%"
                />
            </div>

            <form
                onSubmit={applyFilters}
                className="mb-5 flex flex-wrap items-center gap-2"
            >
                <div className="relative min-w-56 flex-1">
                    <Search
                        size={15}
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                    />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Cari nama / nomor registrasi…"
                        className="h-9 w-full rounded-lg border-hairline bg-white pl-9 pr-3 text-sm focus:border-primary focus:ring-primary"
                    />
                </div>
                <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="h-9 rounded-lg border-hairline bg-white px-2.5 text-sm focus:border-primary focus:ring-primary"
                >
                    <option value="">Semua Jenis</option>
                    {Object.entries(TYPE_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>
                            {v}
                        </option>
                    ))}
                </select>
                <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="h-9 rounded-lg border-hairline bg-white px-2.5 text-sm focus:border-primary focus:ring-primary"
                >
                    <option value="">Semua Status</option>
                    {Object.entries(STATUS_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>
                            {v}
                        </option>
                    ))}
                </select>
                <button
                    type="submit"
                    className="h-9 rounded-lg bg-ink px-3.5 text-sm font-medium text-white transition hover:bg-black"
                >
                    Terapkan
                </button>
            </form>

            <DataTable<VesselRow>
                columns={[
                    {
                        key: 'vessel_name',
                        label: 'Kapal',
                        render: (row) => (
                            <div>
                                <p className="font-medium text-ink">{row.vessel_name}</p>
                                <p className="text-xs text-muted">
                                    {TYPE_LABELS[row.vessel_type] ?? row.vessel_type} ·{' '}
                                    {NAV_LABELS[row.navigation_type] ?? row.navigation_type}
                                    {row.year_built ? ` · ${row.year_built}` : ''}
                                </p>
                            </div>
                        ),
                    },
                    {
                        key: 'base_location',
                        label: 'Pangkalan',
                        render: (row) => (
                            <span className="text-sm text-muted">
                                {row.base_location ?? '—'}
                            </span>
                        ),
                    },
                    {
                        key: 'operational_status',
                        label: 'Status Operasional',
                        render: (row) => (
                            <Badge tone={statusTone(row.operational_status)}>
                                {STATUS_LABELS[row.operational_status] ??
                                    row.operational_status}
                            </Badge>
                        ),
                    },
                    {
                        key: 'doc_completeness',
                        label: 'Kelengkapan Dokumen',
                        render: (row) => (
                            <CompletenessBar pct={row.doc_completeness} />
                        ),
                    },
                    {
                        key: 'missing_count',
                        label: 'Kurang',
                        className: 'text-center',
                        render: (row) => (
                            <span
                                className={classNames(
                                    'text-sm font-semibold tabular-nums',
                                    row.missing_count > 0 ? 'text-primary' : 'text-ok',
                                )}
                            >
                                {row.missing_count}
                            </span>
                        ),
                    },
                    {
                        key: 'voyage_count',
                        label: 'Perjalanan',
                        className: 'text-center tabular-nums',
                    },
                    {
                        key: 'id',
                        label: '',
                        className: 'text-right',
                        render: (row) => (
                            <Link
                                href={`/armada/${row.id}`}
                                className="text-sm font-medium text-primary hover:underline"
                            >
                                Detail →
                            </Link>
                        ),
                    },
                ]}
                rows={vessels}
                emptyTitle="Belum ada kapal"
                emptyDescription="Tambahkan kapal pertama untuk memulai pendataan armada."
                emptyIcon={ShipWheel}
            />
        </AuthenticatedLayout>
    );
}
