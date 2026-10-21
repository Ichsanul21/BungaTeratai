<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PaymentSchedule extends Model
{
    protected $guarded = [];

    protected $casts = [
        'amount' => 'float',
        'due_date' => 'date:Y-m-d',
        'paid_at' => 'date:Y-m-d',
    ];
}
