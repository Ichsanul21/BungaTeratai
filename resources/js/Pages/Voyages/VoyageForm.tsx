import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import NumericInput from '@/Components/NumericInput';
import PriceInput from '@/Components/PriceInput';
import PrimaryButton from '@/Components/PrimaryButton';
import SearchableSelect from '@/Components/SearchableSelect';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import { Link, useForm } from '@inertiajs/react';
import { FormEvent } from 'react';

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
    const showCargo = ! isPassengerVessel && data.activity_type !== 'penumpang';
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
        <form onSubmit={submit} className="max-w-4xl space-y-6">
                <section className="rounded-xl border border-hairline bg-white p-5 shadow-sm">
                    <h2 className="mb-4 text-sm font-semibold text-ink">Vessel & Kegiatan</h2>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <InputLabel value="Vessel *" />
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
                            <InputError message={errors.vessel_id} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel value="Jenis Kegiatan *" />
                            <SearchableSelect
                                value={data.activity_type}
                                required
                                options={activityOptions.map(({ value, label }) => ({ value, label }))}
                                onChange={(activity) => setData('activity_type', activity)}
                                placeholder="— pilih kegiatan —"
                            />
                            <InputError message={errors.activity_type} className="mt-1" />
                        </div>
                    </div>

                    {!isPassengerVessel && (
                        <div className="mt-4 grid grid-cols-1 gap-4 border-t border-hairline pt-4 md:grid-cols-2">
                            <div className="md:col-span-2 grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div>
                                    <InputLabel value="Tugboat (penarik)" />
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
                                    <InputLabel value="Tongkang (ditowel)" />
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
                            </div>
                            <div className="md:col-span-2">
                                <InputLabel value="Jenis Muatan" />
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
                                        <TextInput
                                            value={data.commodity_type === 'lainnya' ? '' : data.commodity_type}
                                            onChange={(e) => setData('commodity_type', e.target.value)}
                                            className="mt-2 block w-full"
                                            placeholder="Masukkan jenis muatan"
                                            maxLength={60}
                                            required
                                        />
                                        <InputError message={errors.commodity_type} className="mt-1" />
                                    </>
                                )}
                                <p className="mt-1 text-xs text-muted">
                                    Muatan batu bara menambah syarat dokumen (bukti timbang, uji mutu).
                                </p>
                            </div>
                            <div>
                                <InputLabel value="Berat Muatan (ton)" />
                                <NumericInput
                                    decimalPlaces={2}
                                    value={data.weight_ton}
                                    onChange={(e) => setData('weight_ton', e.target.value)}
                                    className="mt-1 block w-full"
                                />
                            </div>
                        </div>
                    )}

                    {showPassenger && (
                        <div className="mt-4 grid grid-cols-1 gap-4 border-t border-hairline pt-4 md:grid-cols-2">
                            <div>
                                <InputLabel value="Kapasitas (penumpang)" />
                                <NumericInput
                                    value={data.capacity}
                                    onChange={(e) => setData('capacity', e.target.value)}
                                    className="mt-1 block w-full"
                                />
                            </div>
                            <div>
                                <InputLabel value="Perkiraan Tiket Terjual" />
                                <NumericInput
                                    value={data.tickets_sold}
                                    onChange={(e) => setData('tickets_sold', e.target.value)}
                                    className="mt-1 block w-full"
                                />
                            </div>
                        </div>
                    )}
                </section>

                {!isPassengerVessel && (
                    <section className="rounded-xl border border-hairline bg-white p-5 shadow-sm">
                        <h2 className="mb-1 text-sm font-semibold text-ink">Kontrak SPAL (Charter)</h2>
                        <p className="mb-4 text-xs text-muted">
                            Surat Perjanjian Angkutan Laut — nomor SPAL dibuat otomatis bila dikosongkan.
                        </p>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                            <div>
                                <InputLabel value="No. SPAL (otomatis bila kosong)" />
                                <TextInput value={data.spal_number} onChange={(e) => setData('spal_number', e.target.value)} className="mt-1 block w-full" placeholder="mis. 105/BT-SLM/FC/..." />
                            </div>
                            <div>
                                <InputLabel value="Tanggal SPAL" />
                                <TextInput type="date" value={data.spal_date} onChange={(e) => setData('spal_date', e.target.value)} className="mt-1 block w-full" />
                            </div>
                            <div>
                                <InputLabel value="Sistem Pembayaran" />
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
                                    <TextInput
                                        value={data.payment_terms_note}
                                        onChange={(e) => setData('payment_terms_note', e.target.value)}
                                        className="mt-2 block w-full"
                                        placeholder="Jelaskan sistem pembayaran"
                                        maxLength={240}
                                        required
                                    />
                                )}
                                <InputError message={errors.payment_terms_note} className="mt-1" />
                            </div>
                            <div>
                                <InputLabel value="Freight (Rp)" />
                                <PriceInput value={data.freight_rate} onChange={(e) => setData('freight_rate', e.target.value)} className="mt-1 block w-full" placeholder="mis. 125.000" />
                            </div>
                            <div>
                                <InputLabel value="Satuan Freight" />
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
                                <InputLabel value="Laytime (hari)" />
                                <NumericInput value={data.laytime_days} onChange={(e) => setData('laytime_days', e.target.value)} className="mt-1 block w-full" />
                            </div>
                            <div>
                                <InputLabel value="Demurrage / hari (Rp)" />
                                <PriceInput value={data.demurrage_per_day} onChange={(e) => setData('demurrage_per_day', e.target.value)} className="mt-1 block w-full" placeholder="mis. 25.000.000" />
                            </div>
                            <div>
                                <InputLabel value="Jetty / Pelabuhan Muat" />
                                <TextInput value={data.jetty_loading} onChange={(e) => setData('jetty_loading', e.target.value)} className="mt-1 block w-full" placeholder="mis. Jetty PT Anabella" />
                            </div>
                            <div>
                                <InputLabel value="Jetty / Pelabuhan Bongkar" />
                                <TextInput value={data.jetty_discharge} onChange={(e) => setData('jetty_discharge', e.target.value)} className="mt-1 block w-full" placeholder="mis. Jetty Conch Manado" />
                            </div>
                            <div>
                                <InputLabel value="Shipper (Pengirim)" />
                                <TextInput value={data.shipper} onChange={(e) => setData('shipper', e.target.value)} className="mt-1 block w-full" />
                            </div>
                            <div>
                                <InputLabel value="Consignee (Penerima)" />
                                <TextInput value={data.consignee} onChange={(e) => setData('consignee', e.target.value)} className="mt-1 block w-full" />
                            </div>
                        </div>
                    </section>
                )}

                <section className="rounded-xl border border-hairline bg-white p-5 shadow-sm">
                    <h2 className="mb-4 text-sm font-semibold text-ink">Rute & Jadwal</h2>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <div>
                            <InputLabel value="Jenis Rute *" />
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
                            <InputLabel value="Pelabuhan / Titik Berangkat *" />
                            <TextInput
                                value={data.origin}
                                onChange={(e) => setData('origin', e.target.value)}
                                className="mt-1 block w-full"
                                placeholder="mis. Samarinda"
                            />
                            <InputError message={errors.origin} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel value="Tujuan *" />
                            <TextInput
                                value={data.destination}
                                onChange={(e) => setData('destination', e.target.value)}
                                className="mt-1 block w-full"
                                placeholder="mis. Bontang"
                            />
                            <InputError message={errors.destination} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel value="Jadwal Berangkat *" />
                            <TextInput
                                type="datetime-local"
                                value={data.planned_departure}
                                onChange={(e) => setData('planned_departure', e.target.value)}
                                className="mt-1 block w-full"
                            />
                            <InputError message={errors.planned_departure} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel value="Perkiraan Tiba" />
                            <TextInput
                                type="datetime-local"
                                value={data.estimated_arrival}
                                onChange={(e) => setData('estimated_arrival', e.target.value)}
                                className="mt-1 block w-full"
                            />
                        </div>
                        <div>
                            <InputLabel value="Penanggung Jawab *" />
                            <TextInput
                                value={data.person_in_charge}
                                onChange={(e) => setData('person_in_charge', e.target.value)}
                                className="mt-1 block w-full"
                                placeholder="mis. Andi (Operator)"
                            />
                            <InputError message={errors.person_in_charge} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel value="Customer" />
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
                            <InputLabel value="No. Kontrak" />
                            <TextInput
                                value={data.contract_no}
                                onChange={(e) => setData('contract_no', e.target.value)}
                                className="mt-1 block w-full"
                            />
                        </div>
                        <div className="md:col-span-2 xl:col-span-3">
                            <InputLabel value="Catatan" />
                            <textarea
                                value={data.notes}
                                onChange={(e) => setData('notes', e.target.value)}
                                rows={3}
                                className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary"
                            />
                        </div>
                    </div>
                </section>

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
