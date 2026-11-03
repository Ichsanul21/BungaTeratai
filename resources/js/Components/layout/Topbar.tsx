import { ROLE_LABELS } from '@/Constants/navigation';
import SyncStatusChip from '@/Components/sync/SyncStatusChip';
import { type PageProps } from '@/types';
import { useSync } from '@/lib/sync/SyncProvider';
import { Link, useForm, usePage } from '@inertiajs/react';
import { Avatar, Badge, ConfigProvider, Dropdown, Input, type MenuProps } from 'antd';
import { Bell, ChevronDown, LogOut, Menu, Search, User } from 'lucide-react';
import { FormEventHandler, useEffect, useMemo, useState } from 'react';

const CLOCK_TZ = 'Asia/Makassar';
const POP_KEY = 'bt-sidebar-pop';

export default function Topbar({ onOpenSidebar }: { onOpenSidebar: () => void }) {
    const { auth, unreadNotifications, notifCounts } = usePage<PageProps>().props;
    const { state: syncState } = useSync();
    const badgeCount = (notifCounts?.unread ?? unreadNotifications ?? 0) + syncState.notificationsHint;
    const user = auth.user;
    const initials = (user?.name ?? '?')
        .split(' ')
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase();
    const roles = (user?.roles ?? []).map((r) => ROLE_LABELS[r] ?? r);

    const photo =
        (user as { profile_photo_url?: string } | undefined)?.profile_photo_url ??
        (user as { avatar?: string } | undefined)?.avatar;

    const { post: postLogout } = useForm({});
    const [now, setNow] = useState<{ date: string; time: string } | null>(null);

    useEffect(() => {
        const dateFmt = new Intl.DateTimeFormat('id-ID', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: CLOCK_TZ,
        });
        const timeFmt = new Intl.DateTimeFormat('id-ID', {
            hour: '2-digit', minute: '2-digit', hour12: false, timeZone: CLOCK_TZ,
        });
        const tick = () => {
            const d = new Date();
            setNow({ date: dateFmt.format(d), time: timeFmt.format(d).replace(/\./g, ':') });
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, []);

    const logout: FormEventHandler = (e) => {
        e.preventDefault();
        try {
            window.sessionStorage.removeItem(POP_KEY);
        } catch {}
        postLogout(route('logout'));
    };

    const userMenuItems: MenuProps['items'] = useMemo(
        () => [
            {
                key: 'user-info',
                type: 'group',
                label: (
                    <div className="px-1 py-1">
                        <div className="flex items-center gap-3">
                            <Avatar
                                size={44}
                                src={photo}
                                style={{ background: 'linear-gradient(135deg, #BA0C2F, #00205B)', color: '#FFFFFF' }}
                            >
                                {initials}
                            </Avatar>
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-[#111827]">{user?.name}</p>
                                <p className="mt-0.5 truncate font-mono text-[11px] text-[#5B6474]">{user?.email}</p>
                            </div>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                            {roles.map((role) => (
                                <span
                                    key={role}
                                    className="rounded-md border border-[#E3E8F0] bg-[#F5F7FA] px-1.5 py-0.5 font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-[#5B6474]"
                                >
                                    {role}
                                </span>
                            ))}
                        </div>
                    </div>
                ),
            },
            { type: 'divider' },
            {
                key: 'profile',
                icon: <User size={15} />,
                label: <Link href={route('profile.edit')}>Profil Saya</Link>,
            },
            {
                key: 'logout',
                icon: <LogOut size={15} className="text-[#BA0C2F]" />,
                label: (
                    <form onSubmit={logout} className="w-full">
                        <button type="submit" className="w-full text-start text-[#BA0C2F]">Keluar</button>
                    </form>
                ),
                danger: true,
            },
        ],
        [user, photo, initials, roles],
    );

    return (
        <header className="relative z-20 flex h-16 shrink-0 items-center gap-3 border-b border-[#E3E8F0] bg-white px-4 lg:px-6">
            <style>{`
                @keyframes bt-menu {
                    0% { opacity: 0; transform: translateY(-6px); }
                    100% { opacity: 1; transform: translateY(0); }
                }
                .bt-menu { animation: bt-menu 0.2s cubic-bezier(0.22,1,0.36,1) both; }
            `}</style>

            <div className="flex min-w-0 items-center gap-2">
                <button
                    type="button"
                    onClick={onOpenSidebar}
                    aria-label="Buka menu"
                    className="rounded-xl p-2 text-[#5B6474] transition-colors hover:bg-[#F5F7FA] hover:text-[#111827] lg:hidden"
                >
                    <Menu size={20} />
                </button>
                <div className="hidden min-w-0 items-center gap-3 rounded-full border border-[#E3E8F0] bg-[#F5F7FA] py-1.5 ps-4 pe-4 lg:flex">
                    <span className="min-w-0 truncate text-[12px] font-medium text-[#5B6474]">
                        {now?.date ?? '\u00A0'}
                    </span>
                    <span aria-hidden="true" className="h-1 w-1 shrink-0 rounded-full bg-[#BA0C2F]" />
                    <span className="min-w-0 shrink-0 font-mono text-[12px] tabular-nums text-[#111827]">
                        {now?.time ?? '\u00A0'}
                        <span className="ms-1.5 hidden text-[10px] text-[#5B6474] xl:inline">WITA</span>
                    </span>
                </div>
            </div>

            <div className="hidden min-w-0 flex-1 sm:block lg:max-w-[32rem]">
                <ConfigProvider theme={{ components: { Input: { borderRadius: 9999, controlHeight: 40 } } }}>
                    <Input
                        prefix={<Search size={16} className="text-[#5B6474]" />}
                        placeholder="Cari kapal, dokumen, atau perjalanan…"
                        className="!border-[#E3E8F0] !bg-[#F5F7FA] hover:!border-[#111827]/30 focus:!border-[#BA0C2F]"
                        suffix={
                            <kbd className="pointer-events-none rounded-md border border-[#E3E8F0] bg-white px-1.5 py-0.5 font-mono text-[10px] font-medium text-[#5B6474]">
                                Ctrl K
                            </kbd>
                        }
                        onKeyDown={(e) => {
                            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') e.preventDefault();
                        }}
                    />
                </ConfigProvider>
            </div>

            <div className="ms-auto flex shrink-0 items-center justify-end gap-1.5">
                <SyncStatusChip />
                <Link
                    href="/notifikasi"
                    title="Notifikasi"
                    className="relative rounded-xl p-2 text-[#5B6474] transition-colors hover:bg-[#F5F7FA] hover:text-[#111827]"
                >
                    <Badge count={badgeCount} size="small" offset={[-2, 2]} overflowCount={9999}>
                        <Bell size={19} />
                    </Badge>
                </Link>

                <span aria-hidden="true" className="mx-1 hidden h-6 w-px bg-[#E3E8F0] lg:block" />

                <ConfigProvider theme={{ components: { Dropdown: { controlItemBgActive: '#F5F7FA' } } }}>
                    <Dropdown menu={{ items: userMenuItems }} trigger={['click']} overlayClassName="bt-menu">
                        <button
                            type="button"
                            className="group flex items-center gap-2.5 rounded-full py-1 ps-1.5 pe-2.5 transition-colors hover:bg-[#F5F7FA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#BA0C2F]/40"
                        >
                            <Avatar
                                size={36}
                                src={photo}
                                style={{ background: 'linear-gradient(135deg, #BA0C2F, #00205B)', flexShrink: 0 }}
                            >
                                {initials}
                            </Avatar>
                            <span className="hidden min-w-0 text-left lg:block">
                                <span className="block max-w-[10rem] truncate text-sm font-medium leading-4 text-[#111827]">
                                    {user?.name}
                                </span>
                                <span className="block max-w-[10rem] truncate text-[11px] leading-4 text-[#5B6474]">
                                    {roles.join(' · ')}
                                </span>
                            </span>
                            <ChevronDown size={14} className="hidden text-[#5B6474] lg:block" />
                        </button>
                    </Dropdown>
                </ConfigProvider>
            </div>
        </header>
    );
}
