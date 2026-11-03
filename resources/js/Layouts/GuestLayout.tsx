import { Head, Link } from '@inertiajs/react';
import { PropsWithChildren } from 'react';

const GRAIN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E")`;

export default function Guest({ children }: PropsWithChildren) {
    return (
        <div className="relative flex min-h-screen flex-col items-center overflow-hidden bg-[#F5F7FA] pt-6 sm:justify-center sm:pt-0">
            <Head title="Bunga Teratai" />

            <div
                aria-hidden="true"
                className="pointer-events-none absolute -left-[15%] -top-[20%] h-[70vmin] w-[70vmin] rounded-full blur-[110px]"
                style={{
                    background: 'radial-gradient(circle, rgba(186,12,47,0.12) 0%, transparent 70%)',
                }}
            />
            <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-[25%] right-0 h-[80vmin] w-[80vmin] rounded-full blur-[130px]"
                style={{
                    background: 'radial-gradient(circle, rgba(0,32,91,0.10) 0%, transparent 70%)',
                }}
            />
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 opacity-[0.03]"
                style={{ backgroundImage: GRAIN }}
            />

            <div className="relative z-10">
                <Link href="/" className="flex items-center gap-3">
                    <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-[#BA0C2F] font-mono text-sm font-semibold tracking-tight text-white shadow-[0_4px_16px_rgba(186,12,47,0.5)]">
                        BT
                    </span>
                    <span className="text-lg font-bold tracking-tight text-[#111827]">
                        Bunga Teratai
                    </span>
                </Link>
            </div>

            <div className="relative z-10 mt-8 w-full overflow-hidden rounded-2xl border border-[#111827]/[0.08] bg-white/80 px-8 py-8 shadow-[0_24px_70px_-30px_rgba(17,24,39,0.28)] backdrop-blur-xl sm:max-w-md">
                <div
                    aria-hidden="true"
                    className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-[#BA0C2F]/50 to-transparent"
                />
                {children}
            </div>
        </div>
    );
}
