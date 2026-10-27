<?php

namespace App\Services;

use App\Enums\ApprovalStatus;
use App\Enums\ChecklistApplicability;
use App\Enums\ChecklistCompletion;
use App\Enums\NotificationType;
use App\Enums\VoyageEventType;
use App\Enums\VoyageStatus;
use App\Models\Approval;
use App\Models\Notification;
use App\Models\Role;
use App\Models\Voyage;
use App\Models\VoyageChecklist;
use App\Models\VoyageEvent;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use InvalidArgumentException;

/**
 * Alur status perjalanan (13 status) + checklist dinamis + approval internal.
 * Status kesiapan = indikator INTERNAL — bukan persetujuan otoritas.
 */
class VoyageWorkflowService
{
    public const WORKFLOW_ORDER = [
        VoyageStatus::Draft->value => 1,
        VoyageStatus::Planned->value => 2,
        VoyageStatus::DocumentPreparation->value => 3,
        VoyageStatus::InternalReview->value => 4,
        VoyageStatus::AwaitingExternalApproval->value => 5,
        VoyageStatus::ReadyForDeparture->value => 6,
        VoyageStatus::Departed->value => 7,
        VoyageStatus::InTransit->value => 8,
        VoyageStatus::Arrived->value => 9,
        VoyageStatus::VoyageClosure->value => 10,
        VoyageStatus::Completed->value => 11,
        VoyageStatus::Delayed->value => 98,
        VoyageStatus::Cancelled->value => 99,
    ];

    /** Transisi yang diizinkan (maju dan mundur sesuai aturan bisnis). */
    public const TRANSITIONS = [
        VoyageStatus::Draft->value => [VoyageStatus::Planned->value, VoyageStatus::Cancelled->value],
        VoyageStatus::Planned->value => [VoyageStatus::DocumentPreparation->value, VoyageStatus::Draft->value, VoyageStatus::Delayed->value, VoyageStatus::Cancelled->value],
        VoyageStatus::DocumentPreparation->value => [VoyageStatus::InternalReview->value, VoyageStatus::Planned->value, VoyageStatus::Delayed->value, VoyageStatus::Cancelled->value],
        VoyageStatus::InternalReview->value => [VoyageStatus::AwaitingExternalApproval->value, VoyageStatus::DocumentPreparation->value, VoyageStatus::Planned->value, VoyageStatus::Cancelled->value],
        VoyageStatus::AwaitingExternalApproval->value => [VoyageStatus::ReadyForDeparture->value, VoyageStatus::InternalReview->value, VoyageStatus::DocumentPreparation->value, VoyageStatus::Delayed->value, VoyageStatus::Cancelled->value],
        VoyageStatus::ReadyForDeparture->value => [VoyageStatus::Departed->value, VoyageStatus::AwaitingExternalApproval->value, VoyageStatus::InternalReview->value, VoyageStatus::Delayed->value, VoyageStatus::Cancelled->value],
        VoyageStatus::Departed->value => [VoyageStatus::InTransit->value, VoyageStatus::ReadyForDeparture->value, VoyageStatus::Delayed->value],
        VoyageStatus::InTransit->value => [VoyageStatus::Arrived->value, VoyageStatus::Departed->value, VoyageStatus::Delayed->value],
        VoyageStatus::Arrived->value => [VoyageStatus::VoyageClosure->value, VoyageStatus::InTransit->value, VoyageStatus::Delayed->value],
        VoyageStatus::VoyageClosure->value => [VoyageStatus::Completed->value, VoyageStatus::Arrived->value, VoyageStatus::Delayed->value],
        VoyageStatus::Completed->value => [VoyageStatus::VoyageClosure->value],
        VoyageStatus::Delayed->value => [VoyageStatus::ReadyForDeparture->value, VoyageStatus::Departed->value, VoyageStatus::InTransit->value, VoyageStatus::Arrived->value, VoyageStatus::VoyageClosure->value, VoyageStatus::Cancelled->value],
        VoyageStatus::Cancelled->value => [VoyageStatus::Draft->value, VoyageStatus::Planned->value],
    ];

    public static function isBackwardTransition(string $from, string $to): bool
    {
        $orderFrom = self::WORKFLOW_ORDER[$from] ?? 0;
        $orderTo = self::WORKFLOW_ORDER[$to] ?? 0;

        if ($orderFrom > 0 && $orderFrom <= 11 && $orderTo > 0 && $orderTo <= 11) {
            return $orderTo < $orderFrom;
        }

        return false;
    }

