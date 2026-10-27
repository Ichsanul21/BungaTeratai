<?php

namespace App\Services\Generators;

use App\Models\AgencyAppointment;
use App\Models\Document;
use App\Models\DocumentTemplate;
use App\Models\DocumentVersion;
use App\Models\Invoice;
use App\Models\PurchaseOrder;
use App\Models\Voyage;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;

/**
 * Generator output dokumen (PDF) - struktur mengikuti dokumen asli klien.
 * Setiap generate otomatis diarsipkan (documents source_type=terbitan).
 */
class DocumentGeneratorService
{
    /** Kop surat standar PT Bunga Teratai. */
    public function letterhead(): array
    {
        $company = \App\Models\Company::first();
        $npwp = $company?->npwp;
        if (! $npwp || str_contains($npwp, '00.000')) {
            $npwp = '01.234.567.8-721.000';
        }

        $bank = \App\Models\CashAccount::where('type', 'bank')
            ->where('account_number', 'not like', '%DEMO%')
            ->where('account_number', 'not like', '%0022-001%')
            ->first();

        $bankString = ($bank && $bank->account_number)
            ? ($bank->name.' - a/c '.$bank->account_number)
            : 'Bank BRI Cab. Samarinda 1 - a/c 0082 01000 409 309';

        return [
            'name' => 'PT BUNGA TERATAI',
            'address' => ($company?->address) ?: 'Jl. Mulawarman No. 23, Samarinda, Kalimantan Timur',
            'phone' => ($company?->phone) ?: '(0541) 731034',
            'email' => ($company?->email) ?: 'adm.teratai@gmail.com',
            'npwp' => $npwp,
            'bank' => $bankString,
            'account_holder' => $bank?->account_holder ?? 'PT Bunga Teratai',
            'director' => 'H. Syarif',
            'director_title' => 'Direktur',
        ];
    }

    /**
     * Arsipkan file hasil generate sebagai dokumen terbitan.
     *
     * @return array{document: Document, path: string}
     */
    public function archiveGeneratedPdf(
        string $templateCode,
        string $documentName,
        string $binaryPath,
        ?Voyage $voyage = null,
        ?int $ownerVesselId = null,
        array $extra = [],
        ?int $ownerCrewId = null,
    ): array {
        $template = DocumentTemplate::where('code', $templateCode)->first();
        $kode = strtoupper(str_replace(['-', ' '], '', substr($templateCode, 0, 6)));
        $year = now()->year;
        $seq = Document::where('source_type', 'terbitan')
            ->where('template_id', $template?->id)
            ->whereYear('created_at', $year)
            ->count() + 1;

        $document = Document::create([
            'document_name' => $documentName,
            'category_id' => $extra['category_id'] ?? \App\Models\DocumentCategory::where('group_code', 'E')->value('id'),
            'document_number' => $extra['document_number'] ?? null,
            'owner_type' => $ownerCrewId ? 'crew' : ($ownerVesselId ? 'vessel' : 'company'),
            'owner_id' => $ownerCrewId ?: $ownerVesselId,
            'source_type' => 'terbitan',
            'template_id' => $template?->id,
            'archive_number' => sprintf('ARS/%s/%d/%03d', $kode, $year, $seq),
            'period' => now()->format('Y-m'),
            'issue_date' => now()->toDateString(),
            'has_expiry' => false,
            'verification_status' => 'verified',
            'uploaded_by' => auth()->id(),
            'responsible_person' => auth()->user()?->name,
            'archive_location' => 'Terbitan sistem (otomatis)',
            ...collect($extra)->only(['notes'])->all(),
        ]);

        $docVersion = DocumentVersion::create([
            'document_id' => $document->id,
            'version_number' => 1,
            'file_path' => $binaryPath,
            'file_mime' => 'application/pdf',
            'file_size' => (int) @filesize(Storage::disk('local')->path($binaryPath)),
            'uploaded_at' => now(),
            'uploaded_by' => auth()->id(),
            'revision_notes' => 'Diterbitkan oleh sistem',
        ]);
        $document->update(['current_version_id' => $docVersion->id, 'file_path' => $binaryPath]);

        if ($voyage) {
            $document->voyages()->attach($voyage->id);
        }

        \App\Services\AuditService::log('document_issued', 'document', $document->id, null, [
            'template' => $templateCode,
            'number' => $document->document_number,
        ], "Dokumen terbit: {$documentName}");

        return ['document' => $document, 'path' => $binaryPath];
    }

