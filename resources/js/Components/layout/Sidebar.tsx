import { NAV_ITEMS, visibleNavItems } from '@/Constants/navigation';
import { Link, usePage } from '@inertiajs/react';
import { ChevronLeft, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { type PageProps } from '@/types';

// Gabung class kondisional secara lokal agar file tidak bergantung
// pada helper bersama (tiap halaman memiliki kebutuhan berbeda).
const cx = (...classes: Array<string | false | undefined>) =>
    classes.filter(Boolean).join(' ');

// Tekstur grain halus untuk panel sidebar, senada dengan halaman login.
const GRAIN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E")`;

// Penanda "baru saja login": dipasang oleh halaman Login saat
// autentikasi berhasil, dibaca SEKALI oleh Sidebar lalu langsung
// dihapus saat mount pertama. Karena penandanya dimakan, muat ulang
// halaman maupun berpindah modul tidak akan mengulang animasi.
const POP_KEY = 'bt-sidebar-pop';

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

    // Efek sambutan bubble pop: aktif HANYA jika halaman Login barusan
    // menandai autentikasi berhasil. Keputusan diambil sebelum render
    // pertama lewat lazy initializer yang murni MEMBACA (tanpa menulis),
    // agar item tidak sempat tampil lalu menghilang, sekaligus aman
    // terhadap render ganda StrictMode.
    const [popIn] = useState<boolean>(() => {
        try {
            return window.sessionStorage.getItem(POP_KEY) === '1';
        } catch {
            /* sessionStorage tak tersedia: animasi dilewati. */
            return false;
        }
    });

    // Konsumsi penanda segera setelah mount pertama. Dengan begitu muat
    // ulang halaman (penanda sudah tidak ada di sessionStorage) maupun
    // berpindah modul (Sidebar terpasang ulang oleh layout halaman baru)
    // tidak mengulang animasi — hanya login berikutnya yang memasang
    // penanda baru lewat halaman Login.
    useEffect(() => {
        try {
            window.sessionStorage.removeItem(POP_KEY);
        } catch {
            /* abaikan */
        }
    }, []);

    return (
        <>
            {mobileOpen && (
                <div
                    className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm lg:hidden"
                    onClick={onClose}
                />
            )}
            <aside
                className={cx(
                    'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-gold/[0.14] bg-sidebar transition-[width,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] lg:translate-x-0',
                    collapsed ? 'lg:w-20' : 'lg:w-64',
                    mobileOpen ? 'translate-x-0' : '-translate-x-full',
                )}
            >
                <style>{`
                    @keyframes bt-sg-a {
                        0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
                        50% { transform: translate3d(5%, 4%) scale(1.08); }
                    }
                    @keyframes bt-sg-b {
                        0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
                        50% { transform: translate3d(-6%, -5%) scale(1.1); }
                    }
                    @keyframes bt-brand-halo {
                        0%, 100% { opacity: 0.35; transform: scale(1); }
                        50% { opacity: 0.8; transform: scale(1.18); }
                    }
                    @keyframes bt-pop {
                        0% { opacity: 0; transform: scale(0.4) translateY(10px); }
                        70% { opacity: 1; transform: scale(1.07) translateY(0); }
                        100% { opacity: 1; transform: scale(1) translateY(0); }
                    }
                    @keyframes bt-toggle-ping {
                        0% { box-shadow: 0 0 0 0 rgba(193,18,31,0.45); }
                        70%, 100% { box-shadow: 0 0 0 9px rgba(193,18,31,0); }
                    }
                    .bt-sg-a { animation: bt-sg-a 26s ease-in-out infinite; }
                    .bt-sg-b { animation: bt-sg-b 34s ease-in-out infinite; }
                    .bt-brand-halo { animation: bt-brand-halo 5s ease-in-out infinite; }
                    .bt-toggle-ping { animation: bt-toggle-ping 2.6s cubic-bezier(0.22,1,0.36,1) infinite; }
                    .bt-nav-scroll { scrollbar-width: thin; scrollbar-color: rgba(239,227,211,0.18) transparent; }
                    .bt-nav-scroll::-webkit-scrollbar { width: 4px; }
                    .bt-nav-scroll::-webkit-scrollbar-thumb { background: rgba(239,227,211,0.18); border-radius: 9999px; }
                    .bt-nav-scroll::-webkit-scrollbar-track { background: transparent; }
                    @media (prefers-reduced-motion: reduce) {
                        .bt-anim, .bt-anim * { animation: none !important; }
                    }
                `}</style>

                {/* Kedalaman panel maroon: cahaya merah di sekitar brand,
                    cahaya emas lembut di dasar, plus grain kertas. */}
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
                >
                    <div
                        className="bt-anim bt-sg-a absolute -left-20 -top-24 h-72 w-72 rounded-full blur-2xl"
                        style={{
                            background:
                                'radial-gradient(circle at center, rgba(193,18,31,0.22), transparent 65%)',
                        }}
                    />
                    <div
                        className="bt-anim bt-sg-b absolute -bottom-28 -right-24 h-96 w-96 rounded-full blur-2xl"
                        style={{
                            background:
                                'radial-gradient(circle at center, rgba(212,169,106,0.16), transparent 70%)',
                        }}
                    />
                    <div
                        className="absolute inset-0 opacity-[0.05] mix-blend-overlay"
                        style={{ backgroundImage: GRAIN }}
                    />
                </div>

                {/* Toggle lebar sidebar: beacon di tengah tepi kanan.
                    Ring merah berdenyut lembut menandakan tombol ini bisa
                    diklik; hover mengisi merah penuh. Chevron berputar
                    180 derajat, arah panah = arah aksi. */}
                <button
                    type="button"
                    onClick={onToggleCollapse}
                    aria-label={
                        collapsed ? 'Tampilkan sidebar' : 'Sembunyikan sidebar'
                    }
                    aria-expanded={!collapsed}
                    title={
                        collapsed ? 'Tampilkan sidebar' : 'Sembunyikan sidebar'
                    }
                    className="absolute -right-4 top-1/2 z-10 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-hairline bg-white text-muted shadow-[0_4px_14px_rgba(28,27,26,0.3)] transition-all duration-200 hover:border-primary hover:bg-primary hover:text-white hover:shadow-[0_6px_22px_rgba(193,18,31,0.4)] active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 lg:flex"
                >
                    <span
                        aria-hidden="true"
                        className="bt-anim bt-toggle-ping absolute inset-0 rounded-full"
                    />
                    <ChevronLeft
                        size={15}
                        className={cx(
                            'transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
                            collapsed && 'rotate-180',
                        )}
                    />
                </button>

                {/* Header brand: monogram BT dengan halo yang bernapas.
                    Nama brand memudar lewat transisi max-width + opacity
                    saat sidebar diringkas, bukan hilang mendadak. */}
                <div
                    className={cx(
                        'flex h-16 shrink-0 items-center border-b border-white/[0.06] px-4',
                        collapsed && 'lg:justify-center lg:px-2',
                    )}
                >
                    <Link
                        href="/dashboard"
                        className="flex min-w-0 items-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                    >
                        <span className="relative flex h-9 w-9 shrink-0 items-center justify-center">
                            <span
                                aria-hidden="true"
                                className="bt-anim bt-brand-halo absolute -inset-1.5 rounded-2xl bg-primary/45 blur-lg"
                            />
                            <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-hover font-mono text-[13px] font-semibold tracking-tight text-white shadow-[0_4px_16px_rgba(193,18,31,0.5)]">
                                BT
                                <span
                                    aria-hidden="true"
                                    className="absolute inset-0 rounded-xl border border-gold/40"
                                />
                            </span>
                        </span>
                        <span
                            className={cx(
                                'ml-3 min-w-0 overflow-hidden whitespace-nowrap transition-[max-width,opacity,margin] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
                                collapsed
                                    ? 'lg:ml-0 lg:max-w-0 lg:opacity-0'
                                    : 'lg:max-w-[12rem] lg:opacity-100',
                            )}
                        >
                            <span className="block text-xl font-bold text-cream">
                                Bunga Teratai
                            </span>
                        </span>
                    </Link>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Tutup menu"
                        className="ms-auto rounded-lg p-1.5 text-white/60 transition-colors duration-200 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 lg:hidden"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Navigasi. Label dan badge hidup dalam satu pembungkus
                    yang transisi max-width + opacity + margin-left, jadi
                    teks memudar mulus saat collapse, tanpa terpotong
                    mendadak dan tanpa lompatan ikon. */}
                <nav className="bt-nav-scroll flex-1 space-y-1 overflow-y-auto overflow-x-hidden overscroll-contain px-2.5 pb-6 pt-4">
                    {items.map((item, i) => {
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
                                title={collapsed ? item.label : undefined}
                                aria-current={active ? 'page' : undefined}
                                className={cx(
                                    'bt-anim group relative flex items-center justify-center rounded-xl px-2 py-2 text-sm transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40',
                                    active
                                        ? 'bg-gradient-to-r from-gold/[0.16] via-gold/[0.05] to-transparent text-cream'
                                        : 'text-cream/60 hover:bg-white/[0.05] hover:text-cream',
                                )}
                                style={
                                    popIn
                                        ? {
                                              animation:
                                                  'bt-pop 0.5s cubic-bezier(0.22,1,0.36,1) backwards',
                                              animationDelay: `${i * 50}ms`,
                                          }
                                        : undefined
                                }
                            >
                                {active && (
                                    <span
                                        aria-hidden="true"
                                        className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-gold shadow-[0_0_12px_rgba(212,169,106,0.55)]"
                                    />
                                )}
                                <span
                                    className={cx(
                                        'relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors duration-200',
                                        active
                                            ? 'bg-white/[0.09] text-cream'
                                            : 'text-cream/60 group-hover:bg-white/[0.07] group-hover:text-cream',
                                    )}
                                >
                                    <Icon size={17} />
                                    {badge > 0 && collapsed && (
                                        <span
                                            aria-hidden="true"
                                            className="absolute -right-1 -top-1 hidden h-2.5 w-2.5 rounded-full bg-gold shadow-[0_0_8px_rgba(212,169,106,0.7)] ring-2 ring-sidebar lg:block"
                                        />
                                    )}
                                </span>
                                <span
                                    className={cx(
                                        'ml-3 flex min-w-0 flex-1 items-center gap-2 overflow-hidden whitespace-nowrap transition-[max-width,opacity,margin] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
                                        collapsed
                                            ? 'lg:ml-0 lg:max-w-0 lg:opacity-0'
                                            : 'lg:max-w-[13rem] lg:opacity-100',
                                    )}
                                >
                                    <span
                                        className={cx(
                                            'flex-1 truncate',
                                            active
                                                ? 'font-semibold'
                                                : 'font-medium',
                                        )}
                                    >
                                        {item.label}
                                    </span>
                                    {badge > 0 && (
                                        <span className="inline-flex min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 font-mono text-[10px] font-semibold text-white shadow-[0_0_10px_rgba(193,18,31,0.4)]">
                                            {badge > 99 ? '99+' : badge}
                                        </span>
                                    )}
                                </span>
                            </Link>
                        );
                    })}
                </nav>
            </aside>
        </>
    );
}

export { NAV_ITEMS };