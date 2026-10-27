<?php

namespace App\Enums;

/**
 * Jabatan awak kapal — 34 jabatan sesuai tabel gaji klien (CREWING/gAJI)
 * + Kadet Deck/Mesin + Lainnya (jabatan non-reguler di Data Crew:
 * Cleaning Service, Security, Paramedis, Opt Crane, Filter, dst).
 */
enum CrewRank: string
{
    case Nakhoda = 'nakhoda';
    case Mualim1 = 'mualim_i';
    case Mualim2 = 'mualim_ii';
    case Mualim3 = 'mualim_iii';
    case Bosun = 'bosun';
    case KKM = 'kkm';
    case Masinis2 = 'masinis_ii';
    case Masinis3 = 'masinis_iii';
    case Masinis4 = 'masinis_iv';
    case Electrician = 'electrician';
    case Wiper = 'wiper';
    case Kelasi1 = 'kelasi_1';
    case Kelasi2 = 'kelasi_2';
    case Kelasi3 = 'kelasi_3';
    case Kelasi4 = 'kelasi_4';
    case Kelasi5 = 'kelasi_5';
    case Kelasi6 = 'kelasi_6';
    case Kelasi7 = 'kelasi_7';
    case Kelasi8 = 'kelasi_8';
    case Kelasi9 = 'kelasi_9';
    case Kelasi10 = 'kelasi_10';
    case Kelasi11 = 'kelasi_11';
    case Kerani1 = 'kerani_1';
    case Kerani2 = 'kerani_2';
    case Messboy1 = 'messboy_1';
    case Messboy2 = 'messboy_2';
    case JuruMudi1 = 'juru_mudi_1';
    case JuruMudi2 = 'juru_mudi_2';
    case JuruMudi3 = 'juru_mudi_3';
    case JuruMinyak = 'juru_minyak';
    case JuruMinyak1 = 'juru_minyak_1';
    case JuruMinyak2 = 'juru_minyak_2';
    case JuruMinyak3 = 'juru_minyak_3';
    case JuruMasak = 'juru_masak';
    case KadetDeck = 'kadet_deck';
    case KadetMesin = 'kadet_mesin';
    case Lainnya = 'lainnya';

    public function label(): string
    {
        return match ($this) {
            self::Nakhoda => 'Nakhoda',
            self::Mualim1 => 'Mualim I',
            self::Mualim2 => 'Mualim II',
            self::Mualim3 => 'Mualim III',
            self::Bosun => 'Bosun',
            self::KKM => 'KKM',
            self::Masinis2 => 'Masinis II',
            self::Masinis3 => 'Masinis III',
            self::Masinis4 => 'Masinis IV',
            self::Electrician => 'Electrician',
            self::Wiper => 'Wiper',
            self::Kelasi1 => 'Kelasi 1',
            self::Kelasi2 => 'Kelasi 2',
            self::Kelasi3 => 'Kelasi 3',
            self::Kelasi4 => 'Kelasi 4',
            self::Kelasi5 => 'Kelasi 5',
            self::Kelasi6 => 'Kelasi 6',
            self::Kelasi7 => 'Kelasi 7',
            self::Kelasi8 => 'Kelasi 8',
            self::Kelasi9 => 'Kelasi 9',
            self::Kelasi10 => 'Kelasi 10',
            self::Kelasi11 => 'Kelasi 11',
            self::Kerani1 => 'Kerani 1',
            self::Kerani2 => 'Kerani 2',
            self::Messboy1 => 'Messboy 1',
            self::Messboy2 => 'Messboy 2',
            self::JuruMudi1 => 'Juru Mudi 1',
            self::JuruMudi2 => 'Juru Mudi 2',
            self::JuruMudi3 => 'Juru Mudi 3',
            self::JuruMinyak => 'Juru Minyak',
            self::JuruMinyak1 => 'Juru Minyak 1',
            self::JuruMinyak2 => 'Juru Minyak 2',
            self::JuruMinyak3 => 'Juru Minyak 3',
            self::JuruMasak => 'Juru Masak',
            self::KadetDeck => 'Kadet Deck',
            self::KadetMesin => 'Kadet Mesin',
            self::Lainnya => 'Lainnya',
        };
    }

    /** Semua slug valid (untuk validasi form & select). */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    /** Peta label materi (case-insensitive) -> slug. */
    public static function fromLabel(?string $label): string
    {
        if ($label === null || trim($label) === '') {
            return self::Lainnya->value;
        }
        $key = strtolower(trim(preg_replace('/\s+/', ' ', $label)));

        $map = [
            'nakhoda' => 'nakhoda',
            'mualim i' => 'mualim_i',
            'mualim ii' => 'mualim_ii',
            'mualim iii' => 'mualim_iii',
            'bosun' => 'bosun',
            'kkm' => 'kkm',
            'masinis ii' => 'masinis_ii',
            'masinis iii' => 'masinis_iii',
            'masinis iv' => 'masinis_iv',
            'electrician' => 'electrician',
            'electrisen' => 'electrician',
            'wiper' => 'wiper',
            'kelasi 1' => 'kelasi_1',
            'kelasi 2' => 'kelasi_2',
            'kelasi 3' => 'kelasi_3',
            'kelasi 4' => 'kelasi_4',
            'kelasi 5' => 'kelasi_5',
            'kelasi 6' => 'kelasi_6',
            'kelasi 7' => 'kelasi_7',
            'kelasi 8' => 'kelasi_8',
            'kelasi 9' => 'kelasi_9',
            'kelasi 10' => 'kelasi_10',
            'kelasi 11' => 'kelasi_11',
            'kerani 1' => 'kerani_1',
            'kerani 2' => 'kerani_2',
            'messboy 1' => 'messboy_1',
            'messboy 2' => 'messboy_2',
            'mesboy1' => 'messboy_1',
            'mesboy2' => 'messboy_2',
            'juru mudi 1' => 'juru_mudi_1',
            'juru mudi 2' => 'juru_mudi_2',
            'juru mudi 3' => 'juru_mudi_3',
            'juru minyak' => 'juru_minyak',
            'juru minyak 1' => 'juru_minyak_1',
            'juru minyak 2' => 'juru_minyak_2',
            'juru minyak 3' => 'juru_minyak_3',
            'juru masak' => 'juru_masak',
            'juru masak 1' => 'juru_masak',
            'juru masak 2' => 'juru_masak',
            'koki' => 'juru_masak',
            'kadet deck' => 'kadet_deck',
            'kadet mesin' => 'kadet_mesin',
        ];

        return $map[$key] ?? self::Lainnya->value;
    }
}
