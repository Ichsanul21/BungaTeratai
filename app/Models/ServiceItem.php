<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ServiceItem extends Model
{
    protected $guarded = [];

    protected $casts = [
        'qty' => 'float',
    ];

    public function item()
    {
        return $this->belongsTo(InventoryItem::class, 'item_id');
    }
}
