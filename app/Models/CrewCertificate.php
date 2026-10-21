<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CrewCertificate extends Model
{
    protected $guarded = [];

    protected $casts = [
        'has_expiry' => 'boolean',
        'issued_at' => 'date:Y-m-d',
        'expiry_date' => 'date:Y-m-d',
    ];

    public function crew()
    {
        return $this->belongsTo(Crew::class);
    }
}
