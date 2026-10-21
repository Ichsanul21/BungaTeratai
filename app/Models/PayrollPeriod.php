<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PayrollPeriod extends Model
{
    protected $guarded = [];


    public function entries()
    {
        return $this->hasMany(PayrollEntry::class, 'period_id');
    }
}
