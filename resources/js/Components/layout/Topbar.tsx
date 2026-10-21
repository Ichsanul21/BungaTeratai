import Dropdown from '@/Components/Dropdown';
import { ROLE_LABELS } from '@/Constants/navigation';
import { type PageProps } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { Bell, Menu, Search } from 'lucide-react';

export default function Topbar({ onOpenSidebar }: { onOpenSidebar: () => void }) {
    const { auth, unreadNotifications } = usePage<PageProps>().props;
    const user = auth.user;
    const initials = (user?.name ?? '?')
        .split(' ')
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase();

    return (
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-hairline bg-white/95 px-4 backdrop-blur lg:px-6">
            <button
                type="button"
                onClick={onOpenSidebar}
                className="rounded-md p-2 text-muted hover:bg-appbg hover:text-ink lg:hidden"
            >
                <Menu size={20} />
            </button>

            <div className="relative hidden max-w-md flex-1 sm:block">
                <Search
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                />
                <input
                    type="search"
                    placeholder="Cari kapal, dokumen, perjalanan…"
                    className="h-9 w-full rounded-lg border-hairline bg-appbg pl-9 pr-3 text-sm text-ink placeholder:text-muted focus:border-primary focus:bg-white focus:ring-primary"
                />
            </div>

            <div className="ms-auto flex items-center gap-2">
                <span className="hidden items-center rounded border border-primary/60 bg-primary/10 px-2 py-0.5 text-[10px] font-bold tracking-widest text-primary md:inline-flex">
                    DEMO DATA
                </span>

                <Link
                    href="/notifikasi"
                    className="relative rounded-lg p-2 text-muted transition hover:bg-appbg hover:text-ink"
                    title="Notifikasi"
                >
                    <Bell size={19} />
                    {(unreadNotifications ?? 0) > 0 && (
                        <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold leading-4 text-white">
                            {(unreadNotifications ?? 0) > 99
                                ? '99+'
                                : unreadNotifications}
                        </span>
                    )}
                </Link>

                <div className="relative">
                    <Dropdown>
                        <Dropdown.Trigger>
                            <button
                                type="button"
                                className="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 transition hover:bg-appbg"
                            >
                                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-maritime text-xs font-semibold text-white">
                                    {initials}
                                </span>
                                <span className="hidden text-left md:block">
                                    <span className="block max-w-40 truncate text-sm font-medium leading-4 text-ink">
                                        {user?.name}
                                    </span>
                                    <span className="block text-[11px] text-muted">
                                        {(user?.roles ?? [])
                                            .map((r) => ROLE_LABELS[r] ?? r)
                                            .join(' · ')}
                                    </span>
                                </span>
                            </button>
                        </Dropdown.Trigger>

                        <Dropdown.Content>
                            <div className="px-4 py-2">
                                <p className="text-sm font-medium text-ink">{user?.name}</p>
                                <p className="text-xs text-muted">{user?.email}</p>
                                <p className="mt-1 text-[11px] text-muted">
                                    {(user?.roles ?? [])
                                        .map((r) => ROLE_LABELS[r] ?? r)
                                        .join(' · ')}
                                </p>
                            </div>
                            <div className="border-t border-hairline" />
                            <Dropdown.Link href={route('profile.edit')}>
                                Profil Saya
                            </Dropdown.Link>
                            <Dropdown.Link
                                href={route('logout')}
                                method="post"
                                as="button"
                            >
                                Keluar
                            </Dropdown.Link>
                        </Dropdown.Content>
                    </Dropdown>
                </div>
            </div>
        </header>
    );
}
