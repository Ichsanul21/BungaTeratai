<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="theme-color" content="#C41212">

        {{-- PWA: file dibuat Vite saat `npm run build` (di dev tanpa build = 404, tak berdampak).
             Registrasi SW ada di resources/js/app.tsx (mode PROD saja).
             CATATAN NGINX: /build/sw.js wajib dijawab dgn header `Service-Worker-Allowed: /`
             agar scope-nya '/' (menguasai seluruh halaman). --}}
        <link rel="manifest" href="/build/manifest.webmanifest">

        <title inertia>{{ config('app.name', 'Laravel') }}</title>

        <!-- Fonts -->
        <link rel="preconnect" href="https://fonts.bunny.net">
        {{-- <link href="https://fonts.bunny.net/css?family=figtree:400,500,600&display=swap" rel="stylesheet" /> --}}

        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">

        <!-- Scripts -->
        @routes
        {{-- Konfigurasi realtime (Reverb) — disuntik global karena bootstrap
             bridge berada di luar konteks Inertia. null = realtime dimatikan.
             @json HARUS satu baris: directive-nya tak menangani argumen multi-baris. --}}
        @php
            $btRealtime = [
                'broadcast' => config('broadcasting.default') === 'reverb'
                    ? [
                        'key' => config('reverb.app.key'),
                        'host' => config('reverb.app.host'),
                        'port' => config('reverb.app.port'),
                        'scheme' => config('reverb.app.scheme'),
                    ]
                    : null,
                'user_id' => auth()->id(),
                'roles' => auth()->user()?->roles()->pluck('slug')->values() ?? [],
            ];
        @endphp
        <script>window.__BT_REALTIME__ = @json($btRealtime);</script>
        @viteReactRefresh
        @vite(['resources/js/app.tsx', "resources/js/Pages/{$page['component']}.tsx"])
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        @inertia
    </body>
</html>
