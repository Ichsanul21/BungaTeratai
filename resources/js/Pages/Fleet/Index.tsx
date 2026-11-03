import Badge, { type BadgeTone } from '@/Components/ui/Badge';
import PageHeader from '@/Components/ui/PageHeader';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { formatNumber } from '@/lib/format';
import { type PageProps } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import {
    Anchor,
    Container,
    Plus,
    Power,
    RotateCcw,
    SearchX,
    Ship,
    ShipWheel,
    Users,
    Wrench,
} from 'lucide-react';
import { Button, Col, Input, Progress, Row, Select, Space, Tag, Typography } from 'antd';
import { useState } from 'react';

const { Text } = Typography;

interface VesselRow {
    id: number;
    vessel_name: string;
    vessel_type: string;
    vessel_type_custom?: string | null;
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

// Ikon tabel armada mengikuti jenis kapal (data-driven).
function TypeIcon({ type, active }: { type: string; active: boolean }) {
    const color = active ? '#BA0C2F' : '#5B6474';
    const props = { size: 17, 'aria-hidden': true as const, style: { color } };
    if (type === 'tugboat') return <Anchor {...props} />;
    if (type === 'tongkang') return <Container {...props} />;
    if (type === 'kapal_penumpang') return <Users {...props} />;
    return <ShipWheel {...props} />;
}

const STATUS_LABELS: Record<string, string> = {
    aktif: 'Aktif',
    dalam_perbaikan: 'Dalam Perbaikan',
    dock: 'Dock',
    mangkrak: 'Mangkrak',
};

const STATUS_OPTIONS = [
    { value: '', label: 'Semua Status' },
    { value: 'aktif', label: 'Aktif' },
    { value: 'dalam_perbaikan', label: 'Dalam Perbaikan' },
    { value: 'dock', label: 'Dock' },
    { value: 'mangkrak', label: 'Mangkrak' },
];

const TYPE_OPTIONS = [
    { value: '', label: 'Semua Jenis' },
    { value: 'tugboat', label: 'Tugboat' },
    { value: 'tongkang', label: 'Tongkang' },
    { value: 'kapal_penumpang', label: 'Kapal Penumpang' },
    { value: 'lainnya', label: 'Lainnya' },
];

const GRAIN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E")`;

const EASE = 'cubic-bezier(0.22,1,0.36,1)';

function statusTone(status: string): BadgeTone {
    if (status === 'aktif') return 'success';
    if (status === 'dalam_perbaikan') return 'warning';
    return 'danger';
}

function positionInfo(value?: string): { label: string; fresh: boolean } | null {
    if (!value) return null;
    const date = new Date(value.includes('T') ? value : value.replace(' ', 'T'));
    const time = date.getTime();
    if (Number.isNaN(time)) return null;
    const minutes = Math.floor((Date.now() - time) / 60000);
    let label: string;
    if (minutes < 1) label = 'baru saja';
    else if (minutes < 60) label = `${minutes} menit lalu`;
    else if (minutes < 1440) label = `${Math.floor(minutes / 60)} jam lalu`;
    else if (minutes < 43200) label = `${Math.floor(minutes / 1440)} hari lalu`;
    else
        label = date.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    return { label, fresh: Date.now() - time < 86400000 };
}

// Metrik armada memakai PageHeader.metrics agar seragam dengan Dashboard.

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

    const activeStatus = (filters.status as string) ?? '';
    const activeType = (filters.type as string) ?? '';

    const activeFilterCount = ['search', 'type', 'status'].filter(
        (k) => (filters[k] ?? '') !== '',
    ).length;

    const activePct = stats.total > 0 ? Math.round((stats.aktif / stats.total) * 100) : 0;
    const nonOperational = Math.max(0, stats.total - stats.aktif);
    const isFilteredEmpty = vessels.length === 0 && activeFilterCount > 0 && stats.total > 0;

