<?php

namespace App\Services;

use App\Enums\NotificationType;
use App\Models\CrewCertificate;
use App\Models\Document;
use App\Models\Notification;
use App\Models\Role;
use App\Models\Setting;
use Illuminate\Support\Collection;

/**
 * Reminder dokumen - hanya untuk yang punya masa berlaku (tanpa tanggal fiktif).
 * Jadwal default 30/14/7/0 hari, diubah admin via Settings -> reminder_days.
 */
class ReminderService
{
    /** @return int[] */
    public function reminderDays(): array
    {
        $raw = Setting::where('key', 'reminder_days')->value('value') ?? '30,14,7,0';
        $days = array_values(array_filter(array_map('intval', explode(',', $raw)), fn ($d) => $d >= 0));
        rsort($days);

        return $days ?: [0];
    }

    public function validity(?string $expiryDate, bool $hasExpiry, ?int $thresholdDays = null): string
    {
        if (! $hasExpiry || ! $expiryDate) {
            return 'no_expiry';
        }
        $days = now()->startOfDay()->diffInDays(\Carbon\Carbon::parse($expiryDate), false);
        if ($days < 0) {
            return 'expired';
        }
        $threshold = $thresholdDays ?? max($this->reminderDays());
        if ($days <= $threshold) {
            return 'expiring_soon';
        }

        return 'normal';
    }

    public function daysUntil(?string $expiryDate): ?int
    {
        if (! $expiryDate) {
            return null;
        }

        return (int) now()->startOfDay()->diffInDays(\Carbon\Carbon::parse($expiryDate), false);
    }

    /**
     * Sinkronkan notifikasi reminder dari seluruh sumber dokumen
     * (dokumen perusahaan + kapal + sertifikat ABK).
     *
     * @return int jumlah notifikasi baru
     */
    public function sync(): int
    {
        $created = 0;
        $recipients = $this->recipients();

        foreach ($this->dueDocuments() as $item) {
            foreach ($recipients as $userId) {
                if ($this->notificationExists($userId, $item['type'], $item['refType'], $item['refId'])) {
                    continue;
                }
                Notification::create([
                    'recipient_id' => $userId,
                    'notification_type' => $item['type'],
                    'title' => $item['title'],
                    'message' => $item['message'],
                    'reference_type' => $item['refType'],
                    'reference_id' => $item['refId'],
                    'read_status' => false,
                    'created_at' => now(),
                ]);
                $created++;
            }
        }

        // Reminder ENDORSEMENT (terpisah dari expiry) - dokumen ber-endorsement
        foreach ($this->dueEndorsements() as $item) {
            foreach ($recipients as $userId) {
                if ($this->notificationExists($userId, $item['type'], $item['refType'], $item['refId'])) {
                    continue;
                }
                Notification::create([
                    'recipient_id' => $userId,
                    'notification_type' => $item['type'],
                    'title' => $item['title'],
                    'message' => $item['message'],
                    'reference_type' => $item['refType'],
                    'reference_id' => $item['refId'],
                    'read_status' => false,
                    'created_at' => now(),
                ]);
                $created++;
            }
        }

        // Reminder INVOICE & BILL (2 minggu sebelum jatuh tempo)
        foreach ($this->dueInvoicesAndBills() as $item) {
            foreach ($recipients as $userId) {
                if ($this->notificationExists($userId, $item['type'], $item['refType'], $item['refId'])) {
                    continue;
                }
                Notification::create([
                    'recipient_id' => $userId,
                    'notification_type' => $item['type'],
                    'title' => $item['title'],
                    'message' => $item['message'],
                    'reference_type' => $item['refType'],
                    'reference_id' => $item['refId'],
                    'read_status' => false,
                    'created_at' => now(),
                ]);
                $created++;
            }
        }

        return $created;
    }

    /** @return Collection<int, array> Dokumen dgn endorsement jatuh tempo (Surat Laut & Klasifikasi). */
    public function dueEndorsements(): Collection
    {
        $items = collect();
        $thresholds = $this->reminderDays();
        $maxThreshold = max($thresholds);

        Document::query()
            ->where('has_endorsement', true)
            ->whereNotNull('endorsement_next_date')
            ->where('is_archived', false)
            ->get()
            ->each(function (Document $doc) use (&$items, $thresholds, $maxThreshold) {
                $days = $this->daysUntil($doc->endorsement_next_date?->toDateString());
                $hit = $days < 0 ? 0 : collect($thresholds)->first(fn ($t) => $days <= $t, null);
                if ($hit === null && $days > $maxThreshold) {
                    return;
                }
                $expired = $days < 0;
                $items->push([
                    'type' => $expired
                        ? NotificationType::EndorsementExpired->value
                        : NotificationType::EndorsementDue->value,
                    'refType' => 'document',
                    'refId' => $doc->id,
                    'title' => $expired ? 'Endorsement dokumen sudah jatuh tempo' : 'Endorsement dokumen mendekati jatuh tempo',
                    'message' => "\"{$doc->document_name}\" - endorsement ".(
                        $expired ? 'jatuh tempo '.abs($days).' hari lalu' : "lagi {$days} hari"
                    ).'.',
                    'days' => $days,
                    'expiry' => $doc->endorsement_next_date?->toDateString(),
                ]);
            });

        return $items->sortBy('days')->values();
    }

