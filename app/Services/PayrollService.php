<?php

namespace App\Services;

use App\Models\Crew;
use App\Models\OfficeEmployee;
use App\Models\PayrollEntry;
use App\Models\PayrollPeriod;
use Illuminate\Support\Facades\DB;

/**
 * Payroll bulanan + PPh 21 tarif progresif UU HPP (implementasi sederhana).
 */
class PayrollService
{
    public const PTKP_BULANAN = 4_500_000; // 54 jt/tahun (TK/0)

    public function pph21(float $brutoBulanan, float $bpjsBulanan = 0): float
    {
        $tahunan = ($brutoBulanan - $bpjsBulanan) * 12;
        $pkp = max(0, $tahunan - (self::PTKP_BULANAN * 12));
        $pkp = floor($pkp / 1000) * 1000; // pembulatan ribuan

        $tax = 0.0;
        $brackets = [
            [60_000_000, 0.05],
            [250_000_000, 0.15],
            [500_000_000, 0.25],
            [5_000_000_000, 0.30],
            [PHP_INT_MAX, 0.35],
        ];

        $prev = 0;
        foreach ($brackets as [$limit, $rate]) {
            if ($pkp <= $prev) {
                break;
            }
            $slice = min($pkp, $limit) - $prev;
            $tax += $slice * $rate;
            $prev = $limit;
        }

        return round($tax / 12);
    }

    /** Isi entri payroll draft dari ABK aktif + karyawan aktif. */
    public function generate(PayrollPeriod $period): int
    {
        $period->entries()->delete();
        $count = 0;

        Crew::where('status', 'aktif')->get()->each(function (Crew $crew) use ($period, &$count) {
            $bruto = (float) $crew->base_salary;
            $bpjs = round($bruto * 0.02);
            $pph = $this->pph21($bruto, $bpjs);

            PayrollEntry::create([
                'period_id' => $period->id,
                'person_type' => 'abk',
                'crew_id' => $crew->id,
                'person_name' => $crew->name,
                'gaji_pokok' => $bruto,
                'bpjs' => $bpjs,
                'pph21' => $pph,
                'total' => $bruto - $bpjs - $pph,
                'status' => 'draft',
            ]);
            $count++;
        });

        OfficeEmployee::where('status', 'aktif')->get()->each(function (OfficeEmployee $emp) use ($period, &$count) {
            $bruto = (float) $emp->base_salary + (float) $emp->allowances;
            $bpjs = round((float) $emp->base_salary * 0.02);
            $pph = $this->pph21($bruto, $bpjs);

            PayrollEntry::create([
                'period_id' => $period->id,
                'person_type' => 'karyawan',
                'employee_id' => $emp->id,
                'person_name' => $emp->name,
                'gaji_pokok' => $emp->base_salary,
                'tunjangan' => $emp->allowances,
                'bpjs' => $bpjs,
                'pph21' => $pph,
                'total' => $bruto - $bpjs - $pph,
                'status' => 'draft',
            ]);
            $count++;
        });

        return $count;
    }

    /** Posting payroll: jurnal beban gaji + PPh 21 ditahan + kas berkurang. */
    public function post(PayrollPeriod $period, string $cashAccountCode = '1003'): void
    {
        DB::transaction(function () use ($period, $cashAccountCode) {
            $gross = (float) $period->entries()->sum('gaji_pokok') + (float) $period->entries()->sum('tunjangan') + (float) $period->entries()->sum('borongan_insentif');
            $bpjs = (float) $period->entries()->sum('bpjs');
            $pph = (float) $period->entries()->sum('pph21');
            $netto = (float) $period->entries()->sum('total');

            app(JournalService::class)->post(
                [
                    ['account' => '5200', 'debit' => $gross],
                    ['account' => '2100', 'credit' => $bpjs],          // BPJS pemberi kerja disederhanakan ke hutang
                    ['account' => '2101', 'credit' => $pph],           // PPh 21 ditahan → hutang pajak
                    ['account' => $cashAccountCode, 'credit' => $netto],
                ],
                "Gaji & upah {$period->year_month} (payroll)",
                'payroll',
                $period->id,
                now()->toDateString(),
            );

            $period->update([
                'status' => 'posted',
                'posted_at' => now(),
                'posted_by' => auth()->id(),
            ]);
            $period->entries()->update(['status' => 'posted', 'paid_at' => now()->toDateString()]);

            if ($pph > 0) {
                \App\Models\WithholdingTax::create([
                    'type' => 'pph21',
                    'period' => $period->year_month,
                    'date' => now()->toDateString(),
                    'base_amount' => $gross,
                    'rate' => $pph > 0 ? round($pph / max($gross, 1) * 100, 2) : 0,
                    'tax_amount' => $pph,
                    'counterparty' => 'Karyawan & ABK — '.$period->year_month,
                    'ref_type' => 'payroll',
                    'ref_id' => $period->id,
                    'status' => 'tercatat',
                ]);
            }
        });
    }
}
