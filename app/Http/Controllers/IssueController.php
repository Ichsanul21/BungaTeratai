<?php

namespace App\Http\Controllers;

use App\Exports\MasterTrackerExport;
use App\Exports\MonthlyReportExport;
use App\Exports\OutstandingExport;
use App\Exports\RekapNotaExport;
use App\Models\AgencyAppointment;
use App\Models\Document;
use App\Models\Invoice;
use App\Models\PurchaseOrder;
use App\Models\Voyage;
use App\Services\Generators\DocumentGeneratorService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Maatwebsite\Excel\Facades\Excel;

/**
 * Penerbitan dokumen (Fase C) — generate PDF/Excel + autosimpan ke arsip.
 */
class IssueController extends Controller
{
    public function __construct(private DocumentGeneratorService $generator) {}

    // ---------- PDF ----------

    public function spal(Voyage $voyage)
    {
        abort_unless($voyage->spal_number, 422, 'Nomor SPAL belum ditentukan — edit perjalanan terlebih dahulu.');

        $result = $this->generator->generateSpal($voyage);

        return Storage::disk('local')->download($result['path'], preg_replace('/[^A-Za-z0-9._-]+/', '_', 'SPAL '.($voyage->spal_number ?? 'Voyage')).'.pdf');
    }

    public function agency(AgencyAppointment $agency)
    {
        $result = $this->generator->generateAgency($agency);

        return Storage::disk('local')->download($result['path'], preg_replace('/[^A-Za-z0-9._-]+/', '_', 'Keagenan '.($agency->letter_no ?? '')).'.pdf');
    }

    public function po(PurchaseOrder $po)
    {
        $result = $this->generator->generatePo($po);

        return Storage::disk('local')->download($result['path'], preg_replace('/[^A-Za-z0-9._-]+/', '_', 'PO '.$po->po_number).'.pdf');
    }

    public function charterInvoice(Request $request, Invoice $invoice)
    {
        Gate::authorize('finance.manage');

        $request->validate(['kind' => ['required', 'in:dp,pelunasan,dp100']]);
        $kind = $request->string('kind')->toString();

        abort_unless($invoice->voyage_id, 422, 'Invoice ini bukan invoice charter (tidak tertaut voyage).');

        if ($kind === 'pelunasan' && ! Invoice::where('voyage_id', $invoice->voyage_id)->exists()) {
            // tetap izinkan — DSR divalidasi via voyage
        }

        $result = $this->generator->generateCharterInvoice($invoice, $kind);

        return Storage::disk('local')->download($result['path'], preg_replace('/[^A-Za-z0-9._-]+/', '_', 'Invoice Charter '.$invoice->number).'.pdf');
    }

    public function financeInvoice(Invoice $invoice)
    {
        Gate::authorize('finance.manage');

        $path = $this->generator->generateFinanceInvoice($invoice);

        return Storage::disk('local')->download($path, preg_replace('/[^A-Za-z0-9._-]+/', '_', 'Invoice '.$invoice->number).'.pdf');
    }

    public function storeGenericLetter(Request $request)
    {
        $this->authorize('create', Document::class);

        $data = $request->validate([
            'to' => ['required', 'string', 'max:240'],
            'subject' => ['required', 'string', 'max:240'],
            'body' => ['required', 'string', 'max:5000'],
            'date' => ['nullable', 'date'],
            'signer' => ['nullable', 'string', 'max:120'],
            'signer_title' => ['nullable', 'string', 'max:80'],
        ]);

        $result = $this->generator->generateGenericLetter($data);

        return redirect()->route('documents.show', $result['document'])
            ->with('success', 'Surat umum diterbitkan & diarsipkan — silakan unduh PDF-nya.');
    }

    // ---------- EXCEL / LAPORAN ----------

    public function exportMasterTracker()
    {
        return Excel::download(new MasterTrackerExport, 'TB BG Master Tracker '.now()->format('Y-m').'.xlsx');
    }

    public function exportMonthly(Request $request)
    {
        $period = $request->string('period')->toString() ?: now()->format('Y-m');

        return Excel::download(new MonthlyReportExport($period), 'Monthly Document Report '.$period.'.xlsx');
    }

    public function exportRekapNota(Request $request)
    {
        $from = $request->string('from')->toString() ?: now()->startOfYear()->toDateString();
        $to = $request->string('to')->toString() ?: now()->toDateString();

        return Excel::download(new RekapNotaExport($from, $to), 'Rekap Nota '.now()->format('Y-m-d').'.xlsx');
    }

    public function exportOutstanding()
    {
        return Excel::download(new OutstandingExport, 'OUTSTANDING '.now()->format('Y-m-d').'.xlsx');
    }

    // ---------- PDF CREWING (materi CREWING) ----------

    /** Surat Pemberhentian Awak Kapal (MUTASI OFF). */
    public function crewOffLetter(\App\Models\CrewMovement $movement)
    {
        Gate::authorize('menu.hr');

        $result = $this->generator->generateCrewMutasiOff($movement);

        return Storage::disk('local')->download(
            $result['path'],
            preg_replace('/[^A-Za-z0-9._-]+/', '_', 'Mutasi OFF '.($movement->no_surat ?? 'X')).'.pdf'
        );
    }

    /** Surat Permohonan Sijil ON/OFF ke Kesyahbandaran Kelas I Samarinda. */
    public function sijil(\App\Models\SijilRequest $sijil)
    {
        Gate::authorize('menu.hr');

        $result = $this->generator->generateSijilRequest($sijil);

        return Storage::disk('local')->download(
            $result['path'],
            preg_replace('/[^A-Za-z0-9._-]+/', '_', 'Permohonan Sijil '.strtoupper($sijil->kind).' '.($sijil->no_surat ?? 'X')).'.pdf'
        );
    }

    /** Surat Kadet ON (Prala) / OFF (selesai PK). */
    public function kadetLetter(Request $request, \App\Models\CrewMovement $movement)
    {
        Gate::authorize('menu.hr');

        $kind = $request->string('kind')->toString() ?: 'on';
        abort_unless(in_array($kind, ['on', 'off'], true), 404);
        abort_unless(in_array($movement->type, ['kadet_on', 'kadet_off'], true), 422, 'Gerakan bukan kadet.');

        $result = $this->generator->generateKadetLetter($movement, $kind);

        return Storage::disk('local')->download(
            $result['path'],
            preg_replace('/[^A-Za-z0-9._-]+/', '_', 'Kadet '.strtoupper($kind).' '.($movement->no_surat ?? 'X')).'.pdf'
        );
    }

    /** Surat Kuasa PKL (H. Syarif). */
    public function kuasaPkl(Request $request)
    {
        Gate::authorize('menu.hr');

        $data = $request->validate([
            'vessel_name' => ['required', 'string', 'max:120'],
            'vessel_id' => ['nullable', 'exists:vessels,id'],
            'crew_name' => ['required', 'string', 'max:120'],
            'attorney' => ['nullable', 'string', 'max:120'],
            'date' => ['nullable', 'date'],
        ]);

        $result = $this->generator->generateKuasaPkl($data);

        return Storage::disk('local')->download(
            $result['path'],
            preg_replace('/[^A-Za-z0-9._-]+/', '_', 'Kuasa PKL '.($result['document']->document_number ?? '')).'.pdf'
        );
    }
}
