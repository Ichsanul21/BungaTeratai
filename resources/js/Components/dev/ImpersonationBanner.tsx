import { type PageProps } from '@/types';
import { router, usePage } from '@inertiajs/react';
import { UserCog } from 'lucide-react';

/**
 * Penanda saat developer memakai "Masuk sebagai". Selalu terlihat supaya
 * tidak ada aksi yang dikira dilakukan oleh pengguna asli.
 */
export default function ImpersonationBanner() {
    const { impersonating } = usePage<PageProps>().props;

    if (!impersonating) {
        return null;
    }

    return (
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#8E0924] bg-[#BA0C2F] px-4 py-2 text-white">
            <div className="flex min-w-0 items-center gap-2 text-[12.5px]">
                <UserCog size={15} className="shrink-0" />
                <span className="truncate">
                    Mode developer: melihat sebagai{' '}
                    <strong className="font-semibold">{impersonating.current ?? 'pengguna'}</strong>
                    <span className="hidden text-white/70 sm:inline">
                        {' '}
                        — semua aksi tercatat atas nama {impersonating.name}
                    </span>
                </span>
            </div>

            <button
                type="button"
                onClick={() => router.post(route('dev.impersonate.stop'))}
                className="shrink-0 rounded-lg border border-white/40 bg-white/10 px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-white transition hover:bg-white hover:text-[#BA0C2F]"
            >
                Kembali
            </button>
        </div>
    );
}
