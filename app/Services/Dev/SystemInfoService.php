<?php

namespace App\Services\Dev;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Ringkasan sistem untuk panel Developer.
 * Aman: hanya membaca versi/driver/ukuran — tidak mengubah apa pun.
 */
class SystemInfoService
{
    /** Tabel yang ditampilkan jumlah barisnya (bukan seluruh skema, agar cepat). */
    public const COUNTED_TABLES = [
        'users', 'roles', 'vessels', 'voyages', 'documents', 'document_versions',
        'invoices', 'bills', 'payments', 'journal_entries', 'crews',
        'notifications', 'audit_logs', 'dev_activity_logs', 'devices', 'sync_conflicts',
    ];

    public static function summary(): array
    {
        return Cache::remember('dev.system_info', 30, fn () => self::build());
    }

    private static function build(): array
    {
        return [
            'app' => config('app.name'),
            'environment' => app()->environment(),
            'debug' => (bool) config('app.debug'),
            'php' => PHP_VERSION,
            'laravel' => app()->version(),
            'database' => self::databaseLabel(),
            'cache' => (string) config('cache.default'),
            'queue' => (string) config('queue.default'),
            'session' => (string) config('session.driver'),
            'broadcast' => (string) config('broadcasting.default'),
            'timezone' => (string) config('app.timezone'),
            'server_time' => now()->translatedFormat('d M Y H:i:s').' WITA',
            'url' => config('app.url'),
            'storage_free' => self::bytes(self::diskFree()),
            'storage_used' => self::bytes(self::dirSize(storage_path('app'))),
            'dev_mode' => (bool) config('dev.enabled'),
            'tables' => self::tableCounts(),
        ];
    }

    private static function databaseLabel(): string
    {
        $connection = (string) config('database.default');
        $database = config("database.connections.{$connection}.database");

        return $connection.' · '.(is_string($database) && $database !== '' ? $database : '(default)');
    }

    /** @return list<array{name: string, count: int}> */
    private static function tableCounts(): array
    {
        $rows = [];

        foreach (self::COUNTED_TABLES as $table) {
            try {
                if (! Schema::hasTable($table)) {
                    continue;
                }

                $rows[] = ['name' => $table, 'count' => (int) DB::table($table)->count()];
            } catch (\Throwable) {
                // tabel bermasalah tidak boleh mematikan panel
            }
        }

        return $rows;
    }

    private static function diskFree(): ?float
    {
        try {
            $free = @disk_free_space(storage_path());

            return $free === false ? null : (float) $free;
        } catch (\Throwable) {
            return null;
        }
    }

    private static function dirSize(string $path): ?float
    {
        try {
            if (! is_dir($path)) {
                return null;
            }

            $size = 0;
            $files = new \RecursiveIteratorIterator(
                new \RecursiveDirectoryIterator($path, \FilesystemIterator::SKIP_DOTS),
            );

            foreach ($files as $file) {
                if ($file->isFile()) {
                    $size += (int) $file->getSize();
                }
            }

            return (float) $size;
        } catch (\Throwable) {
            return null;
        }
    }

    private static function bytes(?float $bytes): ?string
    {
        if ($bytes === null) {
            return null;
        }

        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $i = 0;
        while ($bytes >= 1024 && $i < count($units) - 1) {
            $bytes /= 1024;
            $i++;
        }

        return number_format($bytes, $i === 0 ? 0 : 1, ',', '.').' '.$units[$i];
    }
}
