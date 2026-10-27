<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Crew extends Model
{
    use SoftDeletes;

    protected $guarded = [];

    protected $casts = [
        'birth_date' => 'date:Y-m-d',
        'joined_on' => 'date:Y-m-d',
        'base_salary' => 'float',
        'is_blacklist' => 'boolean',
    ];

    public function certificates()
    {
        return $this->hasMany(CrewCertificate::class);
    }

    public function assignments()
    {
        return $this->hasMany(CrewAssignment::class);
    }

    public function movements()
    {
        return $this->hasMany(CrewMovement::class)->orderByDesc('movement_date');
    }

    public function activeAssignment()
    {
        return $this->assignments()->where('status', 'aktif')->latest('id')->first();
    }

    /** Buku pelaut aktif (dari crew_certificates). */
    public function seafarerBook()
    {
        return $this->certificates()->where('cert_type', 'buku_pelaut')->orderByDesc('expiry_date')->first();
    }
}
