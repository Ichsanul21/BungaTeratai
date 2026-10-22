import SecondaryButton from '@/Components/SecondaryButton';
import PrimaryButton from '@/Components/PrimaryButton';
import Modal from '@/Components/Modal';
import { AlertTriangle } from 'lucide-react';

/**
 * Modal konfirmasi aksi destruktif (hapus/arsip/batalkan).
 */
export default function ConfirmModal({
    show,
    title,
    message,
    confirmLabel = 'Ya, hapus',
    tone = 'danger',
    processing = false,
    onConfirm,
    onClose,
}: {
    show: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    tone?: 'danger' | 'warning';
    processing?: boolean;
    onConfirm: () => void;
    onClose: () => void;
}) {
    return (
        <Modal show={show} onClose={onClose} maxWidth="md">
            <div className="p-6">
                <div className="flex items-start gap-3">
                    <span
                        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                            tone === 'danger' ? 'bg-primary/10 text-primary' : 'bg-warn/10 text-warn'
                        }`}
                    >
                        <AlertTriangle size={18} />
                    </span>
                    <div>
                        <h2 className="text-lg font-semibold text-ink">{title}</h2>
                        <p className="mt-1 text-sm text-muted">{message}</p>
                    </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                    <SecondaryButton type="button" onClick={onClose} disabled={processing}>
                        Batal
                    </SecondaryButton>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={processing}
                        className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-50 ${
                            tone === 'danger'
                                ? 'bg-primary hover:bg-primary-hover'
                                : 'bg-warn hover:opacity-90'
                        }`}
                    >
                        {processing ? 'Memproses…' : confirmLabel}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
