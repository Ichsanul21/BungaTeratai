import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import { Link, useForm } from '@inertiajs/react';
import { FormEvent } from 'react';

const ACTIVITIES = [
    { value: 'towing', label: 'Towing (Penarikan Tongkang)', passenger: false },
    { value: 'sewa_tongkang', label: 'Sewa Tongkang', passenger: false },
    { value: 'assist', label: 'Assist Kolong Jembatan', passenger: false },
    { value: 'bongkar_muat', label: 'Bongkar Muat', passenger: false },
    { value: 'penumpang', label: 'Pelayaran Penumpang', passenger: true },
];

const COMMODITIES = [
    ['batu_bara', 'Batu Bara'],
    ['semen', 'Semen'],
    ['sawit', 'Kelapa Sawit'],
    ['cpo', 'CPO'],
    ['curah_lain', 'Curah Lain'],
    ['lainnya', 'Lainnya'],
];

export default function VoyageForm({
    vessels,
    customers,
    voyage,
    isEdit = false,
}: {
    vessels: Array<{ id: number; vessel_name: string; vessel_type: string; navigation_type: string }>;
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
    const activityMeta = ACTIVITIES.find((a) => a.value === data.activity_type);
    const showCargo = ! isPassengerVessel && data.activity_type !== 'penumpang';
    const showPassenger = isPassengerVessel || data.activity_type === 'penumpang';

    const tugOptions = vessels.filter((v) => v.vessel_type === 'tugboat');
    const bargeOptions = vessels.filter((v) => v.vessel_type === 'tongkang');
    const vesselOptions = isPassengerVessel
        ? vessels.filter((v) => v.vessel_type === 'kapal_penumpang')
        : vessels.filter((v) => v.vessel_type !== 'kapal_penumpang');

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
                    <h2 className="mb-4 text-sm font-semibold text-ink">Kapal & Kegiatan</h2>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <InputLabel value="Kapal *" />
                            <select
                                value={data.vessel_id}
                                onChange={(e) => setData('vessel_id', e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary"
                            >
                                <option value="">— pilih kapal —</option>
                                {vesselOptions.map((v) => (
                                    <option key={v.id} value={v.id}>
                                        {v.vessel_name} ({v.vessel_type.replace('_', ' ')})
                                    </option>
                                ))}
                            </select>
                            <InputError message={errors.vessel_id} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel value="Jenis Kegiatan *" />
                            <select
                                value={data.activity_type}
                                onChange={(e) => setData('activity_type', e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary"
                            >
                                {ACTIVITIES.map((a) => (
                                    <option key={a.value} value={a.value}>
                                        {a.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {showCargo && (
                        <div className="mt-4 grid grid-cols-1 gap-4 border-t border-hairline pt-4 md:grid-cols-2">
                            <div>
                                <InputLabel value="Tugboat (penarik)" />
                                <select
                                    value={data.tugboat_id}
                                    onChange={(e) => setData('tugboat_id', e.target.value)}
                                    className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary"
                                >
                                    <option value="">— pilih tugboat —</option>
                                    {tugOptions.map((v) => (
                                        <option key={v.id} value={v.id}>
                                            {v.vessel_name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <InputLabel value="Tongkang (ditowel)" />
                                <select
                                    value={data.barge_id}
                                    onChange={(e) => setData('barge_id', e.target.value)}
                                    className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary"
                                >
                                    <option value="">— pilih tongkang —</option>
                                    {bargeOptions.map((v) => (
                                        <option key={v.id} value={v.id}>
                                            {v.vessel_name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <InputLabel value="Jenis Muatan" />
                                <select
                                    value={data.commodity_type}
                                    onChange={(e) => setData('commodity_type', e.target.value)}
                                    className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary"
                                >
                                    <option value="">— pilih muatan —</option>
                                    {COMMODITIES.map(([k, v]) => (
                                        <option key={k} value={k}>
                                            {v}
                                        </option>
                                    ))}
                                </select>
                                <p className="mt-1 text-xs text-muted">
                                    Muatan batu bara menambah syarat dokumen (bukti timbang, uji mutu).
                                </p>
                            </div>
                            <div>
                                <InputLabel value="Berat Muatan (ton)" />
                                <TextInput
                                    type="number"
                                    step="0.01"
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
                                <TextInput
                                    type="number"
                                    value={data.capacity}
                                    onChange={(e) => setData('capacity', e.target.value)}
                                    className="mt-1 block w-full"
                                />
                            </div>
                            <div>
                                <InputLabel value="Perkiraan Tiket Terjual" />
                                <TextInput
                                    type="number"
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
                                <select value={data.payment_terms} onChange={(e) => setData('payment_terms', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary">
                                    <option value="">— pilih —</option>
                                    <option value="dp_50_50">50% muat : 50% tiba POD</option>
                                    <option value="dp_100">100% di muka</option>
                                    <option value="custom">Custom</option>
                                </select>
                            </div>
                            <div>
                                <InputLabel value="Freight (Rp)" />
                                <TextInput type="number" step="0.01" value={data.freight_rate} onChange={(e) => setData('freight_rate', e.target.value)} className="mt-1 block w-full" placeholder="mis. 125000" />
                            </div>
                            <div>
                                <InputLabel value="Satuan Freight" />
                                <select value={data.freight_unit} onChange={(e) => setData('freight_unit', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary">
                                    <option value="MT">Per MT</option>
                                    <option value="lumpsum">Lumpsum</option>
                                </select>
                            </div>
                            <div>
                                <InputLabel value="Laytime (hari)" />
                                <TextInput type="number" value={data.laytime_days} onChange={(e) => setData('laytime_days', e.target.value)} className="mt-1 block w-full" />
                            </div>
                            <div>
                                <InputLabel value="Demurrage / hari (Rp)" />
                                <TextInput type="number" step="0.01" value={data.demurrage_per_day} onChange={(e) => setData('demurrage_per_day', e.target.value)} className="mt-1 block w-full" />
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
                            <select
                                value={data.route_type}
                                onChange={(e) => setData('route_type', e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary"
                            >
                                <option value="laut">Laut</option>
                                <option value="sungai">Sungai</option>
                                <option value="kombinasi">Kombinasi</option>
                            </select>
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
                            <select
                                value={data.customer_id}
                                onChange={(e) => setData('customer_id', e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary"
                            >
                                <option value="">— tanpa customer —</option>
                                {customers.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
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
