<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VesselCondition extends Model
{
    protected $guarded = [];

    protected $casts = [
        'checked_at' => 'datetime',
        'checklist' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'checked_by');
    }

    public function vessel()
    {
        return $this->belongsTo(Vessel::class);
    }
}