    public function storePdf($pdf, string $filename): string
    {
        $path = 'documents/'.$filename;
        Storage::disk('local')->put($path, $pdf->output());

        return $path;
    }

    // ============ GENERATOR PER JENIS ============

    /** SPAL - 2 halaman: kontrak GENCON + Ketentuan Umum. */
    public function generateSpal(Voyage $voyage): array
    {
        $pdf = Pdf::loadView('pdf.spal', [
            'voyage' => $voyage,
            'lh' => $this->letterhead(),
            'cargo' => $voyage->cargo->first(),
            'relationship' => $voyage->relationships()->with(['tugboat', 'barge'])->first(),
            'customer' => $voyage->customer,
        ])->setPaper('a4');

        $filename = 'SPAL-'.preg_replace('/[^A-Za-z0-9]/', '', $voyage->spal_number ?? $voyage->voyage_code).'-'.now()->format('Ymd').'.pdf';
        $path = $this->storePdf($pdf, $filename);

        return $this->archiveGeneratedPdf(
            'SPAL',
            'SPAL '.($voyage->spal_number ?? $voyage->voyage_code),
            $path,
            $voyage,
            $voyage->vessel_id,
            ['document_number' => $voyage->spal_number, 'category_id' => \App\Models\DocumentCategory::where('group_code', 'E')->value('id')],
        );
    }

    /** Surat Penunjukan Keagenan. */
    public function generateAgency(AgencyAppointment $agency): array
    {
        $voyage = $agency->voyage()->with('vessel')->first();
        $pdf = Pdf::loadView('pdf.agency', [
            'agency' => $agency,
            'voyage' => $voyage,
            'lh' => $this->letterhead(),
        ])->setPaper('a4');

        $filename = 'KEAGENAN-'.preg_replace('/[^A-Za-z0-9]/', '', $agency->letter_no ?? 'X').'.pdf';
        $path = $this->storePdf($pdf, $filename);

        $result = $this->archiveGeneratedPdf(
            'KEAGENAN',
            'Penunjukan Keagenan ('.$agency->port_type.') - '.($voyage?->voyage_code ?? ''),
            $path,
            $voyage,
            $voyage?->vessel_id,
            ['document_number' => $agency->letter_no, 'category_id' => \App\Models\DocumentCategory::where('group_code', 'E')->value('id')],
        );

        $agency->update(['file_path' => $path]);

        return $result;
    }

    /** PO. */
    public function generatePo(PurchaseOrder $po): array
    {
        $po->load(['supplier', 'vessel', 'items']);
        $pdf = Pdf::loadView('pdf.po', [
            'po' => $po,
            'lh' => $this->letterhead(),
        ])->setPaper('a4');

        $filename = 'PO-'.preg_replace('/[^A-Za-z0-9]/', '', $po->po_number).'.pdf';
        $path = $this->storePdf($pdf, $filename);

        return $this->archiveGeneratedPdf(
            'PO',
            'Purchase Order '.$po->po_number,
            $path,
            null,
            $po->vessel_id,
            ['document_number' => $po->po_number, 'category_id' => \App\Models\DocumentCategory::where('group_code', 'A')->value('id')],
        );
    }

