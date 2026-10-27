<?php

namespace App\Services;

use App\Enums\CrewRank;
use App\Models\Crew;
use App\Models\CrewAssignment;
use App\Models\CrewCertificate;
use App\Models\Vessel;

/**
 * Kesiapan awak kapal (indikator INTERNAL):
 * - Matriks komposisi wajib per kapal (materi TABLE CREW: 11 jabatan x 1)
 * - Matriks sertifikat pengawakan per jabatan (materi PROSEDUR ON,
 *   daerah pelayaran kawasan Indonesia, kapal 175 GT < 500)
 * - Buku pelaut wajib aktif (tidak expired)
 */
class CrewComplianceService
{
    /** Jabatan wajib per kapal (TABLE CREW) beserta jumlah minimal. */
    public const REQUIRED_RANKS = [
        'nakhoda' => 1,
        'mualim_i' => 1,
        'mualim_ii' => 1,
        'kkm' => 1,
        'masinis_ii' => 1,
        'masinis_iii' => 1,
        'juru_mudi_1' => 1,
        'juru_mudi_2' => 1,
        'juru_mudi_3' => 1,
        'juru_minyak' => 1,
        'juru_masak' => 1,
    ];

    /** Perwira — wajib siapkan pengganti sebelum sign OFF (materi PROSEDUR ON NOTE 3). */
    public const OFFICER_RANKS = [
        'nakhoda', 'mualim_i', 'mualim_ii', 'mualim_iii',
        'kkm', 'masinis_ii', 'masinis_iii', 'masinis_iv',
    ];

    /**
     * Sertifikat wajib per jabatan (materi PROSEDUR ON).
     * Nakhoda: ANT IV M, BST, MFA, MC, SCRB, AFF, BRM, RADAR, ARPA, ECDIS, SSO, SAT
     * Mualim I: ANT IV M, BST, MFA, SCRB, AFF, RADAR, ARPA, ECDIS, SAT
     * Mualim II: ANT IV, BST, MFA, SCRB, AFF, RADAR, ARPA, ECDIS, SAT
     * KKM: ATT III M, BST, MFA, MC, SCRB, AFF, ERM, SSO
     * Masinis II: ATT IV M, BST, MFA, SCRB, AFF, SSO, SAT
     * Masinis III: ATT IV, BST, MFA, SCRB, AFF, SSO, SAT
     * Juru Mudi 1-3: RATINGS DECK, BST | Juru Minyak: RATINGS ENGINE | Juru Masak: BST
     */
    public const RANK_CERTIFICATES = [
        'nakhoda' => ['ant_iv_m', 'bst', 'mfa', 'mc', 'scrb', 'aff', 'brm', 'radar', 'arpa', 'ecdis', 'sso', 'sat'],
        'mualim_i' => ['ant_iv_m', 'bst', 'mfa', 'scrb', 'aff', 'radar', 'arpa', 'ecdis', 'sat'],
        'mualim_ii' => ['ant_iv', 'bst', 'mfa', 'scrb', 'aff', 'radar', 'arpa', 'ecdis', 'sat'],
        'mualim_iii' => ['ant_iv', 'bst', 'mfa', 'scrb', 'aff', 'radar', 'arpa', 'ecdis', 'sat'],
        'kkm' => ['att_iii_m', 'bst', 'mfa', 'mc', 'scrb', 'aff', 'erm', 'sso'],
        'masinis_ii' => ['att_iv_m', 'bst', 'mfa', 'scrb', 'aff', 'sso', 'sat'],
        'masinis_iii' => ['att_iv', 'bst', 'mfa', 'scrb', 'aff', 'sso', 'sat'],
        'juru_mudi_1' => ['ratings_deck', 'bst'],
        'juru_mudi_2' => ['ratings_deck', 'bst'],
        'juru_mudi_3' => ['ratings_deck', 'bst'],
        'juru_minyak' => ['ratings_engine'],
        'juru_masak' => ['bst'],
    ];

    /** Label tampilan tipe sertifikat. */
    public const CERT_LABELS = [
        'ant_iii_m' => 'ANT III M', 'ant_iii' => 'ANT III', 'ant_iv_m' => 'ANT IV M', 'ant_iv' => 'ANT IV',
        'att_iii_m' => 'ATT III M', 'att_iii' => 'ATT III', 'att_iv_m' => 'ATT IV M', 'att_iv' => 'ATT IV',
        'bst' => 'BST', 'mfa' => 'Medical Fitness (MFA)', 'mc' => 'MC', 'scrb' => 'SCRB',
        'aff' => 'AFF', 'brm' => 'BRM', 'erm' => 'ERM', 'radar' => 'RADAR', 'arpa' => 'ARPA',
        'ecdis' => 'ECDIS', 'sso' => 'SSO', 'sat' => 'SAT',
        'ratings_deck' => 'RATINGS DECK', 'ratings_engine' => 'RATINGS ENGINE',
        'buku_pelaut' => 'Buku Pelaut', 'ijazah' => 'Ijazah', 'skk' => 'SKK',
        'medical_fitness' => 'Medical Fitness', 'roc' => 'ROC', 'cdc' => 'CDC', 'passport' => 'Passport',
        'lainnya' => 'Lainnya',
    ];

