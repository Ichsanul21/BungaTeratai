<?php

namespace App\Services\Dev;

use App\Models\Setting;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schema;

/**
 * Feature flag sederhana (disimpan di tabel settings, group "feature").
 * Dipakai panel Developer untuk mematikan fitur bermasalah tanpa deploy.
 */
class FeatureFlagService
{
    private const KEY = 'feature_flags';

    private const CACHE_KEY = 'feature.flags';

    /** @var array<string, array{label: string, description: string, default: bool}> */
    public const DEFINITIONS = [
        'ais_mock' => [
            'label' => 'AIS simulasi',
            'description' => 'Tampilkan kapal AIS mock di peta Operasional.',
            'default' => true,
        ],
        'realtime' => [
            'label' => 'Realtime (Reverb)',
            'description' => 'Kirim perubahan data ke perangkat lain lewat WebSocket.',
            'default' => true,
        ],
        'sql_console' => [
            'label' => 'SQL console developer',
            'description' => 'Izinkan tab SQL read-only di panel Developer.',
            'default' => true,
        ],
        'demo_banner' => [
            'label' => 'Label DEMO DATA',
            'description' => 'Tampilkan penanda DEMO DATA pada data simulasi.',
            'default' => true,
        ],
    ];

    /** @return array<string, bool> */
    public static function all(): array
    {
        $stored = self::stored();

        $flags = [];
        foreach (self::DEFINITIONS as $key => $definition) {
            $flags[$key] = (bool) ($stored[$key] ?? $definition['default']);
        }

        return $flags;
    }

    public static function enabled(string $key): bool
    {
        return self::all()[$key] ?? false;
    }

    /** @param  array<string, bool>  $values */
    public static function set(array $values): array
    {
        $current = self::all();

        foreach (self::DEFINITIONS as $key => $definition) {
            if (array_key_exists($key, $values)) {
                $current[$key] = (bool) $values[$key];
            }
        }

        Setting::updateOrCreate(
            ['key' => self::KEY],
            ['value' => json_encode($current), 'group' => 'feature'],
        );

        Cache::forget(self::CACHE_KEY);

        return self::all();
    }

    /** @return list<array{key: string, label: string, description: string, enabled: bool}> */
    public static function meta(): array
    {
        $flags = self::all();

        $rows = [];
        foreach (self::DEFINITIONS as $key => $definition) {
            $rows[] = [
                'key' => $key,
                'label' => $definition['label'],
                'description' => $definition['description'],
                'enabled' => $flags[$key],
            ];
        }

        return $rows;
    }

    /** @return array<string, bool> */
    private static function stored(): array
    {
        return Cache::remember(self::CACHE_KEY, 60, function () {
            try {
                if (! Schema::hasTable('settings')) {
                    return [];
                }

                $raw = Setting::where('key', self::KEY)->value('value');
                $parsed = $raw ? json_decode($raw, true) : [];

                return is_array($parsed) ? $parsed : [];
            } catch (\Throwable) {
                return [];
            }
        });
    }
}
