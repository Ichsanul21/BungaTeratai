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
import { Button, Checkbox, Col, DatePicker, Divider, Form, Input, InputNumber, Row, Select as AntSelect, Table, Tag } from 'antd';
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

    const itemColumns = [
        { title: 'SKU', dataIndex: 'sku', key: 'sku', render: (sku: string) => <span className="font-mono text-xs text-[#1C1B1A]">{sku}</span> },
        { title: 'Nama', dataIndex: 'name', key: 'name', render: (name: string) => <span className="font-medium text-[#1C1B1A]">{name}</span> },
        { title: 'Kategori', dataIndex: 'category', key: 'category', render: (cat: string) => <span className="text-[#8A8580]">{CAT_LABELS[cat] ?? cat}</span> },
        { title: 'Harga', dataIndex: 'unit_price', key: 'unit_price', render: (v: any) => <span className="tabular-nums">{formatRupiah(v)}</span> },
        {
            title: 'Qty', key: 'qty',
            render: (_: any, r: Record<string, any>) => (
                <span className={classNames('font-semibold tabular-nums', r.qty < r.min_stock ? 'text-[#D99A2B]' : 'text-[#1C1B1A]')}>
                    {formatNumber(r.qty, 2)} {r.unit}
                </span>
            ),
        },
        { title: 'Nilai', dataIndex: 'nilai', key: 'nilai', render: (v: any) => <span className="tabular-nums text-[#8A8580]">{formatRupiah(v)}</span> },
        { title: 'Min', dataIndex: 'min_stock', key: 'min_stock', render: (v: any) => <span className="tabular-nums text-[#8A8580]">{formatNumber(v, 2)}</span> },
        {
            title: 'Flag', key: 'flag',
            render: (_: any, r: Record<string, any>) => (
                <div className="flex gap-1">
                    {r.is_consumable && <Badge tone="info">Habis Pakai</Badge>}
                    {r.is_perishable && <Badge tone="warning">Expired-able</Badge>}
                </div>
            ),
        },
        ...(canManage ? [{
            title: 'Aksi', key: 'aksi',
            render: (_: any, r: Record<string, any>) => (
                <div className="flex gap-2 text-xs font-medium">
                    <button
                        type="button"
                        onClick={() => {
                            setEditItem(r);
                            editItemForm.setData({
                                sku: r.sku, name: r.name, category: r.category, unit: r.unit,
                                unit_price: String(r.unit_price),
                                is_consumable: Boolean(r.is_consumable),
                                is_perishable: Boolean(r.is_perishable),
                                min_stock: String(r.min_stock),
                            });
                            setModal('editItem');
                        }}
                        className="text-[#C1121F] hover:underline"
                    >
                        Edit
                    </button>
                    <button
                        type="button"
                        onClick={() => setConfirmDel({ url: `/inventory/items/${r.id}`, label: `item ${r.sku}` })}
                        className="text-[#C1121F] hover:underline"
                    >
                        Hapus
                    </button>
                </div>
            ),
        }] : []),
    ];

    return (
        <AuthenticatedLayout>
            <Head title="Inventory" />

            <PageHeader
                title="Inventory"
                description="Stok gudang kantor & kapal — barang habis pakai, batch kedaluwarsa, transfer, dan alert stok minimum."
                actions={
                    canManage && (
                        <div className="flex gap-2">
                            <SecondaryButton onClick={() => setModal('batch')} icon={<Plus size={16} />}>Tambah Batch</SecondaryButton>
                            <SecondaryButton onClick={() => setModal('movement')} icon={<Truck size={16} />}>Mutasi Stok</SecondaryButton>
                            <PrimaryButton onClick={() => setModal('item')} icon={<Plus size={15} />}>Item Baru</PrimaryButton>
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
                    <span className="text-sm text-[#8A8580]">Tampilkan kapal:</span>
                    <AntSelect
                        defaultValue={vesselId}
                        onChange={(value) => router.get('/inventory', { tab: 'kapal', vessel_id: value }, { preserveState: true })}
                        style={{ width: 240 }}
                        options={vessels.map((v) => ({ value: v.id, label: v.vessel_name }))}
                    />
                </div>
            )}

            <Row gutter={16} className="mb-5">
                <Col xs={24} lg={12}>
                    <Card title="Stok Minimum" description="Perlu pengadaan / restock.">
                        {lowStock.length === 0 ? (
                            <p className="text-sm text-[#8A8580]">Semua stok di atas minimum.</p>
                        ) : (
                            <div className="space-y-1.5">
                                {lowStock.map((i) => (
                                    <div key={i.id} className="flex justify-between rounded-lg px-3 py-2 text-sm" style={{ background: '#D99A2B0D' }}>
                                        <span className="text-[#1C1B1A]">{i.sku} · {i.name}</span>
                                        <span className="font-semibold text-[#D99A2B]">
                                            {formatNumber(i.qty, 2)} / min {formatNumber(i.min_stock, 2)} {i.unit}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                </Col>
                <Col xs={24} lg={12}>
                    <Card title="Batch Kedaluwarsa / Mendekati" description="Item perishable.">
                        {expiringBatches.length === 0 ? (
                            <p className="text-sm text-[#8A8580]">Tidak ada batch bermasalah.</p>
                        ) : (
                            <div className="space-y-1.5">
                                {expiringBatches.map((b) => (
                                    <div key={b.id} className="flex items-center justify-between rounded-lg border border-[#E7E1D9] px-3 py-2 text-sm">
                                        <div>
                                            <p className="text-[#1C1B1A]">{b.item_name} · batch {b.batch_no}</p>
                                            <p className="text-xs text-[#8A8580]">{b.location} · {formatDate(b.expires_at)}</p>
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
                                                    className="text-[#C1121F] hover:underline"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setConfirmDel({ url: `/inventory/batches/${b.id}`, label: `batch ${b.batch_no}` })}
                                                    className="text-[#C1121F] hover:underline"
                                                >
                                                    Hapus
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                </Col>
            </Row>

            <Card title={tab === 'kantor' ? 'Item — Gudang Kantor' : 'Item — Stok Kapal'}>
                <Table
                    dataSource={items}
                    columns={itemColumns}
                    rowKey="id"
                    pagination={false}
                    size="small"
                    scroll={{ x: 800 }}
                    rowClassName={() => 'hover:bg-[#FAF7F2]'}
                />
            </Card>

            <Card title="Mutasi Terakhir" className="mt-5">
                <div className="divide-y divide-[#E7E1D9] text-sm">
                    {movements.map((m) => (
                        <div key={m.id} className="flex items-center justify-between py-2">
                            <div>
                                <p className="text-[#1C1B1A]">{m.item_name} — <span className="capitalize font-medium">{m.type}</span> {formatNumber(m.qty, 2)}</p>
                                <p className="text-xs text-[#8A8580]">
                                    {m.from_location ?? '—'} → {m.to_location ?? '—'} · {formatDate(m.movement_date)} · {m.user_name ?? '—'}
                                    {m.ref_type === 'service' ? ' · servis' : ''}
                                </p>
                            </div>
                            {m.notes && <p className="max-w-64 text-xs italic text-[#8A8580]">{m.notes}</p>}
                            {canManage && m.ref_type === 'manual' && (
                                <button
                                    type="button"
                                    onClick={() => setConfirmDel({ url: `/inventory/movements/${m.id}`, label: `mutasi ${m.item_name} (${m.type})`, note: 'Saldo stok otomatis dibalikkan.' })}
                                    className="text-xs font-medium text-[#C1121F] hover:underline"
                                >
                                    Hapus
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </Card>

            <Modal show={modal === 'item'} onClose={() => setModal(null)} maxWidth="md">
                <form onSubmit={submitItem} className="p-6">
                    <h2 className="text-lg font-semibold text-[#1C1B1A]">Item Inventory Baru</h2>
                    <Row gutter={12} className="mt-4">
                        <Col span={12}>
                            <Form.Item label={<span className="text-xs font-medium text-[#8A8580]">SKU *</span>}>
                                <Input value={itemForm.data.sku} onChange={(e) => itemForm.setData('sku', e.target.value)} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label={<span className="text-xs font-medium text-[#8A8580]">Nama *</span>}>
                                <Input value={itemForm.data.name} onChange={(e) => itemForm.setData('name', e.target.value)} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label={<span className="text-xs font-medium text-[#8A8580]">Kategori</span>}>
                                <AntSelect
                                    value={itemForm.data.category}
                                    onChange={(value) => itemForm.setData('category', value)}
                                    style={{ width: '100%' }}
                                    options={Object.entries(CAT_LABELS).map(([k, v]) => ({ value: k, label: v }))}
                                />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label={<span className="text-xs font-medium text-[#8A8580]">Satuan</span>}>
                                <Input value={itemForm.data.unit} onChange={(e) => itemForm.setData('unit', e.target.value)} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label={<span className="text-xs font-medium text-[#8A8580]">Harga Satuan</span>}>
                                <PriceInput value={itemForm.data.unit_price} onChange={(e) => itemForm.setData('unit_price', e.target.value)} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label={<span className="text-xs font-medium text-[#8A8580]">Stok Minimum</span>}>
                                <NumericInput value={itemForm.data.min_stock} onChange={(e) => itemForm.setData('min_stock', e.target.value)} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label={<span className="text-xs font-medium text-[#8A8580]">Stok Awal (kantor)</span>}>
                                <NumericInput value={itemForm.data.stok_awal} onChange={(e) => itemForm.setData('stok_awal', e.target.value)} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <div className="flex flex-col justify-end gap-2 pb-1">
                                <Checkbox checked={itemForm.data.is_consumable} onChange={(e) => itemForm.setData('is_consumable', e.target.checked)}>
                                    Habis pakai
                                </Checkbox>
                                <Checkbox checked={itemForm.data.is_perishable} onChange={(e) => itemForm.setData('is_perishable', e.target.checked)}>
                                    Ada masa berlaku (batch)
                                </Checkbox>
                            </div>
                        </Col>
                    </Row>
                    <div className="mt-5 flex justify-end gap-3">
                        <SecondaryButton onClick={() => setModal(null)}>Batal</SecondaryButton>
                        <PrimaryButton htmlType="submit" disabled={itemForm.processing}>Simpan Item</PrimaryButton>
                    </div>
                </form>
            </Modal>

            <Modal show={modal === 'movement'} onClose={() => setModal(null)} maxWidth="md">
                <form onSubmit={submitMovement} className="p-6">
                    <h2 className="text-lg font-semibold text-[#1C1B1A]">Mutasi Stok</h2>
                    <div className="mt-4 space-y-3">
                        <Form.Item label={<span className="text-xs font-medium text-[#8A8580]">Item *</span>}>
                            <AntSelect
                                value={movementForm.data.item_id || undefined}
                                onChange={(value) => movementForm.setData('item_id', value)}
                                placeholder="— pilih —"
                                style={{ width: '100%' }}
                                options={[
                                    { value: '', label: '— pilih —' },
                                    ...items.map((i) => ({ value: String(i.id), label: `${i.sku} · ${i.name}` })),
                                ]}
                                showSearch
                                optionFilterProp="label"
                            />
                        </Form.Item>
                        <Row gutter={12}>
                            <Col span={12}>
                                <Form.Item label={<span className="text-xs font-medium text-[#8A8580]">Jenis *</span>}>
                                    <AntSelect
                                        value={movementForm.data.type}
                                        onChange={(value) => movementForm.setData('type', value)}
                                        style={{ width: '100%' }}
                                        options={[
                                            { value: 'masuk', label: 'Masuk' },
                                            { value: 'keluar', label: 'Keluar' },
                                            { value: 'transfer', label: 'Transfer kantor ↔ kapal' },
                                            { value: 'penyesuaian', label: 'Penyesuaian' },
                                        ]}
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item label={<span className="text-xs font-medium text-[#8A8580]">Qty *</span>}>
                                    <NumericInput decimalPlaces={2} value={movementForm.data.qty} onChange={(e) => movementForm.setData('qty', e.target.value)} />
                                </Form.Item>
                            </Col>
                        </Row>
                        {['keluar', 'transfer', 'penyesuaian'].includes(movementForm.data.type) && (
                            <Row gutter={12}>
                                <Col span={12}>
                                    <Form.Item label={<span className="text-xs font-medium text-[#8A8580]">Dari</span>}>
                                        <AntSelect
                                            value={movementForm.data.from_location}
                                            onChange={(value) => movementForm.setData('from_location', value)}
                                            style={{ width: '100%' }}
                                            options={[
                                                { value: 'kantor', label: 'Kantor' },
                                                { value: 'kapal', label: 'Kapal' },
                                            ]}
                                        />
                                    </Form.Item>
                                </Col>
                                {movementForm.data.from_location === 'kapal' && (
                                    <Col span={12}>
                                        <Form.Item label={<span className="text-xs font-medium text-[#8A8580]">Kapal Asal</span>}>
                                            <AntSelect
                                                value={movementForm.data.from_vessel_id || undefined}
                                                onChange={(value) => movementForm.setData('from_vessel_id', value)}
                                                placeholder="— pilih —"
                                                style={{ width: '100%' }}
                                                options={vessels.map((v) => ({ value: String(v.id), label: v.vessel_name }))}
                                                showSearch
                                                optionFilterProp="label"
                                            />
                                        </Form.Item>
                                    </Col>
                                )}
                            </Row>
                        )}
                        {['masuk', 'transfer'].includes(movementForm.data.type) && (
                            <Row gutter={12}>
                                <Col span={12}>
                                    <Form.Item label={<span className="text-xs font-medium text-[#8A8580]">Ke</span>}>
                                        <AntSelect
                                            value={movementForm.data.to_location}
                                            onChange={(value) => movementForm.setData('to_location', value)}
                                            style={{ width: '100%' }}
                                            options={[
                                                { value: 'kantor', label: 'Kantor' },
                                                { value: 'kapal', label: 'Kapal' },
                                            ]}
                                        />
                                    </Form.Item>
                                </Col>
                                {movementForm.data.to_location === 'kapal' && (
                                    <Col span={12}>
                                        <Form.Item label={<span className="text-xs font-medium text-[#8A8580]">Kapal Tujuan</span>}>
                                            <AntSelect
                                                value={movementForm.data.to_vessel_id || undefined}
                                                onChange={(value) => movementForm.setData('to_vessel_id', value)}
                                                placeholder="— pilih —"
                                                style={{ width: '100%' }}
                                                options={vessels.map((v) => ({ value: String(v.id), label: v.vessel_name }))}
                                                showSearch
                                                optionFilterProp="label"
                                            />
                                        </Form.Item>
                                    </Col>
                                )}
                            </Row>
                        )}
                    </div>
                    <div className="mt-5 flex justify-end gap-3">
                        <SecondaryButton onClick={() => setModal(null)}>Batal</SecondaryButton>
                        <PrimaryButton htmlType="submit" disabled={movementForm.processing}>Simpan Mutasi</PrimaryButton>
                    </div>
                </form>
            </Modal>

            <Modal show={modal === 'editItem'} onClose={() => setModal(null)} maxWidth="md">
                <form onSubmit={submitEditItem} className="p-6">
                    <h2 className="text-lg font-semibold text-[#1C1B1A]">Edit Item Inventory</h2>
                    <Row gutter={12} className="mt-4">
                        <Col span={12}>
                            <Form.Item label={<span className="text-xs font-medium text-[#8A8580]">SKU *</span>}>
                                <Input value={editItemForm.data.sku} onChange={(e) => editItemForm.setData('sku', e.target.value)} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label={<span className="text-xs font-medium text-[#8A8580]">Nama *</span>}>
                                <Input value={editItemForm.data.name} onChange={(e) => editItemForm.setData('name', e.target.value)} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label={<span className="text-xs font-medium text-[#8A8580]">Kategori</span>}>
                                <AntSelect
                                    value={editItemForm.data.category}
                                    onChange={(value) => editItemForm.setData('category', value)}
                                    style={{ width: '100%' }}
                                    options={Object.entries(CAT_LABELS).map(([k, v]) => ({ value: k, label: v }))}
                                />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label={<span className="text-xs font-medium text-[#8A8580]">Satuan</span>}>
                                <Input value={editItemForm.data.unit} onChange={(e) => editItemForm.setData('unit', e.target.value)} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label={<span className="text-xs font-medium text-[#8A8580]">Harga Satuan</span>}>
                                <PriceInput value={editItemForm.data.unit_price} onChange={(e) => editItemForm.setData('unit_price', e.target.value)} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label={<span className="text-xs font-medium text-[#8A8580]">Stok Minimum</span>}>
                                <NumericInput value={editItemForm.data.min_stock} onChange={(e) => editItemForm.setData('min_stock', e.target.value)} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <div className="flex flex-col justify-end gap-2 pb-1">
                                <Checkbox checked={editItemForm.data.is_consumable} onChange={(e) => editItemForm.setData('is_consumable', e.target.checked)}>
                                    Habis pakai
                                </Checkbox>
                                <Checkbox checked={editItemForm.data.is_perishable} onChange={(e) => editItemForm.setData('is_perishable', e.target.checked)}>
                                    Ada masa berlaku (batch)
                                </Checkbox>
                            </div>
                        </Col>
                    </Row>
                    <div className="mt-5 flex justify-end gap-3">
                        <SecondaryButton onClick={() => setModal(null)}>Batal</SecondaryButton>
                        <PrimaryButton htmlType="submit" disabled={editItemForm.processing}>Simpan Perubahan</PrimaryButton>
                    </div>
                </form>
            </Modal>

            <Modal show={modal === 'batch'} onClose={() => setModal(null)} maxWidth="md">
                <form onSubmit={submitBatch} className="p-6">
                    <h2 className="text-lg font-semibold text-[#1C1B1A]">Tambah Batch (Barang Berkadaluarsa)</h2>
                    <div className="mt-4 space-y-3">
                        <Form.Item label={<span className="text-xs font-medium text-[#8A8580]">Item *</span>}>
                            <AntSelect
                                value={batchForm.data.item_id || undefined}
                                onChange={(value) => batchForm.setData('item_id', value)}
                                placeholder="— pilih item —"
                                style={{ width: '100%' }}
                                options={[
                                    { value: '', label: '— pilih item —' },
                                    ...items.map((i) => ({ value: String(i.id), label: `${i.sku} · ${i.name}` })),
                                ]}
                                showSearch
                                optionFilterProp="label"
                            />
                        </Form.Item>
                        <Row gutter={12}>
                            <Col span={12}>
                                <Form.Item label={<span className="text-xs font-medium text-[#8A8580]">Lokasi</span>}>
                                    <AntSelect
                                        value={batchForm.data.location_type}
                                        onChange={(value) => batchForm.setData('location_type', value)}
                                        style={{ width: '100%' }}
                                        options={[
                                            { value: 'kantor', label: 'Kantor' },
                                            { value: 'kapal', label: 'Kapal' },
                                        ]}
                                    />
                                </Form.Item>
                            </Col>
                            {batchForm.data.location_type === 'kapal' && (
                                <Col span={12}>
                                    <Form.Item label={<span className="text-xs font-medium text-[#8A8580]">Kapal *</span>}>
                                        <AntSelect
                                            value={batchForm.data.vessel_id || undefined}
                                            onChange={(value) => batchForm.setData('vessel_id', value)}
                                            placeholder="— pilih —"
                                            style={{ width: '100%' }}
                                            options={vessels.map((v) => ({ value: String(v.id), label: v.vessel_name }))}
                                            showSearch
                                            optionFilterProp="label"
                                        />
                                    </Form.Item>
                                </Col>
                            )}
                            <Col span={12}>
                                <Form.Item label={<span className="text-xs font-medium text-[#8A8580]">No. Batch *</span>}>
                                    <Input value={batchForm.data.batch_no} onChange={(e) => batchForm.setData('batch_no', e.target.value)} />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item label={<span className="text-xs font-medium text-[#8A8580]">Qty *</span>}>
                                    <NumericInput decimalPlaces={2} value={batchForm.data.qty} onChange={(e) => batchForm.setData('qty', e.target.value)} />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item label={<span className="text-xs font-medium text-[#8A8580]">Kadaluarsa</span>}>
                                    <Input type="date" value={batchForm.data.expires_at} onChange={(e) => batchForm.setData('expires_at', e.target.value)} />
                                </Form.Item>
                            </Col>
                        </Row>
                    </div>
                    <div className="mt-5 flex justify-end gap-3">
                        <SecondaryButton onClick={() => setModal(null)}>Batal</SecondaryButton>
                        <PrimaryButton htmlType="submit" disabled={batchForm.processing}>Simpan Batch</PrimaryButton>
                    </div>
                </form>
            </Modal>

            <Modal show={modal === 'editBatch'} onClose={() => setModal(null)} maxWidth="md">
                <form onSubmit={submitEditBatch} className="p-6">
                    <h2 className="text-lg font-semibold text-[#1C1B1A]">Edit Batch {editBatch?.batch_no}</h2>
                    <div className="mt-4 space-y-3">
                        <Form.Item label={<span className="text-xs font-medium text-[#8A8580]">No. Batch *</span>}>
                            <Input value={editBatchForm.data.batch_no} onChange={(e) => editBatchForm.setData('batch_no', e.target.value)} />
                        </Form.Item>
                        <Form.Item label={<span className="text-xs font-medium text-[#8A8580]">Qty *</span>}>
                            <NumericInput decimalPlaces={2} value={editBatchForm.data.qty} onChange={(e) => editBatchForm.setData('qty', e.target.value)} />
                        </Form.Item>
                        <Form.Item label={<span className="text-xs font-medium text-[#8A8580]">Kadaluarsa</span>}>
                            <Input type="date" value={editBatchForm.data.expires_at} onChange={(e) => editBatchForm.setData('expires_at', e.target.value)} />
                        </Form.Item>
                    </div>
                    <div className="mt-5 flex justify-end gap-3">
                        <SecondaryButton onClick={() => setModal(null)}>Batal</SecondaryButton>
                        <PrimaryButton htmlType="submit" disabled={editBatchForm.processing}>Simpan</PrimaryButton>
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
