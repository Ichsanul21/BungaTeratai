<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DocumentRelation extends Model
{
    protected $guarded = [];

    public function fromDocument()
    {
        return $this->belongsTo(Document::class, 'from_document_id');
    }

    public function toDocument()
    {
        return $this->belongsTo(Document::class, 'to_document_id');
    }}
