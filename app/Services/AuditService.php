<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\DevActivityLog;
use App\Services\Dev\DevActivityService;
use Illuminate\Support\Facades\Auth;

/**
 * Jejak audit operasional (milik klien).
 *
 * Aksi akun developer — termasuk saat developer memakai fitur "Masuk sebagai" —
 * dialihkan ke dev_activity_logs supaya Jejak Audit klien tetap bersih, tetapi
 * tetap dapat ditelusuri lewat panel Developer.
 */
class AuditService
{
    public static function log(
        string $action,
        string $entityType,
        int|string|null $entityId,
        ?array $before = null,
        ?array $after = null,
        ?string $summary = null,
        ?string $reason = null,
        ?string $referenceType = null,
        int|string|null $referenceId = null,
        ?int $assignerId = null,
        ?string $assignerName = null,
        ?string $assignedTo = null,
    ): AuditLog|DevActivityLog|null {
        $actor = Auth::user();
        $impersonatorId = self::impersonatorId();

        if ($impersonatorId !== null || ($actor?->isDeveloper() ?? false)) {
            $impersonated = $impersonatorId !== null ? (int) $actor?->id : null;

            return DevActivityService::log(
                $action,
                $entityType,
                $entityId,
                $before,
                $after,
                $summary,
                $reason,
                $impersonatorId ?? (int) $actor?->id,
                $impersonated,
            );
        }

        return AuditLog::create([
            'user_id' => Auth::id(),
            'assigner_id' => $assignerId ?? ($after['assigner_id'] ?? null),
            'assigner_name' => $assignerName ?? ($after['assigner_name'] ?? (Auth::user()?->name ?? null)),
            'assigned_to' => $assignedTo ?? ($after['assigned_to'] ?? ($after['person_in_charge'] ?? null)),
            'action' => $action,
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'before' => $before,
            'after' => $after,
            'change_summary' => $summary,
            'reason' => $reason,
            'reference_type' => $referenceType,
            'reference_id' => $referenceId,
            'ip_address' => request()?->ip(),
            'timestamp' => now(),
        ]);
    }

    /** ID developer asal saat sesi sedang memakai fitur "Masuk sebagai". */
    public static function impersonatorId(): ?int
    {
        try {
            if (! app()->bound('session')) {
                return null;
            }

            $id = app('session')->get('dev_impersonator_id');

            return $id !== null ? (int) $id : null;
        } catch (\Throwable) {
            return null;
        }
    }
}
