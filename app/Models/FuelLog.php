<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FuelLog extends Model
{
    protected $guarded = [];

    protected $casts = [
        'distance_nm' => 'float',
        'trip_date' => 'date:Y-m-d',
        'baseline_lph_snapshot' => 'float',
        'duration_hours' => 'float',
        'liters' => 'float',
        'analysis_diff_pct' => 'float',
        'cost' => 'float',
        'speed_knots' => 'float',
        'delay_hours' => 'float',
    ];

    public function vessel()
    {
        return $this->belongsTo(Vessel::class);
    }
}
