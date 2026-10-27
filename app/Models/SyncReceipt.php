<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SyncReceipt extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'detail' => 'array',
            'server_applied_at' => 'datetime',
        ];
    }

    public function device(): BelongsTo
    {
        return $this->belongsTo(Device::class);
    }
}
