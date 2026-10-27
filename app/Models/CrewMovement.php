<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CrewMovement extends Model
{
    protected $guarded = [];

    protected $casts = [
        'movement_date' => 'date:Y-m-d',
    ];

    public function crew()
    {
        return $this->belongsTo(Crew::class);
    }

    public function vessel()
    {
        return $this->belongsTo(Vessel::class);
    }

    public function replacementCrew()
    {
        return $this->belongsTo(Crew::class, 'replacement_crew_id');
    }

    public function document()
    {
        return $this->belongsTo(Document::class, 'document_id');
    }
}
