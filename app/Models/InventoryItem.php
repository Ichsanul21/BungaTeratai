<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class InventoryItem extends Model
{
    use SoftDeletes;

    protected $guarded = [];

    protected $casts = [
        'is_perishable' => 'boolean',
        'min_stock' => 'float',
        'unit_price' => 'float',
        'is_consumable' => 'boolean',
    ];

    public function balances()
    {
        return $this->hasMany(InventoryBalance::class, 'item_id');
    }
}
