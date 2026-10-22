<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Voyage extends Model
{
    use SoftDeletes;

    protected $guarded = [];

    protected $casts = [
        'actual_arrival' => 'datetime',
        'spal_date' => 'date:Y-m-d',
        'dsr_date' => 'date:Y-m-d',
        'freight_rate' => 'float',
        'demurrage_per_day' => 'float',
        'dsr_mt' => 'float',
        'actual_departure' => 'datetime',
        'estimated_arrival' => 'datetime',
        'planned_departure' => 'datetime',
    ];

    public function vessel()
    {
        return $this->belongsTo(Vessel::class);
    }

    public function tugboat()
    {
        return $this->belongsTo(Vessel::class, 'tugboat_id');
    }

    public function barge()
    {
        return $this->belongsTo(Vessel::class, 'barge_id');
    }

    public function cargo()
    {
        return $this->hasMany(VoyageCargo::class);
    }

    public function documents()
    {
        return $this->belongsToMany(Document::class, 'document_voyage_links')->withTimestamps();
    }

    public function checklists()
    {
        return $this->hasMany(VoyageChecklist::class);
    }

    public function events()
    {
        return $this->hasMany(VoyageEvent::class);
    }

    public function safetyChecks()
    {
        return $this->hasMany(VoyageSafetyCheck::class);
    }

    public function relationships()
    {
        return $this->hasMany(VesselRelationship::class);
    }

    public function invoices()
    {
        return $this->hasMany(Invoice::class);
    }

    public function bills()
    {
        return $this->hasMany(Bill::class);
    }

    public function fuelLogs()
    {
        return $this->hasMany(FuelLog::class);
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function approvals()
    {
        return $this->morphMany(Approval::class, 'approvable');
    }

    public function agencyAppointments()
    {
        return $this->hasMany(AgencyAppointment::class);
    }
}