    /** Invoice charter (DP / pelunasan) - format persis INV 197/211. */
    public function generateCharterInvoice(Invoice $invoice, string $kind): array
    {
        $invoice->load(['customer', 'items']);
        $voyage = $invoice->voyage()->with(['vessel', 'customer'])->first();
        $pdf = Pdf::loadView('pdf.charter-invoice', [
            'invoice' => $invoice,
            'voyage' => $voyage,
            'kind' => $kind, // dp|pelunasan|dp100
            'lh' => $this->letterhead(),
            'dsr' => $voyage?->dsr_mt,
        ])->setPaper('a4');

        $filename = 'INV-CHTR-'.preg_replace('/[^A-Za-z0-9]/', '', $invoice->number).'.pdf';
        $path = $this->storePdf($pdf, $filename);

        $invoice->update(['invoice_kind' => $kind]);

        $archived = $this->archiveGeneratedPdf(
            'INV_CHARTER',
            'Invoice Charter '.($kind === 'pelunasan' ? 'Pelunasan' : 'DP').' - '.$invoice->number,
            $path,
            $voyage,
            $voyage?->vessel_id,
            ['document_number' => $invoice->number, 'category_id' => \App\Models\DocumentCategory::where('group_code', 'E')->value('id')],
        );

        // Relasi: invoice terbit dari SPAL bila ada
        $spalDoc = Document::where('document_number', $voyage?->spal_number ?? '---')->first();
        if ($spalDoc) {
            \App\Models\DocumentRelation::firstOrCreate(
                ['from_document_id' => $archived['document']->id, 'to_document_id' => $spalDoc->id, 'relation_type' => 'terbit_dari'],
            );
        }

        return $archived;
    }

    /** Invoice keuangan (berkop) - dari modul Keuangan. */
    public function generateFinanceInvoice(Invoice $invoice): string
    {
        $invoice->load(['customer', 'items']);
        $pdf = Pdf::loadView('pdf.finance-invoice', [
            'invoice' => $invoice,
            'lh' => $this->letterhead(),
        ])->setPaper('a4');

        $path = 'documents/INVOICE-'.preg_replace('/[^A-Za-z0-9]/', '', $invoice->number).'.pdf';
        Storage::disk('local')->put($path, $pdf->output());

        return $path;
    }

    /** Surat umum (kop + tujuan + perihal + body). */
    public function generateGenericLetter(array $data): array
    {
        $numbered = app(\App\Services\NumberingService::class)->next('SURAT_UMUM');

        $pdf = Pdf::loadView('pdf.generic-letter', [
            'lh' => $this->letterhead(),
            'number' => $numbered['number'],
            'date' => $data['date'] ?? now()->toDateString(),
            'to' => $data['to'],
            'subject' => $data['subject'],
            'body' => $data['body'],
            'signer' => $data['signer'] ?? $this->letterhead()['director'],
            'signerTitle' => $data['signer_title'] ?? $this->letterhead()['director_title'],
        ])->setPaper('a4');

        $path = $this->storePdf($pdf, 'SURAT-'.preg_replace('/[^A-Za-z0-9]/', '', $numbered['number']).'.pdf');

        return $this->archiveGeneratedPdf(
            'SURAT_UMUM',
            'Surat: '.$data['subject'],
            $path,
            null,
            null,
            ['document_number' => $numbered['number'], 'category_id' => \App\Models\DocumentCategory::where('group_code', 'G')->value('id'), 'notes' => $data['body']],
        );
    }

    // ============ CREWING (materi CREWING) ============

