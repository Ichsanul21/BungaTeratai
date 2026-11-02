import NumericInput from '@/Components/NumericInput';
import PriceInput from '@/Components/PriceInput';
import PrimaryButton from '@/Components/PrimaryButton';
import SearchableSelect from '@/Components/SearchableSelect';
import SecondaryButton from '@/Components/SecondaryButton';
import Card from '@/Components/ui/Card';
import { Link, useForm } from '@inertiajs/react';
import { FormEvent } from 'react';
import { Divider, Typography, Input } from 'antd';

const { Text } = Typography;

const ACTIVITIES = [
    { value: 'towing', label: 'Towing (Penarikan Tongkang)', passenger: false },
    { value: 'sewa_tongkang', label: 'Sewa Tongkang', passenger: false },
    { value: 'bongkar_muat', label: 'Bongkar Muat', passenger: false },
    { value: 'penumpang', label: 'Pelayaran Penumpang', passenger: true },
];

const COMMODITIES = [
    { value: 'batu_bara', label: 'Batu Bara' },
    { value: 'semen', label: 'Semen' },
    { value: 'sawit', label: 'Kelapa Sawit' },
    { value: 'cpo', label: 'CPO' },
    { value: 'curah_lain', label: 'Curah Lain' },
    { value: 'lainnya', label: 'Lainnya' },
];

const FormLabel = ({ children }: { children: React.ReactNode }) => (
    <label className="mb-1 block text-sm font-medium text-[#1C1B1A]">{children}</label>
);

const FormError = ({ message }: { message?: string }) =>
    message ? <div className="mt-1 text-xs text-[#C1121F]">{message}</div> : null;

