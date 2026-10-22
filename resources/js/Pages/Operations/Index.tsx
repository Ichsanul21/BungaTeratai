import Badge, { type BadgeTone } from '@/Components/ui/Badge';
import Card from '@/Components/ui/Card';
import ConfirmModal from '@/Components/ui/ConfirmModal';
import EmptyState from '@/Components/ui/EmptyState';
import Modal from '@/Components/Modal';
import PageHeader from '@/Components/ui/PageHeader';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TabNav from '@/Components/ui/TabNav';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { classNames, formatDate, formatDateTime, formatNumber, formatRupiah } from '@/lib/format';
import { type PageProps } from '@/types';
import { Head, router } from '@inertiajs/react';
import {
    Activity,
    ClipboardCheck,
    ClipboardList,
    Cog,
    Fuel,
    Gauge,
    MapPin,
    Plus,
    Ship,
    Wrench,
} from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const FUEL_TONES: Record<string, BadgeTone> = {
    normal: 'success',
    waspada: 'warning',
    tidak_normal: 'danger',
};
const FUEL_TEXT: Record<string, string> = {
    normal: 'Normal',
    waspada: 'Waspada',
    tidak_normal: 'Tidak Normal',
};

function Select({
    label,
    name,
    options,
    required,
}: {
    label: string;
    name: string;
    options: Array<{ value: string | number; label: string }>;
    required?: boolean;
}) {
    return (
        <div>
            <label className="text-xs font-medium text-muted">
                {label}
                {required && ' *'}
            </label>
            <select
                name={name}
                required={required}
                defaultValue=""
                className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary"
            >
                {options.map((o) => (
                    <option key={o.value} value={o.value}>
                        {o.label}
                    </option>
                ))}
            </select>
        </div>
    );
}

function TextInputField({
    label,
    name,
    type = 'text',
    step,
    required,
    placeholder,
}: {
    label: string;
    name: string;
    type?: string;
    step?: string;
    required?: boolean;
    placeholder?: string;
}) {
    return (
        <div>
            <label className="text-xs font-medium text-muted">
                {label}
                {required && ' *'}
            </label>
            <input
                name={name}
                type={type}
                step={step}
                required={required}
                placeholder={placeholder}
                className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary"
            />
        </div>
    );
}

