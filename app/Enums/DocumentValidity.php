<?php

namespace App\Enums;

enum DocumentValidity: string
{
    case Normal = 'normal';
    case ExpiringSoon = 'expiring_soon';
    case Expired = 'expired';
    case NoExpiry = 'no_expiry';
}
