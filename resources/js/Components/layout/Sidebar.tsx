import { NAV_ITEMS, visibleNavItems, type NavItem } from '@/Constants/navigation';
import { Link, usePage } from '@inertiajs/react';
import { ConfigProvider, Drawer, Menu, Popover } from 'antd';
import { Bell, BellRing, CalendarClock, ChevronLeft, ClipboardCheck, Info, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { type PageProps } from '@/types';

const POP_KEY = 'bt-sidebar-pop';
const EASE = 'cubic-bezier(0.22,1,0.36,1)';
const RAIL_TOGGLE_LEFT = 58;
const RAIL_TOGGLE_LEFT_EXPANDED = 226;

type NotifKey = 'unread' | 'reminder' | 'workflow';

const NOTIF_ITEMS: Array<{ key: NotifKey; label: string; icon: typeof Bell; tone: string }> = [
    { key: 'unread', label: 'Belum Dibaca', icon: BellRing, tone: '#BA0C2F' },
    { key: 'reminder', label: 'Reminder Dokumen', icon: CalendarClock, tone: '#B45309' },
    { key: 'workflow', label: 'Workflow & Operasional', icon: ClipboardCheck, tone: '#00205B' },
];

function toAntdItems(items: NavItem[]) {
    return items.map((item) => {
        const Icon = item.icon;
        return {
            key: item.href,
            icon: <Icon size={18} />,
            label: (
                <Link href={item.href} className="!text-inherit block -mx-3 -my-2 px-3 py-2">
                    <span className="truncate">{item.label}</span>
                </Link>
            ),
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
    /** Kondisi visual rail saat ini. */
    collapsed: boolean;
    onToggleCollapse: () => void;
}) {
    const { auth, unreadNotifications, notifCounts } = usePage<PageProps>().props;
    const currentUrl = usePage().url.split('?')[0];
    const currentQuery = usePage().url.split('?')[1] ?? '';
    const roles = auth.user?.roles ?? [];
    const items = visibleNavItems(roles);

    const counts = notifCounts ?? {
        total: unreadNotifications ?? 0,
        unread: unreadNotifications ?? 0,
        reminder: 0,
        workflow: 0,
    };
    const totalNotif = counts.total ?? 0;

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

    const menuItems = useMemo(() => toAntdItems(items), [items]);

    const selectedKeys = useMemo(() => {
        const match = items.find(
            (item) => currentUrl === item.href || currentUrl.startsWith(item.href + '/'),
        );
        return match ? [match.href] : [];
    }, [items, currentUrl]);

    const notifActiveKey = currentUrl === '/notifikasi'
        ? (new URLSearchParams(currentQuery).get('filter') ?? 'semua')
        : null;

    const notifBlock = (
        <div className="px-2.5 pb-3">
            <div
                className="rounded-2xl border border-[#F5D9DF] p-2.5 shadow-[0_10px_24px_-18px_rgba(186,12,47,0.55)]"
                style={{ background: 'linear-gradient(180deg, #FDF1F3 0%, #FCEFF1 55%, #FCF8F9 100%)' }}
            >
                <div className="mb-2 flex items-center justify-between gap-2 px-1">
                    <span className="flex items-center gap-1.5">
                        <BellRing size={11} className="text-[#BA0C2F]" />
                        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8E0924]">
                            Notifikasi
                        </span>
                    </span>
                    <span
                        className="inline-flex min-w-[1.75rem] items-center justify-center rounded-full bg-[#BA0C2F] px-2 py-[3px] font-mono text-[10px] font-semibold leading-none tabular-nums text-white shadow-[0_4px_10px_-6px_rgba(186,12,47,0.9)]"
                        title={`${totalNotif} notifikasi`}
                    >
                        {totalNotif}
                    </span>
                </div>

                <div className="space-y-0.5">
                    {NOTIF_ITEMS.map((n) => {
                        const Icon = n.icon;
                        const count = counts[n.key] ?? 0;
                        const active = notifActiveKey === n.key;
                        return (
                            <Link
                                key={n.key}
                                href={`/notifikasi?filter=${n.key}`}
                                onClick={onClose}
                                className={`group flex items-center gap-2.5 rounded-[10px] px-2 py-1.5 text-[12.5px] transition-all duration-150 ${
                                    active
                                        ? 'border border-[#F3D2D9] bg-white font-semibold text-[#BA0C2F] shadow-[0_2px_8px_-4px_rgba(186,12,47,0.45)]'
                                        : 'border border-transparent text-[#111827]/75 hover:border-[#F5D9DF] hover:bg-white/70 hover:text-[#111827]'
                                }`}
                            >
                                <span
                                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white shadow-[0_1px_2px_rgba(17,24,39,0.06)]"
                                    style={{ color: n.tone }}
                                >
                                    <Icon size={13} />
                                </span>
                                <span className="min-w-0 flex-1 truncate">{n.label}</span>
                                <span
                                    className={`shrink-0 rounded-full px-1.5 py-0.5 font-mono text-[10px] font-semibold leading-none tabular-nums ${
                                        count > 0 ? 'bg-white text-[#BA0C2F]' : 'bg-white/60 text-[#5B6474]'
                                    }`}
                                >
                                    {count}
                                </span>
                            </Link>
                        );
                    })}
                </div>

                <Link
                    href="/notifikasi"
                    onClick={onClose}
                    className="mt-1.5 flex items-center justify-center gap-1 rounded-[10px] border border-transparent px-2.5 py-1.5 text-[11px] font-semibold text-[#8E0924] transition-colors hover:border-[#F3D2D9] hover:bg-white/80"
                >
                    Lihat semua notifikasi
                </Link>
            </div>
        </div>
    );

    const collapsedNotif = (
        <Popover
            placement="right"
            trigger="click"
            content={
                <div className="w-60">
                    <div className="mb-2 flex items-center justify-between">
                        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8E0924]">
                            Notifikasi
                        </p>
                        <span className="rounded-full bg-[#BA0C2F] px-2 py-[3px] font-mono text-[10px] font-semibold leading-none tabular-nums text-white">
                            {totalNotif}
                        </span>
                    </div>
                    <div className="space-y-1">
                        {NOTIF_ITEMS.map((n) => {
                            const Icon = n.icon;
                            const count = counts[n.key] ?? 0;
                            return (
                                <Link
                                    key={n.key}
                                    href={`/notifikasi?filter=${n.key}`}
                                    onClick={onClose}
                                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[12px] text-[#111827] hover:bg-[#F5F7FA]"
                                >
                                    <Icon size={14} style={{ color: n.tone }} />
                                    <span className="flex-1">{n.label}</span>
                                    <span className="font-mono text-[11px] font-semibold tabular-nums text-[#BA0C2F]">
                                        {count}
                                    </span>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            }
        >
            <button
                type="button"
                className="relative flex h-10 w-10 items-center justify-center rounded-[10px] border border-[#F5D9DF] bg-[#FDF1F3] text-[#BA0C2F] transition-colors hover:bg-[#FCE7EB]"
                aria-label={`Notifikasi (${totalNotif})`}
            >
                <Bell size={17} />
                <span className="absolute -right-1 -top-1 inline-flex min-w-[16px] items-center justify-center rounded-full bg-[#BA0C2F] px-1 font-mono text-[9px] font-semibold leading-4 tabular-nums text-white">
                    {totalNotif}
                </span>
            </button>
        </Popover>
    );

    const content = (
        <div className={`relative flex h-full flex-col bg-white ${collapsed ? '' : 'lg:pr-3'}`}>
            <style>{`
                @keyframes bt-pop {
                    0% { opacity: 0; transform: translateY(6px); }
                    100% { opacity: 1; transform: translateY(0); }
                }
                .bt-rail .ant-menu-item { transition: background 160ms ${EASE}, color 160ms ${EASE}; }
                /* Kolom ikon saat rail mengecil: paksa tepat di tengah kartu. */
                .bt-rail.ant-menu-inline-collapsed { width: 100% !important; }
                .bt-rail.ant-menu-inline-collapsed > .ant-menu-item {
                    width: 100% !important;
                    margin-inline: 0 !important;
                    padding-inline: 0 !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                }
                .bt-rail.ant-menu-inline-collapsed .ant-menu-item-icon { margin-inline-end: 0 !important; }
                @media (prefers-reduced-motion: reduce) { .bt-anim, .bt-anim * { animation: none !important; } }
            `}</style>

            <div
                className={`flex h-16 shrink-0 items-center border-b border-[#E3E8F0] ${
                    collapsed ? 'justify-center px-2' : 'px-4'
                }`}
            >
                <Link
                    href="/dashboard"
                    onClick={onClose}
                    className="flex min-w-0 items-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#BA0C2F]/40"
                >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#BA0C2F] font-mono text-[13px] font-semibold tracking-tight text-white shadow-[0_6px_18px_-8px_rgba(186,12,47,0.6)]">
                        BT
                    </span>
                    {!collapsed && (
                        <span className="ml-3 min-w-0 overflow-hidden whitespace-nowrap">
                            <span className="block text-[15px] font-semibold tracking-tight text-[#111827]">
                                Bunga Teratai
                            </span>
                            <span className="block font-mono text-[9px] uppercase tracking-[0.16em] text-[#5B6474]">
                                Shipping ERP
                            </span>
                        </span>
                    )}
                </Link>
            </div>

            <nav className="bt-scroll flex-1 overflow-y-auto overflow-x-hidden py-3">
                <style>{`
                    .bt-scroll { scrollbar-gutter: stable both-edges; }
                    .bt-scroll::-webkit-scrollbar { width: 1px; height: 1px; }
                    .bt-scroll::-webkit-scrollbar-thumb { background: rgba(186,12,47,0.55); border-radius: 9999px; }
                    .bt-scroll::-webkit-scrollbar-track { background: transparent; }
                    .bt-scroll::-webkit-scrollbar-button { display: none; width: 0; height: 0; }
                    .bt-scroll::-webkit-scrollbar-corner { background: transparent; }
                    /* Firefox tidak mendukung ::-webkit-scrollbar */
                    @supports not selector(::-webkit-scrollbar) {
                        .bt-scroll { scrollbar-width: thin; scrollbar-color: rgba(186,12,47,0.55) transparent; }
                    }
                `}</style>
                <ConfigProvider theme={{ components: { Menu: { itemMarginInline: collapsed ? 0 : 10, itemHeight: 40, itemBorderRadius: 10 } } }}>
                    <Menu
                        mode="inline"
                        theme="light"
                        items={menuItems}
                        selectedKeys={selectedKeys}
                        inlineCollapsed={collapsed}
                        className="bt-rail border-none bg-transparent"
                        style={popIn ? { animation: 'bt-pop 0.35s ' + EASE + ' both' } : undefined}
                    />
                </ConfigProvider>
            </nav>

            <div className="shrink-0 border-t border-[#E3E8F0] pt-3">
                {collapsed ? (
                    <div className="flex flex-col items-center gap-1 pb-3">{collapsedNotif}</div>
                ) : (
                    notifBlock
                )}
            </div>

            <div className={`shrink-0 border-t border-[#E3E8F0] py-3 ${collapsed ? 'flex justify-center px-2' : 'px-4'}`}>
                {collapsed ? (
                    <Link
                        href="/laporan"
                        title="Bantuan & laporan"
                        className="flex h-9 w-9 items-center justify-center rounded-[10px] text-[#5B6474] hover:bg-[#F5F7FA] hover:text-[#111827]"
                    >
                        <Info size={17} />
                    </Link>
                ) : (
                    <div className="flex items-center justify-between gap-2">
                        <Link
                            href="/laporan"
                            className="flex items-center gap-2 rounded-[10px] px-2 py-1.5 text-[12px] text-[#5B6474] hover:bg-[#F5F7FA] hover:text-[#111827]"
                        >
                            <Info size={15} />
                            Bantuan & laporan
                        </Link>
                        <span className="rounded-full border border-[#E3E8F0] px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-[#5B6474]">
                            Demo
                        </span>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <>
            {mobileOpen && (
                <div
                    className="fixed inset-0 z-40 bg-[#111827]/40 backdrop-blur-sm lg:hidden"
                    onClick={onClose}
                />
            )}

            <Drawer
                open={mobileOpen}
                onClose={onClose}
                placement="left"
                width={272}
                styles={{ body: { padding: 0, background: '#FFFFFF' }, header: { display: 'none' }, wrapper: { boxShadow: 'none' } }}
                closable={false}
                className="lg:hidden"
            >
                <div className="relative h-full">
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Tutup menu"
                        className="absolute end-3 top-4 z-10 rounded-lg p-1.5 text-[#5B6474] transition-colors hover:bg-[#F5F7FA] hover:text-[#111827]"
                    >
                        <X size={18} />
                    </button>
                    {content}
                </div>
            </Drawer>

            <button
                type="button"
                onClick={onToggleCollapse}
                aria-label={collapsed ? 'Perluas sidebar' : 'Ringkas sidebar'}
                aria-expanded={!collapsed}
                title={collapsed ? 'Perluas sidebar' : 'Ringkas sidebar'}
                className="fixed top-1/2 z-50 hidden h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-[#E3E8F0] bg-white text-[#5B6474] shadow-[0_4px_12px_rgba(17,24,39,0.12)] transition-all duration-300 hover:border-[#BA0C2F] hover:text-[#BA0C2F] lg:flex"
                style={{
                    left: collapsed ? RAIL_TOGGLE_LEFT : RAIL_TOGGLE_LEFT_EXPANDED,
                    transitionTimingFunction: EASE,
                }}
            >
                <ChevronLeft
                    size={14}
                    className={`transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`}
                    style={{ transitionTimingFunction: EASE }}
                />
            </button>

            <aside
                className={`fixed z-10 hidden bg-white transition-all duration-300 lg:block ${
                    collapsed
                        ? 'bottom-6 left-2 top-6 w-[64px] overflow-hidden rounded-2xl border border-[#E3E8F0] shadow-[0_18px_40px_-24px_rgba(17,24,39,0.35)]'
                        : 'inset-y-0 left-0 w-[240px] border-r border-[#E3E8F0]'
                }`}
                style={{ transitionTimingFunction: EASE }}
            >
                {content}
            </aside>
        </>
    );
}

export { NAV_ITEMS };
