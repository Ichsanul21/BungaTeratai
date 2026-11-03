import Badge from '@/Components/ui/Badge';
import PageHeader from '@/Components/ui/PageHeader';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { formatDateTime } from '@/lib/format';
import { type PageProps } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Table, Button, Input, Select, Row, Col, Drawer } from 'antd';
import { ArrowRight, History, Search } from 'lucide-react';
import { useMemo, useState } from 'react';

/** Nilai audit bisa berupa array/objek (cast model) atau string JSON. */
function asRecord(value: unknown): Record<string, any> | null {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            return parsed && typeof parsed === 'object' ? parsed : null;
        } catch {
            return null;
        }
    }
    return typeof value === 'object' ? (value as Record<string, any>) : null;
}

function display(value: unknown): string {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    return String(value);
}

const ACTION_TONES: Record<string, 'success' | 'info' | 'warning' | 'danger' | 'neutral'> = {
    created: 'success',
    updated: 'info',
    deleted: 'danger',
    voided: 'danger',
    verified: 'success',
    approved: 'success',
};

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
    const [detail, setDetail] = useState<Record<string, any> | null>(null);

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

    const changes = useMemo(() => {
        if (!detail) return [];
        const before = asRecord(detail.before);
        const after = asRecord(detail.after);

        if (!before && !after) return [];

        const keys = Array.from(
            new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]),
        ).sort();

        return keys
            .map((key) => ({
                key,
                before: before ? before[key] : undefined,
                after: after ? after[key] : undefined,
                changed: display(before ? before[key] : undefined) !== display(after ? after[key] : undefined),
            }))
            .filter((row) => row.changed);
    }, [detail]);

    const columns = [
        {
            title: 'Waktu',
            dataIndex: 'timestamp',
            key: 'timestamp',
            render: (v: string) => <span className="whitespace-nowrap text-xs text-[#5B6474]">{formatDateTime(v)}</span>,
        },
        {
            title: 'Pengguna',
            dataIndex: 'user_name',
            key: 'user_name',
            render: (v: string) => <span className="font-medium text-[#111827]">{v}</span>,
        },
        {
            title: 'Aksi',
            dataIndex: 'action',
            key: 'action',
            render: (v: string) => <Badge tone={ACTION_TONES[v] ?? 'info'}>{v}</Badge>,
        },
        {
            title: 'Entity',
            key: 'entity',
            render: (_: any, r: any) => <span className="text-[#5B6474]">{r.entity_type}#{r.entity_id}</span>,
        },
        {
            title: 'Ringkasan',
            dataIndex: 'change_summary',
            key: 'change_summary',
            render: (v: string) => <span className="max-w-72 text-[#111827]">{v ?? '—'}</span>,
        },
        {
            title: 'Alasan',
            dataIndex: 'reason',
            key: 'reason',
            render: (v: string) => <span className="max-w-48 text-xs italic text-[#5B6474]">{v ?? '—'}</span>,
        },
        {
            title: 'IP',
            dataIndex: 'ip_address',
            key: 'ip_address',
            render: (v: string) => <span className="text-xs text-[#5B6474]">{v}</span>,
        },
        {
            title: '',
            key: 'detail',
            align: 'right' as const,
            render: (_: any, r: any) => (
                <button
                    type="button"
                    onClick={(event) => {
                        event.stopPropagation();
                        setDetail(r);
                    }}
                    className="whitespace-nowrap text-xs font-semibold text-[#BA0C2F] hover:underline"
                >
                    Detail →
                </button>
            ),
        },
    ];

    return (
        <AuthenticatedLayout>
            <Head title="Audit Trail" />

            <PageHeader
                title="Audit Trail"
                description="Riwayat perubahan data penting: waktu, pengguna, aksi, data sebelum–sesudah, dan alasan."
                metrics={[
                    { label: 'Total Log', value: logs.total, tone: 'primary', sub: 'seluruh periode' },
                    { label: 'Pengguna', value: users.length, sub: 'pernah melakukan aksi' },
                    { label: 'Jenis Aksi', value: actions.length, sub: 'create · update · delete' },
                    { label: 'Entity', value: entities.length, sub: 'modul tercatat' },
                ]}
            />

            <div className="rounded-2xl border border-[#E3E8F0] bg-white shadow-[0_1px_2px_rgba(17,24,39,0.04)]">
            <div className="border-b border-[#E3E8F0] p-4">
                <Row gutter={16} align="middle">
                    <Col flex="auto" style={{ minWidth: 200 }}>
                        <label className="text-xs font-medium text-[#5B6474]">Cari ringkasan</label>
                        <div className="relative mt-1">
                            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5B6474]" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onPressEnter={apply}
                                placeholder="mis. Kapal, Invoice…"
                                prefix={<Search size={14} className="text-[#5B6474]" />}
                            />
                        </div>
                    </Col>
                    <Col>
                        <label className="text-xs font-medium text-[#5B6474]">Pengguna</label>
                        <Select
                            value={userId}
                            onChange={setUserId}
                            style={{ width: 150 }}
                            options={[{ value: '', label: 'Semua' }, ...users.map((u) => ({ value: u.id, label: u.name }))]}
                        />
                    </Col>
                    <Col>
                        <label className="text-xs font-medium text-[#5B6474]">Aksi</label>
                        <Select
                            value={action}
                            onChange={setAction}
                            style={{ width: 150 }}
                            options={[{ value: '', label: 'Semua' }, ...actions.map((a) => ({ value: a, label: a }))]}
                        />
                    </Col>
                    <Col>
                        <label className="text-xs font-medium text-[#5B6474]">Entity</label>
                        <Select
                            value={entity}
                            onChange={setEntity}
                            style={{ width: 150 }}
                            options={[{ value: '', label: 'Semua' }, ...entities.map((e) => ({ value: e, label: e }))]}
                        />
                    </Col>
                    <Col>
                        <label className="text-xs font-medium text-[#5B6474]">Dari</label>
                        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 block rounded-md border-[#E3E8F0] text-sm shadow-sm focus:border-[#BA0C2F] focus:ring-[#BA0C2F]" />
                    </Col>
                    <Col>
                        <label className="text-xs font-medium text-[#5B6474]">Sampai</label>
                        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 block rounded-md border-[#E3E8F0] text-sm shadow-sm focus:border-[#BA0C2F] focus:ring-[#BA0C2F]" />
                    </Col>
                    <Col>
                        <Button type="primary" onClick={apply} style={{ marginTop: 20 }}>
                            Terapkan
                        </Button>
                    </Col>
                </Row>
            </div>

            <div className="overflow-x-auto">
                <Table
                    columns={columns}
                    dataSource={logs.data}
                    rowKey="id"
                    pagination={false}
                    size="small"
                    scroll={{ x: 900 }}
                    locale={{ emptyText: 'Tidak ada log cocok dengan filter.' }}
                    onRow={(record) => ({
                        onClick: () => setDetail(record),
                        style: { cursor: 'pointer' },
                    })}
                />
            </div>
            </div>

            {logs.last_page > 1 && (
                <div className="mt-4 flex items-center justify-between text-sm text-[#5B6474]">
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

            <Drawer
                open={detail !== null}
                onClose={() => setDetail(null)}
                width="min(720px, 100vw)"
                title={
                    <div className="flex items-center gap-2">
                        <History size={16} className="text-[#BA0C2F]" />
                        <span className="text-[15px] font-semibold text-[#111827]">Detail Perubahan</span>
                    </div>
                }
            >
                {detail && (
                    <div className="space-y-5">
                        <div className="rounded-xl border border-[#E3E8F0] bg-[#F5F7FA] p-4">
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge tone={ACTION_TONES[detail.action] ?? 'info'}>{detail.action}</Badge>
                                <span className="font-mono text-xs text-[#5B6474]">
                                    {detail.entity_type}#{detail.entity_id}
                                </span>
                                <span className="ms-auto font-mono text-xs text-[#5B6474]">
                                    {formatDateTime(detail.timestamp)}
                                </span>
                            </div>
                            <p className="mt-2 text-sm font-medium text-[#111827]">{detail.change_summary ?? '—'}</p>
                            <div className="mt-2 grid grid-cols-1 gap-1.5 text-xs text-[#5B6474] sm:grid-cols-2">
                                <span>Pengguna: <span className="font-medium text-[#111827]">{detail.user_name}</span></span>
                                <span>IP: <span className="font-mono text-[#111827]">{detail.ip_address ?? '—'}</span></span>
                                <span className="sm:col-span-2">Alasan: <span className="italic">{detail.reason ?? '—'}</span></span>
                            </div>
                        </div>

                        {changes.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-[#E3E8F0] bg-white p-6 text-center text-sm text-[#5B6474]">
                                Log ini tidak menyimpan rincian kolom sebelum–sesudah.
                            </div>
                        ) : (
                            <div className="overflow-hidden rounded-xl border border-[#E3E8F0]">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="border-b border-[#E3E8F0] bg-[#F5F7FA] text-[10px] uppercase tracking-[0.12em] text-[#5B6474]">
                                            <th className="px-3 py-2 font-medium">Kolom</th>
                                            <th className="px-3 py-2 font-medium">Sebelum</th>
                                            <th className="w-6 px-1 py-2" />
                                            <th className="px-3 py-2 font-medium">Sesudah</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#E3E8F0]">
                                        {changes.map((row) => (
                                            <tr key={row.key} className="align-top">
                                                <td className="px-3 py-2 font-mono text-[11px] text-[#111827]">{row.key}</td>
                                                <td className="px-3 py-2">
                                                    <pre className="max-h-32 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] text-[#BA0C2F]">
                                                        {display(row.before)}
                                                    </pre>
                                                </td>
                                                <td className="px-1 py-2 text-[#5B6474]">
                                                    <ArrowRight size={12} />
                                                </td>
                                                <td className="px-3 py-2">
                                                    <pre className="max-h-32 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] text-[#15803D]">
                                                        {display(row.after)}
                                                    </pre>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </Drawer>
        </AuthenticatedLayout>
    );
}
