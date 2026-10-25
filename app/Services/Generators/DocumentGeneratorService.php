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
            'address' => 'Jl. Nahkoda No. 35, Samarinda Ilir, Kota Samarinda, Kalimantan Timur 75113',
            'phone' => '+62 812 3456 7890',
            'email' => 'bungateratai@gmail.com',
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
            'owner_type' => $ownerVesselId ? 'vessel' : 'company',
            'owner_id' => $ownerVesselId,
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
}
