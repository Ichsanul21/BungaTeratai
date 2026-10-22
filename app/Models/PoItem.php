<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PoItem extends Model
{
    protected $guarded = [];

    public function po()
    {
        return $this->belongsTo(PurchaseOrder::class, 'po_id');
    }

    public function inventoryItem()
    {
        return $this->belongsTo(InventoryItem::class, 'inventory_item_id');
    }}
