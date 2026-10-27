import { router } from '@inertiajs/react';
import {
    createContext,
    useContext,
    useEffect,
    useState,
    useSyncExternalStore,
    type ReactNode,
} from 'react';
import { disconnectEcho, initEcho } from '@/lib/realtime/echo';
import { syncEngine, type SyncState } from './engine';

interface SyncContextValue {
    state: SyncState;
    engine: typeof syncEngine;
    drawerOpen: boolean;
    setDrawerOpen: (open: boolean) => void;
}

const SyncContext = createContext<SyncContextValue | null>(null);

/**
 * Pasang mesin sinkronisasi + jembatan realtime di seluruh aplikasi:
 * - start() sekali per sesi (listener online/offline + interval pull).
 * - Reverb (bila aktif): tiap event ".data-changed" -> pull delta + reload
 *   halaman terkini (debounce) — inilah "perubahan serentak antar perangkat".
 * - router.on('success') mereset hint notifikasi (badge sudah di-refresh server).
 */
export function SyncProvider({ children }: { children: ReactNode }) {
    const state = useSyncExternalStore(
        syncEngine.subscribe,
        syncEngine.getSnapshot,
        syncEngine.getSnapshot,
    );
    const [drawerOpen, setDrawerOpen] = useState(false);

    useEffect(() => {
        syncEngine.start();

        const unsubscribe = router.on('success', () => {
            syncEngine.resetNotificationsHint();
        });

        const globals = window.__BT_REALTIME__;
        let reloadTimer: ReturnType<typeof setTimeout> | null = null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let echo: any = null;
        const subscriptions: Array<{ unlisten: () => void }> = [];

        const onDataChanged = () => {
            void syncEngine.pull();
            if (reloadTimer) clearTimeout(reloadTimer);
            reloadTimer = setTimeout(() => {
                // reload() Inertia v2 selalu preserve state & scroll (ReloadOptions
                // sengaja tidak punya opsi itu) — aman walui form sedang terbuka.
                router.reload();
            }, 800);
        };

        if (globals?.broadcast && globals.user_id) {
            echo = initEcho(globals.broadcast);
            if (echo) {
                try {
                    const userChannel = echo.private(`user.${globals.user_id}`);
                    userChannel.listen('.data-changed', onDataChanged);
                } catch (error) {
                    console.warn('[realtime] channel user gagal:', error);
                }
                for (const role of globals.roles ?? []) {
                    try {
                        const roleChannel = echo.private(`role.${role}`);
                        roleChannel.listen('.data-changed', onDataChanged);
                    } catch (error) {
                        console.warn(`[realtime] channel role.${role} gagal:`, error);
                    }
                }
            }
        }

        return () => {
            if (unsubscribe && typeof unsubscribe === 'function') unsubscribe();
            if (reloadTimer) clearTimeout(reloadTimer);
            for (const sub of subscriptions) {
                try {
                    sub.unlisten();
                } catch {
                    /* abaikan */
                }
            }
            disconnectEcho();
        };
    }, []);

    return (
        <SyncContext.Provider value={{ state, engine: syncEngine, drawerOpen, setDrawerOpen }}>
            {children}
        </SyncContext.Provider>
    );
}

export function useSync(): SyncContextValue {
    const context = useContext(SyncContext);
    if (!context) {
        throw new Error('useSync hanya boleh dipakai di dalam SyncProvider');
    }
    return context;
}
