<?php

namespace App\Enums;

enum MovementType: string
{
    case Masuk = 'masuk';
    case Keluar = 'keluar';
    case Transfer = 'transfer';
    case Penyesuaian = 'penyesuaian';
}