    /** Crew List per kapal — format materi (GRT, bendera, pemilik, buku pelaut, PKL, ANT, sign on). */
    public function generateCrewList(\App\Models\Vessel $vessel): array
    {
        $rows = \App\Models\CrewAssignment::with('crew')
            ->where('vessel_id', $vessel->id)
            ->where('status', 'aktif')
            ->get()
            ->map(function ($a) {
                $crew = $a->crew;
                $book = $crew?->certificates()
                    ->where('cert_type', 'buku_pelaut')
                    ->orderByDesc('expiry_date')
                    ->first();

                return [
                    'name' => $crew?->name ?? '—',
                    'rank' => $a->role,
                    'buku_no' => $book?->number ?? $crew?->buku_no ?? null,
                    'buku_exp' => $book?->expiry_date?->format('d/m/Y') ?? null,
                    'no_pkl' => $crew?->no_pkl,
                    'ant' => $crew?->sccw,
                    'seafarer_code' => $crew?->seafarer_code,
                    'sign_on' => $a->start_date ? \Carbon\Carbon::parse($a->start_date)->format('d/m/Y') : null,
                ];
            })
            ->values()
            ->all();

        $pdf = Pdf::loadView('pdf.crew-list', [
            'vessel' => $vessel,
            'rows' => $rows,
            'lh' => $this->letterhead(),
        ])->setPaper('a4');

        $path = $this->storePdf($pdf, 'CREW-LIST-'.preg_replace('/[^A-Za-z0-9]/', '', $vessel->vessel_name).'-'.now()->format('Ymd').'.pdf');

        return $this->archiveGeneratedPdf(
            'CREW_LIST',
            'Crew List - '.$vessel->vessel_name,
            $path,
            null,
            $vessel->id,
            ['category_id' => \App\Models\DocumentCategory::where('group_code', 'D')->value('id'),
                'notes' => 'Cetak roster awak kapal ('.count($rows).' orang).'],
        );
    }

    /** Surat Pemberhentian Awak Kapal (MUTASI OFF) — materi CREWING/MUT OFF. */
    public function generateCrewMutasiOff(\App\Models\CrewMovement $movement): array
    {
        $movement->load(['crew', 'vessel', 'replacementCrew']);
        $reason = \App\Enums\CrewOffReason::fromLabel($movement->reason);

        $pdf = Pdf::loadView('pdf.crew-mutasi-off', [
            'movement' => $movement,
            'crew' => $movement->crew,
            'vessel' => $movement->vessel,
            'reasonLabel' => $movement->reason ?: $reason->label(),
            'place' => 'Samarinda',
            'signerTitle' => 'Manajemen',
            'lh' => $this->letterhead(),
        ])->setPaper('a4');

        $path = $this->storePdf($pdf, 'MUTASI-OFF-'.preg_replace('/[^A-Za-z0-9]/', '', $movement->no_surat ?? 'X').'.pdf');

        return $this->archiveGeneratedPdf(
            'OFF_CREW',
            'Surat Pemberhentian AWAK KAPAL (MUTASI OFF) '.($movement->no_surat ?? ''),
            $path,
            null,
            null,
            ['document_number' => $movement->no_surat,
                'category_id' => \App\Models\DocumentCategory::where('group_code', 'D')->value('id')],
            $movement->crew_id,
        );
    }

    /** Surat Permohonan Sijil ON/OFF ke Kesyahbandaran Kelas I Samarinda — materi S. PERMOHONAN ON. */
    public function generateSijilRequest(\App\Models\SijilRequest $sijil): array
    {
        if (! $sijil->no_surat) {
            $numbered = app(\App\Services\NumberingService::class)->next('SIJIL_ON');
            $sijil->no_surat = $numbered['number'];
        }
        $sijil->save();

        $vessel = $sijil->vessel;
        $crewList = $sijil->crews()->map(fn ($c) => [
            'name' => $c->name,
            'rank' => $this->rankLabel($c->rank),
        ])->values()->all();

        $vesselTypeLabel = match ($vessel->vessel_type) {
            'tugboat' => 'Tugboat',
            'tongkang' => 'Tongkang',
            'kapal_penumpang' => 'Kapal Penumpang',
            default => ucfirst(str_replace('_', ' ', $vessel->vessel_type)),
        };

        $pdf = Pdf::loadView('pdf.sijil-request', [
            'sijil' => $sijil,
            'vessel' => $vessel,
            'crewList' => $crewList,
            'vesselTypeLabel' => $vesselTypeLabel,
            'place' => 'Samarinda',
            'lh' => $this->letterhead(),
        ])->setPaper('a4');

        $path = $this->storePdf($pdf, 'SIJIL-'.strtoupper($sijil->kind).'-'.preg_replace('/[^A-Za-z0-9]/', '', $sijil->no_surat).'.pdf');

        $archived = $this->archiveGeneratedPdf(
            'SIJIL_ON',
            'Surat Permohonan Sijil '.strtoupper($sijil->kind).' - '.($vessel->vessel_name ?? ''),
            $path,
            null,
            null,
            ['document_number' => $sijil->no_surat,
                'category_id' => \App\Models\DocumentCategory::where('group_code', 'E')->value('id')],
        );
        $sijil->update(['document_id' => $archived['document']->id, 'status' => 'terbit']);

        return $archived;
    }

