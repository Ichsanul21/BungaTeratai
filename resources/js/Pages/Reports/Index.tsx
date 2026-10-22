import Badge, { type BadgeTone } from '@/Components/ui/Badge';
import Card from '@/Components/ui/Card';
import PageHeader from '@/Components/ui/PageHeader';
import TabNav from '@/Components/ui/TabNav';
import { VOYAGE_STATUS_LABELS, VERIFICATION_STATUS_LABELS } from '@/Constants/navigation';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { classNames, formatDate, formatNumber, formatRupiah } from '@/lib/format';
import { type PageProps } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Fuel, ClipboardList, Printer, Ship, FileStack } from 'lucide-react';
import { FormEvent } from 'react';

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
    const tabs = [
        { key: 'armada', label: 'Laporan Armada', icon: Ship },
        { key: 'dokumen', label: 'Laporan Dokumen', icon: FileStack },
        { key: 'perjalanan', label: 'Laporan Perjalanan', icon: ClipboardList },
        { key: 'operasional', label: 'Laporan Operasional', icon: Fuel },
        { key: 'ekspor', label: 'Ekspor Excel', icon: Printer },
    ];

    const apply = (e: FormEvent) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget as HTMLFormElement);
        router.get('/laporan', {
            tab,
            vessel_id: fd.get('vessel_id') || undefined,
            from: fd.get('from') || undefined,
            to: fd.get('to') || undefined,
        }, { preserveState: true });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Laporan" />

            <PageHeader
                title="Laporan"
                description="Laporan armada, dokumen, perjalanan, dan operasional — filter kapal + periode, siap cetak."
                actions={
                    <button
                        type="button"
                        onClick={() => window.print()}
                        className="inline-flex items-center gap-2 rounded-lg border border-hairline bg-white px-3.5 py-2 text-sm font-medium text-ink hover:border-primary/40"
                    >
                        <Printer size={16} /> Cetak
                    </button>
                }
            />

            <TabNav
                tabs={tabs}
                active={tab}
                onChange={(key) => router.get('/laporan', { tab: key }, { preserveState: true })}
            />

            <form onSubmit={apply} className="mb-5 flex flex-wrap items-end gap-3 rounded-xl border border-hairline bg-white p-4">
                <div>
                    <label className="text-xs font-medium text-muted">Kapal</label>
                    <select name="vessel_id" defaultValue={filters.vessel_id ?? ''} className="mt-1 block rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary">
                        <option value="">Semua kapal</option>
                        {vessels.map((v) => <option key={v.id} value={v.id}>{v.vessel_name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-xs font-medium text-muted">Dari</label>
                    <input type="date" name="from" defaultValue={filters.from} className="mt-1 block rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary" />
                </div>
                <div>
                    <label className="text-xs font-medium text-muted">Sampai</label>
                    <input type="date" name="to" defaultValue={filters.to} className="mt-1 block rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary" />
                </div>
                <button type="submit" className="rounded-lg bg-ink px-3.5 py-2 text-sm font-medium text-white hover:bg-black">
                    Terapkan
                </button>
            </form>

            {/* Ringkasan */}
            <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
                {Object.entries(summary ?? {}).map(([k, v]) => (
                    <div key={k} className="rounded-xl border border-hairline bg-white p-4">
                        <p className="text-xs uppercase tracking-wide text-muted">
                            {k.replace(/_/g, ' ')}
                        </p>
                        <p className="mt-1 text-xl font-semibold tabular-nums text-ink">
                            {k === 'liter' ? formatNumber(v as number, 0) + ' L'
                                : k === 'biaya' || k === 'servis_biaya' || k === 'pendapatan' || k === 'kas_total'
                                    ? formatRupiah(v as number)
                                    : formatNumber(v as number)}
                        </p>
                    </div>
                ))}
            </div>

            <div className="overflow-x-auto rounded-xl border border-hairline bg-white shadow-sm">
                {tab === 'armada' && (
                    <table className="min-w-full text-sm">
                        <thead className="bg-appbg text-left text-xs uppercase text-muted">
                            <tr>{['Kapal', 'Jenis', 'Navigasi', 'Status Ops', 'Pangkalan', 'Kelengkapan', 'Kurang', 'Perjalanan'].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr>
                        </thead>
                        <tbody className="divide-y divide-hairline">
                            {rows.map((r) => (
                                <tr key={r.id} className="hover:bg-appbg">
                                    <td className="px-3 py-2 font-medium text-ink">{r.vessel_name}</td>
                                    <td className="px-3 py-2 capitalize text-muted">{r.vessel_type?.replace('_', ' ')}</td>
                                    <td className="px-3 py-2 capitalize text-muted">{r.navigation_type?.replace('_', ' ')}</td>
                                    <td className="px-3 py-2"><Badge tone={r.operational_status === 'aktif' ? 'success' : 'warning'}>{r.operational_status}</Badge></td>
                                    <td className="px-3 py-2 text-muted">{r.base_location}</td>
                                    <td className={classNames('px-3 py-2 font-semibold tabular-nums', r.kelengkapan >= 90 ? 'text-ok' : r.kelengkapan >= 70 ? 'text-warn' : 'text-primary')}>
                                        {formatNumber(r.kelengkapan, 1)}%
                                    </td>
                                    <td className="px-3 py-2 tabular-nums text-muted">{r.kurang}</td>
                                    <td className="px-3 py-2 tabular-nums text-muted">{r.voyages}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {tab === 'dokumen' && (
                    <table className="min-w-full text-sm">
                        <thead className="bg-appbg text-left text-xs uppercase text-muted">
                            <tr>{['Dokumen', 'Grup', 'Milik', 'Verifikasi', 'Berlaku s/d', 'Sisa Hari'].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr>
                        </thead>
                        <tbody className="divide-y divide-hairline">
                            {rows.map((r) => (
                                <tr key={r.id} className="hover:bg-appbg">
                                    <td className="px-3 py-2 font-medium text-ink">{r.document_name}</td>
                                    <td className="px-3 py-2 text-muted">{r.group_code}</td>
                                    <td className="px-3 py-2 text-muted">{r.owner_name} <span className="text-[10px] uppercase">({r.owner_type})</span></td>
                                    <td className="px-3 py-2"><Badge tone={VERIF_TONES[r.verification_status] ?? 'neutral'}>{VERIFICATION_STATUS_LABELS[r.verification_status] ?? r.verification_status}</Badge></td>
                                    <td className="px-3 py-2 text-muted">{r.has_expiry ? r.expiry_date : 'Tanpa masa berlaku'}</td>
                                    <td className={classNames('px-3 py-2 font-semibold tabular-nums', r.days_left !== null && r.days_left < 0 ? 'text-primary' : r.days_left !== null && r.days_left <= 30 ? 'text-warn' : 'text-muted')}>
                                        {r.days_left !== null ? r.days_left : '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {tab === 'perjalanan' && (
                    <table className="min-w-full text-sm">
                        <thead className="bg-appbg text-left text-xs uppercase text-muted">
                            <tr>{['Kode', 'Kapal', 'Rute', 'Berangkat', 'Status', 'Tiba', 'Biaya'].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr>
                        </thead>
                        <tbody className="divide-y divide-hairline">
                            {rows.map((r) => (
                                <tr key={r.id} className="hover:bg-appbg">
                                    <td className="px-3 py-2 font-medium text-ink">{r.voyage_code}</td>
                                    <td className="px-3 py-2 text-muted">{r.vessel_name}</td>
                                    <td className="px-3 py-2 text-muted">{r.origin} → {r.destination}</td>
                                    <td className="px-3 py-2 text-muted">{formatDate(r.planned_departure)}</td>
                                    <td className="px-3 py-2">
                                        <Badge tone={r.voyage_status === 'completed' ? 'success' : r.voyage_status === 'delayed' || r.voyage_status === 'cancelled' ? 'danger' : 'info'}>
                                            {VOYAGE_STATUS_LABELS[r.voyage_status] ?? r.voyage_status}
                                        </Badge>
                                    </td>
                                    <td className="px-3 py-2 text-muted">{formatDate(r.actual_arrival)}</td>
                                    <td className="px-3 py-2 tabular-nums">{formatRupiah(r.biaya)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {tab === 'operasional' && (
                    <table className="min-w-full text-sm">
                        <thead className="bg-appbg text-left text-xs uppercase text-muted">
                            <tr>{['Tanggal', 'Kapal', 'Rute', 'Durasi', 'Liter', 'L/jam', 'Biaya', 'Analisis'].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr>
                        </thead>
                        <tbody className="divide-y divide-hairline">
                            {rows.map((r) => (
                                <tr key={r.id} className="hover:bg-appbg">
                                    <td className="px-3 py-2">{formatDate(r.trip_date)}</td>
                                    <td className="px-3 py-2 font-medium text-ink">{r.vessel_name}</td>
                                    <td className="px-3 py-2 text-muted">{r.route}</td>
                                    <td className="px-3 py-2 tabular-nums">{r.duration_hours} jam</td>
                                    <td className="px-3 py-2 tabular-nums">{formatNumber(r.liters, 0)} L</td>
                                    <td className="px-3 py-2 tabular-nums">{formatNumber(r.lph, 1)}</td>
                                    <td className="px-3 py-2 tabular-nums">{formatRupiah(r.cost)}</td>
                                    <td className="px-3 py-2">
                                        <Badge tone={FUEL_TONES[r.analysis_status] ?? 'neutral'}>
                                            {r.analysis_status === 'tidak_normal' ? 'Tidak Normal' : r.analysis_status === 'waspada' ? 'Waspada' : 'Normal'}
                                        </Badge>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <p className="mt-4 text-xs text-muted">
                Laporan dihasilkan dari data sistem — indikator kesiapan bersifat internal, bukan penilaian otoritas.
            </p>
            {tab === 'ekspor' && (
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                    <Card title="Master Tracker TB & BG" description="Sheet TugBoat + Barge — kolom persis file klien (expired, endorsement, status).">
                        <a href="/laporan/export/master-tracker" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover">
                            <Printer size={16} /> Download Master Tracker (.xlsx)
                        </a>
                    </Card>
                    <Card title="Monthly Document Expiry & Endorsement Report" description="Laporan bulanan kedaluwarsa + endorsement per kapal.">
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                const period = (new FormData(e.currentTarget as HTMLFormElement).get('period') as string) || '';
                                window.open(`/laporan/export/monthly?period=${period}`, '_blank');
                            }}
                            className="flex items-end gap-2"
                        >
                            <div>
                                <label className="text-xs font-medium text-muted">Periode</label>
                                <input type="month" name="period" defaultValue={new Date().toISOString().slice(0, 7)} className="mt-1 block rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" />
                            </div>
                            <button type="submit" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover">
                                <Printer size={16} /> Download (.xlsx)
                            </button>
                        </form>
                    </Card>
                    <Card title="Rekap Nota" description="Rekap bill per toko — format Excel REKAP NOTA.">
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                const fd = new FormData(e.currentTarget as HTMLFormElement);
                                window.open(`/laporan/export/rekap-nota?from=${fd.get('from')}&to=${fd.get('to')}`, '_blank');
                            }}
                            className="flex items-end gap-2"
                        >
                            <div>
                                <label className="text-xs font-medium text-muted">Dari</label>
                                <input type="date" name="from" defaultValue={new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10)} className="mt-1 block rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-muted">Sampai</label>
                                <input type="date" name="to" defaultValue={new Date().toISOString().slice(0, 10)} className="mt-1 block rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" />
                            </div>
                            <button type="submit" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover">
                                <Printer size={16} /> Download (.xlsx)
                            </button>
                        </form>
                    </Card>
                    <Card title="Outstanding — Rencana Pembayaran" description="Kolom: No, Toko, Nomor Cek/BG, Jumlah, Rencana Pembayaran.">
                        <a href="/laporan/export/outstanding" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover">
                            <Printer size={16} /> Download OUTSTANDING (.xlsx)
                        </a>
                    </Card>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
