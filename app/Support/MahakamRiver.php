<?php

namespace App\Support;

/**
 * Geometri alur Sungai Mahakam (reach Samarinda) untuk data demo.
 *
 * Titik diambil dari centerline OSM (way 42858247, waterway=river) sehingga
 * posisi kapal selalu berada di badan air, bukan di daratan. Semua pemakaian
 * posisi demo (seeder armada, riwayat posisi, simulasi AIS) lewat kelas ini.
 */
class MahakamRiver
{
    /** @var array<int, array{0: float, 1: float}>|null */
    private static ?array $points = null;

    /** @var array<int, float>|null panjang kumulatif tiap titik (meter) */
    private static ?array $cumulative = null;

    private const EARTH_R = 6371000.0;

    /**
     * @return array<int, array{0: float, 1: float}> [lat, lng] berurutan hulu → hilir
     */
    public static function points(): array
    {
        if (self::$points !== null) {
            return self::$points;
        }

        $points = [];
        foreach (config('water_anchors', []) as $anchor) {
            if (isset($anchor['lat'], $anchor['lng'])) {
                $points[] = [(float) $anchor['lat'], (float) $anchor['lng']];
            }
        }

        if (count($points) < 2) {
            $points = [[-0.5016, 117.1534], [-0.5039, 117.1391]];
        }

        return self::$points = $points;
    }

    /** Dipakai saat config berubah di proses yang sama (mis. test). */
    public static function reset(): void
    {
        self::$points = null;
        self::$cumulative = null;
    }

    /**
     * Panjang alur (meter).
     */
    public static function length(): float
    {
        $cum = self::cumulative();

        return $cum[count($cum) - 1] ?? 0.0;
    }

    /**
     * Posisi pada fraksi panjang alur.
     *
     * @param  float  $t  0 = hulu, 1 = hilir
     * @param  float  $alongOffsetM  geser sepanjang alur (meter)
     * @param  float  $perpOffsetM   geser tegak lurus alur (meter); jaga < 60 m
     * @return array{0: float, 1: float} [lat, lng]
     */
    public static function positionAt(
        float $t,
        float $alongOffsetM = 0.0,
        float $perpOffsetM = 0.0,
    ): array {
        $points = self::points();
        $cum = self::cumulative();
        $total = max($cum[count($cum) - 1], 1.0);

        $distance = max(0.0, min(1.0, $t) * $total + $alongOffsetM);
        $distance = max(0.0, min($total, $distance));

        $seg = 0;
        for ($i = 1, $n = count($cum); $i < $n; $i++) {
            if ($cum[$i] >= $distance) {
                $seg = $i - 1;
                break;
            }
            $seg = $i - 1;
        }

        $segLen = max($cum[$seg + 1] - $cum[$seg], 0.0001);
        $ratio = ($distance - $cum[$seg]) / $segLen;

        [$lat1, $lng1] = $points[$seg];
        [$lat2, $lng2] = $points[$seg + 1];

        $lat = $lat1 + ($lat2 - $lat1) * $ratio;
        $lng = $lng1 + ($lng2 - $lng1) * $ratio;

        // Bearing segmen (radian, 0 = utara).
        $bearing = atan2(
            ($lng2 - $lng1) * cos(deg2rad($lat)),
            $lat2 - $lat1,
        );

        $mPerDegLat = 111320.0;
        $mPerDegLng = max(111320.0 * cos(deg2rad($lat)), 1.0);

        // $alongOffsetM sudah diterapkan pada $distance (mengikuti alur);
        // di sini hanya geser tegak lurus agar tidak dobel.
        $northM = -sin($bearing) * $perpOffsetM;
        $eastM = cos($bearing) * $perpOffsetM;

        return [
            round($lat + ($northM / $mPerDegLat), 6),
            round($lng + ($eastM / $mPerDegLng), 6),
        ];
    }

    /**
     * Jarak titik ke alur (meter) — dipakai untuk validasi posisi tidak di darat.
     */
    public static function distanceToRiver(float $lat, float $lng): float
    {
        $points = self::points();
        $best = INF;

        for ($i = 0, $n = count($points) - 1; $i < $n; $i++) {
            [$lat1, $lng1] = $points[$i];
            [$lat2, $lng2] = $points[$i + 1];

            $x = ($lng - $lng1) * cos(deg2rad($lat)) * 111320.0;
            $y = ($lat - $lat1) * 111320.0;
            $dx = ($lng2 - $lng1) * cos(deg2rad($lat)) * 111320.0;
            $dy = ($lat2 - $lat1) * 111320.0;

            $lenSq = ($dx * $dx) + ($dy * $dy);
            $proj = $lenSq > 0 ? max(0.0, min(1.0, (($x * $dx) + ($y * $dy)) / $lenSq)) : 0.0;

            $px = $proj * $dx;
            $py = $proj * $dy;

            $best = min($best, sqrt((($x - $px) ** 2) + (($y - $py) ** 2)));
        }

        return $best === INF ? 0.0 : $best;
    }

    /**
     * @return array<int, float>
     */
    private static function cumulative(): array
    {
        if (self::$cumulative !== null) {
            return self::$cumulative;
        }

        $points = self::points();
        $cum = [0.0];

        for ($i = 1, $n = count($points); $i < $n; $i++) {
            [$lat1, $lng1] = $points[$i - 1];
            [$lat2, $lng2] = $points[$i];

            $dy = deg2rad($lat2 - $lat1) * self::EARTH_R;
            $dx = deg2rad($lng2 - $lng1) * self::EARTH_R * cos(deg2rad(($lat1 + $lat2) / 2));

            $cum[] = $cum[$i - 1] + sqrt(($dx * $dx) + ($dy * $dy));
        }

        return self::$cumulative = $cum;
    }
}
