<?php

namespace App\Exports;

use App\Models\Vessel;
use Maatwebsite\Excel\Concerns\Export;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMultipleSheets;
use Maatwebsite\Excel\Concerns\WithTitle;

class MasterTrackerExport implements Export, WithMultipleSheets, ShouldAutoSize
{
    public function sheets(): array
    {
        return [
            new MasterTrackerSheet('TugBoat', 'tugboat'),
            new MasterTrackerSheet('Barge', 'tongkang'),
        ];
    }
}

class MasterTrackerSheet implements Export, FromCollection, WithHeadings, WithTitle, ShouldAutoSize
{
    public function __construct(private string $title, private string $type) {}

    public function title(): string
    {
        return $this->title;
    }

    public function headings(): array
    {
        return [
            $this->type === 'tugboat' ? 'Nama Kapal (TugBoat)' : 'Nama Barge',
            'Document Name',
            'Expired Date',
            'Days Remaining',
            'Status',
            'Followed Up',
            'Last Endorsement',
            'Next Endorsement',
            'Days Remaining Endorsement',
            'Endorsement Status',
        ];
    }

    public function collection(): \Illuminate\Support\Enumerable
    {
        $vessels = Vessel::where('vessel_type', $this->type)
            ->orderBy('vessel_name')
            ->with('documents')
            ->get();

        $rows = collect();
        foreach ($vessels as $vessel) {
            foreach ($vessel->documents as $doc) {
                $daysLeft = null;
                $validity = 'Tanpa masa berlaku';
                if ($doc->has_expiry && $doc->expiry_date) {
                    $daysLeft = (int) now()->startOfDay()->diffInDays($doc->expiry_date, false);
                    $validity = $daysLeft < 0 ? 'EXPIRED' : ($daysLeft <= 30 ? 'MENDEKATI' : 'NORMAL');
                } elseif (! $doc->has_expiry) {
                    $validity = 'Permanent';
                }

                $endNext = $doc->endorsement_next_date;
                $endDays = $endNext ? (int) now()->startOfDay()->diffInDays($endNext, false) : null;
                $endStatus = '-';
                if ($endNext) {
                    $endStatus = $endDays < 0 ? 'ENDORSEMENT JATUH TEMPO' : ($endDays <= 30 ? 'ENDORSEMENT MENDEKATI' : 'ENDORSEMENT OK');
                }

                $rows->push([
                    ($this->type === 'tugboat' ? $vessel->vessel_name : $vessel->vessel_name).' | GT '.$vessel->gt,
                    ($doc->requirement_code ? $doc->requirement_code.' | ' : '').$doc->document_name,
                    $doc->expiry_date?->format('d/m/Y') ?? ($doc->has_expiry ? '' : 'Permanent'),
                    $daysLeft ?? 0,
                    $validity,
                    $doc->verification_status === 'verified' ? 'Ya' : 'Belum',
                    $doc->endorsement_last_date?->format('d/m/Y') ?? ($doc->has_endorsement ? '' : '-'),
                    $endNext?->format('d/m/Y') ?? '-',
                    $endDays ?? 0,
                    $endStatus,
                ]);
            }
        }

        return $rows;
    }
}
