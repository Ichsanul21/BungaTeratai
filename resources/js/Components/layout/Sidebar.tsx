import { NAV_ITEMS, visibleNavItems } from '@/Constants/navigation';
import { classNames } from '@/lib/format';
import { Link, usePage } from '@inertiajs/react';
import { Ship, X } from 'lucide-react';
import { type PageProps } from '@/types';

export default function Sidebar({
    mobileOpen,
    onClose,
}: {
    mobileOpen: boolean;
    onClose: () => void;
}) {
    const { auth, unreadNotifications } = usePage<PageProps>().props;
    const currentUrl = usePage().url.split('?')[0];
    const roles = auth.user?.roles ?? [];
    const items = visibleNavItems(roles);

    return (
        <>
            {mobileOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 lg:hidden"
                    onClick={onClose}
                />
            )}
            <aside
                className={classNames(
                    'fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar transition-transform duration-200 lg:translate-x-0',
                    mobileOpen ? 'translate-x-0' : '-translate-x-full',
                )}
            >
                <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
                    <Link href="/dashboard" className="flex items-center gap-2.5">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white">
                            <Ship size={18} />
                        </span>
                        <span className="leading-tight">
                            <span className="block text-sm font-semibold text-white">
                                Bunga Teratai
                            </span>
                            <span className="block text-[11px] text-white/50">
                                System
                            </span>
                        </span>
                    </Link>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md p-1.5 text-white/60 hover:bg-white/10 hover:text-white lg:hidden"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 rounded border border-primary/60 bg-primary/15 px-2 py-0.5 text-[10px] font-bold tracking-widest text-white">
                        DEMO DATA
                    </span>
                </div>

                <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-4">
                    {items.map((item) => {
                        const Icon = item.icon;
                        const active =
                            currentUrl === item.href ||
                            currentUrl.startsWith(item.href + '/');
                        const badge =
                            item.badge === 'notifications'
                                ? (unreadNotifications ?? 0)
                                : 0;

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={onClose}
                                className={classNames(
                                    'flex items-center gap-3 rounded-lg border-l-4 px-3 py-2.5 text-sm font-medium transition',
                                    active
                                        ? 'border-primary bg-sidebarhover text-white'
                                        : 'border-transparent text-white/65 hover:bg-sidebarhover/60 hover:text-white',
                                )}
                            >
                                <Icon size={17} className="shrink-0" />
                                <span className="flex-1 truncate">{item.label}</span>
                                {badge > 0 && (
                                    <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-white">
                                        {badge > 99 ? '99+' : badge}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                <div className="border-t border-white/10 px-4 py-3">
                    <p className="text-[11px] leading-relaxed text-white/40">
                        Maritime Document &amp; Operations Management
                        <br />
                        Samarinda · WITA
                    </p>
                </div>
            </aside>
        </>
    );
}

export { NAV_ITEMS };
