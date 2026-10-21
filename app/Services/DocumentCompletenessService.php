<?php

namespace App\Services;

use App\Models\Document;
use App\Models\DocumentRequirement;
use App\Models\Vessel;
use App\Models\Voyage;
use Illuminate\Support\Collection;

/**
 * Indikator kelengkapan dokumen (indikator INTERNAL, bukan penilaian otoritas).
 */
class DocumentCompletenessService
{
    /** Requirement kelompok A–D yang berlaku untuk sebuah kapal. */
    public function applicableVesselRequirements(Vessel $vessel): Collection
    {
        return DocumentRequirement::where('applies_to', 'vessel')
            ->orderBy('sort')
            ->get()
            ->filter(fn (DocumentRequirement $req) => $this->vesselRequirementApplies($req, $vessel))
            ->values();
    }

    /** Requirement kelompok E–F yang berlaku untuk sebuah perjalanan. */
    public function applicableVoyageRequirements(Voyage $voyage): Collection
    {
        $vessel = $voyage->vessel;
        $cargoTypes = $voyage->cargo()->pluck('commodity_type')->all();

        return DocumentRequirement::where('applies_to', 'voyage')
            ->orderBy('sort')
            ->get()
            ->filter(function (DocumentRequirement $req) use ($vessel, $cargoTypes) {
                if (! $this->vesselRequirementApplies($req, $vessel)) {
                    return false;
                }
                $app = $req->applicability;
                if (! empty($app['cargo_types'])) {
                    if (count(array_intersect($app['cargo_types'], $cargoTypes)) === 0) {
                        return false;
                    }
                }

                return true;
            })
            ->values();
    }

    public function vesselRequirementApplies(DocumentRequirement $req, ?Vessel $vessel): bool
    {
        if (! $vessel) {
            return true;
        }
        $app = $req->applicability;
        if (! $app) {
            return true;
        }
        if (! empty($app['vessel_types']) && ! in_array($vessel->vessel_type, $app['vessel_types'], true)) {
            return false;
        }
        if (! empty($app['navigation_types']) && ! in_array($vessel->navigation_type, $app['navigation_types'], true)) {
            return false;
        }

        return true;
    }

    /**
     * @return array{total:int,met:int,percent:float,missing:array,items:array}
     */
    public function forVessel(Vessel $vessel): array
    {
        $requirements = $this->applicableVesselRequirements($vessel);
        // Dokumen kapal + dokumen perusahaan (kelompok A berlaku untuk semua kapal)
        $docs = Document::where(function ($query) use ($vessel) {
            $query->where(function ($q) use ($vessel) {
                $q->where('owner_type', 'vessel')->where('owner_id', $vessel->id);
            })->orWhere('owner_type', 'company');
        })->get();

        return $this->evaluate($requirements, $docs);
    }

    /**
     * @return array{total:int,met:int,percent:float,missing:array,items:array}
     */
    public function forVoyage(Voyage $voyage): array
    {
        $requirements = $this->applicableVoyageRequirements($voyage);
        $linkedIds = $voyage->documents()->pluck('documents.id');

        $docs = Document::whereIn('id', $linkedIds)
            ->orWhere(function ($query) use ($voyage) {
                $query->where('owner_type', 'vessel')->where('owner_id', $voyage->vessel_id);
            })
            ->get();

        return $this->evaluate($requirements, $docs);
    }

    /**
     * @param  Collection<int, DocumentRequirement>  $requirements
     * @param  Collection<int, Document>  $docs
     * @return array{total:int,met:int,percent:float,missing:array,items:array}
     */
    private function evaluate(Collection $requirements, Collection $docs): array
    {
        $total = $requirements->where('is_conditional', false)->count();
        $met = 0;
        $missing = [];
        $items = [];

        foreach ($requirements as $req) {
            $doc = $docs
                ->where('requirement_code', $req->code)
                ->first();

            // Dokumen kondisional tidak dipaksakan untuk semua kapal/perjalanan
            if ($req->is_conditional) {
                $items[] = [
                    'requirement' => [
                        'code' => $req->code,
                        'name' => $req->name,
                        'group_code' => $req->group_code,
                        'is_conditional' => true,
                        'regulatory_reference' => $req->regulatory_reference,
                    ],
                    'met' => null, // kondisional — dihitung terpisah
                    'document' => null,
                ];

                continue;
            }

            $isValid = $doc
                && $doc->verification_status !== 'rejected'
                && $doc->verification_status !== 'missing'
                && $this->notExpired($doc);

            $items[] = [
                'requirement' => [
                    'code' => $req->code,
                    'name' => $req->name,
                    'group_code' => $req->group_code,
                    'is_conditional' => (bool) $req->is_conditional,
                    'regulatory_reference' => $req->regulatory_reference,
                ],
                'met' => $isValid,
                'document' => $doc ? [
                    'id' => $doc->id,
                    'document_name' => $doc->document_name,
                    'verification_status' => $doc->verification_status,
                    'expiry_date' => $doc->expiry_date?->toDateString(),
                    'has_expiry' => $doc->has_expiry,
                ] : null,
            ];

            if ($isValid) {
                $met++;
            } else {
                $missing[] = [
                    'code' => $req->code,
                    'name' => $req->name,
                    'group_code' => $req->group_code,
                    'reason' => $doc
                        ? ($this->notExpired($doc) ? 'Status: '.$doc->verification_status : 'Kedaluwarsa')
                        : 'Belum ada dokumen',
                ];
            }
        }

        return [
            'total' => $total,
            'met' => $met,
            'percent' => $total > 0 ? round(($met / $total) * 100, 1) : 100.0,
            'missing' => $missing,
            'items' => $items,
        ];
    }

    private function notExpired(Document $doc): bool
    {
        if (! $doc->has_expiry || ! $doc->expiry_date) {
            return true;
        }

        return $doc->expiry_date->isFuture();
    }
}