    const setFilter = (key: 'type' | 'status', value: string) => {
        router.get(
            '/armada',
            { ...filters, [key]: value || undefined },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const applySearch = (value: string) => {
        setSearch(value);
        router.get(
            '/armada',
            { ...filters, search: value || undefined },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const resetFilters = () => {
        setSearch('');
        router.get('/armada', {}, { preserveState: true, preserveScroll: true, replace: true });
    };

    const headline =
        stats.total === 0
            ? 'Registry armada masih kosong.'
            : stats.perlu_tinjau > 0
              ? `${formatNumber(stats.perlu_tinjau)} kapal menunggu tindak lanjut dokumen.`
              : stats.aktif < stats.total
                ? `${formatNumber(stats.aktif)} dari ${formatNumber(stats.total)} kapal siap beroperasi.`
                : 'Seluruh armada siap beroperasi.';

    const columns = [
        {
            title: 'Kapal',
            key: 'vessel_name',
            render: (_: any, row: VesselRow) => (
                <div>
                    <Link
                        href={`/armada/${row.id}`}
                        className="text-sm font-semibold hover:underline"
                        style={{ color: '#111827' }}
                    >
                        {row.vessel_name}
                    </Link>
                    <p className="mt-0.5 text-xs" style={{ color: '#5B6474' }}>
                        {row.vessel_type === 'lainnya' && row.vessel_type_custom
                            ? row.vessel_type_custom
                            : TYPE_LABELS[row.vessel_type] ?? row.vessel_type}
                        {' · '}
                        {NAV_LABELS[row.navigation_type] ?? row.navigation_type}
                        {row.year_built ? ` · ${row.year_built}` : ''}
                        {row.registration_number ? ` · Reg. ${row.registration_number}` : ''}
                    </p>
                </div>
            ),
        },
        {
            title: 'Spesifikasi',
            key: 'specs',
            render: (_: any, row: VesselRow) => {
                const utama = [
                    row.gt != null ? `GT ${formatNumber(row.gt)}` : null,
                    row.dwt != null ? `DWT ${formatNumber(row.dwt, 2)}` : null,
                ].filter(Boolean).join(' · ');
                const kapasitas = row.capacity_value != null
                    ? `${formatNumber(row.capacity_value, 2)}${row.capacity_unit ? ` ${row.capacity_unit}` : ''}`
                    : null;
                if (!utama && !kapasitas) {
                    return <span className="text-xs" style={{ color: '#5B6474' }}>Belum dilengkapi</span>;
                }
                return (
                    <div>
                        {utama && <p className="font-mono text-[13px]" style={{ color: '#111827' }}>{utama}</p>}
                        {kapasitas && <p className="mt-0.5 text-xs" style={{ color: '#5B6474' }}>Kapasitas {kapasitas}</p>}
                    </div>
                );
            },
        },
        {
            title: 'Pangkalan',
            key: 'base_location',
            render: (_: any, row: VesselRow) => {
                const pos = positionInfo(row.last_position_at);
                return (
                    <div>
                        {row.base_location ? (
                            <p className="text-sm" style={{ color: '#111827' }}>{row.base_location}</p>
                        ) : (
                            <p className="text-xs" style={{ color: '#5B6474' }}>Belum diatur</p>
                        )}
                        {pos && (
                            <p className="mt-0.5 flex items-center gap-1.5 font-mono text-[11px]" style={{ color: '#5B6474' }}>
                                <span
                                    aria-hidden="true"
                                    className="h-1.5 w-1.5 rounded-full"
                                    style={{ background: pos.fresh ? '#15803D' : '#5B6474' }}
                                />
                                Posisi terakhir {pos.label}
                            </p>
                        )}
                    </div>
                );
            },
        },
        {
            title: 'Status',
            key: 'operational_status',
            render: (_: any, row: VesselRow) => (
                <Badge tone={statusTone(row.operational_status)}>
                    {STATUS_LABELS[row.operational_status] ?? row.operational_status}
                </Badge>
            ),
        },
        {
            title: 'Kelengkapan Dokumen',
            key: 'doc_completeness',
            render: (_: any, row: VesselRow) => {
                const pct = row.doc_completeness;
                const missing = row.missing_count;
                const strokeColor = pct >= 90 ? '#15803D' : pct >= 70 ? '#B45309' : '#BA0C2F';
                return (
                    <div className="w-40 max-w-full">
                        <div className="flex items-center gap-2.5">
                            <Progress
                                percent={Math.min(100, Math.max(0, pct))}
                                showInfo={false}
                                strokeColor={strokeColor}
                                trailColor="#F5F7FA"
                                size="small"
                                className="flex-1"
                            />
                            <span
                                className="shrink-0 font-mono text-[13px] font-semibold tabular-nums"
                                style={{ color: strokeColor }}
                            >
                                {formatNumber(pct, 1)}%
                            </span>
                        </div>
                        <p className="mt-1 text-xs" style={{ color: missing > 0 ? '#5B6474' : '#15803D' }}>
                            {missing > 0 ? `${missing} dokumen kurang` : 'Lengkap'}
                        </p>
                    </div>
                );
            },
        },
        {
            title: 'Perjalanan',
            key: 'voyage_count',
            align: 'center' as const,
            render: (_: any, row: VesselRow) => (
                <span className="text-sm font-semibold tabular-nums" style={{ color: '#111827' }}>
                    {formatNumber(row.voyage_count)}
                </span>
            ),
        },
        {
            title: '',
            key: 'actions',
            align: 'right' as const,
            render: (_: any, row: VesselRow) => (
                <Link
                    href={`/armada/${row.id}`}
                    className="text-sm font-semibold hover:underline"
                    style={{ color: '#BA0C2F' }}
                >
                    Detail
                </Link>
            ),
        },
    ];

    return (
        <AuthenticatedLayout>
            <Head title="Fleet Management" />

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
                @media (prefers-reduced-motion: reduce) {
                    .bt-anim, .bt-anim * { animation: none !important; }
                }
            `}</style>

            <PageHeader
                eyebrow="Registry Armada"
                title={headline}
                description="Data induk seluruh kapal perusahaan: status operasional, spesifikasi teknis, dan kelengkapan dokumen dalam satu register terpadu."
                metrics={[
                    { label: 'Total Armada', value: formatNumber(stats.total), sub: 'kapal terdaftar' },
                    { label: 'Siap Beroperasi', value: formatNumber(stats.aktif), sub: `${activePct}% dari total`, tone: 'success' },
                    { label: 'Perlu Tindak Lanjut', value: formatNumber(stats.perlu_tinjau), sub: 'kelengkapan < 90%', tone: 'warning' },
                    { label: 'Tidak Operasional', value: formatNumber(nonOperational), sub: 'perbaikan · dock', tone: 'danger' },
                ]}
                actions={
                    canCreate && (
                        <Link
                            href="/armada/create"
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#BA0C2F] px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-[#8E0924]"
                        >
                            <Plus size={16} aria-hidden="true" />
                            Tambah Kapal
                        </Link>
                    )
                }
            />

            <div
                className="bt-anim mb-5 rounded-2xl border p-4 shadow-[0_18px_40px_-30px_rgba(17,24,39,0.35)]"
                style={{ animation: `bt-rise 0.45s ${EASE} 110ms both`, borderColor: '#E3E8F0', background: '#fff' }}
            >
                <Row gutter={[12, 12]} align="middle">
                    <Col xs={24} sm={12} md={8}>
                        <Input.Search
                            placeholder="Cari nama kapal atau nomor registrasi…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onSearch={applySearch}
                            enterButton="Terapkan"
                            allowClear
                            size="middle"
                        />
                    </Col>
                    <Col xs={12} sm={6} md={4}>
                        <Select
                            value={activeType}
                            onChange={(v) => setFilter('type', v)}
                            options={TYPE_OPTIONS}
                            className="w-full"
                            placeholder="Jenis Kapal"
                        />
                    </Col>
                    <Col xs={12} sm={6} md={4}>
                        <Select
                            value={activeStatus}
                            onChange={(v) => setFilter('status', v)}
                            options={STATUS_OPTIONS}
                            className="w-full"
                            placeholder="Status"
                        />
                    </Col>
                    {activeFilterCount > 0 && (
                        <Col xs={24} sm={24} md={8} className="text-right">
                            <Space>
                                <Text type="secondary" className="font-mono text-xs">
                                    {activeFilterCount} filter aktif
                                </Text>
                                <Button type="link" size="small" onClick={resetFilters} icon={<RotateCcw size={13} />}>
                                    Reset
                                </Button>
                            </Space>
                        </Col>
                    )}
                </Row>
            </div>

            <section className="bt-anim" style={{ animation: `bt-rise 0.45s ${EASE} 150ms both` }}>
                {vessels.length > 0 && (
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.14em]" style={{ color: '#5B6474' }}>
                            {formatNumber(vessels.length)} kapal ditemukan
                        </p>
                    </div>
                )}

                {vessels.length === 0 ? (
                    isFilteredEmpty ? (
                        <div className="rounded-2xl border border-dashed px-6 py-16 text-center" style={{ borderColor: '#E3E8F0', background: 'rgba(245,247,250,0.4)' }}>
                            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm">
                                <SearchX size={20} aria-hidden="true" style={{ color: '#5B6474' }} />
                            </span>
                            <p className="mt-4 text-sm font-semibold" style={{ color: '#111827' }}>Tidak ada kapal cocok</p>
                            <p className="mt-1 text-xs" style={{ color: '#5B6474' }}>Ubah kata kunci, jenis, atau status yang dipakai.</p>
                            <Button onClick={resetFilters} className="mt-5" icon={<RotateCcw size={15} />}>
                                Hapus Filter
                            </Button>
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-dashed px-6 py-16 text-center" style={{ borderColor: '#E3E8F0', background: 'rgba(245,247,250,0.4)' }}>
                            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm">
                                <Ship size={20} aria-hidden="true" style={{ color: '#5B6474' }} />
                            </span>
                            <p className="mt-4 text-sm font-semibold" style={{ color: '#111827' }}>Belum ada kapal terdaftar</p>
                            <p className="mt-1 text-xs" style={{ color: '#5B6474' }}>Tambahkan kapal pertama untuk memulai pendataan armada.</p>
                            {canCreate && (
                                <Link href="/armada/create" className="mt-5 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90" style={{ background: '#BA0C2F' }}>
                                    <Plus size={15} aria-hidden="true" />
                                    Tambah Kapal Pertama
                                </Link>
                            )}
                        </div>
                    )
                ) : (
                    <div className="overflow-x-auto rounded-2xl border bg-white shadow-[0_20px_44px_-32px_rgba(17,24,39,0.4)]" style={{ borderColor: '#E3E8F0' }}>
                        <table className="w-full" style={{ minWidth: '52rem' }}>
                            <thead>
                                <tr className="border-b" style={{ borderColor: '#E3E8F0', background: 'rgba(245,247,250,0.7)' }}>
                                    <th className="px-4 py-3 text-left font-mono text-[10px] font-medium uppercase tracking-[0.16em]" style={{ color: '#5B6474' }}>Kapal</th>
                                    <th className="px-4 py-3 text-left font-mono text-[10px] font-medium uppercase tracking-[0.16em]" style={{ color: '#5B6474' }}>Spesifikasi</th>
                                    <th className="px-4 py-3 text-left font-mono text-[10px] font-medium uppercase tracking-[0.16em]" style={{ color: '#5B6474' }}>Pangkalan</th>
                                    <th className="px-4 py-3 text-left font-mono text-[10px] font-medium uppercase tracking-[0.16em]" style={{ color: '#5B6474' }}>Status</th>
                                    <th className="px-4 py-3 text-left font-mono text-[10px] font-medium uppercase tracking-[0.16em]" style={{ color: '#5B6474' }}>Kelengkapan Dokumen</th>
                                    <th className="px-4 py-3 text-center font-mono text-[10px] font-medium uppercase tracking-[0.16em]" style={{ color: '#5B6474' }}>Perjalanan</th>
                                    <th className="px-4 py-3 text-right font-mono text-[10px] font-medium uppercase tracking-[0.16em]" style={{ color: '#5B6474' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {vessels.map((row) => {
                                    const pos = positionInfo(row.last_position_at);
                                    const status = row.operational_status;
                                    const railColor = status === 'dalam_perbaikan' ? '#B45309' : (status === 'dock' || status === 'mangkrak') ? '#BA0C2F' : null;
                                    return (
                                        <tr key={row.id} id={`record-vessel-${row.id}`} className="border-b transition-colors duration-150 hover:bg-[#F5F7FA]/50" style={{ borderColor: '#E3E8F0' }}>
                                            <td className="relative px-4 py-3.5 align-middle">
                                                {railColor && (
                                                    <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full" style={{ background: railColor }} />
                                                )}
                                                <div className="flex items-center gap-3">
                                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border" style={{ borderColor: '#E3E8F0', background: '#F5F7FA' }}>
                                                        <TypeIcon type={row.vessel_type} active={status === 'aktif'} />
                                                    </span>
                                                    <div className="min-w-0">
                                                        <Link href={`/armada/${row.id}`} className="text-sm font-semibold transition-colors duration-150 hover:underline" style={{ color: '#111827' }}>
                                                            {row.vessel_name}
                                                        </Link>
                                                        <p className="mt-0.5 text-xs" style={{ color: '#5B6474' }}>
                                                            {row.vessel_type === 'lainnya' && row.vessel_type_custom
                                                                ? row.vessel_type_custom
                                                                : TYPE_LABELS[row.vessel_type] ?? row.vessel_type}
                                                            {' · '}
                                                            {NAV_LABELS[row.navigation_type] ?? row.navigation_type}
                                                            {row.year_built ? ` · ${row.year_built}` : ''}
                                                            {row.registration_number ? ` · Reg. ${row.registration_number}` : ''}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5 align-middle">
                                                {(() => {
                                                    const utama = [row.gt != null ? `GT ${formatNumber(row.gt)}` : null, row.dwt != null ? `DWT ${formatNumber(row.dwt, 2)}` : null].filter(Boolean).join(' · ');
                                                    const kapasitas = row.capacity_value != null ? `${formatNumber(row.capacity_value, 2)}${row.capacity_unit ? ` ${row.capacity_unit}` : ''}` : null;
                                                    if (!utama && !kapasitas) return <span className="text-xs" style={{ color: '#5B6474' }}>Belum dilengkapi</span>;
                                                    return (
                                                        <div>
                                                            {utama && <p className="font-mono text-[13px]" style={{ color: '#111827' }}>{utama}</p>}
                                                            {kapasitas && <p className="mt-0.5 text-xs" style={{ color: '#5B6474' }}>Kapasitas {kapasitas}</p>}
                                                        </div>
                                                    );
                                                })()}
                                            </td>
                                            <td className="px-4 py-3.5 align-middle">
                                                {row.base_location ? (
                                                    <p className="text-sm" style={{ color: '#111827' }}>{row.base_location}</p>
                                                ) : (
                                                    <p className="text-xs" style={{ color: '#5B6474' }}>Belum diatur</p>
                                                )}
                                                {pos && (
                                                    <p className="mt-0.5 flex items-center gap-1.5 font-mono text-[11px]" style={{ color: '#5B6474' }}>
                                                        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ background: pos.fresh ? '#15803D' : '#5B6474' }} />
                                                        Posisi terakhir {pos.label}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="px-4 py-3.5 align-middle">
                                                <Badge tone={statusTone(row.operational_status)}>
                                                    {STATUS_LABELS[row.operational_status] ?? row.operational_status}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3.5 align-middle">
                                                <div className="w-40 max-w-full">
                                                    <div className="flex items-center gap-2.5">
                                                        <Progress
                                                            percent={Math.min(100, Math.max(0, row.doc_completeness))}
                                                            showInfo={false}
                                                            strokeColor={row.doc_completeness >= 90 ? '#15803D' : row.doc_completeness >= 70 ? '#B45309' : '#BA0C2F'}
                                                            trailColor="#F5F7FA"
                                                            size="small"
                                                            className="flex-1"
                                                        />
                                                        <span className="shrink-0 font-mono text-[13px] font-semibold tabular-nums" style={{ color: row.doc_completeness >= 90 ? '#15803D' : row.doc_completeness >= 70 ? '#B45309' : '#BA0C2F' }}>
                                                            {formatNumber(row.doc_completeness, 1)}%
                                                        </span>
                                                    </div>
                                                    <p className="mt-1 text-xs" style={{ color: row.missing_count > 0 ? '#5B6474' : '#15803D' }}>
                                                        {row.missing_count > 0 ? `${row.missing_count} dokumen kurang` : 'Lengkap'}
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5 align-middle text-center">
                                                <span className="text-sm font-semibold tabular-nums" style={{ color: '#111827' }}>
                                                    {formatNumber(row.voyage_count)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5 align-middle text-right">
                                                <Link href={`/armada/${row.id}`} className="text-sm font-semibold hover:underline" style={{ color: '#BA0C2F' }}>
                                                    Detail
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </AuthenticatedLayout>
    );
}
