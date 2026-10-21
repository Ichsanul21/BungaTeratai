<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CashAccount extends Model
{
    protected $guarded = [];

    protected $casts = [
        'balance' => 'float',
    ];

    public function account()
    {
        return $this->belongsTo(Account::class);
    }
}
