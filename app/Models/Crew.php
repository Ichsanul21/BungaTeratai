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
        'base_salary' => 'float',
    ];

    public function certificates()
    {
        return $this->hasMany(CrewCertificate::class);
    }

    public function assignments()
    {
        return $this->hasMany(CrewAssignment::class);
    }
}
