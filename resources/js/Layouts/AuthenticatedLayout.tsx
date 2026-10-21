import Sidebar from '@/Components/layout/Sidebar';
import Topbar from '@/Components/layout/Topbar';
import { type PageProps } from '@/types';
import { usePage } from '@inertiajs/react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import { PropsWithChildren, ReactNode, useEffect, useState } from 'react';

export default function AuthenticatedLayout({
    header,
    children,
}: PropsWithChildren<{ header?: ReactNode }>) {
    const { flash } = usePage<PageProps>().props;
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(
        null,
    );

    useEffect(() => {
        if (flash?.success) {
            setToast({ type: 'success', message: flash.success });
        } else if (flash?.error) {
            setToast({ type: 'error', message: flash.error });
        }
    }, [flash]);

    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(null), 5000);
        return () => clearTimeout(t);
    }, [toast]);

    return (
        <div className="min-h-screen bg-appbg">
            <Sidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            <div className="lg:pl-64">
                <Topbar onOpenSidebar={() => setSidebarOpen(true)} />

                <main className="px-4 py-6 lg:px-6">
                    {header && (
                        <div className="mb-4 rounded-xl border border-hairline bg-white p-4 shadow-sm">
                            {header}
                        </div>
                    )}
                    {children}
                </main>
            </div>

            {toast && (
                <div className="fixed bottom-5 right-5 z-[60] max-w-sm">
                    <div
                        className={`flex items-start gap-3 rounded-xl border bg-white p-4 shadow-lg ${
                            toast.type === 'success'
                                ? 'border-ok/40'
                                : 'border-primary/40'
                        }`}
                    >
                        {toast.type === 'success' ? (
                            <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-ok" />
                        ) : (
                            <AlertCircle size={18} className="mt-0.5 shrink-0 text-primary" />
                        )}
                        <p className="flex-1 text-sm text-ink">{toast.message}</p>
                        <button
                            type="button"
                            onClick={() => setToast(null)}
                            className="text-muted hover:text-ink"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
