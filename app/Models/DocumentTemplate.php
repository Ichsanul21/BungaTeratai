<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DocumentTemplate extends Model
{
    protected $table = 'document_templates';

    protected $guarded = [];

    protected $casts = [
        'enabled' => 'boolean',
        'is_generic_letter' => 'boolean',
        'defaults' => 'array',
    ];}
