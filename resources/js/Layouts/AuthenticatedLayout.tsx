import OfflineBanner from '@/Components/sync/OfflineBanner';
import SyncDrawer from '@/Components/sync/SyncDrawer';
import ImpersonationBanner from '@/Components/dev/ImpersonationBanner';
import SecurityWatermark from '@/Components/watermark/SecurityWatermark';
import Sidebar from '@/Components/layout/Sidebar';
import Topbar from '@/Components/layout/Topbar';
import { type PageProps } from '@/types';
import { notification } from 'antd';
import { usePage } from '@inertiajs/react';
import { ReactNode, useEffect, useState } from 'react';

const SIDEBAR_COLLAPSED_KEY = 'bt-sidebar-collapsed';
const EASE = 'cubic-bezier(0.22,1,0.36,1)';

const cx = (...classes: Array<string | false | undefined>) =>
    classes.filter(Boolean).join(' ');

export default function AuthenticatedLayout({
    header,
    children,
}: {
    header?: ReactNode;
    children: ReactNode;
}) {
    const { flash } = usePage<PageProps>().props;
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    // Sidebar dikontrol manual lewat tombol di tengah rail (tanpa auto hover).
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
            window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, sidebarCollapsed ? '1' : '0');
        } catch {}
    }, [sidebarCollapsed]);

    const sidebarExpanded = !sidebarCollapsed;

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
            notification.success({ message: flash.success, placement: 'bottomRight', duration: 5 });
        } else if (flash?.error) {
            notification.error({ message: flash.error, placement: 'bottomRight', duration: 5 });
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
                setTimeout(() => el.classList.remove('bt-record-highlight'), 3000);
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
        <div className="h-dvh overflow-hidden bg-[#F5F7FA]">
            <style>{`
                @keyframes bt-record-pulse {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(186, 12, 47, 0); background-color: transparent; }
                    50% { box-shadow: 0 0 0 4px rgba(186, 12, 47, 0.4); background-color: rgba(186, 12, 47, 0.10); }
                }
                .bt-record-highlight {
                    animation: bt-record-pulse 1s ease-in-out 3;
                    border-radius: 0.5rem;
                    position: relative;
                    z-index: 10;
                }
                .bt-main-scroll::-webkit-scrollbar { width: 4px; height: 4px; }
                .bt-main-scroll::-webkit-scrollbar-thumb {
                    background: rgba(186,12,47,0.45); border-radius: 9999px;
                }
                .bt-main-scroll::-webkit-scrollbar-track { background: transparent; }
                .bt-main-scroll::-webkit-scrollbar-button { display: none; width: 0; height: 0; }
                .bt-main-scroll::-webkit-scrollbar-corner { background: transparent; }
                @supports not selector(::-webkit-scrollbar) {
                    .bt-main-scroll { scrollbar-width: thin; scrollbar-color: rgba(186,12,47,0.45) transparent; }
                }
                @media (prefers-reduced-motion: reduce) {
                    .bt-record-highlight { animation: none; outline: 3px solid rgba(186, 12, 47, 0.6); }
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
                    'flex h-full flex-col transition-[padding] duration-300',
                    sidebarExpanded ? 'lg:pl-[240px]' : 'lg:pl-[84px]',
                )}
                style={{ transitionTimingFunction: EASE }}
            >
                {/* Panel konten: sudut membulat menindih tepi sidebar saat rail terbuka. */}
                <div
                    className={cx(
                        'relative z-20 flex h-full flex-1 flex-col bg-[#F5F7FA] transition-all duration-300',
                        'lg:overflow-hidden lg:rounded-l-[28px] lg:border-l lg:border-[#E3E8F0] lg:shadow-[-18px_0_40px_-24px_rgba(17,24,39,0.25)]',
                        sidebarExpanded && 'lg:-ml-3',
                    )}
                    style={{ transitionTimingFunction: EASE }}
                >
                    <Topbar onOpenSidebar={() => setSidebarOpen(true)} />

                    <ImpersonationBanner />

                    <div className="shrink-0">
                        <OfflineBanner />
                    </div>

                    <div
                        aria-hidden="true"
                        className={cx(
                            'pointer-events-none absolute inset-x-0 top-16 z-10 h-3 bg-gradient-to-b from-[#111827]/8 to-transparent transition-opacity duration-200',
                            scrolled ? 'opacity-100' : 'opacity-0',
                        )}
                    />

                    <main
                        id="bt-main"
                        onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 4)}
                        className="bt-main-scroll flex-1 overflow-y-auto overscroll-contain px-4 py-6 lg:px-7 lg:py-7"
                    >
                        {header && (
                            <div className="mb-5 rounded-2xl border border-[#E3E8F0] bg-white px-5 py-4 shadow-[0_1px_2px_rgba(17,24,39,0.04)]">
                                {header}
                            </div>
                        )}
                        {children}
                    </main>
                </div>
            </div>

            <SyncDrawer />

            <SecurityWatermark />
        </div>
    );
}
