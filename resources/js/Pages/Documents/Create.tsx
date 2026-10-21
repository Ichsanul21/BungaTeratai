import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PageHeader from '@/Components/ui/PageHeader';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { classNames } from '@/lib/format';
import { type PageProps } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { FileUp } from 'lucide-react';
import { FormEvent, useRef, useState } from 'react';

interface Requirement {
    code: string;
    name: string;
    group_code: string;
    applies_to: string;
    applicability: Record<string, string[]> | null;
    is_conditional: boolean;
}

export default function DocumentsCreate({
    categories,
    requirements,
    vessels,
}: PageProps<{
    categories: Array<{ id: number; code: string; name: string; group_code: string }>;
    requirements: Requirement[];
    vessels: Array<{ id: number; vessel_name: string; vessel_type: string; navigation_type: string }>;
}>) {
    const fileRef = useRef<HTMLInputElement>(null);
    const [fileName, setFileName] = useState('');

    const { data, setData, post, processing, errors } = useForm({
        document_name: '',
        category_id: '' as string | number,
        owner_type: 'vessel',
        owner_id: '' as string | number,
        requirement_code: '',
        document_number: '',
        issue_date: '',
        has_expiry: true,
        expiry_date: '' as string,
        responsible_person: 'Staf Dokumen',
        archive_location: '',
        notes: '',
        file: null as File | null,
    });

    const selectedVessel = vessels.find((v) => String(v.id) === String(data.owner_id));

    const requirementChoices = requirements.filter((req) => {
        if (data.owner_type === 'company') {
            return req.group_code === 'A';
        }
        // pemilik kapal: kelompok B, C, D — saring sesuai tipe kapal terpilih
        if (!['B', 'C', 'D'].includes(req.group_code)) return false;
        if (!selectedVessel || !req.applicability) return true;
        const app = req.applicability;
        if (app.vessel_types?.length && !app.vessel_types.includes(selectedVessel.vessel_type)) {
            return false;
        }
        if (
            app.navigation_types?.length &&
            !app.navigation_types.includes(selectedVessel.navigation_type)
        ) {
            return false;
        }
        return true;
    });

    const categoryChoices = categories.filter((c) => {
        if (data.owner_type === 'company') return c.group_code === 'A';
        return ['B', 'C', 'D'].includes(c.group_code);
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post('/dokumen', { forceFormData: true });
    };

    const fillFromRequirement = (code: string) => {
        const req = requirements.find((r) => r.code === code);
        setData({
            ...data,
            requirement_code: code,
            category_id:
                categories.find((c) => c.group_code === req?.group_code)?.id ??
                data.category_id,
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Unggah Dokumen" />

            <PageHeader
                title="Unggah Dokumen"
                description="PDF, JPG, atau PNG (maks. 10 MB). Tentukan masa berlaku — jika tidak berlaku, kosongkan tanggalnya."
            />

            <form onSubmit={submit} className="max-w-4xl space-y-6">
                <section className="rounded-xl border border-hairline bg-white p-5 shadow-sm">
                    <h2 className="mb-4 text-sm font-semibold text-ink">Kepemilikan</h2>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <InputLabel value="Dokumen Milik *" />
                            <div className="mt-2 flex gap-2">
                                {[
                                    { value: 'vessel', label: 'Kapal' },
                                    { value: 'company', label: 'Perusahaan' },
                                ].map((opt) => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() =>
                                            setData({
                                                ...data,
                                                owner_type: opt.value,
                                                owner_id:
                                                    opt.value === 'company' ? '' : data.owner_id,
                                                requirement_code: '',
                                                category_id: '',
                                            })
                                        }
                                        className={classNames(
                                            'flex-1 rounded-lg border px-3 py-2.5 text-sm font-medium transition',
                                            data.owner_type === opt.value
                                                ? 'border-primary bg-primary-tint text-primary'
                                                : 'border-hairline bg-white text-muted hover:border-primary/40',
                                        )}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                            <InputError message={errors.owner_type} className="mt-1" />
                        </div>

                        {data.owner_type === 'vessel' && (
                            <div>
                                <InputLabel value="Kapal *" />
                                <select
                                    value={data.owner_id}
                                    onChange={(e) =>
                                        setData((prev) => ({
                                            ...prev,
                                            owner_id: e.target.value,
                                            requirement_code: '',
                                        }))
                                    }
                                    className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary"
                                >
                                    <option value="">— pilih kapal —</option>
                                    {vessels.map((v) => (
                                        <option key={v.id} value={v.id}>
                                            {v.vessel_name}
                                        </option>
                                    ))}
                                </select>
                                <InputError message={errors.owner_id} className="mt-1" />
                            </div>
                        )}
                    </div>
                </section>

                <section className="rounded-xl border border-hairline bg-white p-5 shadow-sm">
                    <h2 className="mb-4 text-sm font-semibold text-ink">Metadata Dokumen</h2>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="md:col-span-2">
                            <InputLabel value="Nama Dokumen *" />
                            <TextInput
                                value={data.document_name}
                                onChange={(e) => setData('document_name', e.target.value)}
                                className="mt-1 block w-full"
                                placeholder="mis. Sertifikat Kelayakan Layar (SKL)"
                            />
                            <InputError message={errors.document_name} className="mt-1" />
                        </div>

                        <div>
                            <InputLabel value="Dipenuhi Requirement (untuk indikator kelengkapan)" />
                            <select
                                value={data.requirement_code}
                                onChange={(e) => fillFromRequirement(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary"
                            >
                                <option value="">— tidak ditautkan —</option>
                                {requirementChoices.map((r) => (
                                    <option key={r.code} value={r.code}>
                                        {r.group_code} · {r.name}
                                        {r.is_conditional ? ' (kondisional)' : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <InputLabel value="Kategori *" />
                            <select
                                value={data.category_id}
                                onChange={(e) => setData('category_id', e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary"
                            >
                                <option value="">— pilih kategori —</option>
                                {categoryChoices.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.code} · {c.name}
                                    </option>
                                ))}
                            </select>
                            <InputError message={errors.category_id} className="mt-1" />
                        </div>

                        <div>
                            <InputLabel value="Nomor Dokumen" />
                            <TextInput
                                value={data.document_number}
                                onChange={(e) => setData('document_number', e.target.value)}
                                className="mt-1 block w-full"
                            />
                        </div>
                        <div>
                            <InputLabel value="Tanggal Terbit" />
                            <TextInput
                                type="date"
                                value={data.issue_date}
                                onChange={(e) => setData('issue_date', e.target.value)}
                                className="mt-1 block w-full"
                            />
                        </div>
                        <div>
                            <InputLabel value="Penanggung Jawab" />
                            <TextInput
                                value={data.responsible_person}
                                onChange={(e) => setData('responsible_person', e.target.value)}
                                className="mt-1 block w-full"
                            />
                        </div>
                        <div>
                            <InputLabel value="Lokasi Arsip" />
                            <TextInput
                                value={data.archive_location}
                                onChange={(e) => setData('archive_location', e.target.value)}
                                className="mt-1 block w-full"
                                placeholder="mis. Lemari Arsip B — Folder …"
                            />
                        </div>
                    </div>

                    <div className="mt-5 rounded-xl border border-hairline bg-appbg p-4">
                        <label className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                checked={data.has_expiry}
                                onChange={(e) =>
                                    setData((prev) => ({
                                        ...prev,
                                        has_expiry: e.target.checked,
                                        expiry_date: e.target.checked ? prev.expiry_date : '',
                                    }))
                                }
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <span className="text-sm font-medium text-ink">
                                Dokumen ini punya masa berlaku
                            </span>
                            <span className="text-xs text-muted">
                                (centang jika ya — tanpa centang, tidak ada reminder)
                            </span>
                        </label>

                        {data.has_expiry && (
                            <div className="mt-3 max-w-xs">
                                <InputLabel value="Berlaku s/d *" />
                                <TextInput
                                    type="date"
                                    value={data.expiry_date}
                                    onChange={(e) => setData('expiry_date', e.target.value)}
                                    className="mt-1 block w-full"
                                />
                                <InputError message={errors.expiry_date} className="mt-1" />
                            </div>
                        )}
                    </div>

                    <div className="mt-4">
                        <InputLabel value="Catatan" />
                        <textarea
                            value={data.notes}
                            onChange={(e) => setData('notes', e.target.value)}
                            rows={3}
                            className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary"
                        />
                    </div>
                </section>

                <section className="rounded-xl border border-hairline bg-white p-5 shadow-sm">
                    <h2 className="mb-1 text-sm font-semibold text-ink">Berkas *</h2>
                    <p className="mb-3 text-xs text-muted">
                        Format: PDF, JPG, PNG — maksimum 10 MB. File disimpan privat.
                    </p>
                    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-hairline bg-appbg px-4 py-5 transition hover:border-primary/50">
                        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <FileUp size={18} />
                        </span>
                        <span>
                            <span className="block text-sm font-medium text-ink">
                                {fileName || 'Pilih berkas…'}
                            </span>
                            <span className="block text-xs text-muted">
                                Klik untuk memilih dari komputer
                            </span>
                        </span>
                        <input
                            ref={fileRef}
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0] ?? null;
                                setFileName(file?.name ?? '');
                                setData('file', file);
                            }}
                        />
                    </label>
                    <InputError message={errors.file} className="mt-2" />
                </section>

                <div className="flex items-center gap-3">
                    <PrimaryButton disabled={processing || !data.file}>
                        Unggah Dokumen
                    </PrimaryButton>
                    <Link href="/dokumen">
                        <SecondaryButton type="button">Batal</SecondaryButton>
                    </Link>
                </div>
            </form>
        </AuthenticatedLayout>
    );
}
