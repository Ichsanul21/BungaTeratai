import { classNames } from '@/lib/format';
import type { OutboxItem } from '@/lib/sync/db';
import { useSync } from '@/lib/sync/SyncProvider';
import {
    AlertTriangle,
    CheckCircle2,
    CloudUpload,
    Inbox,
    RefreshCw,
    Trash2,
    X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

const ENTITY_LABELS: Record<string, string> = {
    voyage_progress: 'Progres perjalanan (DSR/ETA)',
    vessel_position: 'Posisi kapal',
    fuel_log: 'Catatan bahan bakar',
    voyage_safety_check: 'Pemeriksaan keselamatan',
    hours_of_rest: 'Jam istirahat awak (HoR)',
    crew_movement: 'Gerbak awak (ON/OFF/Mutasi)',
};

const STATUS_UI: Record<string, { label: string; className: string }> = {
    pending: { label: 'Menunggu', className: 'bg-warn/15 text-warn ring-warn/40' },
    sending: { label: 'Mengirim…', className: 'bg-primary/10 text-primary ring-primary/30' },
    error: { label: 'Gagal', className: 'bg-primary/10 text-primary ring-primary/30' },
    conflict: { label: 'Konflik', className: 'bg-primary/10 text-primary ring-primary/30' },
};

function previewJson(raw?: string | null, max = 160): string {
    if (!raw) return '—';
    try {
        const parsed = JSON.parse(raw);
        const text = typeof parsed === 'object' ? JSON.stringify(parsed) : String(parsed);
        return text.length > max ? `${text.slice(0, max)}…` : text;
    } catch {
        return raw.length > max ? `${raw.slice(0, max)}…` : raw;
    }
}

/**
 * Drawer antrean sinkronisasi: status, daftar mutasi offline (outbox),
 * dan review konflik kapal vs kantor (keputusan eksplisit, tidak diam-diam).
 */
export default function SyncDrawer() {
    const { state, engine, drawerOpen, setDrawerOpen } = useSync();
    const [items, setItems] = useState<OutboxItem[]>([]);
    const [conflicts, setConflicts] = useState<Array<Record<string, unknown>>>([]);
    const [busy, setBusy] = useState(false);

    const reload = useCallback(async () => {
        setItems(await engine.listOutbox());
        setConflicts(await engine.listConflicts());
    }, [engine]);

    useEffect(() => {
        if (drawerOpen) {
            void reload();
            void engine.refreshConflicts().then(() => reload());
        }
    }, [drawerOpen, reload, engine, state.pending, state.conflicts]);

    if (!drawerOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div
                className="absolute inset-0 bg-ink/40"
                onClick={() => setDrawerOpen(false)}
                aria-hidden="true"
            />
            <aside className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
                <header className="flex items-center justify-between border-b border-hairline px-4 py-3">
                    <div>
                        <h2 className="text-base font-semibold text-ink">Sinkronisasi</h2>
                        <p className="text-xs text-muted">
                            {state.mode === 'offline'
                                ? 'Offline — perubahan disimpan lokal, dikirim saat kembali online.'
                                : state.mode === 'metered'
                                    ? 'Mode VSAT — sinkronisasi dijaga hemat kuota.'
                                    : 'Terhubung ke kantor.'}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setDrawerOpen(false)}
                        className="rounded-lg p-2 text-muted hover:bg-appbg hover:text-ink"
                        aria-label="Tutup"
                    >
                        <X size={18} />
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto px-4 py-4">
                    <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-lg bg-appbg px-2 py-2">
                            <div className="text-lg font-semibold text-ink">{state.pending}</div>
                            <div className="text-[11px] text-muted">Antrean</div>
                        </div>
                        <div className="rounded-lg bg-appbg px-2 py-2">
                            <div
                                className={classNames(
                                    'text-lg font-semibold',
                                    state.conflicts > 0 ? 'text-primary' : 'text-ink',
                                )}
                            >
                                {state.conflicts}
                            </div>
                            <div className="text-[11px] text-muted">Konflik</div>
                        </div>
                        <div className="rounded-lg bg-appbg px-2 py-2">
                            <div
                                className={classNames(
                                    'text-lg font-semibold',
                                    state.errors > 0 ? 'text-primary' : 'text-ink',
                                )}
                            >
                                {state.errors}
                            </div>
                            <div className="text-[11px] text-muted">Gagal</div>
                        </div>
                    </div>

                    {state.lastMessage && (
                        <p className="mt-3 rounded-lg bg-appbg px-3 py-2 text-xs text-muted">
                            {state.lastMessage}
                        </p>
                    )}

                    {/* Konflik kapal vs kantor */}
                    <section className="mt-5">
                        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                            <AlertTriangle size={14} className="text-primary" />
                            Konflik Sinkronisasi ({conflicts.length})
                        </h3>
                        {conflicts.length === 0 ? (
                            <p className="mt-1 text-xs text-muted">
                                Tidak ada konflik — kapal dan kantor sepakat.
                            </p>
                        ) : (
                            <ul className="mt-2 space-y-3">
                                {conflicts.map((conflict) => (
                                    <li
                                        key={String(conflict.id)}
                                        className="rounded-lg border border-hairline p-3"
                                    >
                                        <div className="text-xs font-medium text-ink">
                                            {ENTITY_LABELS[String(conflict.entity_type)] ??
                                                String(conflict.entity_type)}{' '}
                                            #{String(conflict.entity_id)}
                                            {conflict.device_name ? (
                                                <span className="text-muted"> · dari {String(conflict.device_name)}</span>
                                            ) : null}
                                        </div>
                                        <div className="mt-1 grid grid-cols-1 gap-1 text-[11px]">
                                            <div className="rounded bg-warn/10 px-2 py-1 text-warn">
                                                <span className="font-semibold">Laporan kapal:</span>{' '}
                                                {previewJson(conflict.ship_value as string)}
                                            </div>
                                            <div className="rounded bg-appbg px-2 py-1 text-muted">
                                                <span className="font-semibold">Data kantor:</span>{' '}
                                                {previewJson(conflict.shore_value as string)}
                                            </div>
                                        </div>
                                        <div className="mt-2 flex gap-2">
                                            <button
                                                type="button"
                                                disabled={busy}
                                                onClick={() => {
                                                    setBusy(true);
                                                    void engine
                                                        .resolveConflict(Number(conflict.id), 'ship')
                                                        .then(() => reload())
                                                        .finally(() => setBusy(false));
                                                }}
                                                className="rounded-md bg-primary px-2.5 py-1 text-[11px] font-semibold text-white hover:opacity-90 disabled:opacity-50"
                                            >
                                                Pakai laporan kapal
                                            </button>
                                            <button
                                                type="button"
                                                disabled={busy}
                                                onClick={() => {
                                                    setBusy(true);
                                                    void engine
                                                        .resolveConflict(Number(conflict.id), 'shore')
                                                        .then(() => reload())
                                                        .finally(() => setBusy(false));
                                                }}
                                                className="rounded-md border border-hairline px-2.5 py-1 text-[11px] font-medium text-ink hover:bg-appbg disabled:opacity-50"
                                            >
                                                Pertahankan kantor
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>

                    {/* Antrean outbox */}
                    <section className="mt-5">
                        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                            <Inbox size={14} className="text-muted" />
                            Antrean Perubahan ({items.length})
                        </h3>
                        {items.length === 0 ? (
                            <p className="mt-1 text-xs text-muted">
                                Tidak ada perubahan tertunda. Laporan dari kapal akan muncul di sini
                                sebelum dikirim ke kantor.
                            </p>
                        ) : (
                            <ul className="mt-2 space-y-2">
                                {items.map((item) => (
                                    <li
                                        key={item.key}
                                        className="flex items-start justify-between gap-2 rounded-lg border border-hairline px-3 py-2"
                                    >
                                        <div className="min-w-0">
                                            <div className="truncate text-xs font-medium text-ink">
                                                {item.label}
                                            </div>
                                            <div className="mt-0.5 text-[11px] text-muted">
                                                {ENTITY_LABELS[item.entity_type] ?? item.entity_type} ·{' '}
                                                {new Date(item.created_at).toLocaleString('id-ID')}
                                            </div>
                                            {item.last_error && (
                                                <div className="mt-0.5 text-[11px] text-primary">
                                                    {item.last_error}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex shrink-0 items-center gap-1.5">
                                            <span
                                                className={classNames(
                                                    'rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset',
                                                    STATUS_UI[item.status]?.className ??
                                                        'bg-appbg text-muted ring-hairline',
                                                )}
                                            >
                                                {STATUS_UI[item.status]?.label ?? item.status}
                                            </span>
                                            {item.status === 'error' && (
                                                <>
                                                    <button
                                                        type="button"
                                                        title="Coba lagi"
                                                        onClick={() => void engine.retryItem(item.key).then(reload)}
                                                        className="text-primary hover:opacity-70"
                                                    >
                                                        <RefreshCw size={13} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        title="Buang"
                                                        onClick={() => void engine.removeItem(item.key).then(reload)}
                                                        className="text-muted hover:text-primary"
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                </div>

                <footer className="border-t border-hairline px-4 py-3">
                    <button
                        type="button"
                        disabled={state.syncing || !state.online}
                        onClick={() => void engine.flush().then(reload)}
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                    >
                        <CloudUpload size={15} />
                        {state.syncing ? 'Menyinkronkan…' : 'Sinkron sekarang'}
                    </button>
                    <p className="mt-2 flex items-center justify-center gap-1 text-[11px] text-muted">
                        {state.mode === 'online' && (
                            <>
                                <CheckCircle2 size={11} className="text-ok" /> Prioritas kirim:
                                keselamatan → operasional → keuangan → file.
                            </>
                        )}
                    </p>
                </footer>
            </aside>
        </div>
    );
}
