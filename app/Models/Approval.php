<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Approval extends Model
{
    protected $guarded = [];

    protected $casts = [
        'decision_timestamp' => 'datetime',
    ];

    public function approver()
    {
        return $this->belongsTo(User::class, 'approver_id');
    }

    public function approvable()
    {
        return $this->morphTo();
    }
}
