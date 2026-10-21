<?php

namespace App\Enums;

enum OperationalStatus: string
{
    case Aktif = 'aktif';
    case DalamPerbaikan = 'dalam_perbaikan';
    case Dock = 'dock';
    case Mangkrak = 'mangkrak';
}