    /** @return Collection<int, array> */
    public function dueDocuments(): Collection
    {
        $items = collect();
        $thresholds = $this->reminderDays();
        $maxThreshold = max($thresholds);

        Document::query()
            ->where('has_expiry', true)
            ->whereNotNull('expiry_date')
            ->where('is_archived', false)
            ->with('category')
            ->get()
            ->each(function (Document $doc) use (&$items, $thresholds, $maxThreshold) {
                $days = $this->daysUntil($doc->expiry_date?->toDateString());
                $hit = $days < 0 ? 0 : collect($thresholds)->first(fn ($t) => $days <= $t, null);
                if ($hit === null && $days > $maxThreshold) {
                    return;
                }
                $expired = $days < 0;
                $items->push([
                    'type' => $expired
                        ? NotificationType::DocExpired->value
                        : NotificationType::DocExpiring->value,
                    'refType' => 'document',
                    'refId' => $doc->id,
                    'title' => $expired ? 'Dokumen kedaluwarsa' : 'Dokumen mendekati kedaluwarsa',
                    'message' => $expired
                        ? "\"{$doc->document_name}\" kedaluwarsa ".abs($days).' hari lalu.'
                        : "\"{$doc->document_name}\" berlaku lagi {$days} hari.",
                    'days' => $days,
                    'expiry' => $doc->expiry_date?->toDateString(),
                ]);
            });

        CrewCertificate::query()
            ->where('has_expiry', true)
            ->whereNotNull('expiry_date')
            ->with('crew')
            ->get()
            ->each(function (CrewCertificate $cert) use (&$items, $thresholds, $maxThreshold) {
                $days = $this->daysUntil($cert->expiry_date?->toDateString());
                $hit = $days < 0 ? 0 : collect($thresholds)->first(fn ($t) => $days <= $t, null);
                if ($hit === null && $days > $maxThreshold) {
                    return;
                }
                $expired = $days < 0;
                $items->push([
                    'type' => $expired
                        ? NotificationType::DocExpired->value
                        : NotificationType::DocExpiring->value,
                    'refType' => 'crew_certificate',
                    'refId' => $cert->id,
                    'title' => $expired
                        ? 'Sertifikat ABK kedaluwarsa'
                        : 'Sertifikat ABK mendekati kedaluwarsa',
                    'message' => ($cert->crew?->name ?? 'ABK')." - {$cert->cert_type}: ".(
                        $expired ? 'kedaluwarsa '.abs($days).' hari lalu' : "berlaku lagi {$days} hari"
                    ).'.',
                    'days' => $days,
                    'expiry' => $cert->expiry_date?->toDateString(),
                ]);
            });

        return $items->sortBy('days')->values();
    }

    /** @return Collection<int, array> Invoice dan tagihan mendekati jatuh tempo (2 minggu / 14 hari). */
    public function dueInvoicesAndBills(): Collection
    {
        $items = collect();
        $thresholds = $this->reminderDays();
        $maxThreshold = max($thresholds);

        \App\Models\Invoice::whereIn('status', ['unpaid', 'partial'])
            ->whereNotNull('due_date')
            ->get()
            ->each(function (\App\Models\Invoice $inv) use (&$items, $thresholds, $maxThreshold) {
                $days = $this->daysUntil($inv->due_date?->toDateString());
                $hit = $days < 0 ? 0 : collect($thresholds)->first(fn ($t) => $days <= $t, null);
                if ($hit === null && $days > $maxThreshold) {
                    return;
                }
                $expired = $days < 0;
                $items->push([
                    'type' => NotificationType::InvoiceDue->value,
                    'refType' => 'invoice',
                    'refId' => $inv->id,
                    'title' => $expired ? 'Invoice telah jatuh tempo' : 'Invoice mendekati jatuh tempo (2 minggu)',
                    'message' => "Invoice {$inv->number} " . ($expired ? "lewat tempo " . abs($days) . " hari" : "jatuh tempo {$days} hari lagi") . " (Sisa: Rp " . number_format($inv->total - $inv->paid_amount, 0, ',', '.') . ").",
                    'days' => $days,
                    'expiry' => $inv->due_date?->toDateString(),
                ]);
            });

        \App\Models\Bill::whereIn('status', ['unpaid', 'partial'])
            ->whereNotNull('due_date')
            ->get()
            ->each(function (\App\Models\Bill $bill) use (&$items, $thresholds, $maxThreshold) {
                $days = $this->daysUntil($bill->due_date?->toDateString());
                $hit = $days < 0 ? 0 : collect($thresholds)->first(fn ($t) => $days <= $t, null);
                if ($hit === null && $days > $maxThreshold) {
                    return;
                }
                $expired = $days < 0;
                $items->push([
                    'type' => NotificationType::BillDue->value,
                    'refType' => 'bill',
                    'refId' => $bill->id,
                    'title' => $expired ? 'Tagihan/Bill telah jatuh tempo' : 'Tagihan mendekati jatuh tempo (2 minggu)',
                    'message' => "Bill {$bill->number} " . ($expired ? "lewat tempo " . abs($days) . " hari" : "jatuh tempo {$days} hari lagi") . " (Sisa: Rp " . number_format($bill->total - $bill->paid_amount, 0, ',', '.') . ").",
                    'days' => $days,
                    'expiry' => $bill->due_date?->toDateString(),
                ]);
            });

        return $items->sortBy('days')->values();
    }

    private function recipients(): array
    {
        return Role::whereIn('slug', ['super_admin', 'doc_controller', 'finance', 'management'])
            ->with('users')
            ->get()
            ->flatMap->users
            ->pluck('id')
            ->unique()
            ->values()
            ->all();
    }

    private function notificationExists(int $recipientId, string $type, string $refType, int $refId): bool
    {
        return Notification::where('recipient_id', $recipientId)
            ->where('notification_type', $type)
            ->where('reference_type', $refType)
            ->where('reference_id', $refId)
            ->where('read_status', false)
            ->exists();
    }
}
