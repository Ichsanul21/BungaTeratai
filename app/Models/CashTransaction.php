<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CashTransaction extends Model
{
    protected $guarded = [];

    protected $casts = [
        'amount' => 'float',
        'date' => 'date:Y-m-d',
    ];

    public function cashAccount()
    {
        return $this->belongsTo(CashAccount::class);
    }
}
