<?php

namespace App\Services;

use App\Models\DocumentTemplate;
use Illuminate\Support\Facades\DB;

/**
 * Penerbitan & penomoran nomor terbit / nomor arsip.
 * Counter per template, atomis (row lock via update atomik).
 */
class NumberingService
{
    /**
     * @param  string  $kind  'terbit' | 'arsip'
     * @return array{number: string, template: DocumentTemplate}
     */
    public function next(string $templateCode, array $replacements = [], string $kind = 'terbit'): array
    {
        $template = DocumentTemplate::where('code', $templateCode)->firstOrFail();

        // Naikkan counter atomis
        $column = $kind === 'arsip' ? 'archive_seq_last' : 'seq_last';
        DocumentTemplate::whereKey($template->id)->update([
            $column => DB::raw("{$column} + 1"),
        ]);
        $template->refresh();

        $seq = $kind === 'arsip' ? $template->archive_seq_last : $template->seq_last;
        $pattern = $kind === 'arsip'
            ? ($template->archive_pattern ?? 'ARS/{kode}/{tahun}/{seq}')
            : ($template->numbering_pattern ?? '{seq}');

        $romanMonths = [1 => 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
        $now = now();

        $number = strtr($pattern, [
            '{seq}' => $this->pad($seq),
            '{seq_raw}' => (string) $seq,
            '{seq4}' => str_pad((string) $seq, 4, '0', STR_PAD_LEFT),
            '{tahun}' => (string) $now->year,
            '{tahun2}' => $now->format('y'),
            '{bulan}' => $now->format('m'),
            '{bulan_romawi}' => $romanMonths[(int) $now->format('n')],
            '{kode}' => $template->code,
            '{ddmmyyyy}' => $now->format('dmY'),
            ...$replacements,
        ]);

        return ['number' => $number, 'template' => $template];
    }

    private function pad(int $seq): string
    {
        return $seq >= 1000 ? (string) $seq : str_pad((string) $seq, 3, '0', STR_PAD_LEFT);
    }
}
