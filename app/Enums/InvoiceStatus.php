<?php

namespace App\Enums;

enum InvoiceStatus: string
{
    case Draft = 'draft';
    case Unpaid = 'unpaid';
    case Partial = 'partial';
    case Paid = 'paid';
}
