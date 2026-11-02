import Badge, { type BadgeTone } from '@/Components/ui/Badge';
import Card from '@/Components/ui/Card';
import Modal from '@/Components/Modal';
import PageHeader from '@/Components/ui/PageHeader';
import TabNav from '@/Components/ui/TabNav';
import { VERIFICATION_STATUS_LABELS } from '@/Constants/navigation';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { formatNumber } from '@/lib/format';
import { type PageProps } from '@/types';
import {
    Button,
    Col,
    Input,
    Row,
    Select,
    Table,
    Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    CalendarClock,
    FileCheck2,
    FileStack,
    FileText,
    Plus,
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

const GROUPS: Array<{ code: string; label: string }> = [
    { code: '', label: 'Semua' },
    { code: 'A', label: 'Perusahaan' },
    { code: 'B', label: 'Identitas Vessel' },
    { code: 'C', label: 'Sertifikat' },
    { code: 'D', label: 'Awak' },
    { code: 'E', label: 'Perjalanan' },
    { code: 'F', label: 'Operasional' },
    { code: 'G', label: 'Laporan' },
];

const TABS = [
    { key: 'arsip', label: 'Arsip Semua', icon: FileStack },
    { key: 'terbitan', label: 'Terbitan', icon: FileCheck2 },
    { key: 'unggahan', label: 'Unggahan', icon: FileText },
    { key: 'expiring', label: 'Expiring & Endorsement', icon: CalendarClock },
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

const VALIDITY_TILES: Array<{ key: string; label: string; color: string }> = [
    { key: 'normal', label: 'Normal', color: '#2F8F68' },
    { key: 'expiring_soon', label: 'Segera Berakhir', color: '#D99A2B' },
    { key: 'expired', label: 'Kedaluwarsa', color: '#C1121F' },
    { key: 'no_expiry', label: 'Tanpa Masa Berlaku', color: '#8A8580' },
];

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
        to: '',
        subject: '',
        body: '',
        date: new Date().toISOString().slice(0, 10),
        signer: '',
        signer_title: '',
    });

    const group = filters.group ?? '';
    const activeTab = tab ?? 'arsip';
    const activeValidity = filters.validity ?? '';

    const totalAll = VALIDITY_TILES.reduce((s, t) => s + (validityCounts[t.key] ?? 0), 0);

    const activeFilterCount = [
        'search',
        'group',
        'owner_type',
        'vessel_id',
        'verification',
        'validity',
    ].filter((k) => (filters[k] ?? '') !== '').length;

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

    const toggleValidity = (key: string) => {
        setFilter('validity', activeValidity === key ? '' : key);
    };

    const resetFilters = () => {
        setSearch('');
        router.get(
            '/dokumen',
            activeTab !== 'arsip' ? { tab: activeTab } : {},
            { preserveState: true, replace: true },
        );
    };

    const columns: ColumnsType<DocRow> = [
        {
            title: 'Dokumen',
            key: 'document',
            width: '35%',
            render: (_, row) => {
                const railColor =
                    row.validity === 'expired'
                        ? '#C1121F'
                        : row.validity === 'expiring_soon'
                          ? '#D99A2B'
                          : 'transparent';
                return (
                    <div className="flex items-start gap-3">
                        {railColor !== 'transparent' && (
                            <div
                                style={{
                                    width: 3,
                                    minHeight: 48,
                                    borderRadius: 999,
                                    background: railColor,
                                    flexShrink: 0,
                                }}
                            />
                        )}
                        <div className="min-w-0">
                            <Link
                                href={`/dokumen/${row.id}`}
                                className="text-sm font-semibold text-[#1C1B1A] hover:text-[#C1121F]"
                            >
                                {row.document_name}
                            </Link>
                            <p className="mt-0.5 text-xs text-[#8A8580]">
                                {row.category_name ?? 'Tanpa kategori'}
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
                    </div>
                );
            },
        },
        {
            title: 'Milik',
            key: 'owner',
            width: '15%',
            render: (_, row) => (
                <div>
                    <p className="text-sm text-[#1C1B1A]">{row.owner_name}</p>
                    <Tag
                        style={{
                            background: '#FAF7F2',
                            borderColor: '#E7E1D9',
                            color: '#8A8580',
                            fontSize: 10,
                            fontFamily: 'monospace',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                        }}
                    >
                        {row.owner_type === 'company'
                            ? 'Perusahaan'
                            : row.owner_type === 'crew'
                              ? 'ABK'
                              : 'Vessel'}
                    </Tag>
                </div>
            ),
        },
        {
            title: 'Masa Berlaku',
            key: 'expiry',
            width: '18%',
            render: (_, row) => {
                const d = row.days_left ?? null;
                if (!row.has_expiry || !row.expiry_date) {
                    return <span className="text-xs text-[#8A8580]">Tanpa masa berlaku</span>;
                }
                if (d === null) {
                    return (
                        <div>
                            <p className="font-mono text-[13px] text-[#1C1B1A]">
                                {row.expiry_date}
                            </p>
                            <p className="mt-0.5 text-xs text-[#8A8580]">sisa hari tidak tersedia</p>
                        </div>
                    );
                }
                const textColor = d < 0 ? '#C1121F' : d <= 30 ? '#D99A2B' : '#8A8580';
                return (
                    <div>
                        <p className="font-mono text-[13px] text-[#1C1B1A]">{row.expiry_date}</p>
                        <p className="mt-0.5 text-xs font-medium" style={{ color: textColor }}>
                            {d < 0 ? `lewat ${Math.abs(d)} hari` : `${d} hari lagi`}
                        </p>
                    </div>
                );
            },
        },
        {
            title: 'Status Berlaku',
            key: 'validity',
            width: '15%',
            render: (_, row) => (
                <Badge tone={VALIDITY_TONES[row.validity] ?? 'neutral'}>
                    {VALIDITY_TEXT[row.validity] ?? row.validity}
                </Badge>
            ),
        },
        {
            title: 'Verifikasi',
            key: 'verification',
            width: '12%',
            render: (_, row) => (
                <Badge tone={VERIF_TONES[row.verification_status] ?? 'neutral'}>
                    {VERIFICATION_STATUS_LABELS[row.verification_status] ??
                        row.verification_status}
                </Badge>
            ),
        },
        {
            title: '',
            key: 'actions',
            width: '5%',
            align: 'right',
            render: (_, row) => (
                <Link href={`/dokumen/${row.id}`}>
                    <Button size="small" type="link">
                        Detail
                    </Button>
                </Link>
            ),
        },
    ];

    return (
        <AuthenticatedLayout>
            <Head title="Document Center" />

            <div
                className="mb-6 overflow-hidden rounded-2xl border border-[#E7E1D9] bg-white shadow-[0_1px_3px_rgba(28,27,26,0.04),0_8px_24px_-8px_rgba(28,27,26,0.06)]"
            >
                <div className="p-6 lg:p-7">
                    <p
                        className="font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-[#8A8580]"
                    >
                        <span
                            className="me-2 inline-block h-2 w-2 rounded-full"
                            style={{ background: '#D4A96A' }}
                        />
                        Register Dokumen
                    </p>
                    <h1 className="mt-3 text-2xl font-semibold tracking-tight text-[#1C1B1A] sm:text-3xl">
                        Document Center.
                    </h1>
                    <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#8A8580]">
                        Seluruh dokumen perusahaan, kapal, awak, dan perjalanan dalam satu register
                        terpadu. Status verifikasi dan masa berlaku disajikan terpisah agar keduanya
                        tidak tertukar.
                    </p>

                    {canCreate && (
                        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                            <Button
                                onClick={() => setLetterOpen(true)}
                                icon={<FileText size={15} />}
                            >
                                Terbitkan Surat Umum
                            </Button>
                            <Link href="/dokumen/create">
                                <Button
                                    type="primary"
                                    icon={<Plus size={16} />}
                                >
                                    Unggah Dokumen
                                </Button>
                            </Link>
                        </div>
                    )}
                </div>

                <div
                    className="grid grid-cols-2 gap-3 border-t border-[#E7E1D9] p-6 pt-5 sm:gap-4 lg:grid-cols-5 lg:p-7 lg:pt-6"
                >
                    <div
                        className="col-span-2 flex min-w-0 flex-col rounded-xl border border-[#D4A96A]/30 bg-[#FFF8F0] p-4 lg:col-span-1"
                    >
                        <p
                            className="flex items-center gap-1.5 truncate font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-[#8A8580]"
                        >
                            <span
                                className="h-1.5 w-1.5 shrink-0 rounded-full"
                                style={{ background: '#D4A96A' }}
                            />
                            Total Dokumen
                        </p>
                        <div className="mt-2 flex flex-1 flex-col items-center justify-center">
                            <p
                                className="text-4xl font-semibold leading-tight tabular-nums tracking-tight text-[#C1121F]"
                            >
                                {formatNumber(totalAll)}
                            </p>
                            <p
                                className="mt-1 font-mono text-sm uppercase tracking-[0.14em] text-[#8A8580]"
                            >
                                Total
                            </p>
                        </div>
                    </div>
                    {VALIDITY_TILES.map((t) => {
                        const count = validityCounts[t.key] ?? 0;
                        const pct = totalAll > 0 ? Math.round((count / totalAll) * 100) : 0;
                        const isActive = activeValidity === t.key;
                        return (
                            <button
                                key={t.key}
                                type="button"
                                onClick={() => toggleValidity(t.key)}
                                className="flex min-w-0 flex-col rounded-xl border p-4 text-left transition-colors"
                                style={{
                                    background: isActive ? '#FFF8F0' : '#FAF7F2',
                                    borderColor: isActive ? '#C1121F' : '#E7E1D9',
                                }}
                            >
                                <p
                                    className="flex items-center gap-1.5 truncate font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-[#8A8580]"
                                >
                                    <span
                                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                                        style={{ background: t.color }}
                                    />
                                    {t.label}
                                </p>
                                <div className="mt-2 flex flex-1 flex-col justify-center">
                                    <p className="text-4xl font-semibold leading-tight tabular-nums tracking-tight text-[#1C1B1A]">
                                        {formatNumber(count)}
                                    </p>
                                    <p className="mt-1 truncate text-sm text-[#8A8580]">
                                        {isActive ? 'Filter aktif · klik untuk lepas' : `${pct}% dari total`}
                                    </p>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            <TabNav
                tabs={TABS.map((t) => ({ key: t.key, label: t.label, icon: t.icon }))}
                active={activeTab}
                onChange={(key) =>
                    router.get('/dokumen', { ...filters, tab: key }, { preserveState: true })
                }
            />

            <Card className="mb-5">
                <div className="flex flex-wrap items-center gap-1.5">
                    <span className="me-1 hidden font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-[#8A8580] sm:inline">
                        Kelompok
                    </span>
                    {GROUPS.map((g) => {
                        const isActive = (group ?? '') === g.code;
                        return (
                            <Button
                                key={g.code}
                                size="small"
                                type={isActive ? 'primary' : 'default'}
                                onClick={() => setFilter('group', g.code)}
                                style={
                                    !isActive
                                        ? { borderColor: '#E7E1D9', color: '#8A8580' }
                                        : undefined
                                }
                            >
                                {g.code && (
                                    <span
                                        className="me-1 font-mono text-[11px] font-semibold"
                                        style={{ color: isActive ? '#D4A96A' : 'rgba(193,18,31,0.6)' }}
                                    >
                                        {g.code}
                                    </span>
                                )}
                                {g.label}
                                {g.code && groupCounts[g.code] !== undefined && (
                                    <span
                                        className="ms-1 rounded-full px-1.5 py-0.5 font-mono text-[10px] font-medium"
                                        style={{
                                            background: isActive ? 'rgba(255,255,255,0.2)' : '#FAF7F2',
                                            color: isActive ? '#fff' : '#8A8580',
                                        }}
                                    >
                                        {formatNumber(groupCounts[g.code])}
                                    </span>
                                )}
                            </Button>
                        );
                    })}
                    {activeFilterCount > 0 && (
                        <span className="ms-auto inline-flex items-center gap-2 whitespace-nowrap text-xs text-[#8A8580]">
                            <span className="font-mono">{activeFilterCount} filter aktif</span>
                            <Button type="link" size="small" onClick={resetFilters} className="p-0">
                                Reset
                            </Button>
                        </span>
                    )}
                </div>
                <div className="my-3.5 h-px" style={{ background: 'rgba(231,225,217,0.6)' }} />
                <form onSubmit={apply} className="flex flex-wrap items-center gap-2">
                    <Input.Search
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Cari nama / nomor dokumen…"
                        style={{ minWidth: 220, flex: 1 }}
                        onSearch={() => apply({ preventDefault: () => {} } as FormEvent)}
                        enterButton="Terapkan"
                    />
                    <Select
                        value={filters.owner_type ?? ''}
                        onChange={(v) => setFilter('owner_type', v)}
                        style={{ width: 144 }}
                        options={[
                            { value: '', label: 'Semua Pemilik' },
                            { value: 'company', label: 'Perusahaan' },
                            { value: 'vessel', label: 'Vessel' },
                        ]}
                    />
                    <Select
                        value={filters.vessel_id ?? ''}
                        onChange={(v) => setFilter('vessel_id', v)}
                        style={{ width: 176 }}
                        options={[
                            { value: '', label: 'Semua Vessel' },
                            ...vessels.map((v) => ({
                                value: String(v.id),
                                label: v.vessel_name,
                            })),
                        ]}
                    />
                    <Select
                        value={filters.verification ?? ''}
                        onChange={(v) => setFilter('verification', v)}
                        style={{ width: 176 }}
                        options={[
                            { value: '', label: 'Semua Verifikasi' },
                            ...Object.entries(VERIFICATION_STATUS_LABELS).map(([k, v]) => ({
                                value: k,
                                label: v,
                            })),
                        ]}
                    />
                    <Select
                        value={filters.validity ?? ''}
                        onChange={(v) => setFilter('validity', v)}
                        style={{ width: 160 }}
                        options={[
                            { value: '', label: 'Semua Masa Berlaku' },
                            { value: 'normal', label: 'Normal' },
                            { value: 'expiring_soon', label: '≤30 Hari' },
                            { value: 'expired', label: 'Kedaluwarsa' },
                            { value: 'no_expiry', label: 'Tanpa Masa Berlaku' },
                        ]}
                    />
                </form>
            </Card>

            <section>
                {documents.data.length > 0 && (
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-[#8A8580]">
                            {formatNumber(documents.total)} dokumen ditemukan
                            {documents.last_page > 1 &&
                                ` · halaman ${documents.current_page} / ${documents.last_page}`}
                        </p>
                        <p className="flex items-center gap-3 text-[11px] text-[#8A8580]">
                            <span className="flex items-center gap-1.5">
                                <span
                                    aria-hidden="true"
                                    className="h-3 w-[3px] rounded-full"
                                    style={{ background: '#D99A2B' }}
                                />
                                ≤ 30 hari
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span
                                    aria-hidden="true"
                                    className="h-3 w-[3px] rounded-full"
                                    style={{ background: '#C1121F' }}
                                />
                                kedaluwarsa
                            </span>
                        </p>
                    </div>
                )}

                {documents.data.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-[#E7E1D9] bg-[#FAF7F2]/40 px-6 py-16 text-center">
                        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white text-[#8A8580] shadow-sm ring-1 ring-inset ring-[#E7E1D9]">
                            <FileStack size={20} />
                        </span>
                        <p className="mt-4 text-sm font-semibold text-[#1C1B1A]">
                            Tidak ada dokumen cocok
                        </p>
                        <p className="mt-1 text-xs text-[#8A8580]">
                            Ubah filter atau unggah dokumen baru.
                        </p>
                        {canCreate && (
                            <Link href="/dokumen/create">
                                <Button type="primary" className="mt-5" icon={<Plus size={15} />}>
                                    Unggah Dokumen
                                </Button>
                            </Link>
                        )}
                    </div>
                ) : (
                    <Table
                        columns={columns}
                        dataSource={documents.data}
                        rowKey="id"
                        pagination={false}
                        scroll={{ x: 800 }}
                        className="rounded-2xl border border-[#E7E1D9] bg-white shadow-[0_20px_44px_-32px_rgba(28,27,26,0.4)]"
                        size="middle"
                        onRow={(record) => ({
                            id: `record-doc-${record.id}`,
                        })}
                    />
                )}

                {documents.last_page > 1 && (
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs text-[#8A8580]">
                            Menampilkan{' '}
                            <span className="font-mono font-semibold text-[#1C1B1A]">
                                {documents.from}–{documents.to}
                            </span>{' '}
                            dari{' '}
                            <span className="font-mono font-semibold text-[#1C1B1A]">
                                {formatNumber(documents.total)}
                            </span>{' '}
                            dokumen
                        </p>
                        <div className="flex items-center gap-2">
                            <Button
                                disabled={!documents.prev_page_url}
                                onClick={() =>
                                    documents.prev_page_url &&
                                    router.get(documents.prev_page_url, {}, { preserveState: true })
                                }
                            >
                                Sebelumnya
                            </Button>
                            <span className="rounded-lg bg-[#FAF7F2] px-3 py-1.5 font-mono text-xs font-medium text-[#8A8580]">
                                {documents.current_page} / {documents.last_page}
                            </span>
                            <Button
                                disabled={!documents.next_page_url}
                                onClick={() =>
                                    documents.next_page_url &&
                                    router.get(documents.next_page_url, {}, { preserveState: true })
                                }
                            >
                                Berikutnya
                            </Button>
                        </div>
                    </div>
                )}
            </section>

            <Modal show={letterOpen} onClose={() => setLetterOpen(false)} maxWidth="lg">
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        letterForm.post('/dokumen/surat-umum', {
                            preserveScroll: true,
                            onSuccess: () => {
                                setLetterOpen(false);
                                letterForm.reset();
                            },
                        });
                    }}
                >
                    <div className="border-b border-[#E7E1D9] px-6 py-5">
                        <p className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-[#8A8580]">
                            Surat Keluar
                        </p>
                        <h2 className="mt-1 text-lg font-semibold tracking-tight text-[#1C1B1A]">
                            Terbitkan Surat Umum
                        </h2>
                        <p className="mt-1.5 text-xs leading-relaxed text-[#8A8580]">
                            Nomor surat dibuat otomatis mengikuti pola{' '}
                            {'{seq}/BT/{bulan romawi}/{tahun}'}. PDF berkop PT Bunga Teratai
                            diarsipkan otomatis ke register.
                        </p>
                    </div>
                    <div className="p-6">
                        <Row gutter={16}>
                            <Col span={24}>
                                <label className="block font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-[#8A8580]">
                                    Kepada Yth. <span className="text-[#C1121F]">*</span>
                                </label>
                                <Input
                                    value={letterForm.data.to}
                                    onChange={(e) => letterForm.setData('to', e.target.value)}
                                    placeholder="mis. PT Sinar Laut Maritim"
                                    className="mt-1"
                                />
                            </Col>
                            <Col span={24}>
                                <label className="mt-4 block font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-[#8A8580]">
                                    Perihal / Subjek <span className="text-[#C1121F]">*</span>
                                </label>
                                <Input
                                    value={letterForm.data.subject}
                                    onChange={(e) => letterForm.setData('subject', e.target.value)}
                                    placeholder="mis. Surat Perintah Bongkar Muat"
                                    className="mt-1"
                                />
                            </Col>
                            <Col span={12}>
                                <label className="mt-4 block font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-[#8A8580]">
                                    Tanggal
                                </label>
                                <Input
                                    type="date"
                                    value={letterForm.data.date}
                                    onChange={(e) => letterForm.setData('date', e.target.value)}
                                    className="mt-1"
                                />
                            </Col>
                            <Col span={12}>
                                <label className="mt-4 block font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-[#8A8580]">
                                    Penandatangan
                                </label>
                                <Input
                                    value={letterForm.data.signer}
                                    onChange={(e) => letterForm.setData('signer', e.target.value)}
                                    placeholder="H. Syarif"
                                    className="mt-1"
                                />
                            </Col>
                            <Col span={24}>
                                <label className="mt-4 block font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-[#8A8580]">
                                    Isi Surat <span className="text-[#C1121F]">*</span>
                                </label>
                                <Input.TextArea
                                    rows={6}
                                    value={letterForm.data.body}
                                    onChange={(e) => letterForm.setData('body', e.target.value)}
                                    placeholder="Dengan hormat, bersama ini kami menyampaikan ..."
                                    className="mt-1"
                                />
                                {letterForm.errors.body && (
                                    <p className="mt-1 text-xs text-[#C1121F]">
                                        {letterForm.errors.body}
                                    </p>
                                )}
                            </Col>
                        </Row>
                    </div>
                    <div className="flex flex-col-reverse gap-2 border-t border-[#E7E1D9] bg-[#FAF7F2]/50 px-6 py-4 sm:flex-row sm:justify-end">
                        <Button onClick={() => setLetterOpen(false)}>Batal</Button>
                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={letterForm.processing}
                        >
                            {letterForm.processing ? 'Menerbitkan…' : 'Terbitkan & Cetak PDF'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </AuthenticatedLayout>
    );
}
