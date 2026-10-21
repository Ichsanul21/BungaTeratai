<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Bill extends Model
{
    use SoftDeletes;

    protected $guarded = [];

    protected $casts = [
        'subtotal' => 'float',
        'issue_date' => 'date:Y-m-d',
        'paid_amount' => 'float',
        'total' => 'float',
        'due_date' => 'date:Y-m-d',
        'ppn_amount' => 'float',
        'pph_withheld' => 'float',
    ];

    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }

    public function payments()
    {
        return $this->hasMany(BillPayment::class);
    }
}