export default function OperationsIndex({
    tab,
    canManage,
    vessels,
    recentPositions,
    conditions,
    services,
    items,
    logs,
    kpis,
    checklistVoyages,
    voyageEvents,
}: PageProps<{
    tab: string;
    canManage: boolean;
    vessels: Array<Record<string, any>>;
    recentPositions?: Array<Record<string, any>>;
    conditions?: Array<Record<string, any>>;
    services?: Array<Record<string, any>>;
    items?: Array<Record<string, any>>;
    logs?: Array<Record<string, any>>;
    kpis?: { liter_bulan: number; biaya_bulan: number; anomali: number; trip_bulan: number };
    checklistVoyages?: Array<Record<string, any>>;
    voyageEvents?: Array<Record<string, any>>;
}>) {
    const tabs = [
        { key: 'posisi', label: 'Posisi', icon: MapPin },
        { key: 'kondisi', label: 'Kondisi', icon: Activity },
        { key: 'servis', label: 'Servis', icon: Wrench },
        { key: 'bbm', label: 'Monitoring BBM', icon: Fuel },
        { key: 'checklist', label: 'Checklist', icon: ClipboardList },
        { key: 'logs', label: 'Log Berangkat/Tiba', icon: Ship },
    ];

    const [bbmVesselId, setBbmVesselId] = useState('');
    const [liters, setLiters] = useState('');
    const [duration, setDuration] = useState('');
    const [serviceItems, setServiceItems] = useState<Array<{ item_id: string; qty: string }>>([]);
    const [editCondition, setEditCondition] = useState<any>(null);
    const [editService, setEditService] = useState<any>(null);
    const [editFuel, setEditFuel] = useState<any>(null);
    const [confirmDel, setConfirmDel] = useState<{ url: string; label: string } | null>(null);
    const [busy, setBusy] = useState(false);

    const bbmVessel = (vessels ?? []).find((v) => String(v.id) === bbmVesselId);
    const liveAnalysis = useMemo(() => {
        const l = parseFloat(liters);
        const d = parseFloat(duration);
        const baseline = bbmVessel?.fuel_baseline_lph;
        if (! l || ! d || ! baseline) return null;
        const lph = l / d;
        const diff = ((lph - baseline) / baseline) * 100;
        const abs = Math.abs(diff);
        const status = abs <= 10 ? 'normal' : abs <= 20 ? 'waspada' : 'tidak_normal';
        return { lph, diff, status, baseline };
    }, [liters, duration, bbmVessel]);

    const submitCondition = (e: FormEvent) => {
        e.preventDefault();
        router.post('/operasional/kondisi', Object.fromEntries(new FormData(e.currentTarget as HTMLFormElement)), {
            preserveScroll: true,
        });
    };
    const submitService = (e: FormEvent) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget as HTMLFormElement);
        const payload: Record<string, any> = Object.fromEntries(fd.entries());
        payload.items = serviceItems
            .filter((i) => i.item_id && parseFloat(i.qty) > 0)
            .map((i) => ({ item_id: Number(i.item_id), qty: parseFloat(i.qty) }));
        router.post('/operasional/servis', payload, { preserveScroll: true });
    };
    const submitFuel = (e: FormEvent) => {
        e.preventDefault();
        router.post('/operasional/bbm', Object.fromEntries(new FormData(e.currentTarget as HTMLFormElement)), {
            preserveScroll: true,
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Operations" />

            <PageHeader
                title="Operations"
                description="Posisi, kondisi kapal, servis, monitoring BBM, checklist lintas perjalanan, dan log berangkat/tiba."
            />

            <TabNav
                tabs={tabs}
                active={tab}
                onChange={(key) => router.get('/operasional', { tab: key }, { preserveState: true })}
            />

            {tab === 'posisi' && (
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
                    <Card title="Peta Armada (Simulasi)" description="Koordinat seed — bukan AIS/GPS live." className="xl:col-span-2">
                        <div className="h-[420px] overflow-hidden rounded-lg border border-hairline">
                            <MapContainer
                                center={[-0.502, 117.15]}
                                zoom={11}
                                style={{ height: '100%', width: '100%' }}
                            >
                                <TileLayer
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                />
                                {(vessels ?? [])
                                    .filter((v) => v.last_lat && v.last_lng)
                                    .map((v) => (
                                        <CircleMarker
                                            key={v.id}
                                            center={[Number(v.last_lat), Number(v.last_lng)]}
                                            radius={8}
                                            pathOptions={{
                                                color: v.operational_status === 'aktif' ? '#C41212' : '#64748B',
                                                fillOpacity: 0.75,
                                            }}
                                        >
                                            <Popup>
                                                <strong>{v.vessel_name}</strong>
                                                <br />
                                                {v.base_location ?? '—'}
                                                <br />
                                                <small>{formatDateTime(v.last_position_at)}</small>
                                                <br />
                                                <small className="uppercase">simulasi</small>
                                            </Popup>
                                        </CircleMarker>
                                    ))}
                            </MapContainer>
                        </div>
                    </Card>
                    <Card title="Posisi Terakhir">
                        <ul className="space-y-2.5">
                            {(vessels ?? []).map((v) => (
                                <li key={v.id} className="rounded-lg border border-hairline p-2.5 text-sm">
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium text-ink">{v.vessel_name}</span>
                                        <Badge tone={v.operational_status === 'aktif' ? 'success' : 'warning'}>
                                            {v.operational_status}
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-muted">
                                        {v.last_lat ?? '—'}, {v.last_lng ?? '—'} ·{' '}
                                        {formatDateTime(v.last_position_at)}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    </Card>
                </div>
            )}

            {tab === 'kondisi' && (
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
                    <Card title="Form Pemeriksaan Kondisi" className={canManage ? '' : 'hidden'}>
                        <form onSubmit={submitCondition} className="space-y-3">
                            <Select
                                label="Kapal"
                                name="vessel_id"
                                required
                                options={[
                                    { value: '', label: '— pilih kapal —' },
                                    ...(vessels ?? []).map((v) => ({ value: v.id, label: v.vessel_name })),
                                ]}
                            />
                            <TextInputField label="Tanggal Pemeriksaan" name="checked_at" type="date" required />
                            {['mesin', 'navigasi', 'keselamatan', 'dek', 'kamar'].map((k) => (
                                <Select
                                    key={k}
                                    label={k.charAt(0).toUpperCase() + k.slice(1)}
                                    name={k}
                                    required
                                    options={[
                                        { value: 'baik', label: 'Baik' },
                                        { value: 'cukup', label: 'Cukup' },
                                        { value: 'perlu_perbaikan', label: 'Perlu Perbaikan' },
                                    ]}
                                />
                            ))}
                            <TextInputField label="Skor (0–100)" name="score" type="number" required />
                            <div>
                                <label className="text-xs font-medium text-muted">Catatan</label>
                                <textarea
                                    name="notes"
                                    rows={2}
                                    className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary"
                                />
                            </div>
                            <PrimaryButton>Simpan Pemeriksaan</PrimaryButton>
                        </form>
                    </Card>
                    <Card title="Riwayat Pemeriksaan" className="xl:col-span-2">
                        {(conditions ?? []).length === 0 ? (
                            <EmptyState icon={Activity} title="Belum ada pemeriksaan" />
                        ) : (
                            <ul className="space-y-2.5">
                                {(conditions ?? []).map((c) => (
                                    <li key={c.id} className="rounded-lg border border-hairline p-3 text-sm">
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium text-ink">{c.vessel_name}</span>
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
                                        <p className="text-xs text-muted">
                                            {formatDateTime(c.checked_at)} · {c.checked_by_name ?? '—'}
                                        </p>
                                        {c.notes && <p className="mt-1 text-sm text-ink">{c.notes}</p>}
                                        {canManage && (
                                            <div className="mt-2 flex gap-3 text-xs font-medium">
                                                <button
                                                    type="button"
                                                    onClick={() => setEditCondition({ ...c, checked_at: String(c.checked_at).slice(0, 10) })}
                                                    className="text-primary hover:underline"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setConfirmDel({ url: `/operasional/kondisi/${c.id}`, label: `pemeriksaan kondisi ${c.vessel_name}` })}
                                                    className="text-primary hover:underline"
                                                >
                                                    Hapus
                                                </button>
                                            </div>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Card>
                </div>
            )}

            {tab === 'servis' && (
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
                    <Card title="Catat Servis" className={canManage ? '' : 'hidden'}>
                        <form onSubmit={submitService} className="space-y-3">
                            <Select
                                label="Kapal"
                                name="vessel_id"
                                required
                                options={[
                                    { value: '', label: '— pilih kapal —' },
                                    ...(vessels ?? []).map((v) => ({ value: v.id, label: v.vessel_name })),
                                ]}
                            />
                            <Select
                                label="Jenis"
                                name="type"
                                required
                                options={[
                                    { value: 'rutin', label: 'Rutin' },
                                    { value: 'urgent', label: 'Urgent' },
                                    { value: 'drydock', label: 'Drydock' },
                                    { value: 'pemeriksaan', label: 'Pemeriksaan' },
                                ]}
                            />
                            <TextInputField label="Judul Pekerjaan" name="title" required />
                            <TextInputField label="Mulai" name="start_date" type="date" required />
                            <TextInputField label="Selesai" name="end_date" type="date" />
                            <TextInputField label="Bengkel" name="workshop" />
                            <TextInputField label="Biaya (Rp)" name="cost" type="number" step="0.01" />
                            <Select
                                label="Status"
                                name="status"
                                required
                                options={[
                                    { value: 'rencana', label: 'Rencana' },
                                    { value: 'proses', label: 'Proses' },
                                    { value: 'selesai', label: 'Selesai (stok dipotong)' },
                                ]}
                            />
                            <div>
                                <label className="text-xs font-medium text-muted">Sparepart dipakai</label>
                                {serviceItems.map((row, idx) => (
                                    <div key={idx} className="mt-2 flex gap-2">
                                        <select
                                            value={row.item_id}
                                            onChange={(e) =>
                                                setServiceItems((prev) =>
                                                    prev.map((p, i) => (i === idx ? { ...p, item_id: e.target.value } : p)),
                                                )
                                            }
                                            className="flex-1 rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary"
                                        >
                                            <option value="">— pilih item —</option>
                                            {(items ?? []).map((it) => (
                                                <option key={it.id} value={it.id}>
                                                    {it.sku} · {it.name} (kantor: {formatNumber(it.stok_kantor, 0)})
                                                </option>
                                            ))}
                                        </select>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min={0}
                                            placeholder="Qty"
                                            value={row.qty}
                                            onChange={(e) =>
                                                setServiceItems((prev) =>
                                                    prev.map((p, i) => (i === idx ? { ...p, qty: e.target.value } : p)),
                                                )
                                            }
                                            className="w-24 rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary"
                                        />
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={() =>
                                        setServiceItems((prev) => [...prev, { item_id: '', qty: '' }])
                                    }
                                    className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                                >
                                    <Plus size={13} /> Tambah item
                                </button>
                            </div>
                            <PrimaryButton>Simpan Servis</PrimaryButton>
                        </form>
                    </Card>
                    <Card title="Riwayat Servis" className="xl:col-span-2">
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead className="bg-appbg text-left text-xs uppercase tracking-wide text-muted">
                                    <tr>
                                        {['Kapal', 'Pekerjaan', 'Jenis', 'Periode', 'Biaya', 'Status', ...(canManage ? ['Aksi'] : [])].map((h) => (
                                            <th key={h} className="px-3 py-2">
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-hairline">
                                    {(services ?? []).map((s) => (
                                        <tr key={s.id}>
                                            <td className="px-3 py-2 font-medium text-ink">{s.vessel_name}</td>
                                            <td className="px-3 py-2 text-ink">{s.title}</td>
                                            <td className="px-3 py-2 capitalize text-muted">{s.type}</td>
                                            <td className="px-3 py-2 text-xs text-muted">
                                                {formatDate(s.start_date)} → {formatDate(s.end_date)}
                                            </td>
                                            <td className="px-3 py-2 tabular-nums">{formatRupiah(s.cost)}</td>
                                            <td className="px-3 py-2">
                                                <Badge
                                                    tone={s.status === 'selesai' ? 'success' : s.status === 'proses' ? 'warning' : 'neutral'}
                                                >
                                                    {s.status}
                                                </Badge>
                                            </td>
                                            {canManage && (
                                                <td className="px-3 py-2">
                                                    <div className="flex gap-2 text-xs font-medium">
                                                        <button
                                                            type="button"
                                                            onClick={() => setEditService({ ...s, start_date: String(s.start_date).slice(0, 10), end_date: s.end_date ? String(s.end_date).slice(0, 10) : '' })}
                                                            className="text-primary hover:underline"
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setConfirmDel({ url: `/operasional/servis/${s.id}`, label: `servis "${s.title}"` })}
                                                            className="text-primary hover:underline"
                                                        >
                                                            Hapus
                                                        </button>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}

            {tab === 'bbm' && (
                <>
                    <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
                        {[
                            ['Liter Bulan Ini', formatNumber(kpis?.liter_bulan ?? 0, 0) + ' L'],
                            ['Biaya Bulan Ini', formatRupiah(kpis?.biaya_bulan ?? 0)],
                            ['Trip Bulan Ini', kpis?.trip_bulan ?? 0],
                            ['Anomali (Tidak Normal)', kpis?.anomali ?? 0],
                        ].map(([k, v]) => (
                            <div key={k as string} className="rounded-xl border border-hairline bg-white p-4">
                                <p className="text-xs uppercase tracking-wide text-muted">{k}</p>
                                <p className="mt-1 text-xl font-semibold tabular-nums text-ink">{v}</p>
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
                        <Card title="Input Trip BBM" className={canManage ? '' : 'hidden'}>
                            <form onSubmit={submitFuel} className="space-y-3">
                                <div>
                                    <label className="text-xs font-medium text-muted">Kapal *</label>
                                    <select
                                        name="vessel_id"
                                        value={bbmVesselId}
                                        onChange={(e) => setBbmVesselId(e.target.value)}
                                        required
                                        className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary"
                                    >
                                        <option value="">— pilih kapal —</option>
                                        {(vessels ?? []).map((v) => (
                                            <option key={v.id} value={v.id}>
                                                {v.vessel_name} (baseline {formatNumber(v.fuel_baseline_lph, 0)} L/jam)
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <TextInputField label="Tanggal" name="trip_date" type="date" required />
                                <TextInputField label="Rute" name="route" required placeholder="mis. Samarinda → Bontang" />
                                <TextInputField label="Durasi (jam)" name="duration_hours" type="number" step="0.01" required />
                                <TextInputField label="Jarak (mil)" name="distance_nm" type="number" step="0.01" />
                                <div>
                                    <label className="text-xs font-medium text-muted">Liter *</label>
                                    <input
                                        name="liters"
                                        type="number"
                                        step="0.01"
                                        required
                                        value={liters}
                                        onChange={(e) => setLiters(e.target.value)}
                                        className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary"
                                    />
                                </div>
                                <TextInputField label="Biaya (Rp)" name="cost" type="number" step="0.01" />
                                {liveAnalysis && (
                                    <div
                                        className={classNames(
                                            'rounded-lg border p-3 text-sm',
                                            liveAnalysis.status === 'normal'
                                                ? 'border-ok/40 bg-ok/5'
                                                : liveAnalysis.status === 'waspada'
                                                  ? 'border-warn/40 bg-warn/5'
                                                  : 'border-primary/40 bg-primary-tint',
                                        )}
                                    >
                                        <p className="font-semibold">
                                            Analisis live:{' '}
                                            <span
                                                className={classNames(
                                                    liveAnalysis.status === 'normal'
                                                        ? 'text-ok'
                                                        : liveAnalysis.status === 'waspada'
                                                          ? 'text-warn'
                                                          : 'text-primary',
                                                )}
                                            >
                                                {FUEL_TEXT[liveAnalysis.status]}
                                            </span>{' '}
                                            ({liveAnalysis.diff > 0 ? '+' : ''}
                                            {formatNumber(liveAnalysis.diff, 1)}%)
                                        </p>
                                        <p className="text-xs text-muted">
                                            {formatNumber(liveAnalysis.lph, 1)} L/jam vs baseline{' '}
                                            {formatNumber(liveAnalysis.baseline, 0)} L/jam
                                        </p>
                                    </div>
                                )}
                                <div>
                                    <label className="text-xs font-medium text-muted">
                                        Catatan penjelasan (wajib bila Tidak Normal)
                                    </label>
                                    <textarea
                                        name="explanation"
                                        rows={2}
                                        className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary"
                                    />
                                </div>
                                <PrimaryButton>Simpan Trip</PrimaryButton>
                            </form>
                        </Card>
                        <Card title="Log Trip" description="Konsumsi vs baseline (L/jam)." className="xl:col-span-2">
                            <div className="max-h-[560px] overflow-y-auto">
                                <ul className="space-y-2">
                                    {(logs ?? []).map((f) => (
                                        <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-hairline px-3 py-2.5 text-sm">
                                            <div>
                                                <p className="font-medium text-ink">
                                                    {f.vessel_name} · {f.route}
                                                </p>
                                                <p className="text-xs text-muted">
                                                    {formatDate(f.trip_date)} · {f.duration_hours} jam ·{' '}
                                                    {formatNumber(f.liters, 0)} L · {formatNumber(f.lph, 1)} L/jam
                                                    {f.baseline_lph
                                                        ? ` (baseline ${formatNumber(f.baseline_lph, 0)})`
                                                        : ''}
                                                </p>
                                                {f.explanation_note && (
                                                    <p className="mt-0.5 text-xs italic text-muted">
                                                        “{f.explanation_note}”
                                                    </p>
                                                )}
                                            </div>
                                            <Badge tone={FUEL_TONES[f.analysis_status] ?? 'neutral'}>
                                                {FUEL_TEXT[f.analysis_status] ?? f.analysis_status} (
                                                {f.analysis_diff_pct > 0 ? '+' : ''}
                                                {formatNumber(f.analysis_diff_pct, 1)}%)
                                            </Badge>
                                            {canManage && (
                                                <div className="flex gap-2 text-xs font-medium">
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditFuel({ ...f, trip_date: String(f.trip_date).slice(0, 10), explanation: f.explanation_note ?? '' })}
                                                        className="text-primary hover:underline"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setConfirmDel({ url: `/operasional/bbm/${f.id}`, label: `log BBM ${f.vessel_name} (${f.route})` })}
                                                        className="text-primary hover:underline"
                                                    >
                                                        Hapus
                                                    </button>
                                                </div>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </Card>
                    </div>
                </>
            )}

            {tab === 'checklist' && (
                <div className="space-y-3">
                    {(checklistVoyages ?? []).length === 0 ? (
                        <EmptyState
                            icon={ClipboardCheck}
                            title="Tidak ada perjalanan dalam pemeriksaan"
                            description="Perjalanan tahap persiapan dokumen / review internal tampil di sini."
                        />
                    ) : (
                        (checklistVoyages ?? []).map((v) => {
                            const pct =
                                v.wajib_total > 0 ? (v.wajib_terpenuhi / v.wajib_total) * 100 : 100;
                            return (
                                <div
                                    key={v.id}
                                    className="flex flex-wrap items-center gap-4 rounded-xl border border-hairline bg-white p-4 shadow-sm"
                                >
                                    <div className="min-w-0 flex-1">
                                        <p className="font-semibold text-ink">
                                            {v.voyage_code} · {v.vessel_name}
                                        </p>
                                        <p className="text-xs text-muted">
                                            Jadwal {formatDateTime(v.planned_departure)} ·{' '}
                                            {v.kondisional} item kondisional
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="h-2 w-28 overflow-hidden rounded-full bg-appbg">
                                            <div
                                                className={classNames(
                                                    'h-full rounded-full',
                                                    pct >= 100 ? 'bg-ok' : pct >= 60 ? 'bg-warn' : 'bg-primary',
                                                )}
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                        <span className="text-sm font-semibold tabular-nums text-ink">
                                            {v.wajib_terpenuhi}/{v.wajib_total}
                                        </span>
                                    </div>
                                    <a
                                        href={`/perjalanan/${v.id}`}
                                        className="text-sm font-medium text-primary hover:underline"
                                    >
                                        Buka checklist →
                                    </a>
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {tab === 'logs' && (
                <Card title="Log Keberangkatan, Kedatangan & Kejadian">
                    {(voyageEvents ?? []).length === 0 ? (
                        <EmptyState icon={Ship} title="Belum ada log" />
                    ) : (
                        <ol className="relative ms-3 space-y-5 border-s border-hairline ps-5">
                            {(voyageEvents ?? []).map((e) => (
                                <li key={e.id} className="relative">
                                    <span className="absolute -start-[27px] top-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-primary" />
                                    <p className="text-sm font-semibold text-ink">
                                        {e.voyage_code} · {e.vessel_name}
                                    </p>
                                    <p className="text-sm text-muted">{e.description}</p>
                                    <p className="text-xs text-muted">
                                        {formatDateTime(e.occurred_at)} · {e.user_name ?? 'Sistem'}
                                    </p>
                                </li>
                            ))}
                        </ol>
                    )}
                </Card>
            )}
            {/* Modal Edit Kondisi */}
            {editCondition && (
                <Modal show={!!editCondition} onClose={() => setEditCondition(null)} maxWidth="md">
                    <form
                        className="space-y-3 p-6"
                        onSubmit={(e) => {
                            e.preventDefault();
                            router.put(
                                `/operasional/kondisi/${editCondition.id}`,
                                {
                                    vessel_id: editCondition.vessel_id,
                                    checked_at: editCondition.checked_at,
                                    score: editCondition.score,
                                    mesin: editCondition.checklist?.mesin ?? 'baik',
                                    navigasi: editCondition.checklist?.navigasi ?? 'baik',
                                    keselamatan: editCondition.checklist?.keselamatan ?? 'baik',
                                    dek: editCondition.checklist?.dek ?? 'baik',
                                    kamar: editCondition.checklist?.kamar ?? 'baik',
                                    notes: editCondition.notes ?? '',
                                },
                                { preserveScroll: true, onSuccess: () => setEditCondition(null) },
                            );
                        }}
                    >
                        <h2 className="text-lg font-semibold text-ink">Edit Pemeriksaan Kondisi</h2>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-medium text-muted">Kapal</label>
                                <select
                                    value={editCondition.vessel_id}
                                    onChange={(e) => setEditCondition({ ...editCondition, vessel_id: Number(e.target.value) })}
                                    className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
                                >
                                    {(vessels ?? []).map((v: any) => (
                                        <option key={v.id} value={v.id}>{v.vessel_name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-muted">Tanggal</label>
                                <input
                                    type="date"
                                    value={editCondition.checked_at}
                                    onChange={(e) => setEditCondition({ ...editCondition, checked_at: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
                                />
                            </div>
                            {['mesin', 'navigasi', 'keselamatan', 'dek', 'kamar'].map((k) => (
                                <div key={k}>
                                    <label className="text-xs font-medium capitalize text-muted">{k}</label>
                                    <select
                                        value={editCondition.checklist?.[k] ?? 'baik'}
                                        onChange={(e) => setEditCondition({ ...editCondition, checklist: { ...editCondition.checklist, [k]: e.target.value } })}
                                        className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
                                    >
                                        <option value="baik">Baik</option>
                                        <option value="cukup">Cukup</option>
                                        <option value="perlu_perbaikan">Perlu Perbaikan</option>
                                    </select>
                                </div>
                            ))}
                            <div>
                                <label className="text-xs font-medium text-muted">Skor (0–100)</label>
                                <input
                                    type="number"
                                    value={editCondition.score}
                                    onChange={(e) => setEditCondition({ ...editCondition, score: Number(e.target.value) })}
                                    className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="text-xs font-medium text-muted">Catatan</label>
                                <textarea
                                    value={editCondition.notes ?? ''}
                                    onChange={(e) => setEditCondition({ ...editCondition, notes: e.target.value })}
                                    rows={2}
                                    className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
                                />
                            </div>
                        </div>
                        <div className="mt-4 flex justify-end gap-3">
                            <SecondaryButton type="button" onClick={() => setEditCondition(null)}>Batal</SecondaryButton>
                            <PrimaryButton>Simpan</PrimaryButton>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Modal Edit Servis */}
            {editService && (
                <Modal show={!!editService} onClose={() => setEditService(null)} maxWidth="lg">
                    <form
                        className="space-y-3 p-6"
                        onSubmit={(e) => {
                            e.preventDefault();
                            router.put(
                                `/operasional/servis/${editService.id}`,
                                {
                                    vessel_id: editService.vessel_id,
                                    type: editService.type,
                                    title: editService.title,
                                    start_date: editService.start_date,
                                    end_date: editService.end_date || null,
                                    workshop: editService.workshop ?? '',
                                    cost: editService.cost ?? 0,
                                    status: editService.status,
                                    notes: editService.notes ?? '',
                                    items: (editService.items ?? []).map((i: any) => ({ item_id: i.item_id, qty: i.qty })),
                                },
                                { preserveScroll: true, onSuccess: () => setEditService(null) },
                            );
                        }}
                    >
                        <h2 className="text-lg font-semibold text-ink">Edit Catatan Servis</h2>
                        <p className="text-xs text-muted">
                            Bila status diubah ke/atau tetap "selesai", stok sparepart dipotong ulang secara otomatis (pemotongan lama dipulihkan).
                        </p>
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                            <div>
                                <label className="text-xs font-medium text-muted">Kapal</label>
                                <select
                                    value={editService.vessel_id}
                                    onChange={(e) => setEditService({ ...editService, vessel_id: Number(e.target.value) })}
                                    className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
                                >
                                    {(vessels ?? []).map((v: any) => (
                                        <option key={v.id} value={v.id}>{v.vessel_name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-muted">Jenis</label>
                                <select
                                    value={editService.type}
                                    onChange={(e) => setEditService({ ...editService, type: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
                                >
                                    {['rutin', 'urgent', 'drydock', 'pemeriksaan'].map((t) => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-muted">Status</label>
                                <select
                                    value={editService.status}
                                    onChange={(e) => setEditService({ ...editService, status: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
                                >
                                    {['rencana', 'proses', 'selesai'].map((t) => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            <div className="col-span-2 md:col-span-3">
                                <label className="text-xs font-medium text-muted">Judul Pekerjaan</label>
                                <input
                                    value={editService.title}
                                    onChange={(e) => setEditService({ ...editService, title: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-muted">Mulai</label>
                                <input
                                    type="date"
                                    value={editService.start_date}
                                    onChange={(e) => setEditService({ ...editService, start_date: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-muted">Selesai</label>
                                <input
                                    type="date"
                                    value={editService.end_date ?? ''}
                                    onChange={(e) => setEditService({ ...editService, end_date: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-muted">Bengkel</label>
                                <input
                                    value={editService.workshop ?? ''}
                                    onChange={(e) => setEditService({ ...editService, workshop: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-muted">Biaya (Rp)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={editService.cost ?? 0}
                                    onChange={(e) => setEditService({ ...editService, cost: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-muted">Sparepart dipakai</label>
                            {(editService.items ?? []).map((it: any, idx: number) => (
                                <div key={idx} className="mt-2 flex items-center gap-2 text-sm">
                                    <span className="flex-1 text-ink">{it.item_name}</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={it.qty}
                                        onChange={(e) => {
                                            const next = [...editService.items];
                                            next[idx] = { ...it, qty: e.target.value };
                                            setEditService({ ...editService, items: next });
                                        }}
                                        className="w-24 rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setEditService({ ...editService, items: editService.items.filter((_: any, i: number) => i !== idx) })}
                                        className="text-xs text-primary hover:underline"
                                    >
                                        Hapus
                                    </button>
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={() =>
                                    setEditService({
                                        ...editService,
                                        items: [...(editService.items ?? []), { item_id: (items ?? [])[0]?.id, item_name: (items ?? [])[0]?.name, qty: 1 }],
                                    })
                                }
                                className="mt-2 text-xs font-medium text-primary hover:underline"
                            >
                                + Tambah item dari inventory
                            </button>
                        </div>
                        <div className="mt-4 flex justify-end gap-3">
                            <SecondaryButton type="button" onClick={() => setEditService(null)}>Batal</SecondaryButton>
                            <PrimaryButton>Simpan</PrimaryButton>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Modal Edit BBM */}
            {editFuel && (
                <Modal show={!!editFuel} onClose={() => setEditFuel(null)} maxWidth="md">
                    <form
                        className="space-y-3 p-6"
                        onSubmit={(e) => {
                            e.preventDefault();
                            router.put(
                                `/operasional/bbm/${editFuel.id}`,
                                {
                                    vessel_id: editFuel.vessel_id,
                                    trip_date: editFuel.trip_date,
                                    route: editFuel.route,
                                    cargo_type: editFuel.cargo_type ?? '',
                                    duration_hours: editFuel.duration_hours,
                                    distance_nm: editFuel.distance_nm ?? '',
                                    liters: editFuel.liters,
                                    cost: editFuel.cost ?? 0,
                                    explanation: editFuel.explanation ?? '',
                                },
                                { preserveScroll: true, onSuccess: () => setEditFuel(null) },
                            );
                        }}
                    >
                        <h2 className="text-lg font-semibold text-ink">Edit Log BBM</h2>
                        <p className="text-xs text-muted">Analisis Normal/Waspada/Tidak Normal dihitung ulang otomatis saat disimpan.</p>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-medium text-muted">Kapal</label>
                                <select
                                    value={editFuel.vessel_id}
                                    onChange={(e) => setEditFuel({ ...editFuel, vessel_id: Number(e.target.value) })}
                                    className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
                                >
                                    {(vessels ?? []).map((v: any) => (
                                        <option key={v.id} value={v.id}>{v.vessel_name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-muted">Tanggal</label>
                                <input
                                    type="date"
                                    value={editFuel.trip_date}
                                    onChange={(e) => setEditFuel({ ...editFuel, trip_date: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="text-xs font-medium text-muted">Rute</label>
                                <input
                                    value={editFuel.route}
                                    onChange={(e) => setEditFuel({ ...editFuel, route: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-muted">Durasi (jam)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={editFuel.duration_hours}
                                    onChange={(e) => setEditFuel({ ...editFuel, duration_hours: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-muted">Liter</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={editFuel.liters}
                                    onChange={(e) => setEditFuel({ ...editFuel, liters: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-muted">Jarak (mil)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={editFuel.distance_nm ?? ''}
                                    onChange={(e) => setEditFuel({ ...editFuel, distance_nm: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-muted">Biaya (Rp)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={editFuel.cost ?? 0}
                                    onChange={(e) => setEditFuel({ ...editFuel, cost: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="text-xs font-medium text-muted">Penjelasan (wajib bila Tidak Normal)</label>
                                <textarea
                                    value={editFuel.explanation ?? ''}
                                    onChange={(e) => setEditFuel({ ...editFuel, explanation: e.target.value })}
                                    rows={2}
                                    className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
                                />
                            </div>
                        </div>
                        <div className="mt-4 flex justify-end gap-3">
                            <SecondaryButton type="button" onClick={() => setEditFuel(null)}>Batal</SecondaryButton>
                            <PrimaryButton>Simpan</PrimaryButton>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Konfirmasi Hapus (kondisi/servis/bbm) */}
            <ConfirmModal
                show={!!confirmDel}
                title="Hapus data ini?"
                message={
                    confirmDel
                        ? `Data "${confirmDel.label}" akan dihapus permanen. ${
                              confirmDel.url.includes('/servis/')
                                  ? 'Stok sparepart pada servis selesai akan dipulihkan otomatis.'
                                  : 'Tindakan tercatat di audit trail.'
                          }`
                        : ''
                }
                processing={busy}
                onClose={() => setConfirmDel(null)}
                onConfirm={() => {
                    if (! confirmDel) return;
                    setBusy(true);
                    router.delete(confirmDel.url, {
                        preserveScroll: true,
                        onFinish: () => { setBusy(false); setConfirmDel(null); },
                    });
                }}
            />
        </AuthenticatedLayout>
    );
}