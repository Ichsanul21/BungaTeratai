/**
 * Service worker Bunga Teratai — offline availability ala maritime:
 * - Aset build (ber-hash) di-precache -> shell aplikasi dibuka tanpa internet.
 * - Halaman Inertia (GET dgn header X-Inertia, tanpa partial) di-cache per-URL
 *   dengan pola NetworkFirst -> pernah dikunjungi = masih bisa dibuka offline
 *   (data terakhir yang tersimpan, ditandai banner offline di UI).
 * - Semua request non-GET (simpan data, push sinkron) TIDAK pernah di-cache:
 *   tulis offline lewat outbox IndexedDB + /api/sync/push saat kembali online.
 *
 * Catatan: aplikasi ini tidak memakai partial reload Inertia (only:),
 * sehingga key per-URL aman merepresentasikan props halaman penuh.
 */

/* global self, caches, fetch, Response */

const PRECACHE = 'bt-precache-v1';
const PAGES = 'bt-pages-v1';
const ASSETS = 'bt-assets-v1';

const MANIFEST = self.__WB_MANIFEST || [];

self.addEventListener('install', (event) => {
    event.waitUntil(
        (async () => {
            const cache = await caches.open(PRECACHE);
            await Promise.all(
                MANIFEST.map((entry) =>
                    cache.add(new Request(entry.url, { cache: 'reload' })).catch(() => undefined),
                ),
            );
            await self.skipWaiting();
        })(),
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        (async () => {
            const keys = await caches.keys();
            await Promise.all(
                keys
                    .filter((key) => ![PRECACHE, PAGES, ASSETS].includes(key))
                    .map((key) => caches.delete(key)),
            );
            await self.clients.claim();
        })(),
    );
});

self.addEventListener('fetch', (event) => {
    const request = event.request;

    if (request.method !== 'GET') {
        return; // tulis/unduh -> selalu jaringan (outbox yang menangani offline)
    }

    const url = new URL(request.url);
    if (url.origin !== self.location.origin) {
        return;
    }

    const isInertiaPage =
        request.headers.get('X-Inertia') === '1' &&
        request.headers.get('X-Inertia-Partial-Component') === null;
    const isNavigation = request.mode === 'navigate';

    if (isInertiaPage || isNavigation) {
        event.respondWith(networkFirst(request));
        return;
    }

    if (
        url.pathname.startsWith('/build/') ||
        url.pathname.startsWith('/storage/') ||
        /\.(?:js|css|woff2?|png|jpe?g|svg|webp|ico)$/.test(url.pathname)
    ) {
        event.respondWith(cacheFirst(request));
    }
});

async function networkFirst(request) {
    try {
        const response = await fetch(request);
        if (response && response.ok) {
            const cache = await caches.open(PAGES);
            await cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        const cached = await caches.match(request, { ignoreSearch: false });
        if (cached) {
            return cached;
        }
        if (request.mode === 'navigate') {
            const shell = await caches.match('/');
            if (shell) {
                return shell;
            }
        }
        return Response.json(
            { message: 'Anda offline dan halaman ini belum pernah dikunjungi.', offline: true },
            { status: 503, headers: { 'Content-Type': 'application/json' } },
        );
    }
}

async function cacheFirst(request) {
    const cached = await caches.match(request);
    if (cached) {
        return cached;
    }
    const response = await fetch(request);
    if (response && response.ok) {
        const cache = await caches.open(ASSETS);
        await cache.put(request, response.clone());
    }
    return response;
}
