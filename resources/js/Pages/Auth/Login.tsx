import { DEMO_ACCOUNTS } from '@/Constants/navigation';
import { Head, Link, useForm } from '@inertiajs/react';
import {
    FormEventHandler,
    MouseEventHandler,
    useRef,
    useState,
} from 'react';

// Penanda "baru saja login" untuk animasi sambutan sidebar: dipasang
// saat autentikasi berhasil, dibaca sekali oleh Sidebar lalu langsung
// dihapus — muat ulang halaman atau berpindah modul tidak mengulang animasi.
const POP_KEY = 'bt-sidebar-pop';

export default function Login({
    status,
    canResetPassword,
}: {
    status?: string;
    canResetPassword: boolean;
}) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false as boolean,
    });

    const [demoOpen, setDemoOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('login'), {
            onSuccess: () => {
                // Autentikasi berhasil: pasang penanda SEBELUM Inertia
                // berpindah ke dasbor, sehingga Sidebar tahu bahwa ini
                // momen "setelah login" — bukan muat ulang halaman dan
                // bukan pindah modul. Sidebar memakannya sekali lalu
                // menghapusnya.
                try {
                    window.sessionStorage.setItem(POP_KEY, '1');
                } catch {
                    /* sessionStorage tak tersedia: animasi dilewati. */
                }
            },
            onFinish: () => reset('password'),
        });
    };

    const fillDemo = (email: string) => {
        setData('email', email);
        setData('password', 'password');
    };

    const handleMouseMove: MouseEventHandler<HTMLDivElement> = (e) => {
        const el = rootRef.current;
        if (!el) return;
        el.style.setProperty('--mx', `${e.clientX}px`);
        el.style.setProperty('--my', `${e.clientY}px`);
    };

    return (
        <div
            ref={rootRef}
            onMouseMove={handleMouseMove}
            className="relative min-h-screen overflow-hidden bg-appbg font-sans text-ink antialiased"
        >
            <Head title="Masuk" />

            <style>{`
                @keyframes bt-rise {
                    0% { opacity: 0; transform: translateY(26px) scale(0.985); }
                    100% { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes bt-pop {
                    0% { opacity: 0; transform: scale(0.4) translateY(10px); }
                    70% { opacity: 1; transform: scale(1.07) translateY(0); }
                    100% { opacity: 1; transform: scale(1) translateY(0); }
                }
                @keyframes bt-drift-a {
                    0% { transform: translate(0, 0) scale(1); }
                    50% { transform: translate(9vw, 7vh) scale(1.15); }
                    100% { transform: translate(0, 0) scale(1); }
                }
                @keyframes bt-drift-b {
                    0% { transform: translate(0, 0) scale(1.1); }
                    50% { transform: translate(-11vw, -6vh) scale(0.95); }
                    100% { transform: translate(0, 0) scale(1.1); }
                }
                @keyframes bt-drift-c {
                    0% { transform: translate(0, 0) scale(0.95); }
                    50% { transform: translate(-7vw, 9vh) scale(1.12); }
                    100% { transform: translate(0, 0) scale(0.95); }
                }
                @keyframes bt-glow {
                    0%, 100% { box-shadow: 0 10px 34px -10px rgba(193,18,31,0.45); }
                    50% { box-shadow: 0 10px 52px -8px rgba(193,18,31,0.7); }
                }
                @keyframes bt-sheen {
                    0%, 55% { transform: translateX(-160%) skewX(-18deg); }
                    100% { transform: translateX(420%) skewX(-18deg); }
                }
                @media (prefers-reduced-motion: reduce) {
                    .bt-anim, .bt-anim * { animation: none !important; }
                }
            `}</style>

            {/* ===== Aurora versi terang: tiga blush lembut di atas kertas ===== */}
            <div
                aria-hidden="true"
                className="bt-anim pointer-events-none absolute -left-[15%] -top-[20%] h-[70vmin] w-[70vmin] rounded-full blur-[110px]"
                style={{
                    background:
                        'radial-gradient(circle, rgba(193,18,31,0.20) 0%, rgba(193,18,31,0) 70%)',
                    animation: 'bt-drift-a 26s ease-in-out infinite',
                }}
            />
            <div
                aria-hidden="true"
                className="bt-anim pointer-events-none absolute -bottom-[25%] left-[25%] h-[80vmin] w-[80vmin] rounded-full blur-[130px]"
                style={{
                    background:
                        'radial-gradient(circle, rgba(120,0,0,0.13) 0%, rgba(120,0,0,0) 70%)',
                    animation: 'bt-drift-b 34s ease-in-out infinite',
                }}
            />
            <div
                aria-hidden="true"
                className="bt-anim pointer-events-none absolute -right-[18%] top-[8%] h-[65vmin] w-[65vmin] rounded-full blur-[120px]"
                style={{
                    background:
                        'radial-gradient(circle, rgba(30,70,104,0.16) 0%, rgba(30,70,104,0) 70%)',
                    animation: 'bt-drift-c 40s ease-in-out infinite',
                }}
            />

            {/* Spotlight hangat mengikuti kursor (via CSS var, tanpa re-render) */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0"
                style={{
                    background:
                        'radial-gradient(600px circle at var(--mx, 50%) var(--my, 25%), rgba(193,18,31,0.07), transparent 65%)',
                }}
            />

            {/* Tekstur grain kertas halus */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 opacity-[0.035]"
                style={{
                    backgroundImage:
                        "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
                }}
            />

            {/* Vignette sangat halus untuk memusatkan fokus */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0"
                style={{
                    background:
                        'radial-gradient(120% 120% at 50% 42%, transparent 55%, rgba(28,27,26,0.07) 100%)',
                }}
            />

            {/* ===== Konten: split di desktop, kartu tunggal di mobile ===== */}
            <div className="relative z-10 grid min-h-screen grid-cols-1 lg:grid-cols-12">
                {/* ===== Panel brand, hanya desktop ===== */}
                <section className="relative hidden flex-col px-16 py-12 lg:col-span-7 lg:flex xl:px-24 xl:py-16">
                    <header className="flex items-center gap-4">
                        <span
                            className="bt-anim flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary font-mono text-base font-semibold tracking-tight text-white"
                            style={{
                                animation:
                                    'bt-glow 4.5s ease-in-out infinite',
                            }}
                        >
                            BT
                        </span>
                        <span className="leading-tight">
                            <span className="block text-2xl font-bold tracking-tight text-ink">
                                Bunga Teratai
                            </span>
                        </span>
                    </header>

                    <div className="flex flex-1 flex-col justify-center py-16">
                        <p className="max-w-xl text-3xl font-semibold leading-[1.12] tracking-[-0.01em] text-ink xl:text-[42px]">
                            {/* Dokumen kapal tertib, armada{' '}
                            <span className="text-primary">terpantau</span>. */}
                            Operasi armada yang terdokumentasi{' '}
                            <span className="text-primary">presisi.</span>
                        </p>
                        <p className="mt-5 max-w-md text-[15px] leading-relaxed text-ink/70">
                            Kelola dokumen kapal dan dokumen bisnis, pantau
                            posisi armada lewat AIS.
                            Satu sistem, satu sumber kebenaran untuk tim
                            operasi dan administrasi.
                        </p>
                    </div>
                </section>

                {/* ===== Panel form ===== */}
                <section className="flex min-h-screen flex-col justify-center px-4 py-10 sm:px-6 lg:col-span-5 lg:border-l lg:border-hairline lg:px-14 xl:px-20">
                    <div
                        className="bt-anim relative mx-auto w-full max-w-md rounded-2xl border border-ink/[0.08] bg-white/70 p-8 shadow-[0_24px_70px_-30px_rgba(28,27,26,0.28),0_36px_110px_-46px_rgba(193,18,31,0.38)] backdrop-blur-xl sm:p-10"
                        style={{
                            animation:
                                'bt-rise 0.9s cubic-bezier(0.22,1,0.36,1) both',
                        }}
                    >
                        {/* Rim merah tipis di tepi atas kartu */}
                        <div
                            aria-hidden="true"
                            className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"
                        />

                        {/* Brand di dalam kartu, hanya mobile (desktop ada di panel kiri) */}
                        <div className="flex flex-col items-center text-center lg:hidden">
                            <span
                                className="bt-anim flex h-12 w-12 items-center justify-center rounded-xl bg-primary font-mono text-lg font-semibold tracking-tight text-white"
                                style={{
                                    animation:
                                        'bt-glow 4.5s ease-in-out infinite',
                                }}
                            >
                                BT
                            </span>
                            <span className="mt-4 text-base font-semibold tracking-tight text-ink">
                                Bunga Teratai
                            </span>
                        </div>

                        <div className="mt-8 mb-7 h-px bg-gradient-to-r from-transparent via-ink/15 to-transparent lg:hidden" />

                        <p className="flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-ink/70">
                            <span
                                aria-hidden="true"
                                className="h-2 w-2 rounded-full bg-primary shadow-[0_0_10px_rgba(193,18,31,0.6)]"
                            />
                            Akses Sistem
                        </p>
                        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink">
                            Masuk
                        </h1>
                        <p className="mt-2 text-sm leading-relaxed text-ink/70">
                            Masukkan email dan kata sandi untuk melanjutkan ke
                            dasbor operasi.
                        </p>

                        {status && (
                            <p
                                role="status"
                                className="mt-6 rounded-md border-l-2 border-ok bg-ok/10 px-3.5 py-2.5 text-sm font-medium text-ok"
                            >
                                {status}
                            </p>
                        )}

                        <form onSubmit={submit} className="mt-7">
                            <div>
                                <label
                                    htmlFor="email"
                                    className="block text-sm font-medium text-ink"
                                >
                                    Email
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    name="email"
                                    value={data.email}
                                    autoFocus
                                    autoComplete="username"
                                    onChange={(e) =>
                                        setData('email', e.target.value)
                                    }
                                    placeholder="nama@bungateratai.co.id"
                                    className="mt-1.5 block h-11 w-full rounded-lg border border-muted/60 bg-white px-3.5 text-sm text-ink placeholder:text-muted/80 transition hover:border-ink/50 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
                                />
                                {errors.email && (
                                    <p
                                        role="alert"
                                        className="mt-1.5 rounded-md border-l-2 border-danger bg-danger/10 px-3.5 py-2 text-sm font-medium text-danger"
                                    >
                                        {errors.email}
                                    </p>
                                )}
                            </div>

                            <div className="mt-5">
                                <label
                                    htmlFor="password"
                                    className="block text-sm font-medium text-ink"
                                >
                                    Kata Sandi
                                </label>
                                <input
                                    id="password"
                                    type="password"
                                    name="password"
                                    value={data.password}
                                    autoComplete="current-password"
                                    onChange={(e) =>
                                        setData('password', e.target.value)
                                    }
                                    placeholder="••••••••"
                                    className="mt-1.5 block h-11 w-full rounded-lg border border-muted/60 bg-white px-3.5 text-sm text-ink placeholder:text-muted/80 transition hover:border-ink/50 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
                                />
                                {errors.password && (
                                    <p
                                        role="alert"
                                        className="mt-1.5 rounded-md border-l-2 border-danger bg-danger/10 px-3.5 py-2 text-sm font-medium text-danger"
                                    >
                                        {errors.password}
                                    </p>
                                )}
                            </div>

                            <div className="mt-5 flex items-center justify-between gap-4">
                                <label className="flex select-none items-center">
                                    <input
                                        type="checkbox"
                                        id="remember"
                                        name="remember"
                                        checked={data.remember}
                                        onChange={(e) =>
                                            setData(
                                                'remember',
                                                e.target.checked,
                                            )
                                        }
                                        className="h-4 w-4 rounded-sm border-muted bg-white text-primary focus:ring-2 focus:ring-primary/25"
                                    />
                                    <span className="ms-2.5 text-sm text-ink/70">
                                        Ingat saya
                                    </span>
                                </label>

                                {canResetPassword && (
                                    <Link
                                        href={route('password.request')}
                                        className="rounded-sm text-sm text-ink/70 underline underline-offset-4 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                                    >
                                        Lupa kata sandi?
                                    </Link>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={processing}
                                className="bt-anim relative mt-7 inline-flex h-11 w-full items-center justify-center overflow-hidden rounded-lg bg-primary px-5 text-sm font-semibold tracking-wide text-white shadow-[0_14px_38px_-12px_rgba(193,18,31,0.55)] transition-[background-color,transform,box-shadow,opacity] duration-300 ease-out hover:-translate-y-0.5 hover:bg-primary-hover hover:shadow-[0_20px_54px_-12px_rgba(193,18,31,0.7)] active:translate-y-0 active:duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-appbg disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                            >
                                {!processing && (
                                    <span
                                        aria-hidden="true"
                                        className="pointer-events-none absolute inset-y-0 left-0 w-1/3 will-change-transform"
                                        style={{
                                            background:
                                                'linear-gradient(90deg, transparent, rgba(255,255,255,0.28), transparent)',
                                            animation:
                                                'bt-sheen 4.8s ease-in-out infinite',
                                            transform:
                                                'translateX(-160%) skewX(-18deg)',
                                        }}
                                    />
                                )}
                                {processing && (
                                    <span
                                        aria-hidden="true"
                                        className="me-2.5 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                                    />
                                )}
                                {processing ? 'Memproses...' : 'Masuk'}
                            </button>
                        </form>

                        {/* ===== Akun demo, bubble pop satu per satu ===== */}
                        <div className="mt-8 border-t border-ink/10 pt-5">
                            <button
                                type="button"
                                aria-expanded={demoOpen}
                                aria-controls="demo-accounts"
                                onClick={() => setDemoOpen((o) => !o)}
                                className="group flex w-full cursor-pointer items-center justify-between rounded-sm py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                            >
                                <span className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-ink/70 transition-colors duration-200 group-hover:text-ink">
                                    Akun demo
                                </span>
                                <span
                                    aria-hidden="true"
                                    className={`h-2 w-2 border-b-2 border-r-2 border-primary transition-transform duration-300 ease-out ${
                                        demoOpen
                                            ? 'rotate-[225deg]'
                                            : 'rotate-45'
                                    }`}
                                />
                            </button>

                            {demoOpen && (
                                <div
                                    id="demo-accounts"
                                    className="pb-1 pt-3"
                                >
                                    <p className="text-xs leading-relaxed text-ink/70">
                                        Klik salah satu akun untuk mengisi
                                        kolom.
                                    </p>

                                    <div className="mt-3 grid grid-cols-2 gap-2">
                                        {DEMO_ACCOUNTS.map((acc, i) => (
                                            <div
                                                key={acc.email}
                                                className="bt-anim"
                                                style={{
                                                    animation:
                                                        'bt-pop 0.5s cubic-bezier(0.22,1,0.36,1) backwards',
                                                    animationDelay: `${i * 70}ms`,
                                                }}
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        fillDemo(acc.email)
                                                    }
                                                    className={`flex w-full flex-col items-center rounded-full border px-3 py-2.5 text-center transition duration-200 ease-out hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                                                        data.email ===
                                                        acc.email
                                                            ? 'border-primary bg-primary-tint shadow-[0_10px_30px_-14px_rgba(193,18,31,0.5)]'
                                                            : 'border-hairline bg-white/80 hover:border-primary/50 hover:bg-white'
                                                    }`}
                                                >
                                                    <span className="block text-[13px] font-semibold text-ink">
                                                        {acc.role}
                                                    </span>
                                                    <span className="mt-0.5 block max-w-full truncate font-mono text-[10px] text-ink/60">
                                                        {acc.email}
                                                    </span>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}