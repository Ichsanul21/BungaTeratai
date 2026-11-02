import OfflineBanner from '@/Components/sync/OfflineBanner';
import SyncDrawer from '@/Components/sync/SyncDrawer';
import Sidebar from '@/Components/layout/Sidebar';
import Topbar from '@/Components/layout/Topbar';
import { type PageProps } from '@/types';
import { notification } from 'antd';
import { usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';

const SIDEBAR_COLLAPSED_KEY = 'bt-sidebar-collapsed';

const cx = (...classes: Array<string | false | undefined>) =>
    classes.filter(Boolean).join(' ');

export default function AuthenticatedLayout({
    header,
    children,
}: {
    header?: React.ReactNode;
    children: React.ReactNode;
}) {
    const { flash } = usePage<PageProps>().props;
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
        if (typeof window === 'undefined') return false;
        try {
            return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1';
        } catch {
            return false;
        }
    });

    useEffect(() => {
        try {
            window.localStorage.setItem(
                SIDEBAR_COLLAPSED_KEY,
                sidebarCollapsed ? '1' : '0',
            );
        } catch {}
    }, [sidebarCollapsed]);

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
            notification.success({
                message: flash.success,
                placement: 'bottomRight',
                duration: 5,
            });
        } else if (flash?.error) {
            notification.error({
                message: flash.error,
                placement: 'bottomRight',
                duration: 5,
            });
        }
    }, [flash]);

    const currentUrl = usePage().url;
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
                'min-h-screen bg-[#FAF7F2]',
            )}
        >
            <style>{`
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

            <div
                className={cx(
                    'flex min-h-screen flex-col transition-[padding] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
                    sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64',
                )}
            >
                <Topbar onOpenSidebar={() => setSidebarOpen(true)} />
                <OfflineBanner />

                <main className="flex-1 px-4 py-6 lg:px-6 lg:py-8">
                    {header && (
                        <div className="mb-5 rounded-xl border border-[#E7E1D9] bg-white px-5 py-4 shadow-[0_1px_2px_rgba(28,27,26,0.04),0_12px_32px_-24px_rgba(28,27,26,0.18)]">
                            {header}
                        </div>
                    )}
                    {children}
                </main>
            </div>

            <SyncDrawer />
        </div>
    );
}
