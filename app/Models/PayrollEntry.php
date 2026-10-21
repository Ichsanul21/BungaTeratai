<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PayrollEntry extends Model
{
    protected $guarded = [];

    protected $casts = [
        'bpjs' => 'float',
        'paid_at' => 'date:Y-m-d',
        'pph21' => 'float',
        'potongan_lain' => 'float',
        'borongan_insentif' => 'float',
        'total' => 'float',
        'gaji_pokok' => 'float',
        'tunjangan' => 'float',
    ];

    public function period()
    {
        return $this->belongsTo(PayrollPeriod::class, 'period_id');
    }
}
