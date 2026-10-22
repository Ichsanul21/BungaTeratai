import Badge, { type BadgeTone } from '@/Components/ui/Badge';
import DataTable from '@/Components/ui/DataTable';
import Modal from '@/Components/Modal';
import PageHeader from '@/Components/ui/PageHeader';
import TabNav from '@/Components/ui/TabNav';
import StatCard from '@/Components/ui/StatCard';
import { VERIFICATION_STATUS_LABELS } from '@/Constants/navigation';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { classNames, daysUntil, formatNumber } from '@/lib/format';
import { type PageProps } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    AlertTriangle,
    CalendarClock,
    FileCheck2,
    FileStack,
    FileText,
    Plus,
    Search,
    ShieldCheck,
} from 'lucide-react';
import { FormEvent, useState } from 'react';

interface DocRow {
    id: number;
    document_name: string;
    document_number?: string;
    owner_type: string;
    owner_name: string;
    group_code?: string;
    category_name?: string;
    has_expiry: boolean;
    expiry_date?: string;
    verification_status: string;
    validity: string;
    days_left?: number | null;
    responsible_person?: string;
    updated_at?: string;
    source_type?: string;
    archive_number?: string;
    is_voided?: boolean;
    has_endorsement?: boolean;
    endorsement_next_date?: string;
}

const GROUPS = [
    { code: '', label: 'Semua' },
    { code: 'A', label: 'A · Perusahaan' },
    { code: 'B', label: 'B · Identitas Kapal' },
    { code: 'C', label: 'C · Sertifikat' },
    { code: 'D', label: 'D · Awak' },
    { code: 'E', label: 'E · Perjalanan' },
    { code: 'F', label: 'F · Operasional' },
    { code: 'G', label: 'G · Laporan' },
];

const VERIF_TONES: Record<string, BadgeTone> = {
    verified: 'success',
    under_review: 'info',
    revision_required: 'warning',
    rejected: 'danger',
    uploaded: 'info',
    draft: 'neutral',
    missing: 'danger',
    archived: 'neutral',
};

const VALIDITY_TONES: Record<string, BadgeTone> = {
    normal: 'success',
    expiring_soon: 'warning',
    expired: 'danger',
    no_expiry: 'neutral',
};

const VALIDITY_TEXT: Record<string, string> = {
    normal: 'Normal',
    expiring_soon: '≤30 Hari',
    expired: 'Kedaluwarsa',
    no_expiry: 'Tanpa Masa Berlaku',
};

