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
    Eye,
    FileText,
    Maximize2,
    MessageSquare,
    Pencil,
    Route,
    ShieldX,
    Upload,
    X,
} from 'lucide-react';
import { FormEvent, useState } from 'react';

const DOT_VALIDITY_COLOR: Record<string, string> = {
    normal: '#15803D',
    expiring_soon: '#B45309',
    expired: '#BA0C2F',
    no_expiry: 'rgba(255,255,255,0.5)',
};
const DOT_VERIF_COLOR: Record<string, string> = {
    verified: '#15803D',
    under_review: '#00205B',
    revision_required: '#B45309',
    rejected: '#BA0C2F',
    uploaded: '#00205B',
    draft: '#5B6474',
    missing: '#BA0C2F',
    archived: '#5B6474',
};

const FILL_VALIDITY_COLOR: Record<string, string> = {
    normal: '#15803D',
    expiring_soon: '#B45309',
    expired: '#BA0C2F',
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

// Tentukan MIME dari ekstensi path bila metadata versi tidak tersedia.
const mimeDariPath = (path?: string | null): string | null => {
    if (!path) return null;
    const ext = path.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return 'application/pdf';
    if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
    if (ext === 'png') return 'image/png';
    return null;
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
            className="relative overflow-hidden border-b border-[#E3E8F0] bg-[#F5F7FA] px-5 py-4"
        >
            <div
                aria-hidden="true"
                className="absolute inset-x-6 top-0 h-px"
                style={{ background: 'linear-gradient(to right, transparent, rgba(0,32,91,0.3), transparent)' }}
            />
            <div className="pe-12">
                <p className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-[#5B6474]">
                    {eyebrow}
                </p>
                <h2 className="mt-1 text-base font-semibold text-[#111827]">{judul}</h2>
            </div>
            <button
                type="button"
                onClick={onClose}
                aria-label="Tutup"
                className="absolute end-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E3E8F0] bg-white text-[#5B6474] transition-colors hover:bg-[#F5F7FA] hover:text-[#111827]"
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
    const [zoomPreview, setZoomPreview] = useState(false);

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

    // Pratinjau berkas: pakai versi terkini bila ada, fallback ke berkas dokumen.
    const currentVersion = (versions ?? []).find((v: any) => v.is_current) ?? (versions ?? [])[0];
    const previewMime = currentVersion?.file_mime ?? mimeDariPath(document.file_path);
    const previewVersionId = currentVersion?.id;
    const previewUrl = `/dokumen/${document.id}/preview${previewVersionId ? `/${previewVersionId}` : ''}`;
    const previewKind: 'pdf' | 'image' | 'none' =
        previewMime === 'application/pdf'
            ? 'pdf'
            : previewMime === 'image/jpeg' || previewMime === 'image/png'
              ? 'image'
              : 'none';
    const hasFile = Boolean(document.file_path) || document.source_type === 'terbitan';

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
            return { nilai: 'Tanpa batas', unit: '', tone: 'rgba(255,255,255,0.8)', kecil: true };
        if (dLeft == null)
            return { nilai: 'Tidak tersedia', unit: '', tone: 'rgba(255,255,255,0.7)', kecil: true };
        if (document.validity === 'expired')
            return {
                nilai: formatNumber(Math.abs(dLeft)),
                unit: 'hari lewat',
                tone: '#BA0C2F',
                kecil: false,
            };
        return {
            nilai: formatNumber(dLeft),
            unit: 'hari lagi',
            tone: document.validity === 'expiring_soon' ? '#B45309' : '#00205B',
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
                className="mb-6 overflow-hidden rounded-2xl border border-[#E3E8F0] bg-white shadow-[0_1px_3px_rgba(17,24,39,0.04),0_8px_24px_-8px_rgba(17,24,39,0.06)]"
            >
                <div className="relative flex flex-col gap-6 p-6 lg:p-7 xl:flex-row xl:items-end xl:justify-between">
                    <div className="min-w-0 max-w-2xl">
                        <Link
                            href="/dokumen"
                            className="inline-flex items-center gap-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-[#5B6474] transition-colors hover:text-[#BA0C2F]"
                        >
                            <Route size={13} />
                            Register Dokumen
                        </Link>
                        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-[#111827] sm:text-3xl">
                            {document.document_name}
                        </h1>
                        <p className="mt-2 text-sm text-[#5B6474]">
                            {kategori} · {pemilik}
                        </p>
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                            <span
                                className="inline-flex items-center gap-1.5 rounded-full border border-[#E3E8F0] bg-[#F5F7FA] px-3 py-1 text-xs font-medium text-[#5B6474]"
                            >
                                <span
                                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                                    style={{ background: DOT_VALIDITY_COLOR[document.validity] ?? '#5B6474' }}
                                />
                                {VALIDITY_LABELS[document.validity] ?? document.validity}
                                {sisaHari && ` · ${formatNumber(dLeft)} hari lagi`}
                            </span>
                            <span
                                className="inline-flex items-center gap-1.5 rounded-full border border-[#E3E8F0] bg-[#F5F7FA] px-3 py-1 text-xs font-medium text-[#5B6474]"
                            >
                                <span
                                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                                    style={{ background: DOT_VERIF_COLOR[document.verification_status] ?? '#5B6474' }}
                                />
                                {VERIFICATION_STATUS_LABELS[document.verification_status] ??
                                    document.verification_status}
                            </span>
                            {document.voided_at && (
                                <span
                                    className="inline-flex items-center gap-1.5 rounded-full border border-[#BA0C2F]/30 bg-[#BA0C2F]/5 px-3 py-1 text-xs font-medium text-[#BA0C2F]"
                                >
                                    <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: '#BA0C2F' }} />
                                    VOID · Dibatalkan
                                </span>
                            )}
                            {document.document_number && (
                                <span className="font-mono text-[11px] tracking-wide text-[#5B6474]">
                                    No. {document.document_number}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row xl:shrink-0">
                        <a href="#doc-preview">
                            <Button icon={<Eye size={15} />}>
                                Pratinjau
                            </Button>
                        </a>
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
                    className="relative border-t border-[#E3E8F0] p-6 pt-5 lg:p-7 lg:pt-6"
                >
                    <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-[#5B6474]">
                        Masa Berlaku
                    </p>
                    {punyaLinimasa ? (
                        <div className="mt-4">
                            <div className="relative h-4">
                                {pctLinimasa >= 8 && pctLinimasa <= 92 && (
                                    <span
                                        className="absolute bottom-0 -translate-x-1/2 whitespace-nowrap font-mono text-[9px] uppercase tracking-[0.14em] text-[#5B6474]"
                                        style={{ left: `${pctLinimasa}%` }}
                                    >
                                        Hari ini
                                    </span>
                                )}
                            </div>
                            <div className="relative h-1.5 rounded-full bg-[#E3E8F0]">
                                <div
                                    className="absolute inset-y-0 left-0 rounded-full"
                                    style={{
                                        width: `${pctLinimasa}%`,
                                        background: FILL_VALIDITY_COLOR[document.validity] ?? '#15803D',
                                    }}
                                />
                                <span
                                    aria-hidden="true"
                                    className="absolute -top-[7px] h-[18px] w-[2px] -translate-x-1/2 rounded-full bg-[#111827]"
                                    style={{ left: `${pctLinimasa}%` }}
                                />
                            </div>
                            <div className="mt-2.5 flex items-center justify-between font-mono text-[10px] tabular-nums text-[#5B6474]">
                                <span>{tglPendek(document.issue_date)}</span>
                                <span>{tglPendek(document.expiry_date)}</span>
                            </div>
                        </div>
                    ) : document.has_expiry ? (
                        <p className="mt-3 text-sm text-[#5B6474]">
                            Berlaku s/d{' '}
                            <span className="font-semibold tabular-nums text-[#111827]">
                                {tglPendek(document.expiry_date)}
                            </span>
                        </p>
                    ) : (
                        <div className="mt-4">
                            <div
                                aria-hidden="true"
                                className="h-1.5 rounded-full border border-dashed border-[#E3E8F0]"
                            />
                            <p className="mt-2.5 text-xs text-[#5B6474]">
                                Berlaku tanpa batas waktu; tidak ada tanggal kedaluwarsa pada dokumen ini.
                            </p>
                        </div>
                    )}
                    <dl
                        className="mt-6 flex flex-wrap items-center gap-x-10 gap-y-5 border-t border-[#E3E8F0] pt-5"
                    >
                        <div className="min-w-0">
                            <dt className="font-mono text-[9px] font-medium uppercase tracking-[0.16em] text-[#5B6474]">
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
                                        className="text-2xl font-semibold tabular-nums tracking-tight text-[#111827]"
                                        style={{ color: statUtama.tone as string }}
                                    >
                                        {statUtama.nilai}
                                    </span>
                                )}
                                {statUtama.unit && (
                                    <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#5B6474]">
                                        {statUtama.unit}
                                    </span>
                                )}
                            </dd>
                        </div>
                        <div className="min-w-0">
                            <dt className="font-mono text-[9px] font-medium uppercase tracking-[0.16em] text-[#5B6474]">
                                Tanggal Terbit
                            </dt>
                            <dd className="mt-1 text-sm font-semibold tabular-nums text-[#111827]">
                                {document.issue_date ? tglPendek(document.issue_date) : 'Tidak tersedia'}
                            </dd>
                        </div>
                        <div className="min-w-0">
                            <dt className="font-mono text-[9px] font-medium uppercase tracking-[0.16em] text-[#5B6474]">
                                Berlaku s/d
                            </dt>
                            <dd className="mt-1 text-sm font-semibold tabular-nums text-[#111827]">
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
                            borderColor: document.validity === 'expired' ? 'rgba(186,12,47,0.25)' : 'rgba(180,83,9,0.25)',
                            background: document.validity === 'expired' ? 'rgba(186,12,47,0.1)' : 'rgba(180,83,9,0.1)',
                        }}
                    >
                        <AlertTriangle
                            size={18}
                            className="mt-0.5 shrink-0"
                            style={{ color: document.validity === 'expired' ? '#BA0C2F' : '#B45309' }}
                        />
                        <div className="text-sm">
                            <p className="font-semibold text-[#111827]">
                                {document.validity === 'expired'
                                    ? 'Dokumen sudah kedaluwarsa'
                                    : 'Mendekati kedaluwarsa'}
                            </p>
                            <p className="text-[#5B6474]">
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

            {/* Pratinjau langsung berkas dokumen (PDF/gambar). */}
            <Card
                className="mb-6"
                title="Pratinjau Dokumen"
                description="Berkas dibuka langsung dari arsip privat; tidak perlu mengunduh untuk melihat isinya."
                actions={
                    <div className="flex items-center gap-2">
                        {previewKind === 'image' && hasFile && (
                            <Button size="small" icon={<Maximize2 size={13} />} onClick={() => setZoomPreview(true)}>
                                Perbesar
                            </Button>
                        )}
                        {hasFile && (
                            <Button size="small" icon={<Download size={13} />} href={`/dokumen/${document.id}/download`}>
                                Unduh
                            </Button>
                        )}
                    </div>
                }
            >
                <div id="doc-preview" className="scroll-mt-24">
                    {!hasFile ? (
                        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#E3E8F0] bg-[#F5F7FA]/50 px-6 py-14 text-center">
                            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#5B6474] shadow-sm">
                                <FileText size={20} aria-hidden="true" />
                            </span>
                            <p className="mt-3 text-sm font-semibold text-[#111827]">Belum ada berkas</p>
                            <p className="mt-1 max-w-sm text-xs leading-relaxed text-[#5B6474]">
                                Dokumen ini belum memiliki berkas yang dapat dipratinjau.
                                {actions.can_upload_version ? ' Unggah versi baru untuk melampirkan berkas.' : ''}
                            </p>
                        </div>
                    ) : previewKind === 'pdf' ? (
                        <iframe
                            src={previewUrl}
                            title={`Pratinjau ${document.document_name}`}
                            className="h-[560px] w-full rounded-lg border border-[#E3E8F0] bg-[#F5F7FA]"
                        />
                    ) : previewKind === 'image' ? (
                        <button
                            type="button"
                            onClick={() => setZoomPreview(true)}
                            className="group relative block w-full cursor-zoom-in overflow-hidden rounded-lg border border-[#E3E8F0] bg-[#F5F7FA]"
                        >
                            <img
                                src={previewUrl}
                                alt={`Pratinjau ${document.document_name}`}
                                className="mx-auto max-h-[560px] w-auto object-contain"
                            />
                            <span className="pointer-events-none absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-[#111827]/80 px-3 py-1 text-[11px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                                <Maximize2 size={12} aria-hidden="true" />
                                Klik untuk perbesar
                            </span>
                        </button>
                    ) : (
                        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#E3E8F0] bg-[#F5F7FA]/50 px-6 py-14 text-center">
                            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#5B6474] shadow-sm">
                                <AlertTriangle size={20} aria-hidden="true" />
                            </span>
                            <p className="mt-3 text-sm font-semibold text-[#111827]">Format tidak dapat dipratinjau</p>
                            <p className="mt-1 max-w-sm text-xs leading-relaxed text-[#5B6474]">
                                Hanya berkas PDF, JPG, dan PNG yang dapat ditampilkan langsung. Unduh berkas untuk melihatnya.
                            </p>
                            <a href={`/dokumen/${document.id}/download`} className="mt-4">
                                <Button type="primary" icon={<Download size={14} />}>Unduh Berkas</Button>
                            </a>
                        </div>
                    )}
                </div>
            </Card>

            <Modal show={zoomPreview} onClose={() => setZoomPreview(false)} maxWidth="xl">
                <div className="p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-[#111827]">{document.document_name}</p>
                        <button
                            type="button"
                            onClick={() => setZoomPreview(false)}
                            aria-label="Tutup pratinjau"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#5B6474] transition-colors hover:bg-[#F5F7FA] hover:text-[#111827]"
                        >
                            <X size={16} />
                        </button>
                    </div>
                    <img
                        src={previewUrl}
                        alt={`Pratinjau ${document.document_name}`}
                        className="max-h-[75vh] w-full rounded-lg bg-[#F5F7FA] object-contain"
                    />
                </div>
            </Modal>

            {(actions.can_submit || actions.can_verify || actions.can_edit || document.can_void) && (
                <Card className="mb-6">
                    <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-[#5B6474]">
                        Alur Dokumen
                    </p>
                    <h2 className="mt-1 text-sm font-semibold text-[#111827]">Verifikasi & Tindakan</h2>

                    {actions.can_submit && (
                        <div className="mt-5">
                            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-[#5B6474]">
                                Pengajuan
                            </p>
                            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#5B6474]">
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
                        <div className={`mt-5 ${actions.can_submit ? 'border-t border-[#E3E8F0] pt-5' : ''}`}>
                            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-[#5B6474]">
                                Keputusan Supervisor
                            </p>
                            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#5B6474]">
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
                                        style={{ background: '#15803D', borderColor: '#15803D' }}
                                    >
                                        Setujui (Verifikasi)
                                    </Button>
                                </form>
                                <Button
                                    onClick={() => setModal('revision')}
                                    icon={<MessageSquare size={16} />}
                                    style={{
                                        borderColor: 'rgba(180,83,9,0.4)',
                                        background: 'rgba(180,83,9,0.1)',
                                        color: '#B45309',
                                    }}
                                >
                                    Minta Revisi
                                </Button>
                                <Button
                                    onClick={() => setModal('reject')}
                                    icon={<ShieldX size={16} />}
                                    style={{
                                        borderColor: 'rgba(186,12,47,0.4)',
                                        background: 'rgba(186,12,47,0.1)',
                                        color: '#BA0C2F',
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
                                    ? 'border-t border-[#E3E8F0] pt-5'
                                    : ''
                            }`}
                        >
                            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-[#5B6474]">
                                Tindakan Lanjutan
                            </p>
                            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#5B6474]">
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
                <section className="min-w-0 rounded-2xl border border-[#E3E8F0] bg-white shadow-sm xl:col-span-2">
                    <header className="flex items-center justify-between gap-3 border-b border-[#E3E8F0] px-5 py-4 lg:px-6">
                        <h2 className="text-sm font-semibold text-[#111827]">Register Dokumen</h2>
                        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#5B6474]">
                            {formatNumber(versions.length)} versi · {formatNumber((relations ?? []).length)} relasi
                        </span>
                    </header>
                    <div className="p-5 lg:p-6">
                        <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-[#5B6474]">
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
                                color: '#5B6474',
                                paddingBottom: 4,
                            }}
                            contentStyle={{
                                fontSize: 14,
                                fontWeight: 500,
                                color: '#111827',
                                paddingBottom: 16,
                            }}
                        />

                        <div className="mt-6 border-t border-[#E3E8F0] pt-5">
                            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-[#5B6474]">
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
                                    color: '#5B6474',
                                    paddingBottom: 4,
                                }}
                                contentStyle={{
                                    fontSize: 14,
                                    fontWeight: 500,
                                    color: '#111827',
                                    paddingBottom: 16,
                                }}
                            />
                        </div>

                        <div className="mt-6 border-t border-[#E3E8F0] pt-5">
                            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-[#5B6474]">
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
                                            color: '#5B6474',
                                            paddingBottom: 4,
                                        }}
                                        contentStyle={{
                                            fontSize: 14,
                                            fontWeight: 500,
                                            color: '#111827',
                                            paddingBottom: 16,
                                        }}
                                    />
                                    <p className="mt-3 text-xs leading-relaxed text-[#5B6474]">
                                        Siklus endorsement berlaku untuk dokumen seperti Surat Laut
                                        dan Sertifikat Klasifikasi.
                                    </p>
                                </>
                            ) : (
                                <p className="mt-3 text-sm leading-relaxed text-[#5B6474]">
                                    Dokumen ini tidak mengikuti siklus endorsement.
                                </p>
                            )}
                        </div>

                        {document.voided_at && (
                            <div
                                className="mt-6 flex items-start gap-3 rounded-xl border p-4"
                                style={{
                                    borderColor: 'rgba(186,12,47,0.3)',
                                    background: 'rgba(186,12,47,0.06)',
                                }}
                            >
                                <ShieldX size={18} className="mt-0.5 shrink-0" style={{ color: '#BA0C2F' }} />
                                <div className="text-sm">
                                    <p className="font-semibold" style={{ color: '#BA0C2F' }}>
                                        Terbitan dibatalkan (VOID)
                                    </p>
                                    <p className="mt-0.5 text-[#111827]">
                                        Dibatalkan {formatDateTime(document.voided_at)}
                                        {document.void_reason ? ` · Alasan: ${document.void_reason}` : ''}
                                    </p>
                                </div>
                            </div>
                        )}

                        {document.notes && (
                            <div
                                className="mt-6 rounded-xl border p-4"
                                style={{ borderColor: '#E3E8F0', background: '#F5F7FA' }}
                            >
                                <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-[#5B6474]">
                                    Catatan
                                </p>
                                <p className="mt-2 text-sm leading-relaxed text-[#111827]">{document.notes}</p>
                            </div>
                        )}

                        <div className="mt-6 border-t border-[#E3E8F0] pt-5">
                            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-[#5B6474]">
                                Tertaut ke Perjalanan · {formatNumber(voyages.length)}
                            </p>
                            {voyages.length === 0 ? (
                                <p className="mt-3 text-sm leading-relaxed text-[#5B6474]">
                                    Belum ditautkan ke perjalanan mana pun. Dokumen dapat dipakai
                                    ulang pada perjalanan berikutnya tanpa perlu unggah ulang.
                                </p>
                            ) : (
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {voyages.map((v) => (
                                        <Link key={v.id} href={`/perjalanan/${v.id}`}>
                                            <span
                                                className="inline-flex items-center rounded-lg border px-2.5 py-1.5 font-mono text-[11px] font-medium text-[#111827] transition-colors hover:text-[#BA0C2F]"
                                                style={{ borderColor: '#E3E8F0' }}
                                            >
                                                {v.voyage_code}
                                            </span>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="mt-6 border-t border-[#E3E8F0] pt-5">
                            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-[#5B6474]">
                                Dokumen Terkait · {formatNumber((relations ?? []).length)}
                            </p>
                            {(relations ?? []).length === 0 ? (
                                <p className="mt-3 text-sm leading-relaxed text-[#5B6474]">
                                    Belum ada relasi dengan dokumen lain. Relasi dibuat otomatis
                                    oleh sistem, misalnya saat invoice terbit dari SPAL, FP
                                    melampiri invoice, atau bukti bayar terkait bill.
                                </p>
                            ) : (
                                <ul className="mt-3 space-y-2">
                                    {(relations ?? []).map((r: any) => (
                                        <li
                                            key={r.id}
                                            className="flex items-center justify-between gap-3 rounded-lg border border-[#E3E8F0] px-3 py-2.5 transition-colors hover:border-[rgba(186,12,47,0.4)]"
                                        >
                                            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                                                <Badge tone="neutral">{r.relation_type}</Badge>
                                                <span className="text-[11px] uppercase tracking-wide text-[#5B6474]">
                                                    {r.direction}
                                                </span>
                                                {r.related?.id ? (
                                                    <Link
                                                        href={`/dokumen/${r.related.id}`}
                                                        className="truncate text-sm font-medium text-[#BA0C2F] hover:underline"
                                                    >
                                                        {r.related.document_name}
                                                    </Link>
                                                ) : (
                                                    <span className="text-sm text-[#5B6474]">(terhapus)</span>
                                                )}
                                            </div>
                                            <span className="shrink-0 font-mono text-[11px] tabular-nums text-[#5B6474]">
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
                            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#5B6474]">
                                {formatNumber(versions.length)} tersimpan
                            </span>
                        }
                    >
                        <ol className="relative">
                            <span
                                aria-hidden="true"
                                className="absolute bottom-3 left-[5px] top-3 w-px"
                                style={{ background: '#E3E8F0' }}
                            />
                            {versions.map((v) => (
                                <li key={v.id} className="relative pb-5 ps-6 last:pb-0">
                                    <span
                                        aria-hidden="true"
                                        className="absolute left-0 top-4 h-2.5 w-2.5 rounded-full"
                                        style={{
                                            background: v.is_current ? '#00205B' : 'transparent',
                                            border: v.is_current ? 'none' : '2px solid #E3E8F0',
                                        }}
                                    />
                                    <div
                                        className="rounded-xl border p-3.5"
                                        style={{
                                            borderColor: v.is_current ? 'rgba(0,32,91,0.5)' : '#E3E8F0',
                                            background: v.is_current ? 'rgba(0,32,91,0.06)' : 'transparent',
                                        }}
                                    >
                                        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                                            <p className="flex items-center gap-2 text-sm font-semibold text-[#111827]">
                                                v{v.version_number}
                                                {v.is_current && (
                                                    <span
                                                        className="rounded px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-[#111827]"
                                                        style={{ background: '#00205B' }}
                                                    >
                                                        Aktif
                                                    </span>
                                                )}
                                            </p>
                                            <p className="font-mono text-[10px] tabular-nums text-[#5B6474]">
                                                {formatDateTime(v.uploaded_at)}
                                            </p>
                                        </div>
                                        <p className="mt-1.5 text-xs leading-relaxed text-[#5B6474]">
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
                            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#5B6474]">
                                Keputusan supervisor
                            </span>
                        }
                    >
                        {approvals.length === 0 ? (
                            <p className="text-sm leading-relaxed text-[#5B6474]">
                                Belum ada keputusan supervisor.
                            </p>
                        ) : (
                            <ol className="relative">
                                <span
                                    aria-hidden="true"
                                    className="absolute bottom-3 left-[5px] top-3 w-px"
                                    style={{ background: '#E3E8F0' }}
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
                                                        ? '#15803D'
                                                        : ditolak
                                                          ? '#BA0C2F'
                                                          : '#B45309',
                                                }}
                                            />
                                            <div className="rounded-xl border border-[#E3E8F0] p-3.5">
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
                                                    <p className="font-mono text-[10px] tabular-nums text-[#5B6474]">
                                                        {formatDateTime(a.decision_timestamp)}
                                                    </p>
                                                </div>
                                                <p className="mt-1.5 text-xs text-[#5B6474]">
                                                    {a.approver_name} · persetujuan internal
                                                </p>
                                                {a.comments && (
                                                    <p
                                                        className="mt-2 border-s-2 ps-3 text-sm italic leading-relaxed text-[#111827]"
                                                        style={{ borderColor: '#E3E8F0' }}
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
                            className="mt-4 rounded-lg p-3 text-[11px] leading-relaxed text-[#5B6474]"
                            style={{ background: '#F5F7FA' }}
                        >
                            Persetujuan di sistem ini adalah{' '}
                            <strong className="font-semibold text-[#111827]">verifikasi internal</strong>,
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
                        <p className="text-sm leading-relaxed text-[#5B6474]">
                            Alasan {modal === 'reject' ? 'penolakan' : 'revisi'} wajib diisi dan
                            akan tersimpan pada histori persetujuan.
                        </p>
                        <label className="mt-4 block text-xs font-medium text-[#5B6474]">
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
                            <p className="mt-1 text-xs text-[#BA0C2F]">{errors.comments}</p>
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
                                        : { background: '#B45309', borderColor: '#B45309' }
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
                        <p className="text-sm leading-relaxed text-[#5B6474]">
                            Versi lama tetap tersimpan sebagai jejak audit. Setelah versi baru
                            diunggah, status dokumen kembali ke Terunggah.
                        </p>
                        <label className="mt-4 block text-xs font-medium text-[#5B6474]">Berkas *</label>
                        <Input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => setData('file', (e.target as HTMLInputElement).files?.[0] ?? null)}
                            className="mt-1"
                        />
                        {errors.file && (
                            <p className="mt-1 text-xs text-[#BA0C2F]">{errors.file}</p>
                        )}
                        <label className="mt-4 block text-xs font-medium text-[#5B6474]">Catatan Revisi</label>
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
                        <p className="text-xs leading-relaxed text-[#5B6474]">
                            Perubahan tercatat pada audit trail dan berkas tidak ikut berubah.
                            Gunakan Unggah Versi Baru bila berkasnya perlu diganti.
                        </p>
                        <Row gutter={16} className="mt-4">
                            <Col span={24}>
                                <label className="block text-xs font-medium text-[#5B6474]">Nama Dokumen *</label>
                                <Input
                                    value={editForm.data.document_name}
                                    onChange={(e) => editForm.setData('document_name', e.target.value)}
                                    className="mt-1"
                                />
                                {editForm.errors.document_name && (
                                    <p className="mt-1 text-xs text-[#BA0C2F]">{editForm.errors.document_name}</p>
                                )}
                            </Col>
                            <Col span={12}>
                                <label className="mt-4 block text-xs font-medium text-[#5B6474]">Kategori *</label>
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
                                    <p className="mt-1 text-xs text-[#BA0C2F]">{editForm.errors.category_id}</p>
                                )}
                            </Col>
                            <Col span={12}>
                                <label className="mt-4 block text-xs font-medium text-[#5B6474]">
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
                                <label className="mt-4 block text-xs font-medium text-[#5B6474]">Nomor Dokumen</label>
                                <Input
                                    value={editForm.data.document_number}
                                    onChange={(e) => editForm.setData('document_number', e.target.value)}
                                    className="mt-1"
                                />
                            </Col>
                            <Col span={12}>
                                <label className="mt-4 block text-xs font-medium text-[#5B6474]">Tanggal Terbit</label>
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
                                    style={{ borderColor: '#E3E8F0', background: '#F5F7FA' }}
                                >
                                    <Checkbox
                                        checked={editForm.data.has_expiry}
                                        onChange={(e) => editForm.setData('has_expiry', e.target.checked)}
                                    >
                                        <span className="text-sm text-[#111827]">Punya masa berlaku</span>
                                    </Checkbox>
                                    {editForm.data.has_expiry && (
                                        <div className="mt-3 max-w-xs">
                                            <label className="block text-xs font-medium text-[#5B6474]">Berlaku s/d *</label>
                                            <Input
                                                type="date"
                                                value={editForm.data.expiry_date}
                                                onChange={(e) => editForm.setData('expiry_date', e.target.value)}
                                                className="mt-1"
                                            />
                                            {editForm.errors.expiry_date && (
                                                <p className="mt-1 text-xs text-[#BA0C2F]">{editForm.errors.expiry_date}</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </Col>
                            <Col span={24}>
                                <div
                                    className="mt-4 rounded-xl border p-4"
                                    style={{ borderColor: 'rgba(180,83,9,0.3)', background: 'rgba(180,83,9,0.05)' }}
                                >
                                    <Checkbox
                                        checked={editForm.data.has_endorsement}
                                        onChange={(e) => editForm.setData('has_endorsement', e.target.checked)}
                                    >
                                        <span className="text-sm text-[#111827]">
                                            Punya siklus <strong>endorsement</strong> (Surat Laut &
                                            Sertifikat Klasifikasi)
                                        </span>
                                    </Checkbox>
                                    {editForm.data.has_endorsement && (
                                        <Row gutter={12} className="mt-3 max-w-md">
                                            <Col span={12}>
                                                <label className="block text-xs font-medium text-[#5B6474]">
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
                                                <label className="block text-xs font-medium text-[#5B6474]">
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
                                <label className="mt-4 block text-xs font-medium text-[#5B6474]">Penanggung Jawab</label>
                                <Input
                                    value={editForm.data.responsible_person}
                                    onChange={(e) => editForm.setData('responsible_person', e.target.value)}
                                    className="mt-1"
                                />
                            </Col>
                            <Col span={12}>
                                <label className="mt-4 block text-xs font-medium text-[#5B6474]">Lokasi Arsip</label>
                                <Input
                                    value={editForm.data.archive_location}
                                    onChange={(e) => editForm.setData('archive_location', e.target.value)}
                                    className="mt-1"
                                />
                            </Col>
                            <Col span={24}>
                                <label className="mt-4 block text-xs font-medium text-[#5B6474]">Catatan</label>
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
                                style={{ background: 'rgba(180,83,9,0.1)', color: '#B45309' }}
                            >
                                <AlertTriangle size={18} />
                            </span>
                            <p className="text-sm leading-relaxed text-[#111827]">
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
                                style={{ background: '#B45309', borderColor: '#B45309' }}
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
                        <p className="text-sm leading-relaxed text-[#5B6474]">
                            <strong className="font-semibold text-[#111827]">
                                {document.document_number || document.document_name}
                            </strong>{' '}
                            akan ditandai sebagai dibatalkan. Nomor tidak dipakai ulang dan berkas
                            tetap tersimpan sebagai arsip.
                        </p>
                        <label className="mt-4 block text-xs font-medium text-[#5B6474]">Alasan void *</label>
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
