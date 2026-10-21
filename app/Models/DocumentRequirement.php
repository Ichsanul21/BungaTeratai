<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DocumentRequirement extends Model
{
    protected $guarded = [];

    protected $casts = [
        'applicability' => 'array',
    ];
}
