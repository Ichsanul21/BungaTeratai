import Badge from '@/Components/ui/Badge';
import PageHeader from '@/Components/ui/PageHeader';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { formatDateTime } from '@/lib/format';
import { type PageProps } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Table, Button, Input, Select, Row, Col } from 'antd';
import { History, Search } from 'lucide-react';
import { useState } from 'react';

export default function AuditTrailIndex({
    logs,
    filters,
    users,
    actions,
    entities,
}: PageProps<{
    logs: {
        data: Array<Record<string, any>>;
        from: number | null;
        to: number | null;
        total: number;
        current_page: number;
        last_page: number;
        prev_page_url: string | null;
        next_page_url: string | null;
    };
    filters: Record<string, any>;
    users: Array<{ id: number; name: string }>;
    actions: string[];
    entities: string[];
}>) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [userId, setUserId] = useState(filters.user_id ?? '');
    const [action, setAction] = useState(filters.action ?? '');
    const [entity, setEntity] = useState(filters.entity ?? '');
    const [from, setFrom] = useState(filters.from ?? '');
    const [to, setTo] = useState(filters.to ?? '');

    const apply = () => {
        router.get('/audit', {
            user_id: userId || undefined,
            action: action || undefined,
            entity: entity || undefined,
            from: from || undefined,
            to: to || undefined,
            search: search || undefined,
        }, { preserveState: true });
    };

    const columns = [
        {
            title: 'Waktu',
            dataIndex: 'timestamp',
            key: 'timestamp',
            render: (v: string) => <span className="whitespace-nowrap text-xs text-[#8A8580]">{formatDateTime(v)}</span>,
        },
        {
            title: 'Pengguna',
            dataIndex: 'user_name',
            key: 'user_name',
            render: (v: string) => <span className="font-medium text-[#1C1B1A]">{v}</span>,
        },
        {
            title: 'Aksi',
            dataIndex: 'action',
            key: 'action',
            render: (v: string) => <Badge tone="info">{v}</Badge>,
        },
        {
            title: 'Entity',
            key: 'entity',
            render: (_: any, r: any) => <span className="text-[#8A8580]">{r.entity_type}#{r.entity_id}</span>,
        },
        {
            title: 'Ringkasan',
            dataIndex: 'change_summary',
            key: 'change_summary',
            render: (v: string) => <span className="max-w-72 text-[#1C1B1A]">{v ?? '—'}</span>,
        },
        {
            title: 'Alasan',
            dataIndex: 'reason',
            key: 'reason',
            render: (v: string) => <span className="max-w-48 text-xs italic text-[#8A8580]">{v ?? '—'}</span>,
        },
        {
            title: 'IP',
            dataIndex: 'ip_address',
            key: 'ip_address',
            render: (v: string) => <span className="text-xs text-[#8A8580]">{v}</span>,
        },
    ];

    return (
        <AuthenticatedLayout>
            <Head title="Audit Trail" />

            <PageHeader
                title="Audit Trail"
                description="Riwayat perubahan data penting: waktu, pengguna, aksi, data sebelum–sesudah, dan alasan."
            />

            <div className="mb-5 rounded-xl border border-[#E7E1D9] bg-white p-4">
                <Row gutter={16} align="middle">
                    <Col flex="auto" style={{ minWidth: 200 }}>
                        <label className="text-xs font-medium text-[#8A8580]">Cari ringkasan</label>
                        <div className="relative mt-1">
                            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8A8580]" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="mis. Kapal, Invoice…"
                                prefix={<Search size={14} className="text-[#8A8580]" />}
                            />
                        </div>
                    </Col>
                    <Col>
                        <label className="text-xs font-medium text-[#8A8580]">Pengguna</label>
                        <Select
                            value={userId}
                            onChange={setUserId}
                            style={{ width: 150 }}
                            options={[{ value: '', label: 'Semua' }, ...users.map((u) => ({ value: u.id, label: u.name }))]}
                        />
                    </Col>
                    <Col>
                        <label className="text-xs font-medium text-[#8A8580]">Aksi</label>
                        <Select
                            value={action}
                            onChange={setAction}
                            style={{ width: 150 }}
                            options={[{ value: '', label: 'Semua' }, ...actions.map((a) => ({ value: a, label: a }))]}
                        />
                    </Col>
                    <Col>
                        <label className="text-xs font-medium text-[#8A8580]">Entity</label>
                        <Select
                            value={entity}
                            onChange={setEntity}
                            style={{ width: 150 }}
                            options={[{ value: '', label: 'Semua' }, ...entities.map((e) => ({ value: e, label: e }))]}
                        />
                    </Col>
                    <Col>
                        <label className="text-xs font-medium text-[#8A8580]">Dari</label>
                        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 block rounded-md border-[#E7E1D9] text-sm shadow-sm focus:border-[#C1121F] focus:ring-[#C1121F]" />
                    </Col>
                    <Col>
                        <label className="text-xs font-medium text-[#8A8580]">Sampai</label>
                        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 block rounded-md border-[#E7E1D9] text-sm shadow-sm focus:border-[#C1121F] focus:ring-[#C1121F]" />
                    </Col>
                    <Col>
                        <Button type="primary" onClick={apply} style={{ background: '#1C1B1A', borderColor: '#1C1B1A', marginTop: 20 }}>
                            Terapkan
                        </Button>
                    </Col>
                </Row>
            </div>

            <div className="overflow-x-auto rounded-xl border border-[#E7E1D9] bg-white shadow-sm">
                <Table
                    columns={columns}
                    dataSource={logs.data}
                    rowKey="id"
                    pagination={false}
                    size="small"
                    locale={{ emptyText: 'Tidak ada log cocok dengan filter.' }}
                />
            </div>

            {logs.last_page > 1 && (
                <div className="mt-4 flex items-center justify-between text-sm text-[#8A8580]">
                    <span>{logs.from}–{logs.to} dari {logs.total} log</span>
                    <div className="flex gap-2">
                        <Button
                            disabled={!logs.prev_page_url}
                            onClick={() => logs.prev_page_url && router.get(logs.prev_page_url, {}, { preserveState: true })}
                        >
                            ← Sebelumnya
                        </Button>
                        <span className="px-2 py-1.5">{logs.current_page} / {logs.last_page}</span>
                        <Button
                            disabled={!logs.next_page_url}
                            onClick={() => logs.next_page_url && router.get(logs.next_page_url, {}, { preserveState: true })}
                        >
                            Berikutnya →
                        </Button>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
