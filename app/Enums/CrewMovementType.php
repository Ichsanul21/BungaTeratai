<?php

namespace App\Enums;

/** Gerakan awak kapal — register ON/OFF/mutasi/kadet. */
enum CrewMovementType: string
{
    case SignOn = 'sign_on';
    case SignOff = 'sign_off';
    case MutasiKapal = 'mutasi_kapal';
    case MutasiJabatan = 'mutasi_jabatan';
    case KadetOn = 'kadet_on';
    case KadetOff = 'kadet_off';

    public function label(): string
    {
        return match ($this) {
            self::SignOn => 'Sign ON',
            self::SignOff => 'Sign OFF',
            self::MutasiKapal => 'Mutasi Kapal',
            self::MutasiJabatan => 'Mutasi Jabatan',
            self::KadetOn => 'Kadet ON (Prala)',
            self::KadetOff => 'Kadet OFF (Selesai PK)',
        };
    }

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
