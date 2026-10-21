<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ServiceCatalog extends Model
{
    protected $table = 'service_catalog';

    protected $guarded = [];

    protected $casts = [
        'default_price' => 'float',
    ];
}
