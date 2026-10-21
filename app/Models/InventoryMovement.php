<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InventoryMovement extends Model
{
    protected $guarded = [];

    protected $casts = [
        'movement_date' => 'date:Y-m-d',
        'qty' => 'float',
    ];

    public function item()
    {
        return $this->belongsTo(InventoryItem::class, 'item_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
