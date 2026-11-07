<?php

namespace App\Support;

/**
 * Label perangkat ringkas dari User-Agent — dipakai watermark & jejak developer.
 * Sengaja pendek ("Windows · Chrome · Desktop") agar muat di pita watermark.
 */
class DeviceLabel
{
    public static function fromUserAgent(?string $ua): string
    {
        if ($ua === null || trim($ua) === '') {
            return 'Perangkat tak dikenal';
        }

        $os = match (true) {
            str_contains($ua, 'Android') => 'Android',
            str_contains($ua, 'iPhone'), str_contains($ua, 'iPad'), str_contains($ua, 'iOS') => 'iOS',
            str_contains($ua, 'Windows') => 'Windows',
            str_contains($ua, 'Mac OS X'), str_contains($ua, 'Macintosh') => 'macOS',
            str_contains($ua, 'CrOS') => 'ChromeOS',
            str_contains($ua, 'Linux') => 'Linux',
            default => 'Lainnya',
        };

        $browser = match (true) {
            str_contains($ua, 'Edg/'), str_contains($ua, 'Edge/') => 'Edge',
            str_contains($ua, 'OPR/'), str_contains($ua, 'Opera') => 'Opera',
            str_contains($ua, 'SamsungBrowser') => 'Samsung',
            str_contains($ua, 'Chrome/'), str_contains($ua, 'CriOS') => 'Chrome',
            str_contains($ua, 'Firefox/'), str_contains($ua, 'FxiOS') => 'Firefox',
            str_contains($ua, 'Safari/') => 'Safari',
            default => 'Browser lain',
        };

        $form = match (true) {
            str_contains($ua, 'Mobile'), str_contains($ua, 'Tablet') => 'Mobile',
            default => 'Desktop',
        };

        return "{$os} · {$browser} · {$form}";
    }
}
