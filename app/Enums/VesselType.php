<?php

namespace App\Enums;

enum VesselType: string
{
    case Tugboat = 'tugboat';
    case Tongkang = 'tongkang';
    case KapalPenumpang = 'kapal_penumpang';
    case Lainnya = 'lainnya';
}
