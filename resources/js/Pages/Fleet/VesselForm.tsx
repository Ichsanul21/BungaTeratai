import Badge from '@/Components/ui/Badge';
import NumericInput from '@/Components/NumericInput';
import SearchableSelect from '@/Components/SearchableSelect';
import { useSyncAntdErrors } from '@/lib/antd-bridge';
import { formatNumber } from '@/lib/format';
import { Link, useForm } from '@inertiajs/react';
import {
    AlertTriangle,
    Anchor,
    ArrowLeftRight,
    Boxes,
    CheckCircle2,
    Circle,
    Container,
    Droplets,
    Hash,
    Info,
    Loader2,
    MapPin,
    Ruler,
    Save,
    ShipWheel,
    UserRound,
    Waves,
    type LucideIcon,
} from 'lucide-react';
import { Alert, Button, Card, Col, Form, Input, InputNumber, Progress, Row, Select, Space, Typography } from 'antd';
import { type FormEvent, useEffect, useRef } from 'react';

const { Text, Title } = Typography;
const { TextArea } = Input;

export interface VesselFormData {
    vessel_name: string;
    vessel_type: string;
    vessel_type_custom: string;
    navigation_type: string;
    registration_number: string;
    imo: string;
    mmsi: string;
    call_sign: string;
    year_built: string;
    length_m: string;
    beam_m: string;
    gt: string;
    dwt: string;
    capacity_value: string;
    capacity_unit: string;
    engine_spec: string;
    fuel_spec: string;
    fuel_baseline_lph: string;
    owner: string;
    operator: string;
    operational_status: string;
    base_location: string;
    notes: string;
}

const EMPTY: VesselFormData = {
    vessel_name: '',
    vessel_type: 'tugboat',
    vessel_type_custom: '',
    navigation_type: 'laut',
    registration_number: '',
    imo: '',
    mmsi: '',
    call_sign: '',
    year_built: '',
    length_m: '',
    beam_m: '',
    gt: '',
    dwt: '',
    capacity_value: '',
    capacity_unit: '',
    engine_spec: '',
    fuel_spec: '',
    fuel_baseline_lph: '',
    owner: 'PT Bunga Teratai',
    operator: 'PT Bunga Teratai',
    operational_status: 'aktif',
    base_location: '',
    notes: '',
};

const TYPE_LABELS: Record<string, string> = {
    tugboat: 'Tugboat',
    tongkang: 'Tongkang',
    kapal_penumpang: 'Kapal Penumpang',
    lainnya: 'Lainnya',
};

const NAV_LABELS: Record<string, string> = {
    laut: 'Laut',
    sungai_danau: 'Sungai / Danau',
    penyeberangan: 'Penyeberangan',
};

const STATUS_LABELS: Record<string, string> = {
    aktif: 'Aktif',
    dalam_perbaikan: 'Dalam Perbaikan',
    dock: 'Dock',
    mangkrak: 'Mangkrak',
};

const STATUS_TONES: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
    aktif: 'success',
    dalam_perbaikan: 'warning',
    dock: 'danger',
    mangkrak: 'danger',
};

const UNIT_LABELS: Record<string, string> = {
    ton: 'Ton',
    penumpang: 'Penumpang',
};

const VESSEL_TYPES: Array<{ value: string; label: string; desc: string; icon: LucideIcon }> = [
    { value: 'tugboat', label: 'Tugboat', desc: 'Kapal tunda untuk manuver dan pendampingan kapal besar.', icon: Anchor },
    { value: 'tongkang', label: 'Tongkang', desc: 'Pengangkut kargo dan material tanpa penggerak sendiri.', icon: Container },
    { value: 'kapal_penumpang', label: 'Kapal Penumpang', desc: 'Angkutan penumpang untuk rute reguler maupun charter.', icon: UserRound },
    { value: 'lainnya', label: 'Lainnya', desc: 'Jenis kapal khusus di luar kategori utama.', icon: ShipWheel },
];

const NAVIGATION_TYPES: Array<{ value: string; label: string; icon: LucideIcon }> = [
    { value: 'laut', label: 'Laut', icon: Waves },
    { value: 'sungai_danau', label: 'Sungai / Danau', icon: Droplets },
    { value: 'penyeberangan', label: 'Penyeberangan', icon: ArrowLeftRight },
];

