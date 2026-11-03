import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import VesselForm from '@/Pages/Fleet/VesselForm';
import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, ClipboardCheck, FileStack, Pencil, Ship } from 'lucide-react';
import { Tag } from 'antd';

const GRAIN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E")`;

const EASE = 'cubic-bezier(0.22,1,0.36,1)';

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

            <section
                className="bt-anim relative mb-6 overflow-hidden rounded-2xl border border-[#E3E8F0] bg-white shadow-[0_1px_3px_rgba(17,24,39,0.04),0_8px_24px_-8px_rgba(17,24,39,0.06)]"
                style={{
                    animation: `bt-rise 0.55s ${EASE} both`,
                }}
            >
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: GRAIN }} />
                </div>

                <div className="relative p-6 lg:p-7">
                    <div className="max-w-2xl">
                        <Link
                            href={vessel ? `/armada/${vessel.id}` : '/armada'}
                            className="inline-flex items-center gap-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-[#5B6474] transition-colors hover:text-[#BA0C2F]"
                        >
                            <ArrowLeft size={13} aria-hidden="true" />
                            Detail Kapal
                        </Link>
                        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-[#111827] sm:text-3xl">
                            Ubah Data Kapal.
                        </h1>
                        <p className="mt-2 text-sm leading-relaxed text-[#5B6474]">
                            Perbarui data {nama}. Perubahan langsung tampil di registry
                            armada dan detail kapal setelah disimpan.
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                            <Tag className="inline-flex items-center gap-1.5 rounded-full border border-[#E3E8F0] bg-[#F5F7FA] px-3 py-1 text-[11px] font-medium text-[#5B6474]">
                                <ClipboardCheck size={12} aria-hidden="true" style={{ color: '#00205B' }} />
                                Navigasi kelengkapan data
                            </Tag>
                            <Tag className="inline-flex items-center gap-1.5 rounded-full border border-[#E3E8F0] bg-[#F5F7FA] px-3 py-1 text-[11px] font-medium text-[#5B6474]">
                                <Pencil size={12} aria-hidden="true" style={{ color: '#00205B' }} />
                                Tampil di registry dan detail kapal
                            </Tag>
                            <Tag className="inline-flex items-center gap-1.5 rounded-full border border-[#E3E8F0] bg-[#F5F7FA] px-3 py-1 text-[11px] font-medium text-[#5B6474]">
                                <FileStack size={12} aria-hidden="true" style={{ color: '#00205B' }} />
                                Navigasi menentukan template dokumen
                            </Tag>
                        </div>
                    </div>
                </div>
            </section>

            <VesselForm vessel={vessel} isEdit />
        </AuthenticatedLayout>
    );
}
