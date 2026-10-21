<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class OfficeEmployee extends Model
{
    use SoftDeletes;

    protected $guarded = [];

    protected $casts = [
        'join_date' => 'date:Y-m-d',
        'base_salary' => 'float',
        'allowances' => 'float',
    ];
}
