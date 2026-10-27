import { ROLE_LABELS } from '@/Constants/navigation';
import SyncStatusChip from '@/Components/sync/SyncStatusChip';
import { type PageProps } from '@/types';
import { useSync } from '@/lib/sync/SyncProvider';
import { Link, useForm, usePage } from '@inertiajs/react';
import { Bell, ChevronDown, LogOut, Menu, Search, User } from 'lucide-react';
import { FormEventHandler, useEffect, useRef, useState } from 'react';

const CLOCK_TZ = 'Asia/Makassar';

// Penanda sesi yang sama dengan Sidebar: animasi sambutan sidebar
// hanya sekali per sesi login, dibersihkan saat keluar.
const POP_KEY = 'bt-sidebar-pop';

// Gabung class kondisional secara lokal, tanpa helper bersama.
const cx = (...classes: Array<string | false | undefined>) =>
    classes.filter(Boolean).join(' ');

export default function Topbar({
    onOpenSidebar,
}: {
    onOpenSidebar: () => void;
}) {
    const { auth, unreadNotifications } = usePage<PageProps>().props;
    const { state: syncState } = useSync();
    // Badge = unread dari halaman terakhir + notifikasi baru dari pull terakhir
    // (hint direset saat navigasi sukses, saat shared props sudah di-refresh).
    const badgeCount = (unreadNotifications ?? 0) + syncState.notificationsHint;
    const user = auth.user;
    const initials = (user?.name ?? '?')
        .split(' ')
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase();
    const roles = (user?.roles ?? []).map((r) => ROLE_LABELS[r] ?? r);

    // Foto profil opsional: coba penamaan yang lazim dipakai skema Laravel.
    // Sesuaikan nama properti bila model User di project berbeda.
    const photo =
        (user as { profile_photo_url?: string } | undefined)
            ?.profile_photo_url ??
        (user as { avatar?: string } | undefined)?.avatar;

    const { post: postLogout } = useForm({});
    const [menuOpen, setMenuOpen] = useState(false);
    const [now, setNow] = useState<{ date: string; time: string } | null>(
        null,
    );
    const menuRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);

    // Tanggal lengkap bahasa Indonesia (hari dan bulan tanpa singkatan)
    // dan jam 24 jam HH:mm, hidup per detik agar pergantian menit tepat.
    // Dirender kosong sampai mounted agar aman dari perbedaan SSR.
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

    // Pencarian cepat: Ctrl atau Cmd + K
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                searchRef.current?.focus();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    // Tutup menu pengguna saat klik di luar atau tekan Escape
    useEffect(() => {
        if (!menuOpen) return;
        const onDocMouseDown = (e: MouseEvent) => {
            if (
                menuRef.current &&
                !menuRef.current.contains(e.target as Node)
            ) {
                setMenuOpen(false);
            }
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setMenuOpen(false);
        };
        document.addEventListener('mousedown', onDocMouseDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDocMouseDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [menuOpen]);

    const logout: FormEventHandler = (e) => {
        e.preventDefault();
        // Bersihkan penanda sesi agar sesi login berikutnya mendapat
        // animasi sambutan bubble pop lagi.
        try {
            window.sessionStorage.removeItem(POP_KEY);
        } catch {
            /* abaikan */
        }
        postLogout(route('logout'));
    };

    return (
        <header className="relative sticky top-0 z-30 grid h-16 grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-hairline bg-appbg/85 px-4 backdrop-blur-xl lg:px-6">
            <style>{`
                @keyframes bt-menu {
                    0% { opacity: 0; transform: translateY(-8px) scale(0.97); }
                    100% { opacity: 1; transform: translateY(0) scale(1); }
                }
                .bt-menu {
                    animation: bt-menu 0.22s cubic-bezier(0.22,1,0.36,1) both;
                }
                @media (prefers-reduced-motion: reduce) {
                    .bt-menu { animation: none; }
                }
            `}</style>

            {/* Garis air merah tipis di tepi atas, tanda tangan halaman login */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary/40 to-transparent"
            />

            {/* Kiri: tombol sidebar (mobile) + tanggal & jam operasional (desktop) */}
            <div className="flex min-w-0 items-center gap-2">
                <button
                    type="button"
                    onClick={onOpenSidebar}
                    aria-label="Buka menu"
                    className="rounded-xl p-2 text-muted transition-all duration-200 hover:bg-ink/[0.06] hover:text-ink active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 lg:hidden"
                >
                    <Menu size={20} />
                </button>
                <div className="hidden items-center gap-3 rounded-full border border-hairline bg-white/75 py-1.5 ps-4 pe-4 shadow-[0_1px_2px_rgba(28,27,26,0.05)] lg:flex">
                    <span className="min-w-0 truncate text-[13px] font-medium text-ink/80">
                        {now?.date ?? '\u00A0'}
                    </span>
                    <span
                        aria-hidden="true"
                        className="h-1 w-1 shrink-0 rounded-full bg-gold"
                    />
                    <span className="min-w-0 shrink-0 font-mono text-[12px] tabular-nums text-ink/80">
                        {now?.time ?? '\u00A0'}
                        <span className="ms-1.5 hidden text-[10px] text-muted xl:inline">
                            WITA
                        </span>
                    </span>
                </div>
            </div>

            {/* Tengah: pencarian bergaya command bar */}
            <div className="hidden w-[30rem] max-w-full sm:block">
                <div className="group relative">
                    <Search
                        size={16}
                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted transition-colors duration-200 group-focus-within:text-primary"
                    />
                    <input
                        ref={searchRef}
                        type="search"
                        placeholder="Cari kapal, dokumen, atau perjalanan…"
                        className="h-10 w-full rounded-full border border-muted/50 bg-white ps-10 pe-4 text-sm text-ink shadow-[inset_0_1px_2px_rgba(28,27,26,0.05)] transition-[border-color,box-shadow] duration-200 placeholder:text-muted/70 hover:border-ink/40 focus:border-primary focus:shadow-[0_0_0_4px_rgba(193,18,31,0.1),0_10px_28px_-14px_rgba(193,18,31,0.35)] focus:outline-none lg:pe-16"
                    />
                    <kbd className="pointer-events-none absolute right-3.5 top-1/2 hidden -translate-y-1/2 rounded-md border border-hairline bg-appbg px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted transition-opacity duration-200 group-focus-within:opacity-0 lg:block">
                        Ctrl K
                    </kbd>
                </div>
            </div>

            {/* Kanan: status sinkronisasi + notifikasi + menu pengguna */}
            <div className="flex min-w-0 items-center justify-end gap-1.5">
                <SyncStatusChip />
                <Link
                    href="/notifikasi"
                    title="Notifikasi"
                    className="relative rounded-xl p-2 text-muted transition-all duration-200 hover:bg-ink/[0.06] hover:text-ink active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                    <Bell size={19} />
                    {badgeCount > 0 && (
                        <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-[1rem] items-center justify-center rounded-full bg-primary px-1 font-mono text-[9px] font-semibold leading-4 text-white shadow-[0_0_10px_rgba(193,18,31,0.5)]">
                            {badgeCount > 99 ? '99+' : badgeCount}
                        </span>
                    )}
                </Link>

                <span
                    aria-hidden="true"
                    className="mx-1 hidden h-6 w-px bg-hairline lg:block"
                />

                <div className="relative" ref={menuRef}>
                    <button
                        type="button"
                        onClick={() => setMenuOpen((o) => !o)}
                        aria-expanded={menuOpen}
                        aria-haspopup="menu"
                        className={cx(
                            'group flex items-center gap-2.5 rounded-full py-1 ps-1.5 pe-2.5 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                            menuOpen
                                ? 'bg-ink/[0.06]'
                                : 'hover:bg-ink/[0.05]',
                        )}
                    >
                        <span className="relative flex h-9 w-9 shrink-0 transition-shadow duration-200 group-hover:shadow-[0_6px_18px_-6px_rgba(120,0,0,0.45)]">
                            <span
                                aria-hidden="true"
                                className="absolute inset-0 rounded-full bg-gradient-to-br from-primary-hover to-gold"
                            />
                            {photo ? (
                                <img
                                    src={photo}
                                    alt=""
                                    className="relative m-[2px] h-8 w-8 rounded-full object-cover"
                                />
                            ) : (
                                <span className="relative m-[2px] flex h-8 w-8 items-center justify-center rounded-full bg-white font-mono text-[11px] font-semibold text-primary-hover">
                                    {initials}
                                </span>
                            )}
                        </span>
                        <span className="hidden min-w-0 text-left lg:block">
                            <span className="block max-w-[10rem] truncate text-sm font-medium leading-4 text-ink">
                                {user?.name}
                            </span>
                            <span className="block max-w-[10rem] truncate text-[11px] leading-4 text-muted">
                                {roles.join(' · ')}
                            </span>
                        </span>
                        <ChevronDown
                            size={14}
                            className={`hidden text-muted transition-transform duration-200 lg:block ${
                                menuOpen ? 'rotate-180' : ''
                            }`}
                        />
                    </button>

                    {menuOpen && (
                        <div
                            role="menu"
                            className="bt-menu absolute end-0 mt-2.5 w-72 origin-top-right rounded-2xl border border-hairline bg-white/95 p-2 shadow-[0_24px_60px_-20px_rgba(28,27,26,0.35)] backdrop-blur-xl"
                        >
                            <div className="px-3 pb-3 pt-2.5">
                                <div className="flex items-center gap-3">
                                    <span className="relative flex h-11 w-11 shrink-0">
                                        <span
                                            aria-hidden="true"
                                            className="absolute inset-0 rounded-full bg-gradient-to-br from-primary-hover to-gold"
                                        />
                                        {photo ? (
                                            <img
                                                src={photo}
                                                alt=""
                                                className="relative m-[2px] h-10 w-10 rounded-full object-cover"
                                            />
                                        ) : (
                                            <span className="relative m-[2px] flex h-10 w-10 items-center justify-center rounded-full bg-white font-mono text-[13px] font-semibold text-primary-hover">
                                                {initials}
                                            </span>
                                        )}
                                    </span>
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-ink">
                                            {user?.name}
                                        </p>
                                        <p className="mt-0.5 truncate font-mono text-[11px] text-muted">
                                            {user?.email}
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-3 flex flex-wrap gap-1">
                                    {roles.map((role) => (
                                        <span
                                            key={role}
                                            className="rounded-md border border-hairline bg-appbg px-1.5 py-0.5 font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-muted"
                                        >
                                            {role}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div
                                aria-hidden="true"
                                className="mx-1 mb-1.5 h-px bg-gradient-to-r from-transparent via-hairline to-transparent"
                            />
                            <Link
                                href={route('profile.edit')}
                                role="menuitem"
                                className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-ink transition-colors duration-150 hover:bg-appbg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                            >
                                <User size={15} className="text-muted" />
                                Profil Saya
                            </Link>
                            <form onSubmit={logout}>
                                <button
                                    type="submit"
                                    role="menuitem"
                                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-danger transition-colors duration-150 hover:bg-danger/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/40"
                                >
                                    <LogOut size={15} />
                                    Keluar
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}