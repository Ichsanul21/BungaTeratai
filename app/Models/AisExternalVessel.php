<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AisExternalVessel extends Model
{
    protected $table = 'ais_external_vessels';
    protected $guarded = [];
    protected $casts = [
        'latitude' => 'float',
        'longitude' => 'float',
        'speed' => 'float',
        'course' => 'float',
        'draught' => 'float',
        'last_seen_at' => 'datetime',
    ];
}
