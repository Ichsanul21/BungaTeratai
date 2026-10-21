<?php

namespace App\Enums;

enum RoleSlug: string
{
    case SuperAdmin = 'super_admin';
    case Management = 'management';
    case ShipOps = 'ship_ops';
    case DocController = 'doc_controller';
    case Supervisor = 'supervisor';
    case Finance = 'finance';
    case Auditor = 'auditor';
}
