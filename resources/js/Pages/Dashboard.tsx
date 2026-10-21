import Badge, { type BadgeTone } from '@/Components/ui/Badge';
import Card from '@/Components/ui/Card';
import StatCard from '@/Components/ui/StatCard';
import { VOYAGE_STATUS_LABELS } from '@/Constants/navigation';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { classNames, daysUntil, formatDateTime, formatNumber, formatRupiah } from '@/lib/format';
import { type PageProps } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import {
    AlertTriangle,
    Anchor,
    BellRing,
    CalendarClock,
    FileWarning,
    Fuel,
    History,
    Landmark,
    PieChart as PieIcon,
    Receipt,
    Ship,
    TrendingDown,
    TrendingUp,
    Wallet,
} from 'lucide-react';
import { useState } from 'react';
import {
    CartesianGrid,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Cell,
    Tooltip,
    XAxis,
    YAxis,
    Legend,
} from 'recharts';

const STATUS_TONES: Record<string, BadgeTone> = {
    completed: 'success', delayed: 'danger', cancelled: 'danger',
    ready_for_departure: 'success', in_transit: 'info', departed: 'info',
    internal_review: 'info', awaiting_external_approval: 'warning',
    document_preparation: 'warning', planned: 'neutral', draft: 'neutral',
};

const PIE_COLORS: Record<string, string> = {
    verified: '#2F8F68',
    under_review: '#33658A',
    uploaded: '#168C8C',
    revision_required: '#D99A2B',
    rejected: '#C94C4C',
    draft: '#64748B',
    missing: '#C41212',
    archived: '#94A3B8',
};

