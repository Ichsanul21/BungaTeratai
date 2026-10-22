<?php

namespace App\Exports;

use App\Models\Document;
use Carbon\Carbon;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMultipleSheets;
use Maatwebsite\Excel\Concerns\WithTitle;

/**
 * Monthly Document Expiry & Endorsement Report (replika Master Tracker).
 */
class MonthlyReportExport implements WithMultipleSheets, ShouldAutoSize
{
    public function __construct(private string $period) {} // YYYY-MM

    public function sheets(): array
    {
        return [
            new MonthlyReportSheet('Monthly Document Expiry Report', 'expiry', $this->period),
            new MonthlyReportSheet('Monthly Report Endorsement', 'endorsement', $this->period),
        ];
    }
}

class MonthlyReportSheet implements FromCollection, WithHeadings, WithTitle, ShouldAutoSize
{
    public function __construct(private string $title, private string $kind, private string $period) {}

    public function title(): string
    {
        return $this->title;
    }

    public function headings(): array
    {
        return ['Nama Kapal', 'Document', 'Due Date', 'Status', 'Keterangan'];
    }

    public function collection()
    {
        $periodStart = Carbon::parse($this->period.'-01');
        $periodEnd = $periodStart->copy()->endOfMonth();

        $docs = Document::with('owner')
            ->where('is_archived', false)
            ->where(function ($q) use ($periodStart, $periodEnd) {
                if ($this->kind === 'expiry') {
                    $q->where('has_expiry', true)
                        ->whereNotNull('expiry_date')
                        ->whereBetween('expiry_date', [$periodStart->toDateString(), $periodEnd->toDateString()]);
                } else {
                    $q->where('has_endorsement', true)
                        ->whereNotNull('endorsement_next_date')
                        ->whereBetween('endorsement_next_date', [$periodStart->toDateString(), $periodEnd->toDateString()]);
                }
            })
            ->get();

        return $docs->map(function (Document $doc) {
            $due = $this->kind === 'expiry' ? $doc->expiry_date : $doc->endorsement_next_date;
            $days = (int) now()->startOfDay()->diffInDays($due, false);
            $status = $days < 0 ? 'Jatuh Tempo' : ($days <= 14 ? 'Mendekati' : 'Terjadwal');

            return [
                $doc->owner_type === 'vessel'
                    ? ($doc->ownerName() ?? '-')
                    : $doc->ownerName(),
                ($doc->requirement_code ? $doc->requirement_code.' | ' : '').$doc->document_name,
                $due?->format('d/m/Y'),
                $status,
                $this->kind === 'expiry'
                    ? ($days < 0 ? 'EXPIRED '.abs($days).' hari' : 'sisa '.$days.' hari')
                    : ($days < 0 ? 'ENDORSEMENT JATUH TEMPO '.abs($days).' hari' : 'endorsement sisa '.$days.' hari'),
            ];
        })->values();
    }
}
