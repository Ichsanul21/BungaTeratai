import Badge, { type BadgeTone } from '@/Components/ui/Badge';
import Card from '@/Components/ui/Card';
import DataTable from '@/Components/ui/DataTable';
import EmptyState from '@/Components/ui/EmptyState';
import PageHeader from '@/Components/ui/PageHeader';
import TabNav from '@/Components/ui/TabNav';
import {
    VALIDITY_LABELS,
    VERIFICATION_STATUS_LABELS,
    VOYAGE_STATUS_LABELS,
} from '@/Constants/navigation';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {
    classNames,
    daysUntil,
    formatDate,
    formatDateTime,
    formatNumber,
    formatRupiah,
} from '@/lib/format';
import { type PageProps } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import {
    Activity,
    Anchor,
    ClipboardList,
    Cog,
    Edit,
    FileCheck2,
    FileStack,
    Fuel,
    History,
    MapPin,
    UserRound,
    Wrench,
} from 'lucide-react';
import { useState } from 'react';

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
const VERIF_TONES: Record<string, BadgeTone> = {
    verified: 'success',
    under_review: 'info',
    revision_required: 'warning',
    rejected: 'danger',
    uploaded: 'info',
    draft: 'neutral',
    missing: 'danger',
    archived: 'neutral',
};
const FUEL_TONES: Record<string, BadgeTone> = {
    normal: 'success',
    waspada: 'warning',
    tidak_normal: 'danger',
};

function Info({ label, value }: { label: string; value: any }) {
    return (
        <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                {label}
            </dt>
            <dd className="mt-0.5 text-sm font-medium text-ink">
                {value ?? '—'}
            </dd>
        </div>
    );
}

