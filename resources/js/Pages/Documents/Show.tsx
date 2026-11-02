import Badge from '@/Components/ui/Badge';
import Card from '@/Components/ui/Card';
import Modal from '@/Components/Modal';
import { VALIDITY_LABELS, VERIFICATION_STATUS_LABELS } from '@/Constants/navigation';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { classNames, formatDateTime, formatNumber } from '@/lib/format';
import { type PageProps } from '@/types';
import {
    Button,
    Checkbox,
    Col,
    Descriptions,
    Input,
    Row,
    Select,
} from 'antd';
import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    AlertTriangle,
    Archive,
    CheckCircle2,
    Download,
    FileText,
    MessageSquare,
    Pencil,
    Route,
    ShieldX,
    Upload,
    X,
} from 'lucide-react';
import { FormEvent, useState } from 'react';

const DOT_VALIDITY_COLOR: Record<string, string> = {
    normal: '#2F8F68',
    expiring_soon: '#D99A2B',
    expired: '#C1121F',
    no_expiry: 'rgba(239,227,211,0.5)',
};
const DOT_VERIF_COLOR: Record<string, string> = {
    verified: '#2F8F68',
    under_review: '#1E4668',
    revision_required: '#D99A2B',
    rejected: '#C1121F',
    uploaded: '#1E4668',
    draft: '#8A8580',
    missing: '#C1121F',
    archived: '#8A8580',
};

const FILL_VALIDITY_COLOR: Record<string, string> = {
    normal: '#2F8F68',
    expiring_soon: '#D99A2B',
    expired: '#C1121F',
};

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

