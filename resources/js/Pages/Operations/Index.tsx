import Badge, { type BadgeTone } from '@/Components/ui/Badge';
import Card from '@/Components/ui/Card';
import ConfirmModal from '@/Components/ui/ConfirmModal';
import EmptyState from '@/Components/ui/EmptyState';
import Modal from '@/Components/Modal';
import PageHeader from '@/Components/ui/PageHeader';
import NumericInput from '@/Components/NumericInput';
import PrimaryButton from '@/Components/PrimaryButton';
import SearchableSelect from '@/Components/SearchableSelect';
import SecondaryButton from '@/Components/SecondaryButton';
import TabNav from '@/Components/ui/TabNav';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { VOYAGE_STATUS_LABELS } from '@/Constants/navigation';
import { classNames, formatDate, formatDateTime, formatNumber, formatRupiah } from '@/lib/format';
import { useSync } from '@/lib/sync/SyncProvider';
import { type PageProps } from '@/types';
import { Head, router } from '@inertiajs/react';
import {
    Activity,
    ArrowLeftRight,
    CheckCircle2,
    ClipboardCheck,
    ClipboardList,
    Cog,
    Fuel,
    Gauge,
    LifeBuoy,
    MapPin,
    Plus,
    Radio,
    Ship,
    Wrench,
} from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { divIcon } from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
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

function MapFocus({ position }: { position: [number, number] | null }) {
    const map = useMap();

    useEffect(() => {
        if (position) map.flyTo(position, Math.max(map.getZoom(), 11), { duration: 0.5 });
    }, [map, position]);

    return null;
}

