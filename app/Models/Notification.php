<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Notification extends Model
{
    const UPDATED_AT = null;

    protected $guarded = [];

    protected $casts = [
        'read_status' => 'boolean',
    ];
}
