import Badge, { type BadgeTone } from '@/Components/ui/Badge';
import Card from '@/Components/ui/Card';
import Modal from '@/Components/Modal';
import PageHeader from '@/Components/ui/PageHeader';
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
    const [modal, setModal] = useState<null | 'item' | 'movement'>(null);

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

    const tabs = [
        { key: 'kantor', label: 'Gudang Kantor', icon: Boxes },
        { key: 'kapal', label: 'Stok di Kapal', icon: Ship },
    ];

    const submitItem = (e: FormEvent) => {
        e.preventDefault();
        itemForm.post('/inventory/items', { preserveScroll: true, onSuccess: () => setModal(null) });
    };
    const submitMovement = (e: FormEvent) => {
        e.preventDefault();
        movementForm.post('/inventory/movements', { preserveScroll: true, onSuccess: () => setModal(null) });
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
                                        {formatNumber(i.qty, 0)} / min {formatNumber(i.min_stock, 0)} {i.unit}
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
                            <tr>{['SKU', 'Nama', 'Kategori', 'Harga', 'Qty', 'Nilai', 'Min', 'Flag'].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr>
                        </thead>
                        <tbody className="divide-y divide-hairline">
                            {items.map((i) => (
                                <tr key={i.id} className="hover:bg-appbg">
                                    <td className="px-3 py-2 font-mono text-xs text-ink">{i.sku}</td>
                                    <td className="px-3 py-2 font-medium text-ink">{i.name}</td>
                                    <td className="px-3 py-2 text-muted">{CAT_LABELS[i.category] ?? i.category}</td>
                                    <td className="px-3 py-2 tabular-nums">{formatRupiah(i.unit_price)}</td>
                                    <td className={classNames('px-3 py-2 font-semibold tabular-nums', i.qty < i.min_stock ? 'text-warn' : 'text-ink')}>
                                        {formatNumber(i.qty, 0)} {i.unit}
                                    </td>
                                    <td className="px-3 py-2 tabular-nums text-muted">{formatRupiah(i.nilai)}</td>
                                    <td className="px-3 py-2 tabular-nums text-muted">{formatNumber(i.min_stock, 0)}</td>
                                    <td className="px-3 py-2">
                                        <div className="flex gap-1">
                                            {i.is_consumable && <Badge tone="info">Habis Pakai</Badge>}
                                            {i.is_perishable && <Badge tone="warning">Expired-able</Badge>}
                                        </div>
                                    </td>
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
                                <p className="text-ink">{m.item_name} — <span className="capitalize font-medium">{m.type}</span> {formatNumber(m.qty, 0)}</p>
                                <p className="text-xs text-muted">
                                    {m.from_location ?? '—'} → {m.to_location ?? '—'} · {formatDate(m.movement_date)} · {m.user_name ?? '—'}
                                    {m.ref_type === 'service' ? ' · servis' : ''}
                                </p>
                            </div>
                            {m.notes && <p className="max-w-64 text-xs italic text-muted">{m.notes}</p>}
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
                            <input type="number" step="0.01" value={itemForm.data.unit_price} onChange={(e) => itemForm.setData('unit_price', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" /></div>
                        <div><label className="text-xs font-medium text-muted">Stok Minimum</label>
                            <input type="number" value={itemForm.data.min_stock} onChange={(e) => itemForm.setData('min_stock', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" /></div>
                        <div><label className="text-xs font-medium text-muted">Stok Awal (kantor)</label>
                            <input type="number" value={itemForm.data.stok_awal} onChange={(e) => itemForm.setData('stok_awal', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" /></div>
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
                                <input type="number" step="0.01" value={movementForm.data.qty} onChange={(e) => movementForm.setData('qty', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" /></div>
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
        </AuthenticatedLayout>
    );
}
