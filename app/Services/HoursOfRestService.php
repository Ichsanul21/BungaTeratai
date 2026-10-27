<?php

namespace App\Services;

/**
 * Hours of Rest (Jam Istirahat Awak) — MLC 2006 / SOLAS XI/1.
 * Aturan WLR yang dipakai inspeksi PSC:
 * - Istirahat minimum 10 jam dalam 24 jam (boleh dibagi 2 blok, satu blok >= 6 jam)
 * - Kerja maksimum 14 jam dalam 24 jam
 * - Istirahat minimum 77 jam dalam 7 hari
 */
class HoursOfRestService
{
    public const MIN_REST_DAY_MIN = 600;      // 10 jam
    public const MIN_REST_BLOCK_MIN = 360;    // 6 jam (blok terpanjang)
    public const MAX_WORK_DAY_MIN = 840;      // 14 jam
    public const MIN_REST_WEEK_MIN = 4620;    // 77 jam / 7 hari

    /**
     * Evaluasi satu hari dari entri [{start:'HH:MM', end:'HH:MM'}] (WITA).
     *
     * @param  list<array{start: string, end: string}>  $entries
     * @return array{rest: int, work: int, violations: list<string>, compliant: bool}
     */
    public function evaluateDay(array $entries): array
    {
        $rest = 0;
        $longest = 0;

        foreach ($entries as $entry) {
            $minutes = $this->minutesBetween($entry['start'] ?? '', $entry['end'] ?? '');
            if ($minutes === null) {
                continue; // entri tidak valid diabaikan (divalidasi controller)
            }
            $rest += $minutes;
            $longest = max($longest, $minutes);
        }

        $rest = min($rest, 1440);
        $work = 1440 - $rest;

        $violations = [];
        if ($rest < self::MIN_REST_DAY_MIN) {
            $violations[] = 'rest_min_10h';
        }
        if ($rest > 0 && $longest < self::MIN_REST_BLOCK_MIN) {
            $violations[] = 'rest_block_min_6h';
        }
        if ($work > self::MAX_WORK_DAY_MIN) {
            $violations[] = 'work_max_14h';
        }

        return [
            'rest' => $rest,
            'work' => $work,
            'violations' => $violations,
            'compliant' => $violations === [],
        ];
    }

    /**
     * Cek mingguan 77 jam (dihitung dari total harian yang tersimpan).
     *
     * @param  list<int>  $dailyRestMinutes  total istirahat harian (menit), 7 entri terakhir
     * @return list<string>
     */
    public function weeklyViolations(array $dailyRestMinutes): array
    {
        return array_sum($dailyRestMinutes) < self::MIN_REST_WEEK_MIN
            ? ['rest_min_77h_week']
            : [];
    }

    /** Menit antara dua waktu 'HH:MM' di hari yang sama; null bila format salah. */
    private function minutesBetween(string $start, string $end): ?int
    {
        if (! preg_match('/^([01]\d|2[0-3]):([0-5]\d)$/', $start) || ! preg_match('/^([01]\d|2[0-3]):([0-5]\d)$/', $end)) {
            return null;
        }

        [$sh, $sm] = explode(':', $start);
        [$eh, $em] = explode(':', $end);
        $minutes = ((int) $eh * 60 + (int) $em) - ((int) $sh * 60 + (int) $sm);

        return $minutes > 0 ? $minutes : null;
    }
}
