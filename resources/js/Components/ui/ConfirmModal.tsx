import Modal from '@/Components/Modal';
import { AlertTriangle } from 'lucide-react';
import { Button } from 'antd';

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
                        className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                        style={{
                            background: tone === 'danger' ? '#C1121F1A' : '#D99A2B1A',
                            color: tone === 'danger' ? '#C1121F' : '#D99A2B',
                        }}
                    >
                        <AlertTriangle size={18} />
                    </span>
                    <div>
                        <h2 className="text-lg font-semibold text-[#1C1B1A]">{title}</h2>
                        <p className="mt-1 text-sm text-[#8A8580]">{message}</p>
                    </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                    <Button onClick={onClose} disabled={processing}>
                        Batal
                    </Button>
                    <Button
                        type="primary"
                        danger={tone === 'danger'}
                        onClick={onConfirm}
                        loading={processing}
                        style={tone === 'warning' ? { background: '#D99A2B', borderColor: '#D99A2B' } : undefined}
                    >
                        {confirmLabel}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
