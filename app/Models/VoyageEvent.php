<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VoyageEvent extends Model
{
    protected $guarded = [];

    protected $casts = [
        'payload' => 'array',
        'occurred_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function voyage()
    {
        return $this->belongsTo(Voyage::class);
    }
}
