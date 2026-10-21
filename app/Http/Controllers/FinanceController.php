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
            'assets' => Asset::orderBy('name')->get(['id', 'name', 'category', 'acquisition_cost', 'useful_life_months', 'accumulated_depreciation', 'salvage_value']),
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
                'customer_name' => $i->customer?->name,
                'issue_date' => $i->issue_date,
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
                'supplier_name' => $b->supplier?->name,
                'category' => $b->category,
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

            $this->journal->post(
                [
                    ['account' => '2100', 'debit' => (float) $data['amount']],
                    ['account' => $this->cashCode($cash), 'credit' => (float) $data['amount']],
                ],
                "Pembayaran bill {$bill->number}",
                'bill_payment',
                $bill->id,
                $data['date'],
            );

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
}