export default function DocumentsIndex({
    documents,
    tab,
    filters,
    categories,
    vessels,
    groupCounts,
    validityCounts,
    canCreate,
}: PageProps<{
    tab?: string;
    documents: {
        data: DocRow[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        from: number | null;
        to: number | null;
        prev_page_url: string | null;
        next_page_url: string | null;
    };
    filters: Record<string, any>;
    categories: Array<{ code: string; name: string; group_code: string }>;
    vessels: Array<{ id: number; vessel_name: string; vessel_type: string }>;
    groupCounts: Record<string, number>;
    validityCounts: Record<string, number>;
    canCreate?: boolean;
}>) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [letterOpen, setLetterOpen] = useState(false);
    const letterForm = useForm({
        to: '', subject: '', body: '',
        date: new Date().toISOString().slice(0, 10),
        signer: '', signer_title: '',
    });
    const group = filters.group ?? '';

    const apply = (e: FormEvent) => {
        e.preventDefault();
        router.get('/dokumen', { ...filters, search }, { preserveState: true, replace: true });
    };

    const setFilter = (key: string, value: string) => {
        router.get(
            '/dokumen',
            { ...filters, [key]: value || undefined },
            { preserveState: true, replace: true },
        );
    };

    return (
        <AuthenticatedLayout>
            <Head title="Document Center" />

            <PageHeader
                title="Document Center"
                description="Seluruh dokumen perusahaan, kapal, awak, dan perjalanan. Dua status terpisah: verifikasi & masa berlaku."
                actions={
                    canCreate && (
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setLetterOpen(true)}
                                className="inline-flex items-center gap-2 rounded-lg border border-hairline bg-white px-3.5 py-2 text-sm font-semibold text-ink transition hover:border-primary/40"
                            >
                                Terbitkan Surat Umum
                            </button>
                            <Link
                                href="/dokumen/create"
                                className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover"
                            >
                                <Plus size={16} /> Unggah Dokumen
                            </Link>
                        </div>
                    )
                }
            />

            <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard
                    label="Normal"
                    value={validityCounts.normal ?? 0}
                    icon={ShieldCheck}
                    tone="success"
                />
                <StatCard
                    label="Mendekati Kedaluwarsa (≤30 hari)"
                    value={validityCounts.expiring_soon ?? 0}
                    icon={CalendarClock}
                    tone="warning"
                />
                <StatCard
                    label="Kedaluwarsa"
                    value={validityCounts.expired ?? 0}
                    icon={AlertTriangle}
                    tone="danger"
                />
                <StatCard
                    label="Tanpa Masa Berlaku"
                    value={validityCounts.no_expiry ?? 0}
                    icon={FileCheck2}
                />
            </div>

            <TabNav
                tabs={[
                    { key: 'arsip', label: 'Arsip Semua', icon: FileStack },
                    { key: 'terbitan', label: 'Terbitan', icon: FileCheck2 },
                    { key: 'unggahan', label: 'Unggahan', icon: FileText },
                    { key: 'expiring', label: 'Expiring & Endorsement', icon: CalendarClock },
                ]}
                active={tab ?? 'arsip'}
                onChange={(key) => router.get('/dokumen', { ...filters, tab: key }, { preserveState: true })}
            />

            <div className="mb-4 flex flex-wrap items-center gap-1.5">
                {GROUPS.map((g) => (
                    <button
                        key={g.code}
                        type="button"
                        onClick={() => setFilter('group', g.code)}
                        className={classNames(
                            'rounded-full border px-3 py-1.5 text-xs font-medium transition',
                            (group ?? '') === g.code
                                ? 'border-primary bg-primary text-white'
                                : 'border-hairline bg-white text-muted hover:border-primary/40 hover:text-ink',
                        )}
                    >
                        {g.label}
                        {g.code && groupCounts[g.code] !== undefined && (
                            <span className="ms-1.5 opacity-70">{groupCounts[g.code]}</span>
                        )}
                    </button>
                ))}
            </div>

            <form onSubmit={apply} className="mb-5 flex flex-wrap items-center gap-2">
                <div className="relative min-w-56 flex-1">
                    <Search
                        size={15}
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                    />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Cari nama / nomor dokumen…"
                        className="h-9 w-full rounded-lg border-hairline bg-white pl-9 pr-3 text-sm focus:border-primary focus:ring-primary"
                    />
                </div>
                <select
                    value={filters.owner_type ?? ''}
                    onChange={(e) => setFilter('owner_type', e.target.value)}
                    className="h-9 rounded-lg border-hairline bg-white px-2.5 text-sm focus:border-primary focus:ring-primary"
                >
                    <option value="">Semua Pemilik</option>
                    <option value="company">Perusahaan</option>
                    <option value="vessel">Kapal</option>
                </select>
                <select
                    value={filters.vessel_id ?? ''}
                    onChange={(e) => setFilter('vessel_id', e.target.value)}
                    className="h-9 rounded-lg border-hairline bg-white px-2.5 text-sm focus:border-primary focus:ring-primary"
                >
                    <option value="">Semua Kapal</option>
                    {vessels.map((v) => (
                        <option key={v.id} value={v.id}>
                            {v.vessel_name}
                        </option>
                    ))}
                </select>
                <select
                    value={filters.verification ?? ''}
                    onChange={(e) => setFilter('verification', e.target.value)}
                    className="h-9 rounded-lg border-hairline bg-white px-2.5 text-sm focus:border-primary focus:ring-primary"
                >
                    <option value="">Semua Verifikasi</option>
                    {Object.entries(VERIFICATION_STATUS_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>
                            {v}
                        </option>
                    ))}
                </select>
                <select
                    value={filters.validity ?? ''}
                    onChange={(e) => setFilter('validity', e.target.value)}
                    className="h-9 rounded-lg border-hairline bg-white px-2.5 text-sm focus:border-primary focus:ring-primary"
                >
                    <option value="">Semua Masa Berlaku</option>
                    <option value="normal">Normal</option>
                    <option value="expiring_soon">≤30 Hari</option>
                    <option value="expired">Kedaluwarsa</option>
                    <option value="no_expiry">Tanpa Masa Berlaku</option>
                </select>
                <button
                    type="submit"
                    className="h-9 rounded-lg bg-ink px-3.5 text-sm font-medium text-white transition hover:bg-black"
                >
                    Terapkan
                </button>
            </form>

            <DataTable<DocRow>
                columns={[
                    {
                        key: 'document_name',
                        label: 'Dokumen',
                        render: (row) => (
                            <div>
                                <Link
                                    href={`/dokumen/${row.id}`}
                                    className="font-medium text-ink hover:text-primary hover:underline"
                                >
                                    {row.document_name}
                                </Link>
                                <p className="text-xs text-muted">
                                    {row.category_name ?? '—'}
                                    {row.document_number ? ` · No. ${row.document_number}` : ''}
                                    {row.archive_number ? ` · ${row.archive_number}` : ''}
                                </p>
                                <div className="mt-1 flex flex-wrap gap-1">
                                    <Badge tone={row.source_type === 'terbitan' ? 'primary' : 'info'}>
                                        {row.source_type === 'terbitan' ? 'Terbitan' : 'Unggahan'}
                                    </Badge>
                                    {row.is_voided && <Badge tone="danger">VOID</Badge>}
                                    {row.has_endorsement && <Badge tone="warning">Endorsement</Badge>}
                                </div>
                            </div>
                        ),
                    },
                    {
                        key: 'owner_name',
                        label: 'Milik',
                        render: (row) => (
                            <div>
                                <p className="text-sm text-ink">{row.owner_name}</p>
                                <span className="rounded bg-appbg px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted">
                                    {row.owner_type === 'company'
                                        ? 'Perusahaan'
                                        : row.owner_type === 'crew'
                                          ? 'ABK'
                                          : 'Kapal'}
                                </span>
                            </div>
                        ),
                    },
                    {
                        key: 'expiry_date',
                        label: 'Masa Berlaku',
                        render: (row) => {
                            if (!row.has_expiry || !row.expiry_date) {
                                return <span className="text-xs text-muted">Tanpa masa berlaku</span>;
                            }
                            const d = row.days_left ?? null;
                            if (d === null) {
                                return (
                                    <div>
                                        <p className="text-sm text-ink">{row.expiry_date}</p>
                                        <p className="text-xs text-muted">sisa hari tidak tersedia</p>
                                    </div>
                                );
                            }
                            return (
                                <div>
                                    <p className="text-sm text-ink">{row.expiry_date}</p>
                                    <p
                                        className={classNames(
                                            'text-xs font-medium',
                                            d < 0
                                                ? 'text-primary'
                                                : d <= 30
                                                  ? 'text-warn'
                                                  : 'text-muted',
                                        )}
                                    >
                                        {d < 0
                                            ? `lewat ${Math.abs(d)} hari`
                                            : `${d} hari lagi`}
                                    </p>
                                </div>
                            );
                        },
                    },
                    {
                        key: 'validity',
                        label: 'Status Berlaku',
                        render: (row) => (
                            <Badge tone={VALIDITY_TONES[row.validity] ?? 'neutral'}>
                                {VALIDITY_TEXT[row.validity] ?? row.validity}
                            </Badge>
                        ),
                    },
                    {
                        key: 'verification_status',
                        label: 'Verifikasi',
                        render: (row) => (
                            <Badge tone={VERIF_TONES[row.verification_status] ?? 'neutral'}>
                                {VERIFICATION_STATUS_LABELS[row.verification_status] ??
                                    row.verification_status}
                            </Badge>
                        ),
                    },
                    {
                        key: 'id',
                        label: '',
                        className: 'text-right',
                        render: (row) => (
                            <Link
                                href={`/dokumen/${row.id}`}
                                className="text-sm font-medium text-primary hover:underline"
                            >
                                Detail →
                            </Link>
                        ),
                    },
                ]}
                rows={documents.data}
                emptyTitle="Tidak ada dokumen cocok"
                emptyDescription="Ubah filter atau unggah dokumen baru."
                emptyIcon={FileStack}
            />

            {documents.last_page > 1 && (
                <div className="mt-4 flex items-center justify-between text-sm text-muted">
                    <span>
                        {documents.from}–{documents.to} dari {documents.total} dokumen
                    </span>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            disabled={!documents.prev_page_url}
                            onClick={() =>
                                documents.prev_page_url && router.get(documents.prev_page_url, {}, { preserveState: true })
                            }
                            className="rounded-lg border border-hairline bg-white px-3 py-1.5 disabled:opacity-40"
                        >
                            ← Sebelumnya
                        </button>
                        <span className="px-2 py-1.5">
                            {documents.current_page} / {documents.last_page}
                        </span>
                        <button
                            type="button"
                            disabled={!documents.next_page_url}
                            onClick={() =>
                                documents.next_page_url && router.get(documents.next_page_url, {}, { preserveState: true })
                            }
                            className="rounded-lg border border-hairline bg-white px-3 py-1.5 disabled:opacity-40"
                        >
                            Berikutnya →
                        </button>
                    </div>
                </div>
            )}
            {/* Modal: Terbit Surat Umum */}
            <Modal show={letterOpen} onClose={() => setLetterOpen(false)} maxWidth="lg">
                <form
                    className="p-6"
                    onSubmit={(e) => {
                        e.preventDefault();
                        letterForm.post('/dokumen/surat-umum', { preserveScroll: true, onSuccess: () => { setLetterOpen(false); letterForm.reset(); } });
                    }}
                >
                    <h2 className="text-lg font-semibold text-ink">Terbitkan Surat Umum</h2>
                    <p className="text-xs text-muted">Nomor surat dibuat otomatis ({'{seq}/BT/{bulan romawi}/{tahun}'}) — PDF kop PT Bunga Teratai diarsipkan otomatis.</p>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                            <label className="text-xs font-medium text-muted">Kepada Yth. *</label>
                            <input value={letterForm.data.to} onChange={(e) => letterForm.setData('to', e.target.value)} placeholder="mis. PT Sinar Laut Maritim" className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" />
                        </div>
                        <div className="col-span-2">
                            <label className="text-xs font-medium text-muted">Perihal / Subjek *</label>
                            <input value={letterForm.data.subject} onChange={(e) => letterForm.setData('subject', e.target.value)} placeholder="mis. Surat Perintah Bongkar Muat" className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-muted">Tanggal</label>
                            <input type="date" value={letterForm.data.date} onChange={(e) => letterForm.setData('date', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-muted">Penandatangan</label>
                            <input value={letterForm.data.signer} onChange={(e) => letterForm.setData('signer', e.target.value)} placeholder="H. Syarif" className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" />
                        </div>
                        <div className="col-span-2">
                            <label className="text-xs font-medium text-muted">Isi Surat *</label>
                            <textarea rows={6} value={letterForm.data.body} onChange={(e) => letterForm.setData('body', e.target.value)} placeholder="Dengan hormat, bersama ini kami menyampaikan ..." className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" />
                            {letterForm.errors.body && <p className="mt-1 text-xs text-primary">{letterForm.errors.body}</p>}
                        </div>
                    </div>
                    <div className="mt-5 flex justify-end gap-3">
                        <button type="button" onClick={() => setLetterOpen(false)} className="rounded-lg border border-hairline bg-white px-4 py-2 text-sm font-medium text-ink">Batal</button>
                        <button type="submit" disabled={letterForm.processing} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50">
                            {letterForm.processing ? 'Menerbitkan…' : 'Terbitkan & Cetak PDF'}
                        </button>
                    </div>
                </form>
            </Modal>
        </AuthenticatedLayout>
    );
}