function ModalKepala({
    eyebrow,
    judul,
    onClose,
}: {
    eyebrow: string;
    judul: string;
    onClose: () => void;
}) {
    return (
        <header
            className="relative overflow-hidden border-b border-[#E7E1D9] bg-[#FAF7F2] px-5 py-4"
        >
            <div
                aria-hidden="true"
                className="absolute inset-x-6 top-0 h-px"
                style={{ background: 'linear-gradient(to right, transparent, rgba(212,169,106,0.3), transparent)' }}
            />
            <div className="pe-12">
                <p className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-[#8A8580]">
                    {eyebrow}
                </p>
                <h2 className="mt-1 text-base font-semibold text-[#1C1B1A]">{judul}</h2>
            </div>
            <button
                type="button"
                onClick={onClose}
                aria-label="Tutup"
                className="absolute end-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E7E1D9] bg-white text-[#8A8580] transition-colors hover:bg-[#FAF7F2] hover:text-[#1C1B1A]"
            >
                <X size={15} />
            </button>
        </header>
    );
}

export default function DocumentsShow({
    document,
    versions,
    approvals,
    voyages,
    categories,
    requirements,
    relations,
    actions,
}: PageProps<{
    document: Record<string, any>;
    versions: Array<Record<string, any>>;
    approvals: Array<Record<string, any>>;
    voyages: Array<Record<string, any>>;
    categories: Array<Record<string, any>>;
    requirements: Array<Record<string, any>>;
    relations?: Array<Record<string, any>>;
    actions: {
        can_submit: boolean;
        can_verify: boolean;
        can_edit: boolean;
        can_upload_version: boolean;
    };
}>) {
    const [modal, setModal] = useState<
        null | 'revision' | 'reject' | 'version' | 'edit' | 'archive' | 'void'
    >(null);
    const [busy, setBusy] = useState(false);
    const [voidReason, setVoidReason] = useState('');

    const { data, setData, post, processing, errors, reset } = useForm({
        comments: '',
        file: null as File | null,
        revision_notes: '',
    });

    const editForm = useForm({
        document_name: document.document_name ?? '',
        category_id: document.category?.id ?? '',
        requirement_code: document.requirement_code ?? '',
        document_number: document.document_number ?? '',
        issue_date: document.issue_date ?? '',
        has_expiry: Boolean(document.has_expiry),
        expiry_date: document.expiry_date ?? '',
        responsible_person: document.responsible_person ?? '',
        archive_location: document.archive_location ?? '',
        notes: document.notes ?? '',
        has_endorsement: Boolean(document.has_endorsement),
        endorsement_last_date: document.endorsement_last_date ?? '',
        endorsement_next_date: document.endorsement_next_date ?? '',
    });

    const submitEdit = (e: FormEvent) => {
        e.preventDefault();
        router.put(`/dokumen/${document.id}`, editForm.data, {
            preserveScroll: true,
            onSuccess: () => setModal(null),
        });
    };

    const action = (path: string) => (e: FormEvent) => {
        e.preventDefault();
        post(`/dokumen/${document.id}/${path}`, {
            preserveScroll: true,
            onFinish: () => {
                setModal(null);
                reset();
            },
        });
    };

    const uploadVersion = (e: FormEvent) => {
        e.preventDefault();
        const formData = new FormData();
        if (data.file) formData.append('file', data.file);
        formData.append('revision_notes', data.revision_notes);
        router.post(`/dokumen/${document.id}/versions`, formData, {
            preserveScroll: true,
            onFinish: () => {
                setModal(null);
                reset();
            },
        });
    };

    const dLeft = document.days_left;

    const pemilik =
        document.owner_type === 'company'
            ? 'PT Bunga Teratai'
            : document.owner_name ?? 'Tidak tersedia';
    const kategori = document.category?.name ?? 'Tanpa kategori';

    const sisaHari =
        dLeft != null &&
        document.validity !== 'no_expiry' &&
        document.validity !== 'expired';

    const dIssue = document.issue_date
        ? new Date(`${document.issue_date}T00:00:00`)
        : null;
    const dExpiry = document.expiry_date
        ? new Date(`${document.expiry_date}T00:00:00`)
        : null;
    const hariIni = new Date();
    hariIni.setHours(0, 0, 0, 0);
    const punyaLinimasa = Boolean(
        dIssue && dExpiry && dExpiry.getTime() > dIssue.getTime(),
    );
    let pctLinimasa = 0;
    if (punyaLinimasa && dIssue && dExpiry) {
        const rentang = dExpiry.getTime() - dIssue.getTime();
        const lewat = (hariIni.getTime() - dIssue.getTime()) / rentang;
        pctLinimasa = Math.round(Math.min(1, Math.max(0, lewat)) * 100);
    }

    const statUtama = (() => {
        if (document.validity === 'no_expiry')
            return { nilai: 'Tanpa batas', unit: '', tone: 'rgba(239,227,211,0.8)', kecil: true };
        if (dLeft == null)
            return { nilai: 'Tidak tersedia', unit: '', tone: 'rgba(239,227,211,0.7)', kecil: true };
        if (document.validity === 'expired')
            return {
                nilai: formatNumber(Math.abs(dLeft)),
                unit: 'hari lewat',
                tone: '#C1121F',
                kecil: false,
            };
        return {
            nilai: formatNumber(dLeft),
            unit: 'hari lagi',
            tone: document.validity === 'expiring_soon' ? '#D99A2B' : '#D4A96A',
            kecil: false,
        };
    })();

    const identitasItems = [
        { label: 'Nomor Dokumen', children: document.document_number ?? 'Tidak tersedia' },
        { label: 'Requirement', children: document.requirement_code ?? 'Tidak ditautkan' },
        { label: 'Tanggal Terbit', children: document.issue_date ? tglPendek(document.issue_date) : 'Tidak tersedia' },
        {
            label: 'Masa Berlaku',
            children: document.has_expiry
                ? document.expiry_date
                    ? tglPendek(document.expiry_date)
                    : 'Tidak tersedia'
                : 'Tanpa masa berlaku',
        },
        {
            label: 'Status Verifikasi',
            children:
                VERIFICATION_STATUS_LABELS[document.verification_status] ??
                document.verification_status,
        },
        { label: 'Penanggung Jawab', children: document.responsible_person ?? 'Tidak tersedia' },
    ];
    const arsipItems = [
        { label: 'Sumber', children: document.source_type === 'terbitan' ? 'Terbitan sistem' : 'Unggahan scan' },
        { label: 'Nomor Arsip', children: document.archive_number ?? 'Tidak tersedia' },
        { label: 'Periode Arsip', children: document.period ?? 'Tidak tersedia' },
        { label: 'Lokasi Arsip', children: document.archive_location ?? 'Tidak tersedia' },
        { label: 'Diunggah oleh', children: document.uploaded_by_name ?? 'Tidak tersedia' },
        { label: 'Terakhir diubah', children: formatDateTime(document.updated_at) },
    ];
    const endorsementItems = [
        {
            label: 'Endorsement Terakhir',
            children: document.endorsement_last_date ? tglPendek(document.endorsement_last_date) : 'Tidak tercatat',
        },
        {
            label: 'Endorsement Berikutnya',
            children: document.endorsement_next_date ? tglPendek(document.endorsement_next_date) : 'Belum dijadwalkan',
        },
    ];

    return (
        <AuthenticatedLayout>
            <Head title={`Dokumen · ${document.document_name}`} />

            <section
                id={`record-doc-${document.id}`}
                className="mb-6 overflow-hidden rounded-2xl border border-[#E7E1D9] bg-white shadow-[0_1px_3px_rgba(28,27,26,0.04),0_8px_24px_-8px_rgba(28,27,26,0.06)]"
            >
                <div className="relative flex flex-col gap-6 p-6 lg:p-7 xl:flex-row xl:items-end xl:justify-between">
                    <div className="min-w-0 max-w-2xl">
                        <Link
                            href="/dokumen"
                            className="inline-flex items-center gap-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-[#8A8580] transition-colors hover:text-[#C1121F]"
                        >
                            <Route size={13} />
                            Register Dokumen
                        </Link>
                        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-[#1C1B1A] sm:text-3xl">
                            {document.document_name}
                        </h1>
                        <p className="mt-2 text-sm text-[#8A8580]">
                            {kategori} · {pemilik}
                        </p>
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                            <span
                                className="inline-flex items-center gap-1.5 rounded-full border border-[#E7E1D9] bg-[#FAF7F2] px-3 py-1 text-xs font-medium text-[#8A8580]"
                            >
                                <span
                                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                                    style={{ background: DOT_VALIDITY_COLOR[document.validity] ?? '#8A8580' }}
                                />
                                {VALIDITY_LABELS[document.validity] ?? document.validity}
                                {sisaHari && ` · ${formatNumber(dLeft)} hari lagi`}
                            </span>
                            <span
                                className="inline-flex items-center gap-1.5 rounded-full border border-[#E7E1D9] bg-[#FAF7F2] px-3 py-1 text-xs font-medium text-[#8A8580]"
                            >
                                <span
                                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                                    style={{ background: DOT_VERIF_COLOR[document.verification_status] ?? '#8A8580' }}
                                />
                                {VERIFICATION_STATUS_LABELS[document.verification_status] ??
                                    document.verification_status}
                            </span>
                            {document.voided_at && (
                                <span
                                    className="inline-flex items-center gap-1.5 rounded-full border border-[#C1121F]/30 bg-[#C1121F]/5 px-3 py-1 text-xs font-medium text-[#C1121F]"
                                >
                                    <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: '#C1121F' }} />
                                    VOID · Dibatalkan
                                </span>
                            )}
                            {document.document_number && (
                                <span className="font-mono text-[11px] tracking-wide text-[#8A8580]">
                                    No. {document.document_number}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row xl:shrink-0">
                        <a href={`/dokumen/${document.id}/download`}>
                            <Button
                                type="primary"
                                icon={<Download size={15} />}
                            >
                                Unduh File
                            </Button>
                        </a>
                        {actions.can_upload_version && (
                            <Button
                                onClick={() => setModal('version')}
                                icon={<Upload size={15} />}
                            >
                                Unggah Versi Baru
                            </Button>
                        )}
                        {actions.can_edit && (
                            <Button
                                onClick={() => setModal('edit')}
                                icon={<Pencil size={15} />}
                            >
                                Edit Metadata
                            </Button>
                        )}
                    </div>
                </div>

                <div
                    className="relative border-t border-[#E7E1D9] p-6 pt-5 lg:p-7 lg:pt-6"
                >
                    <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-[#8A8580]">
                        Masa Berlaku
                    </p>
                    {punyaLinimasa ? (
                        <div className="mt-4">
                            <div className="relative h-4">
                                {pctLinimasa >= 8 && pctLinimasa <= 92 && (
                                    <span
                                        className="absolute bottom-0 -translate-x-1/2 whitespace-nowrap font-mono text-[9px] uppercase tracking-[0.14em] text-[#8A8580]"
                                        style={{ left: `${pctLinimasa}%` }}
                                    >
                                        Hari ini
                                    </span>
                                )}
                            </div>
                            <div className="relative h-1.5 rounded-full bg-[#E7E1D9]">
                                <div
                                    className="absolute inset-y-0 left-0 rounded-full"
                                    style={{
                                        width: `${pctLinimasa}%`,
                                        background: FILL_VALIDITY_COLOR[document.validity] ?? '#2F8F68',
                                    }}
                                />
                                <span
                                    aria-hidden="true"
                                    className="absolute -top-[7px] h-[18px] w-[2px] -translate-x-1/2 rounded-full bg-[#1C1B1A]"
                                    style={{ left: `${pctLinimasa}%` }}
                                />
                            </div>
                            <div className="mt-2.5 flex items-center justify-between font-mono text-[10px] tabular-nums text-[#8A8580]">
                                <span>{tglPendek(document.issue_date)}</span>
                                <span>{tglPendek(document.expiry_date)}</span>
                            </div>
                        </div>
                    ) : document.has_expiry ? (
                        <p className="mt-3 text-sm text-[#8A8580]">
                            Berlaku s/d{' '}
                            <span className="font-semibold tabular-nums text-[#1C1B1A]">
                                {tglPendek(document.expiry_date)}
                            </span>
                        </p>
                    ) : (
                        <div className="mt-4">
                            <div
                                aria-hidden="true"
                                className="h-1.5 rounded-full border border-dashed border-[#E7E1D9]"
                            />
                            <p className="mt-2.5 text-xs text-[#8A8580]">
                                Berlaku tanpa batas waktu; tidak ada tanggal kedaluwarsa pada dokumen ini.
                            </p>
                        </div>
                    )}
                    <dl
                        className="mt-6 flex flex-wrap items-center gap-x-10 gap-y-5 border-t border-[#E7E1D9] pt-5"
                    >
                        <div className="min-w-0">
                            <dt className="font-mono text-[9px] font-medium uppercase tracking-[0.16em] text-[#8A8580]">
                                {document.validity === 'no_expiry'
                                    ? 'Masa Berlaku'
                                    : document.validity === 'expired'
                                      ? 'Masa Terlewat'
                                      : 'Sisa Masa Berlaku'}
                            </dt>
                            <dd className="mt-1 flex items-baseline gap-1.5">
                                {statUtama.kecil ? (
                                    <span className="text-sm font-semibold" style={{ color: statUtama.tone as string }}>
                                        {statUtama.nilai}
                                    </span>
                                ) : (
                                    <span
                                        className="text-2xl font-semibold tabular-nums tracking-tight text-[#1C1B1A]"
                                        style={{ color: statUtama.tone as string }}
                                    >
                                        {statUtama.nilai}
                                    </span>
                                )}
                                {statUtama.unit && (
                                    <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#8A8580]">
                                        {statUtama.unit}
                                    </span>
                                )}
                            </dd>
                        </div>
                        <div className="min-w-0">
                            <dt className="font-mono text-[9px] font-medium uppercase tracking-[0.16em] text-[#8A8580]">
                                Tanggal Terbit
                            </dt>
                            <dd className="mt-1 text-sm font-semibold tabular-nums text-[#1C1B1A]">
                                {document.issue_date ? tglPendek(document.issue_date) : 'Tidak tersedia'}
                            </dd>
                        </div>
                        <div className="min-w-0">
                            <dt className="font-mono text-[9px] font-medium uppercase tracking-[0.16em] text-[#8A8580]">
                                Berlaku s/d
                            </dt>
                            <dd className="mt-1 text-sm font-semibold tabular-nums text-[#1C1B1A]">
                                {document.has_expiry
                                    ? document.expiry_date
                                        ? tglPendek(document.expiry_date)
                                        : 'Tidak tersedia'
                                    : 'Tanpa masa berlaku'}
                            </dd>
                        </div>
                    </dl>
                </div>

                {(document.validity === 'expired' || document.validity === 'expiring_soon') && (
                    <div
                        className="relative flex items-start gap-3 border-t p-4 lg:px-7"
                        style={{
                            borderColor: document.validity === 'expired' ? 'rgba(193,18,31,0.25)' : 'rgba(217,154,43,0.25)',
                            background: document.validity === 'expired' ? 'rgba(193,18,31,0.1)' : 'rgba(217,154,43,0.1)',
                        }}
                    >
                        <AlertTriangle
                            size={18}
                            className="mt-0.5 shrink-0"
                            style={{ color: document.validity === 'expired' ? '#C1121F' : '#D99A2B' }}
                        />
                        <div className="text-sm">
                            <p className="font-semibold text-[#1C1B1A]">
                                {document.validity === 'expired'
                                    ? 'Dokumen sudah kedaluwarsa'
                                    : 'Mendekati kedaluwarsa'}
                            </p>
                            <p className="text-[#8A8580]">
                                {document.validity === 'expired'
                                    ? `Berlaku s/d ${tglPendek(document.expiry_date)}${
                                          dLeft != null
                                              ? ` (lewat ${formatNumber(Math.abs(dLeft))} hari)`
                                              : ''
                                      }. Perbarui dokumen dan unggah versi baru.`
                                    : `Berlaku s/d ${tglPendek(document.expiry_date)}${
                                          dLeft != null ? `, tersisa ${formatNumber(dLeft)} hari` : ''
                                      }. Siapkan dokumen pengganti sebelum batas waktu.`}
                            </p>
                        </div>
                    </div>
                )}
            </section>

            {(actions.can_submit || actions.can_verify || actions.can_edit || document.can_void) && (
                <Card className="mb-6">
                    <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-[#8A8580]">
                        Alur Dokumen
                    </p>
                    <h2 className="mt-1 text-sm font-semibold text-[#1C1B1A]">Verifikasi & Tindakan</h2>

                    {actions.can_submit && (
                        <div className="mt-5">
                            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-[#8A8580]">
                                Pengajuan
                            </p>
                            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#8A8580]">
                                Dokumen belum diajukan. Ajukan agar supervisor dapat memeriksa
                                kelengkapan dan menetapkan keputusan.
                            </p>
                            <form onSubmit={action('submit')} className="mt-3">
                                <Button type="primary" htmlType="submit" disabled={processing}>
                                    Ajukan ke Supervisor
                                </Button>
                            </form>
                        </div>
                    )}

                    {actions.can_verify && (
                        <div className={`mt-5 ${actions.can_submit ? 'border-t border-[#E7E1D9] pt-5' : ''}`}>
                            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-[#8A8580]">
                                Keputusan Supervisor
                            </p>
                            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#8A8580]">
                                Tetapkan keputusan atas dokumen ini. Keputusan beserta komentarnya
                                tercatat permanen pada Histori Persetujuan.
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <form onSubmit={action('verify')}>
                                    <Button
                                        type="primary"
                                        htmlType="submit"
                                        disabled={processing}
                                        icon={<CheckCircle2 size={16} />}
                                        style={{ background: '#2F8F68', borderColor: '#2F8F68' }}
                                    >
                                        Setujui (Verifikasi)
                                    </Button>
                                </form>
                                <Button
                                    onClick={() => setModal('revision')}
                                    icon={<MessageSquare size={16} />}
                                    style={{
                                        borderColor: 'rgba(217,154,43,0.4)',
                                        background: 'rgba(217,154,43,0.1)',
                                        color: '#D99A2B',
                                    }}
                                >
                                    Minta Revisi
                                </Button>
                                <Button
                                    onClick={() => setModal('reject')}
                                    icon={<ShieldX size={16} />}
                                    style={{
                                        borderColor: 'rgba(193,18,31,0.4)',
                                        background: 'rgba(193,18,31,0.1)',
                                        color: '#C1121F',
                                    }}
                                >
                                    Tolak
                                </Button>
                            </div>
                        </div>
                    )}

                    {(actions.can_edit || document.can_void) && (
                        <div
                            className={`mt-5 ${
                                actions.can_submit || actions.can_verify
                                    ? 'border-t border-[#E7E1D9] pt-5'
                                    : ''
                            }`}
                        >
                            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-[#8A8580]">
                                Tindakan Lanjutan
                            </p>
                            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#8A8580]">
                                Pengarsipan menyembunyikan dokumen dari register, sedangkan void
                                menandai terbitan batal. Keduanya tidak menghapus berkas dari penyimpanan.
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                                {actions.can_edit && (
                                    <Button
                                        onClick={() => setModal('archive')}
                                        icon={<Archive size={16} />}
                                    >
                                        Arsipkan
                                    </Button>
                                )}
                                {document.can_void && (
                                    <Button
                                        onClick={() => setModal('void')}
                                        icon={<ShieldX size={16} />}
                                        danger
                                    >
                                        Void (Batalkan Terbitan)
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </Card>
            )}

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
                <section className="min-w-0 rounded-2xl border border-[#E7E1D9] bg-white shadow-sm xl:col-span-2">
                    <header className="flex items-center justify-between gap-3 border-b border-[#E7E1D9] px-5 py-4 lg:px-6">
                        <h2 className="text-sm font-semibold text-[#1C1B1A]">Register Dokumen</h2>
                        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8A8580]">
                            {formatNumber(versions.length)} versi · {formatNumber((relations ?? []).length)} relasi
                        </span>
                    </header>
                    <div className="p-5 lg:p-6">
                        <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-[#8A8580]">
                            Identitas
                        </p>
                        <Descriptions
                            column={{ xs: 1, sm: 2, md: 3 }}
                            className="mt-3"
                            items={identitasItems}
                            labelStyle={{
                                fontFamily: 'monospace',
                                fontSize: 10,
                                fontWeight: 500,
                                textTransform: 'uppercase',
                                letterSpacing: '0.14em',
                                color: '#8A8580',
                                paddingBottom: 4,
                            }}
                            contentStyle={{
                                fontSize: 14,
                                fontWeight: 500,
                                color: '#1C1B1A',
                                paddingBottom: 16,
                            }}
                        />

                        <div className="mt-6 border-t border-[#E7E1D9] pt-5">
                            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-[#8A8580]">
                                Arsip & Sumber
                            </p>
                            <Descriptions
                                column={{ xs: 1, sm: 2, md: 3 }}
                                className="mt-3"
                                items={arsipItems}
                                labelStyle={{
                                    fontFamily: 'monospace',
                                    fontSize: 10,
                                    fontWeight: 500,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.14em',
                                    color: '#8A8580',
                                    paddingBottom: 4,
                                }}
                                contentStyle={{
                                    fontSize: 14,
                                    fontWeight: 500,
                                    color: '#1C1B1A',
                                    paddingBottom: 16,
                                }}
                            />
                        </div>

                        <div className="mt-6 border-t border-[#E7E1D9] pt-5">
                            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-[#8A8580]">
                                Endorsement
                            </p>
                            {document.has_endorsement ? (
                                <>
                                    <Descriptions
                                        column={{ xs: 1, sm: 2, md: 3 }}
                                        className="mt-3"
                                        items={endorsementItems.map((item) => ({
                                            ...item,
                                            children:
                                                item.label === 'Endorsement Berikutnya' &&
                                                document.endorsement_days_left != null
                                                    ? `${item.children} (${formatNumber(document.endorsement_days_left)} hari lagi)`
                                                    : item.children,
                                        }))}
                                        labelStyle={{
                                            fontFamily: 'monospace',
                                            fontSize: 10,
                                            fontWeight: 500,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.14em',
                                            color: '#8A8580',
                                            paddingBottom: 4,
                                        }}
                                        contentStyle={{
                                            fontSize: 14,
                                            fontWeight: 500,
                                            color: '#1C1B1A',
                                            paddingBottom: 16,
                                        }}
                                    />
                                    <p className="mt-3 text-xs leading-relaxed text-[#8A8580]">
                                        Siklus endorsement berlaku untuk dokumen seperti Surat Laut
                                        dan Sertifikat Klasifikasi.
                                    </p>
                                </>
                            ) : (
                                <p className="mt-3 text-sm leading-relaxed text-[#8A8580]">
                                    Dokumen ini tidak mengikuti siklus endorsement.
                                </p>
                            )}
                        </div>

                        {document.voided_at && (
                            <div
                                className="mt-6 flex items-start gap-3 rounded-xl border p-4"
                                style={{
                                    borderColor: 'rgba(193,18,31,0.3)',
                                    background: 'rgba(193,18,31,0.06)',
                                }}
                            >
                                <ShieldX size={18} className="mt-0.5 shrink-0" style={{ color: '#C1121F' }} />
                                <div className="text-sm">
                                    <p className="font-semibold" style={{ color: '#C1121F' }}>
                                        Terbitan dibatalkan (VOID)
                                    </p>
                                    <p className="mt-0.5 text-[#1C1B1A]">
                                        Dibatalkan {formatDateTime(document.voided_at)}
                                        {document.void_reason ? ` · Alasan: ${document.void_reason}` : ''}
                                    </p>
                                </div>
                            </div>
                        )}

                        {document.notes && (
                            <div
                                className="mt-6 rounded-xl border p-4"
                                style={{ borderColor: '#E7E1D9', background: '#FAF7F2' }}
                            >
                                <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-[#8A8580]">
                                    Catatan
                                </p>
                                <p className="mt-2 text-sm leading-relaxed text-[#1C1B1A]">{document.notes}</p>
                            </div>
                        )}

                        <div className="mt-6 border-t border-[#E7E1D9] pt-5">
                            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-[#8A8580]">
                                Tertaut ke Perjalanan · {formatNumber(voyages.length)}
                            </p>
                            {voyages.length === 0 ? (
                                <p className="mt-3 text-sm leading-relaxed text-[#8A8580]">
                                    Belum ditautkan ke perjalanan mana pun. Dokumen dapat dipakai
                                    ulang pada perjalanan berikutnya tanpa perlu unggah ulang.
                                </p>
                            ) : (
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {voyages.map((v) => (
                                        <Link key={v.id} href={`/perjalanan/${v.id}`}>
                                            <span
                                                className="inline-flex items-center rounded-lg border px-2.5 py-1.5 font-mono text-[11px] font-medium text-[#1C1B1A] transition-colors hover:text-[#C1121F]"
                                                style={{ borderColor: '#E7E1D9' }}
                                            >
                                                {v.voyage_code}
                                            </span>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="mt-6 border-t border-[#E7E1D9] pt-5">
                            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-[#8A8580]">
                                Dokumen Terkait · {formatNumber((relations ?? []).length)}
                            </p>
                            {(relations ?? []).length === 0 ? (
                                <p className="mt-3 text-sm leading-relaxed text-[#8A8580]">
                                    Belum ada relasi dengan dokumen lain. Relasi dibuat otomatis
                                    oleh sistem, misalnya saat invoice terbit dari SPAL, FP
                                    melampiri invoice, atau bukti bayar terkait bill.
                                </p>
                            ) : (
                                <ul className="mt-3 space-y-2">
                                    {(relations ?? []).map((r: any) => (
                                        <li
                                            key={r.id}
                                            className="flex items-center justify-between gap-3 rounded-lg border border-[#E7E1D9] px-3 py-2.5 transition-colors hover:border-[rgba(193,18,31,0.4)]"
                                        >
                                            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                                                <Badge tone="neutral">{r.relation_type}</Badge>
                                                <span className="text-[11px] uppercase tracking-wide text-[#8A8580]">
                                                    {r.direction}
                                                </span>
                                                {r.related?.id ? (
                                                    <Link
                                                        href={`/dokumen/${r.related.id}`}
                                                        className="truncate text-sm font-medium text-[#C1121F] hover:underline"
                                                    >
                                                        {r.related.document_name}
                                                    </Link>
                                                ) : (
                                                    <span className="text-sm text-[#8A8580]">(terhapus)</span>
                                                )}
                                            </div>
                                            <span className="shrink-0 font-mono text-[11px] tabular-nums text-[#8A8580]">
                                                {r.related?.document_number ?? ''}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </section>

                <div className="min-w-0 space-y-5">
                    <Card
                        title="Riwayat Versi"
                        actions={
                            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8A8580]">
                                {formatNumber(versions.length)} tersimpan
                            </span>
                        }
                    >
                        <ol className="relative">
                            <span
                                aria-hidden="true"
                                className="absolute bottom-3 left-[5px] top-3 w-px"
                                style={{ background: '#E7E1D9' }}
                            />
                            {versions.map((v) => (
                                <li key={v.id} className="relative pb-5 ps-6 last:pb-0">
                                    <span
                                        aria-hidden="true"
                                        className="absolute left-0 top-4 h-2.5 w-2.5 rounded-full"
                                        style={{
                                            background: v.is_current ? '#D4A96A' : 'transparent',
                                            border: v.is_current ? 'none' : '2px solid #E7E1D9',
                                        }}
                                    />
                                    <div
                                        className="rounded-xl border p-3.5"
                                        style={{
                                            borderColor: v.is_current ? 'rgba(212,169,106,0.5)' : '#E7E1D9',
                                            background: v.is_current ? 'rgba(212,169,106,0.06)' : 'transparent',
                                        }}
                                    >
                                        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                                            <p className="flex items-center gap-2 text-sm font-semibold text-[#1C1B1A]">
                                                v{v.version_number}
                                                {v.is_current && (
                                                    <span
                                                        className="rounded px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-[#1C1B1A]"
                                                        style={{ background: '#D4A96A' }}
                                                    >
                                                        Aktif
                                                    </span>
                                                )}
                                            </p>
                                            <p className="font-mono text-[10px] tabular-nums text-[#8A8580]">
                                                {formatDateTime(v.uploaded_at)}
                                            </p>
                                        </div>
                                        <p className="mt-1.5 text-xs leading-relaxed text-[#8A8580]">
                                            {v.revision_notes || 'Tanpa catatan revisi'} ·{' '}
                                            {v.uploaded_by ?? 'Tidak diketahui'}
                                            {v.file_size ? ` · ${(v.file_size / 1024).toFixed(1)} KB` : ''}
                                        </p>
                                    </div>
                                </li>
                            ))}
                        </ol>
                    </Card>

                    <Card
                        title="Histori Persetujuan"
                        actions={
                            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8A8580]">
                                Keputusan supervisor
                            </span>
                        }
                    >
                        {approvals.length === 0 ? (
                            <p className="text-sm leading-relaxed text-[#8A8580]">
                                Belum ada keputusan supervisor.
                            </p>
                        ) : (
                            <ol className="relative">
                                <span
                                    aria-hidden="true"
                                    className="absolute bottom-3 left-[5px] top-3 w-px"
                                    style={{ background: '#E7E1D9' }}
                                />
                                {approvals.map((a) => {
                                    const disetujui = a.approval_status === 'approved';
                                    const ditolak = a.approval_status === 'rejected';
                                    return (
                                        <li key={a.id} className="relative pb-5 ps-6 last:pb-0">
                                            <span
                                                aria-hidden="true"
                                                className="absolute left-0 top-4 h-2.5 w-2.5 rounded-full"
                                                style={{
                                                    background: disetujui
                                                        ? '#2F8F68'
                                                        : ditolak
                                                          ? '#C1121F'
                                                          : '#D99A2B',
                                                }}
                                            />
                                            <div className="rounded-xl border border-[#E7E1D9] p-3.5">
                                                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                                                    <Badge
                                                        tone={
                                                            disetujui
                                                                ? 'success'
                                                                : ditolak
                                                                  ? 'danger'
                                                                  : 'warning'
                                                        }
                                                    >
                                                        {disetujui
                                                            ? 'Disetujui'
                                                            : ditolak
                                                              ? 'Ditolak'
                                                              : 'Perlu Revisi'}
                                                    </Badge>
                                                    <p className="font-mono text-[10px] tabular-nums text-[#8A8580]">
                                                        {formatDateTime(a.decision_timestamp)}
                                                    </p>
                                                </div>
                                                <p className="mt-1.5 text-xs text-[#8A8580]">
                                                    {a.approver_name} · persetujuan internal
                                                </p>
                                                {a.comments && (
                                                    <p
                                                        className="mt-2 border-s-2 ps-3 text-sm italic leading-relaxed text-[#1C1B1A]"
                                                        style={{ borderColor: '#E7E1D9' }}
                                                    >
                                                        "{a.comments}"
                                                    </p>
                                                )}
                                            </div>
                                        </li>
                                    );
                                })}
                            </ol>
                        )}
                        <div
                            className="mt-4 rounded-lg p-3 text-[11px] leading-relaxed text-[#8A8580]"
                            style={{ background: '#FAF7F2' }}
                        >
                            Persetujuan di sistem ini adalah{' '}
                            <strong className="font-semibold text-[#1C1B1A]">verifikasi internal</strong>,
                            bukan persetujuan resmi dari otoritas pelayaran.
                        </div>
                    </Card>
                </div>
            </div>

            <Modal show={modal === 'revision' || modal === 'reject'} onClose={() => setModal(null)} maxWidth="md">
                <form onSubmit={action(modal === 'reject' ? 'reject' : 'revision')}>
                    <ModalKepala
                        eyebrow="Keputusan Supervisor"
                        judul={modal === 'reject' ? 'Tolak Dokumen' : 'Minta Revisi Dokumen'}
                        onClose={() => setModal(null)}
                    />
                    <div className="p-5">
                        <p className="text-sm leading-relaxed text-[#8A8580]">
                            Alasan {modal === 'reject' ? 'penolakan' : 'revisi'} wajib diisi dan
                            akan tersimpan pada histori persetujuan.
                        </p>
                        <label className="mt-4 block text-xs font-medium text-[#8A8580]">
                            Alasan / Komentar *
                        </label>
                        <Input.TextArea
                            rows={4}
                            value={data.comments}
                            onChange={(e) => setData('comments', e.target.value)}
                            placeholder={
                                modal === 'reject'
                                    ? 'Tuliskan alasan penolakan…'
                                    : 'Tuliskan bagian yang perlu diperbaiki…'
                            }
                            className="mt-1"
                        />
                        {errors.comments && (
                            <p className="mt-1 text-xs text-[#C1121F]">{errors.comments}</p>
                        )}
                        <div className="mt-5 flex justify-end gap-3">
                            <Button onClick={() => setModal(null)}>Batal</Button>
                            <Button
                                type="primary"
                                htmlType="submit"
                                disabled={processing || !data.comments.trim()}
                                style={
                                    modal === 'reject'
                                        ? undefined
                                        : { background: '#D99A2B', borderColor: '#D99A2B' }
                                }
                                danger={modal === 'reject'}
                            >
                                {modal === 'reject' ? 'Tolak Dokumen' : 'Kirim Revisi'}
                            </Button>
                        </div>
                    </div>
                </form>
            </Modal>

            <Modal show={modal === 'version'} onClose={() => setModal(null)} maxWidth="md">
                <form onSubmit={uploadVersion}>
                    <ModalKepala
                        eyebrow="Kontrol Versi"
                        judul="Unggah Versi Baru"
                        onClose={() => setModal(null)}
                    />
                    <div className="p-5">
                        <p className="text-sm leading-relaxed text-[#8A8580]">
                            Versi lama tetap tersimpan sebagai jejak audit. Setelah versi baru
                            diunggah, status dokumen kembali ke Terunggah.
                        </p>
                        <label className="mt-4 block text-xs font-medium text-[#8A8580]">Berkas *</label>
                        <Input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => setData('file', (e.target as HTMLInputElement).files?.[0] ?? null)}
                            className="mt-1"
                        />
                        {errors.file && (
                            <p className="mt-1 text-xs text-[#C1121F]">{errors.file}</p>
                        )}
                        <label className="mt-4 block text-xs font-medium text-[#8A8580]">Catatan Revisi</label>
                        <Input
                            value={data.revision_notes}
                            onChange={(e) => setData('revision_notes', e.target.value)}
                            placeholder="mis. Perbaikan nomor dokumen"
                            className="mt-1"
                        />
                        <div className="mt-5 flex justify-end gap-3">
                            <Button onClick={() => setModal(null)}>Batal</Button>
                            <Button type="primary" htmlType="submit" disabled={processing || !data.file}>
                                Simpan Versi
                            </Button>
                        </div>
                    </div>
                </form>
            </Modal>

            <Modal show={modal === 'edit'} onClose={() => setModal(null)} maxWidth="lg">
                <form onSubmit={submitEdit}>
                    <ModalKepala
                        eyebrow="Metadata"
                        judul="Edit Metadata Dokumen"
                        onClose={() => setModal(null)}
                    />
                    <div className="p-5">
                        <p className="text-xs leading-relaxed text-[#8A8580]">
                            Perubahan tercatat pada audit trail dan berkas tidak ikut berubah.
                            Gunakan Unggah Versi Baru bila berkasnya perlu diganti.
                        </p>
                        <Row gutter={16} className="mt-4">
                            <Col span={24}>
                                <label className="block text-xs font-medium text-[#8A8580]">Nama Dokumen *</label>
                                <Input
                                    value={editForm.data.document_name}
                                    onChange={(e) => editForm.setData('document_name', e.target.value)}
                                    className="mt-1"
                                />
                                {editForm.errors.document_name && (
                                    <p className="mt-1 text-xs text-[#C1121F]">{editForm.errors.document_name}</p>
                                )}
                            </Col>
                            <Col span={12}>
                                <label className="mt-4 block text-xs font-medium text-[#8A8580]">Kategori *</label>
                                <Select
                                    value={editForm.data.category_id ? String(editForm.data.category_id) : ''}
                                    onChange={(v) => editForm.setData('category_id', Number(v))}
                                    style={{ width: '100%', marginTop: 4 }}
                                    options={(categories ?? []).map((c) => ({
                                        value: String(c.id),
                                        label: `${c.code} · ${c.name}`,
                                    }))}
                                />
                                {editForm.errors.category_id && (
                                    <p className="mt-1 text-xs text-[#C1121F]">{editForm.errors.category_id}</p>
                                )}
                            </Col>
                            <Col span={12}>
                                <label className="mt-4 block text-xs font-medium text-[#8A8580]">
                                    Requirement (kelengkapan)
                                </label>
                                <Select
                                    value={editForm.data.requirement_code || undefined}
                                    onChange={(v) => editForm.setData('requirement_code', v)}
                                    style={{ width: '100%', marginTop: 4 }}
                                    placeholder="Tidak ditautkan"
                                    options={[
                                        { value: '', label: 'Tidak ditautkan' },
                                        ...(requirements ?? []).map((r) => ({
                                            value: r.code,
                                            label: `${r.group_code} · ${r.name}`,
                                        })),
                                    ]}
                                />
                            </Col>
                            <Col span={12}>
                                <label className="mt-4 block text-xs font-medium text-[#8A8580]">Nomor Dokumen</label>
                                <Input
                                    value={editForm.data.document_number}
                                    onChange={(e) => editForm.setData('document_number', e.target.value)}
                                    className="mt-1"
                                />
                            </Col>
                            <Col span={12}>
                                <label className="mt-4 block text-xs font-medium text-[#8A8580]">Tanggal Terbit</label>
                                <Input
                                    type="date"
                                    value={editForm.data.issue_date}
                                    onChange={(e) => editForm.setData('issue_date', e.target.value)}
                                    className="mt-1"
                                />
                            </Col>
                            <Col span={24}>
                                <div
                                    className="mt-4 rounded-xl border p-4"
                                    style={{ borderColor: '#E7E1D9', background: '#FAF7F2' }}
                                >
                                    <Checkbox
                                        checked={editForm.data.has_expiry}
                                        onChange={(e) => editForm.setData('has_expiry', e.target.checked)}
                                    >
                                        <span className="text-sm text-[#1C1B1A]">Punya masa berlaku</span>
                                    </Checkbox>
                                    {editForm.data.has_expiry && (
                                        <div className="mt-3 max-w-xs">
                                            <label className="block text-xs font-medium text-[#8A8580]">Berlaku s/d *</label>
                                            <Input
                                                type="date"
                                                value={editForm.data.expiry_date}
                                                onChange={(e) => editForm.setData('expiry_date', e.target.value)}
                                                className="mt-1"
                                            />
                                            {editForm.errors.expiry_date && (
                                                <p className="mt-1 text-xs text-[#C1121F]">{editForm.errors.expiry_date}</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </Col>
                            <Col span={24}>
                                <div
                                    className="mt-4 rounded-xl border p-4"
                                    style={{ borderColor: 'rgba(217,154,43,0.3)', background: 'rgba(217,154,43,0.05)' }}
                                >
                                    <Checkbox
                                        checked={editForm.data.has_endorsement}
                                        onChange={(e) => editForm.setData('has_endorsement', e.target.checked)}
                                    >
                                        <span className="text-sm text-[#1C1B1A]">
                                            Punya siklus <strong>endorsement</strong> (Surat Laut &
                                            Sertifikat Klasifikasi)
                                        </span>
                                    </Checkbox>
                                    {editForm.data.has_endorsement && (
                                        <Row gutter={12} className="mt-3 max-w-md">
                                            <Col span={12}>
                                                <label className="block text-xs font-medium text-[#8A8580]">
                                                    Endorsement Terakhir
                                                </label>
                                                <Input
                                                    type="date"
                                                    value={editForm.data.endorsement_last_date}
                                                    onChange={(e) =>
                                                        editForm.setData('endorsement_last_date', e.target.value)
                                                    }
                                                    className="mt-1"
                                                />
                                            </Col>
                                            <Col span={12}>
                                                <label className="block text-xs font-medium text-[#8A8580]">
                                                    Endorsement Berikutnya *
                                                </label>
                                                <Input
                                                    type="date"
                                                    value={editForm.data.endorsement_next_date}
                                                    onChange={(e) =>
                                                        editForm.setData('endorsement_next_date', e.target.value)
                                                    }
                                                    className="mt-1"
                                                />
                                            </Col>
                                        </Row>
                                    )}
                                </div>
                            </Col>
                            <Col span={12}>
                                <label className="mt-4 block text-xs font-medium text-[#8A8580]">Penanggung Jawab</label>
                                <Input
                                    value={editForm.data.responsible_person}
                                    onChange={(e) => editForm.setData('responsible_person', e.target.value)}
                                    className="mt-1"
                                />
                            </Col>
                            <Col span={12}>
                                <label className="mt-4 block text-xs font-medium text-[#8A8580]">Lokasi Arsip</label>
                                <Input
                                    value={editForm.data.archive_location}
                                    onChange={(e) => editForm.setData('archive_location', e.target.value)}
                                    className="mt-1"
                                />
                            </Col>
                            <Col span={24}>
                                <label className="mt-4 block text-xs font-medium text-[#8A8580]">Catatan</label>
                                <Input.TextArea
                                    rows={3}
                                    value={editForm.data.notes}
                                    onChange={(e) => editForm.setData('notes', e.target.value)}
                                    className="mt-1"
                                />
                            </Col>
                        </Row>
                        <div className="mt-5 flex justify-end gap-3">
                            <Button onClick={() => setModal(null)}>Batal</Button>
                            <Button type="primary" htmlType="submit" loading={editForm.processing}>
                                Simpan Perubahan
                            </Button>
                        </div>
                    </div>
                </form>
            </Modal>

            <Modal show={modal === 'archive'} onClose={() => setModal(null)} maxWidth="md">
                <div>
                    <ModalKepala
                        eyebrow="Pengarsipan"
                        judul="Arsipkan dokumen ini?"
                        onClose={() => setModal(null)}
                    />
                    <div className="p-5">
                        <div className="flex items-start gap-3">
                            <span
                                className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                                style={{ background: 'rgba(217,154,43,0.1)', color: '#D99A2B' }}
                            >
                                <AlertTriangle size={18} />
                            </span>
                            <p className="text-sm leading-relaxed text-[#1C1B1A]">
                                Dokumen{' '}
                                <strong className="font-semibold">{document.document_name}</strong>{' '}
                                akan disembunyikan dari register (soft delete). Berkas tetap
                                tersimpan di penyimpanan privat.
                            </p>
                        </div>
                        <div className="mt-5 flex justify-end gap-3">
                            <Button onClick={() => setModal(null)} disabled={busy}>
                                Batal
                            </Button>
                            <Button
                                type="primary"
                                onClick={() => {
                                    setBusy(true);
                                    router.post(`/dokumen/${document.id}/archive`, {}, {
                                        onFinish: () => {
                                            setBusy(false);
                                            setModal(null);
                                        },
                                    });
                                }}
                                loading={busy}
                                style={{ background: '#D99A2B', borderColor: '#D99A2B' }}
                            >
                                {busy ? 'Memproses…' : 'Arsipkan'}
                            </Button>
                        </div>
                    </div>
                </div>
            </Modal>

            <Modal show={modal === 'void'} onClose={() => setModal(null)} maxWidth="md">
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        setBusy(true);
                        router.post(
                            `/dokumen/${document.id}/void`,
                            { reason: voidReason },
                            {
                                preserveScroll: true,
                                onFinish: () => {
                                    setBusy(false);
                                    setModal(null);
                                    setVoidReason('');
                                },
                            },
                        );
                    }}
                >
                    <ModalKepala
                        eyebrow="Pembatalan Terbitan"
                        judul="Void Dokumen Terbitan?"
                        onClose={() => setModal(null)}
                    />
                    <div className="p-5">
                        <p className="text-sm leading-relaxed text-[#8A8580]">
                            <strong className="font-semibold text-[#1C1B1A]">
                                {document.document_number || document.document_name}
                            </strong>{' '}
                            akan ditandai sebagai dibatalkan. Nomor tidak dipakai ulang dan berkas
                            tetap tersimpan sebagai arsip.
                        </p>
                        <label className="mt-4 block text-xs font-medium text-[#8A8580]">Alasan void *</label>
                        <Input.TextArea
                            rows={3}
                            value={voidReason}
                            onChange={(e) => setVoidReason(e.target.value)}
                            placeholder="mis. Salah ketik nomor surat"
                            className="mt-1"
                        />
                        <div className="mt-5 flex justify-end gap-3">
                            <Button onClick={() => setModal(null)}>Batal</Button>
                            <Button
                                type="primary"
                                htmlType="submit"
                                disabled={busy || !voidReason.trim()}
                                loading={busy}
                            >
                                {busy ? 'Memproses…' : 'Ya, Void'}
                            </Button>
                        </div>
                    </div>
                </form>
            </Modal>
        </AuthenticatedLayout>
    );
}
