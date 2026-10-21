import Badge, { type BadgeTone } from '@/Components/ui/Badge';
import Card from '@/Components/ui/Card';
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
    CheckCircle2,
    Download,
    History,
    MessageSquare,
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
    actions,
}: PageProps<{
    document: Record<string, any>;
    versions: Array<Record<string, any>>;
    approvals: Array<Record<string, any>>;
    voyages: Array<Record<string, any>>;
    actions: {
        can_submit: boolean;
        can_verify: boolean;
        can_edit: boolean;
        can_upload_version: boolean;
    };
}>) {
    const [modal, setModal] = useState<null | 'revision' | 'reject' | 'version'>(null);

    const { data, setData, post, processing, errors, reset } = useForm({
        comments: '',
        file: null as File | null,
        revision_notes: '',
    });

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
                            ['Diunggah oleh', document.uploaded_by_name ?? '—'],
                            ['Terakhir diubah', formatDateTime(document.updated_at)],
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
        </AuthenticatedLayout>
    );
}
