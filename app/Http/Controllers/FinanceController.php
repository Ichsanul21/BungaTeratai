<?php

namespace App\Http\Controllers;

use App\Enums\BillStatus;
use App\Enums\InvoiceStatus;
use App\Models\Account;
use App\Models\Asset;
use App\Models\Bill;
use App\Models\BillPayment;
use App\Models\CashAccount;
use App\Models\CashTransaction;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\JournalEntry;
use App\Models\JournalLine;
use App\Models\Payment;
use App\Models\PaymentSchedule;
use App\Models\PayrollPeriod;
use App\Models\Supplier;
use App\Models\WithholdingTax;
use App\Services\AuditService;
use App\Services\JournalService;
use App\Services\PayrollService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class FinanceController extends Controller
{
    public function __construct(private JournalService $journal) {}

    public function index(Request $request): Response
    {
        Gate::authorize('menu.finance');

        $tab = $request->string('tab')->toString() ?: 'invoice';
        $user = auth()->user();
        $canManage = $user?->can('finance.manage') ?? false;

        $props = match ($tab) {
            'akun' => $this->akunProps(),
            'aset' => $this->asetProps(),
            'piutang' => $this->piutangProps(),
            'hutang' => $this->hutangProps(),
            'jadwal' => $this->jadwalProps(),
            'kas' => $this->kasProps(),
            'jurnal' => $this->jurnalProps(),
            'bb' => $this->bbProps($request->string('account')->toString() ?: '1002'),
            'lr' => $this->lrProps($request->string('from')->toString() ?: now()->startOfMonth()->toDateString(), $request->string('to')->toString() ?: now()->toDateString()),
            'neraca' => $this->neracaProps($request->string('asof')->toString() ?: now()->toDateString()),
            'pl' => $this->plProps(),
            'pajak' => $this->pajakProps($request->string('period')->toString() ?: now()->format('Y-m')),
            'po' => $this->poProps(),
            'payroll' => $this->payrollProps(),
            default => $this->invoiceProps(),
        };

        return Inertia::render('Finance/Index', [
            'tab' => $tab,
            'canManage' => $canManage,
            'customers' => Customer::orderBy('name')->get(['id', 'name']),
            'suppliers' => Supplier::orderBy('name')->get(['id', 'name', 'category']),
            'voyagesList' => \App\Models\Voyage::orderByDesc('id')->limit(60)
                ->get(['id', 'voyage_code', 'origin', 'destination']),
            'cashAccounts' => CashAccount::get(['id', 'name', 'type', 'balance']),
            'serviceCatalog' => \App\Models\ServiceCatalog::get(['id', 'name', 'kind', 'default_price']),
            'accounts' => Account::orderBy('code')->get(['id', 'code', 'name', 'type', 'normal_balance']),
            'assets' => Asset::orderBy('name')->get(['id', 'name', 'category', 'acquisition_cost', 'acquisition_date', 'useful_life_months', 'accumulated_depreciation', 'salvage_value', 'status']),
            ...$props,
        ]);
    }

    private function akunProps(): array
    {
        return [
            'accounts' => Account::orderBy('code')->get(),
        ];
    }

    private function asetProps(): array
    {
        return [
            'assets' => Asset::orderBy('name')->get()->map(fn ($a) => [
                'id' => $a->id,
                'name' => $a->name,
                'category' => $a->category,
                'acquisition_cost' => $a->acquisition_cost,
                'acquisition_date' => $a->acquisition_date,
                'useful_life_months' => $a->useful_life_months,
                'salvage_value' => $a->salvage_value,
                'accumulated_depreciation' => $a->accumulated_depreciation,
                'status' => $a->status,
            ]),
        ];
    }

    private function invoiceProps(): array
    {
        return [
            'invoices' => Invoice::with('customer')->orderByDesc('id')->limit(50)->get()->map(fn ($i) => [
                'id' => $i->id,
                'number' => $i->number,
                'customer_id' => $i->customer_id,
                'voyage_id' => $i->voyage_id,
                'notes' => $i->notes,
                'customer_name' => $i->customer?->name,
                'issue_date' => $i->issue_date,
                'last_payment_id' => $i->payments()->latest('id')->value('id'),
                'due_date' => $i->due_date,
                'status' => $i->status,
                'subtotal' => $i->subtotal,
                'ppn_amount' => $i->ppn_amount,
                'pph23_amount' => $i->pph23_amount,
                'total' => $i->total,
                'paid_amount' => $i->paid_amount,
            ]),
        ];
    }

    private function piutangProps(): array
    {
        $invoices = Invoice::with('customer')->whereIn('status', ['unpaid', 'partial'])->orderBy('due_date')->get();

        $aging = ['jatuh_tempo' => 0, 'lebih_30' => 0, 'lebih_60' => 0, 'lebih_90' => 0];
        foreach ($invoices as $inv) {
            $sisa = (float) $inv->total - (float) $inv->paid_amount;
            $days = $inv->due_date ? now()->diffInDays($inv->due_date, false) : 0;
            // days negatif = lewat tempo
            $key = match (true) {
                $days >= 0 => 'jatuh_tempo',
                $days >= -30 => 'lebih_30',
                $days >= -60 => 'lebih_60',
                default => 'lebih_90',
            };
            $aging[$key] += $sisa;
        }

        return [
            'openInvoices' => $invoices->map(fn ($i) => [
                'id' => $i->id,
                'number' => $i->number,
                'customer_id' => $i->customer_id,
                'voyage_id' => $i->voyage_id,
                'notes' => $i->notes,
                'customer_name' => $i->customer?->name,
                'due_date' => $i->due_date,
                'total' => $i->total,
                'paid_amount' => $i->paid_amount,
                'sisa' => (float) $i->total - (float) $i->paid_amount,
                'hari_lewat' => $i->due_date ? max(0, now()->diffInDays($i->due_date, false) * -1) : 0,
            ]),
            'aging' => $aging,
        ];
    }

    private function hutangProps(): array
    {
        $bills = Bill::with('supplier')->whereIn('status', ['unpaid', 'partial'])->orderBy('due_date')->get();

        $aging = ['jatuh_tempo' => 0, 'lebih_30' => 0, 'lebih_60' => 0, 'lebih_90' => 0];
        foreach ($bills as $bill) {
            $sisa = (float) $bill->total - (float) $bill->paid_amount;
            $days = $bill->due_date ? now()->diffInDays($bill->due_date, false) : 0;
            $key = match (true) {
                $days >= 0 => 'jatuh_tempo',
                $days >= -30 => 'lebih_30',
                $days >= -60 => 'lebih_60',
                default => 'lebih_90',
            };
            $aging[$key] += $sisa;
        }

        return [
            'openBills' => $bills->map(fn ($b) => [
                'id' => $b->id,
                'number' => $b->number,
                'supplier_id' => $b->supplier_id,
                'voyage_id' => $b->voyage_id,
                'issue_date' => $b->issue_date,
                'pph_type' => $b->pph_type,
                'notes' => $b->notes,
                'supplier_name' => $b->supplier?->name,
                'category' => $b->category,
                'last_payment_id' => $b->payments()->latest('id')->value('id'),
                'last_cheque' => $b->payments()->latest('id')->value('cheque_number'),
                'due_date' => $b->due_date,
                'total' => $b->total,
                'paid_amount' => $b->paid_amount,
                'sisa' => (float) $b->total - (float) $b->paid_amount,
                'voyage_code' => $b->voyage_id ? \App\Models\Voyage::find($b->voyage_id)?->voyage_code : null,
            ]),
            'aging' => $aging,
            'assistTotal' => (float) Bill::where('category', 'assist')->sum('total'),
        ];
    }

    private function jadwalProps(): array
    {
        return [
            'schedules' => PaymentSchedule::orderBy('due_date')->limit(80)->get()->map(fn ($s) => [
                'id' => $s->id,
                'ref_type' => $s->ref_type,
                'description' => $s->description,
                'due_date' => $s->due_date,
                'amount' => $s->amount,
                'status' => $s->due_date->isPast() && $s->status !== 'lunas' ? 'telat' : $s->status,
            ]),
        ];
    }

    private function kasProps(): array
    {
        return [
            'cashAccounts' => CashAccount::with('account')->get()->map(fn ($c) => [
                'id' => $c->id,
                'name' => $c->name,
                'type' => $c->type,
                'account_number' => $c->account_number,
                'balance' => $c->balance,
            ]),
            'cashTransactions' => CashTransaction::orderByDesc('date')->orderByDesc('id')->limit(60)->get()
                ->map(fn ($t) => [
                    'id' => $t->id,
                    'cash_account_id' => $t->cash_account_id,
                    'account_name' => $t->cashAccount?->name,
                    'direction' => $t->direction,
                    'amount' => $t->amount,
                    'date' => $t->date,
                    'category' => $t->category,
                    'reference' => $t->reference,
                    'notes' => $t->notes,
                ]),
        ];
    }

    private function jurnalProps(): array
    {
        return [
            'entries' => JournalEntry::with(['lines.account', 'user'])->orderByDesc('entry_date')->orderByDesc('id')->limit(50)->get()
                ->map(fn ($e) => [
                    'id' => $e->id,
                    'entry_date' => $e->entry_date,
                    'memo' => $e->memo,
                    'source_type' => $e->source_type,
                    'posted_by' => $e->user?->name,
                    'total' => (float) $e->lines()->sum('debit'),
                    'lines' => $e->lines->map(fn ($l) => [
                        'account_code' => $l->account?->code,
                        'account_name' => $l->account?->name,
                        'debit' => $l->debit,
                        'credit' => $l->credit,
                    ]),
                ]),
        ];
    }

    private function bbProps(string $accountCode): array
    {
        $account = Account::where('code', $accountCode)->first() ?? Account::first();
        $lines = JournalLine::where('account_id', $account->id)
            ->with('entry')
            ->orderByDesc('id')->limit(100)->get()
            ->map(fn ($l) => [
                'id' => $l->id,
                'entry_date' => $l->entry?->entry_date,
                'memo' => $l->entry?->memo,
                'debit' => $l->debit,
                'credit' => $l->credit,
            ]);

        return [
            'bbAccount' => ['id' => $account->id, 'code' => $account->code, 'name' => $account->name],
            'bbAccounts' => Account::orderBy('code')->get(['id', 'code', 'name', 'type']),
            'bbLines' => $lines,
            'bbBalance' => $this->journal->accountBalance($account->id),
        ];
    }

    private function lrProps(string $from, string $to): array
    {
        $sumType = function (string $type, string $from, string $to) {
            $total = 0.0;
            foreach (Account::where('type', $type)->get() as $acc) {
                $lines = JournalLine::where('account_id', $acc->id)
                    ->whereHas('entry', fn ($e) => $e->whereBetween('entry_date', [$from, $to]));
                $d = (clone $lines)->sum('debit');
                $c = (clone $lines)->sum('credit');
                $val = $acc->normal_balance === 'credit' ? $c - $d : $d - $c;
                $total += $val;
            }

            return $total;
        };

        return [
            'lrPeriod' => ['from' => $from, 'to' => $to],
            'pendapatan' => $sumType('revenue', $from, $to),
            'beban' => $sumType('expense', $from, $to),
        ];
    }

    private function neracaProps(string $asof): array
    {
        $rows = [];
        foreach (['asset', 'liability', 'equity'] as $type) {
            foreach (Account::where('type', $type)->orderBy('code')->get() as $acc) {
                $bal = $this->journal->accountBalance($acc->id, $asof);
                if (abs($bal) > 0.01) {
                    $rows[] = ['code' => $acc->code, 'name' => $acc->name, 'type' => $type, 'balance' => $bal];
                }
            }
        }

        // Laba berjalan tahun berjalan = revenue âˆ’ expense s/d asof
        $lr = $this->lrProps(now()->startOfYear()->toDateString(), $asof);
        $laba = $lr['pendapatan'] - $lr['beban'];

        return [
            'neracaAsof' => $asof,
            'neracaRows' => $rows,
            'labaBerjalan' => $laba,
        ];
    }

    private function plProps(): array
    {
        $revenues = [];
        $expenses = [];
        foreach (Account::where('type', 'revenue')->orderBy('code')->get() as $acc) {
            $bal = $this->journal->accountBalance($acc->id);
            if (abs($bal) > 0.01) {
                $revenues[] = ['code' => $acc->code, 'name' => $acc->name, 'amount' => $bal];
            }
        }
        foreach (Account::where('type', 'expense')->orderBy('code')->get() as $acc) {
            $bal = $this->journal->accountBalance($acc->id);
            if (abs($bal) > 0.01) {
                $expenses[] = ['code' => $acc->code, 'name' => $acc->name, 'amount' => $bal];
            }
        }

        $voyages = \App\Models\Voyage::orderByDesc('id')->limit(40)->get()->map(function ($v) {
            $income = (float) $v->invoices()->sum('total');
            $cost = (float) $v->bills()->sum('total') + (float) $v->fuelLogs()->sum('cost');

            return [
                'id' => $v->id,
                'voyage_code' => $v->voyage_code,
                'vessel_name' => $v->vessel?->vessel_name,
                'route' => $v->origin.' â†’ '.$v->destination,
                'income' => $income,
                'cost' => $cost,
                'profit' => $income - $cost,
                'margin' => $income > 0 ? round((($income - $cost) / $income) * 100, 1) : null,
            ];
        });

        return ['revenues' => $revenues, 'expenses' => $expenses, 'projectPL' => $voyages];
    }

    private function pajakProps(string $period): array
    {
        $ppnKeluaran = (float) Invoice::whereMonth('issue_date', substr($period, 5, 2))
            ->whereYear('issue_date', substr($period, 0, 4))->sum('ppn_amount');
        $ppnMasukan = (float) Bill::whereMonth('issue_date', substr($period, 5, 2))
            ->whereYear('issue_date', substr($period, 0, 4))->sum('ppn_amount');
        $pph23 = (float) Invoice::whereMonth('issue_date', substr($period, 5, 2))
            ->whereYear('issue_date', substr($period, 0, 4))->sum('pph23_amount');

        return [
            'pajakPeriod' => $period,
            'ppnKeluaran' => $ppnKeluaran,
            'ppnMasukan' => $ppnMasukan,
            'ppnNet' => $ppnKeluaran - $ppnMasukan,
            'pph23Kutip' => $pph23,
            'withholdings' => WithholdingTax::orderByDesc('date')->limit(50)->get()->map(fn ($w) => [
                'id' => $w->id,
                'type' => $w->type,
                'date' => $w->date,
                'base_amount' => $w->base_amount,
                'rate' => $w->rate,
                'tax_amount' => $w->tax_amount,
                'counterparty' => $w->counterparty,
                'status' => $w->status,
            ]),
        ];
    }

    private function payrollProps(): array
    {
        return [
            'payrollPeriods' => PayrollPeriod::withCount('entries')->orderByDesc('year_month')->limit(24)->get()
                ->map(fn ($p) => [
                    'id' => $p->id,
                    'year_month' => $p->year_month,
                    'status' => $p->status,
                    'entries_count' => $p->entries_count,
                    'total' => (float) $p->entries()->sum('total'),
                    'pph21' => (float) $p->entries()->sum('pph21'),
                    'entries' => $p->status === 'draft' ? $p->entries()->limit(60)->get()->map(fn ($e) => ['id' => $e->id, 'person_name' => $e->person_name, 'person_type' => $e->person_type, 'gaji_pokok' => $e->gaji_pokok, 'tunjangan' => $e->tunjangan, 'borongan_insentif' => $e->borongan_insentif, 'potongan_lain' => $e->potongan_lain, 'bpjs' => $e->bpjs, 'pph21' => $e->pph21, 'total' => $e->total]) : [],
                ]),
        ];
    }

    // ======================= ACTIONS =======================

    public function storeInvoice(Request $request)
    {
        Gate::authorize('finance.manage');

        $data = $request->validate([
            'customer_id' => ['required', 'exists:customers,id'],
            'voyage_id' => ['nullable', 'exists:voyages,id'],
            'issue_date' => ['required', 'date'],
            'due_date' => ['nullable', 'date'],
            'pph23' => ['required', 'boolean'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.description' => ['required', 'string', 'max:200'],
            'items.*.qty' => ['required', 'numeric', 'min:0.01'],
            'items.*.price' => ['required', 'numeric', 'min:0'],
        ]);

        $invoice = DB::transaction(function () use ($data) {
            $subtotal = collect($data['items'])->sum(fn ($i) => $i['qty'] * $i['price']);
            $ppn = round($subtotal * 0.11);
            $pph23 = $data['pph23'] ? round($subtotal * 0.02) : 0.0;
            $total = $subtotal + $ppn - $pph23;

            $invoice = Invoice::create([
                'number' => $this->nextNumber('INV'),
                'customer_id' => $data['customer_id'],
                'voyage_id' => $data['voyage_id'] ?? null,
                'issue_date' => $data['issue_date'],
                'due_date' => $data['due_date'] ?? null,
                'status' => InvoiceStatus::Unpaid->value,
                'subtotal' => $subtotal,
                'ppn_rate' => 11,
                'ppn_amount' => $ppn,
                'pph23_amount' => $pph23,
                'total' => $total,
                'notes' => $data['notes'] ?? null,
                'created_by' => auth()->id(),
            ]);

            foreach ($data['items'] as $item) {
                InvoiceItem::create([
                    'invoice_id' => $invoice->id,
                    'description' => $item['description'],
                    'qty' => $item['qty'],
                    'price' => $item['price'],
                    'amount' => $item['qty'] * $item['price'],
                ]);
            }

            // Jurnal: piutang = netto; pendapatan = subtotal; PPN = hutang pajak; PPh 23 ditahan customer
            $this->journal->post(
                [
                    ['account' => '1100', 'debit' => $total],
                    ...( $pph23 > 0 ? [['account' => '2101', 'debit' => $pph23]] : [] ),
                    ['account' => '4300', 'credit' => $subtotal],
                    ...( $ppn > 0 ? [['account' => '2101', 'credit' => $ppn]] : [] ),
                ],
                "Invoice {$invoice->number}",
                'invoice',
                $invoice->id,
                $data['issue_date'],
            );

            if ($pph23 > 0) {
                WithholdingTax::create([
                    'type' => 'pph23',
                    'period' => substr($data['issue_date'], 0, 7),
                    'date' => $data['issue_date'],
                    'base_amount' => $subtotal,
                    'rate' => 2,
                    'tax_amount' => $pph23,
                    'counterparty' => Customer::find($data['customer_id'])?->name,
                    'ref_type' => 'invoice',
                    'ref_id' => $invoice->id,
                    'status' => 'tercatat',
                ]);
            }

            return $invoice;
        });

        AuditService::log('created', 'invoice', $invoice->id, null, $data, "Invoice baru {$invoice->number}");

        return back()->with('success', "Invoice {$invoice->number} dibuat (total ".number_format($invoice->total, 0, ',', '.').").");
    }

    public function payInvoice(Request $request, Invoice $invoice)
    {
        Gate::authorize('finance.manage');

        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:1'],
            'cash_account_id' => ['required', 'exists:cash_accounts,id'],
            'date' => ['required', 'date'],
            'method' => ['nullable', 'in:transfer,cash,giro'],
            'reference' => ['nullable', 'string', 'max:80'],
            'cheque_number' => ['nullable', 'string', 'max:60'],
        ]);

        $sisa = (float) $invoice->total - (float) $invoice->paid_amount;
        if ($data['amount'] > $sisa + 0.01) {
            return back()->with('error', 'Jumlah pembayaran melebihi sisa tagihan.');
        }

        DB::transaction(function () use ($data, $invoice) {
            Payment::create([
                'invoice_id' => $invoice->id,
                'date' => $data['date'],
                'amount' => $data['amount'],
                'method' => $data['method'] ?? 'transfer',
                'reference' => $data['reference'] ?? null,
                'cash_account_id' => $data['cash_account_id'],
            ]);

            $paid = (float) $invoice->paid_amount + (float) $data['amount'];
            $invoice->update([
                'paid_amount' => $paid,
                'status' => $paid >= (float) $invoice->total - 0.01
                    ? InvoiceStatus::Paid->value
                    : InvoiceStatus::Partial->value,
            ]);

            $cash = CashAccount::findOrFail($data['cash_account_id']);
            $cash->increment('balance', $data['amount']);
            CashTransaction::create([
                'cash_account_id' => $cash->id,
                'direction' => 'in',
                'amount' => $data['amount'],
                'date' => $data['date'],
                'category' => 'pendapatan',
                'reference' => $invoice->number,
                'created_by' => auth()->id(),
            ]);

            $entry = $this->journal->post(
                [
                    ['account' => $this->cashCode($cash), 'debit' => (float) $data['amount']],
                    ['account' => '1100', 'credit' => (float) $data['amount']],
                ],
                "Pembayaran invoice {$invoice->number}",
                'payment',
                $invoice->id,
                $data['date'],
            );
            CashTransaction::where('cash_account_id', $cash->id)
                ->where('reference', $invoice->number)
                ->whereNull('journal_entry_id')
                ->update(['journal_entry_id' => $entry->id]);
            Payment::where('invoice_id', $invoice->id)
                ->where('journal_entry_id', null)
                ->orderByDesc('id')->limit(1)
                ->update(['journal_entry_id' => $entry->id]);
        });

        return back()->with('success', 'Pembayaran tersimpan & jurnal dibuat.');
    }

    public function storeBill(Request $request)
    {
        Gate::authorize('finance.manage');

        $data = $request->validate([
            'supplier_id' => ['required', 'exists:suppliers,id'],
            'voyage_id' => ['nullable', 'exists:voyages,id'],
            'category' => ['required', 'string', 'max:60'],
            'issue_date' => ['required', 'date'],
            'due_date' => ['nullable', 'date'],
            'pph_type' => ['nullable', 'in:pph23,pph4(2)'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.description' => ['required', 'string', 'max:200'],
            'items.*.amount' => ['required', 'numeric', 'min:0.01'],
        ]);

        $bill = DB::transaction(function () use ($data) {
            $subtotal = collect($data['items'])->sum(fn ($i) => $i['amount']);
            $ppn = round($subtotal * 0.11);
            $rate = ($data['pph_type'] ?? null) === 'pph4(2)' ? 2.5 : (($data['pph_type'] ?? null) === 'pph23' ? 2 : 0);
            $pph = round($subtotal * $rate / 100);
            $total = $subtotal + $ppn - $pph;

            $desc = collect($data['items'])->pluck('description')->implode(', ');

            $bill = Bill::create([
                'number' => $this->nextNumber('BILL'),
                'supplier_id' => $data['supplier_id'],
                'voyage_id' => $data['voyage_id'] ?? null,
                'category' => $data['category'],
                'issue_date' => $data['issue_date'],
                'due_date' => $data['due_date'] ?? null,
                'status' => BillStatus::Unpaid->value,
                'subtotal' => $subtotal,
                'ppn_amount' => $ppn,
                'pph_withheld' => $pph,
                'pph_type' => $data['pph_type'] ?? null,
                'total' => $total,
                'notes' => ($data['notes'] ?? null) ? $data['notes'].' â€” '.$desc : $desc,
            ]);

            // Beban: assist â†’ 5300, drydock/sparepart/bengkel â†’ 5100, bbm â†’ 5000, sewa â†’ 5400, lainnya â†’ 5900
            $expenseCode = match ($data['category']) {
                'assist' => '5300',
                'bbm' => '5000',
                'sewa' => '5400',
                'sparepart', 'drydock', 'jasa_bengkel', 'servis' => '5100',
                default => '5900',
            };

            $this->journal->post(
                [
                    ['account' => $expenseCode, 'debit' => $subtotal],
                    ...( $ppn > 0 ? [['account' => '1200', 'debit' => $ppn]] : [] ), // PPN masukan
                    ['account' => '2100', 'credit' => $total],                         // hutang usaha (netto)
                    ...( $pph > 0 ? [['account' => '2101', 'credit' => $pph]] : [] ), // PPh ditahan â†’ hutang pajak
                ],
                "Bill {$bill->number} â€” {$desc}",
                'bill',
                $bill->id,
                $data['issue_date'],
            );

            if ($pph > 0) {
                WithholdingTax::create([
                    'type' => $data['pph_type'] ?? 'pph23',
                    'period' => substr($data['issue_date'], 0, 7),
                    'date' => $data['issue_date'],
                    'base_amount' => $subtotal,
                    'rate' => $rate,
                    'tax_amount' => $pph,
                    'counterparty' => Supplier::find($data['supplier_id'])?->name,
                    'ref_type' => 'bill',
                    'ref_id' => $bill->id,
                    'status' => 'tercatat',
                ]);
            }

            PaymentSchedule::create([
                'ref_type' => 'bill',
                'ref_id' => $bill->id,
                'due_date' => $data['due_date'] ?? $data['issue_date'],
                'amount' => $total,
                'description' => "Bayar bill {$bill->number} â€” {$desc}",
                'status' => 'menunggu',
            ]);

            return $bill;
        });

        AuditService::log('created', 'bill', $bill->id, null, $data, "Bill baru {$bill->number} ({$data['category']})");

        return back()->with('success', "Bill {$bill->number} tersimpan & masuk Jadwal Bayar.");
    }

    public function payBill(Request $request, Bill $bill)
    {
        Gate::authorize('finance.manage');

        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:1'],
            'cash_account_id' => ['required', 'exists:cash_accounts,id'],
            'date' => ['required', 'date'],
            'method' => ['nullable', 'in:transfer,cash,giro'],
            'cheque_number' => ['nullable', 'string', 'max:60'],
        ]);

        $sisa = (float) $bill->total - (float) $bill->paid_amount;
        if ($data['amount'] > $sisa + 0.01) {
            return back()->with('error', 'Jumlah pembayaran melebihi sisa tagihan.');
        }

        DB::transaction(function () use ($data, $bill) {
            BillPayment::create([
                'bill_id' => $bill->id,
                'date' => $data['date'],
                'amount' => $data['amount'],
                'method' => $data['method'] ?? 'transfer',
                'cheque_number' => $data['cheque_number'] ?? null,
                'cash_account_id' => $data['cash_account_id'],
            ]);

            $paid = (float) $bill->paid_amount + (float) $data['amount'];
            $bill->update([
                'paid_amount' => $paid,
                'status' => $paid >= (float) $bill->total - 0.01
                    ? BillStatus::Paid->value
                    : BillStatus::Partial->value,
            ]);

            $cash = CashAccount::findOrFail($data['cash_account_id']);
            $cash->decrement('balance', $data['amount']);
            CashTransaction::create([
                'cash_account_id' => $cash->id,
                'direction' => 'out',
                'amount' => $data['amount'],
                'date' => $data['date'],
                'category' => $bill->category,
                'reference' => $bill->number,
                'created_by' => auth()->id(),
            ]);

            $billEntry = $this->journal->post(
                [
                    ['account' => '2100', 'debit' => (float) $data['amount']],
                    ['account' => $this->cashCode($cash), 'credit' => (float) $data['amount']],
                ],
                "Pembayaran bill {$bill->number}",
                'bill_payment',
                $bill->id,
                $data['date'],
            );
            BillPayment::where('bill_id', $bill->id)
                ->where('journal_entry_id', null)
                ->orderByDesc('id')->limit(1)
                ->update(['journal_entry_id' => $billEntry->id]);
            CashTransaction::where('cash_account_id', $cash->id)
                ->where('reference', $bill->number)
                ->whereNull('journal_entry_id')
                ->update(['journal_entry_id' => $billEntry->id]);

            PaymentSchedule::where('ref_type', 'bill')
                ->where('ref_id', $bill->id)
                ->where('status', '!=', 'lunas')
                ->update([
                    'status' => $bill->fresh()->status === BillStatus::Paid->value ? 'lunas' : 'menunggu',
                    'paid_at' => $bill->fresh()->status === BillStatus::Paid->value ? $data['date'] : null,
                ]);
        });

        return back()->with('success', 'Pembayaran bill tersimpan & jurnal dibuat.');
    }

    public function storeCash(Request $request)
    {
        Gate::authorize('finance.manage');

        $data = $request->validate([
            'cash_account_id' => ['required', 'exists:cash_accounts,id'],
            'direction' => ['required', 'in:in,out'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'date' => ['required', 'date'],
            'category' => ['nullable', 'string', 'max:60'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        DB::transaction(function () use ($data) {
            $cash = CashAccount::findOrFail($data['cash_account_id']);
            $delta = $data['direction'] === 'in' ? $data['amount'] : -$data['amount'];
            $cash->increment('balance', $delta);

            $t = CashTransaction::create([
                'cash_account_id' => $cash->id,
                'direction' => $data['direction'],
                'amount' => $data['amount'],
                'date' => $data['date'],
                'category' => $data['category'] ?? 'lainnya',
                'notes' => $data['notes'] ?? null,
                'created_by' => auth()->id(),
            ]);

            $expenseCode = $data['category'] === 'bbm' ? '5000' : ($data['category'] === 'gaji' ? '5200' : '5900');
            $entry = $this->journal->post(
                $data['direction'] === 'in'
                    ? [
                        ['account' => $this->cashCode($cash), 'debit' => (float) $data['amount']],
                        ['account' => '4300', 'credit' => (float) $data['amount']],
                    ]
                    : [
                        ['account' => $expenseCode, 'debit' => (float) $data['amount']],
                        ['account' => $this->cashCode($cash), 'credit' => (float) $data['amount']],
                    ],
                'Kas/Bank â€” '.($data['category'] ?? 'lainnya'),
                'cash',
                $t->id,
                $data['date'],
            );
            $t->update(['journal_entry_id' => $entry->id]);
        });

        return back()->with('success', 'Transaksi kas/bank tersimpan.');
    }

    public function storeJournal(Request $request)
    {
        Gate::authorize('finance.manage');

        $data = $request->validate([
            'entry_date' => ['required', 'date'],
            'memo' => ['required', 'string', 'max:200'],
            'lines' => ['required', 'array', 'min:2'],
            'lines.*.account' => ['required', 'exists:accounts,code'],
            'lines.*.debit' => ['nullable', 'numeric', 'min:0'],
            'lines.*.credit' => ['nullable', 'numeric', 'min:0'],
        ]);

        try {
            $entry = $this->journal->post($data['lines'], $data['memo'], 'manual', null, $data['entry_date']);
        } catch (\InvalidArgumentException $e) {
            return back()->with('error', $e->getMessage());
        }

        AuditService::log('created', 'journal_entry', $entry->id, null, $data, 'Jurnal manual');

        return back()->with('success', 'Jurnal manual tersimpan.');
    }

    public function generatePayroll(Request $request, PayrollPeriod $period)
    {
        Gate::authorize('finance.manage');

        $count = app(PayrollService::class)->generate($period);

        return back()->with('success', "{$count} entri payroll draft dibuat (termasuk perhitungan PPh 21).");
    }

    public function postPayroll(Request $request, PayrollPeriod $period)
    {
        Gate::authorize('finance.manage');

        if ($period->status === 'posted') {
            return back()->with('error', 'Periode sudah diposting.');
        }

        app(PayrollService::class)->post($period, '1003');

        return back()->with('success', "Payroll {$period->year_month} diposting â€” jurnal beban gaji & PPh 21 dibuat.");
    }

    public function runDepreciation(Request $request)
    {
        Gate::authorize('finance.manage');

        $period = now()->format('Y-m');
        $created = 0;

        foreach (Asset::where('status', 'aktif')->get() as $asset) {
            if (\App\Models\AssetDepreciation::where('asset_id', $asset->id)->where('period', $period)->exists()) {
                continue;
            }
            $monthly = ((float) $asset->acquisition_cost - (float) $asset->salvage_value) / max(1, $asset->useful_life_months);
            if ($monthly <= 0) {
                continue;
            }
            if ((float) $asset->accumulated_depreciation + $monthly > (float) $asset->acquisition_cost - (float) $asset->salvage_value) {
                continue;
            }

            $entry = $this->journal->post(
                [
                    ['account' => '5500', 'debit' => round($monthly, 2)],
                    ['account' => '1399', 'credit' => round($monthly, 2)],
                ],
                "Penyusutan {$asset->name} ({$period})",
                'depreciation',
                $asset->id,
                now()->toDateString(),
            );

            \App\Models\AssetDepreciation::create([
                'asset_id' => $asset->id,
                'period' => $period,
                'amount' => round($monthly, 2),
                'journal_entry_id' => $entry->id,
            ]);
            $asset->increment('accumulated_depreciation', round($monthly, 2));
            $created++;
        }

        return back()->with('success', "Jurnal penyusutan periode {$period} dibuat untuk {$created} aset.");
    }

    public function setorPajak(Request $request, WithholdingTax $tax)
    {
        Gate::authorize('finance.manage');

        if ($tax->status === 'setor') {
            return back()->with('error', 'Sudah pernah disetor.');
        }

        DB::transaction(function () use ($tax) {
            $cash = CashAccount::where('type', 'bank')->first();
            $cash->decrement('balance', $tax->tax_amount);
            CashTransaction::create([
                'cash_account_id' => $cash->id,
                'direction' => 'out',
                'amount' => $tax->tax_amount,
                'date' => now()->toDateString(),
                'category' => 'pajak',
                'reference' => strtoupper($tax->type),
                'created_by' => auth()->id(),
            ]);
            $this->journal->post(
                [
                    ['account' => '2101', 'debit' => (float) $tax->tax_amount],
                    ['account' => $this->cashCode($cash), 'credit' => (float) $tax->tax_amount],
                ],
                'Setor pajak '.strtoupper($tax->type).' periode '.($tax->period ?? '-'),
                'tax',
                $tax->id,
            );
            $tax->update(['status' => 'setor', 'paid_at' => now()->toDateString()]);
        });

        return back()->with('success', 'Setor pajak tercatat (kas & jurnal).');
    }

    private function cashCode(CashAccount $cash): string
    {
        return Account::find($cash->account_id)?->code ?? '1001';
    }

    private function nextNumber(string $prefix): string
    {
        $year = now()->year;
        $count = match ($prefix) {
            'INV' => Invoice::whereYear('created_at', $year)->count() + 1,
            default => Bill::whereYear('created_at', $year)->count() + 1,
        };

        return sprintf('%s-%d-%04d', $prefix, $year, $count);
    }

    // ===== Helper CRUD (Fase A) =====

    /** Hapus jurnal yang dihasilkan dari sebuah sumber. */
    private function deleteJournalFor(string $sourceType, int $sourceId): void
    {
        $entryIds = JournalEntry::where('source_type', $sourceType)
            ->where('source_id', $sourceId)
            ->pluck('id');
        if ($entryIds->isEmpty()) {
            return;
        }
        JournalLine::whereIn('entry_id', $entryIds)->delete();
        JournalEntry::whereIn('id', $entryIds)->delete();
    }

    /** Tulis ulang jurnal invoice (hanya bila belum ada pembayaran). */
    private function repostInvoiceJournal(Invoice $invoice): void
    {
        $this->deleteJournalFor('invoice', $invoice->id);
        $subtotal = (float) $invoice->subtotal;
        $ppn = (float) $invoice->ppn_amount;
        $pph23 = (float) $invoice->pph23_amount;
        $total = (float) $invoice->total;

        $this->journal->post(
            [
                ['account' => '1100', 'debit' => $total],
                ...( $pph23 > 0 ? [['account' => '2101', 'debit' => $pph23]] : [] ),
                ['account' => '4300', 'credit' => $subtotal],
                ...( $ppn > 0 ? [['account' => '2101', 'credit' => $ppn]] : [] ),
            ],
            "Invoice {$invoice->number} (diedit)",
            'invoice',
            $invoice->id,
            $invoice->issue_date?->toDateString() ?? now()->toDateString(),
        );
    }

    /** Sinkronkan record PPh 23 mengikuti invoice (buat/hapus). */
    private function syncInvoiceWithholding(Invoice $invoice): void
    {
        WithholdingTax::where('ref_type', 'invoice')->where('ref_id', $invoice->id)->delete();
        if ((float) $invoice->pph23_amount > 0) {
            WithholdingTax::create([
                'type' => 'pph23',
                'period' => $invoice->issue_date?->format('Y-m') ?? now()->format('Y-m'),
                'date' => $invoice->issue_date?->toDateString() ?? now()->toDateString(),
                'base_amount' => $invoice->subtotal,
                'rate' => 2,
                'tax_amount' => $invoice->pph23_amount,
                'counterparty' => $invoice->customer?->name,
                'ref_type' => 'invoice',
                'ref_id' => $invoice->id,
                'status' => 'tercatat',
            ]);
        }
    }

    /** Hapus jurnal + kas terkait sebuah pembayaran (reversal by deletion + audit). */
    private function reversePaymentJournal(?int $cashTransactionId, float $amount): void
    {
        if ($cashTransactionId) {
            $txn = CashTransaction::find($cashTransactionId);
            if ($txn) {
                $cash = CashAccount::find($txn->cash_account_id);
                if ($cash) {
                    $cash->decrement('balance', $txn->amount); // balikkan pemasukan
                }
                $this->deleteJournalFor('payment', (int) $txn->journal_entry_id ? 0 : 0); // no-op safety
                if ($txn->journal_entry_id) {
                    JournalLine::whereIn('entry_id', [$txn->journal_entry_id])->delete();
                    JournalEntry::where('id', $txn->journal_entry_id)->delete();
                }
                $txn->delete();
            }
        }
    }

    // ===== Edit / Hapus (Fase A — aturan Aman) =====

    public function updateInvoice(Request $request, Invoice $invoice)
    {
        Gate::authorize('finance.manage');

        if ((float) $invoice->paid_amount > 0) {
            return back()->with('error', 'Invoice yang sudah menerima pembayaran tidak dapat diedit — hapus pembayarannya dulu atau buat invoice koreksi.');
        }

        $data = $request->validate([
            'customer_id' => ['required', 'exists:customers,id'],
            'voyage_id' => ['nullable', 'exists:voyages,id'],
            'issue_date' => ['required', 'date'],
            'due_date' => ['nullable', 'date'],
            'pph23' => ['required', 'boolean'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.description' => ['required', 'string', 'max:200'],
            'items.*.qty' => ['required', 'numeric', 'min:0.01'],
            'items.*.price' => ['required', 'numeric', 'min:0'],
        ]);

        $before = $invoice->only(['customer_id', 'subtotal', 'total', 'pph23_amount']);

        DB::transaction(function () use ($invoice, $data) {
            $subtotal = collect($data['items'])->sum(fn ($i) => $i['qty'] * $i['price']);
            $ppn = round($subtotal * 0.11);
            $pph23 = $data['pph23'] ? round($subtotal * 0.02) : 0.0;
            $total = $subtotal + $ppn - $pph23;

            $invoice->update([
                'customer_id' => $data['customer_id'],
                'voyage_id' => $data['voyage_id'] ?? null,
                'issue_date' => $data['issue_date'],
                'due_date' => $data['due_date'] ?? null,
                'subtotal' => $subtotal,
                'ppn_amount' => $ppn,
                'pph23_amount' => $pph23,
                'total' => $total,
                'notes' => $data['notes'] ?? null,
            ]);

            $invoice->items()->delete();
            foreach ($data['items'] as $item) {
                InvoiceItem::create([
                    'invoice_id' => $invoice->id,
                    'description' => $item['description'],
                    'qty' => $item['qty'],
                    'price' => $item['price'],
                    'amount' => $item['qty'] * $item['price'],
                ]);
            }

            $this->repostInvoiceJournal($invoice);
            $this->syncInvoiceWithholding($invoice);
        });

        AuditService::log('updated', 'invoice', $invoice->id, $before, $data, "Invoice diedit: {$invoice->number} (jurnal ditulis ulang)");

        return back()->with('success', "Invoice {$invoice->number} diperbarui & jurnal ditulis ulang.");
    }

    public function deleteInvoice(Invoice $invoice)
    {
        Gate::authorize('finance.manage');

        if ((float) $invoice->paid_amount > 0) {
            return back()->with('error', 'Invoice yang sudah dibayar tidak dapat dihapus.');
        }

        $before = $invoice->toArray();

        DB::transaction(function () use ($invoice) {
            $this->deleteJournalFor('invoice', $invoice->id);
            $this->syncInvoiceWithholding($invoice->fresh() ?? $invoice); // masih punya pph? -> setelah delete kita hapus manual:
            WithholdingTax::where('ref_type', 'invoice')->where('ref_id', $invoice->id)->delete();
            $invoice->items()->delete();
            $invoice->delete();
        });

        AuditService::log('deleted', 'invoice', $invoice->id, $before, null, "Invoice dihapus (soft): {$invoice->number}");

        return back()->with('success', "Invoice {$invoice->number} dihapus (jurnal dibatalkan).");
    }

    public function deletePayment(Payment $payment)
    {
        Gate::authorize('finance.manage');

        $invoice = Invoice::findOrFail($payment->invoice_id);
        $before = $payment->toArray();

        DB::transaction(function () use ($payment, $invoice) {
            $this->reversePayment($payment);

            $invoice->decrement('paid_amount', $payment->amount);
            $paid = (float) $invoice->fresh()->paid_amount;
            $invoice->update([
                'status' => $paid <= 0.01 ? 'unpaid' : ($paid >= (float) $invoice->total - 0.01 ? 'paid' : 'partial'),
            ]);

            $payment->delete();
        });

        AuditService::log('payment_reversed', 'invoice', $invoice->id, $before, null, "Pembayaran {$invoice->number} dibatalkan (jurnal & kas dibalikkan)");

        return back()->with('success', "Pembayaran {$invoice->number} dibatalkan — kas & jurnal dibalikkan.");
    }

    public function updateBill(Request $request, Bill $bill)
    {
        Gate::authorize('finance.manage');

        if ((float) $bill->paid_amount > 0) {
            return back()->with('error', 'Bill yang sudah dibayar tidak dapat diedit.');
        }

        $data = $request->validate([
            'supplier_id' => ['required', 'exists:suppliers,id'],
            'voyage_id' => ['nullable', 'exists:voyages,id'],
            'category' => ['required', 'string', 'max:60'],
            'issue_date' => ['required', 'date'],
            'due_date' => ['nullable', 'date'],
            'pph_type' => ['nullable', 'in:pph23,pph4(2)'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.description' => ['required', 'string', 'max:200'],
            'items.*.amount' => ['required', 'numeric', 'min:0.01'],
        ]);

        $before = $bill->only(['supplier_id', 'category', 'subtotal', 'total']);

        DB::transaction(function () use ($bill, $data) {
            $subtotal = collect($data['items'])->sum(fn ($i) => $i['amount']);
            $ppn = round($subtotal * 0.11);
            $rate = ($data['pph_type'] ?? null) === 'pph4(2)' ? 2.5 : (($data['pph_type'] ?? null) === 'pph23' ? 2 : 0);
            $pph = round($subtotal * $rate / 100);
            $total = $subtotal + $ppn - $pph;
            $desc = collect($data['items'])->pluck('description')->implode(', ');
            $expenseCode = match ($data['category']) {
                'assist' => '5300', 'bbm' => '5000', 'sewa' => '5400',
                'sparepart', 'drydock', 'jasa_bengkel', 'servis' => '5100',
                default => '5900',
            };

            $bill->update([
                'supplier_id' => $data['supplier_id'],
                'voyage_id' => $data['voyage_id'] ?? null,
                'category' => $data['category'],
                'issue_date' => $data['issue_date'],
                'due_date' => $data['due_date'] ?? null,
                'subtotal' => $subtotal,
                'ppn_amount' => $ppn,
                'pph_withheld' => $pph,
                'pph_type' => $data['pph_type'] ?? null,
                'total' => $total,
                'notes' => ($data['notes'] ?? null) ? $data['notes'].' — '.$desc : $desc,
            ]);

            $this->deleteJournalFor('bill', $bill->id);
            $this->journal->post(
                [
                    ['account' => $expenseCode, 'debit' => $subtotal],
                    ...( $ppn > 0 ? [['account' => '1200', 'debit' => $ppn]] : [] ),
                    ['account' => '2100', 'credit' => $total],
                    ...( $pph > 0 ? [['account' => '2101', 'credit' => $pph]] : [] ),
                ],
                "Bill {$bill->number} (diedit)",
                'bill',
                $bill->id,
                $data['issue_date'],
            );

            WithholdingTax::where('ref_type', 'bill')->where('ref_id', $bill->id)->delete();
            if ($pph > 0) {
                WithholdingTax::create([
                    'type' => $data['pph_type'] ?? 'pph23',
                    'period' => substr($data['issue_date'], 0, 7),
                    'date' => $data['issue_date'],
                    'base_amount' => $subtotal,
                    'rate' => $rate,
                    'tax_amount' => $pph,
                    'counterparty' => $bill->supplier?->name,
                    'ref_type' => 'bill',
                    'ref_id' => $bill->id,
                    'status' => 'tercatat',
                ]);
            }

            PaymentSchedule::where('ref_type', 'bill')->where('ref_id', $bill->id)
                ->update(['due_date' => $data['due_date'] ?? $data['issue_date'], 'amount' => $total]);
        });

        AuditService::log('updated', 'bill', $bill->id, $before, $data, "Bill diedit: {$bill->number} (jurnal ditulis ulang)");

        return back()->with('success', "Bill {$bill->number} diperbarui & jurnal ditulis ulang.");
    }

    public function deleteBill(Bill $bill)
    {
        Gate::authorize('finance.manage');

        if ((float) $bill->paid_amount > 0) {
            return back()->with('error', 'Bill yang sudah dibayar tidak dapat dihapus.');
        }

        $before = $bill->toArray();

        DB::transaction(function () use ($bill) {
            $this->deleteJournalFor('bill', $bill->id);
            WithholdingTax::where('ref_type', 'bill')->where('ref_id', $bill->id)->delete();
            PaymentSchedule::where('ref_type', 'bill')->where('ref_id', $bill->id)->delete();
            $bill->delete();
        });

        AuditService::log('deleted', 'bill', $bill->id, $before, null, "Bill dihapus (soft): {$bill->number}");

        return back()->with('success', "Bill {$bill->number} dihapus (jurnal & jadwal bayar dibatalkan).");
    }

    public function deleteBillPayment(BillPayment $payment)
    {
        Gate::authorize('finance.manage');

        $bill = Bill::findOrFail($payment->bill_id);
        $before = $payment->toArray();

        DB::transaction(function () use ($payment, $bill) {
            $this->reverseBillPayment($payment, $bill);

            $bill->decrement('paid_amount', $payment->amount);
            $paid = (float) $bill->fresh()->paid_amount;
            $bill->update([
                'status' => $paid <= 0.01 ? 'unpaid' : ($paid >= (float) $bill->total - 0.01 ? 'paid' : 'partial'),
            ]);

            PaymentSchedule::where('ref_type', 'bill')->where('ref_id', $bill->id)
                ->where('status', 'lunas')
                ->update(['status' => 'menunggu', 'paid_at' => null]);

            $payment->delete();
        });

        AuditService::log('payment_reversed', 'bill', $bill->id, $before, null, "Pembayaran bill {$bill->number} dibatalkan (reversal)");

        return back()->with('success', "Pembayaran {$bill->number} dibatalkan — kas & jurnal dibalikkan.");
    }

    public function updateCash(Request $request, CashTransaction $cash)
    {
        Gate::authorize('finance.manage');

        $entry = $cash->journal_entry_id ? JournalEntry::find($cash->journal_entry_id) : null;
        if (! $entry || $entry->source_type !== 'cash') {
            return back()->with('error', 'Hanya transaksi kas manual yang dapat diedit. Transaksi dari invoice/bill mengikuti dokumennya.');
        }

        $data = $request->validate([
            'cash_account_id' => ['required', 'exists:cash_accounts,id'],
            'direction' => ['required', 'in:in,out'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'date' => ['required', 'date'],
            'category' => ['nullable', 'string', 'max:60'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $before = $cash->only(['direction', 'amount', 'date', 'category']);

        DB::transaction(function () use ($cash, $data, $entry) {
            // Balikkan saldo lama
            $oldSigned = $cash->direction === 'in' ? (float) $cash->amount : -(float) $cash->amount;
            CashAccount::whereKey($cash->cash_account_id)->decrement('balance', $oldSigned);

            // Tulis ulang jurnal lama (hapus) + update transaksi
            JournalLine::where('entry_id', $entry->id)->delete();
            $entry->delete();

            $cash->update([
                'cash_account_id' => $data['cash_account_id'],
                'direction' => $data['direction'],
                'amount' => $data['amount'],
                'date' => $data['date'],
                'category' => $data['category'] ?? 'lainnya',
                'notes' => $data['notes'] ?? null,
            ]);

            // Saldo baru + jurnal baru
            $newSigned = $data['direction'] === 'in' ? (float) $data['amount'] : -(float) $data['amount'];
            CashAccount::whereKey($data['cash_account_id'])->increment('balance', $newSigned);

            $account = CashAccount::findOrFail($data['cash_account_id']);
            $expenseCode = $data['category'] === 'bbm' ? '5000' : ($data['category'] === 'gaji' ? '5200' : '5900');
            $newEntry = $this->journal->post(
                $data['direction'] === 'in'
                    ? [
                        ['account' => $this->cashCode($account), 'debit' => (float) $data['amount']],
                        ['account' => '4300', 'credit' => (float) $data['amount']],
                    ]
                    : [
                        ['account' => $expenseCode, 'debit' => (float) $data['amount']],
                        ['account' => $this->cashCode($account), 'credit' => (float) $data['amount']],
                    ],
                'Kas/Bank (diedit) — '.($data['category'] ?? 'lainnya'),
                'cash',
                $cash->id,
                $data['date'],
            );
            $cash->update(['journal_entry_id' => $newEntry->id]);
        });

        AuditService::log('cash_updated', 'cash_transaction', $cash->id, $before, $data, 'Transaksi kas manual diedit (saldo & jurnal disesuaikan)');

        return back()->with('success', 'Transaksi kas diperbarui — saldo & jurnal disesuaikan.');
    }

    public function deleteCash(CashTransaction $cash)
    {
        Gate::authorize('finance.manage');

        $entry = $cash->journal_entry_id ? JournalEntry::find($cash->journal_entry_id) : null;
        if (! $entry || $entry->source_type !== 'cash') {
            return back()->with('error', 'Hanya transaksi kas manual yang dapat dihapus. Transaksi dari invoice/bill mengikuti dokumennya.');
        }

        $before = $cash->toArray();

        DB::transaction(function () use ($cash, $entry) {
            $signed = $cash->direction === 'in' ? (float) $cash->amount : -(float) $cash->amount;
            CashAccount::whereKey($cash->cash_account_id)->decrement('balance', $signed);

            JournalLine::where('entry_id', $entry->id)->delete();
            $entry->delete();
            $cash->delete();
        });

        AuditService::log('cash_deleted', 'cash_transaction', $cash->id, $before, null, 'Transaksi kas manual dihapus (saldo & jurnal dibatalkan)');

        return back()->with('success', 'Transaksi kas dihapus — saldo & jurnal dibatalkan.');
    }

    public function updateJournal(Request $request, JournalEntry $entry)
    {
        Gate::authorize('finance.manage');

        if ($entry->source_type !== 'manual') {
            return back()->with('error', 'Jurnal otomatis sistem tidak dapat diedit langsung — ubah dokumen sumbernya (invoice/bill/payroll).');
        }

        $data = $request->validate([
            'entry_date' => ['required', 'date'],
            'memo' => ['required', 'string', 'max:200'],
            'lines' => ['required', 'array', 'min:2'],
            'lines.*.account' => ['required', 'exists:accounts,code'],
            'lines.*.debit' => ['nullable', 'numeric', 'min:0'],
            'lines.*.credit' => ['nullable', 'numeric', 'min:0'],
        ]);

        $before = [
            'entry_date' => $entry->entry_date,
            'memo' => $entry->memo,
            'lines' => $entry->lines()->with('account')->get()->toArray(),
        ];

        try {
            DB::transaction(function () use ($entry, $data) {
                JournalLine::where('entry_id', $entry->id)->delete();
                $entry->delete();

                $this->journal->post($data['lines'], $data['memo'], 'manual', null, $data['entry_date']);
            });
        } catch (\InvalidArgumentException $e) {
            return back()->with('error', $e->getMessage());
        }

        AuditService::log('journal_rewritten', 'journal_entry', $entry->id, $before, $data, 'Jurnal manual ditulis ulang');

        return back()->with('success', 'Jurnal manual ditulis ulang.');
    }

    public function deleteJournal(JournalEntry $entry)
    {
        Gate::authorize('finance.manage');

        if ($entry->source_type !== 'manual') {
            return back()->with('error', 'Hanya jurnal manual yang dapat dihapus — jurnal otomatis mengikuti dokumen sumbernya.');
        }

        $before = [
            'memo' => $entry->memo,
            'entry_date' => $entry->entry_date,
            'lines' => $entry->lines()->with('account')->get()->toArray(),
        ];

        DB::transaction(function () use ($entry) {
            JournalLine::where('entry_id', $entry->id)->delete();
            $entry->delete();
        });

        AuditService::log('journal_deleted', 'journal_entry', $entry->id, $before, null, 'Jurnal manual dihapus');

        return back()->with('success', 'Jurnal manual dihapus.');
    }

    public function storeAsset(Request $request)
    {
        Gate::authorize('finance.manage');

        $data = $request->validate([
            'name' => ['required', 'string', 'max:160'],
            'category' => ['required', 'in:kapal,tongkang,peralatan,kendaraan,bangunan,lainnya'],
            'acquisition_cost' => ['required', 'numeric', 'min:0'],
            'acquisition_date' => ['required', 'date'],
            'useful_life_months' => ['required', 'integer', 'min:1'],
            'salvage_value' => ['nullable', 'numeric', 'min:0'],
            'vessel_id' => ['nullable', 'exists:vessels,id'],
        ]);

        Asset::create([...$data, 'salvage_value' => $data['salvage_value'] ?? 0, 'status' => 'aktif']);

        AuditService::log('created', 'asset', 0, null, $data, 'Aset tetap baru');

        return back()->with('success', "Aset \"{$data['name']}\" ditambahkan.");
    }

    public function updateAsset(Request $request, Asset $asset)
    {
        Gate::authorize('finance.manage');

        $data = $request->validate([
            'name' => ['required', 'string', 'max:160'],
            'category' => ['required', 'in:kapal,tongkang,peralatan,kendaraan,bangunan,lainnya'],
            'acquisition_cost' => ['required', 'numeric', 'min:0'],
            'acquisition_date' => ['required', 'date'],
            'useful_life_months' => ['required', 'integer', 'min:1'],
            'salvage_value' => ['nullable', 'numeric', 'min:0'],
            'status' => ['required', 'in:aktif,disposal'],
        ]);

        $before = $asset->only(['name', 'category', 'acquisition_cost', 'useful_life_months', 'status']);
        $asset->update([...$data, 'salvage_value' => $data['salvage_value'] ?? 0]);

        AuditService::log('updated', 'asset', $asset->id, $before, $data, "Aset diperbarui: {$asset->name}");

        return back()->with('success', "Aset {$asset->name} diperbarui.");
    }

    public function deleteAsset(Asset $asset)
    {
        Gate::authorize('finance.manage');

        $hasDepreciation = \App\Models\AssetDepreciation::where('asset_id', $asset->id)->exists();
        if ($hasDepreciation) {
            return back()->with('error', 'Aset sudah memiliki jurnal penyusutan — tidak dapat dihapus. Ubah status menjadi "disposal".');
        }

        AuditService::log('deleted', 'asset', $asset->id, $asset->toArray(), null, "Aset dihapus: {$asset->name}");
        $asset->delete();

        return back()->with('success', 'Aset dihapus.');
    }

    public function storeSchedule(Request $request)
    {
        Gate::authorize('finance.manage');

        $data = $request->validate([
            'due_date' => ['required', 'date'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'description' => ['required', 'string', 'max:240'],
        ]);

        PaymentSchedule::create([...$data, 'ref_type' => 'manual', 'status' => 'menunggu']);

        return back()->with('success', 'Entri jadwal bayar ditambahkan.');
    }

    public function updateSchedule(Request $request, PaymentSchedule $schedule)
    {
        Gate::authorize('finance.manage');

        $data = $request->validate([
            'due_date' => ['required', 'date'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'description' => ['required', 'string', 'max:240'],
            'status' => ['required', 'in:menunggu,lunas,telat'],
        ]);

        $schedule->update([...$data, 'paid_at' => $data['status'] === 'lunas' ? ($schedule->paid_at ?? now()->toDateString()) : null]);

        return back()->with('success', 'Jadwal bayar diperbarui.');
    }

    public function deleteSchedule(Request $request, PaymentSchedule $schedule)
    {
        Gate::authorize('finance.manage');

        if ($schedule->ref_type === 'bill' && $schedule->status === 'lunas') {
            return back()->with('error', 'Jadwal dari bill yang lunas tidak dihapus — berhubungan dengan riwayat pembayaran.');
        }

        AuditService::log('deleted', 'payment_schedule', $schedule->id, $schedule->toArray(), null, 'Jadwal bayar dihapus');
        $schedule->delete();

        return back()->with('success', 'Jadwal bayar dihapus.');
    }

    public function storeAccount(Request $request)
    {
        abort_unless(auth()->user()?->isSuperAdmin(), 403);

        $data = $request->validate([
            'code' => ['required', 'string', 'max:20', 'unique:accounts,code'],
            'name' => ['required', 'string', 'max:120'],
            'type' => ['required', 'in:asset,liability,equity,revenue,expense'],
            'is_cash' => ['nullable', 'boolean'],
        ]);

        Account::create([
            'code' => $data['code'],
            'name' => $data['name'],
            'type' => $data['type'],
            'normal_balance' => in_array($data['type'], ['liability', 'equity', 'revenue'], true) ? 'credit' : 'debit',
            'is_cash' => $data['is_cash'] ?? false,
        ]);

        return back()->with('success', "Akun {$data['code']} ditambahkan.");
    }

    public function updateAccount(Request $request, Account $account)
    {
        abort_unless(auth()->user()?->isSuperAdmin(), 403);

        $data = $request->validate([
            'code' => ['required', 'string', 'max:20', 'unique:accounts,code,'.$account->id],
            'name' => ['required', 'string', 'max:120'],
            'type' => ['required', 'in:asset,liability,equity,revenue,expense'],
        ]);

        $before = $account->only(['code', 'name', 'type']);
        $account->update($data);

        return back()->with('success', "Akun {$account->code} diperbarui.");
    }

    public function deleteAccount(Account $account)
    {
        abort_unless(auth()->user()?->isSuperAdmin(), 403);

        $used = JournalLine::where('account_id', $account->id)->exists();
        if ($used) {
            return back()->with('error', 'Akun sudah dipakai dalam jurnal — tidak dapat dihapus.');
        }

        $isCash = CashAccount::where('account_id', $account->id)->exists();
        if ($isCash) {
            return back()->with('error', 'Akun terkait kas/bank aktif — tidak dapat dihapus.');
        }

        AuditService::log('deleted', 'account', $account->id, $account->toArray(), null, "Akun COA dihapus: {$account->code}");
        $account->delete();

        return back()->with('success', 'Akun COA dihapus.');
    }

    public function updatePayrollEntry(Request $request, \App\Models\PayrollEntry $entry)
    {
        Gate::authorize('finance.manage');

        $period = $entry->period;
        if ($period->status !== 'draft') {
            return back()->with('error', 'Entri payroll hanya dapat diedit selagi periode masih DRAFT.');
        }

        $data = $request->validate([
            'gaji_pokok' => ['required', 'numeric', 'min:0'],
            'tunjangan' => ['nullable', 'numeric', 'min:0'],
            'borongan_insentif' => ['nullable', 'numeric', 'min:0'],
            'potongan_lain' => ['nullable', 'numeric', 'min:0'],
            'bpjs' => ['nullable', 'numeric', 'min:0'],
        ]);

        $gaji = (float) $data['gaji_pokok'];
        $tunjangan = (float) ($data['tunjangan'] ?? 0);
        $borongan = (float) ($data['borongan_insentif'] ?? 0);
        $potongan = (float) ($data['potongan_lain'] ?? 0);
        $bpjs = (float) ($data['bpjs'] ?? 0);

        $bruto = $gaji + $tunjangan + $borongan;
        $pph = app(PayrollService::class)->pph21($bruto, $bpjs);
        $total = $bruto - $potongan - $bpjs - $pph;

        $before = $entry->only(['gaji_pokok', 'tunjangan', 'borongan_insentif', 'potongan_lain', 'bpjs', 'pph21', 'total']);

        $entry->update([
            'gaji_pokok' => $gaji,
            'tunjangan' => $tunjangan,
            'borongan_insentif' => $borongan,
            'potongan_lain' => $potongan,
            'bpjs' => $bpjs,
            'pph21' => $pph,
            'total' => $total,
        ]);

        AuditService::log('updated', 'payroll_entry', $entry->id, $before, $data, "Entri payroll diperbarui: {$entry->person_name} (PPh21 dihitung ulang)");

        return back()->with('success', "Entri {$entry->person_name} diperbarui — PPh 21 dihitung ulang: ".number_format($pph, 0, ',', '.'));
    }

    public function deletePayrollEntry(\App\Models\PayrollEntry $entry)
    {
        Gate::authorize('finance.manage');

        if ($entry->period->status !== 'draft') {
            return back()->with('error', 'Entri payroll hanya dapat dihapus selagi periode masih DRAFT.');
        }

        AuditService::log('deleted', 'payroll_entry', $entry->id, $entry->toArray(), null, "Entri payroll dihapus: {$entry->person_name}");
        $entry->delete();

        return back()->with('success', 'Entri payroll dihapus.');
    }

    // ===== B4: Purchase Order =====

    public function storePo(Request $request)
    {
        Gate::authorize('finance.manage');

        $data = $request->validate([
            'order_date' => ['required', 'date'],
            'supplier_id' => ['required', 'exists:suppliers,id'],
            'vessel_id' => ['nullable', 'exists:vessels,id'],
            'dept' => ['required', 'in:ENGINE,DECK,HRD,OPERATION'],
            'notes' => ['nullable', 'string', 'max:500'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.item_name' => ['required', 'string', 'max:200'],
            'items.*.item_code' => ['nullable', 'string', 'max:80'],
            'items.*.qty' => ['required', 'numeric', 'min:0.01'],
            'items.*.unit' => ['nullable', 'string', 'max:30'],
            'items.*.price' => ['required', 'numeric', 'min:0'],
        ]);

        $numbered = app(\App\Services\NumberingService::class)->next('PO');

        $po = DB::transaction(function () use ($data, $numbered) {
            $subtotal = collect($data['items'])->sum(fn ($i) => $i['qty'] * $i['price']);

            $po = \App\Models\PurchaseOrder::create([
                'po_number' => $numbered['number'],
                'order_date' => $data['order_date'],
                'supplier_id' => $data['supplier_id'],
                'vessel_id' => $data['vessel_id'] ?? null,
                'dept' => $data['dept'],
                'status' => 'diterima',
                'subtotal' => $subtotal,
                'notes' => $data['notes'] ?? null,
                'created_by' => auth()->id(),
            ]);

            foreach ($data['items'] as $item) {
                \App\Models\PoItem::create([
                    'po_id' => $po->id,
                    'item_name' => $item['item_name'],
                    'item_code' => $item['item_code'] ?? null,
                    'qty' => $item['qty'],
                    'unit' => $item['unit'] ?? null,
                    'price' => $item['price'],
                    'amount' => $item['qty'] * $item['price'],
                ]);
            }

            return $po;
        });

        // Dokumen PO masuk arsip terpadu (milik kapal jika unit terisi)
        $doc = \App\Models\Document::create([
            'document_name' => "Purchase Order {$po->po_number}",
            'category_id' => \App\Models\DocumentCategory::where('group_code', 'A')->value('id'),
            'document_number' => $po->po_number,
            'owner_type' => $po->vessel_id ? 'vessel' : 'company',
            'owner_id' => $po->vessel_id,
            'source_type' => 'terbitan',
            'template_id' => \App\Models\DocumentTemplate::where('code', 'PO')->value('id'),
            'period' => substr($po->order_date?->toDateString() ?? now()->toDateString(), 0, 7),
            'issue_date' => $po->order_date?->toDateString() ?? now()->toDateString(),
            'has_expiry' => false,
            'verification_status' => 'verified',
            'uploaded_by' => auth()->id(),
        ]);

        AuditService::log('created', 'purchase_order', $po->id, null, $data, "PO baru {$po->po_number}");

        return back()->with('success', "PO {$po->po_number} dibuat & diarsipkan.");
    }

    public function receivePo(\App\Models\PurchaseOrder $po)
    {
        Gate::authorize('operations.manage');

        if ($po->status !== 'diterima') {
            return back()->with('error', 'PO sudah diproses sebelumnya.');
        }

        DB::transaction(function () use ($po) {
            foreach ($po->items as $item) {
                // Catat stok masuk kantor bila item terkait inventory
                if ($item->inventory_item_id) {
                    $bal = InventoryBalance::where('item_id', $item->inventory_item_id)
                        ->where('location_type', 'kantor')->first();
                    if ($bal) {
                        $bal->increment('qty', $item->qty);
                    } else {
                        InventoryBalance::create([
                            'item_id' => $item->inventory_item_id,
                            'location_type' => 'kantor',
                            'qty' => $item->qty,
                        ]);
                    }
                    InventoryMovement::create([
                        'item_id' => $item->inventory_item_id,
                        'type' => 'masuk',
                        'qty' => $item->qty,
                        'to_location' => 'kantor',
                        'ref_type' => 'po',
                        'ref_id' => $po->id,
                        'movement_date' => now()->toDateString(),
                        'user_id' => auth()->id(),
                        'notes' => "Penerimaan PO {$po->po_number}",
                    ]);
                }
            }
            $po->update(['status' => 'diambil']);
        });

        AuditService::log('po_received', 'purchase_order', $po->id, null, null, "Barang PO {$po->po_number} diterima");

        return back()->with('success', 'Penerimaan barang tercatat — status PO: diambil.');
    }

    public function makeBillFromPo(Request $request, \App\Models\PurchaseOrder $po)
    {
        Gate::authorize('finance.manage');

        if ($po->bills()->exists()) {
            return back()->with('error', 'PO ini sudah memiliki bill.');
        }

        $data = $request->validate([
            'due_date' => ['nullable', 'date'],
        ]);

        $desc = $po->items->map(fn ($i) => $i->item_name.' × '.$i->qty)->implode(', ');
        $subtotal = (float) $po->subtotal;
        $ppn = round($subtotal * 0.11);
        $total = $subtotal + $ppn;

        $bill = Bill::create([
            'number' => sprintf('BILL-%d-%04d', now()->year, Bill::whereYear('created_at', now()->year)->count() + 1),
            'supplier_id' => $po->supplier_id,
            'voyage_id' => null,
            'category' => 'sparepart',
            'issue_date' => now()->toDateString(),
            'due_date' => $data['due_date'] ?? now()->addDays(21)->toDateString(),
            'status' => 'unpaid',
            'subtotal' => $subtotal,
            'ppn_amount' => $ppn,
            'total' => $total,
            'po_id' => $po->id,
            'notes' => "Bill dari PO {$po->po_number} — {$desc}",
        ]);

        $this->journal->post(
            [
                ['account' => '5100', 'debit' => $subtotal],
                ['account' => '1200', 'debit' => $ppn],
                ['account' => '2100', 'credit' => $total],
            ],
            "Bill {$bill->number} dari PO {$po->po_number}",
            'bill',
            $bill->id,
            now()->toDateString(),
        );

        PaymentSchedule::create([
            'ref_type' => 'bill',
            'ref_id' => $bill->id,
            'due_date' => $bill->due_date,
            'amount' => $total,
            'description' => "Bayar bill {$bill->number} (PO {$po->po_number})",
            'status' => 'menunggu',
        ]);

        $po->update(['status' => 'di_bill']);

        AuditService::log('po_billed', 'purchase_order', $po->id, null, ['bill_id' => $bill->id], "Bill {$bill->number} dibuat dari PO {$po->po_number}");

        return back()->with('success', "Bill {$bill->number} dibuat dari PO {$po->po_number}.");
    }

    public function deletePo(\App\Models\PurchaseOrder $po)
    {
        Gate::authorize('finance.manage');

        if ($po->bills()->exists()) {
            return back()->with('error', 'PO memiliki bill — hapus billnya dulu.');
        }

        AuditService::log('deleted', 'purchase_order', $po->id, $po->only(['po_number', 'status', 'subtotal']), null, "PO dihapus: {$po->po_number}");
        $po->items()->delete();
        $po->delete();

        return back()->with('success', 'PO dihapus.');
    }

    private function poProps(): array
    {
        return [
            'pos' => \App\Models\PurchaseOrder::with(['supplier', 'vessel', 'items', 'bills'])
                ->orderByDesc('order_date')->orderByDesc('id')->limit(80)->get()
                ->map(fn ($po) => [
                    'id' => $po->id,
                    'po_number' => $po->po_number,
                    'order_date' => $po->order_date?->toDateString(),
                    'supplier_name' => $po->supplier?->name,
                    'supplier_id' => $po->supplier_id,
                    'vessel_name' => $po->vessel?->vessel_name,
                    'vessel_id' => $po->vessel_id,
                    'dept' => $po->dept,
                    'status' => $po->status,
                    'subtotal' => $po->subtotal,
                    'notes' => $po->notes,
                    'items' => $po->items->map(fn ($i) => [
                        'id' => $i->id,
                        'item_name' => $i->item_name,
                        'item_code' => $i->item_code,
                        'qty' => $i->qty,
                        'unit' => $i->unit,
                        'price' => $i->price,
                        'amount' => $i->amount,
                        'inventory_item_id' => $i->inventory_item_id,
                    ]),
                    'bill_numbers' => $po->bills->pluck('number'),
                ]),
            'vesselsPo' => \App\Models\Vessel::orderBy('vessel_name')->get(['id', 'vessel_name']),
        ];
    }
}
