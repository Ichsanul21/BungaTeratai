<?php

namespace App\Http\Controllers\Dev;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Dev\DevActivityService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/**
 * "Masuk sebagai" — developer dapat melihat aplikasi dari sudut pandang user
 * mana pun tanpa mengetahui sandinya. Seluruh aksi selama impersonasi masuk
 * ke dev_activity_logs dengan aktor = developer asal.
 */
class ImpersonationController extends Controller
{
    public function start(Request $request, User $user)
    {
        $dev = $request->user();

        if (! config('dev.enabled') || $dev === null || ! $dev->isDeveloper()) {
            abort(404);
        }

        if ($user->is($dev)) {
            return back()->with('error', 'Anda sudah masuk sebagai diri sendiri.');
        }

        if ($user->isDeveloper()) {
            return back()->with('error', 'Akun developer lain tidak dapat diimpersonasi.');
        }

        DevActivityService::log(
            'impersonate_start',
            'user',
            $user->id,
            null,
            ['email' => $user->email, 'roles' => $user->roles()->pluck('slug')->all()],
            "Masuk sebagai {$user->name}",
        );

        Auth::login($user);

        // Dipasang SETELAH login: SessionGuard::login() meregenerasi session ID.
        $request->session()->put('dev_impersonator_id', $dev->id);
        $request->session()->put('dev_impersonator_name', $dev->name);

        return redirect('/dashboard')
            ->with('success', "Anda sekarang melihat sebagai {$user->name}.");
    }

    /**
     * Kembali ke akun developer. Route ini sengaja TIDAK memakai middleware
     * "dev" karena saat impersonasi user aktif bukan developer.
     */
    public function stop(Request $request)
    {
        $impersonatorId = (int) $request->session()->get('dev_impersonator_id', 0);
        $current = $request->user();

        if ($impersonatorId === 0) {
            return redirect('/dashboard');
        }

        $dev = User::find($impersonatorId);

        if ($dev === null || ! $dev->isDeveloper() || ! config('dev.enabled')) {
            $request->session()->forget(['dev_impersonator_id', 'dev_impersonator_name', 'dev_session_started_at']);

            return redirect('/login')->with('error', 'Sesi developer tidak valid. Silakan masuk kembali.');
        }

        DevActivityService::log(
            'impersonate_stop',
            'user',
            $current?->id,
            null,
            null,
            'Kembali ke akun developer dari '.($current?->name ?? 'pengguna'),
            null,
            $dev->id,
            $current?->id,
        );

        Auth::login($dev);
        $request->session()->forget(['dev_impersonator_id', 'dev_impersonator_name']);

        return redirect('/developer')->with('success', 'Kembali sebagai developer.');
    }
}
