<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WithholdingTax extends Model
{
    protected $guarded = [];

    protected $casts = [
        'date' => 'date:Y-m-d',
        'tax_amount' => 'float',
        'base_amount' => 'float',
        'rate' => 'float',
        'paid_at' => 'date:Y-m-d',
    ];
}
