<?php

namespace App\Enums;

enum CargoType: string
{
    case BatuBara = 'batu_bara';
    case Semen = 'semen';
    case Sawit = 'sawit';
    case Cpo = 'cpo';
    case CurahLain = 'curah_lain';
    case Lainnya = 'lainnya';
}
