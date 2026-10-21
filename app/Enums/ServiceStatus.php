<?php

namespace App\Enums;

enum ServiceStatus: string
{
    case Rencana = 'rencana';
    case Proses = 'proses';
    case Selesai = 'selesai';
}
