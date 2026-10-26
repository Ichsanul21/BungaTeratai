import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import VesselForm from '@/Pages/Fleet/VesselForm';
import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, ClipboardCheck, FileStack, Pencil, Ship } from 'lucide-react';

// Tekstur grain halus untuk panel hero, senada dengan login, sidebar,
// halaman detail kapal, dan halaman unggah dokumen.
const GRAIN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E")`;

const EASE = 'cubic-bezier(0.22,1,0.36,1)';

// Keping kaca kecil di hero: pil informasi singkat soal formulir.
const CHIP_KACA =
    'inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.07] px-3 py-1 text-[11px] font-medium text-cream/80';

// Struktur sama dengan create.tsx: hero statis di sini, formulir penuh
// di VesselForm. Satu-satunya perbedaan adalah jalan pulangnya mengarah
// ke detail kapal, karena halaman edit biasanya dibuka dari sana.
export default function FleetEdit({ vessel }: { vessel: Record<string, any> }) {
    const nama = vessel?.vessel_name ?? 'Kapal';

    return (
        <AuthenticatedLayout>
            <Head title={`Fleet Management / Edit ${nama}`} />

            <style>{`
                @keyframes bt-rise {
                    0% { opacity: 0; transform: translateY(16px) scale(0.995); }
                    100% { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes bt-drift-a {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    50% { transform: translate(5%, 6%) scale(1.1); }
                }
                @keyframes bt-drift-b {
                    0%, 100% { transform: translate(0, 0) scale(1.06); }
                    50% { transform: translate(-6%, -5%) scale(0.96); }
                }
                @media (prefers-reduced-motion: reduce) {
                    .bt-anim, .bt-anim * { animation: none !important; }
                }
            `}</style>

            {/* ===== Panel pembuka =====
                Pita burgundy yang sama dengan halaman tambah kapal; tanpa
                kartu analitik, hanya arah pulang, judul, dan janji singkat. */}
            <section
                className="bt-anim relative mb-6 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-sidebar via-primary-hover to-primary shadow-[0_24px_60px_-24px_rgba(69,16,22,0.55)]"
                style={{ animation: `bt-rise 0.55s ${EASE} both` }}
            >
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 overflow-hidden"
                >
                    <div
                        className="bt-anim absolute -left-24 -top-32 h-80 w-80 rounded-full blur-3xl"
                        style={{
                            background:
                                'radial-gradient(circle at center, rgba(193,18,31,0.4), transparent 65%)',
                            animation: 'bt-drift-a 26s ease-in-out infinite',
                        }}
                    />
                    <div
                        className="bt-anim absolute -bottom-36 -right-28 h-96 w-96 rounded-full blur-3xl"
                        style={{
                            background:
                                'radial-gradient(circle at center, rgba(212,169,106,0.22), transparent 70%)',
                            animation: 'bt-drift-b 34s ease-in-out infinite',
                        }}
                    />
                    <div
                        className="absolute inset-0 opacity-[0.06] mix-blend-overlay"
                        style={{ backgroundImage: GRAIN }}
                    />
                    <Ship
                        size={220}
                        strokeWidth={0.7}
                        className="absolute -right-10 -top-12 hidden select-none text-white/[0.05] xl:block"
                    />
                </div>
                {/* Rim emas tipis di tepi atas, tanda tangan antar halaman. */}
                <div
                    aria-hidden="true"
                    className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent"
                />

                <div className="relative p-6 lg:p-7">
                    <div className="max-w-2xl">
                        <Link
                            href={vessel ? `/armada/${vessel.id}` : '/armada'}
                            className="inline-flex items-center gap-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-cream/60 transition-colors hover:text-cream"
                        >
                            <ArrowLeft size={13} aria-hidden="true" />
                            Detail Kapal
                        </Link>
                        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-cream sm:text-3xl">
                            Ubah Data Kapal.
                        </h1>
                        <p className="mt-2 text-sm leading-relaxed text-cream/70">
                            Perbarui data {nama}. Perubahan langsung tampil di registry
                            armada dan detail kapal setelah disimpan.
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                            <span className={CHIP_KACA}>
                                <ClipboardCheck
                                    size={12}
                                    aria-hidden="true"
                                    className="text-gold"
                                />
                                Navigasi kelengkapan data
                            </span>
                            <span className={CHIP_KACA}>
                                <Pencil size={12} aria-hidden="true" className="text-gold" />
                                Tampil di registry dan detail kapal
                            </span>
                            <span className={CHIP_KACA}>
                                <FileStack
                                    size={12}
                                    aria-hidden="true"
                                    className="text-gold"
                                />
                                Navigasi menentukan template dokumen
                            </span>
                        </div>
                    </div>
                </div>
            </section>

            <VesselForm vessel={vessel} isEdit />
        </AuthenticatedLayout>
    );
}