export default function VesselForm({ vessel, isEdit = false }: { vessel?: Record<string, any>; isEdit?: boolean }) {
    const [form] = Form.useForm();
    const { data, setData, post, put, processing, errors } = useForm<VesselFormData>({ ...EMPTY });

    useEffect(() => {
        if (vessel) {
            (Object.keys(EMPTY) as Array<keyof VesselFormData>).forEach((kunci) => {
                setData(kunci, vessel[kunci] == null ? EMPTY[kunci] : String(vessel[kunci]));
            });
        }
    }, [vessel]);

    useSyncAntdErrors(form, errors);

    const submit = (e: FormEvent) => {
        e.preventDefault();
        if (isEdit && vessel) {
            put(`/armada/${vessel.id}`);
        } else {
            post('/armada');
        }
    };

    const terisi = (v: string) => v.trim() !== '';
    const namaSiap = terisi(data.vessel_name);

    const kelompok: Array<{ label: string; wajib?: boolean; siap: boolean }> = [
        { label: 'Nama kapal', wajib: true, siap: namaSiap },
        { label: 'No. registrasi', siap: terisi(data.registration_number) },
        { label: 'Identifikasi radio', siap: terisi(data.imo) || terisi(data.mmsi) || terisi(data.call_sign) },
        { label: 'Dimensi & tonase', siap: terisi(data.length_m) || terisi(data.beam_m) || terisi(data.gt) || terisi(data.dwt) },
        { label: 'Kapasitas angkut', siap: terisi(data.capacity_value) },
        { label: 'Mesin & BBM', siap: terisi(data.engine_spec) || terisi(data.fuel_spec) || terisi(data.fuel_baseline_lph) },
        { label: 'Pangkalan', siap: terisi(data.base_location) },
    ];
    const jumlahSiap = kelompok.filter((k) => k.siap).length;
    const pctSiap = Math.round((jumlahSiap / kelompok.length) * 100);
    const jumlahGalat = Object.keys(errors).length;
    const terkunci = processing || !namaSiap;
    const legacyTypeWithoutCustom = isEdit && vessel?.vessel_type === 'lainnya' && !vessel?.vessel_type_custom;

    const IkonJenis = VESSEL_TYPES.find((t) => t.value === data.vessel_type)?.icon ?? Anchor;
    const labelJenis = data.vessel_type === 'lainnya' && data.vessel_type_custom ? data.vessel_type_custom : TYPE_LABELS[data.vessel_type] ?? data.vessel_type;
    const teksDimensi = [data.length_m, data.beam_m].filter(terisi).map((value) => formatNumber(Number(value), 2)).join(' × ');
    const teksTonase = [terisi(data.gt) ? `${formatNumber(Number(data.gt))} GT` : '', terisi(data.dwt) ? `${formatNumber(Number(data.dwt), 2)} DWT` : ''].filter(Boolean).join(' · ');
    const teksKapasitas = terisi(data.capacity_value) ? [formatNumber(Number(data.capacity_value), 2), UNIT_LABELS[data.capacity_unit] ?? ''].filter(Boolean).join(' ') : '';
    const urlBatal = isEdit && vessel ? `/armada/${vessel.id}` : '/armada';

    return (
        <form onSubmit={submit} className="grid grid-cols-1 items-start gap-5 xl:grid-cols-3">
            <div className="min-w-0 space-y-5 xl:col-span-2">
                <Card title={<><span className="inline-flex h-9 w-9 items-center justify-center rounded-lg font-mono text-xs font-semibold" style={{ background: '#FAF7F2', color: '#C1121F' }}>01</span> Identitas Kapal</>} className="rounded-2xl border border-[#E7E1D9] shadow-sm">
                    <Form form={form} layout="vertical" className="space-y-5">
                        <Form.Item label="Nama Kapal" name="vessel_name" required rules={[{ required: true, message: 'Nama kapal wajib diisi' }]}>
                            <Input
                                value={data.vessel_name}
                                onChange={(e) => setData('vessel_name', e.target.value)}
                                placeholder="mis. TB Bunga Teratai 07"
                            />
                        </Form.Item>

                        <Form.Item label="Jenis Kapal" name="vessel_type" required>
                            <Row gutter={[12, 12]}>
                                {VESSEL_TYPES.map((t) => (
                                    <Col xs={24} sm={12} key={t.value}>
                                        <Button
                                            type={data.vessel_type === t.value ? 'primary' : 'default'}
                                            onClick={() => {
                                                setData('vessel_type', t.value);
                                                if (t.value !== 'lainnya') setData('vessel_type_custom', '');
                                            }}
                                            className="w-full h-auto p-3 text-left"
                                            icon={<t.icon size={16} />}
                                        >
                                            <div>
                                                <div className="text-sm font-semibold" style={{ color: '#1C1B1A' }}>{t.label}</div>
                                                <div className="mt-0.5 text-[11px]" style={{ color: '#8A8580' }}>{t.desc}</div>
                                            </div>
                                        </Button>
                                    </Col>
                                ))}
                            </Row>
                        </Form.Item>

                        {data.vessel_type === 'lainnya' && (
                            <Form.Item label="Sebutkan Jenis Kapal" name="vessel_type_custom" required={!legacyTypeWithoutCustom}>
                                <Input
                                    value={data.vessel_type_custom}
                                    onChange={(e) => setData('vessel_type_custom', e.target.value)}
                                    placeholder="mis. Kapal Keruk"
                                    maxLength={60}
                                />
                            </Form.Item>
                        )}

                        <Form.Item label="Tipe Navigasi" name="navigation_type" required>
                            <Row gutter={[12, 12]}>
                                {NAVIGATION_TYPES.map((n) => (
                                    <Col xs={24} sm={8} key={n.value}>
                                        <Button
                                            type={data.navigation_type === n.value ? 'primary' : 'default'}
                                            onClick={() => setData('navigation_type', n.value)}
                                            className="w-full h-auto p-3 text-left"
                                            icon={<n.icon size={16} />}
                                        >
                                            <span className="text-sm font-semibold">{n.label}</span>
                                        </Button>
                                    </Col>
                                ))}
                            </Row>
                            <div className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed" style={{ color: '#8A8580' }}>
                                <Info size={12} aria-hidden="true" className="mt-0.5 shrink-0" />
                                Menentukan otoritas wilayah dan template dokumen wajib kapal.
                            </div>
                        </Form.Item>

                        <Row gutter={[16, 16]}>
                            <Col xs={24} md={12}>
                                <Form.Item label="No. Registrasi" name="registration_number">
                                    <Input
                                        value={data.registration_number}
                                        onChange={(e) => setData('registration_number', e.target.value)}
                                    />
                                </Form.Item>
                                <div className="flex items-start gap-1.5 text-[11px] leading-relaxed -mt-3 mb-4" style={{ color: '#8A8580' }}>
                                    <Info size={12} aria-hidden="true" className="mt-0.5 shrink-0" />
                                    Nomor pada surat registrasi kapal bila sudah terbit.
                                </div>
                            </Col>
                            <Col xs={24} md={12}>
                                <Form.Item label="Tahun Pembuatan" name="year_built">
                                    <Input
                                        value={data.year_built}
                                        onChange={(e) => setData('year_built', e.target.value)}
                                        placeholder="mis. 2015"
                                        inputMode="numeric"
                                        maxLength={4}
                                    />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                                <Form.Item label="IMO" name="imo">
                                    <Input
                                        value={data.imo}
                                        onChange={(e) => setData('imo', e.target.value)}
                                        placeholder="mis. 9123456"
                                        inputMode="numeric"
                                    />
                                </Form.Item>
                                <div className="flex items-start gap-1.5 text-[11px] leading-relaxed -mt-3 mb-4" style={{ color: '#8A8580' }}>
                                    <Info size={12} aria-hidden="true" className="mt-0.5 shrink-0" />
                                    7 digit, untuk kapal yang berlayar internasional.
                                </div>
                            </Col>
                            <Col xs={24} md={12}>
                                <Form.Item label="MMSI" name="mmsi">
                                    <Input
                                        value={data.mmsi}
                                        onChange={(e) => setData('mmsi', e.target.value)}
                                        placeholder="mis. 525012345"
                                        inputMode="numeric"
                                    />
                                </Form.Item>
                                <div className="flex items-start gap-1.5 text-[11px] leading-relaxed -mt-3 mb-4" style={{ color: '#8A8580' }}>
                                    <Info size={12} aria-hidden="true" className="mt-0.5 shrink-0" />
                                    9 digit identitas panggilan digital radio maritim.
                                </div>
                            </Col>
                            <Col xs={24} md={12}>
                                <Form.Item label="Call Sign" name="call_sign">
                                    <Input
                                        value={data.call_sign}
                                        onChange={(e) => setData('call_sign', e.target.value)}
                                        placeholder="mis. YB2AB"
                                    />
                                </Form.Item>
                                <div className="flex items-start gap-1.5 text-[11px] leading-relaxed -mt-3 mb-4" style={{ color: '#8A8580' }}>
                                    <Info size={12} aria-hidden="true" className="mt-0.5 shrink-0" />
                                    Nama panggilan radio untuk komunikasi pelayaran.
                                </div>
                            </Col>
                            <Col xs={24} md={12}>
                                <Form.Item label="Status Operasional" name="operational_status" required>
                                    <SearchableSelect
                                        value={data.operational_status}
                                        options={Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))}
                                        onChange={(value) => setData('operational_status', value)}
                                        required
                                    />
                                </Form.Item>
                            </Col>
                        </Row>
                    </Form>
                </Card>

                <Card title={<><span className="inline-flex h-9 w-9 items-center justify-center rounded-lg font-mono text-xs font-semibold" style={{ background: '#FAF7F2', color: '#C1121F' }}>02</span> Spesifikasi & Kapasitas</>} className="rounded-2xl border border-[#E7E1D9] shadow-sm">
                    <Form form={form} layout="vertical">
                        <Row gutter={[16, 16]}>
                            <Col xs={24} md={12} xl={6}>
                                <Form.Item label="Panjang (LOA)" name="length_m">
                                    <div className="relative">
                                        <NumericInput
                                            decimalPlaces={2}
                                            value={data.length_m}
                                            onChange={(e) => setData('length_m', e.target.value)}
                                            placeholder="mis. 32.5"
                                            className="pe-9"
                                        />
                                        <span aria-hidden="true" className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-[11px] font-medium" style={{ color: '#8A8580' }}>m</span>
                                    </div>
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={12} xl={6}>
                                <Form.Item label="Lebar (Beam)" name="beam_m">
                                    <div className="relative">
                                        <NumericInput
                                            decimalPlaces={2}
                                            value={data.beam_m}
                                            onChange={(e) => setData('beam_m', e.target.value)}
                                            placeholder="mis. 9.8"
                                            className="pe-9"
                                        />
                                        <span aria-hidden="true" className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-[11px] font-medium" style={{ color: '#8A8580' }}>m</span>
                                    </div>
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={12} xl={6}>
                                <Form.Item label="GT (Gross Tonnage)" name="gt">
                                    <NumericInput
                                        decimalPlaces={2}
                                        value={data.gt}
                                        onChange={(e) => setData('gt', e.target.value)}
                                        placeholder="mis. 148"
                                    />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={12} xl={6}>
                                <Form.Item label="DWT (Deadweight)" name="dwt">
                                    <div className="relative">
                                        <NumericInput
                                            decimalPlaces={2}
                                            value={data.dwt}
                                            onChange={(e) => setData('dwt', e.target.value)}
                                            placeholder="mis. 220"
                                            className="pe-11"
                                        />
                                        <span aria-hidden="true" className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-[11px] font-medium" style={{ color: '#8A8580' }}>ton</span>
                                    </div>
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={12} xl={12}>
                                <Form.Item label="Kapasitas Angkut" name="capacity_value">
                                    <div className="flex gap-2">
                                        <NumericInput
                                            decimalPlaces={2}
                                            value={data.capacity_value}
                                            onChange={(e) => setData('capacity_value', e.target.value)}
                                            placeholder="mis. 120"
                                            className="min-w-0 flex-1"
                                        />
                                        <div className="w-32 shrink-0">
                                            <SearchableSelect
                                                value={data.capacity_unit}
                                                options={[
                                                    { value: '', label: 'Satuan…' },
                                                    { value: 'ton', label: 'Ton' },
                                                    { value: 'penumpang', label: 'Penumpang' },
                                                ]}
                                                onChange={(value) => setData('capacity_unit', value)}
                                                placeholder="Satuan…"
                                                ariaLabel="Satuan kapasitas"
                                            />
                                        </div>
                                    </div>
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={12} xl={6}>
                                <Form.Item label="Mesin" name="engine_spec">
                                    <Input
                                        value={data.engine_spec}
                                        onChange={(e) => setData('engine_spec', e.target.value)}
                                        placeholder="mis. Caterpillar 3512, 1.200 HP"
                                    />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={12} xl={6}>
                                <Form.Item label="Jenis BBM" name="fuel_spec">
                                    <Input
                                        value={data.fuel_spec}
                                        onChange={(e) => setData('fuel_spec', e.target.value)}
                                        placeholder="mis. Marine Gas Oil (MGO)"
                                    />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={12} xl={12}>
                                <Form.Item label="Baseline BBM" name="fuel_baseline_lph">
                                    <div className="relative">
                                        <NumericInput
                                            decimalPlaces={2}
                                            value={data.fuel_baseline_lph}
                                            onChange={(e) => setData('fuel_baseline_lph', e.target.value)}
                                            placeholder="mis. 85"
                                            className="pe-14"
                                        />
                                        <span aria-hidden="true" className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-[11px] font-medium" style={{ color: '#8A8580' }}>L/jam</span>
                                    </div>
                                </Form.Item>
                                <div className="flex items-start gap-1.5 text-[11px] leading-relaxed -mt-3" style={{ color: '#8A8580' }}>
                                    <Info size={12} aria-hidden="true" className="mt-0.5 shrink-0" />
                                    Acuan analisis konsumsi BBM normal atau tidak pada setiap perjalanan.
                                </div>
                            </Col>
                        </Row>
                    </Form>
                </Card>

                <Card title={<><span className="inline-flex h-9 w-9 items-center justify-center rounded-lg font-mono text-xs font-semibold" style={{ background: '#FAF7F2', color: '#C1121F' }}>03</span> Kepemilikan & Pangkalan</>} className="rounded-2xl border border-[#E7E1D9] shadow-sm">
                    <Form form={form} layout="vertical">
                        <Row gutter={[16, 16]}>
                            <Col xs={24} md={12}>
                                <Form.Item label="Pemilik" name="owner">
                                    <Input value={data.owner} onChange={(e) => setData('owner', e.target.value)} />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                                <Form.Item label="Operator" name="operator">
                                    <Input value={data.operator} onChange={(e) => setData('operator', e.target.value)} />
                                </Form.Item>
                            </Col>
                            <Col xs={24}>
                                <Form.Item label="Pelabuhan / Pangkalan" name="base_location">
                                    <Input
                                        value={data.base_location}
                                        onChange={(e) => setData('base_location', e.target.value)}
                                        placeholder="mis. Pelabuhan Tanjung Perak, Surabaya"
                                    />
                                </Form.Item>
                            </Col>
                            <Col xs={24}>
                                <Form.Item label="Catatan" name="notes">
                                    <TextArea
                                        value={data.notes}
                                        onChange={(e) => setData('notes', e.target.value)}
                                        rows={3}
                                        placeholder="mis. Jadwal docking berikutnya atau catatan kondisi khusus kapal."
                                    />
                                </Form.Item>
                            </Col>
                        </Row>
                    </Form>
                </Card>

                <div className="flex flex-col gap-4 rounded-2xl border bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: '#E7E1D9' }}>
                    <div className="min-w-0">
                        {jumlahGalat > 0 ? (
                            <Alert
                                message={`${jumlahGalat} isian perlu diperbaiki sebelum menyimpan.`}
                                type="error"
                                showIcon
                                icon={<AlertTriangle size={14} />}
                                className="text-xs"
                            />
                        ) : !namaSiap ? (
                            <div className="flex items-center gap-2 text-xs" style={{ color: '#8A8580' }}>
                                <Info size={14} aria-hidden="true" className="shrink-0" />
                                Isi nama kapal pada seksi identitas untuk mengaktifkan tombol simpan.
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-xs" style={{ color: '#8A8580' }}>
                                <CheckCircle2 size={14} aria-hidden="true" className="shrink-0" style={{ color: '#2F8F68' }} />
                                <span className="truncate">Siap disimpan sebagai {data.vessel_name}.</span>
                            </div>
                        )}
                    </div>
                    <Space className="flex flex-col-reverse sm:flex-row">
                        <Link href={urlBatal}>
                            <Button>Batal</Button>
                        </Link>
                        <Button type="primary" htmlType="submit" disabled={terkunci} loading={processing} icon={!processing && <Save size={16} />}>
                            {processing ? 'Menyimpan…' : isEdit ? 'Simpan Perubahan' : 'Simpan Kapal'}
                        </Button>
                    </Space>
                </div>
            </div>

            <div className="min-w-0 space-y-5 xl:sticky xl:top-24">
                <Card title="Pratinjau Kartu Kapal" extra={<span className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: '#8A8580' }}>Langsung</span>} className="rounded-2xl border border-[#E7E1D9] shadow-sm">
                    <div className="rounded-xl border p-4" style={{ borderColor: '#E7E1D9', background: '#FAF7F2' }}>
                        <div className="flex items-start gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg shadow-[0_10px_22px_-12px_rgba(193,18,31,0.55)]" style={{ background: '#C1121F', color: '#fff' }}>
                                <IkonJenis size={18} aria-hidden="true" />
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="break-words text-sm font-semibold" style={{ color: '#1C1B1A' }}>
                                    {data.vessel_name.trim() || <span style={{ color: '#8A8580' }}>Nama kapal menyusul</span>}
                                </p>
                                <p className="mt-1 font-mono text-[10px] font-medium uppercase tracking-[0.14em]" style={{ color: '#8A8580' }}>
                                    {labelJenis + ' · ' + (NAV_LABELS[data.navigation_type] ?? data.navigation_type)}
                                </p>
                            </div>
                        </div>
                        <div className="mt-3.5 space-y-2.5 border-t pt-3.5" style={{ borderColor: '#E7E1D9' }}>
                            <div className="flex items-center justify-between gap-3">
                                <span className="flex shrink-0 items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide" style={{ color: '#8A8580' }}>
                                    <Anchor size={12} aria-hidden="true" /> Status
                                </span>
                                <Badge tone={STATUS_TONES[data.operational_status] ?? 'neutral'}>
                                    {STATUS_LABELS[data.operational_status] ?? data.operational_status}
                                </Badge>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                                <span className="flex shrink-0 items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide" style={{ color: '#8A8580' }}>
                                    <Ruler size={12} aria-hidden="true" /> Dimensi
                                </span>
                                <span className="min-w-0 truncate text-xs font-medium" style={{ color: '#1C1B1A' }}>
                                    {terisi(teksDimensi) ? `${teksDimensi} m` : 'Belum diisi'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                                <span className="flex shrink-0 items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide" style={{ color: '#8A8580' }}>
                                    <Hash size={12} aria-hidden="true" /> GT / DWT
                                </span>
                                <span className="min-w-0 truncate text-xs font-medium" style={{ color: '#1C1B1A' }}>
                                    {teksTonase || 'Belum diisi'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                                <span className="flex shrink-0 items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide" style={{ color: '#8A8580' }}>
                                    <Boxes size={12} aria-hidden="true" /> Kapasitas
                                </span>
                                <span className="min-w-0 truncate text-xs font-medium" style={{ color: '#1C1B1A' }}>
                                    {teksKapasitas || 'Belum diisi'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                                <span className="flex shrink-0 items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide" style={{ color: '#8A8580' }}>
                                    <MapPin size={12} aria-hidden="true" /> Pangkalan
                                </span>
                                <span className="min-w-0 truncate text-xs font-medium" style={{ color: '#1C1B1A' }}>
                                    {data.base_location.trim() || 'Belum diatur'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <p className="mt-3 text-[11px] leading-relaxed" style={{ color: '#8A8580' }}>
                        Kartu ini mengikuti isian secara langsung. Kelengkapan dokumen baru terhitung setelah kapal tersimpan dan sertifikasinya diunggah.
                    </p>
                </Card>

                <Card title="Kelengkapan Data" extra={<span className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: '#8A8580' }}>{jumlahSiap} dari {kelompok.length}</span>} className="rounded-2xl border border-[#E7E1D9] shadow-sm">
                    <Progress percent={pctSiap} showInfo={false} strokeColor={{ from: '#C1121F', to: '#D4A96A' }} trailColor="#E7E1D9" />
                    <ul className="mt-4 space-y-2.5">
                        {kelompok.map((k) => (
                            <li key={k.label} className="flex items-center gap-2.5">
                                {k.siap ? (
                                    <CheckCircle2 size={15} aria-hidden="true" className="shrink-0" style={{ color: '#2F8F68' }} />
                                ) : (
                                    <Circle size={15} aria-hidden="true" className="shrink-0" style={{ color: 'rgba(138,133,128,0.5)' }} />
                                )}
                                <span className={`text-sm ${k.siap ? '' : ''}`} style={{ color: k.siap ? '#1C1B1A' : '#8A8580' }}>
                                    {k.label}
                                    {k.wajib && <span className="ms-0.5" style={{ color: '#C1121F' }}>*</span>}
                                </span>
                            </li>
                        ))}
                    </ul>
                    {!namaSiap ? (
                        <Alert
                            message="Nama kapal wajib; kelompok lain bisa menyusul setelah kapal tersimpan."
                            type="warning"
                            showIcon
                            icon={<AlertTriangle size={14} />}
                            className="mt-4 text-xs"
                        />
                    ) : (
                        <Alert
                            message="Isian wajib lengkap, kapal siap disimpan."
                            type="success"
                            showIcon
                            icon={<CheckCircle2 size={14} />}
                            className="mt-4 text-xs"
                        />
                    )}
                </Card>
            </div>
        </form>
    );
}