    /** Surat Kadet ON (Prala) / OFF (selesai PK) — materi Format crew ON OFF kadet. */
    public function generateKadetLetter(\App\Models\CrewMovement $movement, string $kind): array
    {
        $movement->load(['crew', 'vessel']);
        $template = $kind === 'on' ? 'KADET_ON' : 'KADET_OFF';
        if (! $movement->no_surat) {
            $numbered = app(\App\Services\NumberingService::class)->next($template);
            $movement->no_surat = $numbered['number'];
            $movement->save();
        }

        $pdf = Pdf::loadView($kind === 'on' ? 'pdf.kadet-on' : 'pdf.kadet-off', [
            'movement' => $movement,
            'crew' => $movement->crew,
            'vessel' => $movement->vessel,
            'place' => 'Samarinda',
            'lh' => $this->letterhead(),
        ])->setPaper('a4');

        $path = $this->storePdf($pdf, 'KADET-'.strtoupper($kind).'-'.preg_replace('/[^A-Za-z0-9]/', '', $movement->no_surat).'.pdf');

        $archived = $this->archiveGeneratedPdf(
            $kind === 'on' ? 'KADET_ON' : 'KADET_OFF',
            ($kind === 'on' ? 'Surat Pengangkatan Taruna (Prala) ' : 'Mutasi OFF Kadet (Selesai PK) ').($movement->no_surat ?? ''),
            $path,
            null,
            null,
            ['document_number' => $movement->no_surat,
                'category_id' => \App\Models\DocumentCategory::where('group_code', 'D')->value('id')],
            $movement->crew_id,
        );

        return $archived;
    }

    /** Surat Kuasa PKL (Direktur H. Syarif) — materi S. KUASA PKL. */
    public function generateKuasaPkl(array $data): array
    {
        $vesselName = $data['vessel_name'] ?? '';
        $kodeKapal = 'TB.00';
        if (preg_match('/^(TB|BG|KM)\s+(?:Syukur\s+)?(\w+)/i', $vesselName, $m)) {
            $kodeKapal = strtoupper($m[1]).'.'.strtoupper($m[2]);
        }
        $numbered = app(\App\Services\NumberingService::class)->next('KUASA_PKL', ['{kode_kapal}' => $kodeKapal]);

        $pdf = Pdf::loadView('pdf.kuasa-pkl', [
            'number' => $numbered['number'],
            'date' => $data['date'] ?? now()->toDateString(),
            'place' => 'Samarinda',
            'attorney' => $data['attorney'] ?? 'H. Ariyanto',
            'attorneyTitle' => $data['attorney_title'] ?? 'Kepala Operasional',
            'crewName' => $data['crew_name'] ?? '—',
            'vesselName' => $vesselName ?: '—',
            'lh' => $this->letterhead(),
        ])->setPaper('a4');

        $path = $this->storePdf($pdf, 'KUASA-PKL-'.preg_replace('/[^A-Za-z0-9]/', '', $numbered['number']).'.pdf');

        return $this->archiveGeneratedPdf(
            'KUASA_PKL',
            'Surat Kuasa PKL '.$numbered['number'],
            $path,
            null,
            $data['vessel_id'] ?? null,
            ['document_number' => $numbered['number'],
                'category_id' => \App\Models\DocumentCategory::where('group_code', 'D')->value('id')],
        );
    }

    private function rankLabel(string $rank): string
    {
        foreach (\App\Enums\CrewRank::cases() as $r) {
            if ($r->value === $rank) {
                return $r->label();
            }
        }
        return $rank;
    }
}
