<?php

namespace App\Exports;

use App\Models\Bill;
use App\Models\PaymentSchedule;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

/**
 * Rencana Pembayaran Outstanding — kolom persis Excel OUTSTANDING:
 * No | Toko | Nomor Cek/BG | Jumlah | Rencana pembayaran
 */
class OutstandingExport implements FromCollection, WithHeadings, WithMapping, WithStyles, ShouldAutoSize
{
    public function collection()
    {
        return PaymentSchedule::where('status', '!=', 'lunas')
            ->orderBy('due_date')
            ->get()
            ->map(function (PaymentSchedule $s) {
                $bill = $s->ref_type === 'bill' && $s->ref_id ? Bill::find($s->ref_id) : null;
                $cheque = $bill?->payments()->orderByDesc('id')->value('cheque_number');

                return (object) [
                    'description' => $s->description,
                    'toko' => $bill?->supplier?->name ?? '-',
                    'cheque' => $cheque ?? '-',
                    'amount' => (float) $s->amount,
                    'due' => $s->due_date?->format('d/m/Y'),
                    'status' => $s->status,
                ];
            });
    }

    public function headings(): array
    {
        return ['No', 'Toko', 'Nomor Cek/BG', 'Jumlah', 'Rencana Pembayaran'];
    }

    public function map($row): array
    {
        static $i = 0;
        $i++;

        return [$i, $row->toko, $row->cheque, $row->amount, $row->due];
    }

    public function styles(Worksheet $sheet): array
    {
        return [
            1 => ['font' => ['bold' => true], 'fill' => ['fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID, 'startColor' => ['rgb' => 'F0F0F0']]],
        ];
    }
}
