import Sidebar from '@/Components/layout/Sidebar';
import Topbar from '@/Components/layout/Topbar';
import { type PageProps } from '@/types';
import { usePage } from '@inertiajs/react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import { PropsWithChildren, ReactNode, useEffect, useState } from 'react';

const SIDEBAR_COLLAPSED_KEY = 'bt-sidebar-collapsed';

// Gabung class kondisional secara lokal, tanpa helper bersama.
const cx = (...classes: Array<string | false | undefined>) =>
    classes.filter(Boolean).join(' ');

export default function AuthenticatedLayout({
    header,
    children,
}: PropsWithChildren<{ header?: ReactNode }>) {
    const { flash } = usePage<PageProps>().props;
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Preferensi lebar sidebar disimpan agar bertahan antar muat ulang.
    // Aman untuk Inertia tanpa SSR karena render pertama terjadi di klien.
    const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
        if (typeof window === 'undefined') return false;
        try {
            return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1';
        } catch {
            return false;
        }
    });

    const [toast, setToast] = useState<{
        type: 'success' | 'error';
        message: string;
    } | null>(null);

    useEffect(() => {
        try {
            window.localStorage.setItem(
                SIDEBAR_COLLAPSED_KEY,
                sidebarCollapsed ? '1' : '0',
            );
        } catch {
            /* Penyimpanan lokal tidak tersedia (mode privat dsb.), abaikan. */
        }
    }, [sidebarCollapsed]);

    // Tutup sidebar mobile dengan Escape, konsisten dengan pola di Topbar.
    useEffect(() => {
        if (!sidebarOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setSidebarOpen(false);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [sidebarOpen]);

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

    const currentUrl = usePage().url;
    // Navigasi & auto-scroll ke record dengan highlight pulse kontras 3 siklus (kurang lebih 3 detik)
    useEffect(() => {
        const handleHighlight = () => {
            const hash = window.location.hash ? window.location.hash.substring(1) : '';
            if (!hash) return;
            const el = document.getElementById(hash) || document.querySelector(`[data-record-id="${hash}"]`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el.classList.remove('bt-record-highlight');
                void (el as HTMLElement).offsetWidth;
                el.classList.add('bt-record-highlight');
                setTimeout(() => {
                    el.classList.remove('bt-record-highlight');
                }, 3000);
            }
        };

        const timer = setTimeout(handleHighlight, 350);
        window.addEventListener('hashchange', handleHighlight);
        return () => {
            clearTimeout(timer);
            window.removeEventListener('hashchange', handleHighlight);
        };
    }, [currentUrl]);

    return (
        <div
            className={cx(
                'min-h-screen bg-appbg',
                // Wash tipis di atas halaman: merah tua dan emas lembut,
                // senada dengan aurora halaman login.
                'bg-[radial-gradient(1100px_420px_at_72%_-180px,rgba(120,0,0,0.07),transparent_70%),radial-gradient(900px_380px_at_10%_-160px,rgba(212,169,106,0.09),transparent_70%)]',
            )}
        >
            <style>{`
                @keyframes bt-toast {
                    0% { opacity: 0; transform: translateY(10px) scale(0.97); }
                    100% { opacity: 1; transform: translateY(0) scale(1); }
                }
                .bt-toast {
                    animation: bt-toast 0.28s cubic-bezier(0.22,1,0.36,1) both;
                }
                @keyframes bt-record-pulse {
                    0%, 100% {
                        box-shadow: 0 0 0 0 rgba(196, 18, 18, 0);
                        background-color: transparent;
                    }
                    50% {
                        box-shadow: 0 0 0 4px rgba(196, 18, 18, 0.45);
                        background-color: rgba(196, 18, 18, 0.12);
                    }
                }
                .bt-record-highlight {
                    animation: bt-record-pulse 1s ease-in-out 3;
                    border-radius: 0.5rem;
                    position: relative;
                    z-index: 10;
                }
                @media (prefers-reduced-motion: reduce) {
                    .bt-toast { animation: none; }
                    .bt-record-highlight {
                        animation: none;
                        outline: 3px solid rgba(196, 18, 18, 0.6);
                    }
                }
            `}</style>

            <Sidebar
                mobileOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                collapsed={sidebarCollapsed}
                onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
            />

            {/* Padding kiri mengikuti lebar sidebar (w-64 vs w-20 saat ringkas)
                dan bertransisi 300ms dengan easing yang sama persis dengan
                sidebar sehingga topbar dan konten bergeser mulus. */}
            <div
                className={cx(
                    'flex min-h-screen flex-col transition-[padding] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
                    sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64',
                )}
            >
                <Topbar onOpenSidebar={() => setSidebarOpen(true)} />

                <main className="flex-1 px-4 py-6 lg:px-6 lg:py-8">
                    {header && (
                        <div className="mb-5 rounded-xl border border-hairline bg-white px-5 py-4 shadow-[0_1px_2px_rgba(28,27,26,0.04),0_12px_32px_-24px_rgba(28,27,26,0.18)]">
                            {header}
                        </div>
                    )}
                    {children}
                </main>
            </div>

            {toast && (
                <div
                    role={toast.type === 'success' ? 'status' : 'alert'}
                    className="bt-toast fixed bottom-5 right-5 z-[60] w-[min(22rem,calc(100vw_-_2rem))]"
                >
                    <div
                        className={cx(
                            'flex items-start gap-3 rounded-xl border bg-white p-4 shadow-[0_18px_50px_-18px_rgba(28,27,26,0.3)]',
                            toast.type === 'success'
                                ? 'border-ok/40'
                                : 'border-danger/40',
                        )}
                    >
                        <span
                            className={cx(
                                'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                                toast.type === 'success'
                                    ? 'bg-ok/10 text-ok'
                                    : 'bg-danger/10 text-danger',
                            )}
                        >
                            {toast.type === 'success' ? (
                                <CheckCircle2 size={17} />
                            ) : (
                                <AlertCircle size={17} />
                            )}
                        </span>
                        <p className="flex-1 pt-1 text-sm leading-relaxed text-ink">
                            {toast.message}
                        </p>
                        <button
                            type="button"
                            onClick={() => setToast(null)}
                            aria-label="Tutup notifikasi"
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted transition-colors duration-200 hover:bg-ink/[0.06] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                        >
                            <X size={15} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}