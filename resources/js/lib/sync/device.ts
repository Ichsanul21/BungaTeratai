import { syncDb, uuid } from './db';

/**
 * Identitas perangkat (laptop kantor / HP-tablet kapal).
 * device_id = UUID lokal; meta = nama, platform, is_ship, vessel_id kapal.
 * Pendaftaran ke server dilakukan saat pertama sinkron (retry otomatis).
 */

const DEVICE_META_KEY = 'bt-device-meta';

export interface DeviceMeta {
    device_name?: string;
    platform?: string;
    is_ship?: boolean;
    vessel_id?: number | null;
}

export function getDeviceId(): string {
    let id = localStorage.getItem('bt-device-id');
    if (!id) {
        id = uuid();
        localStorage.setItem('bt-device-id', id);
    }
    return id;
}

export function getDeviceMeta(): DeviceMeta {
    try {
        const raw = localStorage.getItem(DEVICE_META_KEY);
        if (raw) return JSON.parse(raw) as DeviceMeta;
    } catch {
        /* abaikan */
    }
    return {
        device_name: navigator.userAgent.includes('Mobile') ? 'Ponsel' : 'Komputer',
        platform: navigator.userAgent.includes('Mobile') ? 'mobile' : 'desktop',
        is_ship: false,
        vessel_id: null,
    };
}

export function setDeviceMeta(meta: Partial<DeviceMeta>): DeviceMeta {
    const next = { ...getDeviceMeta(), ...meta };
    localStorage.setItem(DEVICE_META_KEY, JSON.stringify(next));
    return next;
}

let registering: Promise<void> | null = null;

/** Daftarkan/segarkan device di server (sekali per sesi; aman dipanggil berulang). */
export async function ensureDeviceRegistered(): Promise<void> {
    if (registering) return registering;

    registering = (async () => {
        const meta = getDeviceMeta();
        const { syncHttp } = await import('./api');
        await syncHttp.post('/api/sync/device', {
            device_id: getDeviceId(),
            ...meta,
        });
        const row = await syncDb.meta.get('meta');
        await syncDb.meta.put({ ...(row ?? { key: 'meta' }), key: 'meta', device_id: getDeviceId() });
    })().finally(() => {
        registering = null;
    });

    return registering;
}
