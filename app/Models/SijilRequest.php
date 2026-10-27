<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Surat Permohonan Sijil ON/OFF ke Kesyahbandaran & Otoritas Pelabuhan. */
class SijilRequest extends Model
{
    protected $guarded = [];

    protected $casts = [
        'letter_date' => 'date:Y-m-d',
        'crew_ids' => 'array',
    ];

    public function vessel()
    {
        return $this->belongsTo(Vessel::class);
    }

    public function document()
    {
        return $this->belongsTo(Document::class, 'document_id');
    }

    public function crews()
    {
        return Crew::whereIn('id', $this->crew_ids ?? [])->get();
    }
}
