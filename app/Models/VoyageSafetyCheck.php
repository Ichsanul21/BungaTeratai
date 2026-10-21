<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VoyageSafetyCheck extends Model
{
    protected $guarded = [];

    protected $casts = [
        'checked_at' => 'datetime',
        'checklist' => 'array',
    ];
}
