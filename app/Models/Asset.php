<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Asset extends Model
{
    protected $guarded = [];

    protected $casts = [
        'salvage_value' => 'float',
        'acquisition_date' => 'date:Y-m-d',
        'accumulated_depreciation' => 'float',
        'acquisition_cost' => 'float',
    ];
}
