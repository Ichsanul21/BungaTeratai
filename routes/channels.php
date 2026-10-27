<?php

use Illuminate\Support\Facades\Broadcast;

/*
|--------------------------------------------------------------------------
| Channel Auth Reverb (realtime antar-perangkat)
|--------------------------------------------------------------------------
| Private channel per user (notifikasi pribadi) + per role (perubahan data
| modul). Hanya pengguna dengan role yang cocok yang boleh berlangganan.
*/

Broadcast::channel('user.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('role.{slug}', function ($user, $slug) {
    return $user->hasRole((string) $slug);
});
