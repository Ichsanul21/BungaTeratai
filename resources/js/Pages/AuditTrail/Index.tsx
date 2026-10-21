import Badge from '@/Components/ui/Badge';
import PageHeader from '@/Components/ui/PageHeader';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { formatDateTime } from '@/lib/format';
import { type PageProps } from '@/types';
import { Head, router } from '@inertiajs/react';
import { History, Search } from 'lucide-react';
import { FormEvent } from 'react';

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
    const apply = (e: FormEvent) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget as HTMLFormElement);
        router.get('/audit', {
            user_id: fd.get('user_id') || undefined,
            action: fd.get('action') || undefined,
            entity: fd.get('entity') || undefined,
            from: fd.get('from') || undefined,
            to: fd.get('to') || undefined,
            search: fd.get('search') || undefined,
        }, { preserveState: true });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Audit Trail" />

            <PageHeader
                title="Audit Trail"
                description="Riwayat perubahan data penting: waktu, pengguna, aksi, data sebelum–sesudah, dan alasan."
            />

            <form onSubmit={apply} className="mb-5 flex flex-wrap items-end gap-3 rounded-xl border border-hairline bg-white p-4">
                <div className="min-w-48 flex-1">
                    <label className="text-xs font-medium text-muted">Cari ringkasan</label>
                    <div className="relative mt-1">
                        <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
                        <input name="search" defaultValue={filters.search ?? ''} placeholder="mis. Kapal, Invoice…" className="h-9 w-full rounded-md border-gray-300 pl-8 text-sm shadow-sm focus:border-primary focus:ring-primary" />
                    </div>
                </div>
                <div>
                    <label className="text-xs font-medium text-muted">Pengguna</label>
                    <select name="user_id" defaultValue={filters.user_id ?? ''} className="mt-1 block rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary">
                        <option value="">Semua</option>
                        {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-xs font-medium text-muted">Aksi</label>
                    <select name="action" defaultValue={filters.action ?? ''} className="mt-1 block rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary">
                        <option value="">Semua</option>
                        {actions.map((a) => <option key={a} value={a}>{a}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-xs font-medium text-muted">Entity</label>
                    <select name="entity" defaultValue={filters.entity ?? ''} className="mt-1 block rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary">
                        <option value="">Semua</option>
                        {entities.map((e) => <option key={e} value={e}>{e}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-xs font-medium text-muted">Dari</label>
                    <input type="date" name="from" defaultValue={filters.from ?? ''} className="mt-1 block rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary" />
                </div>
                <div>
                    <label className="text-xs font-medium text-muted">Sampai</label>
                    <input type="date" name="to" defaultValue={filters.to ?? ''} className="mt-1 block rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary" />
                </div>
                <button type="submit" className="rounded-lg bg-ink px-3.5 py-2 text-sm font-medium text-white hover:bg-black">
                    Terapkan
                </button>
            </form>

            <div className="overflow-x-auto rounded-xl border border-hairline bg-white shadow-sm">
                <table className="min-w-full text-sm">
                    <thead className="bg-appbg text-left text-xs uppercase tracking-wide text-muted">
                        <tr>{['Waktu', 'Pengguna', 'Aksi', 'Entity', 'Ringkasan', 'Alasan', 'IP'].map((h) => <th key={h} className="px-3 py-2.5">{h}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y divide-hairline">
                        {logs.data.length === 0 ? (
                            <tr><td colSpan={7} className="px-4 py-10 text-center text-muted">Tidak ada log cocok dengan filter.</td></tr>
                        ) : (
                            logs.data.map((a) => (
                                <tr key={a.id} className="hover:bg-appbg align-top">
                                    <td className="whitespace-nowrap px-3 py-2 text-xs text-muted">{formatDateTime(a.timestamp)}</td>
                                    <td className="px-3 py-2 font-medium text-ink">{a.user_name}</td>
                                    <td className="px-3 py-2"><Badge tone="info">{a.action}</Badge></td>
                                    <td className="px-3 py-2 text-muted">{a.entity_type}#{a.entity_id}</td>
                                    <td className="max-w-72 px-3 py-2 text-ink">{a.change_summary ?? '—'}</td>
                                    <td className="max-w-48 px-3 py-2 text-xs italic text-muted">{a.reason ?? '—'}</td>
                                    <td className="px-3 py-2 text-xs text-muted">{a.ip_address}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {logs.last_page > 1 && (
                <div className="mt-4 flex items-center justify-between text-sm text-muted">
                    <span>{logs.from}–{logs.to} dari {logs.total} log</span>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            disabled={!logs.prev_page_url}
                            onClick={() => logs.prev_page_url && router.get(logs.prev_page_url, {}, { preserveState: true })}
                            className="rounded-lg border border-hairline bg-white px-3 py-1.5 disabled:opacity-40"
                        >
                            ← Sebelumnya
                        </button>
                        <span className="px-2 py-1.5">{logs.current_page} / {logs.last_page}</span>
                        <button
                            type="button"
                            disabled={!logs.next_page_url}
                            onClick={() => logs.next_page_url && router.get(logs.next_page_url, {}, { preserveState: true })}
                            className="rounded-lg border border-hairline bg-white px-3 py-1.5 disabled:opacity-40"
                        >
                            Berikutnya →
                        </button>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
