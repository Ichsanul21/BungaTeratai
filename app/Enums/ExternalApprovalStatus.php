<?php

namespace App\Enums;

enum ExternalApprovalStatus: string
{
    case Menunggu = 'menunggu';
    case Terkonfirmasi = 'terkonfirmasi';
    case TidakDiperlukan = 'tidak_diperlukan';
}
