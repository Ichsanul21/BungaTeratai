<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class JournalEntry extends Model
{
    protected $guarded = [];

    protected $casts = [
        'entry_date' => 'date:Y-m-d',
    ];

    public function lines()
    {
        return $this->hasMany(JournalLine::class, 'entry_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'posted_by');
    }
}
