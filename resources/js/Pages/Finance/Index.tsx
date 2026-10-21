import Badge, { type BadgeTone } from '@/Components/ui/Badge';
import Card from '@/Components/ui/Card';
import Modal from '@/Components/Modal';
import PageHeader from '@/Components/ui/PageHeader';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { classNames, formatDate, formatDateTime, formatNumber, formatRupiah } from '@/lib/format';
import { type PageProps } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import {
    BookOpen,
    Boxes,
    Coins,
    FileText,
    Landmark,
    Plus,
    Printer,
    Receipt,
    TrendingDown,
    TrendingUp,
    Users,
    Wallet,
    Calculator,
} from 'lucide-react';
import { FormEvent, useState } from 'react';

const TABS = [
    { key: 'invoice', label: 'Invoice', icon: FileText },
    { key: 'piutang', label: 'Piutang (AR)', icon: Wallet },
    { key: 'hutang', label: 'Hutang (AP)', icon: Receipt },
    { key: 'jadwal', label: 'Jadwal Bayar', icon: Calculator },
    { key: 'kas', label: 'Kas & Bank', icon: Landmark },
    { key: 'jurnal', label: 'Jurnal', icon: BookOpen },
    { key: 'bb', label: 'Buku Besar', icon: BookOpen },
    { key: 'lr', label: 'Laba Rugi', icon: TrendingUp },
    { key: 'neraca', label: 'Neraca', icon: Boxes },
    { key: 'pl', label: 'Project P&L', icon: TrendingDown },
    { key: 'pajak', label: 'Pajak', icon: Calculator },
    { key: 'payroll', label: 'Payroll', icon: Users },
    { key: 'aset', label: 'Aset', icon: Boxes },
    { key: 'akun', label: 'Akun', icon: BookOpen },
];

const STATUS_TONES: Record<string, BadgeTone> = {
    paid: 'success', lunas: 'success', partial: 'warning', unpaid: 'danger',
    draft: 'neutral', menunggu: 'warning', telat: 'danger', posted: 'success',
    tercatat: 'info', setor: 'success',
};

