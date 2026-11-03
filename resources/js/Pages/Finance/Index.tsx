import Badge, { type BadgeTone } from '@/Components/ui/Badge';
import Card from '@/Components/ui/Card';
import ConfirmModal from '@/Components/ui/ConfirmModal';
import Modal from '@/Components/Modal';
import NumericInput from '@/Components/NumericInput';
import PageHeader from '@/Components/ui/PageHeader';
import PriceInput from '@/Components/PriceInput';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TabNav from '@/Components/ui/TabNav';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { classNames, formatDate, formatDateTime, formatNumber, formatRupiah } from '@/lib/format';
import { type PageProps } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import {
    Table, Tag, Button, Input, Select, Row, Col, Skeleton, Divider, Tooltip,
    DatePicker, Switch, Form, InputNumber, Checkbox,
} from 'antd';
import {
    BookOpen, Boxes, Coins, FileText, Landmark, Pencil, Plus, Printer, Receipt,
    TrendingDown, TrendingUp, Trash2, Users, Wallet, Calculator,
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

// 15 tab dikelompokkan agar tidak menumpuk dalam satu baris.
const TAB_CLUSTERS: Array<{ key: string; label: string; tabs: string[] }> = [
    { key: 'penjualan', label: 'Penjualan & Piutang', tabs: ['invoice', 'piutang', 'jadwal'] },
    { key: 'pembelian', label: 'Pembelian & Hutang', tabs: ['hutang', 'po'] },
    { key: 'akuntansi', label: 'Kas & Akuntansi', tabs: ['kas', 'jurnal', 'bb', 'lr', 'neraca', 'pl', 'akun'] },
    { key: 'pajak', label: 'Pajak, Payroll & Aset', tabs: ['pajak', 'payroll', 'aset'] },
];

const STATUS_TONES: Record<string, BadgeTone> = {
    paid: 'success', lunas: 'success', partial: 'warning', unpaid: 'danger',
    draft: 'neutral', menunggu: 'warning', telat: 'danger', posted: 'success',
    tercatat: 'info', setor: 'success',
};
export default function FinanceIndex({
    tab, canManage, customers, suppliers, voyagesList, cashAccounts, serviceCatalog,
    invoices, openInvoices, aging, openBills, assistTotal, schedules, cashTransactions,
    entries, bbAccount, bbAccounts, bbLines, bbBalance, lrPeriod, pendapatan, beban,
    neracaAsof, neracaRows, labaBerjalan, revenues, expenses, projectPL, pajakPeriod,
    ppnKeluaran, ppnMasukan, ppnNet, pph23Kutip, withholdings, payrollPeriods, assets,
    accounts, pos, vesselsPo,
    receivables, payables, receivableCount, payableCount, monthRevenue, monthCost,
}: PageProps<Record<string, any>>) {
    const [modal, setModal] = useState<null | 'invoice' | 'bill' | 'payInvoice' | 'payBill' | 'cash' | 'journal' | 'editInvoice' | 'editBill' | 'editCash' | 'editJournal' | 'addAsset' | 'editAsset' | 'addSchedule' | 'editSchedule' | 'addAccount' | 'editAccount' | 'editPayrollEntry' | 'po'>(null);
    const activeCluster = TAB_CLUSTERS.find((c) => c.tabs.includes(tab)) ?? TAB_CLUSTERS[0];
    const clusterTabs = TABS.filter((t) => activeCluster.tabs.includes(t.key));
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
        lines: [{ account: '1001', debit: '', credit: '' }, { account: '4300', debit: '', credit: '' }],
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
        lines: [{ account: '1001', debit: '', credit: '' }, { account: '4300', debit: '', credit: '' }],
    });

    const submitInvoice = (e: FormEvent) => { e.preventDefault(); invoiceForm.post('/keuangan/invoice', { preserveScroll: true, onSuccess: () => setModal(null) }); };
    const submitPay = (e: FormEvent) => { e.preventDefault(); if (!payTarget) return; payForm.post(`/keuangan/${payTarget.kind}/${payTarget.id}/pay`, { preserveScroll: true, onSuccess: () => { setModal(null); setPayTarget(null); } }); };
    const submitBill = (e: FormEvent) => { e.preventDefault(); billForm.post('/keuangan/bill', { preserveScroll: true, onSuccess: () => setModal(null) }); };
    const submitCash = (e: FormEvent) => { e.preventDefault(); cashForm.post('/keuangan/cash', { preserveScroll: true, onSuccess: () => setModal(null) }); };
    const submitJournal = (e: FormEvent) => { e.preventDefault(); journalForm.post('/keuangan/jurnal', { preserveScroll: true, onSuccess: () => setModal(null) }); };
    const closeEdit = () => { setModal(null); setEditTarget(null); };
    const submitEditInvoice = (e: FormEvent) => { e.preventDefault(); if (!editTarget) return; editInvoiceForm.put(`/keuangan/invoice/${editTarget.id}`, { preserveScroll: true, onSuccess: closeEdit }); };
    const submitEditBill = (e: FormEvent) => { e.preventDefault(); if (!editTarget) return; editBillForm.put(`/keuangan/bill/${editTarget.id}`, { preserveScroll: true, onSuccess: closeEdit }); };
    const submitEditCash = (e: FormEvent) => { e.preventDefault(); if (!editTarget) return; editCashForm.put(`/keuangan/cash/${editTarget.id}`, { preserveScroll: true, onSuccess: closeEdit }); };
    const submitEditJournal = (e: FormEvent) => { e.preventDefault(); if (!editTarget) return; editJournalForm.put(`/keuangan/jurnal/${editTarget.id}`, { preserveScroll: true, onSuccess: closeEdit }); };
    const submitAsset = (e: FormEvent) => { e.preventDefault(); assetForm.post('/keuangan/aset', { preserveScroll: true, onSuccess: () => setModal(null) }); };
    const submitEditAsset = (e: FormEvent) => { e.preventDefault(); if (!editTarget) return; editAssetForm.put(`/keuangan/aset/${editTarget.id}`, { preserveScroll: true, onSuccess: closeEdit }); };
    const submitSchedule = (e: FormEvent) => { e.preventDefault(); scheduleForm.post('/keuangan/jadwal', { preserveScroll: true, onSuccess: () => setModal(null) }); };
    const submitEditSchedule = (e: FormEvent) => { e.preventDefault(); if (!editTarget) return; editScheduleForm.put(`/keuangan/jadwal/${editTarget.id}`, { preserveScroll: true, onSuccess: closeEdit }); };
    const submitAccount = (e: FormEvent) => { e.preventDefault(); accountForm.post('/keuangan/akun', { preserveScroll: true, onSuccess: () => setModal(null) }); };
    const submitEditAccount = (e: FormEvent) => { e.preventDefault(); if (!editTarget) return; editAccountForm.put(`/keuangan/akun/${editTarget.id}`, { preserveScroll: true, onSuccess: closeEdit }); };
    const submitEditPayrollEntry = (e: FormEvent) => { e.preventDefault(); if (!editTarget) return; payrollEntryForm.put(`/keuangan/payroll-entries/${editTarget.id}`, { preserveScroll: true, onSuccess: closeEdit }); };
    return (
        <AuthenticatedLayout>
            <Head title="Keuangan" />
            <PageHeader
                title="Keuangan"
                description="Jurnal ganda, invoice & piutang, hutang (termasuk assist kolong jembatan), kas, pajak, dan payroll."
                metrics={[
                    { label: 'Kas & Bank', value: (cashAccounts ?? []).some((a: any) => a.balance !== null) ? formatRupiah((cashAccounts ?? []).reduce((s: number, a: any) => s + Number(a.balance ?? 0), 0)) : 'Terbatas', tone: 'navy', sub: 'saldo terkini' },
                    { label: 'Piutang', value: formatRupiah(Number(receivables ?? 0)), tone: 'primary', sub: `${formatNumber(Number(receivableCount ?? 0))} invoice terbuka` },
                    { label: 'Hutang', value: formatRupiah(Number(payables ?? 0)), tone: 'warning', sub: `${formatNumber(Number(payableCount ?? 0))} bill terbuka` },
                    { label: 'Laba Bulan Ini', value: formatRupiah(Number(monthRevenue ?? 0) - Number(monthCost ?? 0)), tone: 'success', sub: 'pendapatan − biaya' },
                ]}
            />
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
                {TAB_CLUSTERS.map((c) => {
                    const active = c.key === activeCluster.key;
                    return (
                        <button
                            key={c.key}
                            type="button"
                            onClick={() => {
                                if (!active) {
                                    router.get('/keuangan', { tab: c.tabs[0] }, { preserveState: true });
                                }
                            }}
                            className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors ${
                                active
                                    ? 'border-[#BA0C2F] bg-[#BA0C2F] text-white'
                                    : 'border-[#E3E8F0] bg-white text-[#5B6474] hover:border-[#111827]/20 hover:text-[#111827]'
                            }`}
                        >
                            {c.label}
                        </button>
                    );
                })}
            </div>
            <TabNav tabs={clusterTabs} active={tab} onChange={(key) => router.get('/keuangan', { tab: key }, { preserveState: true })} />

            {canManage && tab === 'invoice' && (
                <div className="mb-4">
                    <PrimaryButton onClick={() => setModal('invoice')}><Plus size={15} className="inline me-1" /> Buat Invoice</PrimaryButton>
                </div>
            )}

            {tab === 'invoice' && (
                <Table dataSource={(invoices?.data ?? invoices ?? []) as any[]} rowKey="id" pagination={false} size="small" scroll={{ x: 1200 }} className="rounded-xl"
                    columns={[
                        { title: 'Nomor', dataIndex: 'number', key: 'number', render: (t: string) => <span className="font-medium text-[#111827]">{t}</span> },
                        { title: 'Customer', dataIndex: 'customer_name', key: 'customer_name', render: (t: string) => <span className="text-[#5B6474]">{t}</span> },
                        { title: 'Jatuh Tempo', dataIndex: 'due_date', key: 'due_date', render: (t: string) => <span className="text-[#5B6474]">{formatDate(t)}</span> },
                        { title: 'Subtotal', dataIndex: 'subtotal', key: 'subtotal', align: 'right' as const, render: (v: number) => <span className="tabular-nums">{formatRupiah(v)}</span> },
                        { title: 'PPN', dataIndex: 'ppn_amount', key: 'ppn_amount', align: 'right' as const, render: (v: number) => <span className="tabular-nums">{formatRupiah(v)}</span> },
                        { title: 'PPh 23', dataIndex: 'pph23_amount', key: 'pph23_amount', align: 'right' as const, render: (v: number) => <span className="tabular-nums">{formatRupiah(v)}</span> },
                        { title: 'Total', dataIndex: 'total', key: 'total', align: 'right' as const, render: (v: number) => <span className="font-semibold tabular-nums">{formatRupiah(v)}</span> },
                        { title: 'Dibayar', dataIndex: 'paid_amount', key: 'paid_amount', align: 'right' as const, render: (v: number) => <span className="tabular-nums">{formatRupiah(v)}</span> },
                        { title: 'Status', dataIndex: 'status', key: 'status', render: (s: string) => <Badge tone={STATUS_TONES[s] ?? 'neutral'}>{s}</Badge> },
                        { title: 'Aksi', key: 'actions', align: 'right' as const, render: (_: any, r: any) => canManage && (
                            <div className="flex justify-end gap-2 text-xs font-medium">
                                <a href={`/cetak/invoice/${r.id}`} target="_blank" rel="noreferrer" className="text-[#BA0C2F] hover:underline">Cetak</a>
                                {r.voyage_id && <a href={`/cetak/invoice-charter/${r.id}?kind=dp`} target="_blank" rel="noreferrer" className="text-[#BA0C2F] hover:underline">Cetak Charter</a>}
                                {r.status !== 'paid' && <button type="button" onClick={() => { setPayTarget({ kind: 'invoice', id: r.id, sisa: r.total - r.paid_amount, label: r.number }); setModal('payInvoice'); }} className="text-[#BA0C2F] hover:underline">Bayar</button>}
                                {r.status === 'unpaid' && <button type="button" onClick={() => {
                                    setEditTarget(r);
                                    editInvoiceForm.setData({
                                        customer_id: String(r.customer_id ?? ''), voyage_id: '',
                                        issue_date: String(r.issue_date ?? '').slice(0, 10),
                                        due_date: r.due_date ? String(r.due_date).slice(0, 10) : '',
                                        pph23: Number(r.pph23_amount) > 0, notes: r.notes ?? '',
                                        items: [{ description: '', qty: '1', price: String(r.subtotal) }],
                                    });
                                    setModal('editInvoice');
                                }} className="text-[#BA0C2F] hover:underline">Edit</button>}
                                {r.status !== 'paid' && <button type="button" onClick={() => setConfirmDel({ url: `/keuangan/invoice/${r.id}`, label: `invoice ${r.number}`, note: 'Jurnal invoice akan dibatalkan.' })} className="text-[#BA0C2F] hover:underline">Hapus</button>}
                                {r.last_payment_id && <button type="button" onClick={() => setConfirmDel({ url: `/keuangan/payment/${r.last_payment_id}`, label: `pembayaran terakhir invoice ${r.number}`, note: 'Kas & jurnal pembayaran akan dibalikkan; status invoice disesuaikan.' })} className="text-[#B45309] hover:underline">Hapus Bayar</button>}
                            </div>
                        ) },
                    ]}
                />
            )}
            {tab === 'piutang' && (
                <Row gutter={[20, 20]}>
                    <Col xs={24} xl={8}>
                        <Card title="Aging Piutang">
                            <div className="space-y-2 text-sm">
                                {([
                                    ['Belum Jatuh Tempo', aging?.jatuh_tempo, 'text-[#15803D]'],
                                    ['\u2264 30 Hari Lewat', aging?.lebih_30, 'text-[#B45309]'],
                                    ['31\u201360 Hari', aging?.lebih_60, 'text-[#B45309]'],
                                    ['> 60 Hari', aging?.lebih_90, 'text-[#BA0C2F]'],
                                ] as const).map(([l, v, c]) => (
                                    <div key={l} className="flex justify-between border-b border-[#E3E8F0] py-2">
                                        <span className="text-[#5B6474]">{l}</span>
                                        <span className={classNames('font-semibold tabular-nums', c)}>{formatRupiah((v as number) ?? 0)}</span>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </Col>
                    <Col xs={24} xl={16}>
                        <Card title="Invoice Outstanding">
                            <ul className="space-y-2">
                                {(openInvoices ?? []).map((i: any) => (
                                    <li key={i.id} id={`record-invoice-${i.id}`} className="flex items-center justify-between rounded-lg border border-[#E3E8F0] px-3 py-2.5 text-sm">
                                        <div>
                                            <p className="font-medium text-[#111827]">{i.number} {'\u00b7'} {i.customer_name}</p>
                                            <p className="text-xs text-[#5B6474]">
                                                Jatuh tempo {formatDate(i.due_date)}
                                                {i.hari_lewat > 0 && <span className="font-semibold text-[#BA0C2F]"> {'\u00b7'} lewat {i.hari_lewat} hari</span>}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-semibold tabular-nums text-[#111827]">{formatRupiah(i.sisa)}</p>
                                            {canManage && <button type="button" onClick={() => { setPayTarget({ kind: 'invoice', id: i.id, sisa: i.sisa, label: i.number }); setModal('payInvoice'); }} className="text-xs text-[#BA0C2F] hover:underline">Bayar</button>}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </Card>
                    </Col>
                </Row>
            )}

            {tab === 'hutang' && (
                <Row gutter={[20, 20]}>
                    <Col xs={24} xl={8}>
                        <div className="space-y-5">
                            <Card title="Aging Hutang">
                                <div className="space-y-2 text-sm">
                                    {([
                                        ['Belum Jatuh Tempo', aging?.jatuh_tempo],
                                        ['\u2264 30 Hari Lewat', aging?.lebih_30],
                                        ['31\u201360 Hari', aging?.lebih_60],
                                        ['> 60 Hari', aging?.lebih_90],
                                    ] as const).map(([l, v]) => (
                                        <div key={l} className="flex justify-between border-b border-[#E3E8F0] py-2">
                                            <span className="text-[#5B6474]">{l}</span>
                                            <span className="font-semibold tabular-nums text-[#111827]">{formatRupiah((v as number) ?? 0)}</span>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                            <Card title="Total Jasa Assist Kolong Jembatan" description="Dibayar PT Bunga Teratai (beban).">
                                <p className="text-2xl font-semibold tabular-nums text-[#BA0C2F]">{formatRupiah(assistTotal ?? 0)}</p>
                            </Card>
                        </div>
                    </Col>
                    <Col xs={24} xl={16}>
                        <Card title="Bill Outstanding" actions={canManage && <PrimaryButton onClick={() => setModal('bill')}><Plus size={14} className="inline me-1" /> Bill Baru</PrimaryButton>}>
                            <ul className="space-y-2">
                                {(openBills ?? []).map((b: any) => (
                                    <li key={b.id} id={`record-bill-${b.id}`} className="flex items-center justify-between rounded-lg border border-[#E3E8F0] px-3 py-2.5 text-sm">
                                        <div>
                                            <p className="font-medium text-[#111827]">{b.number} {'\u00b7'} {b.supplier_name}</p>
                                            <p className="text-xs capitalize text-[#5B6474]">{b.category}{b.voyage_code ? ` {'\u00b7'} ${b.voyage_code}` : ''} {'\u00b7'} jatuh tempo {formatDate(b.due_date)}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-semibold tabular-nums text-[#111827]">{formatRupiah(b.sisa)}</p>
                                            {canManage && (
                                                <div className="flex justify-end gap-2 text-xs font-medium">
                                                    <button type="button" onClick={() => { setPayTarget({ kind: 'bill', id: b.id, sisa: b.sisa, label: b.number }); setModal('payBill'); }} className="text-[#BA0C2F] hover:underline">Bayar</button>
                                                    <button type="button" onClick={() => {
                                                        setEditTarget(b);
                                                        editBillForm.setData({
                                                            supplier_id: String(b.supplier_id ?? ''), voyage_id: String(b.voyage_id ?? ''),
                                                            category: b.category ?? 'assist',
                                                            issue_date: String(b.issue_date ?? '').slice(0, 10),
                                                            due_date: b.due_date ? String(b.due_date).slice(0, 10) : '',
                                                            pph_type: b.pph_type ?? '', notes: b.notes ?? '',
                                                            items: [{ description: b.category ?? '', amount: String(b.total) }],
                                                        });
                                                        setModal('editBill');
                                                    }} className="text-[#BA0C2F] hover:underline">Edit</button>
                                                    <button type="button" onClick={() => setConfirmDel({ url: `/keuangan/bill/${b.id}`, label: `bill ${b.number}`, note: 'Jurnal & jadwal bayar akan dibatalkan.' })} className="text-[#BA0C2F] hover:underline">Hapus</button>
                                                    {b.last_payment_id && <button type="button" onClick={() => setConfirmDel({ url: `/keuangan/bill-payment/${b.last_payment_id}`, label: `pembayaran terakhir bill ${b.number}`, note: 'Kas & jurnal pembayaran akan dibalikkan.' })} className="text-[#B45309] hover:underline">Hapus Bayar</button>}
                                                </div>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </Card>
                    </Col>
                </Row>
            )}
            {tab === 'jadwal' && (
                <Card title="Jadwal Pembayaran Mendatang" description="Otomatis dari bill + entri manual."
                    actions={<><a href="/laporan/export/outstanding" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-[#E3E8F0] bg-white px-3 py-1.5 text-xs font-medium text-[#111827] hover:border-[#BA0C2F]/40">Export Excel Outstanding</a>{canManage && <PrimaryButton onClick={() => setModal('addSchedule')}><Plus size={14} className="inline me-1" /> Entri Manual</PrimaryButton>}</>}
                >
                    <ul className="divide-y divide-[#E3E8F0]">
                        {(schedules ?? []).map((s: any) => (
                            <li key={s.id} className="flex items-center justify-between py-2.5 text-sm">
                                <div>
                                    <p className="font-medium text-[#111827]">{s.description}</p>
                                    <p className="text-xs text-[#5B6474]">Jatuh tempo {formatDate(s.due_date)} {'\u00b7'} {s.ref_type}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="font-semibold tabular-nums">{formatRupiah(s.amount)}</span>
                                    <Badge tone={STATUS_TONES[s.status] ?? 'neutral'}>{s.status}</Badge>
                                    {canManage && (
                                        <div className="flex gap-2 text-xs font-medium">
                                            <button type="button" onClick={() => { setEditTarget(s); editScheduleForm.setData({ due_date: String(s.due_date).slice(0, 10), amount: String(s.amount), description: s.description, status: s.status }); setModal('editSchedule'); }} className="text-[#BA0C2F] hover:underline">Edit</button>
                                            <button type="button" onClick={() => setConfirmDel({ url: `/keuangan/jadwal/${s.id}`, label: `jadwal "${s.description}"` })} className="text-[#BA0C2F] hover:underline">Hapus</button>
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
                    {canManage && <div className="mb-4"><PrimaryButton onClick={() => setModal('po')}><Plus size={14} className="inline me-1" /> Purchase Order Baru</PrimaryButton></div>}
                    <div className="space-y-3">
                        {(pos ?? []).map((po: any) => (
                            <div key={po.id} id={`record-po-${po.id}`} className="rounded-xl border border-[#E3E8F0] bg-white p-4 shadow-sm">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                        <p className="font-semibold text-[#111827]">{po.po_number}<span className="ms-2 text-sm font-normal text-[#5B6474]">{'\u2192'} {po.supplier_name}</span></p>
                                        <p className="text-xs text-[#5B6474]">{formatDate(po.order_date)} {'\u00b7'} {po.dept} {'\u00b7'} {po.vessel_name ?? 'Umum (tanpa unit kapal)'}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge tone={po.status === 'lunas' ? 'success' : po.status === 'di_bill' ? 'info' : po.status === 'diambil' ? 'warning' : 'neutral'}>{po.status}</Badge>
                                        <span className="font-semibold tabular-nums text-[#111827]">{formatRupiah(po.subtotal)}</span>
                                        {canManage && (
                                            <div className="flex gap-2 text-xs font-medium">
                                                <a href={`/cetak/po/${po.id}`} target="_blank" rel="noreferrer" className="text-[#BA0C2F] hover:underline">Cetak</a>
                                                {po.status === 'diterima' && <button type="button" onClick={() => router.post(`/keuangan/po/${po.id}/receive`, {}, { preserveScroll: true })} className="text-[#BA0C2F] hover:underline">Barang Diterima</button>}
                                                {po.status !== 'di_bill' && po.status !== 'lunas' && <button type="button" onClick={() => router.post(`/keuangan/po/${po.id}/make-bill`, {}, { preserveScroll: true })} className="text-[#BA0C2F] hover:underline">Buat Bill dari PO</button>}
                                                <button type="button" onClick={() => setConfirmDel({ url: `/keuangan/po/${po.id}`, label: `PO ${po.po_number}`, note: 'Diblokir bila PO sudah memiliki bill.' })} className="text-[#BA0C2F] hover:underline">Hapus</button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <Table dataSource={po.items} rowKey="id" pagination={false} size="small" className="mt-3"
                                    columns={[
                                        { title: 'Barang', dataIndex: 'item_name', key: 'item_name', render: (t: string) => <span className="text-[#111827]">{t}</span> },
                                        { title: 'Kode', dataIndex: 'item_code', key: 'item_code', render: (t: string) => <span className="text-[#5B6474]">{t ?? '\u2014'}</span> },
                                        { title: 'Qty', dataIndex: 'qty', key: 'qty', align: 'right' as const, render: (v: number, r: any) => <span className="tabular-nums">{formatNumber(v, 2)} {r.unit ?? ''}</span> },
                                        { title: 'Harga', dataIndex: 'price', key: 'price', align: 'right' as const, render: (v: number) => <span className="tabular-nums">{formatRupiah(v)}</span> },
                                        { title: 'Jumlah', dataIndex: 'amount', key: 'amount', align: 'right' as const, render: (v: number) => <span className="tabular-nums">{formatRupiah(v)}</span> },
                                    ]}
                                />
                                {po.bill_numbers?.length > 0 && <p className="mt-2 text-xs text-[#15803D]">Tertaut bill: {po.bill_numbers.join(', ')}</p>}
                                {po.receipt_number && (
                                    <div className="mt-2 rounded-md border border-[#15803D]/30 bg-[#15803D]/5 px-3 py-2 text-xs">
                                        <p className="font-semibold text-[#15803D]">{'\u2713'} Tanda Terima: {po.receipt_number}</p>
                                        <p className="text-[#5B6474]">{po.receipt_date} {'\u00b7'} {po.received_by ?? '\u2014'}</p>
                                        {po.receipt_notes && <p className="text-[#5B6474]">{po.receipt_notes}</p>}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </>
            )}
            {tab === 'kas' && (
                <>
                    <Row gutter={[16, 16]} className="mb-5">
                        {(cashAccounts ?? []).map((c: any) => (
                            <Col xs={24} md={8} key={c.id}>
                                <div className="rounded-xl border border-[#E3E8F0] bg-white p-4">
                                    <p className="text-xs uppercase tracking-wide text-[#5B6474]">{c.type} {'\u00b7'} {c.account_number ?? '\u2014'}</p>
                                    <p className="mt-1 text-lg font-semibold text-[#111827]">{c.name}</p>
                                    <p className="mt-1 text-2xl font-semibold tabular-nums text-[#BA0C2F]">{formatRupiah(c.balance)}</p>
                                </div>
                            </Col>
                        ))}
                    </Row>
                    {canManage && <div className="mb-4"><PrimaryButton onClick={() => setModal('cash')}>Transaksi Kas/Bank</PrimaryButton></div>}
                    <Card title="Mutasi Terakhir">
                        <Table dataSource={cashTransactions as any[]} rowKey="id" pagination={false} size="small" scroll={{ x: 1000 }}
                            columns={[
                                { title: 'Tanggal', dataIndex: 'date', key: 'date', render: (t: string) => formatDate(t) },
                                { title: 'Akun', dataIndex: 'account_name', key: 'account_name', render: (t: string) => <span className="text-[#5B6474]">{t}</span> },
                                { title: 'Masuk', dataIndex: 'amount', key: 'masuk', align: 'right' as const, render: (v: number, r: any) => r.direction === 'in' ? <span className="tabular-nums text-[#15803D]">{formatRupiah(v)}</span> : '\u2014' },
                                { title: 'Keluar', dataIndex: 'amount', key: 'keluar', align: 'right' as const, render: (v: number, r: any) => r.direction === 'out' ? <span className="tabular-nums text-[#BA0C2F]">{formatRupiah(v)}</span> : '\u2014' },
                                { title: 'Kategori', dataIndex: 'category', key: 'category', render: (t: string) => <span className="capitalize text-[#5B6474]">{t}</span> },
                                { title: 'Ref', dataIndex: 'reference', key: 'reference', render: (t: string) => <span className="text-[#5B6474]">{t}</span> },
                                { title: 'Catatan', dataIndex: 'notes', key: 'notes', render: (t: string) => <span className="text-xs text-[#5B6474]">{t}</span> },
                                { title: 'Aksi', key: 'actions', align: 'right' as const, render: (_: any, r: any) => canManage && (
                                    <div className="flex gap-2 text-xs font-medium">
                                        <button type="button" onClick={() => { setEditTarget(r); editCashForm.setData({ cash_account_id: String(r.cash_account_id), direction: r.direction, amount: String(r.amount), date: String(r.date).slice(0, 10), category: r.category ?? 'lainnya', notes: r.notes ?? '' }); setModal('editCash'); }} className="text-[#BA0C2F] hover:underline">Edit</button>
                                        <button type="button" onClick={() => setConfirmDel({ url: `/keuangan/cash/${r.id}`, label: `transaksi kas ${r.reference ?? r.category}`, note: 'Saldo kas & jurnal akan dibatalkan (hanya transaksi manual).' })} className="text-[#BA0C2F] hover:underline">Hapus</button>
                                    </div>
                                ) },
                            ]}
                        />
                    </Card>
                </>
            )}

            {tab === 'jurnal' && (
                <div className="space-y-4">
                    {canManage && <div><PrimaryButton onClick={() => setModal('journal')}>Jurnal Manual</PrimaryButton></div>}
                    {(entries ?? []).map((e: any) => (
                        <Card key={e.id} title={e.memo} description={`${formatDate(e.entry_date)} {'\u00b7'} ${e.source_type} {'\u00b7'} ${e.posted_by ?? '\u2014'}`}
                            actions={canManage && e.source_type === 'manual' ? (
                                <div className="flex gap-2 text-xs font-medium">
                                    <button type="button" onClick={() => { setEditTarget(e); editJournalForm.setData({ entry_date: String(e.entry_date).slice(0, 10), memo: e.memo ?? '', lines: e.lines.map((l: any) => ({ account: l.account_code, debit: l.debit > 0 ? String(l.debit) : '', credit: l.credit > 0 ? String(l.credit) : '' })) }); setModal('editJournal'); }} className="text-[#BA0C2F] hover:underline">Edit</button>
                                    <button type="button" onClick={() => setConfirmDel({ url: `/keuangan/jurnal/${e.id}`, label: `jurnal "${e.memo}"`, note: 'Hanya jurnal manual yang dapat dihapus.' })} className="text-[#BA0C2F] hover:underline">Hapus</button>
                                </div>
                            ) : null}
                        >
                            <Table dataSource={e.lines.map((l: any, idx: number) => ({ ...l, _idx: idx }))} rowKey="_idx" pagination={false} size="small"
                                columns={[
                                    { title: 'Akun', key: 'account', render: (_: any, l: any) => <span className="text-[#111827]">{l.account_code} {'\u00b7'} {l.account_name}</span> },
                                    { title: 'Debit', key: 'debit', align: 'right' as const, render: (_: any, l: any) => <span className="tabular-nums">{l.debit > 0 ? formatRupiah(l.debit) : ''}</span> },
                                    { title: 'Kredit', key: 'credit', align: 'right' as const, render: (_: any, l: any) => <span className="tabular-nums">{l.credit > 0 ? formatRupiah(l.credit) : ''}</span> },
                                ]}
                            />
                        </Card>
                    ))}
                </div>
            )}

            {tab === 'bb' && (
                <Card title={`Buku Besar \u2014 ${bbAccount?.code} ${bbAccount?.name}`} description={`Saldo: ${formatRupiah(bbBalance)}`}
                    actions={<Select defaultValue={bbAccount?.code} onChange={(v) => router.get('/keuangan', { tab: 'bb', account: v }, { preserveState: true })} className="min-w-[200px]"
                        options={(bbAccounts ?? []).map((a: any) => ({ value: a.code, label: `${a.code} \u2014 ${a.name}` }))}
                    />}
                >
                    <Table dataSource={bbLines as any[]} rowKey="id" pagination={false} size="small"
                        columns={[
                            { title: 'Tanggal', dataIndex: 'entry_date', key: 'entry_date', render: (t: string) => formatDate(t) },
                            { title: 'Memo', dataIndex: 'memo', key: 'memo', render: (t: string) => <span className="text-[#5B6474]">{t}</span> },
                            { title: 'Debit', dataIndex: 'debit', key: 'debit', align: 'right' as const, render: (v: number) => <span className="tabular-nums">{v > 0 ? formatRupiah(v) : ''}</span> },
                            { title: 'Kredit', dataIndex: 'credit', key: 'credit', align: 'right' as const, render: (v: number) => <span className="tabular-nums">{v > 0 ? formatRupiah(v) : ''}</span> },
                        ]}
                    />
                </Card>
            )}
            {tab === 'lr' && (
                <Card title="Laba Rugi" description={`Periode ${formatDate(lrPeriod?.from)} \u2013 ${formatDate(lrPeriod?.to)}`}
                    actions={<Button onClick={() => window.print()} icon={<Printer size={13} />}>Cetak</Button>}
                >
                    <div className="space-y-2 text-sm">
                        {(revenues ?? []).map((r: any) => (
                            <div key={r.code} className="flex justify-between border-b border-[#E3E8F0] py-2">
                                <span className="text-[#5B6474]">{r.code} {'\u00b7'} {r.name}</span>
                                <span className="tabular-nums text-[#15803D]">{formatRupiah(r.amount)}</span>
                            </div>
                        ))}
                        <div className="flex justify-between py-2 text-base font-semibold">
                            <span>Total Pendapatan</span><span className="tabular-nums text-[#15803D]">{formatRupiah(pendapatan)}</span>
                        </div>
                        {(expenses ?? []).map((x: any) => (
                            <div key={x.code} className="flex justify-between border-b border-[#E3E8F0] py-2">
                                <span className="text-[#5B6474]">{x.code} {'\u00b7'} {x.name}</span>
                                <span className="tabular-nums text-[#BA0C2F]">{formatRupiah(x.amount)}</span>
                            </div>
                        ))}
                        <div className="flex justify-between py-2 text-base font-semibold">
                            <span>Total Beban</span><span className="tabular-nums text-[#BA0C2F]">{formatRupiah(beban)}</span>
                        </div>
                        <div className={classNames('mt-3 flex justify-between rounded-xl p-4 text-lg font-bold', pendapatan - beban >= 0 ? 'bg-[#15803D]/10 text-[#15803D]' : 'bg-[#BA0C2F]/10 text-[#BA0C2F]')}>
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
                                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[#5B6474]">
                                    {type === 'asset' ? 'Aset' : type === 'liability' ? 'Kewajiban' : 'Ekuitas'}
                                </h3>
                                {rows.map((r: any) => (
                                    <div key={r.code} className="flex justify-between border-b border-[#E3E8F0] py-1.5 text-sm">
                                        <span className="text-[#5B6474]">{r.code} {'\u00b7'} {r.name}</span>
                                        <span className="tabular-nums text-[#111827]">{formatRupiah(r.balance)}</span>
                                    </div>
                                ))}
                                <div className="mt-1 flex justify-between py-1.5 text-sm font-semibold">
                                    <span>Total</span><span className="tabular-nums">{formatRupiah(total)}</span>
                                </div>
                            </div>
                        );
                    })}
                    <div className="rounded-xl bg-[#F5F7FA] p-4 text-sm">
                        <div className="flex justify-between font-semibold"><span>Laba Berjalan Tahun Ini</span><span className="tabular-nums">{formatRupiah(labaBerjalan)}</span></div>
                        <p className="mt-1 text-xs text-[#5B6474]">Aset = Kewajiban + Ekuitas + Laba Ditahan (implementasi ringkas).</p>
                    </div>
                </Card>
            )}

            {tab === 'pl' && (
                <Card title="Project P&L \u2014 Per Voyage/Job" description="Pendapatan invoice tag \u2212 biaya (bill + BBM) per perjalanan.">
                    <Table dataSource={projectPL as any[]} rowKey="id" pagination={false} size="small" scroll={{ x: 1000 }}
                        columns={[
                            { title: 'Kode', dataIndex: 'voyage_code', key: 'voyage_code', render: (t: string) => <span className="font-medium text-[#111827]">{t}</span> },
                            { title: 'Kapal', dataIndex: 'vessel_name', key: 'vessel_name', render: (t: string) => <span className="text-[#5B6474]">{t}</span> },
                            { title: 'Rute', dataIndex: 'route', key: 'route', render: (t: string) => <span className="text-[#5B6474]">{t}</span> },
                            { title: 'Pendapatan', dataIndex: 'income', key: 'income', align: 'right' as const, render: (v: number) => <span className="tabular-nums">{formatRupiah(v)}</span> },
                            { title: 'Biaya', dataIndex: 'cost', key: 'cost', align: 'right' as const, render: (v: number) => <span className="tabular-nums">{formatRupiah(v)}</span> },
                            { title: 'Profit', dataIndex: 'profit', key: 'profit', align: 'right' as const, render: (v: number) => <span className={classNames('font-semibold tabular-nums', v >= 0 ? 'text-[#15803D]' : 'text-[#BA0C2F]')}>{formatRupiah(v)}</span> },
                            { title: 'Margin', dataIndex: 'margin', key: 'margin', align: 'right' as const, render: (v: number | null) => <span className="tabular-nums text-[#5B6474]">{v !== null ? `${v}%` : '\u2014'}</span> },
                        ]}
                    />
                </Card>
            )}

            {tab === 'pajak' && (
                <Row gutter={[20, 20]}>
                    <Col xs={24} xl={8}>
                        <div className="space-y-5">
                            <Card title={`PPN Periode ${pajakPeriod}`}>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between border-b border-[#E3E8F0] py-2"><span className="text-[#5B6474]">PPN Keluaran (11%)</span><span className="tabular-nums">{formatRupiah(ppnKeluaran)}</span></div>
                                    <div className="flex justify-between border-b border-[#E3E8F0] py-2"><span className="text-[#5B6474]">PPN Masukan</span><span className="tabular-nums">{formatRupiah(ppnMasukan)}</span></div>
                                    <div className="flex justify-between py-2 font-semibold"><span>Net (Setor / Refund)</span><span className={classNames('tabular-nums', (ppnNet ?? 0) >= 0 ? 'text-[#BA0C2F]' : 'text-[#15803D]')}>{formatRupiah(ppnNet)}</span></div>
                                </div>
                            </Card>
                            <Card title="PPh 23 Terkutip (Customer)">
                                <p className="text-2xl font-semibold tabular-nums text-[#111827]">{formatRupiah(pph23Kutip)}</p>
                                <p className="text-xs text-[#5B6474]">Ditahan customer, dicatat sebagai kewajiban pajak.</p>
                            </Card>
                        </div>
                    </Col>
                    <Col xs={24} xl={16}>
                        <Card title="Buku Pajak Ringkas (PPh 21/23/4(2))">
                            <Table dataSource={withholdings as any[]} rowKey="id" pagination={false} size="small" scroll={{ x: 1100 }}
                                columns={[
                                    { title: 'Jenis', dataIndex: 'type', key: 'type', render: (t: string) => <span className="font-medium uppercase text-[#111827]">{t}</span> },
                                    { title: 'Tanggal', dataIndex: 'date', key: 'date', render: (t: string) => formatDate(t) },
                                    { title: 'Dasar', dataIndex: 'base_amount', key: 'base_amount', align: 'right' as const, render: (v: number) => <span className="tabular-nums">{formatRupiah(v)}</span> },
                                    { title: 'Tarif', dataIndex: 'rate', key: 'rate', align: 'right' as const, render: (v: number) => <span className="tabular-nums">{v}%</span> },
                                    { title: 'Pajak', dataIndex: 'tax_amount', key: 'tax_amount', align: 'right' as const, render: (v: number) => <span className="font-semibold tabular-nums text-[#BA0C2F]">{formatRupiah(v)}</span> },
                                    { title: 'Lawan Transaksi', dataIndex: 'counterparty', key: 'counterparty', render: (t: string) => <span className="text-[#5B6474]">{t}</span> },
                                    { title: 'Status', dataIndex: 'status', key: 'status', render: (s: string) => <Badge tone={STATUS_TONES[s] ?? 'neutral'}>{s}</Badge> },
                                    { title: '', key: 'actions', align: 'right' as const, render: (_: any, r: any) => canManage && r.status === 'tercatat' && <button type="button" onClick={() => router.post(`/keuangan/pajak/${r.id}/setor`, {}, { preserveScroll: true })} className="text-xs font-medium text-[#BA0C2F] hover:underline">Setor {'\u2192'}</button> },
                                ]}
                            />
                        </Card>
                    </Col>
                </Row>
            )}
            {tab === 'payroll' && (
                <Card title="Payroll Periode" description="Generate draft (ABK + karyawan + PPh 21 UU HPP) lalu posting {'\u2192'} jurnal beban gaji.">
                    <Table dataSource={payrollPeriods as any[]} rowKey="id" pagination={false} size="small" scroll={{ x: 1000 }}
                        expandable={{
                            expandedRowRender: (record: any) => record.status === 'draft' && (record.entries ?? []).length > 0 ? (
                                <Table dataSource={record.entries} rowKey="id" pagination={false} size="small"
                                    columns={[
                                        { title: 'Nama', dataIndex: 'person_name', key: 'person_name', render: (t: string) => <span className="text-[#111827]">{t}</span> },
                                        { title: 'Tipe', dataIndex: 'person_type', key: 'person_type', render: (t: string) => <span className="capitalize text-[#5B6474]">{t}</span> },
                                        { title: 'Pokok', dataIndex: 'gaji_pokok', key: 'gaji_pokok', align: 'right' as const, render: (v: number) => <span className="tabular-nums">{formatRupiah(v)}</span> },
                                        { title: 'Tunjangan', dataIndex: 'tunjangan', key: 'tunjangan', align: 'right' as const, render: (v: number) => <span className="tabular-nums">{formatRupiah(v)}</span> },
                                        { title: 'BPJS', dataIndex: 'bpjs', key: 'bpjs', align: 'right' as const, render: (v: number) => <span className="tabular-nums">{formatRupiah(v)}</span> },
                                        { title: 'PPh 21', dataIndex: 'pph21', key: 'pph21', align: 'right' as const, render: (v: number) => <span className="tabular-nums text-[#BA0C2F]">{formatRupiah(v)}</span> },
                                        { title: 'Total', dataIndex: 'total', key: 'total', align: 'right' as const, render: (v: number) => <span className="font-semibold tabular-nums">{formatRupiah(v)}</span> },
                                        { title: 'Aksi', key: 'actions', align: 'right' as const, render: (_: any, en: any) => canManage && (
                                            <span className="flex justify-end gap-2 font-medium">
                                                <button type="button" onClick={() => { setEditTarget(en); payrollEntryForm.setData({ gaji_pokok: String(en.gaji_pokok), tunjangan: String(en.tunjangan ?? 0), borongan_insentif: String(en.borongan_insentif ?? 0), potongan_lain: String(en.potongan_lain ?? 0), bpjs: String(en.bpjs ?? 0) }); setModal('editPayrollEntry'); }} className="text-[#BA0C2F] hover:underline">Edit</button>
                                                <button type="button" onClick={() => setConfirmDel({ url: `/keuangan/payroll-entries/${en.id}`, label: `entri payroll ${en.person_name}` })} className="text-[#BA0C2F] hover:underline">Hapus</button>
                                            </span>
                                        ) },
                                    ]}
                                />
                            ) : null,
                            rowExpandable: (record: any) => record.status === 'draft' && (record.entries ?? []).length > 0,
                        }}
                        columns={[
                            { title: 'Periode', dataIndex: 'year_month', key: 'year_month', render: (t: string) => <span className="font-medium text-[#111827]">{t}</span> },
                            { title: 'Entri', dataIndex: 'entries_count', key: 'entries_count', align: 'right' as const, render: (v: number) => <span className="tabular-nums">{v}</span> },
                            { title: 'Total Dibayar', dataIndex: 'total', key: 'total', align: 'right' as const, render: (v: number) => <span className="tabular-nums">{formatRupiah(v)}</span> },
                            { title: 'PPh 21', dataIndex: 'pph21', key: 'pph21', align: 'right' as const, render: (v: number) => <span className="tabular-nums">{formatRupiah(v)}</span> },
                            { title: 'Status', dataIndex: 'status', key: 'status', render: (s: string) => <Badge tone={STATUS_TONES[s] ?? 'neutral'}>{s === 'posted' ? 'Posted' : 'Draft'}</Badge> },
                            { title: 'Aksi', key: 'actions', render: (_: any, r: any) => canManage && (
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => router.post(`/keuangan/payroll/${r.id}/generate`, {}, { preserveScroll: true })} className="text-xs font-medium text-[#00205B] hover:underline">Generate</button>
                                    {r.status !== 'posted' && r.entries_count > 0 && <button type="button" onClick={() => router.post(`/keuangan/payroll/${r.id}/post`, {}, { preserveScroll: true })} className="text-xs font-semibold text-[#BA0C2F] hover:underline">Posting</button>}
                                </div>
                            ) },
                        ]}
                    />
                </Card>
            )}

            {tab === 'aset' && (
                <Row gutter={[20, 20]}>
                    <Col xs={24} xl={16}>
                        <Card title="Aset Tetap" actions={canManage && <PrimaryButton onClick={() => setModal('addAsset')}><Plus size={14} className="inline me-1" /> Aset Baru</PrimaryButton>}>
                            <Table dataSource={assets as any[]} rowKey="id" pagination={false} size="small" scroll={{ x: 1000 }}
                                columns={[
                                    { title: 'Nama', dataIndex: 'name', key: 'name', render: (t: string) => <span className="font-medium text-[#111827]">{t}</span> },
                                    { title: 'Kategori', dataIndex: 'category', key: 'category', render: (t: string) => <span className="capitalize text-[#5B6474]">{t}</span> },
                                    { title: 'Perolehan', dataIndex: 'acquisition_cost', key: 'acquisition_cost', align: 'right' as const, render: (v: number) => <span className="tabular-nums">{formatRupiah(v)}</span> },
                                    { title: 'Umur', dataIndex: 'useful_life_months', key: 'useful_life_months', render: (v: number) => <span className="text-[#5B6474]">{v} bln</span> },
                                    { title: 'Akum. Susut', key: 'accumulated_depreciation', align: 'right' as const, render: (_: any, r: any) => <span className="tabular-nums">{formatRupiah(r.accumulated_depreciation)}</span> },
                                    { title: 'Nilai Buku', key: 'book_value', align: 'right' as const, render: (_: any, r: any) => <span className="font-semibold tabular-nums">{formatRupiah(r.acquisition_cost - r.accumulated_depreciation)}</span> },
                                    { title: 'Aksi', key: 'actions', render: (_: any, r: any) => canManage && (
                                        <div className="flex gap-2 text-xs font-medium">
                                            <button type="button" onClick={() => { setEditTarget(r); editAssetForm.setData({ name: r.name, category: r.category, acquisition_cost: String(r.acquisition_cost), acquisition_date: String(r.acquisition_date ?? '').slice(0, 10), useful_life_months: String(r.useful_life_months), salvage_value: String(r.salvage_value ?? 0), status: r.status ?? 'aktif' }); setModal('editAsset'); }} className="text-[#BA0C2F] hover:underline">Edit</button>
                                            <button type="button" onClick={() => setConfirmDel({ url: `/keuangan/aset/${r.id}`, label: `aset ${r.name}` })} className="text-[#BA0C2F] hover:underline">Hapus</button>
                                        </div>
                                    ) },
                                ]}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} xl={8}>
                        <Card title="Penyusutan" description="Straight-line bulanan {'\u2192'} jurnal otomatis.">
                            {canManage && <PrimaryButton onClick={() => router.post('/keuangan/depreciation', {}, { preserveScroll: true })}>Generate Penyusutan Periode Berjalan</PrimaryButton>}
                            <p className="mt-3 text-xs text-[#5B6474]">Debit 5500 Beban Penyusutan {'\u00b7'} Kredit 1399 Akumulasi Penyusutan.</p>
                        </Card>
                    </Col>
                </Row>
            )}

            {tab === 'akun' && (
                <Card title="Bagan Akun (COA)" actions={canManage && <PrimaryButton onClick={() => setModal('addAccount')}><Plus size={14} className="inline me-1" /> Akun Baru</PrimaryButton>}>
                    <Table dataSource={accounts as any[]} rowKey="id" pagination={false} size="small" scroll={{ x: 800 }}
                        columns={[
                            { title: 'Kode', dataIndex: 'code', key: 'code', render: (t: string) => <span className="font-mono text-[#111827]">{t}</span> },
                            { title: 'Nama', dataIndex: 'name', key: 'name', render: (t: string) => <span className="text-[#111827]">{t}</span> },
                            { title: 'Tipe', dataIndex: 'type', key: 'type', render: (t: string) => <span className="capitalize text-[#5B6474]">{t}</span> },
                            { title: 'Normal', dataIndex: 'normal_balance', key: 'normal_balance', render: (t: string) => <span className="capitalize text-[#5B6474]">{t}</span> },
                            { title: 'Aksi', key: 'actions', render: (_: any, r: any) => canManage && (
                                <div className="flex gap-2 text-xs font-medium">
                                    <button type="button" onClick={() => { setEditTarget(r); editAccountForm.setData({ code: r.code, name: r.name, type: r.type }); setModal('editAccount'); }} className="text-[#BA0C2F] hover:underline">Edit</button>
                                    <button type="button" onClick={() => setConfirmDel({ url: `/keuangan/akun/${r.id}`, label: `akun ${r.code} \u2014 ${r.name}` })} className="text-[#BA0C2F] hover:underline">Hapus</button>
                                </div>
                            ) },
                        ]}
                    />
                </Card>
            )}

            {/* ===== MODALS ===== */}
            <Modal show={modal === 'invoice'} onClose={() => setModal(null)} maxWidth="lg">
                <form onSubmit={submitInvoice} className="p-6">
                    <h2 className="text-lg font-semibold text-[#111827]">Buat Invoice Jasa</h2>
                    <Row gutter={[12, 12]} className="mt-4">
                        <Col xs={24} sm={12}>
                            <label className="text-xs font-medium text-[#5B6474]">Customer *</label>
                            <Select className="mt-1 w-full" value={invoiceForm.data.customer_id || undefined} onChange={(v) => invoiceForm.setData('customer_id', v)} placeholder="\u2014 pilih \u2014"
                                options={(customers ?? []).map((c: any) => ({ value: String(c.id), label: c.name }))}
                            />
                        </Col>
                        <Col xs={24} sm={12}>
                            <label className="text-xs font-medium text-[#5B6474]">Tertaut Voyage (Project P&L)</label>
                            <Select className="mt-1 w-full" value={invoiceForm.data.voyage_id || undefined} onChange={(v) => invoiceForm.setData('voyage_id', v)} placeholder="\u2014 tanpa voyage \u2014" allowClear
                                options={(voyagesList ?? []).map((v: any) => ({ value: String(v.id), label: `${v.voyage_code} (${v.origin}\u2192${v.destination})` }))}
                            />
                        </Col>
                        <Col xs={24} sm={12}>
                            <label className="text-xs font-medium text-[#5B6474]">Tanggal *</label>
                            <Input type="date" className="mt-1" value={invoiceForm.data.issue_date} onChange={(e) => invoiceForm.setData('issue_date', e.target.value)} />
                        </Col>
                        <Col xs={24} sm={12}>
                            <label className="text-xs font-medium text-[#5B6474]">Jatuh Tempo</label>
                            <Input type="date" className="mt-1" value={invoiceForm.data.due_date} onChange={(e) => invoiceForm.setData('due_date', e.target.value)} />
                        </Col>
                    </Row>
                    <div className="mt-4">
                        <label className="text-xs font-medium text-[#5B6474]">Item (towing / sewa tongkang / tiket)</label>
                        {invoiceForm.data.items.map((item, idx) => (
                            <div key={idx} className="mt-2 flex gap-2">
                                <Select className="flex-1" value={item.description || undefined} placeholder="Pilih layanan"
                                    onChange={(v) => {
                                        const cat = (serviceCatalog ?? []).find((s: any) => s.name === v);
                                        invoiceForm.setData('items', invoiceForm.data.items.map((p, i) => i === idx ? { ...p, description: v, price: cat ? String(cat.default_price) : p.price } : p));
                                    }}
                                    options={(serviceCatalog ?? []).filter((s: any) => s.kind === 'pendapatan').map((s: any) => ({ value: s.name, label: s.name }))}
                                />
                                <NumericInput decimalPlaces={2} value={item.qty} onChange={(e) => invoiceForm.setData('items', invoiceForm.data.items.map((p, i) => i === idx ? { ...p, qty: e.target.value } : p))} className="w-20" />
                                <PriceInput value={item.price} onChange={(e) => invoiceForm.setData('items', invoiceForm.data.items.map((p, i) => i === idx ? { ...p, price: e.target.value } : p))} className="w-36" />
                            </div>
                        ))}
                        <button type="button" onClick={() => invoiceForm.setData('items', [...invoiceForm.data.items, { description: 'Tiket Penumpang', qty: '1', price: '185000' }])} className="mt-2 text-xs font-medium text-[#BA0C2F] hover:underline">+ Tambah baris</button>
                    </div>
                    <label className="mt-3 flex items-center gap-2 text-sm">
                        <Checkbox checked={invoiceForm.data.pph23} onChange={(e) => invoiceForm.setData('pph23', e.target.checked)} />
                        Potong PPh 23 jasa (2%)
                    </label>
                    <Row gutter={[12, 12]} className="mt-3">
                        <Col xs={24} sm={8}>
                            <label className="text-xs font-medium text-[#5B6474]">Tahap Invoice</label>
                            <Select className="mt-1 w-full" value={invoiceForm.data.invoice_kind} onChange={(v) => invoiceForm.setData('invoice_kind', v)}
                                options={[{ value: 'umum', label: 'Umum' }, { value: 'dp', label: 'Charter \u2014 DP' }, { value: 'pelunasan', label: 'Charter \u2014 Pelunasan' }, { value: 'dp100', label: 'Charter \u2014 DP 100%' }]}
                            />
                        </Col>
                        <Col xs={24} sm={8}>
                            <label className="text-xs font-medium text-[#5B6474]">Tarif PPh (khusus; kosongkan = 2%)</label>
                            <Select className="mt-1 w-full" value={invoiceForm.data.pph_rate || undefined} onChange={(v) => invoiceForm.setData('pph_rate', v)} placeholder="\u2014 ikuti checkbox PPh 23 \u2014" allowClear
                                options={[{ value: '0.012', label: '1,2% (charter \u2014 materi klien)' }, { value: '0.02', label: '2% (jasa reguler)' }, { value: '0.005', label: '0,5%' }]}
                            />
                        </Col>
                        <Col xs={24} sm={8}>
                            <label className="text-xs font-medium text-[#5B6474]">No. Faktur Pajak</label>
                            <Input className="mt-1" value={invoiceForm.data.fp_number} onChange={(e) => invoiceForm.setData('fp_number', e.target.value)} placeholder="010.045-777.197.2026" />
                        </Col>
                    </Row>
                    <p className="mt-2 text-xs text-[#5B6474]">PPN 11% dihitung otomatis. Total tagihan = subtotal + PPN {'\u2212'} PPh. FP hanya dicatat nomornya + file diunggah {'\u2014'} sistem tidak menerbitkan Faktur Pajak (legalitas DJP).</p>
                    <div className="mt-5 flex justify-end gap-3">
                        <SecondaryButton type="button" onClick={() => setModal(null)}>Batal</SecondaryButton>
                        <PrimaryButton disabled={invoiceForm.processing}>Simpan Invoice</PrimaryButton>
                    </div>
                </form>
            </Modal>

            <Modal show={modal === 'bill'} onClose={() => setModal(null)} maxWidth="lg">
                <form onSubmit={submitBill} className="p-6">
                    <h2 className="text-lg font-semibold text-[#111827]">Buat Bill (Hutang)</h2>
                    <p className="text-xs text-[#5B6474]">Termasuk jasa assist kolong jembatan (beban yang dibayar perusahaan).</p>
                    <Row gutter={[12, 12]} className="mt-4">
                        <Col xs={24} sm={12}>
                            <label className="text-xs font-medium text-[#5B6474]">Supplier *</label>
                            <Select className="mt-1 w-full" value={billForm.data.supplier_id || undefined} onChange={(v) => billForm.setData('supplier_id', v)} placeholder="\u2014 pilih \u2014"
                                options={(suppliers ?? []).map((s: any) => ({ value: String(s.id), label: s.name }))}
                            />
                        </Col>
                        <Col xs={24} sm={12}>
                            <label className="text-xs font-medium text-[#5B6474]">Kategori *</label>
                            <Select className="mt-1 w-full" value={billForm.data.category} onChange={(v) => billForm.setData('category', v)}
                                options={[{ value: 'assist', label: 'Jasa Assist Kolong Jembatan' }, { value: 'sparepart', label: 'sparepart' }, { value: 'drydock', label: 'drydock' }, { value: 'bbm', label: 'bbm' }, { value: 'jasa_bengkel', label: 'jasa_bengkel' }, { value: 'sewa', label: 'sewa' }, { value: 'lainnya', label: 'lainnya' }]}
                            />
                        </Col>
                        <Col xs={24} sm={8}>
                            <label className="text-xs font-medium text-[#5B6474]">Tanggal *</label>
                            <Input type="date" className="mt-1" value={billForm.data.issue_date} onChange={(e) => billForm.setData('issue_date', e.target.value)} />
                        </Col>
                        <Col xs={24} sm={8}>
                            <label className="text-xs font-medium text-[#5B6474]">Jatuh Tempo</label>
                            <Input type="date" className="mt-1" value={billForm.data.due_date} onChange={(e) => billForm.setData('due_date', e.target.value)} />
                        </Col>
                        <Col xs={24} sm={8}>
                            <label className="text-xs font-medium text-[#5B6474]">Tertaut Voyage</label>
                            <Select className="mt-1 w-full" value={billForm.data.voyage_id || undefined} onChange={(v) => billForm.setData('voyage_id', v)} placeholder="\u2014 tanpa voyage \u2014" allowClear
                                options={(voyagesList ?? []).map((v: any) => ({ value: String(v.id), label: v.voyage_code }))}
                            />
                        </Col>
                        <Col xs={24} sm={12}>
                            <label className="text-xs font-medium text-[#5B6474]">PPh Dipotong</label>
                            <Select className="mt-1 w-full" value={billForm.data.pph_type || undefined} onChange={(v) => billForm.setData('pph_type', v)} placeholder="\u2014 tidak \u2014" allowClear
                                options={[{ value: 'pph23', label: 'PPh 23 (2%)' }, { value: 'pph4(2)', label: 'PPh 4(2) (2,5%)' }]}
                            />
                        </Col>
                    </Row>
                    <div className="mt-4">
                        <label className="text-xs font-medium text-[#5B6474]">Rincian</label>
                        {billForm.data.items.map((item, idx) => (
                            <div key={idx} className="mt-2 flex gap-2">
                                <Select className="flex-1" value={item.description || undefined} onChange={(v) => billForm.setData('items', billForm.data.items.map((p, i) => i === idx ? { ...p, description: v } : p))}
                                    options={(serviceCatalog ?? []).filter((s: any) => s.kind === 'biaya').map((s: any) => ({ value: s.name, label: s.name }))}
                                />
                                <PriceInput value={item.amount} onChange={(e) => billForm.setData('items', billForm.data.items.map((p, i) => i === idx ? { ...p, amount: e.target.value } : p))} className="w-36" />
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
                    <h2 className="text-lg font-semibold text-[#111827]">Bayar {payTarget?.label}</h2>
                    <p className="text-xs text-[#5B6474]">Sisa tagihan: {formatRupiah(payTarget?.sisa)}</p>
                    <Row gutter={[12, 12]} className="mt-4">
                        <Col xs={24} sm={12}>
                            <label className="text-xs font-medium text-[#5B6474]">Jumlah Bruto *</label>
                            <PriceInput max={payTarget?.sisa} value={payForm.data.amount} onChange={(e) => payForm.setData('amount', e.target.value)} className="mt-1 block w-full" />
                        </Col>
                        <Col xs={24} sm={12}>
                            <label className="text-xs font-medium text-[#5B6474]">Potongan / Biaya Bank</label>
                            <PriceInput min="0" value={payForm.data.bank_fee} onChange={(e) => payForm.setData('bank_fee', e.target.value)} placeholder="0" className="mt-1 block w-full" />
                        </Col>
                        <Col xs={24}>
                            <label className="text-xs font-medium text-[#5B6474]">Akun Kas/Bank *</label>
                            <Select className="mt-1 w-full" value={payForm.data.cash_account_id || undefined} onChange={(v) => payForm.setData('cash_account_id', v)} placeholder="\u2014 pilih \u2014"
                                options={(cashAccounts ?? []).map((c: any) => ({ value: String(c.id), label: `${c.name} (${formatRupiah(c.balance)})` }))}
                            />
                        </Col>
                        {(Number(payForm.data.amount) > 0 || Number(payForm.data.bank_fee) > 0) && (
                            <Col xs={24}>
                                <div className="rounded-lg border border-[#E3E8F0] bg-[#F5F7FA] px-3 py-2 text-xs">
                                    <div className="flex justify-between"><span className="text-[#5B6474]">Bruto</span><span className="font-mono font-medium text-[#111827]">{formatRupiah(Number(payForm.data.amount))}</span></div>
                                    <div className="flex justify-between text-[#B45309]"><span>Potongan bank</span><span className="font-mono">- {formatRupiah(Number(payForm.data.bank_fee ?? 0))}</span></div>
                                    <div className="mt-1 flex justify-between border-t border-[#E3E8F0] pt-1 font-semibold"><span className="text-[#111827]">{modal === 'payInvoice' ? 'Bersih diterima' : 'Total dikeluarkan'}</span><span className="font-mono text-[#BA0C2F]">{formatRupiah(modal === 'payInvoice' ? Math.max(0, Number(payForm.data.amount) - Number(payForm.data.bank_fee ?? 0)) : Number(payForm.data.amount) + Number(payForm.data.bank_fee ?? 0))}</span></div>
                                </div>
                            </Col>
                        )}
                        <Col xs={24} sm={8}>
                            <label className="text-xs font-medium text-[#5B6474]">Tanggal *</label>
                            <Input type="date" className="mt-1" value={payForm.data.date} onChange={(e) => payForm.setData('date', e.target.value)} />
                        </Col>
                        <Col xs={24} sm={8}>
                            <label className="text-xs font-medium text-[#5B6474]">Metode</label>
                            <Select className="mt-1 w-full" value={payForm.data.method} onChange={(v) => payForm.setData('method', v)}
                                options={[{ value: 'transfer', label: 'Transfer' }, { value: 'cash', label: 'Tunai' }, { value: 'giro', label: 'Cek / BG (Giro)' }]}
                            />
                        </Col>
                        <Col xs={24} sm={8}>
                            <label className="text-xs font-medium text-[#5B6474]">No. Cek / BG</label>
                            <Input className="mt-1" value={payForm.data.cheque_number} onChange={(e) => payForm.setData('cheque_number', e.target.value)} placeholder="mis. BG 123456" />
                        </Col>
                    </Row>
                    <div className="mt-5 flex justify-end gap-3">
                        <SecondaryButton type="button" onClick={() => { setModal(null); setPayTarget(null); }}>Batal</SecondaryButton>
                        <PrimaryButton disabled={payForm.processing}>Simpan Pembayaran</PrimaryButton>
                    </div>
                </form>
            </Modal>

            <Modal show={modal === 'cash'} onClose={() => setModal(null)} maxWidth="md">
                <form onSubmit={submitCash} className="p-6">
                    <h2 className="text-lg font-semibold text-[#111827]">Transaksi Kas & Bank</h2>
                    <div className="mt-4 space-y-3">
                        <div>
                            <label className="text-xs font-medium text-[#5B6474]">Akun *</label>
                            <Select className="mt-1 w-full" value={cashForm.data.cash_account_id || undefined} onChange={(v) => cashForm.setData('cash_account_id', v)} placeholder="\u2014 pilih \u2014"
                                options={(cashAccounts ?? []).map((c: any) => ({ value: String(c.id), label: c.name }))}
                            />
                        </div>
                        <Row gutter={[12, 12]}>
                            <Col xs={12}>
                                <label className="text-xs font-medium text-[#5B6474]">Arah *</label>
                                <Select className="mt-1 w-full" value={cashForm.data.direction} onChange={(v) => cashForm.setData('direction', v)}
                                    options={[{ value: 'out', label: 'Keluar' }, { value: 'in', label: 'Masuk' }]}
                                />
                            </Col>
                            <Col xs={12}>
                                <label className="text-xs font-medium text-[#5B6474]">Kategori</label>
                                <Select className="mt-1 w-full" value={cashForm.data.category} onChange={(v) => cashForm.setData('category', v)}
                                    options={['lainnya', 'bbm', 'gaji', 'pajak', 'servis', 'pendapatan'].map((c) => ({ value: c, label: c }))}
                                />
                            </Col>
                            <Col xs={12}>
                                <label className="text-xs font-medium text-[#5B6474]">Jumlah Bruto *</label>
                                <PriceInput value={cashForm.data.amount} onChange={(e) => cashForm.setData('amount', e.target.value)} className="mt-1 block w-full" />
                            </Col>
                            <Col xs={12}>
                                <label className="text-xs font-medium text-[#5B6474]">Biaya Bank</label>
                                <PriceInput min="0" value={cashForm.data.bank_fee} onChange={(e) => cashForm.setData('bank_fee', e.target.value)} placeholder="0" className="mt-1 block w-full" />
                            </Col>
                            <Col xs={24}>
                                <label className="text-xs font-medium text-[#5B6474]">Tanggal *</label>
                                <Input type="date" className="mt-1" value={cashForm.data.date} onChange={(e) => cashForm.setData('date', e.target.value)} />
                            </Col>
                        </Row>
                    </div>
                    <div className="mt-5 flex justify-end gap-3">
                        <SecondaryButton type="button" onClick={() => setModal(null)}>Batal</SecondaryButton>
                        <PrimaryButton disabled={cashForm.processing}>Simpan</PrimaryButton>
                    </div>
                </form>
            </Modal>

            <Modal show={modal === 'journal'} onClose={() => setModal(null)} maxWidth="md">
                <form onSubmit={submitJournal} className="p-6">
                    <h2 className="text-lg font-semibold text-[#111827]">Jurnal Manual</h2>
                    <p className="text-xs text-[#5B6474]">Debit harus = Kredit.</p>
                    <Row gutter={[12, 12]} className="mt-4">
                        <Col xs={12}>
                            <label className="text-xs font-medium text-[#5B6474]">Tanggal *</label>
                            <Input type="date" className="mt-1" value={journalForm.data.entry_date} onChange={(e) => journalForm.setData('entry_date', e.target.value)} />
                        </Col>
                        <Col xs={12}>
                            <label className="text-xs font-medium text-[#5B6474]">Memo *</label>
                            <Input className="mt-1" value={journalForm.data.memo} onChange={(e) => journalForm.setData('memo', e.target.value)} />
                        </Col>
                    </Row>
                    <div className="mt-4 space-y-2">
                        {journalForm.data.lines.map((line, idx) => (
                            <div key={idx} className="flex gap-2">
                                <Select className="flex-1" value={line.account} onChange={(v) => journalForm.setData('lines', journalForm.data.lines.map((p, i) => i === idx ? { ...p, account: v } : p))}
                                    options={(accounts ?? bbAccounts ?? []).map((a: any) => ({ value: a.code, label: `${a.code} \u2014 ${a.name}` }))}
                                />
                                <PriceInput placeholder="Debit" value={line.debit} onChange={(e) => journalForm.setData('lines', journalForm.data.lines.map((p, i) => i === idx ? { ...p, debit: e.target.value } : p))} className="w-28" />
                                <PriceInput placeholder="Kredit" value={line.credit} onChange={(e) => journalForm.setData('lines', journalForm.data.lines.map((p, i) => i === idx ? { ...p, credit: e.target.value } : p))} className="w-28" />
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
                    <h2 className="text-lg font-semibold text-[#111827]">Edit Invoice {editTarget?.number}</h2>
                    <p className="text-xs text-[#5B6474]">Hanya invoice tanpa pembayaran. Jurnal ditulis ulang otomatis.</p>
                    <Row gutter={[12, 12]} className="mt-4">
                        <Col xs={24} sm={12}>
                            <label className="text-xs font-medium text-[#5B6474]">Customer *</label>
                            <Select className="mt-1 w-full" value={editInvoiceForm.data.customer_id || undefined} onChange={(v) => editInvoiceForm.setData('customer_id', v)} placeholder="\u2014 pilih \u2014"
                                options={(customers ?? []).map((c: any) => ({ value: String(c.id), label: c.name }))}
                            />
                        </Col>
                        <Col xs={24} sm={12}>
                            <label className="text-xs font-medium text-[#5B6474]">Tertaut Voyage</label>
                            <Select className="mt-1 w-full" value={editInvoiceForm.data.voyage_id || undefined} onChange={(v) => editInvoiceForm.setData('voyage_id', v)} placeholder="\u2014 tanpa voyage \u2014" allowClear
                                options={(voyagesList ?? []).map((v: any) => ({ value: String(v.id), label: v.voyage_code }))}
                            />
                        </Col>
                        <Col xs={24} sm={12}>
                            <label className="text-xs font-medium text-[#5B6474]">Tanggal *</label>
                            <Input type="date" className="mt-1" value={editInvoiceForm.data.issue_date} onChange={(e) => editInvoiceForm.setData('issue_date', e.target.value)} />
                        </Col>
                        <Col xs={24} sm={12}>
                            <label className="text-xs font-medium text-[#5B6474]">Jatuh Tempo</label>
                            <Input type="date" className="mt-1" value={editInvoiceForm.data.due_date} onChange={(e) => editInvoiceForm.setData('due_date', e.target.value)} />
                        </Col>
                        <Col xs={24} sm={12}>
                            <label className="text-xs font-medium text-[#5B6474]">Deskripsi Item *</label>
                            <Input className="mt-1" value={editInvoiceForm.data.items[0].description} onChange={(e) => editInvoiceForm.setData('items', [{ ...editInvoiceForm.data.items[0], description: e.target.value }])} placeholder="mis. Jasa Towing" />
                        </Col>
                        <Col xs={24} sm={12}>
                            <label className="text-xs font-medium text-[#5B6474]">Nilai (Rp) *</label>
                            <PriceInput value={editInvoiceForm.data.items[0].price} onChange={(e) => editInvoiceForm.setData('items', [{ ...editInvoiceForm.data.items[0], price: e.target.value }])} className="mt-1 block w-full" />
                        </Col>
                        <Col xs={24}>
                            <label className="flex items-center gap-2 text-sm">
                                <Checkbox checked={editInvoiceForm.data.pph23} onChange={(e) => editInvoiceForm.setData('pph23', e.target.checked)} />
                                Potong PPh 23 (2%) {'\u2014'} PPN 11% dihitung otomatis
                            </label>
                        </Col>
                    </Row>
                    <div className="mt-5 flex justify-end gap-3">
                        <SecondaryButton type="button" onClick={closeEdit}>Batal</SecondaryButton>
                        <PrimaryButton disabled={editInvoiceForm.processing}>Simpan & Tulis Ulang Jurnal</PrimaryButton>
                    </div>
                </form>
            </Modal>

            <Modal show={modal === 'editBill'} onClose={closeEdit} maxWidth="lg">
                <form onSubmit={submitEditBill} className="p-6">
                    <h2 className="text-lg font-semibold text-[#111827]">Edit Bill {editTarget?.number}</h2>
                    <p className="text-xs text-[#5B6474]">Hanya bill tanpa pembayaran. Jurnal ditulis ulang otomatis.</p>
                    <Row gutter={[12, 12]} className="mt-4">
                        <Col xs={24} sm={12}>
                            <label className="text-xs font-medium text-[#5B6474]">Supplier *</label>
                            <Select className="mt-1 w-full" value={editBillForm.data.supplier_id || undefined} onChange={(v) => editBillForm.setData('supplier_id', v)} placeholder="\u2014 pilih \u2014"
                                options={(suppliers ?? []).map((s: any) => ({ value: String(s.id), label: s.name }))}
                            />
                        </Col>
                        <Col xs={24} sm={12}>
                            <label className="text-xs font-medium text-[#5B6474]">Kategori *</label>
                            <Select className="mt-1 w-full" value={editBillForm.data.category} onChange={(v) => editBillForm.setData('category', v)}
                                options={[{ value: 'assist', label: 'Jasa Assist Kolong Jembatan' }, { value: 'sparepart', label: 'sparepart' }, { value: 'drydock', label: 'drydock' }, { value: 'bbm', label: 'bbm' }, { value: 'jasa_bengkel', label: 'jasa_bengkel' }, { value: 'sewa', label: 'sewa' }, { value: 'lainnya', label: 'lainnya' }]}
                            />
                        </Col>
                        <Col xs={24} sm={8}>
                            <label className="text-xs font-medium text-[#5B6474]">Tanggal *</label>
                            <Input type="date" className="mt-1" value={editBillForm.data.issue_date} onChange={(e) => editBillForm.setData('issue_date', e.target.value)} />
                        </Col>
                        <Col xs={24} sm={8}>
                            <label className="text-xs font-medium text-[#5B6474]">Jatuh Tempo</label>
                            <Input type="date" className="mt-1" value={editBillForm.data.due_date} onChange={(e) => editBillForm.setData('due_date', e.target.value)} />
                        </Col>
                        <Col xs={24} sm={8}>
                            <label className="text-xs font-medium text-[#5B6474]">PPh Dipotong</label>
                            <Select className="mt-1 w-full" value={editBillForm.data.pph_type || undefined} onChange={(v) => editBillForm.setData('pph_type', v)} placeholder="\u2014 tidak \u2014" allowClear
                                options={[{ value: 'pph23', label: 'PPh 23 (2%)' }, { value: 'pph4(2)', label: 'PPh 4(2) (2,5%)' }]}
                            />
                        </Col>
                        <Col xs={24} sm={12}>
                            <label className="text-xs font-medium text-[#5B6474]">Deskripsi *</label>
                            <Input className="mt-1" value={editBillForm.data.items[0].description} onChange={(e) => editBillForm.setData('items', [{ ...editBillForm.data.items[0], description: e.target.value }])} />
                        </Col>
                        <Col xs={24} sm={12}>
                            <label className="text-xs font-medium text-[#5B6474]">Nilai (Rp) *</label>
                            <PriceInput value={editBillForm.data.items[0].amount} onChange={(e) => editBillForm.setData('items', [{ ...editBillForm.data.items[0], amount: e.target.value }])} className="mt-1 block w-full" />
                        </Col>
                    </Row>
                    <div className="mt-5 flex justify-end gap-3">
                        <SecondaryButton type="button" onClick={closeEdit}>Batal</SecondaryButton>
                        <PrimaryButton disabled={editBillForm.processing}>Simpan & Tulis Ulang Jurnal</PrimaryButton>
                    </div>
                </form>
            </Modal>

            <Modal show={modal === 'editCash'} onClose={closeEdit} maxWidth="md">
                <form onSubmit={submitEditCash} className="p-6">
                    <h2 className="text-lg font-semibold text-[#111827]">Edit Transaksi Kas Manual</h2>
                    <p className="text-xs text-[#5B6474]">Saldo kas & jurnal disesuaikan otomatis. Transaksi dari invoice/bill tidak bisa diedit di sini.</p>
                    <div className="mt-4 space-y-3">
                        <div>
                            <label className="text-xs font-medium text-[#5B6474]">Akun Kas/Bank *</label>
                            <Select className="mt-1 w-full" value={editCashForm.data.cash_account_id || undefined} onChange={(v) => editCashForm.setData('cash_account_id', v)}
                                options={(cashAccounts ?? []).map((c: any) => ({ value: String(c.id), label: c.name }))}
                            />
                        </div>
                        <Row gutter={[12, 12]}>
                            <Col xs={12}>
                                <label className="text-xs font-medium text-[#5B6474]">Arah *</label>
                                <Select className="mt-1 w-full" value={editCashForm.data.direction} onChange={(v) => editCashForm.setData('direction', v)}
                                    options={[{ value: 'in', label: 'Masuk' }, { value: 'out', label: 'Keluar' }]}
                                />
                            </Col>
                            <Col xs={12}>
                                <label className="text-xs font-medium text-[#5B6474]">Kategori</label>
                                <Select className="mt-1 w-full" value={editCashForm.data.category} onChange={(v) => editCashForm.setData('category', v)}
                                    options={['lainnya', 'bbm', 'gaji', 'pajak', 'servis', 'pendapatan'].map((c) => ({ value: c, label: c }))}
                                />
                            </Col>
                            <Col xs={12}>
                                <label className="text-xs font-medium text-[#5B6474]">Jumlah *</label>
                                <PriceInput value={editCashForm.data.amount} onChange={(e) => editCashForm.setData('amount', e.target.value)} className="mt-1 block w-full" />
                            </Col>
                            <Col xs={12}>
                                <label className="text-xs font-medium text-[#5B6474]">Tanggal *</label>
                                <Input type="date" className="mt-1" value={editCashForm.data.date} onChange={(e) => editCashForm.setData('date', e.target.value)} />
                            </Col>
                        </Row>
                    </div>
                    <div className="mt-5 flex justify-end gap-3">
                        <SecondaryButton type="button" onClick={closeEdit}>Batal</SecondaryButton>
                        <PrimaryButton disabled={editCashForm.processing}>Simpan</PrimaryButton>
                    </div>
                </form>
            </Modal>

            <Modal show={modal === 'editJournal'} onClose={closeEdit} maxWidth="md">
                <form onSubmit={submitEditJournal} className="p-6">
                    <h2 className="text-lg font-semibold text-[#111827]">Edit Jurnal Manual</h2>
                    <p className="text-xs text-[#5B6474]">Jurnal lama dihapus & ditulis ulang. Debit harus = Kredit.</p>
                    <Row gutter={[12, 12]} className="mt-4">
                        <Col xs={12}>
                            <label className="text-xs font-medium text-[#5B6474]">Tanggal *</label>
                            <Input type="date" className="mt-1" value={editJournalForm.data.entry_date} onChange={(e) => editJournalForm.setData('entry_date', e.target.value)} />
                        </Col>
                        <Col xs={12}>
                            <label className="text-xs font-medium text-[#5B6474]">Memo *</label>
                            <Input className="mt-1" value={editJournalForm.data.memo} onChange={(e) => editJournalForm.setData('memo', e.target.value)} />
                        </Col>
                    </Row>
                    <div className="mt-4 space-y-2">
                        {editJournalForm.data.lines.map((line, idx) => (
                            <div key={idx} className="flex gap-2">
                                <Select className="flex-1" value={line.account} onChange={(v) => editJournalForm.setData('lines', editJournalForm.data.lines.map((p, i) => i === idx ? { ...p, account: v } : p))}
                                    options={(bbAccounts ?? accounts ?? []).map((a: any) => ({ value: a.code, label: `${a.code} \u2014 ${a.name}` }))}
                                />
                                <PriceInput placeholder="Debit" value={line.debit} onChange={(e) => editJournalForm.setData('lines', editJournalForm.data.lines.map((p, i) => i === idx ? { ...p, debit: e.target.value } : p))} className="w-28" />
                                <PriceInput placeholder="Kredit" value={line.credit} onChange={(e) => editJournalForm.setData('lines', editJournalForm.data.lines.map((p, i) => i === idx ? { ...p, credit: e.target.value } : p))} className="w-28" />
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
                    <h2 className="text-lg font-semibold text-[#111827]">Aset Tetap Baru</h2>
                    <div className="mt-4 space-y-3">
                        <div>
                            <label className="text-xs font-medium text-[#5B6474]">Nama *</label>
                            <Input className="mt-1" value={assetForm.data.name} onChange={(e) => assetForm.setData('name', e.target.value)} />
                        </div>
                        <Row gutter={[12, 12]}>
                            <Col xs={12}>
                                <label className="text-xs font-medium text-[#5B6474]">Kategori</label>
                                <Select className="mt-1 w-full" value={assetForm.data.category} onChange={(v) => assetForm.setData('category', v)}
                                    options={['kapal', 'tongkang', 'peralatan', 'kendaraan', 'bangunan', 'lainnya'].map((c) => ({ value: c, label: c }))}
                                />
                            </Col>
                            <Col xs={12}>
                                <label className="text-xs font-medium text-[#5B6474]">Nilai Perolehan *</label>
                                <PriceInput value={assetForm.data.acquisition_cost} onChange={(e) => assetForm.setData('acquisition_cost', e.target.value)} className="mt-1 block w-full" />
                            </Col>
                            <Col xs={12}>
                                <label className="text-xs font-medium text-[#5B6474]">Tanggal Perolehan *</label>
                                <Input type="date" className="mt-1" value={assetForm.data.acquisition_date} onChange={(e) => assetForm.setData('acquisition_date', e.target.value)} />
                            </Col>
                            <Col xs={12}>
                                <label className="text-xs font-medium text-[#5B6474]">Umur (bulan) *</label>
                                <NumericInput value={assetForm.data.useful_life_months} onChange={(e) => assetForm.setData('useful_life_months', e.target.value)} className="mt-1 block w-full" />
                            </Col>
                            <Col xs={24}>
                                <label className="text-xs font-medium text-[#5B6474]">Nilai Sisa</label>
                                <PriceInput value={assetForm.data.salvage_value} onChange={(e) => assetForm.setData('salvage_value', e.target.value)} className="mt-1 block w-full" />
                            </Col>
                        </Row>
                    </div>
                    <div className="mt-5 flex justify-end gap-3">
                        <SecondaryButton type="button" onClick={() => setModal(null)}>Batal</SecondaryButton>
                        <PrimaryButton disabled={assetForm.processing}>Simpan Aset</PrimaryButton>
                    </div>
                </form>
            </Modal>

            <Modal show={modal === 'editAsset'} onClose={closeEdit} maxWidth="md">
                <form onSubmit={submitEditAsset} className="p-6">
                    <h2 className="text-lg font-semibold text-[#111827]">Edit Aset {'\u2014'} {editTarget?.name}</h2>
                    <div className="mt-4 space-y-3">
                        <div>
                            <label className="text-xs font-medium text-[#5B6474]">Nama *</label>
                            <Input className="mt-1" value={editAssetForm.data.name} onChange={(e) => editAssetForm.setData('name', e.target.value)} />
                        </div>
                        <Row gutter={[12, 12]}>
                            <Col xs={12}>
                                <label className="text-xs font-medium text-[#5B6474]">Kategori</label>
                                <Select className="mt-1 w-full" value={editAssetForm.data.category} onChange={(v) => editAssetForm.setData('category', v)}
                                    options={['kapal', 'tongkang', 'peralatan', 'kendaraan', 'bangunan', 'lainnya'].map((c) => ({ value: c, label: c }))}
                                />
                            </Col>
                            <Col xs={12}>
                                <label className="text-xs font-medium text-[#5B6474]">Nilai Perolehan *</label>
                                <PriceInput value={editAssetForm.data.acquisition_cost} onChange={(e) => editAssetForm.setData('acquisition_cost', e.target.value)} className="mt-1 block w-full" />
                            </Col>
                            <Col xs={12}>
                                <label className="text-xs font-medium text-[#5B6474]">Tanggal Perolehan *</label>
                                <Input type="date" className="mt-1" value={editAssetForm.data.acquisition_date} onChange={(e) => editAssetForm.setData('acquisition_date', e.target.value)} />
                            </Col>
                            <Col xs={12}>
                                <label className="text-xs font-medium text-[#5B6474]">Umur (bulan) *</label>
                                <NumericInput value={editAssetForm.data.useful_life_months} onChange={(e) => editAssetForm.setData('useful_life_months', e.target.value)} className="mt-1 block w-full" />
                            </Col>
                            <Col xs={12}>
                                <label className="text-xs font-medium text-[#5B6474]">Nilai Sisa</label>
                                <PriceInput value={editAssetForm.data.salvage_value} onChange={(e) => editAssetForm.setData('salvage_value', e.target.value)} className="mt-1 block w-full" />
                            </Col>
                            <Col xs={12}>
                                <label className="text-xs font-medium text-[#5B6474]">Status</label>
                                <Select className="mt-1 w-full" value={editAssetForm.data.status} onChange={(v) => editAssetForm.setData('status', v)}
                                    options={[{ value: 'aktif', label: 'Aktif' }, { value: 'disposal', label: 'Disposal' }]}
                                />
                            </Col>
                        </Row>
                    </div>
                    <div className="mt-5 flex justify-end gap-3">
                        <SecondaryButton type="button" onClick={closeEdit}>Batal</SecondaryButton>
                        <PrimaryButton disabled={editAssetForm.processing}>Simpan</PrimaryButton>
                    </div>
                </form>
            </Modal>

            <Modal show={modal === 'addSchedule'} onClose={() => setModal(null)} maxWidth="md">
                <form onSubmit={submitSchedule} className="p-6">
                    <h2 className="text-lg font-semibold text-[#111827]">Entri Jadwal Bayar Manual</h2>
                    <div className="mt-4 space-y-3">
                        <div>
                            <label className="text-xs font-medium text-[#5B6474]">Deskripsi *</label>
                            <Input className="mt-1" value={scheduleForm.data.description} onChange={(e) => scheduleForm.setData('description', e.target.value)} placeholder="mis. Sewa gudang bulan depan" />
                        </div>
                        <Row gutter={[12, 12]}>
                            <Col xs={12}>
                                <label className="text-xs font-medium text-[#5B6474]">Jumlah *</label>
                                <PriceInput value={scheduleForm.data.amount} onChange={(e) => scheduleForm.setData('amount', e.target.value)} className="mt-1 block w-full" />
                            </Col>
                            <Col xs={12}>
                                <label className="text-xs font-medium text-[#5B6474]">Jatuh Tempo *</label>
                                <Input type="date" className="mt-1" value={scheduleForm.data.due_date} onChange={(e) => scheduleForm.setData('due_date', e.target.value)} />
                            </Col>
                        </Row>
                    </div>
                    <div className="mt-5 flex justify-end gap-3">
                        <SecondaryButton type="button" onClick={() => setModal(null)}>Batal</SecondaryButton>
                        <PrimaryButton disabled={scheduleForm.processing}>Simpan</PrimaryButton>
                    </div>
                </form>
            </Modal>

            <Modal show={modal === 'editSchedule'} onClose={closeEdit} maxWidth="md">
                <form onSubmit={submitEditSchedule} className="p-6">
                    <h2 className="text-lg font-semibold text-[#111827]">Edit Jadwal Bayar</h2>
                    <div className="mt-4 space-y-3">
                        <div>
                            <label className="text-xs font-medium text-[#5B6474]">Deskripsi *</label>
                            <Input className="mt-1" value={editScheduleForm.data.description} onChange={(e) => editScheduleForm.setData('description', e.target.value)} />
                        </div>
                        <Row gutter={[12, 12]}>
                            <Col xs={8}>
                                <label className="text-xs font-medium text-[#5B6474]">Jumlah *</label>
                                <PriceInput value={editScheduleForm.data.amount} onChange={(e) => editScheduleForm.setData('amount', e.target.value)} className="mt-1 block w-full" />
                            </Col>
                            <Col xs={8}>
                                <label className="text-xs font-medium text-[#5B6474]">Jatuh Tempo *</label>
                                <Input type="date" className="mt-1" value={editScheduleForm.data.due_date} onChange={(e) => editScheduleForm.setData('due_date', e.target.value)} />
                            </Col>
                            <Col xs={8}>
                                <label className="text-xs font-medium text-[#5B6474]">Status</label>
                                <Select className="mt-1 w-full" value={editScheduleForm.data.status} onChange={(v) => editScheduleForm.setData('status', v)}
                                    options={['menunggu', 'lunas', 'telat'].map((s) => ({ value: s, label: s }))}
                                />
                            </Col>
                        </Row>
                    </div>
                    <div className="mt-5 flex justify-end gap-3">
                        <SecondaryButton type="button" onClick={closeEdit}>Batal</SecondaryButton>
                        <PrimaryButton disabled={editScheduleForm.processing}>Simpan</PrimaryButton>
                    </div>
                </form>
            </Modal>
            <Modal show={modal === 'addAccount'} onClose={() => setModal(null)} maxWidth="md">
                <form onSubmit={submitAccount} className="p-6">
                    <h2 className="text-lg font-semibold text-[#111827]">Akun COA Baru</h2>
                    <div className="mt-4 space-y-3">
                        <div>
                            <label className="text-xs font-medium text-[#5B6474]">Kode *</label>
                            <Input className="mt-1" value={accountForm.data.code} onChange={(e) => accountForm.setData('code', e.target.value)} placeholder="mis. 5700" />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-[#5B6474]">Nama *</label>
                            <Input className="mt-1" value={accountForm.data.name} onChange={(e) => accountForm.setData('name', e.target.value)} />
                        </div>
                        <Row gutter={[12, 12]}>
                            <Col xs={12}>
                                <label className="text-xs font-medium text-[#5B6474]">Tipe</label>
                                <Select className="mt-1 w-full" value={accountForm.data.type} onChange={(v) => accountForm.setData('type', v)}
                                    options={['asset', 'liability', 'equity', 'revenue', 'expense'].map((t) => ({ value: t, label: t }))}
                                />
                            </Col>
                            <Col xs={12}>
                                <label className="flex items-end gap-2 pb-2 text-sm">
                                    <Checkbox checked={accountForm.data.is_cash} onChange={(e) => accountForm.setData('is_cash', e.target.checked)} />
                                    Akun kas/bank
                                </label>
                            </Col>
                        </Row>
                    </div>
                    <div className="mt-5 flex justify-end gap-3">
                        <SecondaryButton type="button" onClick={() => setModal(null)}>Batal</SecondaryButton>
                        <PrimaryButton disabled={accountForm.processing}>Simpan Akun</PrimaryButton>
                    </div>
                </form>
            </Modal>

            <Modal show={modal === 'editAccount'} onClose={closeEdit} maxWidth="md">
                <form onSubmit={submitEditAccount} className="p-6">
                    <h2 className="text-lg font-semibold text-[#111827]">Edit Akun {'\u2014'} {editTarget?.code}</h2>
                    <div className="mt-4 space-y-3">
                        <div>
                            <label className="text-xs font-medium text-[#5B6474]">Kode *</label>
                            <Input className="mt-1" value={editAccountForm.data.code} onChange={(e) => editAccountForm.setData('code', e.target.value)} />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-[#5B6474]">Nama *</label>
                            <Input className="mt-1" value={editAccountForm.data.name} onChange={(e) => editAccountForm.setData('name', e.target.value)} />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-[#5B6474]">Tipe</label>
                            <Select className="mt-1 w-full" value={editAccountForm.data.type} onChange={(v) => editAccountForm.setData('type', v)}
                                options={['asset', 'liability', 'equity', 'revenue', 'expense'].map((t) => ({ value: t, label: t }))}
                            />
                        </div>
                    </div>
                    <div className="mt-5 flex justify-end gap-3">
                        <SecondaryButton type="button" onClick={closeEdit}>Batal</SecondaryButton>
                        <PrimaryButton disabled={editAccountForm.processing}>Simpan</PrimaryButton>
                    </div>
                </form>
            </Modal>

            <Modal show={modal === 'editPayrollEntry'} onClose={closeEdit} maxWidth="md">
                <form onSubmit={submitEditPayrollEntry} className="p-6">
                    <h2 className="text-lg font-semibold text-[#111827]">Edit Entri Payroll {'\u2014'} {editTarget?.person_name}</h2>
                    <p className="text-xs text-[#5B6474]">Hanya periode DRAFT. PPh 21 dihitung ulang otomatis (tarif UU HPP).</p>
                    <Row gutter={[12, 12]} className="mt-4">
                        <Col xs={12}>
                            <label className="text-xs font-medium text-[#5B6474]">Gaji Pokok *</label>
                            <PriceInput value={payrollEntryForm.data.gaji_pokok} onChange={(e) => payrollEntryForm.setData('gaji_pokok', e.target.value)} className="mt-1 block w-full" />
                        </Col>
                        <Col xs={12}>
                            <label className="text-xs font-medium text-[#5B6474]">Tunjangan</label>
                            <PriceInput value={payrollEntryForm.data.tunjangan} onChange={(e) => payrollEntryForm.setData('tunjangan', e.target.value)} className="mt-1 block w-full" />
                        </Col>
                        <Col xs={12}>
                            <label className="text-xs font-medium text-[#5B6474]">Borongan/Insentif</label>
                            <PriceInput value={payrollEntryForm.data.borongan_insentif} onChange={(e) => payrollEntryForm.setData('borongan_insentif', e.target.value)} className="mt-1 block w-full" />
                        </Col>
                        <Col xs={12}>
                            <label className="text-xs font-medium text-[#5B6474]">Potongan Lain</label>
                            <PriceInput value={payrollEntryForm.data.potongan_lain} onChange={(e) => payrollEntryForm.setData('potongan_lain', e.target.value)} className="mt-1 block w-full" />
                        </Col>
                        <Col xs={12}>
                            <label className="text-xs font-medium text-[#5B6474]">BPJS</label>
                            <PriceInput value={payrollEntryForm.data.bpjs} onChange={(e) => payrollEntryForm.setData('bpjs', e.target.value)} className="mt-1 block w-full" />
                        </Col>
                    </Row>
                    <div className="mt-5 flex justify-end gap-3">
                        <SecondaryButton type="button" onClick={closeEdit}>Batal</SecondaryButton>
                        <PrimaryButton disabled={payrollEntryForm.processing}>Simpan</PrimaryButton>
                    </div>
                </form>
            </Modal>

            <Modal show={modal === 'po'} onClose={() => setModal(null)} maxWidth="lg">
                <form onSubmit={submitPo} className="p-6">
                    <h2 className="text-lg font-semibold text-[#111827]">Purchase Order Baru</h2>
                    <p className="text-xs text-[#5B6474]">Nomor PO terbit otomatis ({'{seq}/PO-BT/TB/{bulan romawi}/{tahun}'}). Unit kapal kosong = PO Umum.</p>
                    <Row gutter={[12, 12]} className="mt-4">
                        <Col xs={12}>
                            <label className="text-xs font-medium text-[#5B6474]">Tanggal *</label>
                            <Input type="date" className="mt-1" value={poForm.data.order_date} onChange={(e) => poForm.setData('order_date', e.target.value)} />
                        </Col>
                        <Col xs={12}>
                            <label className="text-xs font-medium text-[#5B6474]">Supplier *</label>
                            <Select className="mt-1 w-full" value={poForm.data.supplier_id || undefined} onChange={(v) => poForm.setData('supplier_id', v)} placeholder="\u2014 pilih \u2014"
                                options={(suppliers ?? []).map((s: any) => ({ value: String(s.id), label: s.name }))}
                            />
                        </Col>
                        <Col xs={12}>
                            <label className="text-xs font-medium text-[#5B6474]">Unit Kapal (PO milik kapal)</label>
                            <Select className="mt-1 w-full" value={poForm.data.vessel_id || undefined} onChange={(v) => poForm.setData('vessel_id', v)} placeholder="\u2014 umum (kantor) \u2014" allowClear
                                options={(vesselsPo ?? []).map((v: any) => ({ value: String(v.id), label: v.vessel_name }))}
                            />
                        </Col>
                        <Col xs={12}>
                            <label className="text-xs font-medium text-[#5B6474]">Dept *</label>
                            <Select className="mt-1 w-full" value={poForm.data.dept} onChange={(v) => poForm.setData('dept', v)}
                                options={['ENGINE', 'DECK', 'HRD', 'OPERATION'].map((d) => ({ value: d, label: d }))}
                            />
                        </Col>
                    </Row>
                    <div className="mt-4">
                        <label className="text-xs font-medium text-[#5B6474]">Item *</label>
                        {poForm.data.items.map((row, idx) => (
                            <Row key={idx} gutter={[8, 8]} className="mt-2" align="middle">
                                <Col xs={10}><Input placeholder="Nama barang" value={row.item_name} onChange={(e) => poForm.setData('items', poForm.data.items.map((p, i) => i === idx ? { ...p, item_name: e.target.value } : p))} /></Col>
                                <Col xs={4}><Input placeholder="No. barang" value={row.item_code} onChange={(e) => poForm.setData('items', poForm.data.items.map((p, i) => i === idx ? { ...p, item_code: e.target.value } : p))} /></Col>
                                <Col xs={2}><NumericInput decimalPlaces={2} placeholder="Qty" value={row.qty} onChange={(e) => poForm.setData('items', poForm.data.items.map((p, i) => i === idx ? { ...p, qty: e.target.value } : p))} /></Col>
                                <Col xs={2}><Input placeholder="Satuan" value={row.unit} onChange={(e) => poForm.setData('items', poForm.data.items.map((p, i) => i === idx ? { ...p, unit: e.target.value } : p))} /></Col>
                                <Col xs={6}><PriceInput placeholder="Harga" value={row.price} onChange={(e) => poForm.setData('items', poForm.data.items.map((p, i) => i === idx ? { ...p, price: e.target.value } : p))} /></Col>
                            </Row>
                        ))}
                        <button type="button" onClick={() => poForm.setData('items', [...poForm.data.items, { item_name: '', item_code: '', qty: '1', unit: 'pcs', price: '' }])} className="mt-2 text-xs font-medium text-[#BA0C2F] hover:underline">+ Tambah baris item</button>
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
                message={confirmDel ? `${confirmDel.label} \u2014 ${confirmDel.note ?? 'Tindakan tercatat di audit trail.'}` : ''}
                processing={busy}
                onClose={() => setConfirmDel(null)}
                onConfirm={() => {
                    if (!confirmDel) return;
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