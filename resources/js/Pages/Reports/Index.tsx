import Badge, { type BadgeTone } from '@/Components/ui/Badge';
import Card from '@/Components/ui/Card';
import PageHeader from '@/Components/ui/PageHeader';
import TabNav from '@/Components/ui/TabNav';
import { VOYAGE_STATUS_LABELS, VERIFICATION_STATUS_LABELS } from '@/Constants/navigation';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { classNames, formatDate, formatNumber, formatRupiah } from '@/lib/format';
import { type PageProps } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Table, Button, Select, Row, Col, Space } from 'antd';
import { Fuel, ClipboardList, Printer, Ship, FileStack } from 'lucide-react';
import { useState } from 'react';

const VERIF_TONES: Record<string, BadgeTone> = {
    verified: 'success', under_review: 'info', uploaded: 'info',
    revision_required: 'warning', rejected: 'danger', draft: 'neutral', missing: 'danger',
};
const FUEL_TONES: Record<string, BadgeTone> = {
    normal: 'success', waspada: 'warning', tidak_normal: 'danger',
};

export default function ReportsIndex({
    tab,
    filters,
    vessels,
    rows,
    summary,
}: PageProps<{
    tab: string;
    filters: Record<string, any>;
    vessels: Array<{ id: number; vessel_name: string }>;
    rows: Array<Record<string, any>>;
    summary: Record<string, any>;
}>) {
    const [vesselId, setVesselId] = useState(filters.vessel_id ?? '');
    const [from, setFrom] = useState(filters.from ?? undefined);
    const [to, setTo] = useState(filters.to ?? undefined);

    const tabs = [
        { key: 'armada', label: 'Laporan Armada', icon: Ship },
        { key: 'dokumen', label: 'Laporan Dokumen', icon: FileStack },
        { key: 'perjalanan', label: 'Laporan Perjalanan', icon: ClipboardList },
        { key: 'operasional', label: 'Laporan Operasional', icon: Fuel },
        { key: 'ekspor', label: 'Ekspor Excel', icon: Printer },
    ];

    const apply = () => {
        router.get('/laporan', {
            tab,
            vessel_id: vesselId || undefined,
            from: from || undefined,
            to: to || undefined,
        }, { preserveState: true });
    };

    const armadaColumns = [
        { title: 'Kapal', dataIndex: 'vessel_name', key: 'vessel_name', render: (v: string) => <span className="font-medium text-[#1C1B1A]">{v}</span> },
        { title: 'Jenis', dataIndex: 'vessel_type', key: 'vessel_type', render: (v: string) => <span className="text-[#8A8580] capitalize">{v?.replace('_', ' ')}</span> },
        { title: 'Navigasi', dataIndex: 'navigation_type', key: 'navigation_type', render: (v: string) => <span className="text-[#8A8580] capitalize">{v?.replace('_', ' ')}</span> },
        { title: 'Status Ops', dataIndex: 'operational_status', key: 'operational_status', render: (v: string) => <Badge tone={v === 'aktif' ? 'success' : 'warning'}>{v}</Badge> },
        { title: 'Pangkalan', dataIndex: 'base_location', key: 'base_location', render: (v: string) => <span className="text-[#8A8580]">{v}</span> },
        { title: 'Kelengkapan', dataIndex: 'kelengkapan', key: 'kelengkapan', render: (v: number) => (
            <span className={classNames('font-semibold tabular-nums', v >= 90 ? 'text-[#2F8F68]' : v >= 70 ? 'text-[#D99A2B]' : 'text-[#C1121F]')}>
                {formatNumber(v, 1)}%
            </span>
        )},
        { title: 'Kurang', dataIndex: 'kurang', key: 'kurang', render: (v: number) => <span className="tabular-nums text-[#8A8580]">{v}</span> },
        { title: 'Perjalanan', dataIndex: 'voyages', key: 'voyages', render: (v: number) => <span className="tabular-nums text-[#8A8580]">{v}</span> },
    ];

    const dokumenColumns = [
        { title: 'Dokumen', dataIndex: 'document_name', key: 'document_name', render: (v: string) => <span className="font-medium text-[#1C1B1A]">{v}</span> },
        { title: 'Grup', dataIndex: 'group_code', key: 'group_code', render: (v: string) => <span className="text-[#8A8580]">{v}</span> },
        { title: 'Milik', key: 'owner', render: (_: any, r: any) => (
            <span className="text-[#8A8580]">{r.owner_name} <span className="text-[10px] uppercase">({r.owner_type})</span></span>
        )},
        { title: 'Verifikasi', dataIndex: 'verification_status', key: 'verification_status', render: (v: string) => (
            <Badge tone={VERIF_TONES[v] ?? 'neutral'}>{VERIFICATION_STATUS_LABELS[v] ?? v}</Badge>
        )},
        { title: 'Berlaku s/d', key: 'expiry', render: (_: any, r: any) => <span className="text-[#8A8580]">{r.has_expiry ? r.expiry_date : 'Tanpa masa berlaku'}</span> },
        { title: 'Sisa Hari', dataIndex: 'days_left', key: 'days_left', render: (v: number | null) => (
            <span className={classNames('font-semibold tabular-nums', v !== null && v < 0 ? 'text-[#C1121F]' : v !== null && v <= 30 ? 'text-[#D99A2B]' : 'text-[#8A8580]')}>
                {v !== null ? v : '—'}
            </span>
        )},
    ];

    const perjalananColumns = [
        { title: 'Kode', dataIndex: 'voyage_code', key: 'voyage_code', render: (v: string) => <span className="font-medium text-[#1C1B1A]">{v}</span> },
        { title: 'Kapal', dataIndex: 'vessel_name', key: 'vessel_name', render: (v: string) => <span className="text-[#8A8580]">{v}</span> },
        { title: 'Rute', key: 'route', render: (_: any, r: any) => <span className="text-[#8A8580]">{r.origin} → {r.destination}</span> },
        { title: 'Berangkat', dataIndex: 'planned_departure', key: 'planned_departure', render: (v: string) => <span className="text-[#8A8580]">{formatDate(v)}</span> },
        { title: 'Status', dataIndex: 'voyage_status', key: 'voyage_status', render: (v: string) => (
            <Badge tone={v === 'completed' ? 'success' : v === 'delayed' || v === 'cancelled' ? 'danger' : 'info'}>
                {VOYAGE_STATUS_LABELS[v] ?? v}
            </Badge>
        )},
        { title: 'Tiba', dataIndex: 'actual_arrival', key: 'actual_arrival', render: (v: string) => <span className="text-[#8A8580]">{formatDate(v)}</span> },
        { title: 'Biaya', dataIndex: 'biaya', key: 'biaya', render: (v: number) => <span className="tabular-nums">{formatRupiah(v)}</span> },
    ];

    const operasionalColumns = [
        { title: 'Tanggal', dataIndex: 'trip_date', key: 'trip_date', render: (v: string) => formatDate(v) },
        { title: 'Kapal', dataIndex: 'vessel_name', key: 'vessel_name', render: (v: string) => <span className="font-medium text-[#1C1B1A]">{v}</span> },
        { title: 'Rute', dataIndex: 'route', key: 'route', render: (v: string) => <span className="text-[#8A8580]">{v}</span> },
        { title: 'Durasi', dataIndex: 'duration_hours', key: 'duration_hours', render: (v: number) => <span className="tabular-nums">{v} jam</span> },
        { title: 'Liter', dataIndex: 'liters', key: 'liters', render: (v: number) => <span className="tabular-nums">{formatNumber(v, 2)} L</span> },
        { title: 'L/jam', dataIndex: 'lph', key: 'lph', render: (v: number) => <span className="tabular-nums">{formatNumber(v, 1)}</span> },
        { title: 'Biaya', dataIndex: 'cost', key: 'cost', render: (v: number) => <span className="tabular-nums">{formatRupiah(v)}</span> },
        { title: 'Analisis', dataIndex: 'analysis_status', key: 'analysis_status', render: (v: string) => (
            <Badge tone={FUEL_TONES[v] ?? 'neutral'}>
                {v === 'tidak_normal' ? 'Tidak Normal' : v === 'waspada' ? 'Waspada' : 'Normal'}
            </Badge>
        )},
    ];

    const getColumns = () => {
        switch (tab) {
            case 'armada': return armadaColumns;
            case 'dokumen': return dokumenColumns;
            case 'perjalanan': return perjalananColumns;
            case 'operasional': return operasionalColumns;
            default: return [];
        }
    };

    return (
        <AuthenticatedLayout>
            <Head title="Laporan" />

            <PageHeader
                title="Laporan"
                description="Laporan armada, dokumen, perjalanan, dan operasional — filter kapal + periode, siap cetak."
                actions={
                    <Button onClick={() => window.print()} icon={<Printer size={16} />}>
                        Cetak
                    </Button>
                }
            />

            <TabNav
                tabs={tabs}
                active={tab}
                onChange={(key) => router.get('/laporan', { tab: key }, { preserveState: true })}
            />

            <div className="mb-5 rounded-xl border border-[#E7E1D9] bg-white p-4">
                <Row gutter={16} align="middle">
                    <Col>
                        <label className="text-xs font-medium text-[#8A8580]">Kapal</label>
                        <Select
                            value={vesselId}
                            onChange={setVesselId}
                            style={{ width: 200 }}
                            options={[{ value: '', label: 'Semua kapal' }, ...vessels.map((v) => ({ value: v.id, label: v.vessel_name }))]}
                        />
                    </Col>
                    <Col>
                        <label className="block text-xs font-medium text-[#8A8580]">Dari</label>
                        <input
                            type="date"
                            value={from || ''}
                            onChange={(e) => setFrom(e.target.value || null)}
                            className="mt-1 w-full rounded-lg border border-[#E7E1D9] bg-white px-3 py-1.5 text-sm text-[#1C1B1A] focus:border-[#C1121F] focus:outline-none focus:ring-2 focus:ring-[#C1121F]/20"
                        />
                    </Col>
                    <Col>
                        <label className="block text-xs font-medium text-[#8A8580]">Sampai</label>
                        <input
                            type="date"
                            value={to || ''}
                            onChange={(e) => setTo(e.target.value || null)}
                            className="mt-1 w-full rounded-lg border border-[#E7E1D9] bg-white px-3 py-1.5 text-sm text-[#1C1B1A] focus:border-[#C1121F] focus:outline-none focus:ring-2 focus:ring-[#C1121F]/20"
                        />
                    </Col>
                    <Col>
                        <Button type="primary" onClick={apply} style={{ background: '#1C1B1A', borderColor: '#1C1B1A' }}>
                            Terapkan
                        </Button>
                    </Col>
                </Row>
            </div>

            <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
                {Object.entries(summary ?? {}).map(([k, v]) => (
                    <div key={k} className="rounded-xl border border-[#E7E1D9] bg-white p-4">
                        <p className="text-xs uppercase tracking-wide text-[#8A8580]">
                            {k.replace(/_/g, ' ')}
                        </p>
                        <p className="mt-1 text-xl font-semibold tabular-nums text-[#1C1B1A]">
                            {k === 'liter' ? formatNumber(v as number, 2) + ' L'
                                : k === 'biaya' || k === 'servis_biaya' || k === 'pendapatan' || k === 'kas_total'
                                    ? formatRupiah(v as number)
                                    : formatNumber(v as number)}
                        </p>
                    </div>
                ))}
            </div>

            {tab !== 'ekspor' && (
                <div className="overflow-x-auto rounded-xl border border-[#E7E1D9] bg-white shadow-sm">
                    <Table
                        columns={getColumns()}
                        dataSource={rows}
                        rowKey="id"
                        pagination={false}
                        size="small"
                    />
                </div>
            )}

            <p className="mt-4 text-xs text-[#8A8580]">
                Laporan dihasilkan dari data sistem — indikator kesiapan bersifat internal, bukan penilaian otoritas.
            </p>
            {tab === 'ekspor' && (
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                    <Card title="Master Tracker TB & BG" description="Sheet TugBoat + Barge — kolom persis file klien (expired, endorsement, status).">
                        <a href="/laporan/export/master-tracker" target="_blank" rel="noreferrer">
                            <Button type="primary" icon={<Printer size={16} />}>
                                Download Master Tracker (.xlsx)
                            </Button>
                        </a>
                    </Card>
                    <Card title="Monthly Document Expiry & Endorsement Report" description="Laporan bulanan kedaluwarsa + endorsement per kapal.">
                        <Space align="end">
                            <div>
                                <label className="text-xs font-medium text-[#8A8580]">Periode</label>
                                <input type="month" name="period" defaultValue={new Date().toISOString().slice(0, 7)} className="mt-1 block rounded-md border-[#E7E1D9] text-sm shadow-sm focus:border-[#C1121F] focus:ring-[#C1121F]" />
                            </div>
                            <Button type="primary" icon={<Printer size={16} />} onClick={() => {
                                const period = (document.querySelector('input[name="period"]') as HTMLInputElement)?.value || '';
                                window.open(`/laporan/export/monthly?period=${period}`, '_blank');
                            }}>
                                Download (.xlsx)
                            </Button>
                        </Space>
                    </Card>
                    <Card title="Rekap Nota" description="Rekap bill per toko — format Excel REKAP NOTA.">
                        <Space align="end">
                            <div>
                                <label className="text-xs font-medium text-[#8A8580]">Dari</label>
                                <input type="date" name="from" defaultValue={new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10)} className="mt-1 block rounded-md border-[#E7E1D9] text-sm focus:border-[#C1121F] focus:ring-[#C1121F]" />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-[#8A8580]">Sampai</label>
                                <input type="date" name="to" defaultValue={new Date().toISOString().slice(0, 10)} className="mt-1 block rounded-md border-[#E7E1D9] text-sm focus:border-[#C1121F] focus:ring-[#C1121F]" />
                            </div>
                            <Button type="primary" icon={<Printer size={16} />} onClick={() => {
                                const fromInput = document.querySelector('input[name="from"]') as HTMLInputElement;
                                const toInput = document.querySelector('input[name="to"]') as HTMLInputElement;
                                window.open(`/laporan/export/rekap-nota?from=${fromInput?.value}&to=${toInput?.value}`, '_blank');
                            }}>
                                Download (.xlsx)
                            </Button>
                        </Space>
                    </Card>
                    <Card title="Outstanding — Rencana Pembayaran" description="Kolom: No, Toko, Nomor Cek/BG, Jumlah, Rencana Pembayaran.">
                        <a href="/laporan/export/outstanding" target="_blank" rel="noreferrer">
                            <Button type="primary" icon={<Printer size={16} />}>
                                Download OUTSTANDING (.xlsx)
                            </Button>
                        </a>
                    </Card>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
