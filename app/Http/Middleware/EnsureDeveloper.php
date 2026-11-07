<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * Gerbang panel Developer.
 *
 * DEV_MODE=false atau bukan role developer -> 404 (bukan 403) supaya
 * keberadaan panel tidak terlihat oleh pengguna klien.
 */
class EnsureDeveloper
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! config('dev.enabled') || $user === null || ! $user->isDeveloper()) {
            abort(404);
        }

        $session = $request->session();
        $started = (int) $session->get('dev_session_started_at', 0);
        $limit = max(1, (int) config('dev.session_hours', 8)) * 3600;

        if ($started > 0 && (now()->timestamp - $started) > $limit) {
            $session->forget(['dev_session_started_at', 'dev_impersonator_id', 'dev_impersonator_name']);
            Auth::logout();

            return redirect('/login')->with('error', 'Sesi developer berakhir. Silakan masuk kembali.');
        }

        if ($started === 0) {
            $session->put('dev_session_started_at', now()->timestamp);
        }

        $response = $next($request);
        $response->headers->set('X-Robots-Tag', 'noindex, nofollow');
        $response->headers->set('Cache-Control', 'no-store, private');

        return $response;
    }
}
