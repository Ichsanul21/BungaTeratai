<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Vessel extends Model
{
    use SoftDeletes;

    protected $guarded = [];

    protected $casts = [
        'last_position_at' => 'datetime',
        'fuel_baseline_lph' => 'float',
        'doc_completeness' => 'float',
    ];

    public function documents()
    {
        return $this->hasMany(Document::class, 'owner_id')->where('owner_type', 'vessel');
    }

    public function voyages()
    {
        return $this->hasMany(Voyage::class);
    }

    public function positions()
    {
        return $this->hasMany(VesselPosition::class)->orderByDesc('recorded_at');
    }

    public function conditions()
    {
        return $this->hasMany(VesselCondition::class)->orderByDesc('checked_at');
    }

    public function services()
    {
        return $this->hasMany(Service::class)->orderByDesc('start_date');
    }

    public function fuelLogs()
    {
        return $this->hasMany(FuelLog::class)->orderByDesc('trip_date');
    }

    public function assignments()
    {
        return $this->hasMany(CrewAssignment::class)->orderByDesc('start_date');
    }

    public function crews()
    {
        return $this->belongsToMany(Crew::class, 'crew_assignments')->withPivot('role', 'start_date', 'end_date', 'status');
    }
}
