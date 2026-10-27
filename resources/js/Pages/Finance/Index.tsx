import Badge, { type BadgeTone } from '@/Components/ui/Badge';
import Card from '@/Components/ui/Card';
import ConfirmModal from '@/Components/ui/ConfirmModal';
import Modal from '@/Components/Modal';
import NumericInput from '@/Components/NumericInput';
import PageHeader from '@/Components/ui/PageHeader';
import PriceInput from '@/Components/PriceInput';
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
    Pencil,
    Plus,
    Printer,
    Receipt,
    TrendingDown,
    TrendingUp,
    Trash2,
    Users,
    Wallet,
    Calculator,
} from 'lucide-react';
import { Fragment, FormEvent, useState } from 'react';

const TABS = [
    { key: 'invoice', label: 'Invoice', icon: FileText },
    { key: 'piutang', label: 'Piutang (AR)', icon: Wallet },
    { key: 'hutang', label: 'Hutang (AP)', icon: Receipt },
    { key: 'po', label: 'PO', icon: Boxes },
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
    pos,
    vesselsPo,
}: PageProps<Record<string, any>>) {
    const [modal, setModal] = useState<null | 'invoice' | 'bill' | 'payInvoice' | 'payBill' | 'cash' | 'journal' | 'editInvoice' | 'editBill' | 'editCash' | 'editJournal' | 'addAsset' | 'editAsset' | 'addSchedule' | 'editSchedule' | 'addAccount' | 'editAccount' | 'editPayrollEntry' | 'po'>(null);
    const [payTarget, setPayTarget] = useState<any>(null);
    const [editTarget, setEditTarget] = useState<any>(null);
    const [confirmDel, setConfirmDel] = useState<{ url: string; label: string; note?: string } | null>(null);
    const [busy, setBusy] = useState(false);

    const editInvoiceForm = useForm({
        customer_id: '', voyage_id: '', issue_date: '', due_date: '', pph23: false, notes: '',
        items: [{ description: '', qty: '1', price: '' }],
    });
    const editBillForm = useForm({
        supplier_id: '', voyage_id: '', category: 'assist', issue_date: '', due_date: '', pph_type: '', notes: '',
        items: [{ description: '', amount: '' }],
    });
    const editCashForm = useForm({ cash_account_id: '', direction: 'out', amount: '', date: '', category: 'lainnya', notes: '' });
    const editJournalForm = useForm({
        entry_date: '', memo: '',
        lines: [
            { account: '1001', debit: '', credit: '' },
            { account: '4300', debit: '', credit: '' },
        ],
    });
    const assetForm = useForm({
        name: '', category: 'peralatan', acquisition_cost: '', acquisition_date: new Date().toISOString().slice(0, 10),
        useful_life_months: '60', salvage_value: '', vessel_id: '',
    });
    const editAssetForm = useForm({
        name: '', category: 'peralatan', acquisition_cost: '', acquisition_date: '',
        useful_life_months: '60', salvage_value: '', status: 'aktif',
    });
    const scheduleForm = useForm({ due_date: '', amount: '', description: '' });
    const editScheduleForm = useForm({ due_date: '', amount: '', description: '', status: 'menunggu' });
    const accountForm = useForm({ code: '', name: '', type: 'expense', is_cash: false });
    const editAccountForm = useForm({ code: '', name: '', type: 'expense' });
    const payrollEntryForm = useForm({
        gaji_pokok: '', tunjangan: '', borongan_insentif: '', potongan_lain: '', bpjs: '',
    });
    const poForm = useForm({
        order_date: new Date().toISOString().slice(0, 10),
        supplier_id: '', vessel_id: '', dept: 'ENGINE', notes: '',
        items: [{ item_name: '', item_code: '', qty: '1', unit: 'pcs', price: '' }],
    });
    const payBillFormExtra = useForm({ cheque_number: '' });

    const submitPo = (e: FormEvent) => {
        e.preventDefault();
        poForm.post('/keuangan/po', { preserveScroll: true, onSuccess: () => { setModal(null); poForm.reset(); } });
    };

    const invoiceForm = useForm({
        customer_id: '', voyage_id: '', issue_date: new Date().toISOString().slice(0, 10),
        due_date: '', pph23: false, fp_number: '', invoice_kind: 'umum', pph_rate: '',
        notes: '',
        items: [{ description: 'Jasa Towing (Penarikan)', qty: '1', price: '15000000' }],
    });
    const payForm = useForm({ amount: '', bank_fee: '', cash_account_id: '', date: new Date().toISOString().slice(0, 10), method: 'transfer', cheque_number: '' });
    const billForm = useForm({
        supplier_id: '', voyage_id: '', category: 'assist',
        issue_date: new Date().toISOString().slice(0, 10), due_date: '', pph_type: '', notes: '',
        items: [{ description: 'Jasa Assist Kolong Jembatan', amount: '5000000' }],
    });
    const cashForm = useForm({ cash_account_id: '', direction: 'out', amount: '', bank_fee: '', date: new Date().toISOString().slice(0, 10), category: 'lainnya', notes: '' });
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
    const closeEdit = () => { setModal(null); setEditTarget(null); };
    const submitEditInvoice = (e: FormEvent) => {
        e.preventDefault();
        if (! editTarget) return;
        editInvoiceForm.put(`/keuangan/invoice/${editTarget.id}`, { preserveScroll: true, onSuccess: closeEdit });
    };
    const submitEditBill = (e: FormEvent) => {
        e.preventDefault();
        if (! editTarget) return;
        editBillForm.put(`/keuangan/bill/${editTarget.id}`, { preserveScroll: true, onSuccess: closeEdit });
    };
    const submitEditCash = (e: FormEvent) => {
        e.preventDefault();
        if (! editTarget) return;
        editCashForm.put(`/keuangan/cash/${editTarget.id}`, { preserveScroll: true, onSuccess: closeEdit });
    };
    const submitEditJournal = (e: FormEvent) => {
        e.preventDefault();
        if (! editTarget) return;
        editJournalForm.put(`/keuangan/jurnal/${editTarget.id}`, { preserveScroll: true, onSuccess: closeEdit });
    };
    const submitAsset = (e: FormEvent) => {
        e.preventDefault();
        assetForm.post('/keuangan/aset', { preserveScroll: true, onSuccess: () => setModal(null) });
    };
    const submitEditAsset = (e: FormEvent) => {
        e.preventDefault();
        if (! editTarget) return;
        editAssetForm.put(`/keuangan/aset/${editTarget.id}`, { preserveScroll: true, onSuccess: closeEdit });
    };
    const submitSchedule = (e: FormEvent) => {
        e.preventDefault();
        scheduleForm.post('/keuangan/jadwal', { preserveScroll: true, onSuccess: () => setModal(null) });
    };
    const submitEditSchedule = (e: FormEvent) => {
        e.preventDefault();
        if (! editTarget) return;
        editScheduleForm.put(`/keuangan/jadwal/${editTarget.id}`, { preserveScroll: true, onSuccess: closeEdit });
    };
    const submitAccount = (e: FormEvent) => {
        e.preventDefault();
        accountForm.post('/keuangan/akun', { preserveScroll: true, onSuccess: () => setModal(null) });
    };
    const submitEditAccount = (e: FormEvent) => {
        e.preventDefault();
        if (! editTarget) return;
        editAccountForm.put(`/keuangan/akun/${editTarget.id}`, { preserveScroll: true, onSuccess: closeEdit });
    };
    const submitEditPayrollEntry = (e: FormEvent) => {
        e.preventDefault();
        if (! editTarget) return;
        payrollEntryForm.put(`/keuangan/payroll-entries/${editTarget.id}`, { preserveScroll: true, onSuccess: closeEdit });
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
                                {['Nomor', 'Customer', 'Jatuh Tempo', 'Subtotal', 'PPN', 'PPh 23', 'Total', 'Dibayar', 'Status', 'Aksi'].map((h) => (
                                    <th key={h} className="px-3 py-2.5">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-hairline">
                            {(invoices?.data ?? invoices ?? []).map((i: any) => (
                                <tr key={i.id} id={`record-invoice-${i.id}`} className="hover:bg-appbg">
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
                                        {canManage && (
                                            <div className="flex justify-end gap-2 text-xs font-medium">
                                                <a
                                                    href={`/cetak/invoice/${i.id}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-primary hover:underline"
                                                >
                                                    Cetak
                                                </a>
                                                {i.voyage_id && (
                                                    <a
                                                        href={`/cetak/invoice-charter/${i.id}?kind=dp`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-primary hover:underline"
                                                    >
                                                        Cetak Charter
                                                    </a>
                                                )}
                                                {i.status !== 'paid' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => { setPayTarget({ kind: 'invoice', id: i.id, sisa: i.total - i.paid_amount, label: i.number }); setModal('payInvoice'); }}
                                                        className="text-primary hover:underline"
                                                    >
                                                        Bayar
                                                    </button>
                                                )}
                                                {i.status === 'unpaid' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setEditTarget(i);
                                                            editInvoiceForm.setData({
                                                                customer_id: String(i.customer_id ?? ''),
                                                                voyage_id: '',
                                                                issue_date: String(i.issue_date ?? '').slice(0, 10),
                                                                due_date: i.due_date ? String(i.due_date).slice(0, 10) : '',
                                                                pph23: Number(i.pph23_amount) > 0,
                                                                notes: i.notes ?? '',
                                                                items: [{ description: '', qty: '1', price: String(i.subtotal) }],
                                                            });
                                                            setModal('editInvoice');
                                                        }}
                                                        className="text-primary hover:underline"
                                                    >
                                                        Edit
                                                    </button>
                                                )}
                                                {i.status !== 'paid' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setConfirmDel({ url: `/keuangan/invoice/${i.id}`, label: `invoice ${i.number}`, note: 'Jurnal invoice akan dibatalkan.' })}
                                                        className="text-primary hover:underline"
                                                    >
                                                        Hapus
                                                    </button>
                                                )}
                                                {i.last_payment_id && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setConfirmDel({ url: `/keuangan/payment/${i.last_payment_id}`, label: `pembayaran terakhir invoice ${i.number}`, note: 'Kas & jurnal pembayaran akan dibalikkan; status invoice disesuaikan.' })}
                                                        className="text-warn hover:underline"
                                                    >
                                                        Hapus Bayar
                                                    </button>
                                                )}
                                            </div>
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
                                <li key={i.id} id={`record-invoice-${i.id}`} className="flex items-center justify-between rounded-lg border border-hairline px-3 py-2.5 text-sm">
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
                                <li key={b.id} id={`record-bill-${b.id}`} className="flex items-center justify-between rounded-lg border border-hairline px-3 py-2.5 text-sm">
                                    <div>
                                        <p className="font-medium text-ink">{b.number} · {b.supplier_name}</p>
                                        <p className="text-xs capitalize text-muted">
                                            {b.category}{b.voyage_code ? ` · ${b.voyage_code}` : ''} · jatuh tempo {formatDate(b.due_date)}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold tabular-nums text-ink">{formatRupiah(b.sisa)}</p>
                                        {canManage && (
                                            <div className="flex justify-end gap-2 text-xs font-medium">
                                                <button
                                                    type="button"
                                                    onClick={() => { setPayTarget({ kind: 'bill', id: b.id, sisa: b.sisa, label: b.number }); setModal('payBill'); }}
                                                    className="text-primary hover:underline"
                                                >
                                                    Bayar
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setEditTarget(b);
                                                        editBillForm.setData({
                                                            supplier_id: String(b.supplier_id ?? ''),
                                                            voyage_id: String(b.voyage_id ?? ''),
                                                            category: b.category ?? 'assist',
                                                            issue_date: String(b.issue_date ?? '').slice(0, 10),
                                                            due_date: b.due_date ? String(b.due_date).slice(0, 10) : '',
                                                            pph_type: b.pph_type ?? '',
                                                            notes: b.notes ?? '',
                                                            items: [{ description: b.category ?? '', amount: String(b.total) }],
                                                        });
                                                        setModal('editBill');
                                                    }}
                                                    className="text-primary hover:underline"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setConfirmDel({ url: `/keuangan/bill/${b.id}`, label: `bill ${b.number}`, note: 'Jurnal & jadwal bayar akan dibatalkan.' })}
                                                    className="text-primary hover:underline"
                                                >
                                                    Hapus
                                                </button>
                                                {b.last_payment_id && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setConfirmDel({ url: `/keuangan/bill-payment/${b.last_payment_id}`, label: `pembayaran terakhir bill ${b.number}`, note: 'Kas & jurnal pembayaran akan dibalikkan.' })}
                                                        className="text-warn hover:underline"
                                                    >
                                                        Hapus Bayar
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </Card>
                </div>
            )}

            {tab === 'jadwal' && (
                <Card
                    title="Jadwal Pembayaran Mendatang"
                    description="Otomatis dari bill + entri manual."
                    actions={
                        <>
                            <a
                                href="/laporan/export/outstanding"
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-lg border border-hairline bg-white px-3 py-1.5 text-xs font-medium text-ink hover:border-primary/40"
                            >
                                Export Excel Outstanding
                            </a>
                            {canManage && (
                                <PrimaryButton onClick={() => setModal('addSchedule')}>
                                    <Plus size={14} className="inline me-1" /> Entri Manual
                                </PrimaryButton>
                            )}
                        </>
                    }
                >
                    <ul className="divide-y divide-hairline">
                        {(schedules ?? []).map((s: any) => (
                            <li key={s.id} className="flex items-center justify-between py-2.5 text-sm">
                                <div>
                                    <p className="font-medium text-ink">{s.description}</p>
                                    <p className="text-xs text-muted">Jatuh tempo {formatDate(s.due_date)} · {s.ref_type}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="font-semibold tabular-nums">{formatRupiah(s.amount)}</span>
                                    <Badge tone={STATUS_TONES[s.status] ?? 'neutral'}>{s.status}</Badge>
                                    {canManage && (
                                        <div className="flex gap-2 text-xs font-medium">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setEditTarget(s);
                                                    editScheduleForm.setData({
                                                        due_date: String(s.due_date).slice(0, 10),
                                                        amount: String(s.amount),
                                                        description: s.description,
                                                        status: s.status,
                                                    });
                                                    setModal('editSchedule');
                                                }}
                                                className="text-primary hover:underline"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setConfirmDel({ url: `/keuangan/jadwal/${s.id}`, label: `jadwal "${s.description}"` })}
                                                className="text-primary hover:underline"
                                            >
                                                Hapus
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                </Card>
            )}

            {tab === 'po' && (
                <>
                    {canManage && (
                        <div className="mb-4">
                            <PrimaryButton onClick={() => setModal('po')}>
                                <Plus size={14} className="inline me-1" /> Purchase Order Baru
                            </PrimaryButton>
                        </div>
                    )}
                    <div className="space-y-3">
                        {(pos ?? []).map((po: any) => (
                            <div key={po.id} id={`record-po-${po.id}`} className="rounded-xl border border-hairline bg-white p-4 shadow-sm">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                        <p className="font-semibold text-ink">
                                            {po.po_number}
                                            <span className="ms-2 text-sm font-normal text-muted">→ {po.supplier_name}</span>
                                        </p>
                                        <p className="text-xs text-muted">
                                            {formatDate(po.order_date)} · {po.dept} · {po.vessel_name ?? 'Umum (tanpa unit kapal)'}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge tone={po.status === 'lunas' ? 'success' : po.status === 'di_bill' ? 'info' : po.status === 'diambil' ? 'warning' : 'neutral'}>
                                            {po.status}
                                        </Badge>
                                        <span className="font-semibold tabular-nums text-ink">{formatRupiah(po.subtotal)}</span>
                                        {canManage && (
                                            <div className="flex gap-2 text-xs font-medium">
                                                <a href={`/cetak/po/${po.id}`} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                                                    Cetak
                                                </a>
                                                {po.status === 'diterima' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => router.post(`/keuangan/po/${po.id}/receive`, {}, { preserveScroll: true })}
                                                        className="text-primary hover:underline"
                                                    >
                                                        Barang Diterima
                                                    </button>
                                                )}
                                                {po.status !== 'di_bill' && po.status !== 'lunas' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => router.post(`/keuangan/po/${po.id}/make-bill`, {}, { preserveScroll: true })}
                                                        className="text-primary hover:underline"
                                                    >
                                                        Buat Bill dari PO
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => setConfirmDel({ url: `/keuangan/po/${po.id}`, label: `PO ${po.po_number}`, note: 'Diblokir bila PO sudah memiliki bill.' })}
                                                    className="text-primary hover:underline"
                                                >
                                                    Hapus
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <table className="mt-3 w-full text-xs">
                                    <thead className="text-left uppercase text-muted">
                                        <tr>
                                            <th className="py-1">Barang</th>
                                            <th className="py-1">Kode</th>
                                            <th className="py-1 text-right">Qty</th>
                                            <th className="py-1 text-right">Harga</th>
                                            <th className="py-1 text-right">Jumlah</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-hairline/60">
                                        {po.items.map((it: any) => (
                                            <tr key={it.id}>
                                                <td className="py-1 text-ink">{it.item_name}</td>
                                                <td className="py-1 text-muted">{it.item_code ?? '—'}</td>
                                                <td className="py-1 text-right tabular-nums">{formatNumber(it.qty, 2)} {it.unit ?? ''}</td>
                                                <td className="py-1 text-right tabular-nums">{formatRupiah(it.price)}</td>
                                                <td className="py-1 text-right tabular-nums">{formatRupiah(it.amount)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {po.bill_numbers?.length > 0 && (
                                    <p className="mt-2 text-xs text-ok">Tertaut bill: {po.bill_numbers.join(', ')}</p>
                                )}
                                {po.receipt_number && (
                                    <div className="mt-2 rounded-md border border-ok/30 bg-ok/5 px-3 py-2 text-xs">
                                        <p className="font-semibold text-ok">✓ Tanda Terima: {po.receipt_number}</p>
                                        <p className="text-muted">{po.receipt_date} · {po.received_by ?? '—'}</p>
                                        {po.receipt_notes && <p className="text-muted">{po.receipt_notes}</p>}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </>
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
                                    <tr>{['Tanggal', 'Akun', 'Masuk', 'Keluar', 'Kategori', 'Ref', 'Catatan', 'Aksi'].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr>
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
                                            <td className="px-3 py-2">
                                                {canManage && (
                                                    <div className="flex gap-2 text-xs font-medium">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setEditTarget(t);
                                                                editCashForm.setData({
                                                                    cash_account_id: String(t.cash_account_id),
                                                                    direction: t.direction,
                                                                    amount: String(t.amount),
                                                                    date: String(t.date).slice(0, 10),
                                                                    category: t.category ?? 'lainnya',
                                                                    notes: t.notes ?? '',
                                                                });
                                                                setModal('editCash');
                                                            }}
                                                            className="text-primary hover:underline"
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setConfirmDel({ url: `/keuangan/cash/${t.id}`, label: `transaksi kas ${t.reference ?? t.category}`, note: 'Saldo kas & jurnal akan dibatalkan (hanya transaksi manual).' })}
                                                            className="text-primary hover:underline"
                                                        >
                                                            Hapus
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
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
                        <Card
                            key={e.id}
                            title={e.memo}
                            description={`${formatDate(e.entry_date)} · ${e.source_type} · ${e.posted_by ?? '—'}`}
                            actions={
                                canManage && e.source_type === 'manual' ? (
                                    <div className="flex gap-2 text-xs font-medium">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setEditTarget(e);
                                                editJournalForm.setData({
                                                    entry_date: String(e.entry_date).slice(0, 10),
                                                    memo: e.memo ?? '',
                                                    lines: e.lines.map((l: any) => ({ account: l.account_code, debit: l.debit > 0 ? String(l.debit) : '', credit: l.credit > 0 ? String(l.credit) : '' })),
                                                });
                                                setModal('editJournal');
                                            }}
                                            className="text-primary hover:underline"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setConfirmDel({ url: `/keuangan/jurnal/${e.id}`, label: `jurnal "${e.memo}"`, note: 'Hanya jurnal manual yang dapat dihapus.' })}
                                            className="text-primary hover:underline"
                                        >
                                            Hapus
                                        </button>
                                    </div>
                                ) : null
                            }
                        >
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
                                <Fragment key={p.id}>
                                    <tr>
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
                                    {p.status === 'draft' && (p.entries ?? []).length > 0 && (
                                        <tr>
                                            <td colSpan={6} className="bg-appbg px-3 py-2">
                                                <table className="w-full text-xs">
                                                    <thead className="text-left uppercase text-muted">
                                                        <tr>
                                                            <th className="py-1">Nama</th>
                                                            <th className="py-1">Tipe</th>
                                                            <th className="py-1 text-right">Pokok</th>
                                                            <th className="py-1 text-right">Tunjangan</th>
                                                            <th className="py-1 text-right">BPJS</th>
                                                            <th className="py-1 text-right">PPh 21</th>
                                                            <th className="py-1 text-right">Total</th>
                                                            <th className="py-1 text-right">Aksi</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-hairline/60">
                                                        {p.entries.map((en: any) => (
                                                            <tr key={en.id}>
                                                                <td className="py-1.5 text-ink">{en.person_name}</td>
                                                                <td className="py-1.5 capitalize text-muted">{en.person_type}</td>
                                                                <td className="py-1.5 text-right tabular-nums">{formatRupiah(en.gaji_pokok)}</td>
                                                                <td className="py-1.5 text-right tabular-nums">{formatRupiah(en.tunjangan)}</td>
                                                                <td className="py-1.5 text-right tabular-nums">{formatRupiah(en.bpjs)}</td>
                                                                <td className="py-1.5 text-right tabular-nums text-primary">{formatRupiah(en.pph21)}</td>
                                                                <td className="py-1.5 text-right font-semibold tabular-nums">{formatRupiah(en.total)}</td>
                                                                <td className="py-1.5 text-right">
                                                                    {canManage && (
                                                                        <span className="flex justify-end gap-2 font-medium">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setEditTarget(en);
                                                                                    payrollEntryForm.setData({
                                                                                        gaji_pokok: String(en.gaji_pokok),
                                                                                        tunjangan: String(en.tunjangan ?? 0),
                                                                                        borongan_insentif: String(en.borongan_insentif ?? 0),
                                                                                        potongan_lain: String(en.potongan_lain ?? 0),
                                                                                        bpjs: String(en.bpjs ?? 0),
                                                                                    });
                                                                                    setModal('editPayrollEntry');
                                                                                }}
                                                                                className="text-primary hover:underline"
                                                                            >
                                                                                Edit
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setConfirmDel({ url: `/keuangan/payroll-entries/${en.id}`, label: `entri payroll ${en.person_name}` })}
                                                                                className="text-primary hover:underline"
                                                                            >
                                                                                Hapus
                                                                            </button>
                                                                        </span>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </td>
                                        </tr>
                                    )}
                                </Fragment>
                            ))}
                        </tbody>
                    </table>
                </Card>
            )}

            {tab === 'aset' && (
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
                        <Card title="Aset Tetap" className="xl:col-span-2" actions={
                            canManage && (
                                <PrimaryButton onClick={() => setModal('addAsset')}>
                                    <Plus size={14} className="inline me-1" /> Aset Baru
                                </PrimaryButton>
                            )
                        }>
                        <table className="min-w-full text-sm">
                            <thead className="bg-appbg text-left text-xs uppercase text-muted">
                                <tr>{['Nama', 'Kategori', 'Perolehan', 'Umur', 'Akum. Susut', 'Nilai Buku', 'Aksi'].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr>
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
                                        <td className="px-3 py-2">
                                            {canManage && (
                                                <div className="flex gap-2 text-xs font-medium">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setEditTarget(a);
                                                            editAssetForm.setData({
                                                                name: a.name,
                                                                category: a.category,
                                                                acquisition_cost: String(a.acquisition_cost),
                                                                acquisition_date: String(a.acquisition_date ?? '').slice(0, 10),
                                                                useful_life_months: String(a.useful_life_months),
                                                                salvage_value: String(a.salvage_value ?? 0),
                                                                status: a.status ?? 'aktif',
                                                            });
                                                            setModal('editAsset');
                                                        }}
                                                        className="text-primary hover:underline"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setConfirmDel({ url: `/keuangan/aset/${a.id}`, label: `aset ${a.name}` })}
                                                        className="text-primary hover:underline"
                                                    >
                                                        Hapus
                                                    </button>
                                                </div>
                                            )}
                                        </td>
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
                <Card title="Bagan Akun (COA)" actions={
                    canManage && (
                        <PrimaryButton onClick={() => setModal('addAccount')}>
                            <Plus size={14} className="inline me-1" /> Akun Baru
                        </PrimaryButton>
                    )
                }>
                    <table className="min-w-full text-sm">
                        <thead className="bg-appbg text-left text-xs uppercase text-muted">
                            <tr>{['Kode', 'Nama', 'Tipe', 'Normal', 'Aksi'].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr>
                        </thead>
                        <tbody className="divide-y divide-hairline">
                            {(accounts ?? []).map((a: any) => (
                                <tr key={a.id}>
                                    <td className="px-3 py-2 font-mono text-ink">{a.code}</td>
                                    <td className="px-3 py-2 text-ink">{a.name}</td>
                                    <td className="px-3 py-2 capitalize text-muted">{a.type}</td>
                                    <td className="px-3 py-2 capitalize text-muted">{a.normal_balance}</td>
                                    <td className="px-3 py-2">
                                        {canManage && (
                                            <div className="flex gap-2 text-xs font-medium">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setEditTarget(a);
                                                        editAccountForm.setData({ code: a.code, name: a.name, type: a.type });
                                                        setModal('editAccount');
                                                    }}
                                                    className="text-primary hover:underline"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setConfirmDel({ url: `/keuangan/akun/${a.id}`, label: `akun ${a.code} — ${a.name}` })}
                                                    className="text-primary hover:underline"
                                                >
                                                    Hapus
                                                </button>
                                            </div>
                                        )}
                                    </td>
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
                                <NumericInput decimalPlaces={2} value={item.qty} onChange={(e) => invoiceForm.setData('items', invoiceForm.data.items.map((p, i) => i === idx ? { ...p, qty: e.target.value } : p))} className="w-20 rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" />
                                <PriceInput value={item.price} onChange={(e) => invoiceForm.setData('items', invoiceForm.data.items.map((p, i) => i === idx ? { ...p, price: e.target.value } : p))} className="w-36 rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" />
                            </div>
                        ))}
                        <button type="button" onClick={() => invoiceForm.setData('items', [...invoiceForm.data.items, { description: 'Tiket Penumpang', qty: '1', price: '185000' }])} className="mt-2 text-xs font-medium text-primary hover:underline">+ Tambah baris</button>
                    </div>
                    <label className="mt-3 flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={invoiceForm.data.pph23} onChange={(e) => invoiceForm.setData('pph23', e.target.checked)} className="rounded border-gray-300 text-primary focus:ring-primary" />
                        Potong PPh 23 jasa (2%)
                    </label>
                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div>
                            <label className="text-xs font-medium text-muted">Tahap Invoice</label>
                            <select value={invoiceForm.data.invoice_kind} onChange={(e) => invoiceForm.setData('invoice_kind', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary">
                                <option value="umum">Umum</option>
                                <option value="dp">Charter — DP</option>
                                <option value="pelunasan">Charter — Pelunasan</option>
                                <option value="dp100">Charter — DP 100%</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-muted">Tarif PPh (khusus; kosongkan = 2%)</label>
                            <select value={invoiceForm.data.pph_rate} onChange={(e) => invoiceForm.setData('pph_rate', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary">
                                <option value="">— ikuti checkbox PPh 23 —</option>
                                <option value="0.012">1,2% (charter — materi klien)</option>
                                <option value="0.02">2% (jasa reguler)</option>
                                <option value="0.005">0,5%</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-muted">No. Faktur Pajak</label>
                            <input value={invoiceForm.data.fp_number} onChange={(e) => invoiceForm.setData('fp_number', e.target.value)} placeholder="010.045-777.197.2026" className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" />
                        </div>
                    </div>
                    <p className="mt-2 text-xs text-muted">PPN 11% dihitung otomatis. Total tagihan = subtotal + PPN − PPh. FP hanya dicatat nomornya + file diunggah — sistem tidak menerbitkan Faktur Pajak (legalitas DJP).</p>
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
                                <PriceInput value={item.amount} onChange={(e) => billForm.setData('items', billForm.data.items.map((p, i) => i === idx ? { ...p, amount: e.target.value } : p))} className="w-36 rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" />
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
                            <label className="text-xs font-medium text-muted">Jumlah Bruto *</label>
                            <PriceInput max={payTarget?.sisa} value={payForm.data.amount} onChange={(e) => payForm.setData('amount', e.target.value)} className="mt-1 block w-full" />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-muted">Potongan / Biaya Bank</label>
                            <PriceInput min="0" value={payForm.data.bank_fee} onChange={(e) => payForm.setData('bank_fee', e.target.value)} placeholder="0" className="mt-1 block w-full" />
                        </div>
                        <div className="col-span-2">
                            <label className="text-xs font-medium text-muted">Akun Kas/Bank *</label>
                            <select value={payForm.data.cash_account_id} onChange={(e) => payForm.setData('cash_account_id', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary">
                                <option value="">— pilih —</option>
                                {(cashAccounts ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.name} ({formatRupiah(c.balance)})</option>)}
                            </select>
                        </div>
                        {(Number(payForm.data.amount) > 0 || Number(payForm.data.bank_fee) > 0) && (
                            <div className="col-span-2 rounded-lg border border-hairline bg-appbg px-3 py-2 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-muted">Bruto</span>
                                    <span className="font-mono font-medium text-ink">{formatRupiah(Number(payForm.data.amount))}</span>
                                </div>
                                <div className="flex justify-between text-warn">
                                    <span>Potongan bank</span>
                                    <span className="font-mono">- {formatRupiah(Number(payForm.data.bank_fee ?? 0))}</span>
                                </div>
                                <div className="mt-1 flex justify-between border-t border-hairline pt-1 font-semibold">
                                    <span className="text-ink">{modal === 'payInvoice' ? 'Bersih diterima' : 'Total dikeluarkan'}</span>
                                    <span className="font-mono text-primary">{formatRupiah(modal === 'payInvoice' ? Math.max(0, Number(payForm.data.amount) - Number(payForm.data.bank_fee ?? 0)) : Number(payForm.data.amount) + Number(payForm.data.bank_fee ?? 0))}</span>
                                </div>
                            </div>
                        )}
                        <div>
                            <label className="text-xs font-medium text-muted">Tanggal *</label>
                            <input type="date" value={payForm.data.date} onChange={(e) => payForm.setData('date', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-muted">Metode</label>
                            <select value={payForm.data.method} onChange={(e) => payForm.setData('method', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary">
                                <option value="transfer">Transfer</option>
                                <option value="cash">Tunai</option>
                                <option value="giro">Cek / BG (Giro)</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-muted">No. Cek / BG</label>
                            <input value={payForm.data.cheque_number} onChange={(e) => payForm.setData('cheque_number', e.target.value)} placeholder="mis. BG 123456" className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" />
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
                                <label className="text-xs font-medium text-muted">Jumlah Bruto *</label>
                                <PriceInput value={cashForm.data.amount} onChange={(e) => cashForm.setData('amount', e.target.value)} className="mt-1 block w-full" />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-muted">Biaya Bank</label>
                                <PriceInput min="0" value={cashForm.data.bank_fee} onChange={(e) => cashForm.setData('bank_fee', e.target.value)} placeholder="0" className="mt-1 block w-full" />
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
                                <PriceInput placeholder="Debit" value={line.debit} onChange={(e) => journalForm.setData('lines', journalForm.data.lines.map((p, i) => i === idx ? { ...p, debit: e.target.value } : p))} className="w-28 rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" />
                                <PriceInput placeholder="Kredit" value={line.credit} onChange={(e) => journalForm.setData('lines', journalForm.data.lines.map((p, i) => i === idx ? { ...p, credit: e.target.value } : p))} className="w-28 rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" />
                            </div>
                        ))}
                    </div>
                    <div className="mt-5 flex justify-end gap-3">
                        <SecondaryButton type="button" onClick={() => setModal(null)}>Batal</SecondaryButton>
                        <PrimaryButton disabled={journalForm.processing}>Simpan Jurnal</PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* ===== MODALS CRUD (Fase A) ===== */}

            <Modal show={modal === 'editInvoice'} onClose={closeEdit} maxWidth="lg">
                <form onSubmit={submitEditInvoice} className="p-6">
                    <h2 className="text-lg font-semibold text-ink">Edit Invoice {editTarget?.number}</h2>
                    <p className="text-xs text-muted">Hanya invoice tanpa pembayaran. Jurnal ditulis ulang otomatis.</p>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-medium text-muted">Customer *</label>
                            <select value={editInvoiceForm.data.customer_id} onChange={(e) => editInvoiceForm.setData('customer_id', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary">
                                <option value="">— pilih —</option>
                                {(customers ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-muted">Tertaut Voyage</label>
                            <select value={editInvoiceForm.data.voyage_id} onChange={(e) => editInvoiceForm.setData('voyage_id', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary">
                                <option value="">— tanpa voyage —</option>
                                {(voyagesList ?? []).map((v: any) => <option key={v.id} value={v.id}>{v.voyage_code}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-muted">Tanggal *</label>
                            <input type="date" value={editInvoiceForm.data.issue_date} onChange={(e) => editInvoiceForm.setData('issue_date', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-muted">Jatuh Tempo</label>
                            <input type="date" value={editInvoiceForm.data.due_date} onChange={(e) => editInvoiceForm.setData('due_date', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-muted">Deskripsi Item *</label>
                            <input value={editInvoiceForm.data.items[0].description} onChange={(e) => editInvoiceForm.setData('items', [{ ...editInvoiceForm.data.items[0], description: e.target.value }])} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" placeholder="mis. Jasa Towing" />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-muted">Nilai (Rp) *</label>
                            <PriceInput value={editInvoiceForm.data.items[0].price} onChange={(e) => editInvoiceForm.setData('items', [{ ...editInvoiceForm.data.items[0], price: e.target.value }])} className="mt-1 block w-full" />
                        </div>
                        <label className="col-span-2 flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={editInvoiceForm.data.pph23} onChange={(e) => editInvoiceForm.setData('pph23', e.target.checked)} className="rounded border-gray-300 text-primary focus:ring-primary" />
                            Potong PPh 23 (2%) — PPN 11% dihitung otomatis
                        </label>
                    </div>
                    <div className="mt-5 flex justify-end gap-3">
                        <SecondaryButton type="button" onClick={closeEdit}>Batal</SecondaryButton>
                        <PrimaryButton disabled={editInvoiceForm.processing}>Simpan & Tulis Ulang Jurnal</PrimaryButton>
                    </div>
                </form>
            </Modal>

            <Modal show={modal === 'editBill'} onClose={closeEdit} maxWidth="lg">
                <form onSubmit={submitEditBill} className="p-6">
                    <h2 className="text-lg font-semibold text-ink">Edit Bill {editTarget?.number}</h2>
                    <p className="text-xs text-muted">Hanya bill tanpa pembayaran. Jurnal ditulis ulang otomatis.</p>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-medium text-muted">Supplier *</label>
                            <select value={editBillForm.data.supplier_id} onChange={(e) => editBillForm.setData('supplier_id', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary">
                                <option value="">— pilih —</option>
                                {(suppliers ?? []).map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-muted">Kategori *</label>
                            <select value={editBillForm.data.category} onChange={(e) => editBillForm.setData('category', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary">
                                {['assist', 'sparepart', 'drydock', 'bbm', 'jasa_bengkel', 'sewa', 'lainnya'].map((c) => <option key={c} value={c}>{c === 'assist' ? 'Jasa Assist Kolong Jembatan' : c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-muted">Tanggal *</label>
                            <input type="date" value={editBillForm.data.issue_date} onChange={(e) => editBillForm.setData('issue_date', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-muted">Jatuh Tempo</label>
                            <input type="date" value={editBillForm.data.due_date} onChange={(e) => editBillForm.setData('due_date', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-muted">PPh Dipotong</label>
                            <select value={editBillForm.data.pph_type} onChange={(e) => editBillForm.setData('pph_type', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary">
                                <option value="">— tidak —</option>
                                <option value="pph23">PPh 23 (2%)</option>
                                <option value="pph4(2)">PPh 4(2) (2,5%)</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-muted">Deskripsi *</label>
                            <input value={editBillForm.data.items[0].description} onChange={(e) => editBillForm.setData('items', [{ ...editBillForm.data.items[0], description: e.target.value }])} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-muted">Nilai (Rp) *</label>
                            <PriceInput value={editBillForm.data.items[0].amount} onChange={(e) => editBillForm.setData('items', [{ ...editBillForm.data.items[0], amount: e.target.value }])} className="mt-1 block w-full" />
                        </div>
                    </div>
                    <div className="mt-5 flex justify-end gap-3">
                        <SecondaryButton type="button" onClick={closeEdit}>Batal</SecondaryButton>
                        <PrimaryButton disabled={editBillForm.processing}>Simpan & Tulis Ulang Jurnal</PrimaryButton>
                    </div>
                </form>
            </Modal>

            <Modal show={modal === 'editCash'} onClose={closeEdit} maxWidth="md">
                <form onSubmit={submitEditCash} className="p-6">
                    <h2 className="text-lg font-semibold text-ink">Edit Transaksi Kas Manual</h2>
                    <p className="text-xs text-muted">Saldo kas & jurnal disesuaikan otomatis. Transaksi dari invoice/bill tidak bisa diedit di sini.</p>
                    <div className="mt-4 space-y-3">
                        <div>
                            <label className="text-xs font-medium text-muted">Akun Kas/Bank *</label>
                            <select value={editCashForm.data.cash_account_id} onChange={(e) => editCashForm.setData('cash_account_id', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary">
                                {(cashAccounts ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-medium text-muted">Arah *</label>
                                <select value={editCashForm.data.direction} onChange={(e) => editCashForm.setData('direction', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary">
                                    <option value="in">Masuk</option>
                                    <option value="out">Keluar</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-muted">Kategori</label>
                                <select value={editCashForm.data.category} onChange={(e) => editCashForm.setData('category', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary">
                                    {['lainnya', 'bbm', 'gaji', 'pajak', 'servis', 'pendapatan'].map((c) => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-muted">Jumlah *</label>
                                <PriceInput value={editCashForm.data.amount} onChange={(e) => editCashForm.setData('amount', e.target.value)} className="mt-1 block w-full" />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-muted">Tanggal *</label>
                                <input type="date" value={editCashForm.data.date} onChange={(e) => editCashForm.setData('date', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" />
                            </div>
                        </div>
                    </div>
                    <div className="mt-5 flex justify-end gap-3">
                        <SecondaryButton type="button" onClick={closeEdit}>Batal</SecondaryButton>
                        <PrimaryButton disabled={editCashForm.processing}>Simpan</PrimaryButton>
                    </div>
                </form>
            </Modal>

            <Modal show={modal === 'editJournal'} onClose={closeEdit} maxWidth="md">
                <form onSubmit={submitEditJournal} className="p-6">
                    <h2 className="text-lg font-semibold text-ink">Edit Jurnal Manual</h2>
                    <p className="text-xs text-muted">Jurnal lama dihapus & ditulis ulang. Debit harus = Kredit.</p>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-medium text-muted">Tanggal *</label>
                            <input type="date" value={editJournalForm.data.entry_date} onChange={(e) => editJournalForm.setData('entry_date', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-muted">Memo *</label>
                            <input value={editJournalForm.data.memo} onChange={(e) => editJournalForm.setData('memo', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" />
                        </div>
                    </div>
                    <div className="mt-4 space-y-2">
                        {editJournalForm.data.lines.map((line, idx) => (
                            <div key={idx} className="flex gap-2">
                                <select value={line.account} onChange={(e) => editJournalForm.setData('lines', editJournalForm.data.lines.map((p, i) => i === idx ? { ...p, account: e.target.value } : p))} className="flex-1 rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary">
                                    {(bbAccounts ?? accounts ?? []).map((a: any) => <option key={a.code} value={a.code}>{a.code} — {a.name}</option>)}
                                </select>
                                <PriceInput placeholder="Debit" value={line.debit} onChange={(e) => editJournalForm.setData('lines', editJournalForm.data.lines.map((p, i) => i === idx ? { ...p, debit: e.target.value } : p))} className="w-28 rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" />
                                <PriceInput placeholder="Kredit" value={line.credit} onChange={(e) => editJournalForm.setData('lines', editJournalForm.data.lines.map((p, i) => i === idx ? { ...p, credit: e.target.value } : p))} className="w-28 rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" />
                            </div>
                        ))}
                    </div>
                    <div className="mt-5 flex justify-end gap-3">
                        <SecondaryButton type="button" onClick={closeEdit}>Batal</SecondaryButton>
                        <PrimaryButton disabled={editJournalForm.processing}>Tulis Ulang</PrimaryButton>
                    </div>
                </form>
            </Modal>

            <Modal show={modal === 'addAsset'} onClose={() => setModal(null)} maxWidth="md">
                <form onSubmit={submitAsset} className="p-6">
                    <h2 className="text-lg font-semibold text-ink">Aset Tetap Baru</h2>
                    <div className="mt-4 space-y-3">
                        <div><label className="text-xs font-medium text-muted">Nama *</label>
                            <input value={assetForm.data.name} onChange={(e) => assetForm.setData('name', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" /></div>
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className="text-xs font-medium text-muted">Kategori</label>
                                <select value={assetForm.data.category} onChange={(e) => assetForm.setData('category', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary">
                                    {['kapal', 'tongkang', 'peralatan', 'kendaraan', 'bangunan', 'lainnya'].map((c) => <option key={c} value={c}>{c}</option>)}
                                </select></div>
                            <div><label className="text-xs font-medium text-muted">Nilai Perolehan *</label>
                                <PriceInput value={assetForm.data.acquisition_cost} onChange={(e) => assetForm.setData('acquisition_cost', e.target.value)} className="mt-1 block w-full" /></div>
                            <div><label className="text-xs font-medium text-muted">Tanggal Perolehan *</label>
                                <input type="date" value={assetForm.data.acquisition_date} onChange={(e) => assetForm.setData('acquisition_date', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" /></div>
                            <div><label className="text-xs font-medium text-muted">Umur (bulan) *</label>
                                <NumericInput value={assetForm.data.useful_life_months} onChange={(e) => assetForm.setData('useful_life_months', e.target.value)} className="mt-1 block w-full" /></div>
                            <div><label className="text-xs font-medium text-muted">Nilai Sisa</label>
                                <PriceInput value={assetForm.data.salvage_value} onChange={(e) => assetForm.setData('salvage_value', e.target.value)} className="mt-1 block w-full" /></div>
                        </div>
                    </div>
                    <div className="mt-5 flex justify-end gap-3">
                        <SecondaryButton type="button" onClick={() => setModal(null)}>Batal</SecondaryButton>
                        <PrimaryButton disabled={assetForm.processing}>Simpan Aset</PrimaryButton>
                    </div>
                </form>
            </Modal>

            <Modal show={modal === 'editAsset'} onClose={closeEdit} maxWidth="md">
                <form onSubmit={submitEditAsset} className="p-6">
                    <h2 className="text-lg font-semibold text-ink">Edit Aset — {editTarget?.name}</h2>
                    <div className="mt-4 space-y-3">
                        <div><label className="text-xs font-medium text-muted">Nama *</label>
                            <input value={editAssetForm.data.name} onChange={(e) => editAssetForm.setData('name', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" /></div>
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className="text-xs font-medium text-muted">Kategori</label>
                                <select value={editAssetForm.data.category} onChange={(e) => editAssetForm.setData('category', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary">
                                    {['kapal', 'tongkang', 'peralatan', 'kendaraan', 'bangunan', 'lainnya'].map((c) => <option key={c} value={c}>{c}</option>)}
                                </select></div>
                            <div><label className="text-xs font-medium text-muted">Nilai Perolehan *</label>
                                <PriceInput value={editAssetForm.data.acquisition_cost} onChange={(e) => editAssetForm.setData('acquisition_cost', e.target.value)} className="mt-1 block w-full" /></div>
                            <div><label className="text-xs font-medium text-muted">Tanggal Perolehan *</label>
                                <input type="date" value={editAssetForm.data.acquisition_date} onChange={(e) => editAssetForm.setData('acquisition_date', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" /></div>
                            <div><label className="text-xs font-medium text-muted">Umur (bulan) *</label>
                                <NumericInput value={editAssetForm.data.useful_life_months} onChange={(e) => editAssetForm.setData('useful_life_months', e.target.value)} className="mt-1 block w-full" /></div>
                            <div><label className="text-xs font-medium text-muted">Nilai Sisa</label>
                                <PriceInput value={editAssetForm.data.salvage_value} onChange={(e) => editAssetForm.setData('salvage_value', e.target.value)} className="mt-1 block w-full" /></div>
                            <div><label className="text-xs font-medium text-muted">Status</label>
                                <select value={editAssetForm.data.status} onChange={(e) => editAssetForm.setData('status', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary">
                                    <option value="aktif">Aktif</option>
                                    <option value="disposal">Disposal</option>
                                </select></div>
                        </div>
                    </div>
                    <div className="mt-5 flex justify-end gap-3">
                        <SecondaryButton type="button" onClick={closeEdit}>Batal</SecondaryButton>
                        <PrimaryButton disabled={editAssetForm.processing}>Simpan</PrimaryButton>
                    </div>
                </form>
            </Modal>

            <Modal show={modal === 'addSchedule'} onClose={() => setModal(null)} maxWidth="md">
                <form onSubmit={submitSchedule} className="p-6">
                    <h2 className="text-lg font-semibold text-ink">Entri Jadwal Bayar Manual</h2>
                    <div className="mt-4 space-y-3">
                        <div><label className="text-xs font-medium text-muted">Deskripsi *</label>
                            <input value={scheduleForm.data.description} onChange={(e) => scheduleForm.setData('description', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" placeholder="mis. Sewa gudang bulan depan" /></div>
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className="text-xs font-medium text-muted">Jumlah *</label>
                                <PriceInput value={scheduleForm.data.amount} onChange={(e) => scheduleForm.setData('amount', e.target.value)} className="mt-1 block w-full" /></div>
                            <div><label className="text-xs font-medium text-muted">Jatuh Tempo *</label>
                                <input type="date" value={scheduleForm.data.due_date} onChange={(e) => scheduleForm.setData('due_date', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" /></div>
                        </div>
                    </div>
                    <div className="mt-5 flex justify-end gap-3">
                        <SecondaryButton type="button" onClick={() => setModal(null)}>Batal</SecondaryButton>
                        <PrimaryButton disabled={scheduleForm.processing}>Simpan</PrimaryButton>
                    </div>
                </form>
            </Modal>

            <Modal show={modal === 'editSchedule'} onClose={closeEdit} maxWidth="md">
                <form onSubmit={submitEditSchedule} className="p-6">
                    <h2 className="text-lg font-semibold text-ink">Edit Jadwal Bayar</h2>
                    <div className="mt-4 space-y-3">
                        <div><label className="text-xs font-medium text-muted">Deskripsi *</label>
                            <input value={editScheduleForm.data.description} onChange={(e) => editScheduleForm.setData('description', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" /></div>
                        <div className="grid grid-cols-3 gap-3">
                            <div><label className="text-xs font-medium text-muted">Jumlah *</label>
                                <PriceInput value={editScheduleForm.data.amount} onChange={(e) => editScheduleForm.setData('amount', e.target.value)} className="mt-1 block w-full" /></div>
                            <div><label className="text-xs font-medium text-muted">Jatuh Tempo *</label>
                                <input type="date" value={editScheduleForm.data.due_date} onChange={(e) => editScheduleForm.setData('due_date', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" /></div>
                            <div><label className="text-xs font-medium text-muted">Status</label>
                                <select value={editScheduleForm.data.status} onChange={(e) => editScheduleForm.setData('status', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary">
                                    {['menunggu', 'lunas', 'telat'].map((s) => <option key={s} value={s}>{s}</option>)}
                                </select></div>
                        </div>
                    </div>
                    <div className="mt-5 flex justify-end gap-3">
                        <SecondaryButton type="button" onClick={closeEdit}>Batal</SecondaryButton>
                        <PrimaryButton disabled={editScheduleForm.processing}>Simpan</PrimaryButton>
                    </div>
                </form>
            </Modal>

            <Modal show={modal === 'addAccount'} onClose={() => setModal(null)} maxWidth="md">
                <form onSubmit={submitAccount} className="p-6">
                    <h2 className="text-lg font-semibold text-ink">Akun COA Baru</h2>
                    <div className="mt-4 space-y-3">
                        <div><label className="text-xs font-medium text-muted">Kode *</label>
                            <input value={accountForm.data.code} onChange={(e) => accountForm.setData('code', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" placeholder="mis. 5700" /></div>
                        <div><label className="text-xs font-medium text-muted">Nama *</label>
                            <input value={accountForm.data.name} onChange={(e) => accountForm.setData('name', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" /></div>
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className="text-xs font-medium text-muted">Tipe</label>
                                <select value={accountForm.data.type} onChange={(e) => accountForm.setData('type', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary">
                                    {['asset', 'liability', 'equity', 'revenue', 'expense'].map((t) => <option key={t} value={t}>{t}</option>)}
                                </select></div>
                            <label className="flex items-end gap-2 pb-2 text-sm">
                                <input type="checkbox" checked={accountForm.data.is_cash} onChange={(e) => accountForm.setData('is_cash', e.target.checked)} className="rounded border-gray-300 text-primary focus:ring-primary" />
                                Akun kas/bank
                            </label>
                        </div>
                    </div>
                    <div className="mt-5 flex justify-end gap-3">
                        <SecondaryButton type="button" onClick={() => setModal(null)}>Batal</SecondaryButton>
                        <PrimaryButton disabled={accountForm.processing}>Simpan Akun</PrimaryButton>
                    </div>
                </form>
            </Modal>

            <Modal show={modal === 'editAccount'} onClose={closeEdit} maxWidth="md">
                <form onSubmit={submitEditAccount} className="p-6">
                    <h2 className="text-lg font-semibold text-ink">Edit Akun — {editTarget?.code}</h2>
                    <div className="mt-4 space-y-3">
                        <div><label className="text-xs font-medium text-muted">Kode *</label>
                            <input value={editAccountForm.data.code} onChange={(e) => editAccountForm.setData('code', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" /></div>
                        <div><label className="text-xs font-medium text-muted">Nama *</label>
                            <input value={editAccountForm.data.name} onChange={(e) => editAccountForm.setData('name', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" /></div>
                        <div><label className="text-xs font-medium text-muted">Tipe</label>
                            <select value={editAccountForm.data.type} onChange={(e) => editAccountForm.setData('type', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary">
                                {['asset', 'liability', 'equity', 'revenue', 'expense'].map((t) => <option key={t} value={t}>{t}</option>)}
                            </select></div>
                    </div>
                    <div className="mt-5 flex justify-end gap-3">
                        <SecondaryButton type="button" onClick={closeEdit}>Batal</SecondaryButton>
                        <PrimaryButton disabled={editAccountForm.processing}>Simpan</PrimaryButton>
                    </div>
                </form>
            </Modal>

            <Modal show={modal === 'editPayrollEntry'} onClose={closeEdit} maxWidth="md">
                <form onSubmit={submitEditPayrollEntry} className="p-6">
                    <h2 className="text-lg font-semibold text-ink">Edit Entri Payroll — {editTarget?.person_name}</h2>
                    <p className="text-xs text-muted">Hanya periode DRAFT. PPh 21 dihitung ulang otomatis (tarif UU HPP).</p>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                        <div><label className="text-xs font-medium text-muted">Gaji Pokok *</label>
                            <PriceInput value={payrollEntryForm.data.gaji_pokok} onChange={(e) => payrollEntryForm.setData('gaji_pokok', e.target.value)} className="mt-1 block w-full" /></div>
                        <div><label className="text-xs font-medium text-muted">Tunjangan</label>
                            <PriceInput value={payrollEntryForm.data.tunjangan} onChange={(e) => payrollEntryForm.setData('tunjangan', e.target.value)} className="mt-1 block w-full" /></div>
                        <div><label className="text-xs font-medium text-muted">Borongan/Insentif</label>
                            <PriceInput value={payrollEntryForm.data.borongan_insentif} onChange={(e) => payrollEntryForm.setData('borongan_insentif', e.target.value)} className="mt-1 block w-full" /></div>
                        <div><label className="text-xs font-medium text-muted">Potongan Lain</label>
                            <PriceInput value={payrollEntryForm.data.potongan_lain} onChange={(e) => payrollEntryForm.setData('potongan_lain', e.target.value)} className="mt-1 block w-full" /></div>
                        <div><label className="text-xs font-medium text-muted">BPJS</label>
                            <PriceInput value={payrollEntryForm.data.bpjs} onChange={(e) => payrollEntryForm.setData('bpjs', e.target.value)} className="mt-1 block w-full" /></div>
                    </div>
                    <div className="mt-5 flex justify-end gap-3">
                        <SecondaryButton type="button" onClick={closeEdit}>Batal</SecondaryButton>
                        <PrimaryButton disabled={payrollEntryForm.processing}>Simpan</PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* Modal: Purchase Order */}
            <Modal show={modal === 'po'} onClose={() => setModal(null)} maxWidth="lg">
                <form onSubmit={submitPo} className="p-6">
                    <h2 className="text-lg font-semibold text-ink">Purchase Order Baru</h2>
                    <p className="text-xs text-muted">Nomor PO terbit otomatis ({'{seq}/PO-BT/TB/{bulan romawi}/{tahun}'}). Unit kapal kosong = PO Umum.</p>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-medium text-muted">Tanggal *</label>
                            <input type="date" value={poForm.data.order_date} onChange={(e) => poForm.setData('order_date', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-muted">Supplier *</label>
                            <select value={poForm.data.supplier_id} onChange={(e) => poForm.setData('supplier_id', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary">
                                <option value="">— pilih —</option>
                                {(suppliers ?? []).map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-muted">Unit Kapal (PO milik kapal)</label>
                            <select value={poForm.data.vessel_id} onChange={(e) => poForm.setData('vessel_id', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary">
                                <option value="">— umum (kantor) —</option>
                                {(vesselsPo ?? []).map((v: any) => <option key={v.id} value={v.id}>{v.vessel_name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-muted">Dept *</label>
                            <select value={poForm.data.dept} onChange={(e) => poForm.setData('dept', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary">
                                {['ENGINE', 'DECK', 'HRD', 'OPERATION'].map((d) => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="mt-4">
                        <label className="text-xs font-medium text-muted">Item *</label>
                        {poForm.data.items.map((row, idx) => (
                            <div key={idx} className="mt-2 grid grid-cols-12 gap-2">
                                <input placeholder="Nama barang" value={row.item_name} onChange={(e) => poForm.setData('items', poForm.data.items.map((p, i) => i === idx ? { ...p, item_name: e.target.value } : p))} className="col-span-5 rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" />
                                <input placeholder="No. barang" value={row.item_code} onChange={(e) => poForm.setData('items', poForm.data.items.map((p, i) => i === idx ? { ...p, item_code: e.target.value } : p))} className="col-span-2 rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" />
                                <NumericInput decimalPlaces={2} placeholder="Qty" value={row.qty} onChange={(e) => poForm.setData('items', poForm.data.items.map((p, i) => i === idx ? { ...p, qty: e.target.value } : p))} className="col-span-1 rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" />
                                <input placeholder="Satuan" value={row.unit} onChange={(e) => poForm.setData('items', poForm.data.items.map((p, i) => i === idx ? { ...p, unit: e.target.value } : p))} className="col-span-1 rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" />
                                <PriceInput placeholder="Harga" value={row.price} onChange={(e) => poForm.setData('items', poForm.data.items.map((p, i) => i === idx ? { ...p, price: e.target.value } : p))} className="col-span-3 rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" />
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={() => poForm.setData('items', [...poForm.data.items, { item_name: '', item_code: '', qty: '1', unit: 'pcs', price: '' }])}
                            className="mt-2 text-xs font-medium text-primary hover:underline"
                        >
                            + Tambah baris item
                        </button>
                    </div>
                    <div className="mt-5 flex justify-end gap-3">
                        <SecondaryButton type="button" onClick={() => setModal(null)}>Batal</SecondaryButton>
                        <PrimaryButton disabled={poForm.processing}>Terbitkan PO</PrimaryButton>
                    </div>
                </form>
            </Modal>

            <ConfirmModal
                show={!!confirmDel}
                title="Hapus / batalkan data ini?"
                message={confirmDel ? `${confirmDel.label} — ${confirmDel.note ?? 'Tindakan tercatat di audit trail.'}` : ''}
                processing={busy}
                onClose={() => setConfirmDel(null)}
                onConfirm={() => {
                    if (! confirmDel) return;
                    setBusy(true);
                    router.delete(confirmDel.url, {
                        preserveScroll: true,
                        onFinish: () => { setBusy(false); setConfirmDel(null); },
                    });
                }}
            />
        </AuthenticatedLayout>
    );
}
