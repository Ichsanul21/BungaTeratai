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
import { classNames, daysUntil, formatDate, formatNumber, formatRupiah } from '@/lib/format';
import { type PageProps } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { AlertTriangle, Boxes, Package, Plus, Ship, Truck } from 'lucide-react';
import { FormEvent, useState } from 'react';

const CAT_LABELS: Record<string, string> = {
    sparepart: 'Sparepart',
    habis_pakai: 'Habis Pakai',
    konsumsi: 'Konsumsi',
    ppe: 'APD/PPE',
};

export default function InventoryIndex({
    tab,
    vesselId,
    items,
    vessels,
    expiringBatches,
    lowStock,
    movements,
    canManage,
}: PageProps<{
    tab: string;
    vesselId: number;
    items: Array<Record<string, any>>;
    vessels: Array<{ id: number; vessel_name: string }>;
    expiringBatches: Array<Record<string, any>>;
    lowStock: Array<Record<string, any>>;
    movements: Array<Record<string, any>>;
    canManage: boolean;
}>) {
    const [modal, setModal] = useState<null | 'item' | 'movement' | 'editItem' | 'batch' | 'editBatch'>(null);
    const [editItem, setEditItem] = useState<any>(null);
    const [editBatch, setEditBatch] = useState<any>(null);
    const [confirmDel, setConfirmDel] = useState<{ url: string; label: string; note?: string } | null>(null);
    const [busy, setBusy] = useState(false);

    const itemForm = useForm({
        sku: '', name: '', category: 'sparepart', unit: 'pcs', unit_price: '',
        is_consumable: true, is_perishable: false, min_stock: '', stok_awal: '',
    });
    const movementForm = useForm({
        item_id: '', type: 'masuk', qty: '',
        from_location: 'kantor', from_vessel_id: '',
        to_location: 'kapal', to_vessel_id: '',
        notes: '',
    });

    const batchForm = useForm({
        item_id: '', location_type: 'kantor', vessel_id: '', batch_no: '', qty: '', expires_at: '',
    });

    const editItemForm = useForm({
        sku: '', name: '', category: 'sparepart', unit: 'pcs', unit_price: '',
        is_consumable: true, is_perishable: false, min_stock: '',
    });

    const editBatchForm = useForm({ batch_no: '', qty: '', expires_at: '' });

    const tabs = [
        { key: 'kantor', label: 'Gudang Kantor', icon: Boxes },
        { key: 'kapal', label: 'Stok di Kapal', icon: Ship },
    ];

    const submitItem = (e: FormEvent) => {
        e.preventDefault();
        itemForm.post('/inventory/items', { preserveScroll: true, onSuccess: () => setModal(null) });
    };
    const submitEditItem = (e: FormEvent) => {
        e.preventDefault();
        if (! editItem) return;
        editItemForm.put(`/inventory/items/${editItem.id}`, { preserveScroll: true, onSuccess: () => { setModal(null); setEditItem(null); } });
    };
    const submitMovement = (e: FormEvent) => {
        e.preventDefault();
        movementForm.post('/inventory/movements', { preserveScroll: true, onSuccess: () => setModal(null) });
    };
    const submitBatch = (e: FormEvent) => {
        e.preventDefault();
        batchForm.post('/inventory/batches', { preserveScroll: true, onSuccess: () => { setModal(null); batchForm.reset(); } });
    };
    const submitEditBatch = (e: FormEvent) => {
        e.preventDefault();
        if (! editBatch) return;
        editBatchForm.put(`/inventory/batches/${editBatch.id}`, { preserveScroll: true, onSuccess: () => { setModal(null); setEditBatch(null); } });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Inventory" />

            <PageHeader
                title="Inventory"
                description="Stok gudang kantor & kapal — barang habis pakai, batch kedaluwarsa, transfer, dan alert stok minimum."
                actions={
                    canManage && (
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setModal('batch')}
                                className="inline-flex items-center gap-2 rounded-lg border border-hairline bg-white px-3.5 py-2 text-sm font-medium text-ink hover:border-primary/40"
                            >
                                <Plus size={16} /> Tambah Batch
                            </button>
                            <button
                                type="button"
                                onClick={() => setModal('movement')}
                                className="inline-flex items-center gap-2 rounded-lg border border-hairline bg-white px-3.5 py-2 text-sm font-medium text-ink hover:border-primary/40"
                            >
                                <Truck size={16} /> Mutasi Stok
                            </button>
                            <PrimaryButton onClick={() => setModal('item')}>
                                <Plus size={15} className="inline me-1" /> Item Baru
                            </PrimaryButton>
                        </div>
                    )
                }
            />

            <TabNav
                tabs={tabs}
                active={tab}
                onChange={(key) =>
                    router.get('/inventory', key === 'kapal' ? { tab: key, vessel_id: vesselId || vessels[0]?.id } : { tab: key }, { preserveState: true })
                }
            />

            {tab === 'kapal' && (
                <div className="mb-4 flex items-center gap-2">
                    <span className="text-sm text-muted">Tampilkan kapal:</span>
                    <select
                        defaultValue={vesselId}
                        onChange={(e) => router.get('/inventory', { tab: 'kapal', vessel_id: e.target.value }, { preserveState: true })}
                        className="rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary"
                    >
                        {vessels.map((v) => (
                            <option key={v.id} value={v.id}>{v.vessel_name}</option>
                        ))}
                    </select>
                </div>
            )}

            <div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Card title="Stok Minimum" description="Perlu pengadaan / restock.">
                    {lowStock.length === 0 ? (
                        <p className="text-sm text-muted">Semua stok di atas minimum.</p>
                    ) : (
                        <ul className="space-y-1.5">
                            {lowStock.map((i) => (
                                <li key={i.id} className="flex justify-between rounded-lg bg-warn/5 px-3 py-2 text-sm">
                                    <span className="text-ink">{i.sku} · {i.name}</span>
                                    <span className="font-semibold text-warn">
                                        {formatNumber(i.qty, 2)} / min {formatNumber(i.min_stock, 2)} {i.unit}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>
                <Card title="Batch Kedaluwarsa / Mendekati" description="Item perishable.">
                    {expiringBatches.length === 0 ? (
                        <p className="text-sm text-muted">Tidak ada batch bermasalah.</p>
                    ) : (
                        <ul className="space-y-1.5">
                            {expiringBatches.map((b) => (
                                <li key={b.id} className="flex items-center justify-between rounded-lg border border-hairline px-3 py-2 text-sm">
                                    <div>
                                        <p className="text-ink">{b.item_name} · batch {b.batch_no}</p>
                                        <p className="text-xs text-muted">{b.location} · {formatDate(b.expires_at)}</p>
                                    </div>
                                    <Badge tone={b.is_expired ? 'danger' : 'warning'}>
                                        {b.is_expired ? `Kedaluwarsa ${Math.abs(daysUntil(b.expires_at) ?? 0)} hr lalu` : `${daysUntil(b.expires_at)} hr lagi`}
                                    </Badge>
                                    {canManage && (
                                        <div className="flex gap-2 text-xs font-medium">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setEditBatch(b);
                                                    editBatchForm.setData({
                                                        batch_no: b.batch_no,
                                                        qty: String(b.qty),
                                                        expires_at: b.expires_at ? String(b.expires_at).slice(0, 10) : '',
                                                    });
                                                    setModal('editBatch');
                                                }}
                                                className="text-primary hover:underline"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setConfirmDel({ url: `/inventory/batches/${b.id}`, label: `batch ${b.batch_no}` })}
                                                className="text-primary hover:underline"
                                            >
                                                Hapus
                                            </button>
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>
            </div>

            <Card title={tab === 'kantor' ? 'Item — Gudang Kantor' : 'Item — Stok Kapal'}>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-appbg text-left text-xs uppercase tracking-wide text-muted">
                            <tr>{['SKU', 'Nama', 'Kategori', 'Harga', 'Qty', 'Nilai', 'Min', 'Flag', ...(canManage ? ['Aksi'] : [])].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr>
                        </thead>
                        <tbody className="divide-y divide-hairline">
                            {items.map((i) => (
                                <tr key={i.id} className="hover:bg-appbg">
                                    <td className="px-3 py-2 font-mono text-xs text-ink">{i.sku}</td>
                                    <td className="px-3 py-2 font-medium text-ink">{i.name}</td>
                                    <td className="px-3 py-2 text-muted">{CAT_LABELS[i.category] ?? i.category}</td>
                                    <td className="px-3 py-2 tabular-nums">{formatRupiah(i.unit_price)}</td>
                                    <td className={classNames('px-3 py-2 font-semibold tabular-nums', i.qty < i.min_stock ? 'text-warn' : 'text-ink')}>
                                        {formatNumber(i.qty, 2)} {i.unit}
                                    </td>
                                    <td className="px-3 py-2 tabular-nums text-muted">{formatRupiah(i.nilai)}</td>
                                    <td className="px-3 py-2 tabular-nums text-muted">{formatNumber(i.min_stock, 2)}</td>
                                    <td className="px-3 py-2">
                                        <div className="flex gap-1">
                                            {i.is_consumable && <Badge tone="info">Habis Pakai</Badge>}
                                            {i.is_perishable && <Badge tone="warning">Expired-able</Badge>}
                                        </div>
                                    </td>
                                    {canManage && (
                                        <td className="px-3 py-2">
                                            <div className="flex gap-2 text-xs font-medium">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setEditItem(i);
                                                        editItemForm.setData({
                                                            sku: i.sku,
                                                            name: i.name,
                                                            category: i.category,
                                                            unit: i.unit,
                                                            unit_price: String(i.unit_price),
                                                            is_consumable: Boolean(i.is_consumable),
                                                            is_perishable: Boolean(i.is_perishable),
                                                            min_stock: String(i.min_stock),
                                                        });
                                                        setModal('editItem');
                                                    }}
                                                    className="text-primary hover:underline"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setConfirmDel({ url: `/inventory/items/${i.id}`, label: `item ${i.sku}` })}
                                                    className="text-primary hover:underline"
                                                >
                                                    Hapus
                                                </button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            <Card title="Mutasi Terakhir" className="mt-5">
                <ul className="divide-y divide-hairline text-sm">
                    {movements.map((m) => (
                        <li key={m.id} className="flex items-center justify-between py-2">
                            <div>
                                <p className="text-ink">{m.item_name} — <span className="capitalize font-medium">{m.type}</span> {formatNumber(m.qty, 2)}</p>
                                <p className="text-xs text-muted">
                                    {m.from_location ?? '—'} → {m.to_location ?? '—'} · {formatDate(m.movement_date)} · {m.user_name ?? '—'}
                                    {m.ref_type === 'service' ? ' · servis' : ''}
                                </p>
                            </div>
                            {m.notes && <p className="max-w-64 text-xs italic text-muted">{m.notes}</p>}
                            {canManage && m.ref_type === 'manual' && (
                                <button
                                    type="button"
                                    onClick={() => setConfirmDel({ url: `/inventory/movements/${m.id}`, label: `mutasi ${m.item_name} (${m.type})`, note: 'Saldo stok otomatis dibalikkan.' })}
                                    className="text-xs font-medium text-primary hover:underline"
                                >
                                    Hapus
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            </Card>

            <Modal show={modal === 'item'} onClose={() => setModal(null)} maxWidth="md">
                <form onSubmit={submitItem} className="p-6">
                    <h2 className="text-lg font-semibold text-ink">Item Inventory Baru</h2>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                        <div><label className="text-xs font-medium text-muted">SKU *</label>
                            <input value={itemForm.data.sku} onChange={(e) => itemForm.setData('sku', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" /></div>
                        <div><label className="text-xs font-medium text-muted">Nama *</label>
                            <input value={itemForm.data.name} onChange={(e) => itemForm.setData('name', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" /></div>
                        <div><label className="text-xs font-medium text-muted">Kategori</label>
                            <select value={itemForm.data.category} onChange={(e) => itemForm.setData('category', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary">
                                {Object.entries(CAT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select></div>
                        <div><label className="text-xs font-medium text-muted">Satuan</label>
                            <input value={itemForm.data.unit} onChange={(e) => itemForm.setData('unit', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" /></div>
                        <div><label className="text-xs font-medium text-muted">Harga Satuan</label>
                            <PriceInput value={itemForm.data.unit_price} onChange={(e) => itemForm.setData('unit_price', e.target.value)} className="mt-1 block w-full" /></div>
                        <div><label className="text-xs font-medium text-muted">Stok Minimum</label>
                            <NumericInput value={itemForm.data.min_stock} onChange={(e) => itemForm.setData('min_stock', e.target.value)} className="mt-1 block w-full" /></div>
                        <div><label className="text-xs font-medium text-muted">Stok Awal (kantor)</label>
                            <NumericInput value={itemForm.data.stok_awal} onChange={(e) => itemForm.setData('stok_awal', e.target.value)} className="mt-1 block w-full" /></div>
                        <div className="flex flex-col justify-end gap-2 pb-1">
                            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={itemForm.data.is_consumable} onChange={(e) => itemForm.setData('is_consumable', e.target.checked)} className="rounded border-gray-300 text-primary focus:ring-primary" /> Habis pakai</label>
                            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={itemForm.data.is_perishable} onChange={(e) => itemForm.setData('is_perishable', e.target.checked)} className="rounded border-gray-300 text-primary focus:ring-primary" /> Ada masa berlaku (batch)</label>
                        </div>
                    </div>
                    <div className="mt-5 flex justify-end gap-3">
                        <SecondaryButton type="button" onClick={() => setModal(null)}>Batal</SecondaryButton>
                        <PrimaryButton disabled={itemForm.processing}>Simpan Item</PrimaryButton>
                    </div>
                </form>
            </Modal>

            <Modal show={modal === 'movement'} onClose={() => setModal(null)} maxWidth="md">
                <form onSubmit={submitMovement} className="p-6">
                    <h2 className="text-lg font-semibold text-ink">Mutasi Stok</h2>
                    <div className="mt-4 space-y-3">
                        <div><label className="text-xs font-medium text-muted">Item *</label>
                            <select value={movementForm.data.item_id} onChange={(e) => movementForm.setData('item_id', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary">
                                <option value="">— pilih —</option>
                                {items.map((i) => <option key={i.id} value={i.id}>{i.sku} · {i.name}</option>)}
                            </select></div>
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className="text-xs font-medium text-muted">Jenis *</label>
                                <select value={movementForm.data.type} onChange={(e) => movementForm.setData('type', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary">
                                    <option value="masuk">Masuk</option>
                                    <option value="keluar">Keluar</option>
                                    <option value="transfer">Transfer kantor ↔ kapal</option>
                                    <option value="penyesuaian">Penyesuaian</option>
                                </select></div>
                            <div><label className="text-xs font-medium text-muted">Qty *</label>
                                <NumericInput decimalPlaces={2} value={movementForm.data.qty} onChange={(e) => movementForm.setData('qty', e.target.value)} className="mt-1 block w-full" /></div>
                        </div>
                        {['keluar', 'transfer', 'penyesuaian'].includes(movementForm.data.type) && (
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="text-xs font-medium text-muted">Dari</label>
                                    <select value={movementForm.data.from_location} onChange={(e) => movementForm.setData('from_location', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary">
                                        <option value="kantor">Kantor</option><option value="kapal">Kapal</option>
                                    </select></div>
                                {movementForm.data.from_location === 'kapal' && (
                                    <div><label className="text-xs font-medium text-muted">Kapal Asal</label>
                                        <select value={movementForm.data.from_vessel_id} onChange={(e) => movementForm.setData('from_vessel_id', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary">
                                            <option value="">— pilih —</option>
                                            {vessels.map((v) => <option key={v.id} value={v.id}>{v.vessel_name}</option>)}
                                        </select></div>
                                )}
                            </div>
                        )}
                        {['masuk', 'transfer'].includes(movementForm.data.type) && (
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="text-xs font-medium text-muted">Ke</label>
                                    <select value={movementForm.data.to_location} onChange={(e) => movementForm.setData('to_location', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary">
                                        <option value="kantor">Kantor</option><option value="kapal">Kapal</option>
                                    </select></div>
                                {movementForm.data.to_location === 'kapal' && (
                                    <div><label className="text-xs font-medium text-muted">Kapal Tujuan</label>
                                        <select value={movementForm.data.to_vessel_id} onChange={(e) => movementForm.setData('to_vessel_id', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary">
                                            <option value="">— pilih —</option>
                                            {vessels.map((v) => <option key={v.id} value={v.id}>{v.vessel_name}</option>)}
                                        </select></div>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="mt-5 flex justify-end gap-3">
                        <SecondaryButton type="button" onClick={() => setModal(null)}>Batal</SecondaryButton>
                        <PrimaryButton disabled={movementForm.processing}>Simpan Mutasi</PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* Modal: Edit Item */}
            <Modal show={modal === 'editItem'} onClose={() => setModal(null)} maxWidth="md">
                <form onSubmit={submitEditItem} className="p-6">
                    <h2 className="text-lg font-semibold text-ink">Edit Item Inventory</h2>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                        <div><label className="text-xs font-medium text-muted">SKU *</label>
                            <input value={editItemForm.data.sku} onChange={(e) => editItemForm.setData('sku', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" /></div>
                        <div><label className="text-xs font-medium text-muted">Nama *</label>
                            <input value={editItemForm.data.name} onChange={(e) => editItemForm.setData('name', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" /></div>
                        <div><label className="text-xs font-medium text-muted">Kategori</label>
                            <select value={editItemForm.data.category} onChange={(e) => editItemForm.setData('category', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary">
                                {Object.entries(CAT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select></div>
                        <div><label className="text-xs font-medium text-muted">Satuan</label>
                            <input value={editItemForm.data.unit} onChange={(e) => editItemForm.setData('unit', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" /></div>
                        <div><label className="text-xs font-medium text-muted">Harga Satuan</label>
                            <PriceInput value={editItemForm.data.unit_price} onChange={(e) => editItemForm.setData('unit_price', e.target.value)} className="mt-1 block w-full" /></div>
                        <div><label className="text-xs font-medium text-muted">Stok Minimum</label>
                            <NumericInput value={editItemForm.data.min_stock} onChange={(e) => editItemForm.setData('min_stock', e.target.value)} className="mt-1 block w-full" /></div>
                        <div className="flex flex-col justify-end gap-2 pb-1">
                            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editItemForm.data.is_consumable} onChange={(e) => editItemForm.setData('is_consumable', e.target.checked)} className="rounded border-gray-300 text-primary focus:ring-primary" /> Habis pakai</label>
                            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editItemForm.data.is_perishable} onChange={(e) => editItemForm.setData('is_perishable', e.target.checked)} className="rounded border-gray-300 text-primary focus:ring-primary" /> Ada masa berlaku (batch)</label>
                        </div>
                    </div>
                    <div className="mt-5 flex justify-end gap-3">
                        <SecondaryButton type="button" onClick={() => setModal(null)}>Batal</SecondaryButton>
                        <PrimaryButton disabled={editItemForm.processing}>Simpan Perubahan</PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* Modal: Tambah Batch */}
            <Modal show={modal === 'batch'} onClose={() => setModal(null)} maxWidth="md">
                <form onSubmit={submitBatch} className="p-6">
                    <h2 className="text-lg font-semibold text-ink">Tambah Batch (Barang Berkadaluarsa)</h2>
                    <div className="mt-4 space-y-3">
                        <div><label className="text-xs font-medium text-muted">Item *</label>
                            <select value={batchForm.data.item_id} onChange={(e) => batchForm.setData('item_id', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary">
                                <option value="">— pilih item —</option>
                                {items.map((i) => <option key={i.id} value={i.id}>{i.sku} · {i.name}</option>)}
                            </select></div>
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className="text-xs font-medium text-muted">Lokasi</label>
                                <select value={batchForm.data.location_type} onChange={(e) => batchForm.setData('location_type', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary">
                                    <option value="kantor">Kantor</option>
                                    <option value="kapal">Kapal</option>
                                </select></div>
                            {batchForm.data.location_type === 'kapal' && (
                                <div><label className="text-xs font-medium text-muted">Kapal *</label>
                                    <select value={batchForm.data.vessel_id} onChange={(e) => batchForm.setData('vessel_id', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary">
                                        <option value="">— pilih —</option>
                                        {vessels.map((v) => <option key={v.id} value={v.id}>{v.vessel_name}</option>)}
                                    </select></div>
                            )}
                            <div><label className="text-xs font-medium text-muted">No. Batch *</label>
                                <input value={batchForm.data.batch_no} onChange={(e) => batchForm.setData('batch_no', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" /></div>
                            <div><label className="text-xs font-medium text-muted">Qty *</label>
                                <NumericInput decimalPlaces={2} value={batchForm.data.qty} onChange={(e) => batchForm.setData('qty', e.target.value)} className="mt-1 block w-full" /></div>
                            <div><label className="text-xs font-medium text-muted">Kadaluarsa</label>
                                <input type="date" value={batchForm.data.expires_at} onChange={(e) => batchForm.setData('expires_at', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" /></div>
                        </div>
                    </div>
                    <div className="mt-5 flex justify-end gap-3">
                        <SecondaryButton type="button" onClick={() => setModal(null)}>Batal</SecondaryButton>
                        <PrimaryButton disabled={batchForm.processing}>Simpan Batch</PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* Modal: Edit Batch */}
            <Modal show={modal === 'editBatch'} onClose={() => setModal(null)} maxWidth="md">
                <form onSubmit={submitEditBatch} className="p-6">
                    <h2 className="text-lg font-semibold text-ink">Edit Batch {editBatch?.batch_no}</h2>
                    <div className="mt-4 space-y-3">
                        <div><label className="text-xs font-medium text-muted">No. Batch *</label>
                            <input value={editBatchForm.data.batch_no} onChange={(e) => editBatchForm.setData('batch_no', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" /></div>
                        <div><label className="text-xs font-medium text-muted">Qty *</label>
                            <NumericInput decimalPlaces={2} value={editBatchForm.data.qty} onChange={(e) => editBatchForm.setData('qty', e.target.value)} className="mt-1 block w-full" /></div>
                        <div><label className="text-xs font-medium text-muted">Kadaluarsa</label>
                            <input type="date" value={editBatchForm.data.expires_at} onChange={(e) => editBatchForm.setData('expires_at', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" /></div>
                    </div>
                    <div className="mt-5 flex justify-end gap-3">
                        <SecondaryButton type="button" onClick={() => setModal(null)}>Batal</SecondaryButton>
                        <PrimaryButton disabled={editBatchForm.processing}>Simpan</PrimaryButton>
                    </div>
                </form>
            </Modal>

            <ConfirmModal
                show={!!confirmDel}
                title="Hapus data ini?"
                message={confirmDel ? `${confirmDel.label} akan dihapus. ${confirmDel.note ?? ''}` : ''}
                processing={busy}
                onClose={() => setConfirmDel(null)}
                onConfirm={() => {
                    if (!confirmDel) return;
                    setBusy(true);
                    router.delete(confirmDel.url, { preserveScroll: true, onFinish: () => { setBusy(false); setConfirmDel(null); } });
                }}
            />
        </AuthenticatedLayout>
    );
}
