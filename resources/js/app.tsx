import '../css/app.css';
import './bootstrap';

import { SyncProvider } from '@/lib/sync/SyncProvider';
import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

/**
 * Registrasi Service Worker (offline availability).
 * Hanya mode build (PROD): di dev `sw.js` mungkin tak ada / cache dev mengganggu.
 * Scope '/' butuh header `Service-Worker-Allowed: /` pada respons /build/sw.js
 * (sudah dicatat di AGENTS.md utk nginx) — bila header tak ada, SW tetap aman
 * diskip dengan peringatan di console.
 */
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker
            .register('/build/sw.js', { scope: '/' })
            .catch((error) => {
                console.warn(
                    '[PWA] Service worker gagal registrasi (cek header Service-Worker-Allowed: /):',
                    error,
                );
            });
    });
}

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) =>
        resolvePageComponent(
            `./Pages/${name}.tsx`,
            import.meta.glob('./Pages/**/*.tsx'),
        ),
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(
            <SyncProvider>
                <App {...props} />
            </SyncProvider>,
        );
    },
    progress: {
        color: '#4B5563',
    },
});
