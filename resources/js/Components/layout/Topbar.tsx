import { ROLE_LABELS } from '@/Constants/navigation';
import SyncStatusChip from '@/Components/sync/SyncStatusChip';
import { BT_PRIMARY } from '@/theme';
import { type PageProps } from '@/types';
import { useSync } from '@/lib/sync/SyncProvider';
import { Link, useForm, usePage, router } from '@inertiajs/react';
import { Avatar, Badge, ConfigProvider, Dropdown, Input, MenuProps, Typography } from 'antd';
import {
    Bell,
    ChevronDown,
    LogOut,
    Menu,
    Search,
    User,
} from 'lucide-react';
import { FormEventHandler, useEffect, useMemo, useState } from 'react';

const CLOCK_TZ = 'Asia/Makassar';
const POP_KEY = 'bt-sidebar-pop';

const { Text } = Typography;

export default function Topbar({
    onOpenSidebar,
}: {
    onOpenSidebar: () => void;
}) {
    const { auth, unreadNotifications } = usePage<PageProps>().props;
    const { state: syncState } = useSync();
    const badgeCount = (unreadNotifications ?? 0) + syncState.notificationsHint;
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
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            timeZone: CLOCK_TZ,
        });
        const timeFmt = new Intl.DateTimeFormat('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: CLOCK_TZ,
        });
        const tick = () => {
            const d = new Date();
            setNow({
                date: dateFmt.format(d),
                time: timeFmt.format(d).replace(/\./g, ':'),
            });
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
                                style={{ background: `linear-gradient(135deg, #780000, #D4A96A)` }}
                            >
                                {initials}
                            </Avatar>
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-[#1C1B1A]">
                                    {user?.name}
                                </p>
                                <p className="mt-0.5 truncate font-mono text-[11px] text-[#8A8580]">
                                    {user?.email}
                                </p>
                            </div>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                            {roles.map((role) => (
                                <span
                                    key={role}
                                    className="rounded-md border border-[#E7E1D9] bg-[#FAF7F2] px-1.5 py-0.5 font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-[#8A8580]"
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
                icon: <LogOut size={15} className="text-[#C94C4C]" />,
                label: (
                    <form onSubmit={logout} className="w-full">
                        <button type="submit" className="w-full text-start text-[#C94C4C]">
                            Keluar
                        </button>
                    </form>
                ),
                danger: true,
            },
        ],
        [user, photo, initials, roles],
    );

    return (
        <header className="relative sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-[#E7E1D9] bg-[#FAF7F2]/85 px-4 backdrop-blur-xl lg:px-6">
            <style>{`
                @keyframes bt-menu {
                    0% { opacity: 0; transform: translateY(-8px) scale(0.97); }
                    100% { opacity: 1; transform: translateY(0) scale(1); }
                }
                .bt-menu { animation: bt-menu 0.22s cubic-bezier(0.22,1,0.36,1) both; }
                @media (prefers-reduced-motion: reduce) {
                    .bt-menu { animation: none; }
                }
            `}</style>

            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#C1121F]/40 to-transparent"
            />

            <div className="flex min-w-0 items-center gap-2">
                <button
                    type="button"
                    onClick={onOpenSidebar}
                    aria-label="Buka menu"
                    className="rounded-xl p-2 text-[#8A8580] transition-all duration-200 hover:bg-[#1C1B1A]/[0.06] hover:text-[#1C1B1A] active:scale-95 lg:hidden"
                >
                    <Menu size={20} />
                </button>
                <div className="hidden items-center gap-3 rounded-full border border-[#E7E1D9] bg-white/75 py-1.5 ps-4 pe-4 shadow-[0_1px_2px_rgba(28,27,26,0.05)] lg:flex">
                    <span className="min-w-0 truncate text-[13px] font-medium text-[#1C1B1A]/80">
                        {now?.date ?? '\u00A0'}
                    </span>
                    <span
                        aria-hidden="true"
                        className="h-1 w-1 shrink-0 rounded-full bg-[#D4A96A]"
                    />
                    <span className="min-w-0 shrink-0 font-mono text-[12px] tabular-nums text-[#1C1B1A]/80">
                        {now?.time ?? '\u00A0'}
                        <span className="ms-1.5 hidden text-[10px] text-[#8A8580] xl:inline">
                            WITA
                        </span>
                    </span>
                </div>
            </div>

            <div className="hidden w-[30rem] max-w-full sm:block">
                <ConfigProvider
                    theme={{
                        components: {
                            Input: {
                                borderRadius: 9999,
                                controlHeight: 40,
                            },
                        },
                    }}
                >
                    <Input
                        prefix={<Search size={16} className="text-[#8A8580]" />}
                        placeholder="Cari kapal, dokumen, atau perjalanan…"
                        className="h-10 !bg-white !shadow-[inset_0_1px_2px_rgba(28,27,26,0.05)] hover:!border-[#1C1B1A]/40 focus:!shadow-[0_0_0_4px_rgba(193,18,31,0.1)]"
                        suffix={
                            <kbd className="pointer-events-none rounded-md border border-[#E7E1D9] bg-[#FAF7F2] px-1.5 py-0.5 font-mono text-[10px] font-medium text-[#8A8580]">
                                Ctrl K
                            </kbd>
                        }
                        onKeyDown={(e) => {
                            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                                e.preventDefault();
                            }
                        }}
                    />
                </ConfigProvider>
            </div>

            <div className="ms-auto flex min-w-0 items-center justify-end gap-1.5">
                <SyncStatusChip />
                <Link
                    href="/notifikasi"
                    title="Notifikasi"
                    className="relative rounded-xl p-2 text-[#8A8580] transition-all duration-200 hover:bg-[#1C1B1A]/[0.06] hover:text-[#1C1B1A] active:scale-95"
                >
                    <Badge count={badgeCount} size="small" offset={[-2, 2]}>
                        <Bell size={19} />
                    </Badge>
                </Link>

                <span
                    aria-hidden="true"
                    className="mx-1 hidden h-6 w-px bg-[#E7E1D9] lg:block"
                />

                <ConfigProvider
                    theme={{
                        components: {
                            Dropdown: {
                                controlItemBgActive: '#FAF7F2',
                            },
                        },
                    }}
                >
                    <Dropdown
                        menu={{ items: userMenuItems }}
                        trigger={['click']}
                        overlayClassName="bt-menu"
                    >
                        <button
                            type="button"
                            className="group flex items-center gap-2.5 rounded-full py-1 ps-1.5 pe-2.5 transition-colors duration-200 hover:bg-[#1C1B1A]/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C1121F]/40"
                        >
                            <Avatar
                                size={36}
                                src={photo}
                                style={{
                                    background: `linear-gradient(135deg, #780000, #D4A96A)`,
                                    flexShrink: 0,
                                }}
                            >
                                {initials}
                            </Avatar>
                            <span className="hidden min-w-0 text-left lg:block">
                                <span className="block max-w-[10rem] truncate text-sm font-medium leading-4 text-[#1C1B1A]">
                                    {user?.name}
                                </span>
                                <span className="block max-w-[10rem] truncate text-[11px] leading-4 text-[#8A8580]">
                                    {roles.join(' · ')}
                                </span>
                            </span>
                            <ChevronDown
                                size={14}
                                className="hidden text-[#8A8580] transition-transform duration-200 lg:block"
                            />
                        </button>
                    </Dropdown>
                </ConfigProvider>
            </div>
        </header>
    );
}
