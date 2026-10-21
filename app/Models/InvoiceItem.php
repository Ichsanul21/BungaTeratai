<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InvoiceItem extends Model
{
    protected $guarded = [];

    protected $casts = [
        'price' => 'float',
        'amount' => 'float',
        'qty' => 'float',
    ];
}
