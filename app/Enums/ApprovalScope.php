<?php

namespace App\Enums;

enum ApprovalScope: string
{
    case Internal = 'internal';
    case External = 'external';
}