export default function Dashboard({
    kpis,
    revenueSeries,
    docsByStatus,
    reminders,
    recentVoyages,
    recentActivity,
    filters,
    vesselTypes,
}: PageProps<{
    kpis: Record<string, number>;
    revenueSeries: Array<{ bulan: string; pendapatan: number; biaya: number }>;
    docsByStatus: Record<string, number>;
    reminders: Array<Record<string, any>>;
    recentVoyages: Array<Record<string, any>>;
    recentActivity: Array<Record<string, any>>;
    filters: { months: number; type: string };
    vesselTypes: string[];
}>) {
    const [months, setMonths] = useState(String(filters.months));
    const [type, setType] = useState(filters.type ?? '');

    const pieData = Object.entries(docsByStatus).map(([k, v]) => ({
        name: k === 'under_review' ? 'Ditinjau' : k === 'verified' ? 'Terverifikasi' : k === 'uploaded' ? 'Terunggah' : k === 'revision_required' ? 'Perlu Revisi' : k === 'rejected' ? 'Ditolak' : k === 'draft' ? 'Draft' : k,
        value: v,
        key: k,
    }));

    return (
        <AuthenticatedLayout>
            <Head title="Dashboard" />

            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-ink">
                        Executive Dashboard
                    </h1>
                    <p className="mt-1 text-sm text-muted">
                        Indikator kesiapan bersifat internal — bukan persetujuan otoritas pelayaran.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <select
                        value={type}
                        onChange={(e) =>
                            router.get('/dashboard', { months, type: e.target.value }, { preserveState: true, replace: true })
                        }
                        className="h-9 rounded-lg border-hairline bg-white px-2.5 text-sm focus:border-primary focus:ring-primary"
                    >
                        <option value="">Semua Jenis Kapal</option>
                        {vesselTypes.map((t) => (
                            <option key={t} value={t}>{t.replace('_', ' ')}</option>
                        ))}
                    </select>
                    <select
                        value={months}
                        onChange={(e) => {
                            setMonths(e.target.value);
                            router.get('/dashboard', { months: e.target.value, type }, { preserveState: true, replace: true });
                        }}
                        className="h-9 rounded-lg border-hairline bg-white px-2.5 text-sm focus:border-primary focus:ring-primary"
                    >
                        {[3, 6, 12].map((m) => (
                            <option key={m} value={m}>{m} bulan</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Armada */}
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Armada</p>
            <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Total Armada" value={kpis.armada_total} icon={Ship} />
                <StatCard label="Siap Administratif" value={kpis.armada_siap} icon={Anchor} tone="success" sub="kelengkapan ≥ 90%" />
                <StatCard label="Perlu Tindak Lanjut" value={kpis.armada_tindak_lanjut} icon={FileWarning} tone="warning" sub="kelengkapan < 90%" />
                <StatCard label="Sedang Ditinjau" value={kpis.armada_ditinjau} icon={BellRing} tone="info" sub="dokumen under review" />
            </div>

            {/* Perjalanan & Dokumen */}
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Perjalanan & Dokumen</p>
            <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Perjalanan Aktif" value={kpis.voyage_aktif} icon={Anchor} tone="info" onClick={() => router.get('/perjalanan?group=aktif')} />
                <StatCard label="Menunggu Pemeriksaan" value={kpis.voyage_pending} icon={BellRing} tone="warning" onClick={() => router.get('/perjalanan?group=pending_review')} />
                <StatCard label="Dokumen ≤30 Hari" value={kpis.docs_expiring} icon={CalendarClock} tone="warning" onClick={() => router.get('/dokumen?validity=expiring_soon')} />
                <StatCard label="Dokumen Kedaluwarsa" value={kpis.docs_expired} icon={AlertTriangle} tone="danger" onClick={() => router.get('/dokumen?validity=expired')} />
            </div>

            {/* Keuangan & BBM */}
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Keuangan & Operasional</p>
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <StatCard label="Kas & Bank" value={formatRupiah(kpis.kas_total)} icon={Landmark} tone="success" onClick={() => router.get('/keuangan?tab=kas')} />
                <StatCard label="Piutang Outstanding" value={formatRupiah(kpis.piutang)} icon={Wallet} tone="warning" onClick={() => router.get('/keuangan?tab=piutang')} />
                <StatCard label="Hutang Outstanding" value={formatRupiah(kpis.hutang)} icon={Receipt} tone="danger" onClick={() => router.get('/keuangan?tab=hutang')} />
                <StatCard label="Anomali BBM" value={kpis.anomali_bbm} icon={Fuel} tone="danger" sub="trip tidak normal" onClick={() => router.get('/operasional?tab=bbm')} />
                <StatCard label="Perjalanan Selesai" value={kpis.voyage_selesai} icon={TrendingUp} tone="success" />
            </div>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
                {/* Grafik pendapatan */}
                <Card title="Pendapatan vs Biaya" description={`Total ${filters.months} bulan terakhir`} className="xl:col-span-2">
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={revenueSeries}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#DFE6ED" />
                                <XAxis dataKey="bulan" tick={{ fontSize: 11, fill: '#64748B' }} />
                                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} tickFormatter={(v) => `${Math.round(v / 1_000_000)} jt`} />
                                <Tooltip formatter={(v: number) => formatRupiah(v)} />
                                <Legend />
                                <Line type="monotone" dataKey="pendapatan" stroke="#C41212" strokeWidth={2} dot={false} name="Pendapatan" />
                                <Line type="monotone" dataKey="biaya" stroke="#64748B" strokeWidth={2} dot={false} name="Biaya" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* Pie status dokumen */}
                <Card title="Status Dokumen" description="Verifikasi seluruh dokumen">
                    <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={2}>
                                    {pieData.map((entry) => (
                                        <Cell key={entry.key} fill={PIE_COLORS[entry.key] ?? '#64748B'} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted">
                        {pieData.map((p) => (
                            <span key={p.key} className="inline-flex items-center gap-1">
                                <span className="h-2 w-2 rounded-full" style={{ background: PIE_COLORS[p.key] ?? '#64748B' }} />
                                {p.name} ({p.value})
                            </span>
                        ))}
                    </div>
                </Card>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
                {/* Reminder */}
                <Card title="Reminder Dokumen Teratas" actions={<Link href="/notifikasi" className="text-xs font-medium text-primary hover:underline">Semua →</Link>}>
                    {reminders.length === 0 ? (
                        <p className="text-sm text-muted">Tidak ada pengingat aktif.</p>
                    ) : (
                        <ul className="space-y-2">
                            {reminders.map((r, i) => {
                                const d = daysUntil(r.expiry);
                                return (
                                    <li key={i} className="rounded-lg border border-hairline p-2.5 text-sm">
                                        <p className="font-medium text-ink">{r.message}</p>
                                        <p className={classNames('text-xs font-semibold', (d ?? 0) < 0 ? 'text-primary' : 'text-warn')}>
                                            {(d ?? 0) < 0 ? `kedaluwarsa ${Math.abs(d ?? 0)} hari lalu` : `${d} hari lagi`}
                                        </p>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </Card>

                {/* Voyage terbaru */}
                <Card title="Perjalanan Terbaru" actions={<Link href="/perjalanan" className="text-xs font-medium text-primary hover:underline">Semua →</Link>}>
                    <ul className="space-y-2">
                        {recentVoyages.map((v) => (
                            <li key={v.id} className="flex items-center justify-between gap-2 rounded-lg border border-hairline p-2.5 text-sm">
                                <div className="min-w-0">
                                    <Link href={`/perjalanan/${v.id}`} className="font-medium text-ink hover:text-primary">
                                        {v.voyage_code}
                                    </Link>
                                    <p className="truncate text-xs text-muted">{v.vessel_name} · {v.route}</p>
                                </div>
                                <Badge tone={STATUS_TONES[v.voyage_status] ?? 'neutral'}>
                                    {VOYAGE_STATUS_LABELS[v.voyage_status] ?? v.voyage_status}
                                </Badge>
                            </li>
                        ))}
                    </ul>
                </Card>

                {/* Aktivitas */}
                <Card title="Aktivitas Terbaru" actions={<Link href="/audit" className="text-xs font-medium text-primary hover:underline">Audit →</Link>}>
                    <ul className="space-y-2">
                        {recentActivity.map((a) => (
                            <li key={a.id} className="rounded-lg border border-hairline p-2.5 text-sm">
                                <div className="flex items-center justify-between gap-2">
                                    <Badge tone="info">{a.action}</Badge>
                                    <span className="text-[11px] text-muted">{formatDateTime(a.timestamp)}</span>
                                </div>
                                <p className="mt-1 text-xs text-ink">{a.change_summary}</p>
                                <p className="text-[11px] text-muted">{a.user_name} · {a.entity_type}</p>
                            </li>
                        ))}
                    </ul>
                </Card>
            </div>
        </AuthenticatedLayout>
    );
}
