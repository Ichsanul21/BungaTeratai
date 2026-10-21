<?php

namespace App\Services;

use App\Models\Account;
use App\Models\JournalEntry;
use App\Models\JournalLine;
use InvalidArgumentException;

/**
 * SATU-SATUNYA pintu jurnal double-entry.
 * Setiap baris: [account_code, debit, credit].
 */
class JournalService
{
    /**
     * @param  array<int, array{account:string, debit?:float, credit?:float}>  $lines
     */
    public function post(array $lines, string $memo, ?string $sourceType = null, ?int $sourceId = null, ?string $date = null): JournalEntry
    {
        $debit = 0.0;
        $credit = 0.0;
        $resolved = [];

        foreach ($lines as $line) {
            $account = Account::where('code', $line['account'])->firstOrFail();
            $d = (float) ($line['debit'] ?? 0);
            $c = (float) ($line['credit'] ?? 0);
            $debit += $d;
            $credit += $c;
            $resolved[] = ['account_id' => $account->id, 'debit' => $d, 'credit' => $c];
        }

        if (abs($debit - $credit) > 0.01) {
            throw new InvalidArgumentException("Jurnal tidak seimbang: debit {$debit} vs kredit {$credit}.");
        }

        $entry = JournalEntry::create([
            'entry_date' => $date ?? now()->toDateString(),
            'memo' => $memo,
            'source_type' => $sourceType,
            'source_id' => $sourceId,
            'posted_by' => auth()->id(),
        ]);

        foreach ($resolved as $line) {
            JournalLine::create(['entry_id' => $entry->id, ...$line]);
        }

        return $entry;
    }

    /** Saldo berjalan sebuah akun (debit − kredit) dari awal sampai tanggal. */
    public function balance(string $accountCode, ?string $untilDate = null): float
    {
        $account = Account::where('code', $accountCode)->first();
        if (! $account) {
            return 0.0;
        }

        $q = JournalLine::where('account_id', $account->id)
            ->whereHas('entry', fn ($e) => $untilDate
                ? $e->whereDate('entry_date', '<=', $untilDate)
                : fn ($qq) => $qq);

        $debit = (clone $q)->sum('debit');
        $credit = (clone $q)->sum('credit');

        // Akun normal kredit (liability/equity/revenue) ditampilkan sebagai kredit − debit
        if ($account->normal_balance === 'credit') {
            return (float) ($credit - $debit);
        }

        return (float) ($debit - $credit);
    }

    public function accountBalance(int $accountId, ?string $untilDate = null): float
    {
        $account = Account::findOrFail($accountId);

        $lines = JournalLine::where('account_id', $accountId)
            ->whereHas('entry', function ($e) use ($untilDate) {
                if ($untilDate) {
                    $e->whereDate('entry_date', '<=', $untilDate);
                }
            });

        $debit = (clone $lines)->sum('debit');
        $credit = (clone $lines)->sum('credit');

        return $account->normal_balance === 'credit'
            ? (float) ($credit - $debit)
            : (float) ($debit - $credit);
    }
}
