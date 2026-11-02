import { NAV_ITEMS, visibleNavItems, type NavItem } from '@/Constants/navigation';
import { BT_SIDEBAR } from '@/theme';
import { Link, usePage } from '@inertiajs/react';
import { ConfigProvider, Drawer, Menu } from 'antd';
import { ChevronLeft, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { type PageProps } from '@/types';

const SIDER_COLLAPSED_KEY = 'bt-sidebar-collapsed';
const POP_KEY = 'bt-sidebar-pop';

const GRAIN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E")`;

const EASE = 'cubic-bezier(0.22,1,0.36,1)';

function toAntdItems(items: NavItem[], currentUrl: string, unreadNotifications: number, collapsed: boolean) {
    return items.map((item) => {
        const Icon = item.icon;
        const active = currentUrl === item.href || currentUrl.startsWith(item.href + '/');
        const badge = item.badge === 'notifications' ? unreadNotifications : 0;

        return {
            key: item.href,
            icon: <Icon size={18} />,
            label: (
                <Link
                    href={item.href}
                    className="bt-nav-link !text-inherit block"
                >
                    <span className="flex items-center justify-between">
                        <span className="bt-nav-label-text truncate">{item.label}</span>
                        {badge > 0 && !collapsed && (
                            <span className="ms-2 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#C1121F] font-mono text-[9px] font-semibold text-white">
                                {badge > 99 ? '99+' : badge}
                            </span>
                        )}
                    </span>
                </Link>
            ),
            className: active ? 'bt-nav-active' : '',
        };
    });
}

export default function Sidebar({
    mobileOpen,
    onClose,
    collapsed,
    onToggleCollapse,
}: {
    mobileOpen: boolean;
    onClose: () => void;
    collapsed: boolean;
    onToggleCollapse: () => void;
}) {
    const { auth, unreadNotifications } = usePage<PageProps>().props;
    const currentUrl = usePage().url.split('?')[0];
    const roles = auth.user?.roles ?? [];
    const items = visibleNavItems(roles);

    const [popIn] = useState<boolean>(() => {
        try {
            return window.sessionStorage.getItem(POP_KEY) === '1';
        } catch {
            return false;
        }
    });

    useEffect(() => {
        try {
            window.sessionStorage.removeItem(POP_KEY);
        } catch {}
    }, []);

    const menuItems = useMemo(
        () => toAntdItems(items, currentUrl, unreadNotifications ?? 0, collapsed),
        [items, currentUrl, unreadNotifications, collapsed],
    );

    const selectedKeys = useMemo(() => {
        const match = items.find(
            (item) => currentUrl === item.href || currentUrl.startsWith(item.href + '/'),
        );
        return match ? [match.href] : [];
    }, [items, currentUrl]);

    const sidebarStyles = `
        .bt-sidebar-wrapper {
            transition: width 300ms ${EASE};
        }

        .bt-brand-halo {
            animation: bt-brand-halo 5s ease-in-out infinite;
        }
        @keyframes bt-brand-halo {
            0%, 100% { opacity: 0.15; transform: scale(1); }
            50% { opacity: 0.3; transform: scale(1.1); }
        }

        @keyframes bt-toggle-ping {
            0% { box-shadow: 0 0 0 0 rgba(193,18,31,0.25); }
            70%, 100% { box-shadow: 0 0 0 8px rgba(193,18,31,0); }
        }
        .bt-toggle-ping {
            animation: bt-toggle-ping 2.6s ${EASE} infinite;
        }

        @keyframes bt-pop {
            0% { opacity: 0; transform: scale(0.4) translateY(10px); }
            70% { opacity: 1; transform: scale(1.07) translateY(0); }
            100% { opacity: 1; transform: scale(1) translateY(0); }
        }

        .bt-scroll {
            scrollbar-width: thin;
            scrollbar-color: rgba(28,27,26,0.12) transparent;
        }
        .bt-scroll::-webkit-scrollbar { width: 4px; }
        .bt-scroll::-webkit-scrollbar-thumb { background: rgba(28,27,26,0.12); border-radius: 9999px; }
        .bt-scroll::-webkit-scrollbar-track { background: transparent; }

        .bt-sidebar-menu .ant-menu-item {
            transition: all 300ms ${EASE} !important;
            position: relative;
        }
        .bt-sidebar-menu .ant-menu-item .ant-menu-title-content {
            transition: opacity 300ms ${EASE}, max-width 300ms ${EASE} !important;
        }
        .bt-sidebar-menu .ant-menu-item .ant-menu-item-icon,
        .bt-sidebar-menu .ant-menu-item .anticon {
            transition: all 300ms ${EASE} !important;
        }

        .bt-sidebar-menu .ant-menu-item:hover:not(.bt-nav-active) {
            background: #FAF7F2 !important;
        }

        .bt-nav-active {
            background: rgba(193,18,31,0.85) !important;
        }
        .bt-nav-active .bt-nav-link,
        .bt-nav-active .ant-menu-item-icon,
        .bt-nav-active .anticon {
            color: #FFFFFF !important;
        }
        .bt-nav-active::before {
            content: '';
            position: absolute;
            left: 0;
            top: 50%;
            transform: translateY(-50%);
            width: 3px;
            height: 20px;
            border-radius: 0 9999px 9999px 0;
            background: #D4A96A;
            box-shadow: 0 0 8px rgba(212,169,106,0.4);
            z-index: 1;
        }
        .bt-sidebar-menu .ant-menu-item.bt-nav-active:hover {
            background: rgb(193, 18, 30) !important;
        }
        .bt-sidebar-menu .ant-menu-item.bt-nav-active:hover .bt-nav-link,
        .bt-sidebar-menu .ant-menu-item.bt-nav-active:hover .ant-menu-item-icon,
        .bt-sidebar-menu .ant-menu-item.bt-nav-active:hover .anticon {
            color: rgba(255,255,255,0.85) !important;
        }

        .bt-nav-link {
            transition: opacity 300ms ${EASE};
        }

        .bt-brand-text {
            display: inline-block;
            overflow: hidden;
            white-space: nowrap;
            transition: max-width 300ms ${EASE}, opacity 300ms ${EASE}, margin 300ms ${EASE};
            max-width: 12rem;
            opacity: 1;
        }
        .bt-brand-text.bt-collapsed {
            max-width: 0;
            opacity: 0;
            margin-left: 0 !important;
        }

        .bt-sidebar-collapsed .bt-sidebar-menu .ant-menu-item {
            justify-content: center !important;
            padding: 0 !important;
        }
        .bt-sidebar-collapsed .bt-sidebar-menu .ant-menu-item .ant-menu-item-icon,
        .bt-sidebar-collapsed .bt-sidebar-menu .ant-menu-item .anticon {
            margin-inline: 0 !important;
            font-size: 18px !important;
        }
        .bt-sidebar-collapsed .bt-sidebar-menu .ant-menu-item .ant-menu-title-content {
            display: none !important;
        }

        .bt-header-wrap {
            transition: justify-content 300ms ${EASE}, padding 300ms ${EASE};
        }

        @media (prefers-reduced-motion: reduce) {
            .bt-sidebar-wrapper,
            .bt-sidebar-menu .ant-menu-item,
            .bt-sidebar-menu .ant-menu-item .ant-menu-title-content,
            .bt-sidebar-menu .ant-menu-item .ant-menu-item-icon,
            .bt-sidebar-menu .ant-menu-item .anticon,
            .bt-nav-link,
            .bt-brand-text,
            .bt-header-wrap {
                transition: none !important;
            }
            .bt-brand-halo, .bt-toggle-ping { animation: none !important; }
        }
    `;

    const siderContent = (
        <div className="relative flex h-full flex-col">
            <style>{sidebarStyles}</style>

            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
            >
                <div
                    className="absolute inset-0 opacity-[0.02]"
                    style={{ backgroundImage: GRAIN }}
                />
            </div>

            <div className={`bt-header-wrap flex h-16 shrink-0 items-center border-b border-[#E7E1D9] ${collapsed ? 'justify-center px-2' : 'px-4'}`}>
                <Link
                    href="/dashboard"
                    className="flex min-w-0 items-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C1121F]/40"
                >
                    <span className="relative flex h-9 w-9 shrink-0 items-center justify-center">
                        <span
                            aria-hidden="true"
                            className="bt-brand-halo absolute -inset-1.5 rounded-2xl bg-[#C1121F]/20 blur-lg"
                        />
                        <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#C1121F] to-[#780000] font-mono text-[13px] font-semibold tracking-tight text-white shadow-[0_4px_12px_rgba(193,18,31,0.3)]">
                            BT
                            <span
                                aria-hidden="true"
                                className="absolute inset-0 rounded-xl border border-[#D4A96A]/30"
                            />
                        </span>
                    </span>
                    <span className={`bt-brand-text ml-3 font-bold text-[#1C1B1A] text-xl ${collapsed ? 'bt-collapsed' : ''}`}>
                        Bunga Teratai
                    </span>
                </Link>
            </div>

            <nav className="flex-1 overflow-y-auto overflow-x-hidden px-1 py-4 bt-scroll">
                <ConfigProvider
                    theme={{
                        components: {
                            Menu: {
                                itemBg: 'transparent',
                                subMenuItemBg: 'transparent',
                                itemColor: 'rgba(28,27,26,0.65)',
                                itemHoverColor: '#1C1B1A',
                                itemHoverBg: '#FAF7F2',
                                itemSelectedBg: 'rgba(193,18,31,0.85)',
                                itemSelectedColor: '#FFFFFF',
                                itemActiveBg: 'rgba(193,18,31,0.85)',
                                itemBorderRadius: 8,
                                itemMarginInline: 8,
                                itemPaddingInline: 12,
                                iconSize: 18,
                                collapsedIconSize: 18,
                            },
                        },
                    }}
                >
                    <Menu
                        mode="inline"
                        theme="light"
                        items={menuItems}
                        selectedKeys={selectedKeys}
                        inlineCollapsed={collapsed}
                        className="bt-sidebar-menu border-none bg-transparent"
                        style={
                            popIn
                                ? {
                                      animation: 'bt-pop 0.5s cubic-bezier(0.22,1,0.36,1) backwards',
                                  }
                                : undefined
                        }
                    />
                </ConfigProvider>
            </nav>
        </div>
    );

    return (
        <>
            {mobileOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
                    onClick={onClose}
                />
            )}

            <Drawer
                open={mobileOpen}
                onClose={onClose}
                placement="left"
                width={280}
                styles={{
                    body: { padding: 0, background: '#FFFFFF' },
                    header: { display: 'none' },
                    wrapper: { boxShadow: 'none' },
                }}
                closable={false}
                className="lg:hidden"
            >
                <div className="relative">
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Tutup menu"
                        className="absolute end-3 top-3 z-10 rounded-lg p-1.5 text-[#8A8580] transition-colors duration-200 hover:bg-[#FAF7F2] hover:text-[#1C1B1A]"
                    >
                        <X size={18} />
                    </button>
                    {siderContent}
                </div>
            </Drawer>

            <aside
                className="bt-sidebar-wrapper fixed inset-y-0 left-0 z-50 hidden border-r border-[#E7E1D9] lg:block"
                style={{ background: BT_SIDEBAR, width: collapsed ? '5rem' : '16rem' }}
            >
                <div className={`flex h-full flex-col overflow-hidden ${collapsed ? 'bt-sidebar-collapsed' : ''}`}>
                    <button
                        type="button"
                        onClick={onToggleCollapse}
                        aria-label={collapsed ? 'Tampilkan sidebar' : 'Sembunyikan sidebar'}
                        aria-expanded={!collapsed}
                        title={collapsed ? 'Tampilkan sidebar' : 'Sembunyikan sidebar'}
                        className="absolute -right-4 top-1/2 z-10 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-[#E7E1D9] bg-white text-[#8A8580] shadow-[0_2px_8px_rgba(28,27,26,0.12)] transition-all duration-200 hover:border-[#C1121F] hover:bg-[#C1121F] hover:text-white hover:shadow-[0_4px_14px_rgba(193,18,31,0.3)] active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C1121F]/40 lg:flex"
                    >
                        <span
                            aria-hidden="true"
                            className="bt-toggle-ping absolute inset-0 rounded-full"
                        />
                        <ChevronLeft
                            size={15}
                            className={`transition-transform duration-300 ${EASE} ${
                                collapsed ? 'rotate-180' : ''
                            }`}
                            style={{ transitionTimingFunction: EASE }}
                        />
                    </button>
                    {siderContent}
                </div>
            </aside>
        </>
    );
}

export { NAV_ITEMS };
