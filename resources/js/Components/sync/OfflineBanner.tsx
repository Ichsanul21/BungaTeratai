import { useSync } from '@/lib/sync/SyncProvider';
import { WifiOff } from 'lucide-react';

/**
 * Banner global saat perangkat offline (warna waspada + ikon + teks —
 * sesuai spek UI). Menandai bahwa tampilan berasal dari data terakhir
 * tersimpan dan ada antrean yang menunggu sinkronisasi.
 */
export default function OfflineBanner() {
    const { state, setDrawerOpen } = useSync();

    if (state.online) return null;

    return (
        <div
            role="status"
            className="border-b border-warn/40 bg-warn/15 px-4 py-2 text-sm text-warn"
        >
            <div className="mx-auto flex max-w-screen-2xl flex-wrap items-center gap-x-3 gap-y-1">
                <WifiOff size={15} className="shrink-0" />
                <span>
                    <strong className="font-semibold">Mode offline</strong> — halaman yang pernah
                    dibuka masih bisa dilihat dari data tersimpan
                    {state.pending > 0 ? (
                        <>
                            . <strong>{state.pending} perubahan</strong> menunggu sinkronisasi.
                        </>
                    ) : (
                        '.'
                    )}
                </span>
                <button
                    type="button"
                    onClick={() => setDrawerOpen(true)}
                    className="ms-auto rounded-full bg-warn/20 px-3 py-1 text-xs font-semibold text-warn ring-1 ring-warn/40 hover:bg-warn/30"
                >
                    Lihat antrean
                </button>
            </div>
        </div>
    );
}
