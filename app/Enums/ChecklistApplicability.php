<?php

namespace App\Enums;

enum ChecklistApplicability: string
{
    case Wajib = 'wajib';
    case Kondisional = 'kondisional';
    case MenungguKonfirmasi = 'menunggu_konfirmasi';
}