    /**
     * Kesiapan awak sebuah kapal.
     *
     * @return array{crew_count:int, required:array, present:array, missing:array,
     *   percent:float, ok:bool, certificate_gaps:array, books_invalid:array}
     */
    public function forVessel(Vessel $vessel): array
    {
        $assignments = CrewAssignment::with('crew')
            ->where('vessel_id', $vessel->id)
            ->where('status', 'aktif')
            ->get();

        $present = [];
        foreach ($assignments as $a) {
            $slug = CrewRank::fromLabel($a->role);
            $present[$slug] = ($present[$slug] ?? 0) + 1;
        }

        $missing = [];
        $met = 0;
        foreach (self::REQUIRED_RANKS as $rank => $need) {
            $have = $present[$rank] ?? 0;
            if ($have >= $need) {
                $met++;
            } else {
                $missing[] = [
                    'rank' => $rank,
                    'label' => $this->rankLabel($rank),
                    'need' => $need,
                    'have' => $have,
                ];
            }
        }

        $certificateGaps = [];
        $booksInvalid = [];
        foreach ($assignments as $a) {
            $crew = $a->crew;
            if (! $crew) {
                continue;
            }
            $slug = CrewRank::fromLabel($a->role);
            $required = self::RANK_CERTIFICATES[$slug] ?? [];
            if ($required) {
                $held = $this->validCertificates($crew->id);
                $lack = array_values(array_diff($required, $held));
                if ($lack) {
                    $certificateGaps[] = [
                        'crew_id' => $crew->id,
                        'name' => $crew->name,
                        'rank' => $slug,
                        'rank_label' => $this->rankLabel($slug),
                        'missing' => array_map(fn ($c) => self::CERT_LABELS[$c] ?? $c, $lack),
                    ];
                }
            }
            $book = $crew->certificates()
                ->where('cert_type', 'buku_pelaut')
                ->orderByDesc('expiry_date')
                ->first();
            if (! $book || ! $book->expiry_date || $book->expiry_date->isPast()) {
                $booksInvalid[] = ['crew_id' => $crew->id, 'name' => $crew->name,
                    'reason' => $book ? 'Buku pelaut kedaluwarsa' : 'Buku pelaut belum tercatat'];
            }
        }

        $total = count(self::REQUIRED_RANKS);
        $percent = $total > 0 ? round(($met / $total) * 100, 1) : 100.0;

        return [
            'crew_count' => $assignments->count(),
            'required' => self::REQUIRED_RANKS,
            'present' => $present,
            'missing' => $missing,
            'percent' => $percent,
            'ok' => $percent >= 100.0,
            'certificate_gaps' => $certificateGaps,
            'books_invalid' => $booksInvalid,
        ];
    }

    /** Sertifikat crew yang masih berlaku (slug cert_type, non-expired). */
    public function validCertificates(int $crewId): array
    {
        return CrewCertificate::where('crew_id', $crewId)
            ->get()
            ->filter(function (CrewCertificate $c) {
                if (strtolower($c->cert_type) === 'buku_pelaut') {
                    return false;
                }
                if (! $c->has_expiry || ! $c->expiry_date) {
                    return true;
                }
                return $c->expiry_date->isFuture();
            })
            ->map(fn ($c) => strtolower($c->cert_type))
            ->unique()
            ->values()
            ->all();
    }

    /** Selisih sertifikat utk satu crew (dipakai form Sign ON sebagai warning). */
    public function certificateGapsFor(Crew $crew, string $rankSlug): array
    {
        $required = self::RANK_CERTIFICATES[$rankSlug] ?? [];
        if (! $required) {
            return [];
        }
        $held = $this->validCertificates($crew->id);
        return array_values(array_diff($required, $held));
    }

    public function isOfficerRank(string $rankSlug): bool
    {
        return in_array($rankSlug, self::OFFICER_RANKS, true);
    }

    private function rankLabel(string $slug): string
    {
        foreach (CrewRank::cases() as $rank) {
            if ($rank->value === $slug) {
                return $rank->label();
            }
        }
        return $slug;
    }
}
