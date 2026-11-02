import Badge from '@/Components/ui/Badge';
import Card from '@/Components/ui/Card';
import PageHeader from '@/Components/ui/PageHeader';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { type PageProps } from '@/types';
import {
    Button,
    Col,
    Input,
    Progress,
    Row,
    Select,
    Switch,
    Tag,
} from 'antd';
import { Head, Link, useForm } from '@inertiajs/react';
import {
    AlertTriangle,
    Building2,
    CalendarClock,
    CheckCircle2,
    Circle,
    FileText,
    FileUp,
    HardDrive,
    Image as ImageIcon,
    Info,
    Link2,
    Lock,
    Paperclip,
    Route,
    Ship,
    ShieldCheck,
    Sparkles,
    Stamp,
    X,
} from 'lucide-react';
import { FormEvent, useRef, useState } from 'react';

interface Requirement {
    code: string;
    name: string;
    group_code: string;
    applies_to: string;
    applicability: Record<string, string[]> | null;
    is_conditional: boolean;
}

const EKSTENSI_BOLEH = ['pdf', 'jpg', 'jpeg', 'png'];
const MAX_BYTES = 10 * 1024 * 1024;

const tglPendek = (iso?: string | null) => {
    if (!iso) return 'Tidak tersedia';
    const d = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
};

const formatUkuran = (byte: number) =>
    byte >= 1024 * 1024
        ? `${(byte / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.max(1, Math.round(byte / 1024))} KB`;