export default function VoyageForm({
    vessels,
    customers,
    voyage,
    isEdit = false,
}: {
    vessels: Array<{
        id: number;
        vessel_name: string;
        vessel_type: string;
        vessel_type_custom?: string | null;
        navigation_type: string;
    }>;
    customers: Array<{ id: number; name: string }>;
    voyage?: Record<string, any>;
    isEdit?: boolean;
}) {
    const { data, setData, post, put, processing, errors } = useForm({
        vessel_id: voyage?.vessel_id ?? '',
        activity_type: voyage?.activity_type ?? 'towing',
        tugboat_id: voyage?.tugboat_id ?? '',
        barge_id: voyage?.barge_id ?? '',
        route_type: voyage?.route_type ?? 'laut',
        origin: voyage?.origin ?? '',
        destination: voyage?.destination ?? '',
        planned_departure: voyage?.planned_departure ?? '',
        estimated_arrival: voyage?.estimated_arrival ?? '',
        customer_id: voyage?.customer_id ?? '',
        contract_no: voyage?.contract_no ?? '',
        person_in_charge: voyage?.person_in_charge ?? '',
        notes: voyage?.notes ?? '',
        commodity_type: voyage?.commodity_type ?? '',
        commodity_is_custom:
            Boolean(voyage?.commodity_type) &&
            (voyage?.commodity_type === 'lainnya' ||
                !COMMODITIES.some((commodity) => commodity.value === voyage?.commodity_type)),
        weight_ton: voyage?.weight_ton ?? '',
        capacity: voyage?.capacity ?? '',
        tickets_sold: voyage?.tickets_sold ?? '',
        spal_number: voyage?.spal_number ?? '',
        spal_date: voyage?.spal_date ?? '',
        payment_terms: voyage?.payment_terms ?? '',
        payment_terms_note: voyage?.payment_terms_note ?? '',
        freight_rate: voyage?.freight_rate ?? '',
        freight_unit: voyage?.freight_unit ?? 'MT',
        laytime_days: voyage?.laytime_days ?? '',
        demurrage_per_day: voyage?.demurrage_per_day ?? '',
        jetty_loading: voyage?.jetty_loading ?? '',
        jetty_discharge: voyage?.jetty_discharge ?? '',
        shipper: voyage?.shipper ?? '',
        consignee: voyage?.consignee ?? '',
    });

    const selectedVessel = vessels.find((v) => String(v.id) === data.vessel_id);
    const isPassengerVessel = selectedVessel?.vessel_type === 'kapal_penumpang';
    const activityOptions = ACTIVITIES.filter(
        (activity) => activity.passenger === isPassengerVessel || !selectedVessel,
    );
    const showCargo = !isPassengerVessel && data.activity_type !== 'penumpang';
    const showPassenger = isPassengerVessel || data.activity_type === 'penumpang';

    const tugOptions = vessels.filter((v) => v.vessel_type === 'tugboat');
    const bargeOptions = vessels.filter((v) => v.vessel_type === 'tongkang');
    const vesselOptions = vessels;
    const commoditySelection = data.commodity_is_custom
        ? 'lainnya'
        : data.commodity_type;

    const submit = (e: FormEvent) => {
        e.preventDefault();
        if (isEdit && voyage) {
            put(`/perjalanan/${voyage.id}`);
        } else {
            post('/perjalanan');
        }
    };

    return (
        <form onSubmit={submit} className="max-w-4xl space-y-5">
            <Card title="Vessel & Kegiatan">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                        <FormLabel>Vessel *</FormLabel>
                        <SearchableSelect
                            value={data.vessel_id}
                            required
                            options={[
                                { value: '', label: '— pilih vessel —' },
                                ...vesselOptions.map((v) => ({
                                    value: String(v.id),
                                    label: `${v.vessel_name} (${v.vessel_type === 'lainnya' && v.vessel_type_custom ? v.vessel_type_custom : v.vessel_type.replaceAll('_', ' ')})`,
                                })),
                            ]}
                            onChange={(vesselId) => {
                                const vessel = vessels.find((item) => String(item.id) === vesselId);
                                setData('vessel_id', vesselId);
                                if (vessel?.vessel_type === 'kapal_penumpang') {
                                    setData('activity_type', 'penumpang');
                                    setData('tugboat_id', '');
                                    setData('barge_id', '');
                                } else if (data.activity_type === 'penumpang') {
                                    setData('activity_type', 'towing');
                                }
                                setData(
                                    'tugboat_id',
                                    vessel?.vessel_type === 'tugboat' ? vesselId : '',
                                );
                                setData(
                                    'barge_id',
                                    vessel?.vessel_type === 'tongkang' ? vesselId : '',
                                );
                            }}
                        />
                        <FormError message={errors.vessel_id} />
                    </div>
                    <div>
                        <FormLabel>Jenis Kegiatan *</FormLabel>
                        <SearchableSelect
                            value={data.activity_type}
                            required
                            options={activityOptions.map(({ value, label }) => ({ value, label }))}
                            onChange={(activity) => setData('activity_type', activity)}
                            placeholder="— pilih kegiatan —"
                        />
                        <FormError message={errors.activity_type} />
                    </div>
                </div>

                {!isPassengerVessel && (
                    <>
                        <Divider style={{ margin: '20px 0 16px', borderColor: '#E7E1D9' }} />
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                                <FormLabel>Tugboat (penarik)</FormLabel>
                                <SearchableSelect
                                    value={String(data.tugboat_id)}
                                    options={[
                                        { value: '', label: '— pilih tugboat —' },
                                        ...tugOptions.map((v) => ({ value: String(v.id), label: v.vessel_name })),
                                    ]}
                                    onChange={(v) => setData('tugboat_id', v)}
                                    disabled={selectedVessel?.vessel_type === 'tugboat'}
                                />
                            </div>
                            <div>
                                <FormLabel>Tongkang (ditowel)</FormLabel>
                                <SearchableSelect
                                    value={String(data.barge_id)}
                                    options={[
                                        { value: '', label: '— pilih tongkang —' },
                                        ...bargeOptions.map((v) => ({ value: String(v.id), label: v.vessel_name })),
                                    ]}
                                    onChange={(v) => setData('barge_id', v)}
                                    disabled={selectedVessel?.vessel_type === 'tongkang'}
                                />
                            </div>
                            <div className="md:col-span-2">
                                <FormLabel>Jenis Muatan</FormLabel>
                                <SearchableSelect
                                    value={commoditySelection}
                                    options={[
                                        { value: '', label: '— pilih muatan —' },
                                        ...COMMODITIES,
                                    ]}
                                    onChange={(value) => {
                                        setData('commodity_is_custom', value === 'lainnya');
                                        setData('commodity_type', value === 'lainnya' ? '' : value);
                                    }}
                                />
                                {data.commodity_is_custom && (
                                    <>
                                        <Input
                                            value={data.commodity_type === 'lainnya' ? '' : data.commodity_type}
                                            onChange={(e) => setData('commodity_type', e.target.value)}
                                            placeholder="Masukkan jenis muatan"
                                            maxLength={60}
                                            required
                                            style={{ marginTop: 8 }}
                                        />
                                        <FormError message={errors.commodity_type} />
                                    </>
                                )}
                                <Text type="secondary" className="mt-1 block text-xs">
                                    Muatan batu bara menambah syarat dokumen (bukti timbang, uji mutu).
                                </Text>
                            </div>
                            <div>
                                <FormLabel>Berat Muatan (ton)</FormLabel>
                                <NumericInput
                                    decimalPlaces={2}
                                    value={data.weight_ton}
                                    onChange={(e) => setData('weight_ton', e.target.value)}
                                />
                            </div>
                        </div>
                    </>
                )}

                {showPassenger && (
                    <>
                        <Divider style={{ margin: '20px 0 16px', borderColor: '#E7E1D9' }} />
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                                <FormLabel>Kapasitas (penumpang)</FormLabel>
                                <NumericInput
                                    value={data.capacity}
                                    onChange={(e) => setData('capacity', e.target.value)}
                                />
                            </div>
                            <div>
                                <FormLabel>Perkiraan Tiket Terjual</FormLabel>
                                <NumericInput
                                    value={data.tickets_sold}
                                    onChange={(e) => setData('tickets_sold', e.target.value)}
                                />
                            </div>
                        </div>
                    </>
                )}
            </Card>

            {!isPassengerVessel && (
                <Card title="Kontrak SPAL (Charter)" description="Surat Perjanjian Angkutan Laut. Nomor SPAL dibuat otomatis bila dikosongkan.">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <div>
                            <FormLabel>No. SPAL (otomatis bila kosong)</FormLabel>
                            <Input value={data.spal_number} onChange={(e) => setData('spal_number', e.target.value)} placeholder="mis. 105/BT-SLM/FC/..." />
                        </div>
                        <div>
                            <FormLabel>Tanggal SPAL</FormLabel>
                            <Input type="date" value={data.spal_date} onChange={(e) => setData('spal_date', e.target.value)} />
                        </div>
                        <div>
                            <FormLabel>Sistem Pembayaran</FormLabel>
                            <SearchableSelect
                                value={data.payment_terms}
                                options={[
                                    { value: '', label: '— pilih —' },
                                    { value: 'dp_50_50', label: '50% muat : 50% tiba POD' },
                                    { value: 'dp_100', label: '100% di muka' },
                                    { value: 'custom', label: 'Custom' },
                                ]}
                                onChange={(value) => setData('payment_terms', value)}
                            />
                            {data.payment_terms === 'custom' && (
                                <Input
                                    value={data.payment_terms_note}
                                    onChange={(e) => setData('payment_terms_note', e.target.value)}
                                    placeholder="Jelaskan sistem pembayaran"
                                    maxLength={240}
                                    required
                                    style={{ marginTop: 8 }}
                                />
                            )}
                            <FormError message={errors.payment_terms_note} />
                        </div>
                        <div>
                            <FormLabel>Freight (Rp)</FormLabel>
                            <PriceInput value={data.freight_rate} onChange={(e) => setData('freight_rate', e.target.value)} placeholder="mis. 125.000" />
                        </div>
                        <div>
                            <FormLabel>Satuan Freight</FormLabel>
                            <SearchableSelect
                                value={data.freight_unit}
                                options={[
                                    { value: 'MT', label: 'Per MT' },
                                    { value: 'lumpsum', label: 'Lumpsum' },
                                ]}
                                onChange={(value) => setData('freight_unit', value)}
                            />
                        </div>
                        <div>
                            <FormLabel>Laytime (hari)</FormLabel>
                            <NumericInput value={data.laytime_days} onChange={(e) => setData('laytime_days', e.target.value)} />
                        </div>
                        <div>
                            <FormLabel>Demurrage / hari (Rp)</FormLabel>
                            <PriceInput value={data.demurrage_per_day} onChange={(e) => setData('demurrage_per_day', e.target.value)} placeholder="mis. 25.000.000" />
                        </div>
                        <div>
                            <FormLabel>Jetty / Pelabuhan Muat</FormLabel>
                            <Input value={data.jetty_loading} onChange={(e) => setData('jetty_loading', e.target.value)} placeholder="mis. Jetty PT Anabella" />
                        </div>
                        <div>
                            <FormLabel>Jetty / Pelabuhan Bongkar</FormLabel>
                            <Input value={data.jetty_discharge} onChange={(e) => setData('jetty_discharge', e.target.value)} placeholder="mis. Jetty Conch Manado" />
                        </div>
                        <div>
                            <FormLabel>Shipper (Pengirim)</FormLabel>
                            <Input value={data.shipper} onChange={(e) => setData('shipper', e.target.value)} />
                        </div>
                        <div>
                            <FormLabel>Consignee (Penerima)</FormLabel>
                            <Input value={data.consignee} onChange={(e) => setData('consignee', e.target.value)} />
                        </div>
                    </div>
                </Card>
            )}

            <Card title="Rute & Jadwal">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <div>
                        <FormLabel>Jenis Rute *</FormLabel>
                        <SearchableSelect
                            value={data.route_type}
                            options={[
                                { value: 'laut', label: 'Laut' },
                                { value: 'sungai', label: 'Sungai' },
                                { value: 'kombinasi', label: 'Kombinasi' },
                            ]}
                            onChange={(value) => setData('route_type', value)}
                        />
                    </div>
                    <div>
                        <FormLabel>Pelabuhan / Titik Berangkat *</FormLabel>
                        <Input
                            value={data.origin}
                            onChange={(e) => setData('origin', e.target.value)}
                            placeholder="mis. Samarinda"
                        />
                        <FormError message={errors.origin} />
                    </div>
                    <div>
                        <FormLabel>Tujuan *</FormLabel>
                        <Input
                            value={data.destination}
                            onChange={(e) => setData('destination', e.target.value)}
                            placeholder="mis. Bontang"
                        />
                        <FormError message={errors.destination} />
                    </div>
                    <div>
                        <FormLabel>Jadwal Berangkat *</FormLabel>
                        <Input
                            type="datetime-local"
                            value={data.planned_departure}
                            onChange={(e) => setData('planned_departure', e.target.value)}
                        />
                        <FormError message={errors.planned_departure} />
                    </div>
                    <div>
                        <FormLabel>Perkiraan Tiba</FormLabel>
                        <Input
                            type="datetime-local"
                            value={data.estimated_arrival}
                            onChange={(e) => setData('estimated_arrival', e.target.value)}
                        />
                    </div>
                    <div>
                        <FormLabel>Penanggung Jawab *</FormLabel>
                        <Input
                            value={data.person_in_charge}
                            onChange={(e) => setData('person_in_charge', e.target.value)}
                            placeholder="mis. Andi (Operator)"
                        />
                        <FormError message={errors.person_in_charge} />
                    </div>
                    <div>
                        <FormLabel>Customer</FormLabel>
                        <SearchableSelect
                            value={String(data.customer_id)}
                            options={[
                                { value: '', label: '— tanpa customer —' },
                                ...customers.map((customer) => ({
                                    value: String(customer.id),
                                    label: customer.name,
                                })),
                            ]}
                            onChange={(value) => setData('customer_id', value)}
                        />
                    </div>
                    <div>
                        <FormLabel>No. Kontrak</FormLabel>
                        <Input
                            value={data.contract_no}
                            onChange={(e) => setData('contract_no', e.target.value)}
                        />
                    </div>
                    <div className="md:col-span-2 xl:col-span-3">
                        <FormLabel>Catatan</FormLabel>
                        <Input.TextArea
                            value={data.notes}
                            onChange={(e) => setData('notes', e.target.value)}
                            rows={3}
                        />
                    </div>
                </div>
            </Card>

            <div className="flex items-center gap-3">
                <PrimaryButton disabled={processing}>
                    {isEdit ? 'Simpan Perubahan' : 'Simpan & Buat Checklist'}
                </PrimaryButton>
                <Link href="/perjalanan">
                    <SecondaryButton type="button">Batal</SecondaryButton>
                </Link>
            </div>
        </form>
    );
}
