<?php

namespace App\Enums;

/**
 * Alasan sign-off — 11 alasan dari tabel gAJI klien (CREWING):
 * Permohonan Sendiri, Selesai Kontrak, Cuti, Rekomendasi Nakhoda/Management,
 * Dimutasikan ke kapal lain, Sakit/Kecelakaan Kerja, Indisipliner,
 * Diduga Melakukan Tindakan Pidana, Promosi, Incompetency/Poor Attitude,
 * Meninggal Dunia.
 */
enum CrewOffReason: string
{
    case PermohonanSendiri = 'permohonan_sendiri';
    case SelesaiKontrak = 'selesai_kontrak';
    case Cuti = 'cuti';
    case Rekomendasi = 'rekomendasi_nakhoda';
    case Dimutasi = 'dimutasi_kapal_lain';
    case Sakit = 'sakit_kecelakaan_kerja';
    case Indisipliner = 'indisipliner';
    case Pidana = 'diduga_tindak_pidana';
    case Promosi = 'promosi';
    case Incompetency = 'incompetency';
    case Meninggal = 'meninggal_dunia';

    public function label(): string
    {
        return match ($this) {
            self::PermohonanSendiri => 'Permohonan Sendiri',
            self::SelesaiKontrak => 'Selesai Kontrak',
            self::Cuti => 'Cuti',
            self::Rekomendasi => 'Rekomendasi Nakhoda/Management',
            self::Dimutasi => 'Dimutasikan ke kapal lain',
            self::Sakit => 'Sakit / Kecelakaan Kerja',
            self::Indisipliner => 'Indisipliner',
            self::Pidana => 'Diduga Melakukan Tindakan Pidana',
            self::Promosi => 'Promosi',
            self::Incompetency => 'Incompetency / Poor Attitude',
            self::Meninggal => 'Meninggal Dunia',
        };
    }

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    /** Peta label materi -> slug. */
    public static function fromLabel(?string $label): string
    {
        $key = strtolower(trim((string) $label));
        foreach (self::cases() as $case) {
            if (strtolower($case->label()) === $key) {
                return $case->value;
            }
        }
        $map = [
            'incompetency/ poor attitude' => self::Incompetency->value,
            'sakit / kecelakaan kerja' => self::Sakit->value,
            'rekomendasi nakhoda/management' => self::Rekomendasi->value,
            'rekomendasi nakhoda/management ' => self::Rekomendasi->value,
        ];
        return $map[$key] ?? self::PermohonanSendiri->value;
    }
}
