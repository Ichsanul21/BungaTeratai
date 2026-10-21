<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VoyageChecklist extends Model
{
    protected $guarded = [];


    public function requirement()
    {
        return $this->belongsTo(DocumentRequirement::class, 'requirement_id');
    }
}
