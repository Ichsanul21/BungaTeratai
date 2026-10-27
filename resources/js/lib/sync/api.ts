import axios from 'axios';

/**
 * HTTP layer sinkronisasi — axios instance terpisah dengan XSRF token dari
 * cookie (session auth Laravel, same-origin).
 */

function readXsrf(): string | undefined {
    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : undefined;
}

export const syncHttp = axios.create({
    baseURL: '/',
    headers: { 'X-Requested-With': 'XMLHttpRequest' },
    withXSRFToken: true,
    timeout: 30000,
});

syncHttp.interceptors.request.use((config) => {
    const token = readXsrf();
    if (token && !config.headers['X-XSRF-TOKEN']) {
        config.headers['X-XSRF-TOKEN'] = token;
    }
    return config;
});

export interface PushMutation {
    idempotency_key: string;
    entity_type: string;
    entity_id?: string;
    action?: string;
    payload: Record<string, unknown>;
    priority?: string;
    base_updated_at?: string;
}

export interface PushResult {
    idempotency_key: string;
    entity_type: string;
    status: 'accepted' | 'conflict' | 'rejected';
    server_entity_id?: number | null;
    detail?: { reason?: string; violations?: string[]; needs_office_review?: boolean } | null;
    replayed?: boolean;
}

export interface PushResponse {
    batch_id: number;
    server_time: string;
    clock_skew_minutes?: number | null;
    results: PushResult[];
}

export interface PullResponse {
    cursor: string;
    server_time: string;
    changes: Record<string, { upserted: unknown[]; deleted: number[] } | unknown[]>;
}

export async function pushMutations(mutations: PushMutation[]): Promise<PushResponse> {
    const { data } = await syncHttp.post<PushResponse>('/api/sync/push', {
        device_id: localStorage.getItem('bt-device-id'),
        device_now: new Date().toISOString(),
        mutations,
    });
    return data;
}

export async function pullDelta(cursor: string | null): Promise<PullResponse> {
    const { data } = await syncHttp.get<PullResponse>('/api/sync/pull', {
        params: { device_id: localStorage.getItem('bt-device-id'), cursor: cursor ?? undefined },
    });
    return data;
}

export async function fetchConflicts(): Promise<{ conflicts: Array<Record<string, unknown>> }> {
    const { data } = await syncHttp.get('/api/sync/conflicts');
    return data;
}

export async function resolveConflictRemote(id: number, decision: 'ship' | 'shore'): Promise<void> {
    await syncHttp.post(`/api/sync/conflicts/${id}/resolve`, { decision });
}

export async function fetchDocumentPack(vesselId: number): Promise<Record<string, unknown>> {
    const { data } = await syncHttp.get(`/api/sync/pack/${vesselId}`);
    return data;
}