export default function FleetShow({
    vessel,
    completeness,
    documents,
    voyages,
    crews,
    services,
    conditions,
    fuelLogs,
    auditLogs,
    canEdit,
}: PageProps<{
    vessel: Record<string, any>;
    completeness: {
        total: number;
        met: number;
        percent: number;
        missing: Array<{ code: string; name: string; group_code: string; reason: string }>;
        items: Array<any>;
    };
    documents: Array<Record<string, any>>;
    voyages: Array<Record<string, any>>;
    crews: Array<Record<string, any>>;
    services: Array<Record<string, any>>;
    conditions: Array<Record<string, any>>;
    fuelLogs: Array<Record<string, any>>;
    auditLogs: Array<Record<string, any>>;
    canEdit?: boolean;
}>) {
    const [tab, setTab] = useState('overview');

    const tabs = [
        { key: 'overview', label: 'Overview', icon: Anchor },
        { key: 'dokumen', label: 'Dokumen', icon: FileStack, count: documents.length },
        { key: 'perjalanan', label: 'Riwayat Perjalanan', icon: ClipboardList, count: voyages.length },
        { key: 'awak', label: 'Awak Kapal', icon: UserRound, count: crews.length },
        { key: 'pemeliharaan', label: 'Pemeliharaan', icon: Wrench, count: services.length },
        { key: 'kondisi', label: 'Kondisi & BBM', icon: Fuel },
        { key: 'aktivitas', label: 'Riwayat Aktivitas', icon: History, count: auditLogs.length },
    ];

    return (
        <AuthenticatedLayout>
            <Head title={`Fleet — ${vessel.vessel_name}`} />

            <PageHeader
                title={vessel.vessel_name}
                description={`${TYPE_LABELS[vessel.vessel_type] ?? vessel.vessel_type} · ${
                    NAV_LABELS[vessel.navigation_type] ?? vessel.navigation_type
                } · ${vessel.base_location ?? '—'}`}
                actions={
                    <>
                        <Badge tone={vessel.operational_status === 'aktif' ? 'success' : 'warning'}>
                            {STATUS_LABELS[vessel.operational_status] ?? vessel.operational_status}
                        </Badge>
                        {canEdit && (
                            <Link
                                href={`/armada/${vessel.id}/edit`}
                                className="inline-flex items-center gap-2 rounded-lg border border-hairline bg-white px-3 py-2 text-sm font-medium text-ink transition hover:border-primary/40"
                            >
                                <Edit size={15} /> Edit
                            </Link>
                        )}
                    </>
                }
            />

            <TabNav tabs={tabs} active={tab} onChange={setTab} />

            {tab === 'overview' && (
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
                    <Card
                        title="Kelengkapan Dokumen (indikator internal)"
                        description="Bukan penilaian nakhoda atau persetujuan otoritas."
                        className="xl:col-span-1"
                    >
                        <div className="flex items-end gap-3">
                            <span
                                className={classNames(
                                    'text-4xl font-semibold tabular-nums',
                                    completeness.percent >= 90
                                        ? 'text-ok'
                                        : completeness.percent >= 70
                                          ? 'text-warn'
                                          : 'text-primary',
                                )}
                            >
                                {formatNumber(completeness.percent, 1)}%
                            </span>
                            <span className="mb-1.5 text-sm text-muted">
                                {completeness.met}/{completeness.total} wajib terpenuhi
                            </span>
                        </div>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-appbg">
                            <div
                                className={classNames(
                                    'h-full rounded-full',
                                    completeness.percent >= 90
                                        ? 'bg-ok'
                                        : completeness.percent >= 70
                                          ? 'bg-warn'
                                          : 'bg-primary',
                                )}
                                style={{ width: `${completeness.percent}%` }}
                            />
                        </div>
                        {completeness.missing.length > 0 && (
                            <div className="mt-4">
                                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                                    Dokumen kurang ({completeness.missing.length})
                                </p>
                                <ul className="space-y-1.5">
                                    {completeness.missing.map((m) => (
                                        <li
                                            key={m.code}
                                            className="flex items-start justify-between gap-2 rounded-lg bg-primary-tint px-3 py-2 text-xs"
                                        >
                                            <span className="text-ink">
                                                <span className="font-semibold">{m.group_code}</span> · {m.name}
                                            </span>
                                            <span className="shrink-0 text-primary">{m.reason}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </Card>

                    <Card title="Identitas & Spesifikasi" className="xl:col-span-2">
                        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-3 2xl:grid-cols-4">
                            <Info label="Nomor Registrasi" value={vessel.registration_number} />
                            <Info label="IMO" value={vessel.imo} />
                            <Info label="MMSI" value={vessel.mmsi} />
                            <Info label="Call Sign" value={vessel.call_sign} />
                            <Info label="Tahun Buat" value={vessel.year_built} />
                            <Info label="Panjang (LOA)" value={vessel.length_m ? `${vessel.length_m} m` : null} />
                            <Info label="Lebar (Beam)" value={vessel.beam_m ? `${vessel.beam_m} m` : null} />
                            <Info label="GT" value={vessel.gt} />
                            <Info label="DWT" value={vessel.dwt} />
                            <Info
                                label="Kapasitas"
                                value={
                                    vessel.capacity_value
                                        ? `${formatNumber(vessel.capacity_value, vessel.capacity_unit === 'penumpang' ? 0 : 1)} ${
                                              vessel.capacity_unit === 'penumpang' ? 'penumpang' : vessel.capacity_unit ?? ''
                                          }`
                                        : null
                                }
                            />
                            <Info label="Mesin" value={vessel.engine_spec} />
                            <Info label="Bahan Bakar" value={vessel.fuel_spec} />
                            <Info
                                label="Baseline BBM"
                                value={
                                    vessel.fuel_baseline_lph
                                        ? `${formatNumber(vessel.fuel_baseline_lph, 1)} L/jam`
                                        : null
                                }
                            />
                            <Info label="Pemilik" value={vessel.owner} />
                            <Info label="Operator" value={vessel.operator} />
                            <Info label="Basis Data" value={vessel.created_at} />
                        </dl>
                        {vessel.notes && (
                            <div className="mt-4 rounded-lg bg-appbg p-3 text-xs text-muted">
                                <span className="font-semibold text-ink">Catatan: </span>
                                {vessel.notes}
                            </div>
                        )}
                        <div className="mt-4 flex items-center gap-2 rounded-lg border border-hairline px-3 py-2 text-xs text-muted">
                            <MapPin size={14} className="text-primary" />
                            Posisi terakhir: {vessel.last_lat ?? '—'}, {vessel.last_lng ?? '—'}
                            <span className="text-muted">
                                ({formatDateTime(vessel.last_position_at)})
                            </span>
                            <span className="ms-auto rounded bg-warn/10 px-1.5 py-0.5 font-medium text-warn">
                                SIMULASI
                            </span>
                        </div>
                    </Card>
                </div>
            )}

            {tab === 'dokumen' && (
                <DataTable
                    columns={[
                        {
                            key: 'document_name',
                            label: 'Dokumen',
                            render: (row: any) => (
                                <Link
                                    href={`/dokumen/${row.id}`}
                                    className="font-medium text-ink hover:text-primary hover:underline"
                                >
                                    {row.document_name}
                                </Link>
                            ),
                        },
                        { key: 'group_code', label: 'Grup', className: 'text-center' },
                        { key: 'category_name', label: 'Kategori', className: 'text-muted' },
                        { key: 'document_number', label: 'Nomor' },
                        {
                            key: 'expiry_date',
                            label: 'Berlaku s/d',
                            render: (row: any) =>
                                row.has_expiry ? (
                                    <span
                                        className={classNames(
                                            'text-sm',
                                            daysUntil(row.expiry_date) !== null && daysUntil(row.expiry_date)! < 0
                                                ? 'font-semibold text-primary'
                                                : daysUntil(row.expiry_date)! <= 30
                                                  ? 'font-semibold text-warn'
                                                  : 'text-ink',
                                        )}
                                    >
                                        {row.expiry_date}
                                        {daysUntil(row.expiry_date) !== null && (
                                            <span className="ms-1 text-xs text-muted">
                                                ({daysUntil(row.expiry_date)! < 0
                                                    ? `lewat ${Math.abs(daysUntil(row.expiry_date)!)} hr`
                                                    : `${daysUntil(row.expiry_date)} hr lagi`})
                                            </span>
                                        )}
                                    </span>
                                ) : (
                                    <span className="text-xs text-muted">Tanpa masa berlaku</span>
                                ),
                        },
                        {
                            key: 'verification_status',
                            label: 'Status',
                            render: (row: any) => (
                                <Badge tone={VERIF_TONES[row.verification_status] ?? 'neutral'}>
                                    {VERIFICATION_STATUS_LABELS[row.verification_status] ??
                                        row.verification_status}
                                </Badge>
                            ),
                        },
                    ]}
                    rows={documents}
                    rowKey="id"
                    emptyTitle="Belum ada dokumen kapal"
                    emptyDescription="Unggah dokumen identitas & sertifikat kapal di Document Center."
                    emptyIcon={FileStack}
                    emptyAction={
                        <Link
                            href="/dokumen/create"
                            className="rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-white hover:bg-primary-hover"
                        >
                            Unggah Dokumen
                        </Link>
                    }
                />
            )}

            {tab === 'perjalanan' && (
                <DataTable
                    columns={[
                        {
                            key: 'voyage_code',
                            label: 'Kode',
                            render: (row: any) => (
                                <span className="font-medium text-ink">{row.voyage_code}</span>
                            ),
                        },
                        {
                            key: 'origin',
                            label: 'Rute',
                            render: (row: any) => `${row.origin} → ${row.destination}`,
                        },
                        {
                            key: 'planned_departure',
                            label: 'Jadwal Berangkat',
                            render: (row: any) => formatDateTime(row.planned_departure),
                        },
                        {
                            key: 'voyage_status',
                            label: 'Status',
                            render: (row: any) => (
                                <Badge
                                    tone={
                                        row.voyage_status === 'completed'
                                            ? 'success'
                                            : row.voyage_status === 'cancelled' || row.voyage_status === 'delayed'
                                              ? 'danger'
                                              : 'info'
                                    }
                                >
                                    {VOYAGE_STATUS_LABELS[row.voyage_status] ?? row.voyage_status}
                                </Badge>
                            ),
                        },
                    ]}
                    rows={voyages}
                    emptyTitle="Belum ada riwayat perjalanan"
                    emptyDescription="Perjalanan kapal ini akan tampil setelah dibuat di Voyage Management."
                    emptyIcon={Anchor}
                />
            )}

            {tab === 'awak' && (
                <DataTable
                    columns={[
                        { key: 'name', label: 'Nama', render: (r: any) => <span className="font-medium text-ink">{r.name}</span> },
                        {
                            key: 'rank',
                            label: 'Jabatan Pelayaran',
                            render: (r: any) => <span className="capitalize">{r.rank?.replace('_', ' ')}</span>,
                        },
                        { key: 'role', label: 'Penempatan', render: (r: any) => r.role },
                        { key: 'start_date', label: 'Mulai', render: (r: any) => formatDate(r.start_date) },
                        { key: 'end_date', label: 'Selesai', render: (r: any) => formatDate(r.end_date) },
                        {
                            key: 'status',
                            label: 'Status',
                            render: (r: any) => (
                                <Badge tone={r.status === 'aktif' ? 'success' : 'neutral'}>{r.status}</Badge>
                            ),
                        },
                    ]}
                    rows={crews}
                    emptyTitle="Belum ada awak ditempatkan"
                    emptyDescription="Penempatan ABK dikelola di menu SDM & Karyawan."
                    emptyIcon={UserRound}
                />
            )}

            {tab === 'pemeliharaan' && (
                <DataTable
                    columns={[
                        { key: 'title', label: 'Servis', render: (r: any) => <span className="font-medium text-ink">{r.title}</span> },
                        {
                            key: 'type',
                            label: 'Jenis',
                            render: (r: any) => <Badge tone={r.type === 'drydock' ? 'info' : 'neutral'}>{r.type}</Badge>,
                        },
                        { key: 'workshop', label: 'Bengkel' },
                        { key: 'start_date', label: 'Mulai', render: (r: any) => formatDate(r.start_date) },
                        { key: 'end_date', label: 'Selesai', render: (r: any) => formatDate(r.end_date) },
                        { key: 'cost', label: 'Biaya', className: 'text-right tabular-nums', render: (r: any) => formatRupiah(r.cost) },
                        {
                            key: 'status',
                            label: 'Status',
                            render: (r: any) => (
                                <Badge tone={r.status === 'selesai' ? 'success' : r.status === 'proses' ? 'warning' : 'neutral'}>
                                    {r.status}
                                </Badge>
                            ),
                        },
                    ]}
                    rows={services}
                    emptyTitle="Belum ada catatan servis"
                    emptyDescription="Pemeliharaan & pemeriksaan dicatat di menu Operations."
                    emptyIcon={Cog}
                />
            )}

            {tab === 'kondisi' && (
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                    <Card title="Riwayat Kondisi Kapal" description="Skor ceklis 0–100">
                        {conditions.length === 0 ? (
                            <EmptyState
                                icon={Activity}
                                title="Belum ada pemeriksaan kondisi"
                                description="Ceklis kondisi dilakukan dari menu Operations → Kondisi."
                            />
                        ) : (
                            <ul className="space-y-3">
                                {conditions.map((c) => (
                                    <li key={c.id} className="rounded-lg border border-hairline p-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-muted">
                                                {formatDateTime(c.checked_at)}
                                            </span>
                                            <span
                                                className={classNames(
                                                    'rounded-full px-2 py-0.5 text-xs font-semibold',
                                                    c.score >= 85
                                                        ? 'bg-ok/10 text-ok'
                                                        : c.score >= 70
                                                          ? 'bg-warn/10 text-warn'
                                                          : 'bg-primary/10 text-primary',
                                                )}
                                            >
                                                Skor {c.score}
                                            </span>
                                        </div>
                                        {c.notes && (
                                            <p className="mt-1 text-sm text-ink">{c.notes}</p>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Card>
                    <Card title="Monitoring BBM" description="Konsumsi vs baseline L/jam">
                        {fuelLogs.length === 0 ? (
                            <EmptyState
                                icon={Fuel}
                                title="Belum ada trip BBM"
                                description="Log trip dicatat di menu Operations → Monitoring BBM."
                            />
                        ) : (
                            <ul className="space-y-2">
                                {fuelLogs.map((f) => (
                                    <li
                                        key={f.id}
                                        className="flex items-center justify-between gap-3 rounded-lg border border-hairline px-3 py-2.5 text-sm"
                                    >
                                        <div>
                                            <p className="font-medium text-ink">{f.route}</p>
                                            <p className="text-xs text-muted">
                                                {formatDate(f.trip_date)} · {f.duration_hours} jam ·{' '}
                                                {formatNumber(f.liters, 0)} L ·{' '}
                                                {formatNumber(f.liters / f.duration_hours, 1)} L/jam
                                            </p>
                                        </div>
                                        <Badge tone={FUEL_TONES[f.analysis_status] ?? 'neutral'}>
                                            {f.analysis_status === 'tidak_normal'
                                                ? 'Tidak Normal'
                                                : f.analysis_status === 'waspada'
                                                  ? 'Waspada'
                                                  : 'Normal'}{' '}
                                            ({f.analysis_diff_pct > 0 ? '+' : ''}
                                            {formatNumber(f.analysis_diff_pct, 1)}%)
                                        </Badge>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Card>
                </div>
            )}

            {tab === 'aktivitas' && (
                <DataTable
                    columns={[
                        {
                            key: 'timestamp',
                            label: 'Waktu',
                            render: (r: any) => formatDateTime(r.timestamp),
                        },
                        { key: 'user_name', label: 'Pengguna', render: (r: any) => r.user_name ?? 'Sistem' },
                        {
                            key: 'action',
                            label: 'Aksi',
                            render: (r: any) => <Badge tone="info">{r.action}</Badge>,
                        },
                        { key: 'change_summary', label: 'Ringkasan' },
                    ]}
                    rows={auditLogs}
                    emptyTitle="Belum ada aktivitas"
                    emptyIcon={History}
                />
            )}
        </AuthenticatedLayout>
    );
}
