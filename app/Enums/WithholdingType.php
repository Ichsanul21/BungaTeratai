<?php

namespace App\Enums;

enum WithholdingType: string
{
    case PPh21 = 'pph21';
    case PPh23 = 'pph23';
    case PPh42 = 'pph4(2)';
}
