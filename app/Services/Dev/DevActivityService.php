<?php

namespace App\Services\Dev;

use App\Models\DevActivityLog;
use App\Support\DeviceLabel;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

/**
 * Satu-satunya pintu jejak aktivitas developer.
 *
 * Ditulis ke tabel dev_activity_logs (bisa dibaca di panel Developer) DAN
 * ke storage/logs/dev-activity.log, supaya jejak tetap ada walau baris DB
 * dihapus. Kegagalan menulis jejak TIDAK boleh menggagalkan aksi utama.
 */
class DevActivityService
{
    public static function log(
        string $action,
        ?string $entityType = null,
        int|string|null $entityId = null,
        ?array $before = null,
        ?array $after = null,
        ?string $summary = null,
        ?string $reason = null,
        ?int $actorId = null,
        ?int $impersonatedUserId = null,
    ): ?DevActivityLog {
        try {
            $request = request();
            $actorId ??= Auth::id();

            $entry = DevActivityLog::create([
                'user_id' => $actorId,
                'action' => $action,
                'entity_type' => $entityType,
                'entity_id' => $entityId !== null ? (string) $entityId : null,
                'before' => $before,
                'after' => $after,
                'summary' => $summary,
                'reason' => $reason,
                'ip_address' => $request?->ip(),
                'device' => DeviceLabel::fromUserAgent($request?->userAgent()),
                'session_id' => self::sessionId($request),
                'impersonated_user_id' => $impersonatedUserId,
                'timestamp' => now(),
            ]);

            Log::build([
                'driver' => 'single',
                'path' => storage_path('logs/dev-activity.log'),
                'level' => 'debug',
            ])->info('dev-activity', [
                'actor' => $actorId,
                'as' => $impersonatedUserId,
                'action' => $action,
                'entity' => $entityType,
                'entity_id' => $entityId,
                'ip' => $request?->ip(),
                'summary' => $summary,
            ]);

            return $entry;
        } catch (\Throwable) {
            // jejak gagal ditulis bukan alasan menggagalkan aksi
            return null;
        }
    }

    private static function sessionId(?Request $request): ?string
    {
        try {
            return $request?->hasSession() ? $request->session()->getId() : null;
        } catch (\Throwable) {
            return null;
        }
    }
}