    public static function statusLabel(string $status): string
    {
        return match ($status) {
            VoyageStatus::Draft->value => 'Draf',
            VoyageStatus::Planned->value => 'Direncanakan',
            VoyageStatus::DocumentPreparation->value => 'Persiapan Dokumen',
            VoyageStatus::InternalReview->value => 'Pemeriksaan Internal',
            VoyageStatus::AwaitingExternalApproval->value => 'Menunggu Persetujuan Eksternal',
            VoyageStatus::ReadyForDeparture->value => 'Siap Berangkat',
            VoyageStatus::Departed->value => 'Berangkat',
            VoyageStatus::InTransit->value => 'Dalam Pelayaran',
            VoyageStatus::Arrived->value => 'Tiba di Tujuan',
            VoyageStatus::VoyageClosure->value => 'Penutupan Pelayaran',
            VoyageStatus::Completed->value => 'Selesai',
            VoyageStatus::Delayed->value => 'Tertunda',
            VoyageStatus::Cancelled->value => 'Dibatalkan',
            default => ucfirst(str_replace('_', ' ', $status)),
        };
    }

    public function __construct(
        private DocumentCompletenessService $completeness,
        private ReminderService $reminders,
    ) {}

    /** Bangun checklist dari requirement yang berlaku untuk perjalanan ini. */
    public function buildChecklist(Voyage $voyage): void
    {
        $voyage->checklists()->delete();

        foreach ($this->completeness->applicableVoyageRequirements($voyage) as $req) {
            VoyageChecklist::create([
                'voyage_id' => $voyage->id,
                'requirement_id' => $req->id,
                'applicability' => $req->is_conditional
                    ? ChecklistApplicability::Kondisional->value
                    : ChecklistApplicability::Wajib->value,
                'completion_status' => ChecklistCompletion::Belum->value,
            ]);
        }

        $this->recordEvent($voyage, VoyageEventType::StatusChanged, 'Checklist dibuat otomatis berdasarkan jenis kapal, rute, dan muatan.');
    }

    /** Detail checklist untuk UI (dengan pemetaan dokumen terpenuhi otomatis). */
    public function refreshChecklistCompletion(Voyage $voyage): void
    {
        $linkedDocCodes = $voyage->documents()->pluck('requirement_code')->filter()->unique();

        foreach ($voyage->checklists()->with('requirement')->get() as $item) {
            if ($item->completion_status === ChecklistCompletion::TidakBerlaku->value) {
                continue;
            }
            $code = $item->requirement?->code;
            if ($code && $linkedDocCodes->contains($code)) {
                $item->update(['completion_status' => ChecklistCompletion::Terpenuhi->value]);
            }
        }
    }

