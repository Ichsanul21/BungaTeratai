<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InventoryBatch extends Model
{
    protected $guarded = [];

    protected $casts = [
        'expires_at' => 'date:Y-m-d',
        'qty' => 'float',
    ];

    public function item()
    {
        return $this->belongsTo(InventoryItem::class, 'item_id');
    }
}
