<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PurchaseOrder extends Model
{
    protected $guarded = [];

    protected $casts = [
        'order_date' => 'date:Y-m-d',
    ];

    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }

    public function vessel()
    {
        return $this->belongsTo(Vessel::class);
    }

    public function items()
    {
        return $this->hasMany(PoItem::class, 'po_id');
    }

    public function bills()
    {
        return $this->hasMany(Bill::class, 'po_id');
    }}
