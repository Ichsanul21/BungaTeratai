<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AgencyAppointment extends Model
{
    protected $guarded = [];

    protected $casts = [
        'letter_date' => 'date:Y-m-d',
    ];

    public function voyage()
    {
        return $this->belongsTo(Voyage::class);
    }}