    /**
     * Pindah status dengan validasi server-side.
     *
     * @throws InvalidArgumentException
     */
    public function transition(Voyage $voyage, string $to, ?string $note = null, ?string $reason = null): void
    {
        $from = $voyage->voyage_status;
        if ($from === $to) {
            return;
        }

        $allowed = self::TRANSITIONS[$from] ?? [];
        if (! in_array($to, $allowed, true)) {
            $fromLabel = self::statusLabel($from);
            $toLabel = self::statusLabel($to);
            throw new InvalidArgumentException("Transisi status tidak valid: {$fromLabel} ke {$toLabel}.");
        }

        $isBackward = self::isBackwardTransition($from, $to);
        $cleanReason = trim($note ?? $reason ?? '');

        if ($isBackward && $cleanReason === '') {
            throw new InvalidArgumentException('Alasan perubahan wajib diisi jika status dimundurkan.');
        }

        // Validasi prasyarat (hanya diperiksa saat status maju)
        if (! $isBackward) {
            if ($to === VoyageStatus::InternalReview->value) {
                $this->refreshChecklistCompletion($voyage);
            }

            if ($to === VoyageStatus::AwaitingExternalApproval->value) {
                if (! $voyage->approvals()
                    ->where('approval_scope', 'internal')
                    ->where('approval_status', ApprovalStatus::Approved->value)
                    ->exists()) {
                    throw new InvalidArgumentException('Persetujuan internal (supervisor) wajib diberikan sebelum maju ke tahap menunggu persetujuan eksternal.');
                }
                $this->refreshChecklistCompletion($voyage);
                $unmet = $voyage->checklists()
                    ->where('applicability', ChecklistApplicability::Wajib->value)
                    ->where('completion_status', '!=', ChecklistCompletion::Terpenuhi->value)
                    ->count();
                if ($unmet > 0) {
                    throw new InvalidArgumentException("Masih ada {$unmet} item checklist wajib belum terpenuhi.");
                }
            }

            if ($to === VoyageStatus::ReadyForDeparture->value) {
                // Gate awak kapal (materi CREWING: TABLE CREW 11 jabatan) —
                // berlaku utk tugboat (TB/Tata) & KM Prince Soya (yang punya
                // komposisi wajib di materi); tongkang & kapal lain dikecualikan.
                // warning + override dengan alasan (tercatat di voyage_events).
                $vesselForGate = $voyage->vessel;
                if ($vesselForGate
                    && ($vesselForGate->vessel_type === 'tugboat' || $vesselForGate->vessel_name === 'KM Prince Soya')) {
                    $readiness = app(\App\Services\CrewComplianceService::class)->forVessel($vesselForGate);
                    if (! $readiness['ok']) {
                        $missing = implode(', ', array_map(fn ($m) => $m['label'].' ×'.$m['need'], $readiness['missing']));
                        if ($cleanReason === '') {
                            throw new InvalidArgumentException(
                                "Kesiapan awak kapal belum lengkap ({$readiness['percent']}% — kurang: {$missing}). ".
                                'Isi alasan override pada perubahan status untuk melanjutkan.'
                            );
                        }
                        $this->recordEvent(
                            $voyage,
                            VoyageEventType::StatusChanged,
                            "Override kesiapan awak kapal ({$readiness['percent']}%): {$cleanReason} — belum lengkap: {$missing}"
                        );
                    }
                }
                if ($voyage->external_approval_status === 'menunggu') {
                    throw new InvalidArgumentException('Persetujuan eksternal berstatus menunggu - wajib dikonfirmasi dengan lampiran bukti terlebih dahulu.');
                }
                if ($voyage->external_approval_status === 'terkonfirmasi' && ! $voyage->external_approval_evidence) {
                    throw new InvalidArgumentException('Persetujuan eksternal menuntut bukti/berkas lampiran yang sah.');
                }
                if (! $voyage->approvals()
                    ->where('approval_scope', 'internal')
                    ->where('approval_status', ApprovalStatus::Approved->value)
                    ->exists()) {
                    throw new InvalidArgumentException('Persetujuan internal wajib ada sebelum status Siap Berangkat.');
                }
            }

            if ($to === VoyageStatus::Completed->value) {
                // Bukti kelompok F (laporan tiba/penutupan) harus lengkap
                $missingClosure = $voyage->checklists()->with('requirement')->get()
                    ->filter(fn ($c) => $c->requirement?->group_code === 'F'
                        && $c->applicability === ChecklistApplicability::Wajib->value
                        && $c->completion_status !== ChecklistCompletion::Terpenuhi->value);
                if ($missingClosure->isNotEmpty()) {
                    throw new InvalidArgumentException('Penutupan perjalanan menuntut bukti kelompok F (laporan berangkat/tiba/penutupan) yang lengkap.');
                }
            }
        }

        $updates = ['voyage_status' => $to];
        $now = now();
        match ($to) {
            VoyageStatus::Departed->value => $updates['actual_departure'] = $voyage->actual_departure ?? $now,
            VoyageStatus::Arrived->value => $updates['actual_arrival'] = $voyage->actual_arrival ?? $now,
            default => null,
        };

        $voyage->update($updates);

        $eventType = match (true) {
            $to === VoyageStatus::Arrived->value => VoyageEventType::Arrived,
            $to === VoyageStatus::Departed->value => VoyageEventType::Departed,
            $to === VoyageStatus::Completed->value => VoyageEventType::Closed,
            $to === VoyageStatus::Cancelled->value => VoyageEventType::Cancelled,
            $to === VoyageStatus::Delayed->value => VoyageEventType::Delayed,
            default => VoyageEventType::StatusChanged,
        };

        $fromLabel = self::statusLabel($from);
        $toLabel = self::statusLabel($to);
        $actionDesc = $isBackward ? 'Status dimundurkan' : 'Perubahan status';
        $description = "{$actionDesc}: {$fromLabel} ke {$toLabel}";
        if ($cleanReason !== '') {
            $description .= " (Alasan: {$cleanReason})";
        }

        $this->recordEvent(
            $voyage,
            $eventType,
            $description,
            [
                'from' => $from,
                'to' => $to,
                'from_label' => $fromLabel,
                'to_label' => $toLabel,
                'is_backward' => $isBackward,
                'reason' => $cleanReason !== '' ? $cleanReason : null,
                'user_name' => auth()->user()?->name ?? 'Sistem',
            ],
        );

        if (in_array($to, [VoyageStatus::InTransit->value, VoyageStatus::Arrived->value], true)) {
            $missingArrivalDocs = $voyage->checklists()->with('requirement')->get()
                ->filter(fn ($c) => $c->requirement?->code === 'F_LAPORAN_TIBA'
                    && $c->completion_status !== ChecklistCompletion::Terpenuhi->value);
            if ($missingArrivalDocs->isNotEmpty()) {
                $this->notifyRoles(['ship_ops', 'super_admin'], NotificationType::ArrivalReportMissing, 'Laporan kedatangan belum diisi', "Perjalanan {$voyage->voyage_code} membutuhkan laporan kedatangan.", 'voyage', $voyage->id);
            }
        }
    }

