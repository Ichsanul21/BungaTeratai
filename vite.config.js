import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
    plugins: [
        laravel({
            input: 'resources/js/app.tsx',
            refresh: true,
        }),
        react(),
        VitePWA({
            strategies: 'injectManifest',
            srcDir: 'resources/js',
            filename: 'sw.js',
            registerType: 'autoUpdate',
            // Registrasi manual di resources/js/app.tsx (Blade tak diproses
            // transformIndexHtml Vite sehingga injeksi otomatis tak masuk).
            injectRegister: false,
            injectManifest: {
                globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
                globIgnores: ['**/sw.js'],
            },
            manifest: {
                name: 'Bunga Teratai System',
                short_name: 'BungaTeratai',
                description: 'ERP manajemen dokumen & operasi pelayaran PT Bunga Teratai — dapat dipakai offline (mode kapal).',
                theme_color: '#C41212',
                background_color: '#172B3A',
                display: 'standalone',
                orientation: 'any',
                start_url: '/',
                scope: '/',
                lang: 'id',
                icons: [
                    { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
                    { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
                    { src: '/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
                ],
            },
            devOptions: {
                enabled: false,
            },
        }),
    ],
});
