import {
    pullDelta,
    pushMutations,
    fetchConflicts,
    resolveConflictRemote,
    type PushMutation,
} from './api';
import { syncDb, uuid, type OutboxItem, type SyncPriority } from './db';
import { ensureDeviceRegistered, getDeviceId } from './device';

/**
 * Mesin sinkronisasi (store-and-forward) di sisi klien.
 *
 * - enqueue(): mutasi masuk outbox IndexedDB (prioritas: safety > operational
 *   > financial > bulk) -> auto-flush bila online; bertahan reload/crash.
 * - flush(): kirim batch (maks 50) ke POST /api/sync/push (idempoten);
 *   accepted -> hapus dari outbox; conflict -> ditandai; rejected -> retry
 *   dengan backoff, setelah MAX_RETRIES -> error utk review manual.
 * - pull(): delta server sejak cursor + daftar konflik -> badge & drawer.
 */

export type SyncMode = 'online' | 'offline' | 'metered';

export interface SyncState {
    online: boolean;
    syncing: boolean;
    pending: number;
    errors: number;
    conflicts: number;
    notificationsHint: number;
    lastSyncAt: string | null;
    mode: SyncMode;
    lastMessage: string | null;
}

const PRIORITY_RANK: Record<SyncPriority, number> = {
    safety: 0,
    operational: 1,
    financial: 2,
    bulk: 3,
};

const MAX_BATCH = 50;
const MAX_RETRIES = 6;
const PULL_INTERVAL_MS = 45000;

function computeMode(): SyncMode {
    if (typeof navigator === 'undefined' || !navigator.onLine) {
        return 'offline';
    }
    const conn = (navigator as Navigator & {
        connection?: { saveData?: boolean; effectiveType?: string };
    }).connection;
    if (conn?.saveData) return 'metered';
    if (conn?.effectiveType && ['slow-2g', '2g'].includes(conn.effectiveType)) return 'metered';
    return 'online';
}

class SyncEngine {
    private state: SyncState = {
        online: typeof navigator === 'undefined' ? true : navigator.onLine,
        syncing: false,
        pending: 0,
        errors: 0,
        conflicts: 0,
        notificationsHint: 0,
        lastSyncAt: null,
        mode: 'online',
        lastMessage: null,
    };

    private listeners = new Set<() => void>();
    private started = false;
    private flushPromise: Promise<void> | null = null;

    subscribe = (listener: () => void): (() => void) => {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    };

    getSnapshot = (): SyncState => this.state;

    private set(patch: Partial<SyncState>): void {
        this.state = { ...this.state, ...patch };
        for (const listener of this.listeners) listener();
    }

