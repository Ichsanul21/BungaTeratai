<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Support\Facades\Auth;

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
    ): AuditLog {
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
}