    /** Persetujuan internal supervisor. */
    public function approveInternal(Voyage $voyage, string $status, ?string $comment, ?string $reason = null): Approval
    {
        $approval = Approval::create([
            'approvable_type' => 'voyage',
            'approvable_id' => $voyage->id,
            'approver_id' => auth()->id(),
            'approval_scope' => 'internal',
            'approval_status' => $status,
            'comments' => $comment,
            'decision_timestamp' => now(),
        ]);

        AuditService::log(
            $status === ApprovalStatus::Approved->value ? 'internal_approved' : $status,
            'voyage',
            $voyage->id,
            null,
            ['approval' => $status],
            'Persetujuan internal perjalanan '.$voyage->voyage_code,
            $reason ?? $comment,
            'voyage',
            $voyage->id,
        );

        $this->recordEvent(
            $voyage,
            $status === ApprovalStatus::Approved->value ? VoyageEventType::InternalApproved : VoyageEventType::Revision,
            'Persetujuan internal: '.$status.($comment ? " — {$comment}" : ''),
        );

        if ($status !== ApprovalStatus::Approved->value) {
            $this->notifyRoles(['ship_ops', 'doc_controller', 'super_admin'], NotificationType::VoyageIncomplete, 'Perjalanan perlu tindakan', "Perjalanan {$voyage->voyage_code}: {$comment}", 'voyage', $voyage->id);
        }

        return $approval;
    }

    /** Catat persetujuan eksternal — hanya dengan bukti lampiran sah. */
    public function confirmExternalApproval(Voyage $voyage, ?UploadedFile $evidence, string $sourceNote): void
    {
        if (! $evidence) {
            throw new InvalidArgumentException('Konfirmasi persetujuan eksternal wajib melampirkan bukti (berkas/sumber sah).');
        }

        $path = $evidence->store('documents/external-approvals', 'local');

        $voyage->update([
            'external_approval_status' => 'terkonfirmasi',
            'external_approval_evidence' => $path,
        ]);

        Approval::create([
            'approvable_type' => 'voyage',
            'approvable_id' => $voyage->id,
            'approver_id' => auth()->id(),
            'approval_scope' => 'external',
            'approval_status' => ApprovalStatus::Approved->value,
            'comments' => $sourceNote,
            'decision_timestamp' => now(),
            'evidence_file' => $path,
        ]);

        AuditService::log('external_approved', 'voyage', $voyage->id, null, ['evidence' => basename($path)], 'Persetujuan eksternal dicatat dengan bukti', $sourceNote, 'voyage', $voyage->id);

        $this->recordEvent($voyage, VoyageEventType::ExternalApproved, 'Persetujuan eksternal dicatat: '.$sourceNote);
    }

    public function recordEvent(Voyage $voyage, VoyageEventType $type, string $description, ?array $payload = null): VoyageEvent
    {
        return VoyageEvent::create([
            'voyage_id' => $voyage->id,
            'event_type' => $type->value,
            'occurred_at' => now(),
            'user_id' => auth()->id(),
            'source' => auth()->check() ? 'user' : 'system',
            'description' => $description,
            'payload' => $payload,
        ]);
    }

    private function notifyRoles(array $roleSlugs, NotificationType $type, string $title, string $message, string $refType, int $refId): void
    {
        $users = Role::whereIn('slug', $roleSlugs)->with('users')->get()->flatMap->users->unique('id');
        foreach ($users as $user) {
            Notification::create([
                'recipient_id' => $user->id,
                'notification_type' => $type->value,
                'title' => $title,
                'message' => $message,
                'reference_type' => $refType,
                'reference_id' => $refId,
                'read_status' => false,
                'created_at' => now(),
            ]);
        }
    }
}
