import { classNames } from '@/lib/format';
import { useSync } from '@/lib/sync/SyncProvider';
import { AlertTriangle, CheckCircle2, Gauge, RefreshCw, WifiOff } from 'lucide-react';

const WITA = 'Asia/Makassar';

function hhmm(iso: string | null): string | null {
    if (!iso) return null;
    try {
        return new Intl.DateTimeFormat('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: WITA,
        }).format(new Date(iso));
    } catch {
        return null;
    }
}

/**
 * Chip status sinkronisasi (ikon + teks + warna) — titik pemberitahuan
 * apakah perangkat ini online, offline, mode hemat kuota (VSAT), atau
 * sedang menyinkronkan. Klik = buka drawer antrean & konflik.
 */
export default function SyncStatusChip() {
    const { state, setDrawerOpen } = useSync();

    let tone = 'bg-ok/10 text-ok ring-ok/30';
    let label = state.lastSyncAt ? `Tersinkron ${hhmm(state.lastSyncAt)}` : 'Online';
    let Icon: typeof CheckCircle2 = CheckCircle2;

    if (state.mode === 'offline') {
        tone = 'bg-warn/15 text-warn ring-warn/40';
        label = state.pending > 0 ? `Offline · ${state.pending} antrean` : 'Offline';
        Icon = WifiOff;
    } else if (state.syncing) {
        tone = 'bg-primary/10 text-primary ring-primary/30';
        label = 'Menyinkron…';
        Icon = RefreshCw;
    } else if (state.mode === 'metered') {
        tone = 'bg-warn/15 text-warn ring-warn/40';
        label = 'Mode VSAT (hemat)';
        Icon = Gauge;
    } else if (state.errors > 0 || state.conflicts > 0) {
        tone = 'bg-primary/10 text-primary ring-primary/30';
        label =
            state.conflicts > 0
                ? `${state.conflicts} konflik`
                : `${state.errors} perlu perhatian`;
        Icon = AlertTriangle;
    } else if (state.pending > 0) {
        tone = 'bg-warn/15 text-warn ring-warn/40';
        label = `${state.pending} menunggu`;
        Icon = RefreshCw;
    }

    return (
        <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            title="Status sinkronisasi — klik untuk detail antrean & konflik"
            className={classNames(
                'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition-colors',
                tone,
            )}
        >
            <Icon size={12} className={state.syncing ? 'animate-spin' : undefined} />
            <span className="hidden sm:inline">{label}</span>
        </button>
    );
}
