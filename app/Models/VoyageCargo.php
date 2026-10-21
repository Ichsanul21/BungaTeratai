<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VoyageCargo extends Model
{
    protected $table = 'voyage_cargo';

    protected $guarded = [];

    protected $casts = [
        'weight_ton' => 'float',
        'volume' => 'float',
    ];
}
