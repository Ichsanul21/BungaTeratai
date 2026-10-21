<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AuditLog extends Model
{
    public $timestamps = false;

    protected $guarded = [];

    protected $casts = [
        'timestamp' => 'datetime',
        'before' => 'array',
        'after' => 'array',
    ];
}
