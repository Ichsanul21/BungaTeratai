<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Document extends Model
{
    use SoftDeletes;

    protected $guarded = [];

    protected $casts = [
        'issue_date' => 'date:Y-m-d',
        'has_expiry' => 'boolean',
        'is_archived' => 'boolean',
        'expiry_date' => 'date:Y-m-d',
        'has_endorsement' => 'boolean',
        'endorsement_last_date' => 'date:Y-m-d',
        'endorsement_next_date' => 'date:Y-m-d',
        'voided_at' => 'datetime',
    ];

    public function category()
    {
        return $this->belongsTo(DocumentCategory::class, 'category_id');
    }

    public function versions()
    {
        return $this->hasMany(DocumentVersion::class)->orderByDesc('version_number');
    }

    public function voyages()
    {
        return $this->belongsToMany(Voyage::class, 'document_voyage_links')->withTimestamps();
    }

    /** Nama pemilik (perusahaan/kapal/ABK) — tanpa relasi polymorphik. */
    public function ownerName(): ?string
    {
        return match ($this->owner_type) {
            'vessel' => Vessel::whereKey($this->owner_id)->value('vessel_name'),
            'crew' => Crew::whereKey($this->owner_id)->value('name'),
            default => 'PT Bunga Teratai',
        };
    }

    public function uploader()
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function template()
    {
        return $this->belongsTo(DocumentTemplate::class, 'template_id');
    }

    public function relationsFrom()
    {
        return $this->hasMany(DocumentRelation::class, 'from_document_id');
    }

    public function relationsTo()
    {
        return $this->hasMany(DocumentRelation::class, 'to_document_id');
    }

    public function links()
    {
        return $this->hasMany(DocumentLink::class);
    }
}
