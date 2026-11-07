<?php

namespace App\Services\Dev;

use Illuminate\Support\Facades\DB;

/**
 * Konsol SQL READ-ONLY untuk panel Developer.
 *
 * Bukan pengganti CLI: hanya SELECT/WITH, satu statement, maksimal 200 baris.
 * Penjagaan ini penting karena request tetap lewat web (CSRF/session).
 */
class SqlConsoleService
{
    public const MAX_ROWS = 200;

    private const FORBIDDEN = [
        'insert', 'update', 'delete', 'drop', 'alter', 'create', 'truncate',
        'grant', 'revoke', 'attach', 'detach', 'pragma', 'vacuum', 'call',
        'load_file', 'outfile', 'dumpfile', 'into', 'rename',
    ];

    /**
     * @return array{columns: list<string>, rows: list<array<string, mixed>>, error: string|null, took_ms: float}
     */
    public function run(string $sql): array
    {
        $started = microtime(true);
        $sql = trim($sql);

        if ($sql === '') {
            return $this->result([], [], 'Query kosong.', $started);
        }

        $sql = rtrim($sql, "; \t\n\r");
        $error = $this->guard($sql);

        if ($error !== null) {
            return $this->result([], [], $error, $started);
        }

        if (! preg_match('/\blimit\b/i', $sql)) {
            $sql .= ' LIMIT '.self::MAX_ROWS;
        }

        try {
            $rows = DB::select($sql);
            $rows = array_map(fn ($row) => (array) $row, $rows);
            $rows = array_slice($rows, 0, self::MAX_ROWS);
            $columns = $rows === [] ? [] : array_keys($rows[0]);

            return $this->result($columns, $rows, null, $started);
        } catch (\Throwable $e) {
            return $this->result([], [], 'Query gagal: '.mb_substr($e->getMessage(), 0, 300), $started);
        }
    }

    private function guard(string $sql): ?string
    {
        if (str_contains($sql, ';')) {
            return 'Hanya satu statement yang diizinkan.';
        }

        if (str_contains($sql, '--') || str_contains($sql, '/*')) {
            return 'Komentar SQL tidak diizinkan.';
        }

        if (! preg_match('/^\s*(select|with)\b/i', $sql)) {
            return 'Hanya SELECT / WITH yang diizinkan (read-only).';
        }

        $normalized = preg_replace('/\s+/', ' ', mb_strtolower($sql)) ?? $sql;
        foreach (self::FORBIDDEN as $keyword) {
            if (preg_match('/\b'.preg_quote($keyword, '/').'\b/', $normalized)) {
                return "Kata kunci \"{$keyword}\" tidak diizinkan di konsol read-only.";
            }
        }

        return null;
    }

    private function result(array $columns, array $rows, ?string $error, float $started): array
    {
        return [
            'columns' => $columns,
            'rows' => $rows,
            'error' => $error,
            'took_ms' => round((microtime(true) - $started) * 1000, 1),
        ];
    }
}
