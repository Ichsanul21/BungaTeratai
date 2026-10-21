import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PageHeader from '@/Components/ui/PageHeader';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { type PageProps } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
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

export default function VoyagesCreate({
    vessels,
    customers,
}: PageProps<{
    vessels: Array<{ id: number; vessel_name: string; vessel_type: string; navigation_type: string }>;
    customers: Array<{ id: number; name: string }>;
}>) {
    const { data, setData, post, processing, errors } = useForm({
        vessel_id: '',
        activity_type: 'towing',
        tugboat_id: '',
        barge_id: '',
        route_type: 'laut',
        origin: '',
        destination: '',
        planned_departure: '',
        estimated_arrival: '',
        customer_id: '',
        contract_no: '',
        person_in_charge: '',
        notes: '',
        commodity_type: '',
        weight_ton: '',
        capacity: '',
        tickets_sold: '',
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
        post('/perjalanan');
    };

    return (
        <AuthenticatedLayout>
            <Head title="Buat Perjalanan" />

            <PageHeader
                title="Buat Perjalanan"
                description="Checklist dokumen dibuat otomatis sesuai jenis kapal, tipe navigasi, dan muatan."
            />

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
                        Simpan & Buat Checklist
                    </PrimaryButton>
                    <Link href="/perjalanan">
                        <SecondaryButton type="button">Batal</SecondaryButton>
                    </Link>
                </div>
            </form>
        </AuthenticatedLayout>
    );
}
