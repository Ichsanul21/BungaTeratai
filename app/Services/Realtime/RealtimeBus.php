<?php

namespace App\Services\Realtime;

use App\Events\DataChanged;

/**
 * Satu pintu broadcast realtime (Reverb).
 *
 * SEMUA panggilan dijaga guard config: saat BROADCAST_CONNECTION != reverb
 * (lokal default 'log', environment test) TIDAK ada event yang didispatch —
 * nol risiko terhadap perilaku lama & test.
 */
class RealtimeBus
{
    public static function dataChanged(string $kind): void
    {
        if (config('broadcasting.default') !== 'reverb') {
            return;
        }

        try {
            event(new DataChanged($kind));
        } catch (\Throwable) {
            // realtime gagal = bukan alasan request utama gagal
        }
    }

    public static function userChanged(string $kind, int $userId): void
    {
        if (config('broadcasting.default') !== 'reverb') {
            return;
        }

        try {
            event(new DataChanged($kind, $userId));
        } catch (\Throwable) {
            // abaikan
        }
    }
}
