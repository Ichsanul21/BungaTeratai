<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Invoice extends Model
{
    use SoftDeletes;

    protected $guarded = [];

    protected $casts = [
        'paid_amount' => 'float',
        'due_date' => 'date:Y-m-d',
        'subtotal' => 'float',
        'pph23_amount' => 'float',
        'issue_date' => 'date:Y-m-d',
        'ppn_rate' => 'float',
        'total' => 'float',
        'ppn_amount' => 'float',
    ];

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function items()
    {
        return $this->hasMany(InvoiceItem::class);
    }

    public function payments()
    {
        return $this->hasMany(Payment::class);
    }

    public function voyage()
    {
        return $this->belongsTo(Voyage::class);
    }

    public function vessel()
    {
        return $this->belongsTo(Vessel::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