    start(): void {
        if (this.started) return;
        this.started = true;

        window.addEventListener('online', () => {
            this.set({ online: true, mode: computeMode(), lastMessage: 'Koneksi kembali — menyinkronkan…' });
            void this.flush();
        });
        window.addEventListener('offline', () => {
            this.set({ online: false, mode: 'offline', lastMessage: null });
        });
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && navigator.onLine) {
                void this.flush();
            }
        });

        void this.refreshCounts();
        void ensureDeviceRegistered().catch(() => undefined);
        void this.flush();

        window.setInterval(() => {
            if (!document.hidden && navigator.onLine) {
                void this.pull();
            }
        }, PULL_INTERVAL_MS);
    }

    private async refreshCounts(): Promise<void> {
        const pending = await syncDb.outbox
            .where('status')
            .anyOf('pending', 'sending')
            .count();
        const errors = await syncDb.outbox.where('status').equals('error').count();
        const conflicts = await syncDb.conflicts.where('status').equals('open').count();
        const meta = await syncDb.meta.get('meta');

        this.set({
            pending,
            errors,
            conflicts,
            lastSyncAt: meta?.last_sync_at ?? this.state.lastSyncAt,
            online: typeof navigator === 'undefined' ? true : navigator.onLine,
            mode: computeMode(),
        });
    }

    /** Masukkan satu laporan/catatan ke antrean offline. Selalu aman dipanggil (online pun). */
    async enqueue(input: {
        entity_type: string;
        payload: Record<string, unknown>;
        label: string;
        priority?: SyncPriority;
        action?: 'create' | 'update';
        entity_id?: string;
        base_updated_at?: string;
    }): Promise<{ queued: true; key: string }> {
        const item: OutboxItem = {
            key: uuid(),
            entity_type: input.entity_type,
            entity_id: input.entity_id,
            action: input.action ?? 'create',
            payload: {
                ...input.payload,
                device_occurred_at: new Date().toISOString(),
            },
            priority: input.priority ?? 'operational',
            base_updated_at: input.base_updated_at,
            device_occurred_at: new Date().toISOString(),
            created_at: Date.now(),
            status: 'pending',
            retries: 0,
            label: input.label,
        };

        await syncDb.outbox.add(item);
        await this.refreshCounts();

        if (navigator.onLine) {
            void this.flush();
        }

        return { queued: true, key: item.key };
    }

    flush(): Promise<void> {
        if (this.flushPromise) return this.flushPromise;
        this.flushPromise = this.doFlush().finally(() => {
            this.flushPromise = null;
        });
        return this.flushPromise;
    }

    private async doFlush(): Promise<void> {
        if (!navigator.onLine) return;

        this.set({ syncing: true });
        try {
            await ensureDeviceRegistered().catch(() => undefined);

            const batch = (await syncDb.outbox
                .where('status')
                .anyOf('pending', 'error')
                .filter((item) => item.retries < MAX_RETRIES)
                .toArray())
                .sort(
                    (a, b) =>
                        PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
                        a.created_at - b.created_at,
                )
                .slice(0, MAX_BATCH);

            if (batch.length === 0) {
                await this.pull();
                return;
            }

            for (const item of batch) {
                await syncDb.outbox.update(item.key, { status: 'sending' });
            }

            const mutations: PushMutation[] = batch.map((item) => ({
                idempotency_key: item.key,
                entity_type: item.entity_type,
                entity_id: item.entity_id,
                action: item.action,
                payload: item.payload,
                priority: item.priority,
                base_updated_at: item.base_updated_at,
            }));

            const response = await pushMutations(mutations);

            for (const result of response.results ?? []) {
                const item = await syncDb.outbox.get(result.idempotency_key);
                if (!item) continue;

                if (result.status === 'accepted' || result.replayed) {
                    await syncDb.outbox.delete(item.key);
                } else if (result.status === 'conflict') {
                    await syncDb.outbox.update(item.key, {
                        status: 'conflict',
                        last_error: result.detail?.reason ?? 'Konflik dengan data kantor',
                    });
                } else {
                    const retries = item.retries + 1;
                    await syncDb.outbox.update(item.key, {
                        status: retries >= MAX_RETRIES ? 'error' : 'pending',
                        retries,
                        last_error: result.detail?.reason ?? 'Ditolak server',
                    });
                }
            }

            // Item yang tidak terjawab (batch terpotong) kembali menunggu.
            for (const item of batch) {
                const still = await syncDb.outbox.get(item.key);
                if (still && still.status === 'sending') {
                    await syncDb.outbox.update(item.key, { status: 'pending' });
                }
            }

            const meta = await syncDb.meta.get('meta');
            await syncDb.meta.put({
                key: 'meta',
                device_id: meta?.device_id ?? getDeviceId(),
                cursor: meta?.cursor,
                last_sync_at: new Date().toISOString(),
            });

            const acceptedCount = (response.results ?? []).filter(
                (result) => result.status === 'accepted' || result.replayed,
            ).length;
            if (acceptedCount > 0) {
                this.set({
                    lastMessage: `${acceptedCount} laporan diterima kantor (${new Date().toLocaleTimeString('id-ID')}).`,
                });
            }

            await this.pull();
        } catch {
            const sending = await syncDb.outbox.where('status').equals('sending').toArray();
            for (const item of sending) {
                await syncDb.outbox.update(item.key, {
                    status: item.retries + 1 >= MAX_RETRIES ? 'error' : 'pending',
                    retries: item.retries + 1,
                    last_error: 'Jaringan gagal — akan dicoba lagi',
                });
            }
            this.set({ lastMessage: 'Sinkron terputus (jaringan) — otomatis dicoba lagi.' });
        } finally {
            this.set({ syncing: false });
            await this.refreshCounts();
        }
    }

    async pull(): Promise<void> {
        if (!navigator.onLine) return;

        try {
            await ensureDeviceRegistered().catch(() => undefined);
            const meta = await syncDb.meta.get('meta');
            const response = await pullDelta(meta?.cursor ?? null);

            await syncDb.meta.put({
                key: 'meta',
                device_id: meta?.device_id ?? getDeviceId(),
                cursor: response.cursor,
                last_sync_at: new Date().toISOString(),
            });

            const newNotifications = Array.isArray(response.changes?.notifications)
                ? response.changes.notifications.length
                : 0;
            if (newNotifications > 0) {
                this.set({ notificationsHint: this.state.notificationsHint + newNotifications });
            }

            await this.refreshConflicts();
        } catch {
            /* offline wajar / server sibuk — abaikan */
        }
    }

    async refreshConflicts(): Promise<void> {
        try {
            const response = await fetchConflicts();
            await syncDb.conflicts.bulkPut(response.conflicts.map((c) => ({ ...c })) as never[]);
            await this.refreshCounts();
        } catch {
            /* butuh izin sync.conflicts / offline — abaikan */
        }
    }

    async resolveConflict(id: number, decision: 'ship' | 'shore'): Promise<void> {
        await resolveConflictRemote(id, decision);
        await syncDb.conflicts.delete(id);
        await this.refreshCounts();
    }

    async retryItem(key: string): Promise<void> {
        await syncDb.outbox.update(key, { status: 'pending', retries: 0, last_error: undefined });
        await this.refreshCounts();
        void this.flush();
    }

    async removeItem(key: string): Promise<void> {
        await syncDb.outbox.delete(key);
        await this.refreshCounts();
    }

    async listOutbox(): Promise<OutboxItem[]> {
        return syncDb.outbox.orderBy('created_at').reverse().toArray();
    }

    async listConflicts(): Promise<Array<Record<string, unknown>>> {
        return (await syncDb.conflicts.orderBy('id').reverse().toArray()) as unknown as Array<
            Record<string, unknown>
        >;
    }

    resetNotificationsHint(): void {
        if (this.state.notificationsHint !== 0) {
            this.set({ notificationsHint: 0 });
        }
    }

    /** Pesan singkat utk UI (terlihat di drawer & chip). */
    notify(message: string): void {
        this.set({ lastMessage: message });
    }
}

export const syncEngine = new SyncEngine();
