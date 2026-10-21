<?php

namespace App\Enums;

enum CashDirection: string
{
    case In = 'in';
    case Out = 'out';
    case Transfer = 'transfer';
}
