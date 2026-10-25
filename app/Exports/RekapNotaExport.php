<?php

namespace App\Exports;

use App\Models\Bill;
use App\Models\Supplier;
use Maatwebsite\Excel\Concerns\Export;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

/**
 * Rekap Nota - format Excel klien (per toko/periode).
 */
class RekapNotaExport implements Export, FromCollection, WithHeadings, WithMapping, WithStyles, ShouldAutoSize
{
    public function __construct(private string $from, private string $to) {}

    public function headings(): array
    {
        return ['No', 'Toko', 'Ref PO / Kode', 'Tanggal Nota', 'Jumlah (Rp)', 'Rencana Bayar', 'Status'];
    }

    public function collection(): \Illuminate\Support\Enumerable
    {
        return Bill::with('supplier')
            ->whereBetween('issue_date', [$this->from, $this->to])
            ->orderBy('supplier_id')
            ->orderBy('issue_date')
            ->get();
    }

    public function map($bill): array
    {
        $po = $bill->po_id ? \App\Models\PurchaseOrder::find($bill->po_id) : null;

        return [
            $bill->id,
            $bill->supplier?->name ?? '-',
            $po?->po_number ?? ($bill->voyage_id ? 'VYG' : '-'),
            $bill->issue_date?->format('d/m/Y'),
            (float) $bill->total,
            $bill->due_date?->format('d/m/Y'),
            strtoupper($bill->status === 'paid' ? 'LUNAS' : 'BELUM'),
        ];
    }

    public function styles(Worksheet $sheet): array
    {
        return [
            1 => ['font' => ['bold' => true], 'fill' => ['fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID, 'startColor' => ['rgb' => 'F0F0F0']]],
        ];
    }
}
