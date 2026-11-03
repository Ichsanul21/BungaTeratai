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
import { classNames, formatDate, formatDateTime, formatNumber, formatRupiah, relativeTimeId } from '@/lib/format';
import { type PageProps } from '@/types';
import { Head, router } from '@inertiajs/react';
import {
    Activity,
    ClipboardCheck,
    ClipboardList,
    Cog,
    Container,
    Fuel,
    Gauge,
    Layers,
    MapPin,
    Maximize2,
    Minimize2,
    Navigation,
    Plus,
    Ship,
    ShipWheel,
    Users,
    Wrench,
} from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { divIcon } from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Button, Col, Divider, Input, InputNumber, Progress, Row, Select as AntSelect, Skeleton, Switch, Tag, Timeline, Tooltip, Typography } from 'antd';

const { Text } = Typography;

// AIS Vessel Interface
interface AISVessel {
    mmsi: string;
    imo: number;
    vessel_name: string;
    call_sign: string;
    vessel_type: string;
    vessel_type_code: number;
    latitude: number;
    longitude: number;
    speed: number;
    course: number;
    heading: number;
    draught: number;
    nav_status?: string;
    source?: string;
    estimated?: boolean;
    destination: string;
    eta: string;
    last_seen_at: string;
}

// Fleet Vessel with optional AIS data
interface FleetVessel {
    id: number | string;
    vessel_name: string;
    vessel_type: string;
    vessel_type_custom?: string | null;
    operational_status: string;
    last_lat: number | null;
    last_lng: number | null;
    last_position_at: string | null;
    voyage?: any;
    mmsi?: string | null;
    imo?: string | null;
    ais_data?: AISVessel | null;
    source: 'fleet' | 'ais_external';
}

// AIS External Vessel Marker (Blue Circle)
function navStatusFor(vessel: FleetVessel): string {
    if (vessel.ais_data?.nav_status) return vessel.ais_data.nav_status;

    const status = vessel.voyage?.voyage_status;
    if (status === 'in_transit' || status === 'departed' || status === 'delayed') {
        return 'Underway Using Engine';
    }
    if (status === 'ready_for_departure' || status === 'completed') {
        return 'Moored';
    }

    return '—';
}

