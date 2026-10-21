<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class JournalLine extends Model
{
    protected $guarded = [];

    protected $casts = [
        'debit' => 'float',
        'credit' => 'float',
    ];

    public function entry()
    {
        return $this->belongsTo(JournalEntry::class, 'entry_id');
    }

    public function account()
    {
        return $this->belongsTo(Account::class);
    }
}
