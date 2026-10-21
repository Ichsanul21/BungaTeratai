<?php

namespace App\Enums;

enum ChecklistCompletion: string
{
    case Terpenuhi = 'terpenuhi';
    case Belum = 'belum';
    case TidakBerlaku = 'tidak_berlaku';
}
