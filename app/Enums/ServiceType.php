<?php

namespace App\Enums;

enum ServiceType: string
{
    case Rutin = 'rutin';
    case Urgent = 'urgent';
    case Drydock = 'drydock';
    case Pemeriksaan = 'pemeriksaan';
}
