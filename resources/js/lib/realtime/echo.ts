/**
 * Klien realtime Laravel Reverb (Pusher protocol).
 *
 * Peran: menerima PING "ada perubahan" dari server, lalu memicu:
 *  1) syncEngine.pull()  -> ambil delta terbaru (otoritas server utuh)
 *  2) reload halaman terkini (preserveState) -> daftar/kartu ikut ter-update
 *
 * Auth channel memakai session cookie + XSRF token (same-origin).
 */

import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

export interface BroadcastConfig {
    key: string;
    host?: string | null;
    port?: number | null;
    scheme?: string | null;
}

export interface RealtimeGlobals {
    broadcast: BroadcastConfig | null;
    user_id: number | null;
    roles: string[];
}

declare global {
    interface Window {
        __BT_REALTIME__?: RealtimeGlobals;
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyEcho = any;

let echo: AnyEcho = null;

export function initEcho(config: BroadcastConfig): AnyEcho | null {
    if (echo || typeof window === 'undefined') return echo;

    try {
        const isSecure =
            (config.scheme ?? window.location.protocol.replace(':', '')) === 'https' ||
            window.location.protocol === 'https:';

        const xsrfMatch = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
        const xsrf = xsrfMatch ? decodeURIComponent(xsrfMatch[1]) : '';

        const client = new Pusher(config.key, {
            // cluster wajib di tipe Pusher tapi tidak dipakai Reverb (self-hosted)
            cluster: 'mt1',
            wsHost: config.host ?? window.location.hostname,
            wsPort: config.port ?? (isSecure ? 443 : 80),
            wssPort: config.port ?? (isSecure ? 443 : 80),
            forceTLS: isSecure,
            enabledTransports: ['ws', 'wss'],
            authEndpoint: '/broadcasting/auth',
            auth: {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-XSRF-TOKEN': xsrf,
                },
            },
        });

        echo = new Echo({
            broadcaster: 'pusher',
            client,
        });

        return echo;
    } catch (error) {
        console.warn('[realtime] gagal inisialisasi Echo:', error);
        return null;
    }
}

export function disconnectEcho(): void {
    try {
        echo?.disconnect?.();
    } catch {
        /* abaikan */
    }
    echo = null;
}