export default function DocumentsCreate({
    categories,
    requirements,
    vessels,
    voyagesList,
}: PageProps<{
    categories: Array<{ id: number; code: string; name: string; group_code: string }>;
    requirements: Requirement[];
    vessels: Array<{ id: number; vessel_name: string; vessel_type: string; navigation_type: string }>;
    voyagesList?: Array<{ id: number; voyage_code: string; vessel_id: number; voyage_status: string }>;
}>) {
    const fileRef = useRef<HTMLInputElement>(null);
    const [fileName, setFileName] = useState('');
    const [peringatanBerkas, setPeringatanBerkas] = useState('');

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
        voyage_id: '' as string | number,
        auto_archive_number: true,
        has_endorsement: false,
        endorsement_last_date: '',
        endorsement_next_date: '',
    });

    const selectedVessel = vessels.find((v) => String(v.id) === String(data.owner_id));

    const requirementChoices = requirements.filter((req) => {
        if (data.owner_type === 'company') {
            return req.group_code === 'A';
        }
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

    const pasangBerkas = (berkas: File | null) => {
        setPeringatanBerkas('');
        if (!berkas) return;
        const ekst = berkas.name.split('.').pop()?.toLowerCase() ?? '';
        if (!EKSTENSI_BOLEH.includes(ekst)) {
            setPeringatanBerkas(
                ekst
                    ? `Format .${ekst} tidak didukung; gunakan PDF, JPG, atau PNG.`
                    : 'Format berkas tidak dikenali; gunakan PDF, JPG, atau PNG.',
            );
            return;
        }
        setFileName(berkas.name);
        setData('file', berkas);
        if (berkas.size > MAX_BYTES) {
            setPeringatanBerkas(
                'Ukuran berkas melebihi 10 MB; kompres atau pilih berkas lain sebelum mengirim.',
            );
        }
    };

    const buangBerkas = () => {
        setFileName('');
        setData('file', null);
        setPeringatanBerkas('');
        if (fileRef.current) fileRef.current.value = '';
    };

    const requirementTerpilih = requirements.find((r) => r.code === data.requirement_code);
    const kategoriTerpilih = categories.find((c) => String(c.id) === String(data.category_id));
    const kategoriOtomatis = Boolean(
        requirementTerpilih &&
            kategoriTerpilih &&
            kategoriTerpilih.group_code === requirementTerpilih.group_code,
    );
    const voyageTerpilih = (voyagesList ?? []).find(
        (v) => String(v.id) === String(data.voyage_id),
    );
    const berkasKelewatBesar = data.file != null && data.file.size > MAX_BYTES;
    const terkunci = processing || data.file == null || berkasKelewatBesar;

    const ekstensiBerkas = data.file
        ? data.file.name.split('.').pop()?.toLowerCase() ?? ''
        : '';
    const IkonJenis =
        ekstensiBerkas === 'pdf'
            ? FileText
            : ['jpg', 'jpeg', 'png'].includes(ekstensiBerkas)
              ? ImageIcon
              : FileUp;
    const labelJenis =
        ekstensiBerkas === 'pdf'
            ? 'Dokumen PDF'
            : ekstensiBerkas === 'png'
              ? 'Gambar PNG'
              : ['jpg', 'jpeg'].includes(ekstensiBerkas)
                ? 'Gambar JPG'
                : 'Berkas';

    const sisaHari = (() => {
        if (!data.has_expiry || !data.expiry_date) return null;
        const batas = new Date(`${data.expiry_date}T00:00:00`);
        if (Number.isNaN(batas.getTime())) return null;
        const kini = new Date();
        kini.setHours(0, 0, 0, 0);
        return Math.round((batas.getTime() - kini.getTime()) / 86400000);
    })();

    const badgeBerlaku: {
        tone: 'success' | 'warning' | 'danger' | 'neutral';
        isi: string;
    } = (() => {
        if (!data.has_expiry) return { tone: 'neutral', isi: 'Tanpa masa berlaku' };
        if (!data.expiry_date) return { tone: 'neutral', isi: 'Tanggal belum diisi' };
        if (sisaHari == null) return { tone: 'neutral', isi: tglPendek(data.expiry_date) };
        if (sisaHari < 0)
            return { tone: 'danger', isi: `Kedaluwarsa ${Math.abs(sisaHari)} hari lewat` };
        if (sisaHari <= 30)
            return {
                tone: 'warning',
                isi: sisaHari === 0 ? 'Berakhir hari ini' : `Segera berakhir · ${sisaHari} hari`,
            };
        return { tone: 'success', isi: `Berlaku · ${sisaHari} hari` };
    })();

    const kebutuhan: Array<{ label: string; siap: boolean }> = [
        {
            label: 'Pemilik dokumen',
            siap: data.owner_type === 'company' || String(data.owner_id) !== '',
        },
        { label: 'Nama dokumen', siap: data.document_name.trim() !== '' },
        { label: 'Kategori', siap: String(data.category_id) !== '' },
        ...(data.has_expiry
            ? [{ label: 'Tanggal berakhir', siap: Boolean(data.expiry_date) }]
            : []),
        ...(data.has_endorsement
            ? [
                  {
                      label: 'Endorsement berikutnya',
                      siap: Boolean(data.endorsement_next_date),
                  },
              ]
            : []),
        { label: 'Berkas terlampir', siap: data.file != null },
    ];
    const jumlahSiap = kebutuhan.filter((k) => k.siap).length;
    const siapSemua = jumlahSiap === kebutuhan.length;
    const pctSiap =
        kebutuhan.length > 0 ? Math.round((jumlahSiap / kebutuhan.length) * 100) : 0;

    return (
        <AuthenticatedLayout>
            <Head title="Unggah Dokumen" />

            <div
                className="mb-6 overflow-hidden rounded-2xl border border-[#E7E1D9] bg-white shadow-[0_1px_3px_rgba(28,27,26,0.04),0_8px_24px_-8px_rgba(28,27,26,0.06)]"
            >
                <div className="grid gap-6 p-6 lg:p-7 xl:grid-cols-[minmax(0,1fr)_370px] xl:items-center">
                    <div className="min-w-0">
                        <Link
                            href="/dokumen"
                            className="inline-flex items-center gap-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-[#8A8580] transition-colors hover:text-[#C1121F]"
                        >
                            <Route size={13} />
                            Register Dokumen
                        </Link>
                        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-[#1C1B1A] sm:text-3xl">
                            Unggah Dokumen.
                        </h1>
                        <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#8A8580]">
                            Lampirkan berkas dan lengkapi metadatanya. Dokumen langsung masuk ke
                            register dengan pengingat masa berlaku otomatis.
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                            {[
                                { icon: FileText, label: 'PDF · JPG · PNG' },
                                { icon: HardDrive, label: 'Maks 10 MB' },
                                { icon: Lock, label: 'Tersimpan privat' },
                            ].map(({ icon: Icon, label }) => (
                                <span
                                    key={label}
                                    className="inline-flex items-center gap-1.5 rounded-full border border-[#E7E1D9] bg-[#FAF7F2] px-3 py-1 text-[11px] font-medium text-[#8A8580]"
                                >
                                    <Icon size={12} style={{ color: '#D4A96A' }} />
                                    {label}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="min-w-0">
                        {!data.file ? (
                            <label className="group flex cursor-pointer flex-col items-center rounded-xl border border-dashed border-[#E7E1D9] bg-[#FAF7F2] px-6 py-7 text-center transition-colors hover:border-[#C1121F]/40">
                                <span className="pointer-events-none flex flex-col items-center gap-2.5">
                                    <span
                                        className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#E7E1D9] bg-white text-[#D4A96A]"
                                    >
                                        <FileUp size={20} />
                                    </span>
                                    <span className="text-sm font-semibold text-[#1C1B1A]">
                                        Seret berkas ke sini
                                    </span>
                                    <span className="text-xs text-[#8A8580]">
                                        atau klik untuk memilih dari komputer
                                    </span>
                                </span>
                                <input
                                    ref={fileRef}
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    className="sr-only"
                                    onChange={(e) => pasangBerkas(e.target.files?.[0] ?? null)}
                                />
                            </label>
                        ) : (
                            <div
                                className="rounded-xl border border-[#E7E1D9] bg-[#FAF7F2] p-4"
                            >
                                <div className="flex items-center gap-3.5">
                                    <span
                                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#D4A96A]/10 text-[#D4A96A]"
                                    >
                                        <IkonJenis size={20} />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold text-[#1C1B1A]" title={fileName}>
                                            {fileName}
                                        </p>
                                        <p className="mt-0.5 font-mono text-[11px] tabular-nums text-[#8A8580]">
                                            {labelJenis} · {formatUkuran(data.file.size)}
                                        </p>
                                    </div>
                                    <CheckCircle2 size={18} className="shrink-0 text-[#2F8F68]" />
                                </div>
                                <div
                                    className="mt-3.5 flex items-center gap-2 border-t border-[#E7E1D9] pt-3.5"
                                >
                                    <Button
                                        size="small"
                                        onClick={() => {
                                            if (fileRef.current) {
                                                fileRef.current.value = '';
                                                fileRef.current.click();
                                            }
                                        }}
                                    >
                                        Ganti berkas
                                    </Button>
                                    <Button
                                        size="small"
                                        type="text"
                                        onClick={buangBerkas}
                                        icon={<X size={13} />}
                                        className="text-[#8A8580]"
                                    >
                                        Buang
                                    </Button>
                                </div>
                            </div>
                        )}

                        {peringatanBerkas && (
                            <div
                                role="alert"
                                className="mt-3 flex items-start gap-2 rounded-lg border border-[#D99A2B]/40 bg-[#D99A2B]/10 px-3 py-2 text-xs font-medium leading-relaxed text-[#D99A2B]"
                            >
                                <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                                {peringatanBerkas}
                            </div>
                        )}
                        {errors.file && (
                            <div
                                role="alert"
                                className="mt-3 flex items-start gap-2 rounded-lg border border-[#C1121F]/30 bg-[#C1121F]/5 px-3 py-2 text-xs leading-relaxed text-[#C1121F]"
                            >
                                <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                                {errors.file}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <form onSubmit={submit} className="grid grid-cols-1 items-start gap-5 xl:grid-cols-3">
                <div className="min-w-0 space-y-5 xl:col-span-2">
                    <Card title="Kepemilikan & Tautan" description="Siapa pemilik dokumen dan perjalanan yang memakainya.">
                        <div className="space-y-5">
                            <div>
                                <label className="block text-xs font-medium text-[#8A8580]">
                                    Dokumen Milik <span className="text-[#C1121F]">*</span>
                                </label>
                                <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    {[
                                        {
                                            value: 'vessel',
                                            label: 'Vessel',
                                            desc: 'Dokumen milik armada (kelompok B, C, D)',
                                            icon: Ship,
                                        },
                                        {
                                            value: 'company',
                                            label: 'Perusahaan',
                                            desc: 'Legalitas dan izin usaha (kelompok A)',
                                            icon: Building2,
                                        },
                                    ].map(({ value, label, desc, icon: Ikon }) => {
                                        const aktif = data.owner_type === value;
                                        return (
                                            <button
                                                key={value}
                                                type="button"
                                                onClick={() =>
                                                    setData({
                                                        ...data,
                                                        owner_type: value,
                                                        owner_id: value === 'company' ? '' : data.owner_id,
                                                        requirement_code: '',
                                                        category_id: '',
                                                    })
                                                }
                                                className="flex items-center gap-3 rounded-xl border p-3.5 text-left transition-colors"
                                                style={{
                                                    borderColor: aktif ? 'rgba(193,18,31,0.6)' : '#E7E1D9',
                                                    background: aktif ? 'rgba(193,18,31,0.06)' : '#fff',
                                                }}
                                            >
                                                <span
                                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors"
                                                    style={{
                                                        background: aktif ? '#C1121F' : '#FAF7F2',
                                                        color: aktif ? '#fff' : '#8A8580',
                                                    }}
                                                >
                                                    <Ikon size={18} />
                                                </span>
                                                <span className="min-w-0 flex-1">
                                                    <span className="block text-sm font-semibold text-[#1C1B1A]">
                                                        {label}
                                                    </span>
                                                    <span className="mt-0.5 block text-[11px] leading-snug text-[#8A8580]">
                                                        {desc}
                                                    </span>
                                                </span>
                                                {aktif && (
                                                    <CheckCircle2 size={16} className="shrink-0" style={{ color: '#C1121F' }} />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                                {errors.owner_type && (
                                    <p className="mt-1.5 text-xs font-medium text-[#C1121F]">{errors.owner_type}</p>
                                )}
                            </div>

                            {data.owner_type === 'vessel' ? (
                                <div className="max-w-xl">
                                    <label className="block text-xs font-medium text-[#8A8580]">
                                        Vessel <span className="text-[#C1121F]">*</span>
                                    </label>
                                    <Select
                                        value={data.owner_id ? String(data.owner_id) : ''}
                                        onChange={(v) =>
                                            setData({
                                                ...data,
                                                owner_id: v,
                                                requirement_code: '',
                                            })
                                        }
                                        style={{ width: '100%', marginTop: 4 }}
                                        placeholder="Pilih vessel…"
                                        options={[
                                            { value: '', label: 'Pilih vessel…' },
                                            ...vessels.map((v) => ({
                                                value: String(v.id),
                                                label: v.vessel_name,
                                            })),
                                        ]}
                                    />
                                    {errors.owner_id && (
                                        <p className="mt-1.5 text-xs font-medium text-[#C1121F]">{errors.owner_id}</p>
                                    )}
                                    {selectedVessel && (
                                        <div className="mt-2.5 flex flex-wrap items-center gap-2">
                                            <Tag style={{ borderColor: '#E7E1D9', background: '#FAF7F2', color: '#8A8580', fontSize: 11 }}>
                                                {selectedVessel.vessel_type}
                                            </Tag>
                                            <Tag style={{ borderColor: '#E7E1D9', background: '#FAF7F2', color: '#8A8580', fontSize: 11 }}>
                                                {selectedVessel.navigation_type}
                                            </Tag>
                                            <span className="inline-flex items-center gap-1.5 text-xs text-[#8A8580]">
                                                <ShieldCheck size={13} style={{ color: '#2F8F68' }} />
                                                {requirementChoices.length} requirement cocok untuk kapal ini
                                            </span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div
                                    className="flex max-w-xl items-start gap-2.5 rounded-xl border p-3.5"
                                    style={{ borderColor: '#E7E1D9', background: '#FAF7F2' }}
                                >
                                    <Info size={15} className="mt-0.5 shrink-0" style={{ color: '#1E4668' }} />
                                    <p className="text-xs leading-relaxed text-[#8A8580]">
                                        Dokumen perusahaan memakai requirement dan kategori kelompok A:
                                        akta, izin usaha, dan dokumen legalitas lainnya.
                                    </p>
                                </div>
                            )}

                            <Row gutter={16}>
                                <Col span={12}>
                                    <label className="block text-xs font-medium text-[#8A8580]">
                                        Tertaut Perjalanan (opsional)
                                    </label>
                                    <Select
                                        value={data.voyage_id ? String(data.voyage_id) : ''}
                                        onChange={(v) => setData('voyage_id', v)}
                                        style={{ width: '100%', marginTop: 4 }}
                                        placeholder="Tidak tertaut"
                                        options={[
                                            { value: '', label: 'Tidak tertaut' },
                                            ...(voyagesList ?? []).map((v) => ({
                                                value: String(v.id),
                                                label: v.voyage_code,
                                            })),
                                        ]}
                                    />
                                    <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-[#8A8580]">
                                        <Info size={12} className="mt-0.5 shrink-0" />
                                        Saat perjalanan dipilih, pemilik kapal ditetapkan otomatis dari perjalanan tersebut.
                                    </p>
                                </Col>
                                <Col span={12}>
                                    <div
                                        className="rounded-xl border p-3.5"
                                        style={{ borderColor: '#E7E1D9', background: '#FAF7F2' }}
                                    >
                                        <div className="flex w-full items-center gap-3.5">
                                            <span className="min-w-0 flex-1">
                                                <span className="block text-sm font-medium text-[#1C1B1A]">
                                                    Nomor arsip otomatis
                                                </span>
                                                <span className="mt-0.5 block text-xs leading-relaxed text-[#8A8580]">
                                                    Format ARS/…/tahun/urut, diterbitkan sistem saat dokumen disimpan.
                                                </span>
                                            </span>
                                            <Switch
                                                checked={data.auto_archive_number}
                                                onChange={(v) => setData('auto_archive_number', v)}
                                            />
                                        </div>
                                    </div>
                                </Col>
                            </Row>
                        </div>
                    </Card>

                    <Card title="Identitas & Keterangan" description="Metadata yang membuat dokumen mudah ditemukan kembali di register.">
                        <Row gutter={[20, 16]}>
                            <Col span={24}>
                                <label className="block text-xs font-medium text-[#8A8580]">
                                    Nama Dokumen <span className="text-[#C1121F]">*</span>
                                </label>
                                <Input
                                    value={data.document_name}
                                    onChange={(e) => setData('document_name', e.target.value)}
                                    placeholder="mis. Sertifikat Kelayakan Layar (SKL)"
                                    className="mt-1"
                                />
                                {errors.document_name && (
                                    <p className="mt-1.5 text-xs font-medium text-[#C1121F]">{errors.document_name}</p>
                                )}
                            </Col>
                            <Col span={12}>
                                <label className="block text-xs font-medium text-[#8A8580]">
                                    Dipenuhi Requirement (indikator kelengkapan)
                                </label>
                                <Select
                                    value={data.requirement_code || undefined}
                                    onChange={fillFromRequirement}
                                    style={{ width: '100%', marginTop: 4 }}
                                    placeholder="Tidak ditautkan"
                                    options={[
                                        { value: '', label: 'Tidak ditautkan' },
                                        ...requirementChoices.map((r) => ({
                                            value: r.code,
                                            label: `${r.group_code} · ${r.name}${r.is_conditional ? ' (kondisional)' : ''}`,
                                        })),
                                    ]}
                                />
                            </Col>
                            <Col span={12}>
                                <label className="block text-xs font-medium text-[#8A8580]">
                                    Kategori <span className="text-[#C1121F]">*</span>
                                </label>
                                <Select
                                    value={data.category_id ? String(data.category_id) : ''}
                                    onChange={(v) => setData('category_id', v)}
                                    style={{ width: '100%', marginTop: 4 }}
                                    placeholder="Pilih kategori…"
                                    options={[
                                        { value: '', label: 'Pilih kategori…' },
                                        ...categoryChoices.map((c) => ({
                                            value: String(c.id),
                                            label: `${c.code} · ${c.name}`,
                                        })),
                                    ]}
                                />
                                {errors.category_id && (
                                    <p className="mt-1.5 text-xs font-medium text-[#C1121F]">{errors.category_id}</p>
                                )}
                                {kategoriOtomatis && (
                                    <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium text-[#8A8580]">
                                        <Sparkles size={12} style={{ color: '#D4A96A' }} />
                                        Terisi otomatis dari requirement terpilih
                                    </p>
                                )}
                            </Col>
                            <Col span={12}>
                                <label className="block text-xs font-medium text-[#8A8580]">Nomor Dokumen</label>
                                <Input
                                    value={data.document_number}
                                    onChange={(e) => setData('document_number', e.target.value)}
                                    className="mt-1"
                                />
                            </Col>
                            <Col span={12}>
                                <label className="block text-xs font-medium text-[#8A8580]">Tanggal Terbit</label>
                                <Input
                                    type="date"
                                    value={data.issue_date}
                                    onChange={(e) => setData('issue_date', e.target.value)}
                                    className="mt-1"
                                />
                            </Col>
                            <Col span={12}>
                                <label className="block text-xs font-medium text-[#8A8580]">Penanggung Jawab</label>
                                <Input
                                    value={data.responsible_person}
                                    onChange={(e) => setData('responsible_person', e.target.value)}
                                    className="mt-1"
                                />
                            </Col>
                            <Col span={12}>
                                <label className="block text-xs font-medium text-[#8A8580]">Lokasi Arsip</label>
                                <Input
                                    value={data.archive_location}
                                    onChange={(e) => setData('archive_location', e.target.value)}
                                    placeholder="mis. Lemari Arsip B, Folder Sertifikat"
                                    className="mt-1"
                                />
                            </Col>
                            <Col span={24}>
                                <label className="block text-xs font-medium text-[#8A8580]">Catatan</label>
                                <Input.TextArea
                                    rows={3}
                                    value={data.notes}
                                    onChange={(e) => setData('notes', e.target.value)}
                                    placeholder="Konteks tambahan untuk arsip, mis. penerbit atau keperluan dokumen"
                                    className="mt-1"
                                />
                            </Col>
                        </Row>
                    </Card>

                    <Card title="Masa Berlaku & Endorsement" description="Atur pengingat kedaluwarsa dan siklus perpanjangan endorsement.">
                        <div className="space-y-4">
                            <div className="rounded-xl border p-4" style={{ borderColor: '#E7E1D9', background: '#FAF7F2' }}>
                                <div className="flex w-full items-center gap-3.5">
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-sm font-medium text-[#1C1B1A]">
                                            Dokumen ini punya masa berlaku
                                        </span>
                                        <span className="mt-0.5 block text-xs leading-relaxed text-[#8A8580]">
                                            Tanpa masa berlaku, sistem tidak membuat pengingat kedaluwarsa.
                                        </span>
                                    </span>
                                    <Switch
                                        checked={data.has_expiry}
                                        onChange={(v) =>
                                            setData({
                                                ...data,
                                                has_expiry: v,
                                                expiry_date: v ? data.expiry_date : '',
                                            })
                                        }
                                    />
                                </div>
                                {data.has_expiry && (
                                    <div className="mt-4 max-w-xs">
                                        <label className="block text-xs font-medium text-[#8A8580]">
                                            Berlaku s/d <span className="text-[#C1121F]">*</span>
                                        </label>
                                        <Input
                                            type="date"
                                            value={data.expiry_date}
                                            onChange={(e) => setData('expiry_date', e.target.value)}
                                            className="mt-1"
                                        />
                                        {errors.expiry_date && (
                                            <p className="mt-1.5 text-xs font-medium text-[#C1121F]">{errors.expiry_date}</p>
                                        )}
                                        {sisaHari != null && (
                                            <p
                                                className="mt-2 flex items-center gap-1.5 text-xs font-medium"
                                                style={{
                                                    color: sisaHari < 0 ? '#C1121F' : sisaHari <= 30 ? '#D99A2B' : '#2F8F68',
                                                }}
                                            >
                                                <CalendarClock size={13} />
                                                {sisaHari < 0
                                                    ? `Sudah lewat ${Math.abs(sisaHari)} hari dari batas`
                                                    : sisaHari === 0
                                                      ? 'Berakhir hari ini'
                                                      : `Berakhir dalam ${sisaHari} hari`}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="rounded-xl border p-4" style={{ borderColor: 'rgba(217,154,43,0.3)', background: 'rgba(217,154,43,0.05)' }}>
                                <div className="flex w-full items-center gap-3.5">
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-sm font-medium text-[#1C1B1A]">
                                            Punya siklus endorsement
                                        </span>
                                        <span className="mt-0.5 block text-xs leading-relaxed text-[#8A8580]">
                                            Untuk Surat Laut dan Sertifikat Klasifikasi yang diperpanjang berkala.
                                        </span>
                                    </span>
                                    <Switch
                                        checked={data.has_endorsement}
                                        onChange={(v) => setData('has_endorsement', v)}
                                    />
                                </div>
                                {data.has_endorsement && (
                                    <Row gutter={16} className="mt-4 max-w-xl">
                                        <Col span={12}>
                                            <label className="block text-xs font-medium text-[#8A8580]">Endorsement Terakhir</label>
                                            <Input
                                                type="date"
                                                value={data.endorsement_last_date}
                                                onChange={(e) => setData('endorsement_last_date', e.target.value)}
                                                className="mt-1"
                                            />
                                        </Col>
                                        <Col span={12}>
                                            <label className="block text-xs font-medium text-[#8A8580]">
                                                Endorsement Berikutnya <span className="text-[#C1121F]">*</span>
                                            </label>
                                            <Input
                                                type="date"
                                                value={data.endorsement_next_date}
                                                onChange={(e) => setData('endorsement_next_date', e.target.value)}
                                                className="mt-1"
                                            />
                                        </Col>
                                    </Row>
                                )}
                            </div>
                        </div>
                    </Card>

                    <div className="flex flex-col gap-4 rounded-2xl border border-[#E7E1D9] bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                            {data.file ? (
                                <p className="flex items-center gap-2 text-xs text-[#8A8580]">
                                    <CheckCircle2 size={14} className="shrink-0" style={{ color: '#2F8F68' }} />
                                    <span className="truncate">
                                        Berkas terlampir · {fileName} · {formatUkuran(data.file.size)}
                                    </span>
                                </p>
                            ) : (
                                <p className="flex items-center gap-2 text-xs text-[#8A8580]">
                                    <Info size={14} className="shrink-0" />
                                    Lampirkan berkas pada panel merah di atas untuk mengaktifkan tombol unggah.
                                </p>
                            )}
                            {berkasKelewatBesar && (
                                <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-[#D99A2B]">
                                    <AlertTriangle size={12} />
                                    Ukuran melebihi 10 MB; tombol unggah terkunci sampai berkas diganti.
                                </p>
                            )}
                        </div>
                        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:shrink-0">
                            <Link href="/dokumen">
                                <Button>Batal</Button>
                            </Link>
                            <Button
                                type="primary"
                                htmlType="submit"
                                disabled={terkunci}
                                loading={processing}
                                icon={!processing ? <FileUp size={16} /> : undefined}
                            >
                                {processing ? 'Mengirim…' : 'Unggah Dokumen'}
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="min-w-0 space-y-5 xl:sticky xl:top-24">
                    <Card title="Pratinjau Register" actions={<span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8A8580]">Langsung</span>}>
                        <div className="rounded-xl border border-[#E7E1D9] bg-[#FAF7F2] p-4">
                            <div className="flex items-start gap-3">
                                <span
                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white"
                                    style={{ background: '#C1121F', boxShadow: '0 10px 22px -12px rgba(193,18,31,0.55)' }}
                                >
                                    <IkonJenis size={18} />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="break-words text-sm font-semibold text-[#1C1B1A]">
                                        {data.document_name.trim() || (
                                            <span className="text-[#8A8580]">Nama dokumen menyusul</span>
                                        )}
                                    </p>
                                    <p className="mt-1 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-[#8A8580]">
                                        {kategoriTerpilih
                                            ? `${kategoriTerpilih.code} · ${kategoriTerpilih.name}`
                                            : 'Tanpa kategori'}
                                    </p>
                                </div>
                            </div>
                            <div className="mt-3.5 space-y-2.5 border-t border-[#E7E1D9] pt-3.5">
                                {[
                                    {
                                        icon: data.owner_type === 'company' ? Building2 : Ship,
                                        label: 'Pemilik',
                                        value:
                                            data.owner_type === 'company'
                                                ? 'Perusahaan'
                                                : selectedVessel?.vessel_name ?? 'Vessel belum dipilih',
                                    },
                                    {
                                        icon: Route,
                                        label: 'Tertaut',
                                        value: voyageTerpilih ? voyageTerpilih.voyage_code : 'Tidak tertaut',
                                    },
                                    {
                                        icon: Link2,
                                        label: 'Requirement',
                                        value: requirementTerpilih
                                            ? `${requirementTerpilih.group_code} · ${requirementTerpilih.name}`
                                            : 'Tidak ditautkan',
                                    },
                                ].map(({ icon: Icon, label, value }) => (
                                    <div key={label} className="flex items-center justify-between gap-3">
                                        <span className="flex shrink-0 items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-[#8A8580]">
                                            <Icon size={12} />
                                            {label}
                                        </span>
                                        <span className="min-w-0 truncate text-xs font-medium text-[#1C1B1A]">{value}</span>
                                    </div>
                                ))}
                                <div className="flex items-center justify-between gap-3">
                                    <span className="flex shrink-0 items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-[#8A8580]">
                                        <CalendarClock size={12} />
                                        Masa Berlaku
                                    </span>
                                    <span className="flex min-w-0 flex-col items-end gap-1">
                                        <Badge tone={badgeBerlaku.tone}>{badgeBerlaku.isi}</Badge>
                                        {data.has_expiry && data.expiry_date && (
                                            <span className="font-mono text-[10px] tabular-nums text-[#8A8580]">
                                                {tglPendek(data.expiry_date)}
                                            </span>
                                        )}
                                    </span>
                                </div>
                                {data.has_endorsement && (
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="flex shrink-0 items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-[#8A8580]">
                                            <Stamp size={12} />
                                            Endorsement
                                        </span>
                                        <span className="min-w-0 truncate text-xs font-medium text-[#1C1B1A]">
                                            {data.endorsement_next_date
                                                ? `Berikutnya ${tglPendek(data.endorsement_next_date)}`
                                                : 'Belum dijadwalkan'}
                                        </span>
                                    </div>
                                )}
                                <div className="flex items-center justify-between gap-3">
                                    <span className="flex shrink-0 items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-[#8A8580]">
                                        <Paperclip size={12} />
                                        Berkas
                                    </span>
                                    <span className="min-w-0 truncate text-xs font-medium text-[#1C1B1A]">
                                        {data.file
                                            ? `${fileName} · ${formatUkuran(data.file.size)}`
                                            : 'Belum ada'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <p className="mt-3 text-[11px] leading-relaxed text-[#8A8580]">
                            Kartu ini mengikuti isian secara langsung. Status verifikasi baru ditetapkan setelah dokumen diunggah.
                        </p>
                    </Card>

                    <Card
                        title="Kelengkapan Isian"
                        actions={
                            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8A8580]">
                                {jumlahSiap} dari {kebutuhan.length}
                            </span>
                        }
                    >
                        <Progress
                            percent={pctSiap}
                            showInfo={false}
                            strokeColor={{ from: '#C1121F', to: '#D4A96A' }}
                            trailColor="#E7E1D9"
                        />
                        <ul className="mt-4 space-y-2.5">
                            {kebutuhan.map((k) => (
                                <li key={k.label} className="flex items-center gap-2.5">
                                    {k.siap ? (
                                        <CheckCircle2 size={15} className="shrink-0" style={{ color: '#2F8F68' }} />
                                    ) : (
                                        <Circle size={15} className="shrink-0" style={{ color: 'rgba(138,133,128,0.5)' }} />
                                    )}
                                    <span className={`text-sm ${k.siap ? 'text-[#1C1B1A]' : 'text-[#8A8580]'}`}>
                                        {k.label}
                                    </span>
                                </li>
                            ))}
                        </ul>
                        {berkasKelewatBesar ? (
                            <p
                                className="mt-4 flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold text-[#1C1B1A]"
                                style={{ borderColor: 'rgba(217,154,43,0.4)', background: 'rgba(217,154,43,0.08)' }}
                            >
                                <AlertTriangle size={14} style={{ color: '#D99A2B' }} />
                                Berkas melebihi 10 MB, ganti sebelum mengirim.
                            </p>
                        ) : siapSemua ? (
                            <p
                                className="mt-4 flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold text-[#1C1B1A]"
                                style={{ borderColor: 'rgba(212,169,106,0.4)', background: 'rgba(212,169,106,0.08)' }}
                            >
                                <CheckCircle2 size={14} style={{ color: '#D99A2B' }} />
                                Semua isian pokok lengkap, siap diunggah.
                            </p>
                        ) : null}
                    </Card>
                </div>
            </form>
        </AuthenticatedLayout>
    );
}
