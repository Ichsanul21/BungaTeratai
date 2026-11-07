<?php

namespace App\Services;

use App\Models\Company;
use App\Models\Setting;
use App\Support\DeviceLabel;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schema;

/**
 * Watermark keamanan (layar + PDF) — dikendalikan dari panel Developer.
 *
 * Baris kedua memakai token yang diisi per pengunjung:
 * {ip} {device} {timestamp} {user} {company} {doc_no}
 */
class WatermarkService
{
    private const KEY = 'watermark';

    private const CACHE_KEY = 'watermark.config';

    public static function defaults(): array
    {
        return [
            'enabled' => true,
            'line1' => 'Copyright of Alenkosa - Your IT Solutions',
            'line2' => '{ip} - {device} - {timestamp} - {user}',
            'opacity' => 0.07,
            'speed' => 40,
            'angle' => -28,
            'font_size' => 11,
            'color' => '#00205B',
            'show_login' => true,
            'pdf_enabled' => true,
        ];
    }

    public static function get(): array
    {
        return Cache::remember(self::CACHE_KEY, 60, function () {
            try {
                if (! Schema::hasTable('settings')) {
                    return self::defaults();
                }

                $raw = Setting::where('key', self::KEY)->value('value');
                $stored = $raw ? json_decode($raw, true) : [];

                return self::normalize(is_array($stored) ? $stored : []);
            } catch (\Throwable) {
                return self::defaults();
            }
        });
    }

    public static function save(array $input): array
    {
        $config = self::normalize(array_merge(self::get(), $input));

        Setting::updateOrCreate(
            ['key' => self::KEY],
            ['value' => json_encode($config, JSON_UNESCAPED_UNICODE), 'group' => 'watermark'],
        );

        Cache::forget(self::CACHE_KEY);

        return $config;
    }

    public static function reset(): array
    {
        Setting::where('key', self::KEY)->delete();
        Cache::forget(self::CACHE_KEY);

        return self::defaults();
    }

    /**
     * Payload untuk overlay di browser. null = watermark dimatikan.
     */
    public static function clientPayload(?Request $request): ?array
    {
        $config = self::get();

        if (! $config['enabled']) {
            return null;
        }

        return [
            'line1' => $config['line1'],
            'line2' => $config['line2'],
            'values' => self::values($request),
            'server_time' => now()->toIso8601String(),
            'opacity' => $config['opacity'],
            'speed' => $config['speed'],
            'angle' => $config['angle'],
            'font_size' => $config['font_size'],
            'color' => $config['color'],
            'show_login' => $config['show_login'],
        ];
    }

    /**
     * Teks watermark untuk PDF (statis, waktu cetak). null = tidak dipakai.
     *
     * @return array{line1: string, line2: string}|null
     */
    public static function pdf(): ?array
    {
        $config = self::get();

        if (! $config['enabled'] || ! $config['pdf_enabled']) {
            return null;
        }

        $values = self::values(request());
        $values['timestamp'] = now()->timezone('Asia/Makassar')->translatedFormat('d M Y H:i').' WITA';
        $values['doc_no'] = '';

        $map = [];
        foreach ($values as $key => $value) {
            $map['{'.$key.'}'] = (string) $value;
        }

        return [
            'line1' => self::replace($config['line1'], $map),
            'line2' => self::replace($config['line2'], $map),
        ];
    }

    /** @return array<string, string> */
    private static function values(?Request $request): array
    {
        return [
            'ip' => $request?->ip() ?: 'tidak diketahui',
            'device' => DeviceLabel::fromUserAgent($request?->userAgent()),
            'user' => Auth::user()?->name ?? 'Tamu',
            'company' => self::companyName(),
            'doc_no' => '',
            'timestamp' => '',
        ];
    }

    /** @param  array<string, string>  $values */
    private static function replace(string $template, array $values): string
    {
        return strtr($template, $values);
    }

    private static function companyName(): string
    {
        return Cache::remember('watermark.company', 600, function () {
            try {
                if (! Schema::hasTable('companies')) {
                    return 'PT Bunga Teratai';
                }

                return Company::query()->value('company_name') ?: 'PT Bunga Teratai';
            } catch (\Throwable) {
                return 'PT Bunga Teratai';
            }
        });
    }

    private static function normalize(array $input): array
    {
        $defaults = self::defaults();

        $text = static function (mixed $value, string $fallback) {
            $clean = trim(strip_tags((string) ($value ?? '')));

            return $clean === '' ? $fallback : mb_substr($clean, 0, 140);
        };

        $clamp = static fn (mixed $value, int|float $min, int|float $max, int|float $fallback) => is_numeric($value)
            ? max($min, min($max, $value + 0))
            : $fallback;

        $color = (string) ($input['color'] ?? $defaults['color']);
        if (! preg_match('/^#[0-9A-Fa-f]{6}$/', $color)) {
            $color = $defaults['color'];
        }

        return [
            'enabled' => (bool) ($input['enabled'] ?? $defaults['enabled']),
            'line1' => $text($input['line1'] ?? null, $defaults['line1']),
            'line2' => $text($input['line2'] ?? null, $defaults['line2']),
            'opacity' => round((float) $clamp($input['opacity'] ?? null, 0.01, 0.35, $defaults['opacity']), 3),
            'speed' => (int) $clamp($input['speed'] ?? null, 10, 240, $defaults['speed']),
            'angle' => (int) $clamp($input['angle'] ?? null, -60, 60, $defaults['angle']),
            'font_size' => (int) $clamp($input['font_size'] ?? null, 8, 24, $defaults['font_size']),
            'color' => $color,
            'show_login' => (bool) ($input['show_login'] ?? $defaults['show_login']),
            'pdf_enabled' => (bool) ($input['pdf_enabled'] ?? $defaults['pdf_enabled']),
        ];
    }
}
