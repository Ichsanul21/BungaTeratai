<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InventoryBalance extends Model
{
    protected $guarded = [];

    protected $casts = [
        'qty' => 'float',
    ];
}