function PopupRow({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
    return (
        <div className="flex items-start justify-between gap-3">
            <span className="shrink-0 text-[10px] font-medium uppercase tracking-[0.08em] text-[#5B6474]">
                {label}
            </span>
            <span
                className={classNames(
                    'text-right text-[11px] font-semibold leading-snug text-[#111827]',
                    mono && 'font-mono tabular-nums',
                )}
            >
                {value}
            </span>
        </div>
    );
}

function AisDetails({ vessel }: { vessel: FleetVessel }) {
    const ais = vessel.ais_data;
    const speedCourse = ais
        ? `${Number(ais.speed).toFixed(1)} kn / ${Math.round(Number(ais.course))}°`
        : '—';
    const draught = ais && ais.draught ? `${Number(ais.draught).toFixed(1)} m` : '—';
    const received = relativeTimeId(vessel.last_position_at ?? ais?.last_seen_at ?? null);
    const source = ais ? `${ais.source ?? 'Terrestrial'} · simulasi` : 'posisi manual';

    return (
        <div className="space-y-1.5">
            <PopupRow label="Navigational status" value={navStatusFor(vessel)} mono={false} />
            <PopupRow label="Speed / Course" value={speedCourse} />
            <PopupRow label="Draught" value={draught} />
            <PopupRow label="Received" value={`${received} (AIS source: ${source})`} mono={false} />
        </div>
    );
}

/**
 * Data AIS estimasi untuk kapal armada yang tidak punya pasangan AIS.
 * Semua angka deterministik dari id kapal dan tetap berlabel simulasi.
 */
function estimatedAis(v: Record<string, any>): AISVessel {
    const seed = Math.max(1, Number(v.id) || 1);
    const status = v.voyage?.voyage_status;
    const moving = status === 'in_transit' || status === 'departed' || status === 'delayed';

    return {
        mmsi: String(v.mmsi ?? `9${String(seed).padStart(8, '0')}`),
        imo: Number(v.imo ?? 9_000_000 + seed),
        vessel_name: v.vessel_name,
        call_sign: '—',
        vessel_type: v.vessel_type,
        vessel_type_code: 0,
        latitude: Number(v.last_lat ?? 0),
        longitude: Number(v.last_lng ?? 0),
        speed: moving ? Math.round((6 + ((seed * 13) % 60) / 10) * 10) / 10 : 0,
        course: (seed * 37) % 360,
        heading: (seed * 37) % 360,
        draught: Math.round((4 + ((seed * 7) % 80) / 10) * 10) / 10,
        nav_status: moving
            ? 'Underway Using Engine'
            : v.operational_status === 'aktif'
              ? 'Moored'
              : 'At Anchor',
        source: 'Terrestrial',
        estimated: true,
        destination: v.voyage?.destination ?? 'SAMARINDA',
        eta: '—',
        last_seen_at: v.last_position_at ?? new Date().toISOString(),
    };
}

function AISVesselMarker({ vessel }: { vessel: FleetVessel }) {    const icon = divIcon({
        className: 'ais-vessel-marker',
        html: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 32 32" aria-hidden="true">
            <circle cx="16" cy="16" r="14" fill="#00205B" stroke="#fff" stroke-width="2.5"/>
            <path d="M16 8 L16 24 M8 16 L24 16" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>
        </svg>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
        popupAnchor: [0, -11],
    });

    return (
        <Marker
            position={[vessel.last_lat!, vessel.last_lng!]}
            icon={icon}
        >
            <Popup>
                <div className="min-w-[248px] space-y-2 text-xs">
                    <div>
                        <div className="flex items-center gap-2">
                            <strong className="text-sm text-[#111827]">{vessel.vessel_name}</strong>
                            <span className="rounded-full bg-[#00205B]/10 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.08em] text-[#00205B]">
                                AIS External
                            </span>
                        </div>
                        <p className="mt-0.5 text-[11px] capitalize text-[#5B6474]">
                            {String(vessel.vessel_type).replaceAll('_', ' ')}
                        </p>
                    </div>

                    <div className="border-y border-[#E3E8F0] py-2">
                        <AisDetails vessel={vessel} />
                    </div>

                    {vessel.ais_data?.destination && (
                        <div className="text-[11px] text-[#5B6474]">
                            Tujuan:{' '}
                            <span className="font-medium text-[#111827]">{vessel.ais_data.destination}</span>
                            {vessel.ais_data.eta ? ` · ETA ${vessel.ais_data.eta}` : ''}
                        </div>
                    )}

                    <div className="flex items-center justify-between font-mono text-[10px] text-[#5B6474]">
                        <span>
                            {Number(vessel.last_lat).toFixed(4)}, {Number(vessel.last_lng).toFixed(4)}
                        </span>
                        {vessel.ais_data?.mmsi && <span>MMSI {vessel.ais_data.mmsi}</span>}
                    </div>
                </div>
            </Popup>
        </Marker>
    );
}

// Coverage Indicator Overlay
function CoverageIndicator({ 
    hasCoverage, 
    lastUpdate, 
    isLoading 
}: { 
    hasCoverage: boolean; 
    lastUpdate: string | null;
    isLoading: boolean;
}) {
    return (
        <div className="absolute bottom-3 right-3 z-[1000] rounded-lg bg-white/95 px-3 py-2 shadow-md">
            <div className="flex items-center gap-2 text-xs">
                <div className={`h-2 w-2 rounded-full ${
                    isLoading ? 'bg-[#B45309] animate-pulse' :
                    hasCoverage ? 'bg-[#15803D]' : 'bg-[#BA0C2F]'
                }`}/>
                <span className="font-medium text-[#111827]">
                    {isLoading ? 'Loading AIS...' : 
                     hasCoverage ? 'AIS Coverage Active' : 'No AIS Coverage'}
                </span>
            </div>
            {lastUpdate && !isLoading && (
                <div className="mt-1 text-[10px] text-[#5B6474]">
                    Last update: {formatDateTime(lastUpdate)}
                </div>
            )}
        </div>
    );
}

// Calculate radius in nautical miles from map bounds
function calculateRadiusNm(bounds: any): number {
    if (!bounds) return 50;
    const center = bounds.getCenter();
    const northEast = bounds.getNorthEast();
    
    const latDiff = Math.abs(northEast.lat - center.lat);
    const lngDiff = Math.abs(northEast.lng - center.lng);
    
    // Approximate conversion (1 degree lat ≈ 60 nm)
    const radiusLat = latDiff * 60;
    const radiusLng = lngDiff * 60 * Math.cos(center.lat * Math.PI / 180);
    
    return Math.max(Math.round(radiusLat), Math.round(radiusLng), 10);
}

// Ikon daftar kapal mengikuti jenis & status kapal
function VesselTypeIcon({ vessel, size = 16 }: { vessel: FleetVessel; size?: number }) {
    if (vessel.source === 'ais_external') {
        return <Navigation size={size} aria-hidden="true" style={{ color: '#00205B' }} />;
    }
    const color = vessel.operational_status === 'aktif' ? '#BA0C2F' : '#5B6474';
    switch (String(vessel.vessel_type)) {
        case 'tugboat':
            return <Navigation size={size} aria-hidden="true" style={{ color }} />;
        case 'tongkang':
            return <Container size={size} aria-hidden="true" style={{ color }} />;
        case 'kapal_penumpang':
            return <Users size={size} aria-hidden="true" style={{ color }} />;
        default:
            return <ShipWheel size={size} aria-hidden="true" style={{ color }} />;
    }
}

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

// Map bounds tracker component
function MapBoundsTracker({ onBoundsChange }: { onBoundsChange: (bounds: any) => void }) {
    const map = useMap();
    useEffect(() => {
        onBoundsChange(map.getBounds());
        map.on('moveend', () => {
            onBoundsChange(map.getBounds());
        });
    }, [map, onBoundsChange]);
    return null;
}

// Pastikan Leaflet menghitung ulang ukuran saat container berubah (fullscreen/resize).
function MapResize({ trigger }: { trigger: unknown }) {
    const map = useMap();
    useEffect(() => {
        const t = setTimeout(() => map.invalidateSize(), 260);
        return () => clearTimeout(t);
    }, [map, trigger]);
    return null;
}

function FleetVesselMarker({
    vessel,
    onClick,
}: {
    vessel: FleetVessel;
    onClick: () => void;
}) {
    const color = vessel.operational_status === 'aktif' ? '#BA0C2F' : '#5B6474';
    const icon = divIcon({
        className: 'fleet-vessel-marker',
        html: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="28" viewBox="0 0 48 60" aria-hidden="true"><path d="M24 3 4 55 24 43 44 55Z" fill="${color}" stroke="#fff" stroke-width="5" stroke-linejoin="round"/></svg>`,
        iconSize: [22, 28],
        iconAnchor: [11, 14],
        popupAnchor: [0, -12],
    });

    return (
        <Marker
            position={[Number(vessel.last_lat), Number(vessel.last_lng)]}
            icon={icon}
        >
            <Popup>
                <div className="min-w-[252px] space-y-2 text-xs">
                    <div>
                        <div className="flex items-center gap-2">
                            <strong className="text-sm text-[#111827]">{vessel.vessel_name}</strong>
                            <span
                                className={classNames(
                                    'rounded-full px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.08em]',
                                    vessel.operational_status === 'aktif'
                                        ? 'bg-[#15803D]/10 text-[#15803D]'
                                        : 'bg-[#F5F7FA] text-[#5B6474]',
                                )}
                            >
                                {vessel.operational_status.replaceAll('_', ' ')}
                            </span>
                        </div>
                        <p className="mt-0.5 text-[11px] capitalize text-[#5B6474]">
                            {vessel.vessel_type === 'lainnya' && vessel.vessel_type_custom
                                ? vessel.vessel_type_custom
                                : String(vessel.vessel_type).replaceAll('_', ' ')}
                            {' · '}
                            {vessel.ais_data
                                ? vessel.ais_data.estimated
                                    ? 'AIS estimasi'
                                    : 'AIS Sync'
                                : 'Posisi manual'}                        </p>
                    </div>

                    <div className="border-y border-[#E3E8F0] py-2">
                        <AisDetails vessel={vessel} />
                    </div>

                    {vessel.ais_data?.destination && (
                        <div className="text-[11px] text-[#5B6474]">
                            Tujuan:{' '}
                            <span className="font-medium text-[#111827]">{vessel.ais_data.destination}</span>
                            {vessel.ais_data.eta ? ` · ETA ${vessel.ais_data.eta}` : ''}
                        </div>
                    )}

                    <div className="flex items-center justify-between font-mono text-[10px] text-[#5B6474]">
                        <span>
                            {Number(vessel.last_lat).toFixed(4)}, {Number(vessel.last_lng).toFixed(4)}
                        </span>
                        {vessel.ais_data?.mmsi && <span>MMSI {vessel.ais_data.mmsi}</span>}
                    </div>

                    <button
                        onClick={onClick}
                        className="mt-1 w-full rounded-md bg-[#BA0C2F] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#8E0924]"
                    >
                        Lihat Detail
                    </button>
                </div>
            </Popup>
        </Marker>
    );
}

function FormSelect({
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
            <label className="text-xs font-medium text-[#5B6474]">
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
            <label className="text-xs font-medium text-[#5B6474]">
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
                />
            ) : (
                <Input
                    name={name}
                    type={type}
                    step={step}
                    required={required}
                    value={value}
                    onChange={(event) => onChange?.(event.target.value)}
                    placeholder={placeholder}
                    status={error ? 'error' : undefined}
                />
            )}
            {error && <p className="mt-1 text-xs font-medium text-[#BA0C2F]">{error}</p>}
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
}>) {
    const tabs = [
        { key: 'posisi', label: 'Posisi', icon: MapPin },
        { key: 'checklist', label: 'Checklist', icon: ClipboardList },
        { key: 'logs', label: 'Log Berangkat/Tiba', icon: Ship },
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

    // AIS (Automatic Identification System) states
    const [aisEnabled, setAisEnabled] = useState(true);
    const [aisVessels, setAisVessels] = useState<AISVessel[]>([]);
    const [aisLoading, setAisLoading] = useState(false);
    const [aisLastUpdate, setAisLastUpdate] = useState<string | null>(null);
    const [aisRefreshInterval, setAisRefreshInterval] = useState(60);
    const [mapBounds, setMapBounds] = useState<any>(null);
    const [vesselFilter, setVesselFilter] = useState<'all' | 'fleet' | 'ais'>('all');
    const [baseLayer, setBaseLayer] = useState<'satellite' | 'street'>('satellite');
    const [showSeamarks, setShowSeamarks] = useState(false);
    const [mapFullscreen, setMapFullscreen] = useState(false);
    const [mapFocusPoint, setMapFocusPoint] = useState<[number, number] | null>(null);

    const bbmVessel = (vessels ?? []).find((v) => String(v.id) === bbmVesselId);
    const selectedVessel = (vessels ?? []).find((v) => v.id === selectedVesselId);    const positionedVessels = (vessels ?? []).filter(
        (v) => v.last_lat !== null && v.last_lat !== undefined &&
            v.last_lng !== null && v.last_lng !== undefined,
    );
    const focusedPosition: [number, number] | null =
        selectedVessel?.last_lat !== null && selectedVessel?.last_lat !== undefined &&
        selectedVessel?.last_lng !== null && selectedVessel?.last_lng !== undefined
            ? [Number(selectedVessel.last_lat), Number(selectedVessel.last_lng)]
            : null;
    
    // Data fusion: combine fleet vessels with AIS data
    const displayVessels: FleetVessel[] = useMemo(() => {
        if (!aisEnabled) {
            return (vessels ?? []).map((v: any) => ({ ...v, source: 'fleet' as const, ais_data: null } as FleetVessel));
        }
        
        // Start with fleet vessels
        const fleetVessels: FleetVessel[] = (vessels ?? []).map((v: any) => {
            const aisMatch = aisVessels.find(a => a.mmsi === v.mmsi || (a.imo && v.imo && a.imo === v.imo));
            return {
                ...v,
                source: 'fleet' as const,
                ais_data: aisMatch ?? estimatedAis(v),
            } as FleetVessel;
        });
        
        // Add external AIS vessels (not in fleet)
        const externalVessels: FleetVessel[] = aisVessels
            .filter(a => !(vessels ?? []).some((v: any) => v.mmsi === a.mmsi || (a.imo && v.imo && a.imo === v.imo)))
            .map((a: any) => ({
                id: `ais-${a.mmsi}`,
                vessel_name: a.vessel_name,
                vessel_type: 'external',
                operational_status: 'ais_tracked',
                last_lat: a.latitude,
                last_lng: a.longitude,
                last_position_at: a.last_seen_at,
                source: 'ais_external' as const,
                ais_data: a,
            } as FleetVessel));
        
        return [...fleetVessels, ...externalVessels];
    }, [vessels, aisVessels, aisEnabled]);

    const selectedDisplayVessel = useMemo(
        () => displayVessels.find((v) => String(v.id) === String(selectedVesselId)) ?? null,
        [displayVessels, selectedVesselId],
    );
    
    // Filter vessels based on selected filter
    const filteredVessels = useMemo(() => {
        if (vesselFilter === 'all') return displayVessels;
        if (vesselFilter === 'fleet') return displayVessels.filter(v => v.source === 'fleet');
        if (vesselFilter === 'ais') return displayVessels.filter(v => v.source === 'ais_external');
        return displayVessels;
    }, [displayVessels, vesselFilter]);
    
    // Auto-refresh AIS data
    useEffect(() => {
        if (!aisEnabled || !mapBounds) return;
        
        const fetchAIS = async () => {
            setAisLoading(true);
            try {
                const center = mapBounds.getCenter();
                const radius = calculateRadiusNm(mapBounds);
                
                const response = await fetch(`/api/ais/radius?lat=${center.lat}&lng=${center.lng}&radius=${radius}`);
                const data = await response.json();
                
                setAisVessels(data.ais_vessels || []);
                setAisLastUpdate(data.timestamp);
            } catch (error) {
                console.error('AIS fetch error:', error);
            } finally {
                setAisLoading(false);
            }
        };
        
        fetchAIS();
        const interval = setInterval(fetchAIS, aisRefreshInterval * 1000);
        
        return () => clearInterval(interval);
    }, [aisEnabled, mapBounds, aisRefreshInterval]);
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

            {tab === 'posisi' && (
                <div className="mt-3 space-y-4">
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        {[
                            { label: 'Kapal Terpantau', value: (displayVessels ?? []).filter((v) => v.last_lat != null && v.last_lng != null).length, sub: 'punya posisi terakhir', tone: '#111827' },
                            { label: 'Sedang Bergerak', value: (displayVessels ?? []).filter((v) => Number(v.ais_data?.speed ?? 0) > 0.5).length, sub: 'kecepatan AIS > 0,5 kn', tone: '#15803D' },
                            { label: 'Tanpa Posisi', value: (displayVessels ?? []).filter((v) => v.last_lat == null || v.last_lng == null).length, sub: 'perlu update manual', tone: '#B45309' },
                            { label: 'AIS Eksternal', value: (displayVessels ?? []).filter((v) => v.source === 'ais_external').length, sub: 'simulasi, bukan API nyata', tone: '#00205B' },
                        ].map((kpi) => (
                            <div key={kpi.label} className="rounded-2xl border border-[#E3E8F0] bg-white p-4">
                                <p className="truncate font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-[#5B6474]">
                                    {kpi.label}
                                </p>
                                <p className="mt-1.5 text-[24px] font-semibold tabular-nums leading-none tracking-tight" style={{ color: kpi.tone }}>
                                    {kpi.value}
                                </p>
                                <p className="mt-1 truncate text-[11px] text-[#5B6474]">{kpi.sub}</p>
                            </div>
                        ))}
                    </div>
                    <Card 
                        title="Peta Posisi Kapal" 
                        description="Posisi manual armada dan kapal AIS eksternal. Data AIS adalah simulasi untuk prototype."
                        className="overflow-hidden"
                        actions={
                            <div className="flex items-center gap-3">
                                <Switch
                                    checked={aisEnabled}
                                    onChange={setAisEnabled}
                                    checkedChildren="AIS ON"
                                    unCheckedChildren="AIS OFF"
                                />
                                {aisEnabled && (
                                    <>
                                        <AntSelect
                                            value={aisRefreshInterval}
                                            onChange={setAisRefreshInterval}
                                            size="small"
                                            style={{ width: 100 }}
                                            options={[
                                                { value: 30, label: '30s refresh' },
                                                { value: 60, label: '1m refresh' },
                                                { value: 120, label: '2m refresh' },
                                            ]}
                                        />
                                        <Badge 
                                            tone={aisLoading ? 'warning' : 'success'} 
                                            className="text-[9px]"
                                        >
                                            {aisLoading ? 'Loading...' : `${aisVessels.length} AIS vessels`}
                                        </Badge>
                                    </>
                                )}
                            </div>
                        }
                        noPadding
                    >
                        {displayVessels.length === 0 ? (
                            <div className="p-5">
                                <EmptyState icon={MapPin} title="Belum ada posisi kapal" />
                            </div>
                        ) : (
                            <div
                                className={
                                    mapFullscreen
                                        ? 'fixed inset-0 z-[2000] overflow-hidden bg-white'
                                        : 'relative h-[calc(100dvh-22rem)] min-h-[460px] overflow-hidden'
                                }
                                style={{ isolation: 'isolate' }}
                            >
                                <button
                                    type="button"
                                    onClick={() => setMapFullscreen((v) => !v)}
                                    className="absolute left-3 top-3 z-[1000] inline-flex items-center gap-1.5 rounded-lg border border-[#E3E8F0] bg-white/95 px-2.5 py-1.5 text-[11px] font-semibold text-[#111827] shadow-md hover:bg-white"
                                >
                                    {mapFullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                                    {mapFullscreen ? 'Keluar layar penuh' : 'Layar penuh'}
                                </button>
                                <MapContainer
                                    center={[-0.515, 117.155]}
                                    zoom={11}
                                    style={{ height: '100%', width: '100%' }}
                                    zoomControl={false}
                                >
                                    <MapFocus position={mapFocusPoint ?? focusedPosition} />
                                    <MapBoundsTracker onBoundsChange={setMapBounds} />
                                    <MapResize trigger={mapFullscreen} />
                                    {baseLayer === 'satellite' ? (
                                        <TileLayer
                                            key="satellite"
                                            attribution='&copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community'
                                            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                                            maxZoom={19}
                                            eventHandlers={{
                                                load: () => setMapHasLoaded(true),
                                                tileerror: () => setMapHasError(true),
                                            }}
                                        />
                                    ) : (
                                        <TileLayer
                                            key="street"
                                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                            eventHandlers={{
                                                load: () => setMapHasLoaded(true),
                                                tileerror: () => setMapHasError(true),
                                            }}
                                        />
                                    )}
                                    {showSeamarks && (
                                        <TileLayer
                                            key="seamarks"
                                            attribution='&copy; <a href="https://www.openseamap.org/">OpenSeaMap</a>'
                                            url="https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png"
                                            opacity={0.9}
                                        />
                                    )}
                                    
                                    {/* Fleet Vessels (Manual Position) */}
                                    {displayVessels
                                        .filter(v => v.source === 'fleet' && v.last_lat && v.last_lng)
                                        .map(vessel => (
                                            <FleetVesselMarker
                                                key={vessel.id}
                                                vessel={vessel}
                                                onClick={() => selectVessel(vessel)}
                                            />
                                        ))}
                                    
                                    {/* AIS External Vessels */}
                                    {aisEnabled && displayVessels
                                        .filter(v => v.source === 'ais_external')
                                        .map(vessel => (
                                            <AISVesselMarker
                                                key={vessel.id}
                                                vessel={vessel}
                                            />
                                        ))}
                                </MapContainer>

                                {/* Layer switcher: satelit (default) / peta, plus overlay tanda laut */}
                                <div className="absolute right-3 top-3 z-[1000] flex flex-col items-end gap-2">
                                    <div className="flex overflow-hidden rounded-lg border border-[#E3E8F0] bg-white/95 shadow-md">
                                        {[
                                            { key: 'satellite' as const, label: 'Satelit', icon: Layers },
                                            { key: 'street' as const, label: 'Peta', icon: MapPin },
                                        ].map((opt) => {
                                            const OptIcon = opt.icon;
                                            const active = baseLayer === opt.key;
                                            return (
                                                <button
                                                    key={opt.key}
                                                    type="button"
                                                    onClick={() => setBaseLayer(opt.key)}
                                                    aria-pressed={active}
                                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
                                                        active
                                                            ? 'bg-[#BA0C2F] text-white'
                                                            : 'text-[#5B6474] hover:bg-[#F5F7FA] hover:text-[#111827]'
                                                    }`}
                                                >
                                                    <OptIcon size={12} aria-hidden="true" />
                                                    {opt.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowSeamarks((v) => !v)}
                                        aria-pressed={showSeamarks}
                                        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold shadow-md transition-colors ${
                                            showSeamarks
                                                ? 'border-[#00205B] bg-[#00205B] text-white'
                                                : 'border-[#E3E8F0] bg-white/95 text-[#5B6474] hover:bg-[#F5F7FA] hover:text-[#111827]'
                                        }`}
                                    >
                                        <Navigation size={12} aria-hidden="true" />
                                        Tanda laut
                                    </button>
                                </div>
                                
                                {/* Coverage Indicator */}
                                {aisEnabled && (
                                    <CoverageIndicator
                                        hasCoverage={aisVessels.length > 0}
                                        lastUpdate={aisLastUpdate}
                                        isLoading={aisLoading}
                                    />
                                )}
                                
                                {!mapHasLoaded && !mapHasError && (
                                    <p className="absolute bottom-3 left-3 rounded bg-white/95 px-3 py-2 text-xs text-[#5B6474] shadow">
                                        Memuat peta...
                                    </p>
                                )}
                                {mapHasError && (
                                    <p role="alert" className="absolute bottom-3 left-3 rounded bg-white/95 px-3 py-2 text-xs text-[#BA0C2F] shadow">
                                        Peta tidak dapat dimuat. Data posisi tetap tersedia pada daftar kapal.
                                    </p>
                                )}
                            </div>
                        )}
                    </Card>
                    
                    <Card title="Kapal & Status Perjalanan">
                        {/* Filter Tabs */}
                        <div className="-mt-1 mb-0 flex gap-2 border-b border-[#E3E8F0]">
                            {[
                                { key: 'all', label: 'Semua', count: displayVessels.length },
                                { key: 'fleet', label: 'Armada', count: displayVessels.filter(v => v.source === 'fleet').length },
                                { key: 'ais', label: 'AIS External', count: displayVessels.filter(v => v.source === 'ais_external').length },
                            ].map(tab => (
                                <button
                                    key={tab.key}
                                    onClick={() => setVesselFilter(tab.key as any)}
                                    className={`px-4 py-2 text-sm font-medium transition ${
                                        vesselFilter === tab.key
                                            ? 'text-[#BA0C2F] border-b-2 border-[#BA0C2F]'
                                            : 'text-[#5B6474] hover:text-[#111827]'
                                    }`}
                                >
                                    {tab.label} ({tab.count})
                                </button>
                            ))}
                        </div>
                        
                        {/* Vessel List */}
                        {(displayVessels ?? []).length === 0 ? (
                            <EmptyState icon={Ship} title="Belum ada kapal terdaftar" />
                        ) : (
                            <div className="divide-y divide-[#E3E8F0]">
                                {filteredVessels.map((v) => {
                                    const hasPos =
                                        v.last_lat !== null && v.last_lat !== undefined &&
                                        v.last_lng !== null && v.last_lng !== undefined;
                                    return (
                                        <div
                                            key={v.id}
                                            className="flex w-full flex-wrap items-center gap-3 py-3 transition-colors hover:bg-[#F5F7FA]/60"
                                        >
                                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#E3E8F0] bg-[#F5F7FA]">
                                                <VesselTypeIcon vessel={v} size={17} />
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="block truncate text-sm font-semibold text-[#111827]">
                                                        {v.vessel_name}
                                                    </span>
                                                    {v.source === 'ais_external' && (
                                                        <Badge tone="info" className="text-[9px]">AIS External</Badge>
                                                    )}
                                                    {v.ais_data && v.source === 'fleet' && (
                                                        <Badge tone={v.ais_data.estimated ? 'neutral' : 'success'} className="text-[9px]">
                                                            {v.ais_data.estimated ? 'AIS Estimasi' : 'AIS Sync'}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="truncate text-xs text-[#5B6474]">
                                                    {v.source === 'ais_external'
                                                        ? String(v.vessel_type).replaceAll('_', ' ')
                                                        : (v.vessel_type === 'lainnya' && v.vessel_type_custom
                                                            ? v.vessel_type_custom
                                                            : String(v.vessel_type).replaceAll('_', ' '))}
                                                    {v.ais_data ? (
                                                        <>
                                                            {' · '}{v.ais_data.speed} kn · {v.ais_data.course}°
                                                            {v.ais_data.destination && ` · ${v.ais_data.destination}`}
                                                        </>
                                                    ) : v.voyage ? (
                                                        ` · ${v.voyage.voyage_code} · ${v.voyage.origin} → ${v.voyage.destination}`
                                                    ) : (
                                                        ' · Tidak ada perjalanan aktif'
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-1.5">
                                                {v.source === 'fleet' && (
                                                    <Badge tone={v.operational_status === 'aktif' ? 'success' : v.operational_status === 'dalam_perbaikan' ? 'warning' : 'neutral'} className="text-[9px]">
                                                        {v.operational_status.replaceAll('_', ' ')}
                                                    </Badge>
                                                )}
                                                <span className="text-[11px] tabular-nums text-[#5B6474]">
                                                    {hasPos
                                                        ? `${Number(v.last_lat).toFixed(4)}, ${Number(v.last_lng).toFixed(4)}`
                                                        : 'Posisi belum tercatat'}
                                                </span>
                                            </div>
                                            <div className="flex w-full shrink-0 gap-2 pt-1 sm:w-auto sm:pt-0">
                                                <Button
                                                    size="small"
                                                    disabled={!hasPos}
                                                    onClick={() => {
                                                        if (!hasPos) return;
                                                        setMapFocusPoint([Number(v.last_lat), Number(v.last_lng)]);
                                                        document.getElementById('bt-main')?.scrollTo({ top: 0, behavior: 'smooth' });
                                                    }}
                                                >
                                                    Lihat di peta
                                                </Button>
                                                {v.source === 'fleet' && (
                                                    <Button size="small" type="primary" onClick={() => selectVessel(v)}>
                                                        Detail Kapal
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
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
                                <div className="mb-5 flex items-start justify-between gap-4 border-b border-[#E3E8F0] pb-4">
                                    <div>
                                        <h2 className="text-xl font-semibold text-[#111827]">{selectedVessel.vessel_name}</h2>
                                        <p className="text-sm text-[#5B6474]">
                                            {selectedVessel.vessel_type === 'lainnya' && selectedVessel.vessel_type_custom
                                                ? selectedVessel.vessel_type_custom
                                                : String(selectedVessel.vessel_type).replaceAll('_', ' ')}
                                            {' · '}
                                            {selectedVessel.operational_status}
                                        </p>
                                    </div>
                                    <SecondaryButton onClick={() => {
                                        setSelectedVesselId(null);
                                        setEntryModal(null);
                                    }}>Tutup</SecondaryButton>
                                </div>
                                <Row gutter={12}>
                                    <Col xs={12} sm={12}>
                                        <div>
                                            <Text type="secondary" className="text-xs">Posisi terakhir</Text>
                                            <p className="font-medium text-[#111827]">
                                                {selectedVessel.last_lat ?? '—'}, {selectedVessel.last_lng ?? '—'}
                                            </p>
                                        </div>
                                    </Col>
                                    <Col xs={12} sm={12}>
                                        <div>
                                            <Text type="secondary" className="text-xs">Waktu update</Text>
                                            <p className="font-medium text-[#111827]">{formatDateTime(selectedVessel.last_position_at)}</p>
                                        </div>
                                    </Col>
                                    <Col xs={12} sm={12}>
                                        <div>
                                            <Text type="secondary" className="text-xs">Kondisi terakhir</Text>
                                            <p className="font-medium text-[#111827]">
                                                {selectedVessel.condition
                                                    ? `Skor ${selectedVessel.condition.score}/100 · ${formatDate(selectedVessel.condition.checked_at)}`
                                                    : 'Belum ada pemeriksaan'}
                                            </p>
                                        </div>
                                    </Col>
                                    <Col xs={12} sm={12}>
                                        <div>
                                            <Text type="secondary" className="text-xs">BBM terakhir</Text>
                                            <p className="font-medium text-[#111827]">
                                                {selectedVessel.fuel
                                                    ? `${formatNumber(selectedVessel.fuel.liters, 2)} L · ${FUEL_TEXT[selectedVessel.fuel.analysis_status] ?? selectedVessel.fuel.analysis_status} · ${formatDate(selectedVessel.fuel.trip_date)}`
                                                    : 'Belum ada catatan BBM'}
                                            </p>
                                        </div>
                                    </Col>
                                    <Col xs={12} sm={12}>
                                        <div>
                                            <Text type="secondary" className="text-xs">Status navigasi</Text>
                                            <p className="font-medium text-[#111827]">
                                                {selectedDisplayVessel ? navStatusFor(selectedDisplayVessel) : '—'}
                                            </p>
                                        </div>
                                    </Col>
                                    <Col xs={12} sm={12}>
                                        <div>
                                            <Text type="secondary" className="text-xs">Kecepatan / haluan</Text>
                                            <p className="font-medium tabular-nums text-[#111827]">
                                                {selectedDisplayVessel?.ais_data
                                                    ? `${Number(selectedDisplayVessel.ais_data.speed).toFixed(1)} kn / ${Math.round(Number(selectedDisplayVessel.ais_data.course))}°`
                                                    : '—'}
                                            </p>
                                        </div>
                                    </Col>
                                    <Col xs={12} sm={12}>
                                        <div>
                                            <Text type="secondary" className="text-xs">Draught</Text>
                                            <p className="font-medium tabular-nums text-[#111827]">
                                                {selectedDisplayVessel?.ais_data?.draught
                                                    ? `${Number(selectedDisplayVessel.ais_data.draught).toFixed(1)} m`
                                                    : '—'}
                                            </p>
                                        </div>
                                    </Col>
                                    <Col xs={12} sm={12}>
                                        <div>
                                            <Text type="secondary" className="text-xs">Sumber posisi</Text>
                                            <p className="font-medium text-[#111827]">
                                                {selectedDisplayVessel?.ais_data
                                                    ? `${selectedDisplayVessel.ais_data.source ?? 'Terrestrial'} · ${relativeTimeId(selectedVessel.last_position_at)}`
                                                    : `Manual · ${relativeTimeId(selectedVessel.last_position_at)}`}
                                            </p>
                                        </div>
                                    </Col>
                                    <Col xs={24}>
                                        <div>
                                            <Text type="secondary" className="text-xs">Status perjalanan</Text>
                                            <p className="font-medium text-[#111827]">
                                                {selectedVessel.voyage
                                                    ? `${selectedVessel.voyage.voyage_code} · ${VOYAGE_STATUS_LABELS[selectedVessel.voyage.voyage_status] ?? selectedVessel.voyage.voyage_status} · ${selectedVessel.voyage.origin} → ${selectedVessel.voyage.destination}`
                                                    : 'Tidak ada perjalanan aktif'}
                                            </p>
                                        </div>
                                    </Col>
                                </Row>
                                <section className="mt-6 border-t border-[#E3E8F0] pt-5">
                                    <div className="mb-4">
                                        <h3 className="text-base font-semibold text-[#111827]">Riwayat & operasional kapal</h3>
                                        <p className="text-xs text-[#5B6474]">Kondisi, servis, dan BBM khusus {selectedVessel.vessel_name}.</p>
                                    </div>
                                    {historyLoading ? (
                                        <div className="space-y-3">
                                            <Skeleton active paragraph={{ rows: 3 }} />
                                        </div>
                                    ) : historyError ? (
                                        <div role="alert" className="rounded-lg border border-[#BA0C2F]/30 p-4 text-sm text-[#BA0C2F]" style={{ background: '#BA0C2F0D' }}>
                                            {historyError}
                                            <button type="button" className="ml-2 font-semibold underline" onClick={() => setHistoryRefresh((current) => current + 1)}>
                                                Coba lagi
                                            </button>
                                        </div>
                                    ) : (
                                        <Row gutter={16}>
                                            <Col xs={24} xl={8}>
                                                <section className="rounded-lg border border-[#E3E8F0] p-4">
                                                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                                        <h4 className="flex items-center gap-2 text-sm font-semibold text-[#111827]"><Activity size={16} /> Kondisi</h4>
                                                        {canManage && (
                                                            <SecondaryButton onClick={() => setEntryModal('condition')} icon={<Activity size={15} />}>
                                                                Input Kondisi
                                                            </SecondaryButton>
                                                        )}
                                                    </div>
                                                    {vesselHistory.conditions.length === 0 ? (
                                                        <p className="text-sm text-[#5B6474]">Belum ada pemeriksaan kondisi.</p>
                                                    ) : (
                                                        <div className="max-h-80 space-y-2 overflow-y-auto">
                                                            {vesselHistory.conditions.map((condition) => (
                                                                <div key={condition.id} className="rounded-md p-3 text-sm" style={{ background: '#F5F7FA' }}>
                                                                    <div className="flex justify-between gap-2">
                                                                        <strong>Skor {condition.score}/100</strong>
                                                                        <span className="text-xs text-[#5B6474]">{formatDateTime(condition.checked_at)}</span>
                                                                    </div>
                                                                    {condition.notes && <p className="mt-1 text-xs text-[#5B6474]">{condition.notes}</p>}
                                                                    <p className="mt-1 text-xs text-[#5B6474]">Pemeriksa: {condition.checked_by_name ?? '—'}</p>
                                                                    {canManage && <div className="mt-2 flex gap-3 text-xs font-medium">
                                                                        <button type="button" className="text-[#BA0C2F] hover:underline" onClick={() => setEditCondition({ ...condition, checked_at: String(condition.checked_at).slice(0, 10) })}>Edit</button>
                                                                        <button type="button" className="text-[#BA0C2F] hover:underline" onClick={() => setConfirmDel({ url: `/operasional/kondisi/${condition.id}`, label: `pemeriksaan kondisi ${selectedVessel.vessel_name}` })}>Hapus</button>
                                                                    </div>}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </section>
                                            </Col>
                                            <Col xs={24} xl={8}>
                                                <section className="rounded-lg border border-[#E3E8F0] p-4">
                                                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                                        <h4 className="flex items-center gap-2 text-sm font-semibold text-[#111827]"><Wrench size={16} /> Servis</h4>
                                                        {canManage && (
                                                            <SecondaryButton onClick={() => {
                                                                setServiceItems([]);
                                                                setServiceCost('');
                                                                setEntryModal('service');
                                                            }} icon={<Wrench size={15} />}>
                                                                Catat Servis
                                                            </SecondaryButton>
                                                        )}
                                                    </div>
                                                    {vesselHistory.services.length === 0 ? (
                                                        <p className="text-sm text-[#5B6474]">Belum ada riwayat servis.</p>
                                                    ) : (
                                                        <div className="max-h-80 space-y-2 overflow-y-auto">
                                                            {vesselHistory.services.map((service) => (
                                                                <div key={service.id} className="rounded-md p-3 text-sm" style={{ background: '#F5F7FA' }}>
                                                                    <div className="flex justify-between gap-2">
                                                                        <strong>{service.title}</strong>
                                                                        <Badge tone={service.status === 'selesai' ? 'success' : service.status === 'proses' ? 'warning' : 'neutral'}>{service.status}</Badge>
                                                                    </div>
                                                                    <p className="mt-1 text-xs text-[#5B6474]">{formatDate(service.start_date)} – {formatDate(service.end_date)} · {formatRupiah(service.cost)}</p>
                                                                    {service.workshop && <p className="text-xs text-[#5B6474]">{service.workshop}</p>}
                                                                    {canManage && <div className="mt-2 flex gap-3 text-xs font-medium">
                                                                        <button type="button" className="text-[#BA0C2F] hover:underline" onClick={() => setEditService({ ...service, start_date: String(service.start_date).slice(0, 10), end_date: service.end_date ? String(service.end_date).slice(0, 10) : '' })}>Edit</button>
                                                                        <button type="button" className="text-[#BA0C2F] hover:underline" onClick={() => setConfirmDel({ url: `/operasional/servis/${service.id}`, label: `servis "${service.title}"` })}>Hapus</button>
                                                                    </div>}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </section>
                                            </Col>
                                            <Col xs={24} xl={8}>
                                                <section className="rounded-lg border border-[#E3E8F0] p-4">
                                                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                                        <h4 className="flex items-center gap-2 text-sm font-semibold text-[#111827]"><Fuel size={16} /> Monitoring BBM</h4>
                                                        {canManage && (
                                                            <SecondaryButton onClick={() => {
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
                                                            }} icon={<Fuel size={15} />}>
                                                                Catat BBM
                                                            </SecondaryButton>
                                                        )}
                                                    </div>
                                                    {vesselHistory.logs.length === 0 ? (
                                                        <p className="text-sm text-[#5B6474]">Belum ada catatan BBM.</p>
                                                    ) : (
                                                        <div className="max-h-80 space-y-2 overflow-y-auto">
                                                            {vesselHistory.logs.map((fuel) => (
                                                                <div key={fuel.id} className="rounded-md p-3 text-sm" style={{ background: '#F5F7FA' }}>
                                                                    <div className="flex justify-between gap-2">
                                                                        <strong>{fuel.route}</strong>
                                                                        <Badge tone={FUEL_TONES[fuel.analysis_status] ?? 'neutral'}>{FUEL_TEXT[fuel.analysis_status] ?? fuel.analysis_status}</Badge>
                                                                    </div>
                                                                    <p className="mt-1 text-xs text-[#5B6474]">{formatDate(fuel.trip_date)} · {formatNumber(fuel.liters, 2)} L · {formatNumber(fuel.lph, 1)} L/jam · {formatRupiah(fuel.cost)}</p>
                                                                    {fuel.explanation_note && <p className="mt-1 text-xs text-[#5B6474]">{fuel.explanation_note}</p>}
                                                                    {canManage && <div className="mt-2 flex gap-3 text-xs font-medium">
                                                                        <button type="button" className="text-[#BA0C2F] hover:underline" onClick={() => setEditFuel({ ...fuel, trip_date: String(fuel.trip_date).slice(0, 10), explanation: fuel.explanation_note ?? '', price_per_liter: Number(fuel.liters) > 0 ? (Number(fuel.cost) / Number(fuel.liters)).toString() : '' })}>Edit</button>
                                                                        <button type="button" className="text-[#BA0C2F] hover:underline" onClick={() => setConfirmDel({ url: `/operasional/bbm/${fuel.id}`, label: `log BBM ${selectedVessel.vessel_name} (${fuel.route})` })}>Hapus</button>
                                                                    </div>}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </section>
                                            </Col>
                                        </Row>
                                    )}
                                </section>
                                {canManage && (
                                    <form onSubmit={submitPosition} className="mt-6 border-t border-[#E3E8F0] pt-5">
                                        <h3 className="mb-3 text-sm font-semibold text-[#111827]">Update posisi manual</h3>
                                        <Row gutter={12}>
                                            {(['lat', 'lng'] as const).map((field) => (
                                                <Col key={field} xs={12}>
                                                    <label className="text-xs font-medium text-[#5B6474]">
                                                        {field === 'lat' ? 'Latitude' : 'Longitude'}
                                                    </label>
                                                    <InputNumber
                                                        type="number"
                                                        step={field === 'lat' ? 0.000001 : 0.000001}
                                                        min={field === 'lat' ? -90 : -180}
                                                        max={field === 'lat' ? 90 : 180}
                                                        required
                                                        value={positionForm[field] ? Number(positionForm[field]) : undefined}
                                                        onChange={(value) => setPositionForm((current) => ({
                                                            ...current,
                                                            [field]: value !== null ? String(value) : '',
                                                        }))}
                                                        style={{ width: '100%' }}
                                                        status={positionErrors[field] ? 'error' : undefined}
                                                    />
                                                    {positionErrors[field] && (
                                                        <p className="mt-1 text-xs text-[#BA0C2F]">{positionErrors[field]}</p>
                                                    )}
                                                </Col>
                                            ))}
                                        </Row>
                                        <p className="mt-2 text-xs text-[#5B6474]">
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
                                                <h3 className="text-lg font-semibold text-[#111827]">
                                                    {entryModal === 'condition' ? 'Pemeriksaan Kondisi' : entryModal === 'service' ? 'Catat Servis' : 'Catat Trip BBM'}
                                                </h3>
                                                <p className="text-sm text-[#5B6474]">{selectedVessel.vessel_name}</p>
                                            </div>
                                            <SecondaryButton onClick={() => setEntryModal(null)}>Tutup</SecondaryButton>
                                        </div>
                                        {entryModal === 'condition' && (
                                            <form onSubmit={submitCondition}>
                                                <input type="hidden" name="vessel_id" value={selectedVessel.id} />
                                                <Row gutter={12}>
                                                    <Col xs={12}><TextInputField label="Tanggal Pemeriksaan" name="checked_at" type="date" required /></Col>
                                                    {['mesin', 'navigasi', 'keselamatan', 'dek', 'kamar'].map((field) => (
                                                        <Col xs={12} key={field}>
                                                            <FormSelect
                                                                label={field.charAt(0).toUpperCase() + field.slice(1)}
                                                                name={field}
                                                                required
                                                                options={[
                                                                    { value: 'baik', label: 'Baik' },
                                                                    { value: 'cukup', label: 'Cukup' },
                                                                    { value: 'perlu_perbaikan', label: 'Perlu Perbaikan' },
                                                                ]}
                                                            />
                                                        </Col>
                                                    ))}
                                                    <Col xs={12}><TextInputField label="Skor (0–100)" name="score" type="number" required /></Col>
                                                    <Col xs={24}>
                                                        <label className="text-xs font-medium text-[#5B6474]">Catatan</label>
                                                        <Input.TextArea name="notes" rows={3} />
                                                    </Col>
                                                    <Col xs={24} className="mt-3 flex justify-end">
                                                        <PrimaryButton htmlType="submit">Simpan Pemeriksaan</PrimaryButton>
                                                    </Col>
                                                </Row>
                                            </form>
                                        )}
                                        {entryModal === 'service' && (
                                            <form onSubmit={submitService}>
                                                <input type="hidden" name="vessel_id" value={selectedVessel.id} />
                                                <Row gutter={12}>
                                                    <Col xs={12}>
                                                        <FormSelect label="Jenis" name="type" required options={[
                                                            { value: 'rutin', label: 'Rutin' },
                                                            { value: 'urgent', label: 'Urgent' },
                                                            { value: 'drydock', label: 'Drydock' },
                                                            { value: 'pemeriksaan', label: 'Pemeriksaan' },
                                                        ]} />
                                                    </Col>
                                                    <Col xs={12}>
                                                        <FormSelect label="Status" name="status" required options={[
                                                            { value: 'rencana', label: 'Rencana' },
                                                            { value: 'proses', label: 'Proses' },
                                                            { value: 'selesai', label: 'Selesai (stok dipotong)' },
                                                        ]} />
                                                    </Col>
                                                    <Col xs={12}><TextInputField label="Judul Pekerjaan" name="title" required /></Col>
                                                    <Col xs={12}><TextInputField label="Bengkel" name="workshop" /></Col>
                                                    <Col xs={12}><TextInputField label="Mulai" name="start_date" type="date" required /></Col>
                                                    <Col xs={12}><TextInputField label="Selesai" name="end_date" type="date" /></Col>
                                                    <Col xs={12}>
                                                        <label className="text-xs font-medium text-[#5B6474]">Biaya (Rp)</label>
                                                        <NumericInput decimalPlaces={2} value={serviceCost} onChange={(event) => setServiceCost(event.target.value)} />
                                                    </Col>
                                                    <Col xs={24}>
                                                        <label className="text-xs font-medium text-[#5B6474]">Sparepart dipakai</label>
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
                                                                <NumericInput decimalPlaces={2} min={0} placeholder="Qty" value={row.qty} onChange={(event) => setServiceItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, qty: event.target.value } : item))} className="w-24" />
                                                            </div>
                                                        ))}
                                                        <button type="button" onClick={() => setServiceItems((current) => [...current, { item_id: '', qty: '' }])} className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[#BA0C2F] hover:underline">
                                                            <Plus size={13} /> Tambah item
                                                        </button>
                                                    </Col>
                                                    <Col xs={24} className="mt-3 flex justify-end">
                                                        <PrimaryButton htmlType="submit">Simpan Servis</PrimaryButton>
                                                    </Col>
                                                </Row>
                                            </form>
                                        )}
                                        {entryModal === 'fuel' && (
                                            <form onSubmit={submitFuel}>
                                                <input type="hidden" name="vessel_id" value={selectedVessel.id} />
                                                <input type="hidden" name="cost" value={totalFuelCost.toFixed(2)} />
                                                <Row gutter={12}>
                                                    <Col xs={12}>
                                                        <label className="text-xs font-medium text-[#5B6474]">Perjalanan / Voyage (Opsional)</label>
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
                                                    </Col>
                                                    <Col xs={12}><TextInputField label="Tanggal" name="trip_date" type="date" value={tripDate} onChange={(value) => updateFuelField('trip_date', value, setTripDate)} error={fuelErrors.trip_date} /></Col>
                                                    <Col xs={12}><TextInputField label="Rute" name="route" value={tripRoute} onChange={(value) => updateFuelField('route', value, setTripRoute)} error={fuelErrors.route} placeholder="mis. Samarinda -> Bontang" /></Col>
                                                    <Col xs={12}><TextInputField label="Durasi (jam)" name="duration_hours" type="number" step="0.01" value={duration} onChange={(value) => updateFuelField('duration_hours', value, setDuration)} error={fuelErrors.duration_hours} /></Col>
                                                    <Col xs={12}><TextInputField label="Jarak (mil)" name="distance_nm" type="number" step="0.01" /></Col>
                                                    <Col xs={12}>
                                                        <label className="text-xs font-medium text-[#5B6474]">Liter *</label>
                                                        <NumericInput name="liters" decimalPlaces={2} value={liters} onChange={(event) => updateFuelField('liters', event.target.value, setLiters)} />
                                                        {fuelErrors.liters && <p className="mt-1 text-xs font-medium text-[#BA0C2F]">{fuelErrors.liters}</p>}
                                                    </Col>
                                                    <Col xs={12}>
                                                        <label className="text-xs font-medium text-[#5B6474]">Harga per Liter (Rp) *</label>
                                                        <NumericInput name="price_per_liter" decimalPlaces={2} value={pricePerLiter} onChange={(event) => updateFuelField('price_per_liter', event.target.value, setPricePerLiter)} />
                                                        {fuelErrors.price_per_liter && <p className="mt-1 text-xs font-medium text-[#BA0C2F]">{fuelErrors.price_per_liter}</p>}
                                                    </Col>
                                                    <Col xs={24}>
                                                        <div className="rounded-md px-3 py-2 text-sm text-[#111827]" style={{ background: '#F5F7FA' }}>Total biaya BBM: <strong>{formatRupiah(totalFuelCost)}</strong></div>
                                                    </Col>
                                                    <Col xs={12}><TextInputField label="Kecepatan (knot)" name="speed_knots" type="number" step="0.1" /></Col>
                                                    <Col xs={12}><TextInputField label="Keterlambatan (jam)" name="delay_hours" type="number" step="0.1" /></Col>
                                                    <Col xs={12}><TextInputField label="Kondisi Cuaca" name="weather_condition" placeholder="mis. cerah, gelombang tenang, hujan..." /></Col>
                                                    {liveAnalysis && (
                                                        <Col xs={24}>
                                                            <div className="rounded-md border border-[#E3E8F0] p-3">
                                                                <p className="text-sm font-semibold text-[#111827]">Preview: <Badge tone={FUEL_TONES[liveAnalysis.status] ?? 'neutral'}>{FUEL_TEXT[liveAnalysis.status] ?? liveAnalysis.status}</Badge> ({liveAnalysis.diff > 0 ? '+' : ''}{formatNumber(liveAnalysis.diff, 1)}%)</p>
                                                                <p className="text-xs text-[#5B6474]">{formatNumber(liveAnalysis.lph, 1)} L/jam{liveAnalysis.baseline ? ` vs baseline ${formatNumber(liveAnalysis.baseline, 0)} L/jam` : ' · baseline belum ditetapkan'}</p>
                                                            </div>
                                                        </Col>
                                                    )}
                                                    <Col xs={24}>
                                                        <label className="text-xs font-medium text-[#5B6474]">Catatan penjelasan (wajib bila Tidak Normal)</label>
                                                        <Input.TextArea name="explanation" rows={2} value={explanation} onChange={(event) => updateFuelField('explanation', event.target.value, setExplanation)} status={fuelErrors.explanation ? 'error' : undefined} />
                                                        {fuelErrors.explanation && <p className="mt-1 text-xs font-medium text-[#BA0C2F]">{fuelErrors.explanation}</p>}
                                                    </Col>
                                                    <Col xs={24} className="mt-3 flex justify-end">
                                                        <PrimaryButton htmlType="submit" disabled={Object.values(fuelErrors).some(Boolean)}>Simpan Trip</PrimaryButton>
                                                    </Col>
                                                </Row>
                                            </form>
                                        )}
                                    </div>
                                </Modal>
                            </div>
                        )}
                    </Modal>
                </div>
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
                                    className="flex flex-wrap items-center gap-4 rounded-xl border border-[#E3E8F0] bg-white p-4 shadow-sm"
                                >
                                    <div className="min-w-0 flex-1">
                                        <p className="font-semibold text-[#111827]">
                                            {v.voyage_code} · {v.vessel_name}
                                        </p>
                                        <p className="text-xs text-[#5B6474]">
                                            Jadwal {formatDateTime(v.planned_departure)} ·{' '}
                                            {v.kondisional} item kondisional
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Progress
                                            percent={Math.round(pct)}
                                            size="small"
                                            strokeColor={pct >= 100 ? '#15803D' : pct >= 60 ? '#B45309' : '#BA0C2F'}
                                            style={{ width: 112 }}
                                            format={() => null}
                                        />
                                        <span className="text-sm font-semibold tabular-nums text-[#111827]">
                                            {v.wajib_terpenuhi}/{v.wajib_total}
                                        </span>
                                    </div>
                                    <a
                                        href={`/perjalanan/${v.id}`}
                                        className="text-sm font-medium text-[#BA0C2F] hover:underline"
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
                        <Timeline
                            items={(voyageEvents ?? []).map((e) => ({
                                color: '#BA0C2F',
                                children: (
                                    <div key={e.id}>
                                        <p className="text-sm font-semibold text-[#111827]">
                                            {e.voyage_code} · {e.vessel_name}
                                        </p>
                                        <p className="text-sm text-[#5B6474]">{e.description}</p>
                                        <p className="text-xs text-[#5B6474]">
                                            {formatDateTime(e.occurred_at)} · {e.user_name ?? 'Sistem'}
                                        </p>
                                    </div>
                                ),
                            }))}
                        />
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
                        <h2 className="text-lg font-semibold text-[#111827]">Edit Pemeriksaan Kondisi</h2>
                        <Row gutter={12}>
                            <Col xs={12}>
                                <label className="text-xs font-medium text-[#5B6474]">Tanggal</label>
                                <Input
                                    type="date"
                                    value={editCondition.checked_at}
                                    onChange={(e) => setEditCondition({ ...editCondition, checked_at: e.target.value })}
                                />
                            </Col>
                            {['mesin', 'navigasi', 'keselamatan', 'dek', 'kamar'].map((k) => (
                                <Col xs={12} key={k}>
                                    <label className="text-xs font-medium capitalize text-[#5B6474]">{k}</label>
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
                                </Col>
                            ))}
                            <Col xs={12}>
                                <label className="text-xs font-medium text-[#5B6474]">Skor (0–100)</label>
                                <NumericInput
                                    decimalPlaces={0}
                                    value={editCondition.score}
                                    onChange={(e) => setEditCondition({ ...editCondition, score: Number(e.target.value) })}
                                />
                            </Col>
                            <Col xs={24}>
                                <label className="text-xs font-medium text-[#5B6474]">Catatan</label>
                                <Input.TextArea
                                    value={editCondition.notes ?? ''}
                                    onChange={(e) => setEditCondition({ ...editCondition, notes: e.target.value })}
                                    rows={2}
                                />
                            </Col>
                        </Row>
                        <div className="mt-4 flex justify-end gap-3">
                            <SecondaryButton onClick={() => setEditCondition(null)}>Batal</SecondaryButton>
                            <PrimaryButton htmlType="submit">Simpan</PrimaryButton>
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
                        <h2 className="text-lg font-semibold text-[#111827]">Edit Catatan Servis</h2>
                        <p className="text-xs text-[#5B6474]">
                            Bila status diubah ke/atau tetap "selesai", stok sparepart dipotong ulang secara otomatis (pemotongan lama dipulihkan).
                        </p>
                        <Row gutter={12}>
                            <Col xs={12} md={8}>
                                <label className="text-xs font-medium text-[#5B6474]">Jenis</label>
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
                            </Col>
                            <Col xs={12} md={8}>
                                <label className="text-xs font-medium text-[#5B6474]">Status</label>
                                <SearchableSelect
                                    value={editService.status}
                                    options={[
                                        { value: 'rencana', label: 'Rencana' },
                                        { value: 'proses', label: 'Proses' },
                                        { value: 'selesai', label: 'Selesai' },
                                    ]}
                                    onChange={(value) => setEditService({ ...editService, status: value })}
                                />
                            </Col>
                            <Col xs={24} md={24}>
                                <label className="text-xs font-medium text-[#5B6474]">Judul Pekerjaan</label>
                                <Input
                                    value={editService.title}
                                    onChange={(e) => setEditService({ ...editService, title: e.target.value })}
                                />
                            </Col>
                            <Col xs={12} md={8}>
                                <label className="text-xs font-medium text-[#5B6474]">Mulai</label>
                                <Input
                                    type="date"
                                    value={editService.start_date}
                                    onChange={(e) => setEditService({ ...editService, start_date: e.target.value })}
                                />
                            </Col>
                            <Col xs={12} md={8}>
                                <label className="text-xs font-medium text-[#5B6474]">Selesai</label>
                                <Input
                                    type="date"
                                    value={editService.end_date ?? ''}
                                    onChange={(e) => setEditService({ ...editService, end_date: e.target.value })}
                                />
                            </Col>
                            <Col xs={12} md={8}>
                                <label className="text-xs font-medium text-[#5B6474]">Bengkel</label>
                                <Input
                                    value={editService.workshop ?? ''}
                                    onChange={(e) => setEditService({ ...editService, workshop: e.target.value })}
                                />
                            </Col>
                            <Col xs={12} md={8}>
                                <label className="text-xs font-medium text-[#5B6474]">Biaya (Rp)</label>
                                <NumericInput
                                    decimalPlaces={2}
                                    value={editService.cost ?? 0}
                                    onChange={(e) => setEditService({ ...editService, cost: e.target.value })}
                                />
                            </Col>
                        </Row>
                        <div>
                            <label className="text-xs font-medium text-[#5B6474]">Sparepart dipakai</label>
                            {(editService.items ?? []).map((it: any, idx: number) => (
                                <div key={idx} className="mt-2 flex items-center gap-2 text-sm">
                                    <span className="flex-1 text-[#111827]">{it.item_name}</span>
                                    <NumericInput
                                        decimalPlaces={2}
                                        value={it.qty}
                                        onChange={(e) => {
                                            const next = [...editService.items];
                                            next[idx] = { ...it, qty: e.target.value };
                                            setEditService({ ...editService, items: next });
                                        }}
                                        className="w-24"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setEditService({ ...editService, items: editService.items.filter((_: any, i: number) => i !== idx) })}
                                        className="text-xs text-[#BA0C2F] hover:underline"
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
                                className="mt-2 text-xs font-medium text-[#BA0C2F] hover:underline"
                            >
                                + Tambah item dari inventory
                            </button>
                        </div>
                        <div className="mt-4 flex justify-end gap-3">
                            <SecondaryButton onClick={() => setEditService(null)}>Batal</SecondaryButton>
                            <PrimaryButton htmlType="submit">Simpan</PrimaryButton>
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
                        <h2 className="text-lg font-semibold text-[#111827]">Edit Log BBM</h2>
                        <p className="text-xs text-[#5B6474]">Analisis Normal/Waspada/Tidak Normal dihitung ulang otomatis saat disimpan.</p>
                        <Row gutter={12}>
                            <Col xs={12}>
                                <label className="text-xs font-medium text-[#5B6474]">Tanggal</label>
                                <Input
                                    type="date"
                                    value={editFuel.trip_date}
                                    onChange={(e) => setEditFuel({ ...editFuel, trip_date: e.target.value })}
                                />
                            </Col>
                            <Col xs={24}>
                                <label className="text-xs font-medium text-[#5B6474]">Rute</label>
                                <Input
                                    value={editFuel.route}
                                    onChange={(e) => setEditFuel({ ...editFuel, route: e.target.value })}
                                />
                            </Col>
                            <Col xs={12}>
                                <label className="text-xs font-medium text-[#5B6474]">Durasi (jam)</label>
                                <NumericInput
                                    decimalPlaces={2}
                                    value={editFuel.duration_hours}
                                    onChange={(e) => setEditFuel({ ...editFuel, duration_hours: e.target.value })}
                                />
                            </Col>
                            <Col xs={12}>
                                <label className="text-xs font-medium text-[#5B6474]">Liter</label>
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
                                />
                            </Col>
                            <Col xs={12}>
                                <label className="text-xs font-medium text-[#5B6474]">Jarak (mil)</label>
                                <NumericInput
                                    decimalPlaces={2}
                                    value={editFuel.distance_nm ?? ''}
                                    onChange={(e) => setEditFuel({ ...editFuel, distance_nm: e.target.value })}
                                />
                            </Col>
                            <Col xs={12}>
                                <label className="text-xs font-medium text-[#5B6474]">Harga per Liter (Rp)</label>
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
                                />
                                <p className="mt-1 text-xs text-[#5B6474]">
                                    Total biaya BBM: {formatRupiah(editFuel.cost ?? 0)}
                                </p>
                            </Col>
                            <Col xs={24}>
                                <label className="text-xs font-medium text-[#5B6474]">Penjelasan (wajib bila Tidak Normal)</label>
                                <Input.TextArea
                                    value={editFuel.explanation ?? ''}
                                    onChange={(e) => setEditFuel({ ...editFuel, explanation: e.target.value })}
                                    rows={2}
                                />
                            </Col>
                        </Row>
                        <div className="mt-4 flex justify-end gap-3">
                            <SecondaryButton onClick={() => setEditFuel(null)}>Batal</SecondaryButton>
                            <PrimaryButton htmlType="submit">Simpan</PrimaryButton>
                        </div>
                    </form>
                </Modal>
            )}

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
