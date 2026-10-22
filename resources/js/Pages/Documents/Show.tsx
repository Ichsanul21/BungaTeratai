import Badge, { type BadgeTone } from '@/Components/ui/Badge';
import Card from '@/Components/ui/Card';
import ConfirmModal from '@/Components/ui/ConfirmModal';
import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import PageHeader from '@/Components/ui/PageHeader';
import { VALIDITY_LABELS, VERIFICATION_STATUS_LABELS } from '@/Constants/navigation';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { classNames, daysUntil, formatDateTime, formatNumber } from '@/lib/format';
import { type PageProps } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowLeft,
    Archive,
    CheckCircle2,
    Download,
    History,
    MessageSquare,
    Pencil,
    ShieldX,
    Upload,
} from 'lucide-react';
import { FormEvent, useState } from 'react';

const VERIF_TONES: Record<string, BadgeTone> = {
    verified: 'success',
    under_review: 'info',
    revision_required: 'warning',
    rejected: 'danger',
    uploaded: 'info',
    draft: 'neutral',
    missing: 'danger',
    archived: 'neutral',
};
const VALIDITY_TONES: Record<string, BadgeTone> = {
    normal: 'success',
    expiring_soon: 'warning',
    expired: 'danger',
    no_expiry: 'neutral',
};

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
    const [modal, setModal] = useState<null | 'revision' | 'reject' | 'version' | 'edit' | 'archive' | 'void'>(null);
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

    return (
        <AuthenticatedLayout>
            <Head title={`Dokumen — ${document.document_name}`} />

            <div className="mb-4">
                <Link
                    href="/dokumen"
                    className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"
                >
                    <ArrowLeft size={15} /> Kembali ke Document Center
                </Link>
            </div>

            <PageHeader
                title={document.document_name}
                description={`${document.category?.name ?? '—'} · ${
                    document.owner_type === 'company'
                        ? 'PT Bunga Teratai'
                        : document.owner_name ?? '—'
                }`}
                actions={
                    <>
                        <Badge tone={VALIDITY_TONES[document.validity] ?? 'neutral'}>
                            {VALIDITY_LABELS[document.validity] ?? document.validity}
                            {document.validity !== 'no_expiry' &&
                                dLeft !== null &&
                                document.validity !== 'expired' &&
                                ` · ${dLeft} hr lagi`}
                        </Badge>
                        <Badge tone={VERIF_TONES[document.verification_status] ?? 'neutral'}>
                            {VERIFICATION_STATUS_LABELS[document.verification_status] ??
                                document.verification_status}
                        </Badge>
                    </>
                }
            />

            {document.validity === 'expired' && (
                <div className="mb-5 flex items-start gap-3 rounded-xl border border-primary/30 bg-primary-tint p-4">
                    <AlertTriangle size={18} className="mt-0.5 shrink-0 text-primary" />
                    <div className="text-sm">
                        <p className="font-semibold text-primary">Dokumen sudah kedaluwarsa</p>
                        <p className="text-ink">
                            Berlaku s/d {document.expiry_date} (lewat {Math.abs(dLeft ?? 0)} hari).
                            Perbarui dokumen dan unggah versi baru.
                        </p>
                    </div>
                </div>
            )}
            {document.validity === 'expiring_soon' && (
                <div className="mb-5 flex items-start gap-3 rounded-xl border border-warn/30 bg-warn/5 p-4">
                    <AlertTriangle size={18} className="mt-0.5 shrink-0 text-warn" />
                    <div className="text-sm">
                        <p className="font-semibold text-warn">Mendekati kedaluwarsa</p>
                        <p className="text-ink">
                            Berlaku s/d {document.expiry_date} — {dLeft} hari lagi.
                        </p>
                    </div>
                </div>
            )}

            <div className="mb-5 flex flex-wrap gap-2">
                {actions.can_submit && (
                    <form onSubmit={action('submit')}>
                        <PrimaryButton disabled={processing}>
                            Ajukan ke Supervisor
                        </PrimaryButton>
                    </form>
                )}
                {actions.can_verify && (
                    <>
                        <form onSubmit={action('verify')}>
                            <button
                                type="submit"
                                disabled={processing}
                                className="inline-flex items-center gap-2 rounded-lg bg-ok px-3.5 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                            >
                                <CheckCircle2 size={16} /> Setujui (Verifikasi)
                            </button>
                        </form>
                        <button
                            type="button"
                            onClick={() => setModal('revision')}
                            className="inline-flex items-center gap-2 rounded-lg border border-warn/40 bg-warn/10 px-3.5 py-2 text-sm font-semibold text-warn transition hover:bg-warn/20"
                        >
                            <MessageSquare size={16} /> Minta Revisi
                        </button>
                        <button
                            type="button"
                            onClick={() => setModal('reject')}
                            className="inline-flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3.5 py-2 text-sm font-semibold text-primary transition hover:bg-primary/20"
                        >
                            <ShieldX size={16} /> Tolak
                        </button>
                    </>
                )}
                {actions.can_upload_version && (
                    <button
                        type="button"
                        onClick={() => setModal('version')}
                        className="inline-flex items-center gap-2 rounded-lg border border-hairline bg-white px-3.5 py-2 text-sm font-medium text-ink transition hover:border-primary/40"
                    >
                        <Upload size={16} /> Unggah Versi Baru
                    </button>
                )}
                {actions.can_edit && (
                    <button
                        type="button"
                        onClick={() => setModal('edit')}
                        className="inline-flex items-center gap-2 rounded-lg border border-hairline bg-white px-3.5 py-2 text-sm font-medium text-ink transition hover:border-primary/40"
                    >
                        <Pencil size={16} /> Edit Metadata
                    </button>
                )}
                {actions.can_edit && (
                    <button
                        type="button"
                        onClick={() => setModal('archive')}
                        className="inline-flex items-center gap-2 rounded-lg border border-hairline bg-white px-3.5 py-2 text-sm font-medium text-primary transition hover:border-primary/40"
                    >
                        <Archive size={16} /> Arsipkan
                    </button>
                )}
                {document.can_void && (
                    <button
                        type="button"
                        onClick={() => setModal('void')}
                        className="inline-flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3.5 py-2 text-sm font-semibold text-primary transition hover:bg-primary/20"
                    >
                        <ShieldX size={16} /> Void (Batalkan Terbitan)
                    </button>
                )}
                <a
                    href={`/dokumen/${document.id}/download`}
                    className="inline-flex items-center gap-2 rounded-lg border border-hairline bg-white px-3.5 py-2 text-sm font-medium text-ink transition hover:border-primary/40"
                >
                    <Download size={16} /> Unduh File
                </a>
            </div>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
                <Card title="Metadata" className="xl:col-span-2">
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-3">
                        {[
                            ['Nomor Dokumen', document.document_number ?? '—'],
                            ['Requirement', document.requirement_code ?? '—'],
                            ['Tanggal Terbit', document.issue_date ?? '—'],
                            [
                                'Masa Berlaku',
                                document.has_expiry
                                    ? (document.expiry_date ?? '—')
                                    : 'Tidak berlaku (tanpa tanggal)',
                            ],
                            ['Verifikasi', VERIFICATION_STATUS_LABELS[document.verification_status] ?? document.verification_status],
                            ['Penanggung Jawab', document.responsible_person ?? '—'],
                            ['Lokasi Arsip', document.archive_location ?? '—'],
                            ['Sumber', document.source_type === 'terbitan' ? 'Terbitan sistem' : 'Unggahan scan'],
                            ['Nomor Arsip', document.archive_number ?? '—'],
                            ['Periode Arsip', document.period ?? '—'],
                            ['Endorsement', document.has_endorsement
                                ? (document.endorsement_next_date
                                    ? `Next: ${document.endorsement_next_date} (${document.endorsement_days_left} hr)`
                                    : 'Aktif, tanpa jadwal')
                                : 'Tidak berlaku'],
                            ['Diunggah oleh', document.uploaded_by_name ?? '—'],
                            ['Terakhir diubah', formatDateTime(document.updated_at)],
                            ...(document.voided_at
                                ? [['Status VOID', `Dibatalkan ${formatDateTime(document.voided_at)} — ${document.void_reason ?? ''}`]]
                                : []),
                        ].map(([label, value]) => (
                            <div key={label as string}>
                                <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                                    {label}
                                </dt>
                                <dd className="mt-0.5 text-sm font-medium text-ink">{value}</dd>
                            </div>
                        ))}
                    </dl>
                    {document.notes && (
                        <div className="mt-4 rounded-lg bg-appbg p-3 text-sm text-muted">
                            <span className="font-semibold text-ink">Catatan: </span>
                            {document.notes}
                        </div>
                    )}

                    <div className="mt-5 border-t border-hairline pt-4">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                            Tertaut ke perjalanan ({voyages.length})
                        </p>
                        {voyages.length === 0 ? (
                            <p className="text-sm text-muted">
                                Belum ditautkan — dokumen dapat dipakai ulang di perjalanan tanpa
                                upload ganda.
                            </p>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {voyages.map((v) => (
                                    <Link
                                        key={v.id}
                                        href={`/perjalanan/${v.id}`}
                                        className="rounded-lg border border-hairline px-2.5 py-1.5 text-xs font-medium text-ink hover:border-primary/40"
                                    >
                                        {v.voyage_code}
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="mt-5 border-t border-hairline pt-4">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                            Dokumen Terkait ({(relations ?? []).length})
                        </p>
                        {(relations ?? []).length === 0 ? (
                            <p className="text-sm text-muted">
                                Belum ada relasi. Relasi otomatis dibuat saat invoice terbit dari SPAL,
                                FP melampiri invoice, bukti bayar terkait bill, dll.
                            </p>
                        ) : (
                            <ul className="space-y-1.5">
                                {(relations ?? []).map((r: any) => (
                                    <li key={r.id} className="flex items-center justify-between rounded-lg border border-hairline px-3 py-2 text-sm">
                                        <span className="text-ink">
                                            <Badge tone="neutral">{r.relation_type}</Badge>{' '}
                                            <span className="text-xs text-muted">{r.direction}</span>{' '}
                                            {r.related?.id ? (
                                                <Link href={`/dokumen/${r.related.id}`} className="font-medium text-primary hover:underline">
                                                    {r.related.document_name}
                                                </Link>
                                            ) : (
                                                <span className="text-muted">(terhapus)</span>
                                            )}
                                        </span>
                                        <span className="text-xs text-muted">{r.related?.document_number}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </Card>

                <div className="space-y-5">
                    <Card title="Riwayat Versi" description={`${versions.length} versi tersimpan`}>
                        <ul className="space-y-3">
                            {versions.map((v) => (
                                <li
                                    key={v.id}
                                    className={classNames(
                                        'rounded-lg border p-3',
                                        v.is_current ? 'border-primary/40 bg-primary-tint' : 'border-hairline',
                                    )}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-semibold text-ink">
                                            v{v.version_number}
                                            {v.is_current && (
                                                <span className="ms-2 rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold text-white">
                                                    AKTIF
                                                </span>
                                            )}
                                        </span>
                                        <span className="text-xs text-muted">
                                            {formatDateTime(v.uploaded_at)}
                                        </span>
                                    </div>
                                    <p className="mt-1 text-xs text-muted">
                                        {v.revision_notes} · {v.uploaded_by ?? '—'}
                                        {v.file_size
                                            ? ` · ${(v.file_size / 1024).toFixed(1)} KB`
                                            : ''}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    </Card>

                    <Card title="Histori Persetujuan" description="Keputusan supervisor">
                        {approvals.length === 0 ? (
                            <p className="text-sm text-muted">Belum ada keputusan.</p>
                        ) : (
                            <ul className="space-y-3">
                                {approvals.map((a) => (
                                    <li key={a.id} className="rounded-lg border border-hairline p-3">
                                        <div className="flex items-center justify-between">
                                            <Badge
                                                tone={
                                                    a.approval_status === 'approved'
                                                        ? 'success'
                                                        : a.approval_status === 'rejected'
                                                          ? 'danger'
                                                          : 'warning'
                                                }
                                            >
                                                {a.approval_status === 'approved'
                                                    ? 'Disetujui'
                                                    : a.approval_status === 'rejected'
                                                      ? 'Ditolak'
                                                      : 'Perlu Revisi'}
                                            </Badge>
                                            <span className="text-xs text-muted">
                                                {formatDateTime(a.decision_timestamp)}
                                            </span>
                                        </div>
                                        <p className="mt-1.5 text-xs text-muted">
                                            {a.approver_name} · persetujuan internal
                                        </p>
                                        {a.comments && (
                                            <p className="mt-1 text-sm italic text-ink">
                                                “{a.comments}”
                                            </p>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                        <p className="mt-3 rounded-lg bg-appbg p-2.5 text-[11px] leading-relaxed text-muted">
                            Persetujuan di sistem ini adalah <strong>verifikasi internal</strong> —
                            bukan persetujuan resmi otoritas pelayaran.
                        </p>
                    </Card>
                </div>
            </div>

            {/* Modal: Minta Revisi / Tolak */}
            <Modal show={modal === 'revision' || modal === 'reject'} onClose={() => setModal(null)} maxWidth="md">
                <form
                    onSubmit={action(modal === 'reject' ? 'reject' : 'revision')}
                    className="p-6"
                >
                    <h2 className="text-lg font-semibold text-ink">
                        {modal === 'reject' ? 'Tolak Dokumen' : 'Minta Revisi Dokumen'}
                    </h2>
                    <p className="mt-1 text-sm text-muted">
                        Alasan/komentar {modal === 'reject' ? 'penolakan' : 'revisi'} wajib diisi dan
                        akan tersimpan di histori.
                    </p>
                    <textarea
                        value={data.comments}
                        onChange={(e) => setData('comments', e.target.value)}
                        rows={4}
                        placeholder={
                            modal === 'reject'
                                ? 'Tuliskan alasan penolakan…'
                                : 'Tuliskan bagian yang perlu diperbaiki…'
                        }
                        className="mt-4 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary"
                    />
                    {errors.comments && (
                        <p className="mt-1 text-xs text-primary">{errors.comments}</p>
                    )}
                    <div className="mt-5 flex justify-end gap-3">
                        <SecondaryButton type="button" onClick={() => setModal(null)}>
                            Batal
                        </SecondaryButton>
                        <button
                            type="submit"
                            disabled={processing || !data.comments.trim()}
                            className={classNames(
                                'rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50',
                                modal === 'reject' ? 'bg-primary hover:bg-primary-hover' : 'bg-warn hover:opacity-90',
                            )}
                        >
                            {modal === 'reject' ? 'Tolak Dokumen' : 'Kirim Revisi'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Modal: Upload versi baru */}
            <Modal show={modal === 'version'} onClose={() => setModal(null)} maxWidth="md">
                <form onSubmit={uploadVersion} className="p-6">
                    <h2 className="text-lg font-semibold text-ink">Unggah Versi Baru</h2>
                    <p className="mt-1 text-sm text-muted">
                        Versi lama tetap tersimpan (jejak audit). Status kembali ke “Terunggah”.
                    </p>
                    <div className="mt-4">
                        <label className="block text-sm font-medium text-ink">Berkas *</label>
                        <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => setData('file', e.target.files?.[0] ?? null)}
                            className="mt-1 block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-appbg file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-ink hover:file:bg-hairline"
                        />
                        {errors.file && (
                            <p className="mt-1 text-xs text-primary">{errors.file}</p>
                        )}
                    </div>
                    <div className="mt-4">
                        <label className="block text-sm font-medium text-ink">Catatan Revisi</label>
                        <input
                            value={data.revision_notes}
                            onChange={(e) => setData('revision_notes', e.target.value)}
                            placeholder="mis. Perbaikan nomor dokumen"
                            className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary"
                        />
                    </div>
                    <div className="mt-5 flex justify-end gap-3">
                        <SecondaryButton type="button" onClick={() => setModal(null)}>
                            Batal
                        </SecondaryButton>
                        <PrimaryButton disabled={processing || !data.file}>
                            Simpan Versi
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* Modal: Edit Metadata */}
            <Modal show={modal === 'edit'} onClose={() => setModal(null)} maxWidth="lg">
                <form onSubmit={submitEdit} className="p-6">
                    <h2 className="text-lg font-semibold text-ink">Edit Metadata Dokumen</h2>
                    <p className="text-xs text-muted">
                        Perubahan tercatat di audit trail. File tidak berubah — gunakan "Unggah Versi Baru" bila berkasnya diganti.
                    </p>
                    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="md:col-span-2">
                            <label className="text-xs font-medium text-muted">Nama Dokumen *</label>
                            <input
                                value={editForm.data.document_name}
                                onChange={(e) => editForm.setData('document_name', e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
                            />
                            {editForm.errors.document_name && (
                                <p className="mt-1 text-xs text-primary">{editForm.errors.document_name}</p>
                            )}
                        </div>
                        <div>
                            <label className="text-xs font-medium text-muted">Kategori *</label>
                            <select
                                value={editForm.data.category_id}
                                onChange={(e) => editForm.setData('category_id', Number(e.target.value))}
                                className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
                            >
                                {(categories ?? []).map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.code} · {c.name}
                                    </option>
                                ))}
                            </select>
                            {editForm.errors.category_id && (
                                <p className="mt-1 text-xs text-primary">{editForm.errors.category_id}</p>
                            )}
                        </div>
                        <div>
                            <label className="text-xs font-medium text-muted">Requirement (kelengkapan)</label>
                            <select
                                value={editForm.data.requirement_code}
                                onChange={(e) => editForm.setData('requirement_code', e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
                            >
                                <option value="">— tidak ditautkan —</option>
                                {(requirements ?? []).map((r) => (
                                    <option key={r.code} value={r.code}>
                                        {r.group_code} · {r.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-muted">Nomor Dokumen</label>
                            <input
                                value={editForm.data.document_number}
                                onChange={(e) => editForm.setData('document_number', e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-muted">Tanggal Terbit</label>
                            <input
                                type="date"
                                value={editForm.data.issue_date}
                                onChange={(e) => editForm.setData('issue_date', e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
                            />
                        </div>
                        <div className="md:col-span-2 rounded-xl border border-hairline bg-appbg p-3">
                            <label className="flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={editForm.data.has_expiry}
                                    onChange={(e) =>
                                        editForm.setData('has_expiry', e.target.checked)
                                    }
                                    className="rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                Punya masa berlaku
                            </label>
                            {editForm.data.has_expiry && (
                                <div className="mt-2 max-w-xs">
                                    <label className="text-xs font-medium text-muted">Berlaku s/d *</label>
                                    <input
                                        type="date"
                                        value={editForm.data.expiry_date}
                                        onChange={(e) => editForm.setData('expiry_date', e.target.value)}
                                        className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
                                    />
                                    {editForm.errors.expiry_date && (
                                        <p className="mt-1 text-xs text-primary">{editForm.errors.expiry_date}</p>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="md:col-span-2 rounded-xl border border-hairline bg-warn/5 p-3">
                            <label className="flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={editForm.data.has_endorsement}
                                    onChange={(e) => editForm.setData('has_endorsement', e.target.checked)}
                                    className="rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                Punya siklus <strong>endorsement</strong> (Surat Laut & Sertifikat Klasifikasi)
                            </label>
                            {editForm.data.has_endorsement && (
                                <div className="mt-2 grid max-w-md grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-medium text-muted">Endorsement Terakhir</label>
                                        <input
                                            type="date"
                                            value={editForm.data.endorsement_last_date}
                                            onChange={(e) => editForm.setData('endorsement_last_date', e.target.value)}
                                            className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-muted">Endorsement Berikutnya *</label>
                                        <input
                                            type="date"
                                            value={editForm.data.endorsement_next_date}
                                            onChange={(e) => editForm.setData('endorsement_next_date', e.target.value)}
                                            className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="text-xs font-medium text-muted">Penanggung Jawab</label>
                            <input
                                value={editForm.data.responsible_person}
                                onChange={(e) => editForm.setData('responsible_person', e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-muted">Lokasi Arsip</label>
                            <input
                                value={editForm.data.archive_location}
                                onChange={(e) => editForm.setData('archive_location', e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="text-xs font-medium text-muted">Catatan</label>
                            <textarea
                                value={editForm.data.notes}
                                onChange={(e) => editForm.setData('notes', e.target.value)}
                                rows={3}
                                className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
                            />
                        </div>
                    </div>
                    <div className="mt-5 flex justify-end gap-3">
                        <SecondaryButton type="button" onClick={() => setModal(null)}>
                            Batal
                        </SecondaryButton>
                        <PrimaryButton disabled={editForm.processing}>Simpan Perubahan</PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* Konfirmasi Arsip */}
            <ConfirmModal
                show={modal === 'archive'}
                title="Arsipkan dokumen ini?"
                message={`Dokumen "${document.document_name}" disembunyikan dari daftar (soft delete). File tetap tersimpan di penyimpanan privat.`}
                confirmLabel="Arsipkan"
                tone="warning"
                processing={busy}
                onClose={() => setModal(null)}
                onConfirm={() => {
                    setBusy(true);
                    router.post(`/dokumen/${document.id}/archive`, {}, {
                        onFinish: () => { setBusy(false); setModal(null); },
                    });
                }}
            />
            {/* Modal: Void dokumen terbit */}
            <Modal show={modal === 'void'} onClose={() => setModal(null)} maxWidth="md">
                <form
                    className="p-6"
                    onSubmit={(e) => {
                        e.preventDefault();
                        setBusy(true);
                        router.post(
                            `/dokumen/${document.id}/void`,
                            { reason: voidReason },
                            {
                                preserveScroll: true,
                                onFinish: () => { setBusy(false); setModal(null); setVoidReason(''); },
                            },
                        );
                    }}
                >
                    <h2 className="text-lg font-semibold text-ink">Void Dokumen Terbitan?</h2>
                    <p className="mt-1 text-sm text-muted">
                        <strong>{document.document_number || document.document_name}</strong> ditandai
                        dibatalkan. Nomor TIDAK dipakai ulang; file tetap tersimpan sebagai arsip.
                    </p>
                    <div className="mt-4">
                        <label className="text-xs font-medium text-muted">Alasan void *</label>
                        <textarea
                            rows={3}
                            value={voidReason}
                            onChange={(e) => setVoidReason(e.target.value)}
                            placeholder="mis. Salah ketik nomor surat"
                            className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
                        />
                    </div>
                    <div className="mt-5 flex justify-end gap-3">
                        <SecondaryButton type="button" onClick={() => setModal(null)}>Batal</SecondaryButton>
                        <button
                            type="submit"
                            disabled={busy || !voidReason.trim()}
                            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
                        >
                            {busy ? 'Memproses…' : 'Ya, Void'}
                        </button>
                    </div>
                </form>
            </Modal>
        </AuthenticatedLayout>
    );
}
