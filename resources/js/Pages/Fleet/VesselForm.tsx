import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import { type PageProps } from '@/types';
import { Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export interface VesselFormData {
    vessel_name: string;
    vessel_type: string;
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

function Field({
    label,
    error,
    children,
    hint,
}: {
    label: string;
    error?: string;
    hint?: string;
    children: React.ReactNode;
}) {
    return (
        <div>
            <InputLabel value={label} />
            <div className="mt-1">{children}</div>
            {hint && ! error && <p className="mt-1 text-xs text-muted">{hint}</p>}
            <InputError message={error} className="mt-1" />
        </div>
    );
}

export default function VesselForm({
    vessel,
    isEdit = false,
}: { vessel?: Record<string, any>; isEdit?: boolean }) {
    const { data, setData, post, put, processing, errors } = useForm<VesselFormData>({
        ...EMPTY,
        ...(vessel
            ? Object.fromEntries(
                  Object.keys(EMPTY).map((k) => [k, vessel[k] === null || vessel[k] === undefined ? '' : String(vessel[k])]),
              )
            : {}),
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        if (isEdit && vessel) {
            put(`/armada/${vessel.id}`);
        } else {
            post('/armada');
        }
    };

    return (
        <form onSubmit={submit} className="space-y-6">
            <section className="rounded-xl border border-hairline bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-sm font-semibold text-ink">Identitas Kapal</h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <Field label="Nama Kapal *" error={errors.vessel_name}>
                        <TextInput
                            value={data.vessel_name}
                            onChange={(e) => setData('vessel_name', e.target.value)}
                            className="block w-full"
                            isFocused
                        />
                    </Field>
                    <Field label="Jenis Kapal *" error={errors.vessel_type}>
                        <select
                            value={data.vessel_type}
                            onChange={(e) => setData('vessel_type', e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary"
                        >
                            <option value="tugboat">Tugboat</option>
                            <option value="tongkang">Tongkang</option>
                            <option value="kapal_penumpang">Kapal Penumpang</option>
                            <option value="lainnya">Lainnya</option>
                        </select>
                    </Field>
                    <Field
                        label="Tipe Navigasi *"
                        error={errors.navigation_type}
                        hint="Menentukan otoritas & template dokumen wajib."
                    >
                        <select
                            value={data.navigation_type}
                            onChange={(e) => setData('navigation_type', e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary"
                        >
                            <option value="laut">Laut</option>
                            <option value="sungai_danau">Sungai / Danau</option>
                            <option value="penyeberangan">Penyeberangan</option>
                        </select>
                    </Field>
                    <Field label="Nomor Registrasi" error={errors.registration_number}>
                        <TextInput
                            value={data.registration_number}
                            onChange={(e) => setData('registration_number', e.target.value)}
                            className="block w-full"
                        />
                    </Field>
                    <Field label="IMO" error={errors.imo}>
                        <TextInput
                            value={data.imo}
                            onChange={(e) => setData('imo', e.target.value)}
                            className="block w-full"
                        />
                    </Field>
                    <Field label="MMSI" error={errors.mmsi}>
                        <TextInput
                            value={data.mmsi}
                            onChange={(e) => setData('mmsi', e.target.value)}
                            className="block w-full"
                        />
                    </Field>
                    <Field label="Call Sign" error={errors.call_sign}>
                        <TextInput
                            value={data.call_sign}
                            onChange={(e) => setData('call_sign', e.target.value)}
                            className="block w-full"
                        />
                    </Field>
                    <Field label="Tahun Pembuatan" error={errors.year_built}>
                        <TextInput
                            type="number"
                            value={data.year_built}
                            onChange={(e) => setData('year_built', e.target.value)}
                            className="block w-full"
                        />
                    </Field>
                    <Field label="Status Operasional *" error={errors.operational_status}>
                        <select
                            value={data.operational_status}
                            onChange={(e) => setData('operational_status', e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary"
                        >
                            <option value="aktif">Aktif</option>
                            <option value="dalam_perbaikan">Dalam Perbaikan</option>
                            <option value="dock">Dock</option>
                            <option value="mangkrak">Mangkrak</option>
                        </select>
                    </Field>
                </div>
            </section>

            <section className="rounded-xl border border-hairline bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-sm font-semibold text-ink">
					Spesifikasi & Kapasitas
				</h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <Field label="Panjang LOA (m)" error={errors.length_m}>
                        <TextInput
                            type="number"
                            step="0.01"
                            value={data.length_m}
                            onChange={(e) => setData('length_m', e.target.value)}
                            className="block w-full"
                        />
                    </Field>
                    <Field label="Lebar Beam (m)" error={errors.beam_m}>
                        <TextInput
                            type="number"
                            step="0.01"
                            value={data.beam_m}
                            onChange={(e) => setData('beam_m', e.target.value)}
                            className="block w-full"
                        />
                    </Field>
                    <Field label="GT (Gross Tonnage)" error={errors.gt}>
                        <TextInput
                            type="number"
                            value={data.gt}
                            onChange={(e) => setData('gt', e.target.value)}
                            className="block w-full"
                        />
                    </Field>
                    <Field label="DWT" error={errors.dwt}>
                        <TextInput
                            type="number"
                            value={data.dwt}
                            onChange={(e) => setData('dwt', e.target.value)}
                            className="block w-full"
                        />
                    </Field>
                    <Field label="Kapasitas" error={errors.capacity_value}>
                        <TextInput
                            type="number"
                            step="0.01"
                            value={data.capacity_value}
                            onChange={(e) => setData('capacity_value', e.target.value)}
                            className="block w-full"
                        />
                    </Field>
                    <Field label="Satuan Kapasitas" error={errors.capacity_unit}>
                        <select
                            value={data.capacity_unit}
                            onChange={(e) => setData('capacity_unit', e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary"
                        >
                            <option value="">— pilih —</option>
                            <option value="ton">Ton</option>
                            <option value="penumpang">Penumpang</option>
                        </select>
                    </Field>
                    <Field label="Mesin" error={errors.engine_spec}>
                        <TextInput
                            value={data.engine_spec}
                            onChange={(e) => setData('engine_spec', e.target.value)}
                            className="block w-full"
                        />
                    </Field>
                    <Field label="Jenis Bahan Bakar" error={errors.fuel_spec}>
                        <TextInput
                            value={data.fuel_spec}
                            onChange={(e) => setData('fuel_spec', e.target.value)}
                            className="block w-full"
                        />
                    </Field>
                    <Field
                        label="Baseline BBM (liter/jam)"
                        error={errors.fuel_baseline_lph}
                        hint="Dasar analisis normal/tidak normal konsumsi BBM per trip."
                    >
                        <TextInput
                            type="number"
                            step="0.01"
                            value={data.fuel_baseline_lph}
                            onChange={(e) => setData('fuel_baseline_lph', e.target.value)}
                            className="block w-full"
                        />
                    </Field>
                </div>
            </section>

            <section className="rounded-xl border border-hairline bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-sm font-semibold text-ink">Kepemilikan & Pangkalan</h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <Field label="Pemilik" error={errors.owner}>
                        <TextInput
                            value={data.owner}
                            onChange={(e) => setData('owner', e.target.value)}
                            className="block w-full"
                        />
                    </Field>
                    <Field label="Operator" error={errors.operator}>
                        <TextInput
                            value={data.operator}
                            onChange={(e) => setData('operator', e.target.value)}
                            className="block w-full"
                        />
                    </Field>
                    <Field label="Pelabuhan / Pangkalan" error={errors.base_location}>
                        <TextInput
                            value={data.base_location}
                            onChange={(e) => setData('base_location', e.target.value)}
                            className="block w-full"
                        />
                    </Field>
                    <Field label="Catatan" error={errors.notes}>
                        <textarea
                            value={data.notes}
                            onChange={(e) => setData('notes', e.target.value)}
                            rows={3}
                            className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary"
                        />
                    </Field>
                </div>
            </section>

            <div className="flex items-center gap-3">
                <PrimaryButton disabled={processing}>
                    {isEdit ? 'Simpan Perubahan' : 'Simpan Kapal'}
                </PrimaryButton>
                <Link href={isEdit && vessel ? `/armada/${vessel.id}` : '/armada'}>
                    <SecondaryButton type="button">Batal</SecondaryButton>
                </Link>
            </div>
        </form>
    );
}
