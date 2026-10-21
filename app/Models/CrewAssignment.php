<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CrewAssignment extends Model
{
    protected $guarded = [];

    protected $casts = [
        'start_date' => 'date:Y-m-d',
        'end_date' => 'date:Y-m-d',
    ];

    public function crew()
    {
        return $this->belongsTo(Crew::class);
    }

    public function vessel()
    {
        return $this->belongsTo(Vessel::class);
    }
}
