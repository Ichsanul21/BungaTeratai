import Dexie, { type Table } from 'dexie';

/**
 * Penyimpanan lokal mesin sinkronisasi.
 * - outbox : mutasi offline yang menunggu dikirim (tahan reload/ crash).
 * - meta   : cursor pull terakhir + device_id + waktu sinkron terakhir.
 * - conflicts : konflik dari server utk review kantor (tersedia offline).
 */

export type OutboxStatus = 'pending' | 'sending' | 'error' | 'conflict';
export type SyncPriority = 'safety' | 'operational' | 'financial' | 'bulk';

export interface OutboxItem {
    key: string; // idempotency_key (UUID)
    entity_type: string;
    entity_id?: string;
    action: 'create' | 'update' | 'delete';
    payload: Record<string, unknown>;
    priority: SyncPriority;
    base_updated_at?: string;
    device_occurred_at: string;
    created_at: number;
    status: OutboxStatus;
    retries: number;
    last_error?: string;
    label: string; // tampilan manusia di drawer
}

export interface SyncMetaRow {
    key: 'meta';
    device_id?: string;
    cursor?: string;
    last_sync_at?: string;
}

export interface ConflictRow {
    id: number;
    entity_type: string;
    entity_id: number;
    field: string;
    ship_value?: string | null;
    shore_value?: string | null;
    ship_occurred_at?: string | null;
    device_name?: string | null;
    policy: string;
    status: string;
    created_at?: string | null;
}

class SyncDatabase extends Dexie {
    outbox!: Table<OutboxItem, string>;
    meta!: Table<SyncMetaRow, string>;
    conflicts!: Table<ConflictRow, number>;

    constructor() {
        super('bunga-teratai-sync');
        this.version(1).stores({
            outbox: 'key, status, priority, created_at, entity_type',
            meta: 'key',
            conflicts: 'id, status, entity_type',
        });
    }
}

export const syncDb = new SyncDatabase();

export function uuid(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
