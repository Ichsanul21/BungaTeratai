<?php

namespace App\Enums;

enum FuelAnalysisStatus: string
{
    case Normal = 'normal';
    case Waspada = 'waspada';
    case TidakNormal = 'tidak_normal';
}
