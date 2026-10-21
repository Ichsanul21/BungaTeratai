<?php

namespace App\Enums;

enum DocumentOwnerType: string
{
    case Company = 'company';
    case Vessel = 'vessel';
    case Crew = 'crew';
}
