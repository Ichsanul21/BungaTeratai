<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VesselRelationship extends Model
{
    protected $guarded = [];

    public function tugboat()
    {
        return $this->belongsTo(Vessel::class, 'tugboat_id');
    }

    public function barge()
    {
        return $this->belongsTo(Vessel::class, 'barge_id');
    }

    public function voyage()
    {
        return $this->belongsTo(Voyage::class);
    }
}