export default function FinanceIndex({
    tab,
    canManage,
    customers,
    suppliers,
    voyagesList,
    cashAccounts,
    serviceCatalog,
    invoices,
    openInvoices,
    aging,
    openBills,
    assistTotal,
    schedules,
    cashTransactions,
    entries,
    bbAccount,
    bbAccounts,
    bbLines,
    bbBalance,
    lrPeriod,
    pendapatan,
    beban,
    neracaAsof,
    neracaRows,
    labaBerjalan,
    revenues,
    expenses,
    projectPL,
    pajakPeriod,
    ppnKeluaran,
    ppnMasukan,
    ppnNet,
    pph23Kutip,
    withholdings,
    payrollPeriods,
    assets,
    accounts,
}: PageProps<Record<string, any>>) {
    const [modal, setModal] = useState<null | 'invoice' | 'bill' | 'payInvoice' | 'payBill' | 'cash' | 'journal'>(null);
    const [payTarget, setPayTarget] = useState<any>(null);

    const invoiceForm = useForm({
        customer_id: '', voyage_id: '', issue_date: new Date().toISOString().slice(0, 10),
        due_date: '', pph23: false, notes: '',
        items: [{ description: 'Jasa Towing (Penarikan)', qty: '1', price: '15000000' }],
    });
    const payForm = useForm({ amount: '', cash_account_id: '', date: new Date().toISOString().slice(0, 10), method: 'transfer' });
    const billForm = useForm({
        supplier_id: '', voyage_id: '', category: 'assist',
        issue_date: new Date().toISOString().slice(0, 10), due_date: '', pph_type: '', notes: '',
        items: [{ description: 'Jasa Assist Kolong Jembatan', amount: '5000000' }],
    });
    const cashForm = useForm({ cash_account_id: '', direction: 'out', amount: '', date: new Date().toISOString().slice(0, 10), category: 'lainnya', notes: '' });
    const journalForm = useForm({
        entry_date: new Date().toISOString().slice(0, 10), memo: '',
        lines: [
            { account: '1001', debit: '', credit: '' },
            { account: '4300', debit: '', credit: '' },
        ],
    });

    const submitInvoice = (e: FormEvent) => {
        e.preventDefault();
        invoiceForm.post('/keuangan/invoice', { preserveScroll: true, onSuccess: () => setModal(null) });
    };
    const submitPay = (e: FormEvent) => {
        e.preventDefault();
        if (! payTarget) return;
        payForm.post(`/keuangan/${payTarget.kind}/${payTarget.id}/pay`, { preserveScroll: true, onSuccess: () => { setModal(null); setPayTarget(null); } });
    };
    const submitBill = (e: FormEvent) => {
        e.preventDefault();
        billForm.post('/keuangan/bill', { preserveScroll: true, onSuccess: () => setModal(null) });
    };
    const submitCash = (e: FormEvent) => {
        e.preventDefault();
        cashForm.post('/keuangan/cash', { preserveScroll: true, onSuccess: () => setModal(null) });
    };
    const submitJournal = (e: FormEvent) => {
        e.preventDefault();
        journalForm.post('/keuangan/jurnal', { preserveScroll: true, onSuccess: () => setModal(null) });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Keuangan" />

            <PageHeader
                title="Keuangan"
                description="Jurnal ganda, invoice & piutang, hutang (termasuk assist kolong jembatan), kas, pajak, dan payroll."
            />

            <div className="mb-5 flex gap-1 overflow-x-auto border-b border-hairline">
                {TABS.map((t) => {
                    const Icon = t.icon;
                    return (
                        <button
                            key={t.key}
                            type="button"
                            onClick={() => router.get('/keuangan', { tab: t.key }, { preserveState: true })}
                            className={classNames(
                                'inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-xs font-medium',
                                tab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-ink',
                            )}
                        >
                            <Icon size={14} /> {t.label}
                        </button>
                    );
                })}
            </div>

            {canManage && tab === 'invoice' && (
                <div className="mb-4">
                    <PrimaryButton onClick={() => setModal('invoice')}>
                        <Plus size={15} className="inline me-1" /> Buat Invoice
                    </PrimaryButton>
                </div>
            )}

            {tab === 'invoice' && (
                <div className="overflow-hidden rounded-xl border border-hairline bg-white shadow-sm">
                    <table className="min-w-full divide-y divide-hairline text-sm">
                        <thead className="bg-appbg text-left text-xs uppercase tracking-wide text-muted">
                            <tr>
                                {['Nomor', 'Customer', 'Jatuh Tempo', 'Subtotal', 'PPN', 'PPh 23', 'Total', 'Dibayar', 'Status', ''].map((h) => (
                                    <th key={h} className="px-3 py-2.5">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-hairline">
                            {(invoices?.data ?? invoices ?? []).map((i: any) => (
                                <tr key={i.id} className="hover:bg-appbg">
                                    <td className="px-3 py-2 font-medium text-ink">{i.number}</td>
                                    <td className="px-3 py-2 text-muted">{i.customer_name}</td>
                                    <td className="px-3 py-2 text-muted">{formatDate(i.due_date)}</td>
                                    <td className="px-3 py-2 tabular-nums">{formatRupiah(i.subtotal)}</td>
                                    <td className="px-3 py-2 tabular-nums">{formatRupiah(i.ppn_amount)}</td>
                                    <td className="px-3 py-2 tabular-nums">{formatRupiah(i.pph23_amount)}</td>
                                    <td className="px-3 py-2 font-semibold tabular-nums">{formatRupiah(i.total)}</td>
                                    <td className="px-3 py-2 tabular-nums">{formatRupiah(i.paid_amount)}</td>
                                    <td className="px-3 py-2">
                                        <Badge tone={STATUS_TONES[i.status] ?? 'neutral'}>{i.status}</Badge>
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                        {canManage && i.status !== 'paid' && (
                                            <button
                                                type="button"
                                                onClick={() => { setPayTarget({ kind: 'invoice', id: i.id, sisa: i.total - i.paid_amount, label: i.number }); setModal('payInvoice'); }}
                                                className="text-xs font-medium text-primary hover:underline"
                                            >
                                                Bayar →
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {tab === 'piutang' && (
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
                    <Card title="Aging Piutang">
                        <div className="space-y-2 text-sm">
                            {[
                                ['Belum Jatuh Tempo', aging?.jatuh_tempo, 'text-ok'],
                                ['≤ 30 Hari Lewat', aging?.lebih_30, 'text-warn'],
                                ['31–60 Hari', aging?.lebih_60, 'text-warn'],
                                ['> 60 Hari', aging?.lebih_90, 'text-primary'],
                            ].map(([l, v, c]) => (
                                <div key={l as string} className="flex justify-between border-b border-hairline py-2">
                                    <span className="text-muted">{l}</span>
                                    <span className={classNames('font-semibold tabular-nums', c as string)}>
                                        {formatRupiah((v as number) ?? 0)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </Card>
                    <Card title="Invoice Outstanding" className="xl:col-span-2">
                        <ul className="space-y-2">
                            {(openInvoices ?? []).map((i: any) => (
                                <li key={i.id} className="flex items-center justify-between rounded-lg border border-hairline px-3 py-2.5 text-sm">
                                    <div>
                                        <p className="font-medium text-ink">{i.number} · {i.customer_name}</p>
                                        <p className="text-xs text-muted">
                                            Jatuh tempo {formatDate(i.due_date)}
                                            {i.hari_lewat > 0 && <span className="font-semibold text-primary"> · lewat {i.hari_lewat} hari</span>}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold tabular-nums text-ink">{formatRupiah(i.sisa)}</p>
                                        {canManage && (
                                            <button
                                                type="button"
                                                onClick={() => { setPayTarget({ kind: 'invoice', id: i.id, sisa: i.sisa, label: i.number }); setModal('payInvoice'); }}
                                                className="text-xs text-primary hover:underline"
                                            >
                                                Bayar
                                            </button>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </Card>
                </div>
            )}

            {tab === 'hutang' && (
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
                    <div className="space-y-5">
                        <Card title="Aging Hutang">
                            <div className="space-y-2 text-sm">
                                {[
                                    ['Belum Jatuh Tempo', aging?.jatuh_tempo],
                                    ['≤ 30 Hari Lewat', aging?.lebih_30],
                                    ['31–60 Hari', aging?.lebih_60],
                                    ['> 60 Hari', aging?.lebih_90],
                                ].map(([l, v]) => (
                                    <div key={l as string} className="flex justify-between border-b border-hairline py-2">
                                        <span className="text-muted">{l}</span>
                                        <span className="font-semibold tabular-nums text-ink">{formatRupiah((v as number) ?? 0)}</span>
                                    </div>
                                ))}
                            </div>
                        </Card>
                        <Card title="Total Jasa Assist Kolong Jembatan" description="Dibayar PT Bunga Teratai (beban).">
                            <p className="text-2xl font-semibold tabular-nums text-primary">{formatRupiah(assistTotal ?? 0)}</p>
                        </Card>
                    </div>
                    <Card title="Bill Outstanding" className="xl:col-span-2" actions={
                        canManage && <PrimaryButton onClick={() => setModal('bill')}><Plus size={14} className="inline me-1" /> Bill Baru</PrimaryButton>
                    }>
                        <ul className="space-y-2">
                            {(openBills ?? []).map((b: any) => (
                                <li key={b.id} className="flex items-center justify-between rounded-lg border border-hairline px-3 py-2.5 text-sm">
                                    <div>
                                        <p className="font-medium text-ink">{b.number} · {b.supplier_name}</p>
                                        <p className="text-xs capitalize text-muted">
                                            {b.category}{b.voyage_code ? ` · ${b.voyage_code}` : ''} · jatuh tempo {formatDate(b.due_date)}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold tabular-nums text-ink">{formatRupiah(b.sisa)}</p>
                                        {canManage && (
                                            <button
                                                type="button"
                                                onClick={() => { setPayTarget({ kind: 'bill', id: b.id, sisa: b.sisa, label: b.number }); setModal('payBill'); }}
                                                className="text-xs text-primary hover:underline"
                                            >
                                                Bayar
                                            </button>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </Card>
                </div>
            )}

            {tab === 'jadwal' && (
                <Card title="Jadwal Pembayaran Mendatang" description="Otomatis dari bill + entri manual.">
                    <ul className="divide-y divide-hairline">
                        {(schedules ?? []).map((s: any) => (
                            <li key={s.id} className="flex items-center justify-between py-2.5 text-sm">
                                <div>
                                    <p className="font-medium text-ink">{s.description}</p>
                                    <p className="text-xs text-muted">Jatuh tempo {formatDate(s.due_date)}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="font-semibold tabular-nums">{formatRupiah(s.amount)}</span>
                                    <Badge tone={STATUS_TONES[s.status] ?? 'neutral'}>{s.status}</Badge>
                                </div>
                            </li>
                        ))}
                    </ul>
                </Card>
            )}

            {tab === 'kas' && (
                <>
                    <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-3">
                        {(cashAccounts ?? []).map((c: any) => (
                            <div key={c.id} className="rounded-xl border border-hairline bg-white p-4">
                                <p className="text-xs uppercase tracking-wide text-muted">{c.type} · {c.account_number ?? '—'}</p>
                                <p className="mt-1 text-lg font-semibold text-ink">{c.name}</p>
                                <p className="mt-1 text-2xl font-semibold tabular-nums text-primary">{formatRupiah(c.balance)}</p>
                            </div>
                        ))}
                    </div>
                    {canManage && (
                        <div className="mb-4"><PrimaryButton onClick={() => setModal('cash')}>Transaksi Kas/Bank</PrimaryButton></div>
                    )}
                    <Card title="Mutasi Terakhir">
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead className="bg-appbg text-left text-xs uppercase text-muted">
                                    <tr>{['Tanggal', 'Akun', 'Masuk', 'Keluar', 'Kategori', 'Ref', 'Catatan'].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr>
                                </thead>
                                <tbody className="divide-y divide-hairline">
                                    {(cashTransactions ?? []).map((t: any) => (
                                        <tr key={t.id}>
                                            <td className="px-3 py-2">{formatDate(t.date)}</td>
                                            <td className="px-3 py-2 text-muted">{t.account_name}</td>
                                            <td className="px-3 py-2 tabular-nums text-ok">{t.direction === 'in' ? formatRupiah(t.amount) : '—'}</td>
                                            <td className="px-3 py-2 tabular-nums text-primary">{t.direction === 'out' ? formatRupiah(t.amount) : '—'}</td>
                                            <td className="px-3 py-2 capitalize text-muted">{t.category}</td>
                                            <td className="px-3 py-2 text-muted">{t.reference}</td>
                                            <td className="px-3 py-2 text-xs text-muted">{t.notes}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </>
            )}

            {tab === 'jurnal' && (
                <div className="space-y-4">
                    {canManage && <div><PrimaryButton onClick={() => setModal('journal')}>Jurnal Manual</PrimaryButton></div>}
                    {(entries ?? []).map((e: any) => (
                        <Card key={e.id} title={e.memo} description={`${formatDate(e.entry_date)} · ${e.source_type} · ${e.posted_by ?? '—'}`}>
                            <table className="min-w-full text-sm">
                                <thead className="text-left text-xs uppercase text-muted">
                                    <tr><th className="py-1">Akun</th><th className="py-1 text-right">Debit</th><th className="py-1 text-right">Kredit</th></tr>
                                </thead>
                                <tbody className="divide-y divide-hairline">
                                    {e.lines.map((l: any, i: number) => (
                                        <tr key={i}>
                                            <td className="py-1.5 text-ink">{l.account_code} · {l.account_name}</td>
                                            <td className="py-1.5 text-right tabular-nums">{l.debit > 0 ? formatRupiah(l.debit) : ''}</td>
                                            <td className="py-1.5 text-right tabular-nums">{l.credit > 0 ? formatRupiah(l.credit) : ''}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </Card>
                    ))}
                </div>
            )}

            {tab === 'bb' && (
                <Card
                    title={`Buku Besar — ${bbAccount?.code} ${bbAccount?.name}`}
                    description={`Saldo: ${formatRupiah(bbBalance)}`}
                    actions={
                        <select
                            defaultValue={bbAccount?.code}
                            onChange={(e) => router.get('/keuangan', { tab: 'bb', account: e.target.value }, { preserveState: true })}
                            className="rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary"
                        >
                            {(bbAccounts ?? []).map((a: any) => (
                                <option key={a.id} value={a.code}>{a.code} — {a.name}</option>
                            ))}
                        </select>
                    }
                >
                    <table className="min-w-full text-sm">
                        <thead className="bg-appbg text-left text-xs uppercase text-muted">
                            <tr><th className="px-3 py-2">Tanggal</th><th className="px-3 py-2">Memo</th><th className="px-3 py-2 text-right">Debit</th><th className="px-3 py-2 text-right">Kredit</th></tr>
                        </thead>
                        <tbody className="divide-y divide-hairline">
                            {(bbLines ?? []).map((l: any) => (
                                <tr key={l.id}>
                                    <td className="px-3 py-2">{formatDate(l.entry_date)}</td>
                                    <td className="px-3 py-2 text-muted">{l.memo}</td>
                                    <td className="px-3 py-2 text-right tabular-nums">{l.debit > 0 ? formatRupiah(l.debit) : ''}</td>
                                    <td className="px-3 py-2 text-right tabular-nums">{l.credit > 0 ? formatRupiah(l.credit) : ''}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Card>
            )}

            {tab === 'lr' && (
                <Card
                    title="Laba Rugi"
                    description={`Periode ${formatDate(lrPeriod?.from)} – ${formatDate(lrPeriod?.to)}`}
                    actions={
                        <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded-lg border border-hairline px-3 py-1.5 text-xs font-medium hover:border-primary/40">
                            <Printer size={13} /> Cetak
                        </button>
                    }
                >
                    <div className="space-y-2 text-sm">
                        {(revenues ?? []).map((r: any) => (
                            <div key={r.code} className="flex justify-between border-b border-hairline py-2">
                                <span className="text-muted">{r.code} · {r.name}</span>
                                <span className="tabular-nums text-ok">{formatRupiah(r.amount)}</span>
                            </div>
                        ))}
                        <div className="flex justify-between py-2 text-base font-semibold">
                            <span>Total Pendapatan</span><span className="tabular-nums text-ok">{formatRupiah(pendapatan)}</span>
                        </div>
                        {(expenses ?? []).map((x: any) => (
                            <div key={x.code} className="flex justify-between border-b border-hairline py-2">
                                <span className="text-muted">{x.code} · {x.name}</span>
                                <span className="tabular-nums text-primary">{formatRupiah(x.amount)}</span>
                            </div>
                        ))}
                        <div className="flex justify-between py-2 text-base font-semibold">
                            <span>Total Beban</span><span className="tabular-nums text-primary">{formatRupiah(beban)}</span>
                        </div>
                        <div className={classNames('mt-3 flex justify-between rounded-xl p-4 text-lg font-bold', pendapatan - beban >= 0 ? 'bg-ok/10 text-ok' : 'bg-primary/10 text-primary')}>
                            <span>{pendapatan - beban >= 0 ? 'Laba Bersih' : 'Rugi Bersih'}</span>
                            <span className="tabular-nums">{formatRupiah(pendapatan - beban)}</span>
                        </div>
                    </div>
                </Card>
            )}

            {tab === 'neraca' && (
                <Card title="Neraca (Ringkas)" description={`Per ${formatDate(neracaAsof)}`}>
                    {(['asset', 'liability', 'equity'] as const).map((type) => {
                        const rows = (neracaRows ?? []).filter((r: any) => r.type === type);
                        const total = rows.reduce((s: number, r: any) => s + r.balance, 0);
                        return (
                            <div key={type} className="mb-5">
                                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">
                                    {type === 'asset' ? 'Aset' : type === 'liability' ? 'Kewajiban' : 'Ekuitas'}
                                </h3>
                                {rows.map((r: any) => (
                                    <div key={r.code} className="flex justify-between border-b border-hairline py-1.5 text-sm">
                                        <span className="text-muted">{r.code} · {r.name}</span>
                                        <span className="tabular-nums text-ink">{formatRupiah(r.balance)}</span>
                                    </div>
                                ))}
                                <div className="mt-1 flex justify-between py-1.5 text-sm font-semibold">
                                    <span>Total</span><span className="tabular-nums">{formatRupiah(total)}</span>
                                </div>
                            </div>
                        );
                    })}
                    <div className="rounded-xl bg-appbg p-4 text-sm">
                        <div className="flex justify-between font-semibold"><span>Laba Berjalan Tahun Ini</span><span className="tabular-nums">{formatRupiah(labaBerjalan)}</span></div>
                        <p className="mt-1 text-xs text-muted">Aset = Kewajiban + Ekuitas + Laba Ditahan (implementasi ringkas).</p>
                    </div>
                </Card>
            )}

            {tab === 'pl' && (
                <Card title="Project P&L — Per Voyage/Job" description="Pendapatan invoice tag − biaya (bill + BBM) per perjalanan.">
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-appbg text-left text-xs uppercase text-muted">
                                <tr>{['Kode', 'Kapal', 'Rute', 'Pendapatan', 'Biaya', 'Profit', 'Margin'].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr>
                            </thead>
                            <tbody className="divide-y divide-hairline">
                                {(projectPL ?? []).map((p: any) => (
                                    <tr key={p.id}>
                                        <td className="px-3 py-2 font-medium text-ink">{p.voyage_code}</td>
                                        <td className="px-3 py-2 text-muted">{p.vessel_name}</td>
                                        <td className="px-3 py-2 text-muted">{p.route}</td>
                                        <td className="px-3 py-2 tabular-nums">{formatRupiah(p.income)}</td>
                                        <td className="px-3 py-2 tabular-nums">{formatRupiah(p.cost)}</td>
                                        <td className={classNames('px-3 py-2 font-semibold tabular-nums', p.profit >= 0 ? 'text-ok' : 'text-primary')}>
                                            {formatRupiah(p.profit)}
                                        </td>
                                        <td className="px-3 py-2 tabular-nums text-muted">
                                            {p.margin !== null ? `${p.margin}%` : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {tab === 'pajak' && (
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
                    <div className="space-y-5">
                        <Card title={`PPN Periode ${pajakPeriod}`}>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between border-b border-hairline py-2"><span className="text-muted">PPN Keluaran (11%)</span><span className="tabular-nums">{formatRupiah(ppnKeluaran)}</span></div>
                                <div className="flex justify-between border-b border-hairline py-2"><span className="text-muted">PPN Masukan</span><span className="tabular-nums">{formatRupiah(ppnMasukan)}</span></div>
                                <div className="flex justify-between py-2 font-semibold"><span>Net (Setor / Refund)</span><span className={classNames('tabular-nums', (ppnNet ?? 0) >= 0 ? 'text-primary' : 'text-ok')}>{formatRupiah(ppnNet)}</span></div>
                            </div>
                        </Card>
                        <Card title="PPh 23 Terkutip (Customer)">
                            <p className="text-2xl font-semibold tabular-nums text-ink">{formatRupiah(pph23Kutip)}</p>
                            <p className="text-xs text-muted">Ditahan customer, dicatat sebagai kewajiban pajak.</p>
                        </Card>
                    </div>
                    <Card title="Buku Pajak Ringkas (PPh 21/23/4(2))" className="xl:col-span-2">
                        <table className="min-w-full text-sm">
                            <thead className="bg-appbg text-left text-xs uppercase text-muted">
                                <tr>{['Jenis', 'Tanggal', 'Dasar', 'Tarif', 'Pajak', 'Lawan Transaksi', 'Status', ''].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr>
                            </thead>
                            <tbody className="divide-y divide-hairline">
                                {(withholdings ?? []).map((w: any) => (
                                    <tr key={w.id}>
                                        <td className="px-3 py-2 font-medium uppercase text-ink">{w.type}</td>
                                        <td className="px-3 py-2">{formatDate(w.date)}</td>
                                        <td className="px-3 py-2 tabular-nums">{formatRupiah(w.base_amount)}</td>
                                        <td className="px-3 py-2 tabular-nums">{w.rate}%</td>
                                        <td className="px-3 py-2 font-semibold tabular-nums text-primary">{formatRupiah(w.tax_amount)}</td>
                                        <td className="px-3 py-2 text-muted">{w.counterparty}</td>
                                        <td className="px-3 py-2"><Badge tone={STATUS_TONES[w.status] ?? 'neutral'}>{w.status}</Badge></td>
                                        <td className="px-3 py-2 text-right">
                                            {canManage && w.status === 'tercatat' && (
                                                <button
                                                    type="button"
                                                    onClick={() => router.post(`/keuangan/pajak/${w.id}/setor`, {}, { preserveScroll: true })}
                                                    className="text-xs font-medium text-primary hover:underline"
                                                >
                                                    Setor →
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </Card>
                </div>
            )}

            {tab === 'payroll' && (
                <Card title="Payroll Periode" description="Generate draft (ABK + karyawan + PPh 21 UU HPP) lalu posting → jurnal beban gaji.">
                    <table className="min-w-full text-sm">
                        <thead className="bg-appbg text-left text-xs uppercase text-muted">
                            <tr>{['Periode', 'Entri', 'Total Dibayar', 'PPh 21', 'Status', 'Aksi'].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr>
                        </thead>
                        <tbody className="divide-y divide-hairline">
                            {(payrollPeriods ?? []).map((p: any) => (
                                <tr key={p.id}>
                                    <td className="px-3 py-2 font-medium text-ink">{p.year_month}</td>
                                    <td className="px-3 py-2 tabular-nums">{p.entries_count}</td>
                                    <td className="px-3 py-2 tabular-nums">{formatRupiah(p.total)}</td>
                                    <td className="px-3 py-2 tabular-nums">{formatRupiah(p.pph21)}</td>
                                    <td className="px-3 py-2"><Badge tone={STATUS_TONES[p.status] ?? 'neutral'}>{p.status === 'posted' ? 'Posted' : 'Draft'}</Badge></td>
                                    <td className="px-3 py-2">
                                        {canManage && (
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => router.post(`/keuangan/payroll/${p.id}/generate`, {}, { preserveScroll: true })}
                                                    className="text-xs font-medium text-maritime hover:underline"
                                                >
                                                    Generate
                                                </button>
                                                {p.status !== 'posted' && p.entries_count > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => router.post(`/keuangan/payroll/${p.id}/post`, {}, { preserveScroll: true })}
                                                        className="text-xs font-semibold text-primary hover:underline"
                                                    >
                                                        Posting
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Card>
            )}

            {tab === 'aset' && (
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
                    <Card title="Aset Tetap" className="xl:col-span-2">
                        <table className="min-w-full text-sm">
                            <thead className="bg-appbg text-left text-xs uppercase text-muted">
                                <tr>{['Nama', 'Kategori', 'Perolehan', 'Umur', 'Akum. Susut', 'Nilai Buku'].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr>
                            </thead>
                            <tbody className="divide-y divide-hairline">
                                {(assets ?? []).map((a: any) => (
                                    <tr key={a.id}>
                                        <td className="px-3 py-2 font-medium text-ink">{a.name}</td>
                                        <td className="px-3 py-2 capitalize text-muted">{a.category}</td>
                                        <td className="px-3 py-2 tabular-nums">{formatRupiah(a.acquisition_cost)}</td>
                                        <td className="px-3 py-2 text-muted">{a.useful_life_months} bln</td>
                                        <td className="px-3 py-2 tabular-nums">{formatRupiah(a.accumulated_depreciation)}</td>
                                        <td className="px-3 py-2 font-semibold tabular-nums">{formatRupiah(a.acquisition_cost - a.accumulated_depreciation)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </Card>
                    <Card title="Penyusutan" description="Straight-line bulanan → jurnal otomatis.">
                        {canManage && (
                            <PrimaryButton onClick={() => router.post('/keuangan/depreciation', {}, { preserveScroll: true })}>
                                Generate Penyusutan Periode Berjalan
                            </PrimaryButton>
                        )}
                        <p className="mt-3 text-xs text-muted">
                            Debit 5500 Beban Penyusutan · Kredit 1399 Akumulasi Penyusutan.
                        </p>
                    </Card>
                </div>
            )}

            {tab === 'akun' && (
                <Card title="Bagan Akun (COA)">
                    <table className="min-w-full text-sm">
                        <thead className="bg-appbg text-left text-xs uppercase text-muted">
                            <tr>{['Kode', 'Nama', 'Tipe', 'Normal'] .map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr>
                        </thead>
                        <tbody className="divide-y divide-hairline">
                            {(accounts ?? []).map((a: any) => (
                                <tr key={a.id}>
                                    <td className="px-3 py-2 font-mono text-ink">{a.code}</td>
                                    <td className="px-3 py-2 text-ink">{a.name}</td>
                                    <td className="px-3 py-2 capitalize text-muted">{a.type}</td>
                                    <td className="px-3 py-2 capitalize text-muted">{a.normal_balance}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Card>
            )}

            {/* ===== MODALS ===== */}
            <Modal show={modal === 'invoice'} onClose={() => setModal(null)} maxWidth="lg">
                <form onSubmit={submitInvoice} className="p-6">
                    <h2 className="text-lg font-semibold text-ink">Buat Invoice Jasa</h2>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-medium text-muted">Customer *</label>
                            <select value={invoiceForm.data.customer_id} onChange={(e) => invoiceForm.setData('customer_id', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary">
                                <option value="">— pilih —</option>
                                {(customers ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-muted">Tertaut Voyage (Project P&L)</label>
                            <select value={invoiceForm.data.voyage_id} onChange={(e) => invoiceForm.setData('voyage_id', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary">
                                <option value="">— tanpa voyage —</option>
                                {(voyagesList ?? []).map((v: any) => <option key={v.id} value={v.id}>{v.voyage_code} ({v.origin}→{v.destination})</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-muted">Tanggal *</label>
                            <input type="date" value={invoiceForm.data.issue_date} onChange={(e) => invoiceForm.setData('issue_date', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-muted">Jatuh Tempo</label>
                            <input type="date" value={invoiceForm.data.due_date} onChange={(e) => invoiceForm.setData('due_date', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" />
                        </div>
                    </div>
                    <div className="mt-4">
                        <label className="text-xs font-medium text-muted">Item (towing / sewa tongkang / tiket)</label>
                        {invoiceForm.data.items.map((item, idx) => (
                            <div key={idx} className="mt-2 flex gap-2">
                                <select
                                    value={item.description}
                                    onChange={(e) => {
                                        const cat = (serviceCatalog ?? []).find((s: any) => s.name === e.target.value);
                                        invoiceForm.setData('items', invoiceForm.data.items.map((p, i) => i === idx ? { ...p, description: e.target.value, price: cat ? String(cat.default_price) : p.price } : p));
                                    }}
                                    className="flex-1 rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
                                >
                                    {(serviceCatalog ?? []).filter((s: any) => s.kind === 'pendapatan').map((s: any) => <option key={s.id} value={s.name}>{s.name}</option>)}
                                </select>
                                <input type="number" step="0.01" value={item.qty} onChange={(e) => invoiceForm.setData('items', invoiceForm.data.items.map((p, i) => i === idx ? { ...p, qty: e.target.value } : p))} className="w-20 rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" />
                                <input type="number" step="0.01" value={item.price} onChange={(e) => invoiceForm.setData('items', invoiceForm.data.items.map((p, i) => i === idx ? { ...p, price: e.target.value } : p))} className="w-36 rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" />
                            </div>
                        ))}
                        <button type="button" onClick={() => invoiceForm.setData('items', [...invoiceForm.data.items, { description: 'Tiket Penumpang', qty: '1', price: '185000' }])} className="mt-2 text-xs font-medium text-primary hover:underline">+ Tambah baris</button>
                    </div>
                    <label className="mt-3 flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={invoiceForm.data.pph23} onChange={(e) => invoiceForm.setData('pph23', e.target.checked)} className="rounded border-gray-300 text-primary focus:ring-primary" />
                        Potong PPh 23 jasa (2%)
                    </label>
                    <p className="mt-2 text-xs text-muted">PPN 11% dihitung otomatis. Total tagihan = subtotal + PPN − PPh 23.</p>
                    <div className="mt-5 flex justify-end gap-3">
                        <SecondaryButton type="button" onClick={() => setModal(null)}>Batal</SecondaryButton>
                        <PrimaryButton disabled={invoiceForm.processing}>Simpan Invoice</PrimaryButton>
                    </div>
                </form>
            </Modal>

            <Modal show={modal === 'bill'} onClose={() => setModal(null)} maxWidth="lg">
                <form onSubmit={submitBill} className="p-6">
                    <h2 className="text-lg font-semibold text-ink">Buat Bill (Hutang)</h2>
                    <p className="text-xs text-muted">Termasuk jasa assist kolong jembatan (beban yang dibayar perusahaan).</p>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-medium text-muted">Supplier *</label>
                            <select value={billForm.data.supplier_id} onChange={(e) => billForm.setData('supplier_id', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary">
                                <option value="">— pilih —</option>
                                {(suppliers ?? []).map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-muted">Kategori *</label>
                            <select value={billForm.data.category} onChange={(e) => billForm.setData('category', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary">
                                {['assist', 'sparepart', 'drydock', 'bbm', 'jasa_bengkel', 'sewa', 'lainnya'].map((c) => <option key={c} value={c}>{c === 'assist' ? 'Jasa Assist Kolong Jembatan' : c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-muted">Tanggal *</label>
                            <input type="date" value={billForm.data.issue_date} onChange={(e) => billForm.setData('issue_date', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-muted">Jatuh Tempo</label>
                            <input type="date" value={billForm.data.due_date} onChange={(e) => billForm.setData('due_date', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-muted">Tertaut Voyage</label>
                            <select value={billForm.data.voyage_id} onChange={(e) => billForm.setData('voyage_id', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary">
                                <option value="">— tanpa voyage —</option>
                                {(voyagesList ?? []).map((v: any) => <option key={v.id} value={v.id}>{v.voyage_code}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-muted">PPh Dipotong</label>
                            <select value={billForm.data.pph_type} onChange={(e) => billForm.setData('pph_type', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary">
                                <option value="">— tidak —</option>
                                <option value="pph23">PPh 23 (2%)</option>
                                <option value="pph4(2)">PPh 4(2) (2,5%)</option>
                            </select>
                        </div>
                    </div>
                    <div className="mt-4">
                        <label className="text-xs font-medium text-muted">Rincian</label>
                        {billForm.data.items.map((item, idx) => (
                            <div key={idx} className="mt-2 flex gap-2">
                                <select
                                    value={item.description}
                                    onChange={(e) => billForm.setData('items', billForm.data.items.map((p, i) => i === idx ? { ...p, description: e.target.value } : p))}
                                    className="flex-1 rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
                                >
                                    {(serviceCatalog ?? []).filter((s: any) => s.kind === 'biaya').map((s: any) => <option key={s.id} value={s.name}>{s.name}</option>)}
                                </select>
                                <input type="number" step="0.01" value={item.amount} onChange={(e) => billForm.setData('items', billForm.data.items.map((p, i) => i === idx ? { ...p, amount: e.target.value } : p))} className="w-36 rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" />
                            </div>
                        ))}
                    </div>
                    <div className="mt-5 flex justify-end gap-3">
                        <SecondaryButton type="button" onClick={() => setModal(null)}>Batal</SecondaryButton>
                        <PrimaryButton disabled={billForm.processing}>Simpan Bill</PrimaryButton>
                    </div>
                </form>
            </Modal>

            <Modal show={modal === 'payInvoice' || modal === 'payBill'} onClose={() => { setModal(null); setPayTarget(null); }} maxWidth="md">
                <form onSubmit={submitPay} className="p-6">
                    <h2 className="text-lg font-semibold text-ink">Bayar {payTarget?.label}</h2>
                    <p className="text-xs text-muted">Sisa tagihan: {formatRupiah(payTarget?.sisa)}</p>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-medium text-muted">Jumlah *</label>
                            <input type="number" step="0.01" max={payTarget?.sisa} value={payForm.data.amount} onChange={(e) => payForm.setData('amount', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-muted">Tanggal *</label>
                            <input type="date" value={payForm.data.date} onChange={(e) => payForm.setData('date', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" />
                        </div>
                        <div className="col-span-2">
                            <label className="text-xs font-medium text-muted">Akun Kas/Bank *</label>
                            <select value={payForm.data.cash_account_id} onChange={(e) => payForm.setData('cash_account_id', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary">
                                <option value="">— pilih —</option>
                                {(cashAccounts ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.name} ({formatRupiah(c.balance)})</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="mt-5 flex justify-end gap-3">
                        <SecondaryButton type="button" onClick={() => { setModal(null); setPayTarget(null); }}>Batal</SecondaryButton>
                        <PrimaryButton disabled={payForm.processing}>Simpan Pembayaran</PrimaryButton>
                    </div>
                </form>
            </Modal>

            <Modal show={modal === 'cash'} onClose={() => setModal(null)} maxWidth="md">
                <form onSubmit={submitCash} className="p-6">
                    <h2 className="text-lg font-semibold text-ink">Transaksi Kas & Bank</h2>
                    <div className="mt-4 space-y-3">
                        <div>
                            <label className="text-xs font-medium text-muted">Akun *</label>
                            <select value={cashForm.data.cash_account_id} onChange={(e) => cashForm.setData('cash_account_id', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary">
                                <option value="">— pilih —</option>
                                {(cashAccounts ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-medium text-muted">Arah *</label>
                                <select value={cashForm.data.direction} onChange={(e) => cashForm.setData('direction', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary">
                                    <option value="out">Keluar</option>
                                    <option value="in">Masuk</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-muted">Kategori</label>
                                <select value={cashForm.data.category} onChange={(e) => cashForm.setData('category', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary">
                                    {['lainnya', 'bbm', 'gaji', 'pajak', 'servis', 'pendapatan'].map((c) => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-muted">Jumlah *</label>
                                <input type="number" step="0.01" value={cashForm.data.amount} onChange={(e) => cashForm.setData('amount', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-muted">Tanggal *</label>
                                <input type="date" value={cashForm.data.date} onChange={(e) => cashForm.setData('date', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" />
                            </div>
                        </div>
                    </div>
                    <div className="mt-5 flex justify-end gap-3">
                        <SecondaryButton type="button" onClick={() => setModal(null)}>Batal</SecondaryButton>
                        <PrimaryButton disabled={cashForm.processing}>Simpan</PrimaryButton>
                    </div>
                </form>
            </Modal>

            <Modal show={modal === 'journal'} onClose={() => setModal(null)} maxWidth="md">
                <form onSubmit={submitJournal} className="p-6">
                    <h2 className="text-lg font-semibold text-ink">Jurnal Manual</h2>
                    <p className="text-xs text-muted">Debit harus = Kredit.</p>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-medium text-muted">Tanggal *</label>
                            <input type="date" value={journalForm.data.entry_date} onChange={(e) => journalForm.setData('entry_date', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-muted">Memo *</label>
                            <input value={journalForm.data.memo} onChange={(e) => journalForm.setData('memo', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" />
                        </div>
                    </div>
                    <div className="mt-4 space-y-2">
                        {journalForm.data.lines.map((line, idx) => (
                            <div key={idx} className="flex gap-2">
                                <select value={line.account} onChange={(e) => journalForm.setData('lines', journalForm.data.lines.map((p, i) => i === idx ? { ...p, account: e.target.value } : p))} className="flex-1 rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary">
                                    {(accounts ?? bbAccounts ?? []).map((a: any) => <option key={a.code ?? a.id} value={a.code}>{a.code} — {a.name}</option>)}
                                </select>
                                <input type="number" step="0.01" placeholder="Debit" value={line.debit} onChange={(e) => journalForm.setData('lines', journalForm.data.lines.map((p, i) => i === idx ? { ...p, debit: e.target.value } : p))} className="w-28 rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" />
                                <input type="number" step="0.01" placeholder="Kredit" value={line.credit} onChange={(e) => journalForm.setData('lines', journalForm.data.lines.map((p, i) => i === idx ? { ...p, credit: e.target.value } : p))} className="w-28 rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" />
                            </div>
                        ))}
                    </div>
                    <div className="mt-5 flex justify-end gap-3">
                        <SecondaryButton type="button" onClick={() => setModal(null)}>Batal</SecondaryButton>
                        <PrimaryButton disabled={journalForm.processing}>Simpan Jurnal</PrimaryButton>
                    </div>
                </form>
            </Modal>
        </AuthenticatedLayout>
    );
}