function VesselMarker({
    vessel,
    onClick,
}: {
    vessel: Record<string, any>;
    onClick: () => void;
}) {
    const color = vessel.operational_status === 'aktif' ? '#C41212' : '#64748B';
    const icon = divIcon({
        className: 'vessel-navigation-marker',
        html: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 48 60" aria-hidden="true"><path d="M24 3 4 55 24 43 44 55Z" fill="${color}" stroke="#fff" stroke-width="4" stroke-linejoin="round"/></svg>`,
        iconSize: [32, 40],
        iconAnchor: [16, 20],
        popupAnchor: [0, -18],
    });

    return (
        <Marker
            position={[Number(vessel.last_lat), Number(vessel.last_lng)]}
            icon={icon}
            eventHandlers={{ click: onClick }}
        >
            <Popup>
                <strong>{vessel.vessel_name}</strong>
                <br />
                {formatDateTime(vessel.last_position_at)}
            </Popup>
        </Marker>
    );
}

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
    const [value, setValue] = useState('');

    return (
        <div>
            <label className="text-xs font-medium text-muted">
                {label}
                {required && ' *'}
            </label>
            <SearchableSelect
                name={name}
                value={value}
                options={options.map((option) => ({
                    value: String(option.value),
                    label: option.label,
                }))}
                onChange={setValue}
                placeholder={required ? '— pilih —' : 'Cari atau pilih...'}
                required={required}
            />
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
    value,
    onChange,
    error,
}: {
    label: string;
    name: string;
    type?: string;
    step?: string;
    required?: boolean;
    placeholder?: string;
    value?: string;
    onChange?: (value: string) => void;
    error?: string;
}) {
    return (
        <div>
            <label className="text-xs font-medium text-muted">
                {label}
                {required && ' *'}
            </label>
            {type === 'number' ? (
                <NumericInput
                    name={name}
                    decimalPlaces={step === '0.1' ? 1 : step === '0.01' ? 2 : 0}
                    required={required}
                    value={value}
                    onChange={(event) => onChange?.(event.target.value)}
                    placeholder={placeholder}
                    className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary"
                />
            ) : (
                <input
                    name={name}
                    type={type}
                    step={step}
                    required={required}
                    value={value}
                    onChange={(event) => onChange?.(event.target.value)}
                    placeholder={placeholder}
                    className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary"
                />
            )}
            {error && <p className="mt-1 text-xs font-medium text-primary">{error}</p>}
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
    voyages,
    checklistVoyages,
    voyageEvents,
    reportVoyages,
    reportVessels,
    reportCrews,
}: PageProps<{
    tab: string;
    canManage: boolean;
    vessels: Array<Record<string, any>>;
    recentPositions?: Array<Record<string, any>>;
    conditions?: Array<Record<string, any>>;
    services?: Array<Record<string, any>>;
    items?: Array<Record<string, any>>;
    logs?: Array<Record<string, any>>;
    voyages?: Array<Record<string, any>>;
    kpis?: { liter_bulan: number; biaya_bulan: number; anomali: number; trip_bulan: number };
    checklistVoyages?: Array<Record<string, any>>;
    voyageEvents?: Array<Record<string, any>>;
    reportVoyages?: Array<Record<string, any>>;
    reportVessels?: Array<{ id: number; vessel_name: string }>;
    reportCrews?: Array<{ id: number; name: string; rank: string }>;
}>) {
    const tabs = [
        { key: 'posisi', label: 'Posisi', icon: MapPin },
        { key: 'checklist', label: 'Checklist', icon: ClipboardList },
        { key: 'logs', label: 'Log Berangkat/Tiba', icon: Ship },
        { key: 'laporan', label: 'Laporan Kapal', icon: Radio },
    ];

    const [bbmVesselId, setBbmVesselId] = useState('');
    const [bbmVoyageId, setBbmVoyageId] = useState('');
    const [liters, setLiters] = useState('');
    const [pricePerLiter, setPricePerLiter] = useState('');
    const [serviceCost, setServiceCost] = useState('');
    const [duration, setDuration] = useState('');
    const [tripDate, setTripDate] = useState('');
    const [tripRoute, setTripRoute] = useState('');
    const [explanation, setExplanation] = useState('');
    const [fuelErrors, setFuelErrors] = useState<Record<string, string>>({});
    const [serviceItems, setServiceItems] = useState<Array<{ item_id: string; qty: string }>>([]);
    const [editCondition, setEditCondition] = useState<any>(null);
    const [editService, setEditService] = useState<any>(null);
    const [editFuel, setEditFuel] = useState<any>(null);
    const [confirmDel, setConfirmDel] = useState<{ url: string; label: string } | null>(null);
    const [busy, setBusy] = useState(false);
    const [selectedVesselId, setSelectedVesselId] = useState<number | null>(null);
    const [entryModal, setEntryModal] = useState<'condition' | 'service' | 'fuel' | null>(null);
    const [vesselHistory, setVesselHistory] = useState<{
        conditions: Array<Record<string, any>>;
        services: Array<Record<string, any>>;
        logs: Array<Record<string, any>>;
    }>({ conditions: [], services: [], logs: [] });
    const [historyItems, setHistoryItems] = useState<Array<Record<string, any>>>([]);
    const [historyVoyages, setHistoryVoyages] = useState<Array<Record<string, any>>>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyError, setHistoryError] = useState('');
    const [historyRefresh, setHistoryRefresh] = useState(0);
    const [positionForm, setPositionForm] = useState({ lat: '', lng: '' });
    const [positionErrors, setPositionErrors] = useState<Record<string, string>>({});
    const [positionSaving, setPositionSaving] = useState(false);
    const [mapHasLoaded, setMapHasLoaded] = useState(false);
    const [mapHasError, setMapHasError] = useState(false);

    const bbmVessel = (vessels ?? []).find((v) => String(v.id) === bbmVesselId);
    const selectedVessel = (vessels ?? []).find((v) => v.id === selectedVesselId);
    const positionedVessels = (vessels ?? []).filter(
        (v) => v.last_lat !== null && v.last_lat !== undefined &&
            v.last_lng !== null && v.last_lng !== undefined,
    );
    const focusedPosition: [number, number] | null =
        selectedVessel?.last_lat !== null && selectedVessel?.last_lat !== undefined &&
        selectedVessel?.last_lng !== null && selectedVessel?.last_lng !== undefined
            ? [Number(selectedVessel.last_lat), Number(selectedVessel.last_lng)]
            : null;
    const totalFuelCost = (parseFloat(liters) || 0) * (parseFloat(pricePerLiter) || 0);
    const liveAnalysis = useMemo(() => {
        const l = parseFloat(liters);
        const d = parseFloat(duration);
        if (!l || !d || !bbmVessel) return null;
        const lph = l / d;
        const baseline = Number(bbmVessel.fuel_baseline_lph) || 0;
        if (baseline <= 0) return { lph, diff: 0, status: 'normal', baseline: null };
        const diff = ((lph - baseline) / baseline) * 100;
        const abs = Math.abs(diff);
        const status = abs <= 10 ? 'normal' : abs <= 20 ? 'waspada' : 'tidak_normal';
        return { lph, diff, status, baseline };
    }, [liters, duration, bbmVessel]);

    useEffect(() => {
        if (!selectedVesselId) return;
        const controller = new AbortController();
        setHistoryLoading(true);
        setHistoryError('');
        fetch(`/operasional/kapal/${selectedVesselId}/riwayat`, {
            headers: { Accept: 'application/json' },
            signal: controller.signal,
        })
            .then(async (response) => {
                if (!response.ok) throw new Error('Riwayat kapal gagal dimuat.');
                return response.json();
            })
            .then((result) => {
                setVesselHistory({
                    conditions: result.conditions ?? [],
                    services: result.services ?? [],
                    logs: result.logs ?? [],
                });
                setHistoryItems(result.items ?? []);
                setHistoryVoyages(result.voyages ?? []);
            })
            .catch((error: Error) => {
                if (error.name !== 'AbortError') setHistoryError(error.message);
            })
            .finally(() => {
                if (!controller.signal.aborted) setHistoryLoading(false);
            });
        return () => controller.abort();
    }, [selectedVesselId, historyRefresh]);

    useEffect(() => {
        setFuelErrors((current) => ({
            ...current,
            explanation:
                liveAnalysis?.status === 'tidak_normal' && !explanation.trim()
                    ? 'Catatan wajib diisi untuk konsumsi Tidak Normal.'
                    : '',
        }));
    }, [liveAnalysis, explanation]);

    const updateFuelField = (field: string, value: string, setValue: (value: string) => void) => {
        setValue(value);
        let message = '';
        if (field === 'duration_hours' && (!value || Number(value) < 0.1)) {
            message = 'Durasi minimal 0,1 jam.';
        } else if (field === 'liters' && (!value || Number(value) < 0.1)) {
            message = 'Jumlah BBM minimal 0,1 liter.';
        } else if (field === 'price_per_liter' && value !== '' && Number(value) < 0) {
            message = 'Harga per liter tidak boleh negatif.';
        } else if (field === 'price_per_liter' && value === '') {
            message = 'Harga per liter wajib diisi.';
        } else if (field === 'trip_date' && value === '') {
            message = 'Tanggal wajib diisi.';
        } else if (field === 'route' && !value.trim()) {
            message = 'Rute wajib diisi.';
        }
        setFuelErrors((current) => ({ ...current, [field]: message }));
    };

    const submitCondition = (e: FormEvent) => {
        e.preventDefault();
        router.post('/operasional/kondisi', Object.fromEntries(new FormData(e.currentTarget as HTMLFormElement)), {
            preserveScroll: true,
            onSuccess: () => {
                setEntryModal(null);
                setHistoryRefresh((current) => current + 1);
            },
        });
    };
    const submitService = (e: FormEvent) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget as HTMLFormElement);
        const payload: Record<string, any> = Object.fromEntries(fd.entries());
        payload.cost = serviceCost;
        payload.items = serviceItems
            .filter((i) => i.item_id && parseFloat(i.qty) > 0)
            .map((i) => ({ item_id: Number(i.item_id), qty: parseFloat(i.qty) }));
        router.post('/operasional/servis', payload, {
            preserveScroll: true,
            onSuccess: () => {
                setEntryModal(null);
                setServiceItems([]);
                setServiceCost('');
                setHistoryRefresh((current) => current + 1);
            },
        });
    };
    const submitFuel = (e: FormEvent) => {
        e.preventDefault();
        const form = e.currentTarget as HTMLFormElement;
        const payload = Object.fromEntries(new FormData(form));
        const validationErrors: Record<string, string> = {};
        if (!bbmVesselId) validationErrors.vessel_id = 'Pilih kapal.';
        if (!tripDate) validationErrors.trip_date = 'Tanggal wajib diisi.';
        if (!tripRoute.trim()) validationErrors.route = 'Rute wajib diisi.';
        if (!Number.isFinite(Number(duration)) || Number(duration) < 0.1) {
            validationErrors.duration_hours = 'Durasi minimal 0,1 jam.';
        }
        if (!Number.isFinite(Number(liters)) || Number(liters) < 0.1) {
            validationErrors.liters = 'Jumlah BBM minimal 0,1 liter.';
        }
        if (pricePerLiter === '' || !Number.isFinite(Number(pricePerLiter)) || Number(pricePerLiter) < 0) {
            validationErrors.price_per_liter = 'Harga per liter harus diisi dan tidak boleh negatif.';
        }
        if (liveAnalysis?.status === 'tidak_normal' && !explanation.trim()) {
            validationErrors.explanation = 'Catatan wajib diisi untuk konsumsi Tidak Normal.';
        }
        setFuelErrors(validationErrors);
        if (Object.keys(validationErrors).length > 0) return;

        payload.vessel_id = bbmVesselId;
        payload.trip_date = tripDate;
        payload.route = tripRoute;
        payload.duration_hours = duration;
        payload.liters = liters;
        payload.explanation = explanation;
        payload.cost = totalFuelCost.toFixed(2);
        router.post('/operasional/bbm', payload, {
            preserveScroll: true,
            onError: (errors) => setFuelErrors(errors),
            onSuccess: () => {
                setFuelErrors({});
                setBbmVesselId('');
                setBbmVoyageId('');
                setTripDate('');
                setTripRoute('');
                setDuration('');
                setLiters('');
                setPricePerLiter('');
                setExplanation('');
                setEntryModal(null);
                setHistoryRefresh((current) => current + 1);
            },
        });
    };

    const selectVessel = (vessel: Record<string, any>) => {
        setSelectedVesselId(vessel.id);
        setBbmVesselId(String(vessel.id));
        setBbmVoyageId('');
        setPositionForm({
            lat: vessel.last_lat === null || vessel.last_lat === undefined ? '' : String(vessel.last_lat),
            lng: vessel.last_lng === null || vessel.last_lng === undefined ? '' : String(vessel.last_lng),
        });
        setPositionErrors({});
    };

    const submitPosition = (e: FormEvent) => {
        e.preventDefault();
        if (!selectedVessel) return;
        setPositionErrors({});
        router.post(
            '/operasional/posisi',
            { vessel_id: selectedVessel.id, ...positionForm },
            {
                preserveScroll: true,
                onStart: () => setPositionSaving(true),
                onError: (errors) => setPositionErrors(errors),
                onFinish: () => setPositionSaving(false),
            },
        );
    };

    // ===== Laporan Kapal (channel sinkronisasi — jalan online ATAU offline) =====
    const { state: syncState, engine } = useSync();
    const [reportNote, setReportNote] = useState<string | null>(null);
    const [dsrForm, setDsrForm] = useState({ voyage_id: '', dsr_mt: '', dsr_date: '', notes_progress: '' });
    const [posForm, setPosForm] = useState({ vessel_id: '', lat: '', lng: '', speed_knots: '' });
    const [fuelReportForm, setFuelReportForm] = useState({ vessel_id: '', trip_date: '', route: '', duration_hours: '', liters: '', cargo_type: '' });
    const [safetyForm, setSafetyForm] = useState({ voyage_id: '', status: 'lulus', passenger_count: '', capacity: '', notes: '' });
    const [crewReportForm, setCrewReportForm] = useState({ crew_id: '', vessel_id: '', type: 'sign_off', movement_date: '', reason: '', notes: '' });

    const enqueueReport = async (
        entity: string,
        payload: Record<string, unknown>,
        label: string,
        priority: 'safety' | 'operational',
        extra?: { base_updated_at?: string },
    ) => {
        await engine.enqueue({
            entity_type: entity,
            payload,
            label,
            priority,
            base_updated_at: extra?.base_updated_at,
        });
        setReportNote(
            navigator.onLine
                ? `${label} — dikirim ke kantor.`
                : `${label} — masuk antrean offline (${syncState.pending + 1} menunggu sinkron).`,
        );
        window.setTimeout(() => setReportNote(null), 6000);
    };

    const submitDsrReport = (e: FormEvent) => {
        e.preventDefault();
        const voyage = (reportVoyages ?? []).find((v) => String(v.id) === String(dsrForm.voyage_id));
        if (!voyage) return;
        void enqueueReport(
            'voyage_progress',
            {
                voyage_id: voyage.id,
                dsr_mt: dsrForm.dsr_mt ? Number(dsrForm.dsr_mt) : undefined,
                dsr_date: dsrForm.dsr_date || undefined,
                notes_progress: dsrForm.notes_progress || undefined,
            },
            `Progres ${voyage.voyage_code}`,
            'operational',
            { base_updated_at: voyage.updated_at },
        ).then(() => setDsrForm((f) => ({ ...f, dsr_mt: '', dsr_date: '', notes_progress: '' })));
    };

    const submitPositionReport = (e: FormEvent) => {
        e.preventDefault();
        const vessel = (reportVessels ?? []).find((v) => String(v.id) === String(posForm.vessel_id));
        if (!vessel) return;
        void enqueueReport(
            'vessel_position',
            {
                vessel_id: vessel.id,
                lat: Number(posForm.lat),
                lng: Number(posForm.lng),
                speed_knots: posForm.speed_knots ? Number(posForm.speed_knots) : undefined,
            },
            `Posisi ${vessel.vessel_name}`,
            'safety',
        ).then(() => setPosForm((f) => ({ ...f, lat: '', lng: '', speed_knots: '' })));
    };

    const submitFuelReport = (e: FormEvent) => {
        e.preventDefault();
        const vessel = (reportVessels ?? []).find((v) => String(v.id) === String(fuelReportForm.vessel_id));
        if (!vessel) return;
        void enqueueReport(
            'fuel_log',
            {
                vessel_id: vessel.id,
                trip_date: fuelReportForm.trip_date || undefined,
                route: fuelReportForm.route,
                duration_hours: Number(fuelReportForm.duration_hours),
                liters: Number(fuelReportForm.liters),
                cargo_type: fuelReportForm.cargo_type || undefined,
            },
            `BBM ${vessel.vessel_name}`,
            'operational',
        ).then(() => setFuelReportForm((f) => ({ ...f, liters: '', duration_hours: '', route: '' })));
    };

    const submitSafetyReport = (e: FormEvent) => {
        e.preventDefault();
        const voyage = (reportVoyages ?? []).find((v) => String(v.id) === String(safetyForm.voyage_id));
        if (!voyage) return;
        void enqueueReport(
            'voyage_safety_check',
            {
                voyage_id: voyage.id,
                status: safetyForm.status,
                passenger_count: safetyForm.passenger_count ? Number(safetyForm.passenger_count) : undefined,
                capacity: safetyForm.capacity ? Number(safetyForm.capacity) : undefined,
                notes: safetyForm.notes || undefined,
            },
            `Keselamatan ${voyage.voyage_code}`,
            'safety',
        ).then(() => setSafetyForm((f) => ({ ...f, notes: '', passenger_count: '' })));
    };

    const submitCrewReport = (e: FormEvent) => {
        e.preventDefault();
        const crew = (reportCrews ?? []).find((c) => String(c.id) === String(crewReportForm.crew_id));
        if (!crew) return;
        void enqueueReport(
            'crew_movement',
            {
                crew_id: crew.id,
                vessel_id: crewReportForm.vessel_id ? Number(crewReportForm.vessel_id) : undefined,
                type: crewReportForm.type,
                movement_date: crewReportForm.movement_date || undefined,
                reason: crewReportForm.reason || undefined,
                notes: crewReportForm.notes || undefined,
            },
            `${crewReportForm.type === 'sign_on' ? 'Sign ON' : 'Sign OFF'} ${crew.name}`,
            'safety',
        ).then(() => setCrewReportForm((f) => ({ ...f, reason: '', notes: '' })));
    };

    return (
        <AuthenticatedLayout>
            <Head title="Operations" />

            <PageHeader
                title="Operations"
                description="Peta posisi kapal dan status perjalanan; pantau kondisi, servis, BBM, checklist, dan log perjalanan."
            />

            <TabNav
                tabs={tabs}
                active={tab}
                onChange={(key) => router.get('/operasional', { tab: key }, { preserveState: true })}
            />

            {tab === 'laporan' && (
                <div className="space-y-4">
                    <Card
                        title="Laporan Dari Kapal — Channel Sinkronisasi"
                        description="Form ini memakai mesin sinkronisasi yang sama dengan mode offline: saat sinyal hilang, laporan masuk antrean lokal (IndexedDB) dan otomatis terkirim ke kantor saat kembali online. Otoritas & validasi ditegakkan server."
                    >
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span
                                className={classNames(
                                    'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium ring-1 ring-inset',
                                    syncState.mode === 'offline'
                                        ? 'bg-warn/15 text-warn ring-warn/40'
                                        : syncState.mode === 'metered'
                                            ? 'bg-warn/15 text-warn ring-warn/40'
                                            : 'bg-ok/10 text-ok ring-ok/30',
                                )}
                            >
                                {syncState.mode === 'offline' ? (
                                    <>Offline — antrean {syncState.pending}</>
                                ) : syncState.mode === 'metered' ? (
                                    <>Mode VSAT — antrean {syncState.pending}</>
                                ) : (
                                    <>Online — antrean {syncState.pending}</>
                                )}
                            </span>
                            {reportNote && (
                                <span className="inline-flex items-center gap-1.5 text-ok">
                                    <CheckCircle2 size={13} /> {reportNote}
                                </span>
                            )}
                        </div>
                    </Card>

                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                        {/* DSR & progres perjalanan */}
                        <Card title="DSR & Progres Perjalanan" description="Dilaporkan kapal — kirim saat bongkar/muat selesai.">
                            <form onSubmit={submitDsrReport} className="space-y-3">
                                <div>
                                    <label className="text-xs font-medium text-muted">Perjalanan *</label>
                                    <select
                                        required
                                        value={dsrForm.voyage_id}
                                        onChange={(e) => setDsrForm((f) => ({ ...f, voyage_id: e.target.value }))}
                                        className="block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
                                    >
                                        <option value="">— pilih voyage —</option>
                                        {(reportVoyages ?? []).map((v) => (
                                            <option key={v.id} value={v.id}>
                                                {v.voyage_code} · {v.origin} → {v.destination}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-medium text-muted">DSR (MT)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={dsrForm.dsr_mt}
                                            onChange={(e) => setDsrForm((f) => ({ ...f, dsr_mt: e.target.value }))}
                                            className="block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
                                            placeholder="7539.27"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-muted">Tanggal DSR</label>
                                        <input
                                            type="date"
                                            value={dsrForm.dsr_date}
                                            onChange={(e) => setDsrForm((f) => ({ ...f, dsr_date: e.target.value }))}
                                            className="block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-muted">Catatan progres</label>
                                    <input
                                        value={dsrForm.notes_progress}
                                        onChange={(e) => setDsrForm((f) => ({ ...f, notes_progress: e.target.value }))}
                                        className="block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
                                        placeholder="mis. Bongkar selesai 90% di Taboneo"
                                    />
                                </div>
                                <div className="flex justify-end">
                                    <PrimaryButton disabled={syncState.syncing}>Kirim Laporan</PrimaryButton>
                                </div>
                            </form>
                        </Card>

                        {/* Posisi kapal */}
                        <Card title="Posisi Kapal" description="Laporan posisi manual (bukan AIS live) — prioritas keselamatan.">
                            <form onSubmit={submitPositionReport} className="space-y-3">
                                <div>
                                    <label className="text-xs font-medium text-muted">Kapal *</label>
                                    <select
                                        required
                                        value={posForm.vessel_id}
                                        onChange={(e) => setPosForm((f) => ({ ...f, vessel_id: e.target.value }))}
                                        className="block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
                                    >
                                        <option value="">— pilih kapal —</option>
                                        {(reportVessels ?? []).map((v) => (
                                            <option key={v.id} value={v.id}>{v.vessel_name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="text-xs font-medium text-muted">Lintang *</label>
                                        <input
                                            required
                                            type="number"
                                            step="0.0000001"
                                            value={posForm.lat}
                                            onChange={(e) => setPosForm((f) => ({ ...f, lat: e.target.value }))}
                                            className="block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
                                            placeholder="-3.3166667"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-muted">Bujur *</label>
                                        <input
                                            required
                                            type="number"
                                            step="0.0000001"
                                            value={posForm.lng}
                                            onChange={(e) => setPosForm((f) => ({ ...f, lng: e.target.value }))}
                                            className="block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
                                            placeholder="114.5900033"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-muted">Kecepatan (kn)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={posForm.speed_knots}
                                            onChange={(e) => setPosForm((f) => ({ ...f, speed_knots: e.target.value }))}
                                            className="block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end">
                                    <PrimaryButton disabled={syncState.syncing}><MapPin size={14} className="inline me-1" /> Kirim Posisi</PrimaryButton>
                                </div>
                            </form>
                        </Card>

                        {/* Bahan bakar */}
                        <Card title="Bahan Bakar (dari kapal)" description="Biaya tetap dihitung kantor — kapal hanya melaporkan pemakaian.">
                            <form onSubmit={submitFuelReport} className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-medium text-muted">Kapal *</label>
                                        <select
                                            required
                                            value={fuelReportForm.vessel_id}
                                            onChange={(e) => setFuelReportForm((f) => ({ ...f, vessel_id: e.target.value }))}
                                            className="block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
                                        >
                                            <option value="">— pilih —</option>
                                            {(reportVessels ?? []).map((v) => (
                                                <option key={v.id} value={v.id}>{v.vessel_name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-muted">Tanggal</label>
                                        <input
                                            type="date"
                                            value={fuelReportForm.trip_date}
                                            onChange={(e) => setFuelReportForm((f) => ({ ...f, trip_date: e.target.value }))}
                                            className="block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-muted">Rute *</label>
                                        <input
                                            required
                                            value={fuelReportForm.route}
                                            onChange={(e) => setFuelReportForm((f) => ({ ...f, route: e.target.value }))}
                                            className="block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
                                            placeholder="Samarinda – Taboneo"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-muted">Muatan</label>
                                        <input
                                            value={fuelReportForm.cargo_type}
                                            onChange={(e) => setFuelReportForm((f) => ({ ...f, cargo_type: e.target.value }))}
                                            className="block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
                                            placeholder="batu bara"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-muted">Durasi (jam) *</label>
                                        <input
                                            required
                                            type="number"
                                            step="0.1"
                                            value={fuelReportForm.duration_hours}
                                            onChange={(e) => setFuelReportForm((f) => ({ ...f, duration_hours: e.target.value }))}
                                            className="block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-muted">Liters *</label>
                                        <input
                                            required
                                            type="number"
                                            step="0.01"
                                            value={fuelReportForm.liters}
                                            onChange={(e) => setFuelReportForm((f) => ({ ...f, liters: e.target.value }))}
                                            className="block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end">
                                    <PrimaryButton disabled={syncState.syncing}><Fuel size={14} className="inline me-1" /> Kirim Laporan BBM</PrimaryButton>
                                </div>
                            </form>
                        </Card>

                        {/* Keselamatan */}
                        <Card title="Pemeriksaan Keselamatan" description="Checklist safety saat berangkat/tiba — masuk voyage_events.">
                            <form onSubmit={submitSafetyReport} className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-medium text-muted">Perjalanan *</label>
                                        <select
                                            required
                                            value={safetyForm.voyage_id}
                                            onChange={(e) => setSafetyForm((f) => ({ ...f, voyage_id: e.target.value }))}
                                            className="block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
                                        >
                                            <option value="">— pilih voyage —</option>
                                            {(reportVoyages ?? []).map((v) => (
                                                <option key={v.id} value={v.id}>{v.voyage_code}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-muted">Status *</label>
                                        <select
                                            value={safetyForm.status}
                                            onChange={(e) => setSafetyForm((f) => ({ ...f, status: e.target.value }))}
                                            className="block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
                                        >
                                            <option value="lulus">Lulus</option>
                                            <option value="tidak">Tidak lulus</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-muted">Penumpang (bila ada)</label>
                                        <input
                                            type="number"
                                            value={safetyForm.passenger_count}
                                            onChange={(e) => setSafetyForm((f) => ({ ...f, passenger_count: e.target.value }))}
                                            className="block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-muted">Kapasitas</label>
                                        <input
                                            type="number"
                                            value={safetyForm.capacity}
                                            onChange={(e) => setSafetyForm((f) => ({ ...f, capacity: e.target.value }))}
                                            className="block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-muted">Catatan</label>
                                    <input
                                        value={safetyForm.notes}
                                        onChange={(e) => setSafetyForm((f) => ({ ...f, notes: e.target.value }))}
                                        className="block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
                                    />
                                </div>
                                <div className="flex justify-end">
                                    <PrimaryButton disabled={syncState.syncing}><LifeBuoy size={14} className="inline me-1" /> Kirim Pemeriksaan</PrimaryButton>
                                </div>
                            </form>
                        </Card>

                        {/* Gerbak awak */}
                        <Card
                            title="Gerbang Awak (Sign ON / Sign OFF)"
                            description="Dilaporkan dari kapal; perwira wajib diverifikasi kantor (aturan pengganti tetap di kantor)."
                        >
                            <form onSubmit={submitCrewReport} className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-medium text-muted">Awak *</label>
                                        <select
                                            required
                                            value={crewReportForm.crew_id}
                                            onChange={(e) => setCrewReportForm((f) => ({ ...f, crew_id: e.target.value }))}
                                            className="block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
                                        >
                                            <option value="">— pilih —</option>
                                            {(reportCrews ?? []).map((c) => (
                                                <option key={c.id} value={c.id}>{c.name} — {c.rank}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-muted">Jenis *</label>
                                        <select
                                            value={crewReportForm.type}
                                            onChange={(e) => setCrewReportForm((f) => ({ ...f, type: e.target.value }))}
                                            className="block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
                                        >
                                            <option value="sign_off">Sign OFF</option>
                                            <option value="sign_on">Sign ON</option>
                                            <option value="kadet_on">Kadet ON</option>
                                            <option value="kadet_off">Kadet OFF</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-muted">Kapal</label>
                                        <select
                                            value={crewReportForm.vessel_id}
                                            onChange={(e) => setCrewReportForm((f) => ({ ...f, vessel_id: e.target.value }))}
                                            className="block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
                                        >
                                            <option value="">— ikut penempatan —</option>
                                            {(reportVessels ?? []).map((v) => (
                                                <option key={v.id} value={v.id}>{v.vessel_name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-muted">Tanggal</label>
                                        <input
                                            type="date"
                                            value={crewReportForm.movement_date}
                                            onChange={(e) => setCrewReportForm((f) => ({ ...f, movement_date: e.target.value }))}
                                            className="block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-muted">Alasan (untuk OFF)</label>
                                    <input
                                        value={crewReportForm.reason}
                                        onChange={(e) => setCrewReportForm((f) => ({ ...f, reason: e.target.value }))}
                                        className="block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
                                        placeholder="mis. permohonan sendiri"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-muted">Catatan</label>
                                    <input
                                        value={crewReportForm.notes}
                                        onChange={(e) => setCrewReportForm((f) => ({ ...f, notes: e.target.value }))}
                                        className="block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <a href="/sdm?tab=hor" className="text-xs font-medium text-primary hover:underline">
                                        Jam istirahat awak → tab Hours of Rest
                                    </a>
                                    <PrimaryButton disabled={syncState.syncing}>
                                        <ArrowLeftRight size={14} className="inline me-1" /> Kirim Gerbak
                                    </PrimaryButton>
                                </div>
                            </form>
                        </Card>
                    </div>
                </div>
            )}

            {tab === 'posisi' && (
                <div className="space-y-5">
                    <Card title="Peta Posisi Kapal" description="Posisi terakhir yang tercatat; bukan pelacakan AIS/GPS live.">
                        {positionedVessels.length === 0 ? (
                            <EmptyState icon={MapPin} title="Belum ada posisi kapal" />
                        ) : (
                            <div className="relative h-[420px] overflow-hidden rounded-lg border border-hairline">
                                <MapContainer
                                    center={[
                                        Number(positionedVessels[0].last_lat),
                                        Number(positionedVessels[0].last_lng),
                                    ]}
                                    zoom={9}
                                    style={{ height: '100%', width: '100%' }}
                                >
                                    <MapFocus position={focusedPosition} />
                                    <TileLayer
                                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                        eventHandlers={{
                                            load: () => setMapHasLoaded(true),
                                            tileerror: () => setMapHasError(true),
                                        }}
                                    />
                                    {positionedVessels.map((v) => (
                                        <VesselMarker
                                            key={v.id}
                                            vessel={v}
                                            onClick={() => selectVessel(v)}
                                        />
                                    ))}
                                </MapContainer>
                                {!mapHasLoaded && !mapHasError && (
                                    <p className="absolute bottom-3 left-3 rounded bg-white/95 px-3 py-2 text-xs text-muted shadow">
                                        Memuat peta...
                                    </p>
                                )}
                                {mapHasError && (
                                    <p role="alert" className="absolute bottom-3 left-3 rounded bg-white/95 px-3 py-2 text-xs text-primary shadow">
                                        Peta tidak dapat dimuat. Data posisi tetap tersedia pada daftar kapal.
                                    </p>
                                )}
                            </div>
                        )}
                    </Card>
                    <Card title="Kapal & Status Perjalanan">
                        {(vessels ?? []).length === 0 ? (
                            <EmptyState icon={Ship} title="Belum ada kapal terdaftar" />
                        ) : (
                            <ul className="divide-y divide-hairline">
                                {(vessels ?? []).map((v) => (
                                    <li key={v.id}>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                selectVessel(v);
                                                if (v.last_lat !== null && v.last_lat !== undefined &&
                                                    v.last_lng !== null && v.last_lng !== undefined) {
                                                    setSelectedVesselId(v.id);
                                                }
                                            }}
                                            className="flex w-full flex-wrap items-center gap-3 py-3 text-left hover:bg-appbg/60"
                                        >
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate text-sm font-semibold text-ink">{v.vessel_name}</span>
                                                <span className="block text-xs text-muted">
                                                    {v.voyage
                                                        ? `${v.voyage.voyage_code} · ${v.voyage.origin} → ${v.voyage.destination}`
                                                        : 'Tidak ada perjalanan aktif'}
                                                </span>
                                            </span>
                                            <Badge tone={v.voyage ? 'info' : 'neutral'}>
                                                {v.voyage
                                                    ? VOYAGE_STATUS_LABELS[v.voyage.voyage_status] ?? v.voyage.voyage_status
                                                    : 'Tidak ada perjalanan'}
                                            </Badge>
                                            <span className="text-xs text-muted">
                                                {v.last_lat !== null && v.last_lat !== undefined &&
                                                v.last_lng !== null && v.last_lng !== undefined
                                                    ? `${v.last_lat}, ${v.last_lng}`
                                                    : 'Posisi belum tercatat'}
                                            </span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Card>

                    <Modal
                        show={!!selectedVessel}
                        onClose={() => {
                            setSelectedVesselId(null);
                            setEntryModal(null);
                        }}
                        fullScreen
                    >
                        {selectedVessel && (
                            <div className="h-full overflow-y-auto p-4 sm:p-6">
                                <div className="mb-5 flex items-start justify-between gap-4 border-b border-hairline pb-4">
                                    <div>
                                        <h2 className="text-xl font-semibold text-ink">{selectedVessel.vessel_name}</h2>
                                        <p className="text-sm text-muted">
                                            {selectedVessel.vessel_type === 'lainnya' && selectedVessel.vessel_type_custom
                                                ? selectedVessel.vessel_type_custom
                                                : String(selectedVessel.vessel_type).replaceAll('_', ' ')}
                                            {' · '}
                                            {selectedVessel.operational_status}
                                        </p>
                                    </div>
                                    <SecondaryButton type="button" onClick={() => {
                                        setSelectedVesselId(null);
                                        setEntryModal(null);
                                    }}>Tutup</SecondaryButton>
                                </div>
                                <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                                    <div>
                                        <dt className="text-xs text-muted">Posisi terakhir</dt>
                                        <dd className="font-medium text-ink">
                                            {selectedVessel.last_lat ?? '—'}, {selectedVessel.last_lng ?? '—'}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs text-muted">Waktu update</dt>
                                        <dd className="font-medium text-ink">{formatDateTime(selectedVessel.last_position_at)}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs text-muted">Kondisi terakhir</dt>
                                        <dd className="font-medium text-ink">
                                            {selectedVessel.condition
                                                ? `Skor ${selectedVessel.condition.score}/100 · ${formatDate(selectedVessel.condition.checked_at)}`
                                                : 'Belum ada pemeriksaan'}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs text-muted">BBM terakhir</dt>
                                        <dd className="font-medium text-ink">
                                            {selectedVessel.fuel
                                                ? `${formatNumber(selectedVessel.fuel.liters, 2)} L · ${FUEL_TEXT[selectedVessel.fuel.analysis_status] ?? selectedVessel.fuel.analysis_status} · ${formatDate(selectedVessel.fuel.trip_date)}`
                                                : 'Belum ada catatan BBM'}
                                        </dd>
                                    </div>
                                    <div className="sm:col-span-2">
                                        <dt className="text-xs text-muted">Status perjalanan</dt>
                                        <dd className="font-medium text-ink">
                                            {selectedVessel.voyage
                                                ? `${selectedVessel.voyage.voyage_code} · ${VOYAGE_STATUS_LABELS[selectedVessel.voyage.voyage_status] ?? selectedVessel.voyage.voyage_status} · ${selectedVessel.voyage.origin} → ${selectedVessel.voyage.destination}`
                                                : 'Tidak ada perjalanan aktif'}
                                        </dd>
                                    </div>
                                </dl>
                                <section className="mt-6 border-t border-hairline pt-5">
                                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                                        <div>
                                            <h3 className="text-base font-semibold text-ink">Riwayat & operasional kapal</h3>
                                            <p className="text-xs text-muted">Kondisi, servis, dan BBM khusus {selectedVessel.vessel_name}.</p>
                                        </div>
                                        {canManage && (
                                            <div className="flex flex-wrap gap-2">
                                                <SecondaryButton type="button" onClick={() => setEntryModal('condition')}>
                                                    <Activity size={15} className="mr-1.5" /> Input Kondisi
                                                </SecondaryButton>
                                                <SecondaryButton type="button" onClick={() => {
                                                    setServiceItems([]);
                                                    setServiceCost('');
                                                    setEntryModal('service');
                                                }}>
                                                    <Wrench size={15} className="mr-1.5" /> Catat Servis
                                                </SecondaryButton>
                                                <SecondaryButton type="button" onClick={() => {
                                                    setBbmVesselId(String(selectedVessel.id));
                                                    setBbmVoyageId('');
                                                    setFuelErrors({});
                                                    setTripDate('');
                                                    setTripRoute('');
                                                    setDuration('');
                                                    setLiters('');
                                                    setPricePerLiter('');
                                                    setExplanation('');
                                                    setEntryModal('fuel');
                                                }}>
                                                    <Fuel size={15} className="mr-1.5" /> Catat BBM
                                                </SecondaryButton>
                                            </div>
                                        )}
                                    </div>
                                    {historyLoading ? (
                                        <p className="rounded-lg bg-appbg p-4 text-sm text-muted">Memuat riwayat kapal...</p>
                                    ) : historyError ? (
                                        <div role="alert" className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm text-primary">
                                            {historyError}
                                            <button type="button" className="ml-2 font-semibold underline" onClick={() => setHistoryRefresh((current) => current + 1)}>
                                                Coba lagi
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                                            <section className="rounded-lg border border-hairline p-4">
                                                <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink"><Activity size={16} /> Kondisi</h4>
                                                {vesselHistory.conditions.length === 0 ? (
                                                    <p className="text-sm text-muted">Belum ada pemeriksaan kondisi.</p>
                                                ) : (
                                                    <ul className="max-h-80 space-y-2 overflow-y-auto">
                                                        {vesselHistory.conditions.map((condition) => (
                                                            <li key={condition.id} className="rounded-md bg-appbg p-3 text-sm">
                                                                <div className="flex justify-between gap-2">
                                                                    <strong>Skor {condition.score}/100</strong>
                                                                    <span className="text-xs text-muted">{formatDateTime(condition.checked_at)}</span>
                                                                </div>
                                                                {condition.notes && <p className="mt-1 text-xs text-muted">{condition.notes}</p>}
                                                                <p className="mt-1 text-xs text-muted">Pemeriksa: {condition.checked_by_name ?? '—'}</p>
                                                                {canManage && <div className="mt-2 flex gap-3 text-xs font-medium">
                                                                    <button type="button" className="text-primary hover:underline" onClick={() => setEditCondition({ ...condition, checked_at: String(condition.checked_at).slice(0, 10) })}>Edit</button>
                                                                    <button type="button" className="text-primary hover:underline" onClick={() => setConfirmDel({ url: `/operasional/kondisi/${condition.id}`, label: `pemeriksaan kondisi ${selectedVessel.vessel_name}` })}>Hapus</button>
                                                                </div>}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </section>
                                            <section className="rounded-lg border border-hairline p-4">
                                                <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink"><Wrench size={16} /> Servis</h4>
                                                {vesselHistory.services.length === 0 ? (
                                                    <p className="text-sm text-muted">Belum ada riwayat servis.</p>
                                                ) : (
                                                    <ul className="max-h-80 space-y-2 overflow-y-auto">
                                                        {vesselHistory.services.map((service) => (
                                                            <li key={service.id} className="rounded-md bg-appbg p-3 text-sm">
                                                                <div className="flex justify-between gap-2">
                                                                    <strong>{service.title}</strong>
                                                                    <Badge tone={service.status === 'selesai' ? 'success' : service.status === 'proses' ? 'warning' : 'neutral'}>{service.status}</Badge>
                                                                </div>
                                                                <p className="mt-1 text-xs text-muted">{formatDate(service.start_date)} – {formatDate(service.end_date)} · {formatRupiah(service.cost)}</p>
                                                                {service.workshop && <p className="text-xs text-muted">{service.workshop}</p>}
                                                                {canManage && <div className="mt-2 flex gap-3 text-xs font-medium">
                                                                    <button type="button" className="text-primary hover:underline" onClick={() => setEditService({ ...service, start_date: String(service.start_date).slice(0, 10), end_date: service.end_date ? String(service.end_date).slice(0, 10) : '' })}>Edit</button>
                                                                    <button type="button" className="text-primary hover:underline" onClick={() => setConfirmDel({ url: `/operasional/servis/${service.id}`, label: `servis "${service.title}"` })}>Hapus</button>
                                                                </div>}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </section>
                                            <section className="rounded-lg border border-hairline p-4">
                                                <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink"><Fuel size={16} /> Monitoring BBM</h4>
                                                {vesselHistory.logs.length === 0 ? (
                                                    <p className="text-sm text-muted">Belum ada catatan BBM.</p>
                                                ) : (
                                                    <ul className="max-h-80 space-y-2 overflow-y-auto">
                                                        {vesselHistory.logs.map((fuel) => (
                                                            <li key={fuel.id} className="rounded-md bg-appbg p-3 text-sm">
                                                                <div className="flex justify-between gap-2">
                                                                    <strong>{fuel.route}</strong>
                                                                    <Badge tone={FUEL_TONES[fuel.analysis_status] ?? 'neutral'}>{FUEL_TEXT[fuel.analysis_status] ?? fuel.analysis_status}</Badge>
                                                                </div>
                                                                <p className="mt-1 text-xs text-muted">{formatDate(fuel.trip_date)} · {formatNumber(fuel.liters, 2)} L · {formatNumber(fuel.lph, 1)} L/jam · {formatRupiah(fuel.cost)}</p>
                                                                {fuel.explanation_note && <p className="mt-1 text-xs text-muted">{fuel.explanation_note}</p>}
                                                                {canManage && <div className="mt-2 flex gap-3 text-xs font-medium">
                                                                    <button type="button" className="text-primary hover:underline" onClick={() => setEditFuel({ ...fuel, trip_date: String(fuel.trip_date).slice(0, 10), explanation: fuel.explanation_note ?? '', price_per_liter: Number(fuel.liters) > 0 ? (Number(fuel.cost) / Number(fuel.liters)).toString() : '' })}>Edit</button>
                                                                    <button type="button" className="text-primary hover:underline" onClick={() => setConfirmDel({ url: `/operasional/bbm/${fuel.id}`, label: `log BBM ${selectedVessel.vessel_name} (${fuel.route})` })}>Hapus</button>
                                                                </div>}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </section>
                                        </div>
                                    )}
                                </section>
                                {canManage && (
                                    <form onSubmit={submitPosition} className="mt-6 border-t border-hairline pt-5">
                                        <h3 className="mb-3 text-sm font-semibold text-ink">Update posisi manual</h3>
                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                            {(['lat', 'lng'] as const).map((field) => (
                                                <div key={field}>
                                                    <label htmlFor={`position-${field}`} className="text-xs font-medium text-muted">
                                                        {field === 'lat' ? 'Latitude' : 'Longitude'}
                                                    </label>
                                                    <input
                                                        id={`position-${field}`}
                                                        type="number"
                                                        step="any"
                                                        min={field === 'lat' ? -90 : -180}
                                                        max={field === 'lat' ? 90 : 180}
                                                        required
                                                        value={positionForm[field]}
                                                        onChange={(event) => setPositionForm((current) => ({
                                                            ...current,
                                                            [field]: event.target.value,
                                                        }))}
                                                        className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary"
                                                    />
                                                    {positionErrors[field] && (
                                                        <p className="mt-1 text-xs text-primary">{positionErrors[field]}</p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                        <p className="mt-2 text-xs text-muted">
                                            Pembaruan ini dicatat sebagai posisi manual dan bukan data AIS/GPS live.
                                        </p>
                                        <div className="mt-4 flex justify-end">
                                            <PrimaryButton disabled={positionSaving}>
                                                {positionSaving ? 'Menyimpan...' : 'Perbarui Posisi'}
                                            </PrimaryButton>
                                        </div>
                                    </form>
                                )}
                                <Modal
                                    show={!!entryModal}
                                    onClose={() => setEntryModal(null)}
                                    maxWidth="xl"
                                    stacked
                                >
                                    <div className="max-h-[90dvh] overflow-y-auto p-5 sm:p-6">
                                        <div className="mb-4 flex items-start justify-between gap-4">
                                            <div>
                                                <h3 className="text-lg font-semibold text-ink">
                                                    {entryModal === 'condition' ? 'Pemeriksaan Kondisi' : entryModal === 'service' ? 'Catat Servis' : 'Catat Trip BBM'}
                                                </h3>
                                                <p className="text-sm text-muted">{selectedVessel.vessel_name}</p>
                                            </div>
                                            <SecondaryButton type="button" onClick={() => setEntryModal(null)}>Tutup</SecondaryButton>
                                        </div>
                                        {entryModal === 'condition' && (
                                            <form onSubmit={submitCondition} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                <input type="hidden" name="vessel_id" value={selectedVessel.id} />
                                                <TextInputField label="Tanggal Pemeriksaan" name="checked_at" type="date" required />
                                                {['mesin', 'navigasi', 'keselamatan', 'dek', 'kamar'].map((field) => (
                                                    <Select
                                                        key={field}
                                                        label={field.charAt(0).toUpperCase() + field.slice(1)}
                                                        name={field}
                                                        required
                                                        options={[
                                                            { value: 'baik', label: 'Baik' },
                                                            { value: 'cukup', label: 'Cukup' },
                                                            { value: 'perlu_perbaikan', label: 'Perlu Perbaikan' },
                                                        ]}
                                                    />
                                                ))}
                                                <TextInputField label="Skor (0–100)" name="score" type="number" required />
                                                <div className="sm:col-span-2">
                                                    <label className="text-xs font-medium text-muted">Catatan</label>
                                                    <textarea name="notes" rows={3} className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary" />
                                                </div>
                                                <div className="sm:col-span-2 flex justify-end">
                                                    <PrimaryButton>Simpan Pemeriksaan</PrimaryButton>
                                                </div>
                                            </form>
                                        )}
                                        {entryModal === 'service' && (
                                            <form onSubmit={submitService} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                <input type="hidden" name="vessel_id" value={selectedVessel.id} />
                                                <Select label="Jenis" name="type" required options={[
                                                    { value: 'rutin', label: 'Rutin' },
                                                    { value: 'urgent', label: 'Urgent' },
                                                    { value: 'drydock', label: 'Drydock' },
                                                    { value: 'pemeriksaan', label: 'Pemeriksaan' },
                                                ]} />
                                                <Select label="Status" name="status" required options={[
                                                    { value: 'rencana', label: 'Rencana' },
                                                    { value: 'proses', label: 'Proses' },
                                                    { value: 'selesai', label: 'Selesai (stok dipotong)' },
                                                ]} />
                                                <TextInputField label="Judul Pekerjaan" name="title" required />
                                                <TextInputField label="Bengkel" name="workshop" />
                                                <TextInputField label="Mulai" name="start_date" type="date" required />
                                                <TextInputField label="Selesai" name="end_date" type="date" />
                                                <div>
                                                    <label className="text-xs font-medium text-muted">Biaya (Rp)</label>
                                                    <NumericInput decimalPlaces={2} value={serviceCost} onChange={(event) => setServiceCost(event.target.value)} className="mt-1 block w-full" />
                                                </div>
                                                <div className="sm:col-span-2">
                                                    <label className="text-xs font-medium text-muted">Sparepart dipakai</label>
                                                    {serviceItems.map((row, index) => (
                                                        <div key={index} className="mt-2 flex gap-2">
                                                            <SearchableSelect
                                                                value={row.item_id}
                                                                options={[
                                                                    { value: '', label: '— pilih item —' },
                                                                    ...historyItems.map((item) => ({
                                                                        value: String(item.id),
                                                                        label: `${item.sku} · ${item.name} (kantor: ${formatNumber(item.stok_kantor, 0)})`,
                                                                    })),
                                                                ]}
                                                                onChange={(value) => setServiceItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, item_id: value } : item))}
                                                                className="flex-1"
                                                            />
                                                            <NumericInput decimalPlaces={2} min={0} placeholder="Qty" value={row.qty} onChange={(event) => setServiceItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, qty: event.target.value } : item))} className="w-24 rounded-md border-gray-300 text-sm shadow-sm" />
                                                        </div>
                                                    ))}
                                                    <button type="button" onClick={() => setServiceItems((current) => [...current, { item_id: '', qty: '' }])} className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                                                        <Plus size={13} /> Tambah item
                                                    </button>
                                                </div>
                                                <div className="sm:col-span-2 flex justify-end">
                                                    <PrimaryButton>Simpan Servis</PrimaryButton>
                                                </div>
                                            </form>
                                        )}
                                        {entryModal === 'fuel' && (
                                            <form onSubmit={submitFuel} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                <input type="hidden" name="vessel_id" value={selectedVessel.id} />
                                                <input type="hidden" name="cost" value={totalFuelCost.toFixed(2)} />
                                                <div>
                                                    <label className="text-xs font-medium text-muted">Perjalanan / Voyage (Opsional)</label>
                                                    <SearchableSelect
                                                        name="voyage_id"
                                                        value={bbmVoyageId}
                                                        onChange={setBbmVoyageId}
                                                        placeholder="Cari perjalanan..."
                                                        options={[
                                                            { value: '', label: '— tanpa kaitan perjalanan spesifik —' },
                                                            ...historyVoyages.map((voyage) => ({ value: String(voyage.id), label: voyage.voyage_code })),
                                                        ]}
                                                    />
                                                </div>
                                                <TextInputField label="Tanggal" name="trip_date" type="date" value={tripDate} onChange={(value) => updateFuelField('trip_date', value, setTripDate)} error={fuelErrors.trip_date} />
                                                <TextInputField label="Rute" name="route" value={tripRoute} onChange={(value) => updateFuelField('route', value, setTripRoute)} error={fuelErrors.route} placeholder="mis. Samarinda -> Bontang" />
                                                <TextInputField label="Durasi (jam)" name="duration_hours" type="number" step="0.01" value={duration} onChange={(value) => updateFuelField('duration_hours', value, setDuration)} error={fuelErrors.duration_hours} />
                                                <TextInputField label="Jarak (mil)" name="distance_nm" type="number" step="0.01" />
                                                <div>
                                                    <label className="text-xs font-medium text-muted">Liter *</label>
                                                    <NumericInput name="liters" decimalPlaces={2} value={liters} onChange={(event) => updateFuelField('liters', event.target.value, setLiters)} className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary" />
                                                    {fuelErrors.liters && <p className="mt-1 text-xs font-medium text-primary">{fuelErrors.liters}</p>}
                                                </div>
                                                <div>
                                                    <label className="text-xs font-medium text-muted">Harga per Liter (Rp) *</label>
                                                    <NumericInput name="price_per_liter" decimalPlaces={2} value={pricePerLiter} onChange={(event) => updateFuelField('price_per_liter', event.target.value, setPricePerLiter)} className="mt-1 block w-full" />
                                                    {fuelErrors.price_per_liter && <p className="mt-1 text-xs font-medium text-primary">{fuelErrors.price_per_liter}</p>}
                                                </div>
                                                <p className="rounded-md bg-appbg px-3 py-2 text-sm text-ink sm:col-span-2">Total biaya BBM: <strong>{formatRupiah(totalFuelCost)}</strong></p>
                                                <TextInputField label="Kecepatan (knot)" name="speed_knots" type="number" step="0.1" />
                                                <TextInputField label="Keterlambatan (jam)" name="delay_hours" type="number" step="0.1" />
                                                <TextInputField label="Kondisi Cuaca" name="weather_condition" placeholder="mis. cerah, gelombang tenang, hujan..." />
                                                {liveAnalysis && (
                                                    <div className="rounded-md border border-hairline p-3 sm:col-span-2">
                                                        <p className="text-sm font-semibold text-ink">Preview: <Badge tone={FUEL_TONES[liveAnalysis.status] ?? 'neutral'}>{FUEL_TEXT[liveAnalysis.status] ?? liveAnalysis.status}</Badge> ({liveAnalysis.diff > 0 ? '+' : ''}{formatNumber(liveAnalysis.diff, 1)}%)</p>
                                                        <p className="text-xs text-muted">{formatNumber(liveAnalysis.lph, 1)} L/jam{liveAnalysis.baseline ? ` vs baseline ${formatNumber(liveAnalysis.baseline, 0)} L/jam` : ' · baseline belum ditetapkan'}</p>
                                                    </div>
                                                )}
                                                <div className="sm:col-span-2">
                                                    <label className="text-xs font-medium text-muted">Catatan penjelasan (wajib bila Tidak Normal)</label>
                                                    <textarea name="explanation" rows={2} value={explanation} onChange={(event) => updateFuelField('explanation', event.target.value, setExplanation)} className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary" />
                                                    {fuelErrors.explanation && <p className="mt-1 text-xs font-medium text-primary">{fuelErrors.explanation}</p>}
                                                </div>
                                                <div className="sm:col-span-2 flex justify-end">
                                                    <PrimaryButton disabled={Object.values(fuelErrors).some(Boolean)}>Simpan Trip</PrimaryButton>
                                                </div>
                                            </form>
                                        )}
                                    </div>
                                </Modal>
                            </div>
                        )}
                    </Modal>
                </div>
            )}

            {tab === 'kondisi' && (
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
                    <Card title="Form Pemeriksaan Kondisi" className={canManage ? '' : 'hidden'}>
                        <form onSubmit={submitCondition} className="space-y-3">
                            <Select
                                label="Vessel"
                                name="vessel_id"
                                required
                                options={[
                                    { value: '', label: '— pilih vessel —' },
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
                                label="Vessel"
                                name="vessel_id"
                                required
                                options={[
                                    { value: '', label: '— pilih vessel —' },
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
                            <div>
                                <label className="text-xs font-medium text-muted">Biaya (Rp)</label>
                                <NumericInput
                                    decimalPlaces={2}
                                    value={serviceCost}
                                    onChange={(e) => setServiceCost(e.target.value)}
                                    className="mt-1 block w-full"
                                />
                            </div>
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
                                        <SearchableSelect
                                            value={row.item_id}
                                            options={[
                                                { value: '', label: '— pilih item —' },
                                                ...(items ?? []).map((item) => ({
                                                    value: String(item.id),
                                                    label: `${item.sku} · ${item.name} (kantor: ${formatNumber(item.stok_kantor, 0)})`,
                                                })),
                                            ]}
                                            onChange={(value) =>
                                                setServiceItems((prev) =>
                                                    prev.map((p, i) => (i === idx ? { ...p, item_id: value } : p)),
                                                )
                                            }
                                            className="flex-1"
                                        />
                                        <NumericInput
                                            decimalPlaces={2}
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
                            ['Liter Bulan Ini', formatNumber(kpis?.liter_bulan ?? 0, 2) + ' L'],
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
                                    <label className="text-xs font-medium text-muted">Vessel *</label>
                                    <SearchableSelect
                                        name="vessel_id"
                                        value={bbmVesselId}
                                        onChange={(value) => {
                                            setBbmVesselId(value);
                                            setFuelErrors((current) => ({
                                                ...current,
                                                vessel_id: value ? '' : 'Pilih kapal.',
                                            }));
                                        }}
                                        options={[
                                            { value: '', label: '— pilih vessel —' },
                                            ...(vessels ?? []).map((v) => ({
                                                value: String(v.id),
                                                label: `${v.vessel_name} (baseline ${formatNumber(v.fuel_baseline_lph, 1)} L/jam)`,
                                            })),
                                        ]}
                                    />
                                    {fuelErrors.vessel_id && (
                                        <p className="mt-1 text-xs font-medium text-primary">{fuelErrors.vessel_id}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-muted">Perjalanan / Voyage (Opsional)</label>
                                    <SearchableSelect
                                        name="voyage_id"
                                        value={bbmVoyageId}
                                        onChange={setBbmVoyageId}
                                        placeholder="Cari perjalanan..."
                                        options={[
                                            { value: '', label: '— tanpa kaitan perjalanan spesifik —' },
                                            ...(voyages ?? []).map((voyage) => ({
                                                value: String(voyage.id),
                                                label: voyage.voyage_code,
                                            })),
                                        ]}
                                    />
                                </div>
                                <TextInputField
                                    label="Tanggal"
                                    name="trip_date"
                                    type="date"
                                    value={tripDate}
                                    onChange={(value) => updateFuelField('trip_date', value, setTripDate)}
                                    error={fuelErrors.trip_date}
                                />
                                <TextInputField
                                    label="Rute"
                                    name="route"
                                    value={tripRoute}
                                    onChange={(value) => updateFuelField('route', value, setTripRoute)}
                                    error={fuelErrors.route}
                                    placeholder="mis. Samarinda -> Bontang"
                                />
                                <div className="grid grid-cols-2 gap-3">
                                    <TextInputField
                                        label="Durasi (jam)"
                                        name="duration_hours"
                                        type="number"
                                        step="0.01"
                                        value={duration}
                                        onChange={(value) => updateFuelField('duration_hours', value, setDuration)}
                                        error={fuelErrors.duration_hours}
                                    />
                                    <TextInputField label="Jarak (mil)" name="distance_nm" type="number" step="0.01" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-medium text-muted">Liter *</label>
                                        <NumericInput
                                            name="liters"
                                            decimalPlaces={2}
                                            value={liters}
                                            onChange={(e) => updateFuelField('liters', e.target.value, setLiters)}
                                            className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary"
                                        />
                                        {fuelErrors.liters && <p className="mt-1 text-xs font-medium text-primary">{fuelErrors.liters}</p>}
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-muted">Harga per Liter (Rp) *</label>
                                        <NumericInput
                                            name="price_per_liter"
                                            decimalPlaces={2}
                                            value={pricePerLiter}
                                            onChange={(e) => updateFuelField('price_per_liter', e.target.value, setPricePerLiter)}
                                            className="mt-1 block w-full"
                                        />
                                        {fuelErrors.price_per_liter && <p className="mt-1 text-xs font-medium text-primary">{fuelErrors.price_per_liter}</p>}
                                    </div>
                                    <input type="hidden" name="cost" value={totalFuelCost.toFixed(2)} />
                                </div>
                                <p className="rounded-md bg-appbg px-3 py-2 text-sm text-ink">
                                    Total biaya BBM: <strong>{formatRupiah(totalFuelCost)}</strong>
                                </p>
                                <div className="grid grid-cols-2 gap-3">
                                    <TextInputField label="Kecepatan (knot)" name="speed_knots" type="number" step="0.1" />
                                    <TextInputField label="Keterlambatan (jam)" name="delay_hours" type="number" step="0.1" />
                                </div>
                                <TextInputField label="Kondisi Cuaca" name="weather_condition" placeholder="mis. cerah, gelombang tenang, hujan..." />
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
                                            {formatNumber(liveAnalysis.lph, 1)} L/jam
                                            {liveAnalysis.baseline
                                                ? ` vs baseline ${formatNumber(liveAnalysis.baseline, 0)} L/jam`
                                                : ' · baseline belum ditetapkan'}
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
                                        value={explanation}
                                        onChange={(e) => updateFuelField('explanation', e.target.value, setExplanation)}
                                        className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary"
                                    />
                                    {fuelErrors.explanation && <p className="mt-1 text-xs font-medium text-primary">{fuelErrors.explanation}</p>}
                                </div>
                                <PrimaryButton disabled={Object.values(fuelErrors).some(Boolean)}>Simpan Trip</PrimaryButton>
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
                                                    {formatDate(f.trip_date)} · {formatNumber(f.duration_hours, 1)} jam ·{' '}
                                                    {formatNumber(f.liters, 2)} L · {formatNumber(f.lph, 1)} L/jam
                                                    {f.baseline_lph
                                                        ? ` (baseline ${formatNumber(f.baseline_lph, 1)})`
                                                        : ''}
                                                    {f.speed_knots ? ` · ${formatNumber(f.speed_knots, 1)} knot` : ''}
                                                    {f.weather_condition ? ` · ${f.weather_condition}` : ''}
                                                    {f.delay_hours ? ` · kendala ${formatNumber(f.delay_hours, 1)} jam` : ''}
                                                </p>
                                                {f.explanation_note && (
                                                    <p className="mt-0.5 text-xs italic text-muted">
                                                        "{f.explanation_note}"
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
                                                        onClick={() => setEditFuel({
                                                            ...f,
                                                            trip_date: String(f.trip_date).slice(0, 10),
                                                            explanation: f.explanation_note ?? '',
                                                            price_per_liter: Number(f.liters) > 0
                                                                ? (Number(f.cost) / Number(f.liters)).toString()
                                                                : '',
                                                        })}
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
                <Modal show={!!editCondition} onClose={() => setEditCondition(null)} maxWidth="md" stacked>
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
                                { preserveScroll: true, onSuccess: () => { setEditCondition(null); setHistoryRefresh((current) => current + 1); } },
                            );
                        }}
                    >
                        <h2 className="text-lg font-semibold text-ink">Edit Pemeriksaan Kondisi</h2>
                        <div className="grid grid-cols-2 gap-3">
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
                                    <SearchableSelect
                                        value={editCondition.checklist?.[k] ?? 'baik'}
                                        options={[
                                            { value: 'baik', label: 'Baik' },
                                            { value: 'cukup', label: 'Cukup' },
                                            { value: 'perlu_perbaikan', label: 'Perlu Perbaikan' },
                                        ]}
                                        onChange={(value) => setEditCondition({
                                            ...editCondition,
                                            checklist: { ...editCondition.checklist, [k]: value },
                                        })}
                                    />
                                </div>
                            ))}
                            <div>
                                <label className="text-xs font-medium text-muted">Skor (0–100)</label>
                                <NumericInput
                                    decimalPlaces={0}
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
                <Modal show={!!editService} onClose={() => setEditService(null)} maxWidth="lg" stacked>
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
                                { preserveScroll: true, onSuccess: () => { setEditService(null); setHistoryRefresh((current) => current + 1); } },
                            );
                        }}
                    >
                        <h2 className="text-lg font-semibold text-ink">Edit Catatan Servis</h2>
                        <p className="text-xs text-muted">
                            Bila status diubah ke/atau tetap "selesai", stok sparepart dipotong ulang secara otomatis (pemotongan lama dipulihkan).
                        </p>
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                            <div>
                                <label className="text-xs font-medium text-muted">Jenis</label>
                                <SearchableSelect
                                    value={editService.type}
                                    options={[
                                        { value: 'rutin', label: 'Rutin' },
                                        { value: 'urgent', label: 'Urgent' },
                                        { value: 'drydock', label: 'Drydock' },
                                        { value: 'pemeriksaan', label: 'Pemeriksaan' },
                                    ]}
                                    onChange={(value) => setEditService({ ...editService, type: value })}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-muted">Status</label>
                                <SearchableSelect
                                    value={editService.status}
                                    options={[
                                        { value: 'rencana', label: 'Rencana' },
                                        { value: 'proses', label: 'Proses' },
                                        { value: 'selesai', label: 'Selesai' },
                                    ]}
                                    onChange={(value) => setEditService({ ...editService, status: value })}
                                />
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
                                <NumericInput
                                    decimalPlaces={2}
                                    value={editService.cost ?? 0}
                                    onChange={(e) => setEditService({ ...editService, cost: e.target.value })}
                                    className="mt-1 block w-full"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-muted">Sparepart dipakai</label>
                            {(editService.items ?? []).map((it: any, idx: number) => (
                                <div key={idx} className="mt-2 flex items-center gap-2 text-sm">
                                    <span className="flex-1 text-ink">{it.item_name}</span>
                                    <NumericInput
                                        decimalPlaces={2}
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
                                        items: [...(editService.items ?? []), { item_id: historyItems[0]?.id, item_name: historyItems[0]?.name, qty: 1 }],
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
                <Modal show={!!editFuel} onClose={() => setEditFuel(null)} maxWidth="md" stacked>
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
                                { preserveScroll: true, onSuccess: () => { setEditFuel(null); setHistoryRefresh((current) => current + 1); } },
                            );
                        }}
                    >
                        <h2 className="text-lg font-semibold text-ink">Edit Log BBM</h2>
                        <p className="text-xs text-muted">Analisis Normal/Waspada/Tidak Normal dihitung ulang otomatis saat disimpan.</p>
                        <div className="grid grid-cols-2 gap-3">
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
                                <NumericInput
                                    decimalPlaces={2}
                                    value={editFuel.duration_hours}
                                    onChange={(e) => setEditFuel({ ...editFuel, duration_hours: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-muted">Liter</label>
                                <NumericInput
                                    decimalPlaces={2}
                                    value={editFuel.liters}
                                    onChange={(e) => {
                                        const litersValue = Number(e.target.value) || 0;
                                        const priceValue = Number(editFuel.price_per_liter) || 0;
                                        setEditFuel({
                                            ...editFuel,
                                            liters: e.target.value,
                                            cost: Number((litersValue * priceValue).toFixed(2)),
                                        });
                                    }}
                                    className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-muted">Jarak (mil)</label>
                                <NumericInput
                                    decimalPlaces={2}
                                    value={editFuel.distance_nm ?? ''}
                                    onChange={(e) => setEditFuel({ ...editFuel, distance_nm: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-muted">Harga per Liter (Rp)</label>
                                <NumericInput
                                    decimalPlaces={6}
                                    value={editFuel.price_per_liter ?? ''}
                                    onChange={(e) => {
                                        const priceValue = Number(e.target.value) || 0;
                                        const litersValue = Number(editFuel.liters) || 0;
                                        setEditFuel({
                                            ...editFuel,
                                            price_per_liter: e.target.value,
                                            cost: Number((priceValue * litersValue).toFixed(2)),
                                        });
                                    }}
                                    className="mt-1 block w-full"
                                />
                                <p className="mt-1 text-xs text-muted">
                                    Total biaya BBM: {formatRupiah(editFuel.cost ?? 0)}
                                </p>
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
                        onSuccess: () => setHistoryRefresh((current) => current + 1),
                        onFinish: () => { setBusy(false); setConfirmDel(null); },
                    });
                }}
            />
        </AuthenticatedLayout>
    );
}