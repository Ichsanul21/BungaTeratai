<?php

namespace App\Services;

use App\Enums\FuelAnalysisStatus;
use App\Models\FuelLog;
use App\Models\Vessel;

/**
 * Analisis konsumsi BBM per trip vs baseline kapal (L/jam).
 * Normal ≤ ±10% · Waspada ±10–20% · Tidak Normal > ±20%.
 */
class FuelAnalysisService
{
    /**
     * @return array{status:string,diff_pct:float,lph:float,baseline:float|null}
     */
    public function analyze(float $liters, float $durationHours, ?float $baselineLph): array
    {
        $lph = $durationHours > 0 ? $liters / $durationHours : 0.0;

        if (! $baselineLph || $baselineLph <= 0) {
            return [
                'status' => FuelAnalysisStatus::Normal->value,
                'diff_pct' => 0.0,
                'lph' => round($lph, 2),
                'baseline' => $baselineLph,
            ];
        }

        $diff = (($lph - $baselineLph) / $baselineLph) * 100;
        $abs = abs($diff);

        $status = match (true) {
            $abs <= 10 => FuelAnalysisStatus::Normal->value,
            $abs <= 20 => FuelAnalysisStatus::Waspada->value,
            default => FuelAnalysisStatus::TidakNormal->value,
        };

        return [
            'status' => $status,
            'diff_pct' => round($diff, 2),
            'lph' => round($lph, 2),
            'baseline' => $baselineLph,
        ];
    }

    public function record(
        Vessel $vessel,
        string $tripDate,
        string $route,
        ?string $cargoType,
        float $durationHours,
        ?float $distanceNm,
        float $liters,
        float $cost,
        ?string $explanation,
        ?int $voyageId,
        ?string $weatherCondition = null,
        ?float $speedKnots = null,
        ?float $delayHours = null,
    ): FuelLog {
        $analysis = $this->analyze($liters, $durationHours, $vessel->fuel_baseline_lph);

        return FuelLog::create([
            'vessel_id' => $vessel->id,
            'voyage_id' => $voyageId,
            'trip_date' => $tripDate,
            'route' => $route,
            'cargo_type' => $cargoType,
            'duration_hours' => $durationHours,
            'distance_nm' => $distanceNm,
            'liters' => $liters,
            'cost' => $cost,
            'baseline_lph_snapshot' => $vessel->fuel_baseline_lph,
            'analysis_status' => $analysis['status'],
            'analysis_diff_pct' => $analysis['diff_pct'],
            'explanation_note' => $explanation,
            'weather_condition' => $weatherCondition,
            'speed_knots' => $speedKnots,
            'delay_hours' => $delayHours,
            'created_by' => auth()->id(),
        ]);
    }
}
