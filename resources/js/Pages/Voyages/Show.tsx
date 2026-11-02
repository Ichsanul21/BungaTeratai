import Badge, { type BadgeTone } from '@/Components/ui/Badge';
import Card from '@/Components/ui/Card';
import EmptyState from '@/Components/ui/EmptyState';
import Modal from '@/Components/Modal';
import NumericInput from '@/Components/NumericInput';
import PageHeader from '@/Components/ui/PageHeader';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TabNav from '@/Components/ui/TabNav';
import ConfirmModal from '@/Components/ui/ConfirmModal';
import { VOYAGE_STATUS_LABELS } from '@/Constants/navigation';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { formatDate, formatDateTime, formatNumber, formatRupiah } from '@/lib/format';
import { type PageProps } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    Anchor,
    ArrowLeft,
    CheckCircle2,
    FileStack,
    GitCommitVertical,
    ListChecks,
    Loader2,
    Map as MapIcon,
    Printer,
    ShieldCheck,
    Ship,
    Users,
    Wallet,
} from 'lucide-react';
import { FormEvent, useState } from 'react';
import {
    Button,
    Descriptions,
    Divider,
    Popconfirm,
    Progress,
    Select,
    Skeleton,
    Steps,
    Timeline,
    Typography,
} from 'antd';

const { Text, Paragraph } = Typography;

const STATUS_TONES: Record<string, BadgeTone> = {
    draft: 'neutral',
    planned: 'info',
    document_preparation: 'warning',
    internal_review: 'info',
    awaiting_external_approval: 'warning',
    ready_for_departure: 'success',
    departed: 'info',
    in_transit: 'info',
    arrived: 'success',
    voyage_closure: 'info',
    completed: 'success',
    delayed: 'danger',
    cancelled: 'danger',
};
const CHECK_TONES: Record<string, BadgeTone> = {
    terpenuhi: 'success',
    belum: 'danger',
    tidak_berlaku: 'neutral',
};

const CHARTER_STAGES = ['si', 'spal', 'dp', 'keagenan_muat', 'dsr', 'pelunasan', 'keagenan_bongkar', 'closing'];
const CHARTER_LABELS: Record<string, string> = {
    si: 'SI Diterima', spal: 'SPAL Dibuat', dp: 'Invoice DP',
    keagenan_muat: 'Keagenan Muat', dsr: 'DSR Diterima',
    pelunasan: 'Invoice Pelunasan', keagenan_bongkar: 'Keagenan Bongkar', closing: 'Closing',
};

const WORKFLOW_ORDER: Record<string, number> = {
    draft: 1,
    planned: 2,
    document_preparation: 3,
    internal_review: 4,
    awaiting_external_approval: 5,
    ready_for_departure: 6,
    departed: 7,
    in_transit: 8,
    arrived: 9,
    voyage_closure: 10,
    completed: 11,
    delayed: 98,
    cancelled: 99,
};

const STATUS_STEPS = (Object.keys(VOYAGE_STATUS_LABELS) as string[])
    .filter((s) => !['delayed', 'cancelled'].includes(s));

const isBackwardTransition = (from: string, to: string): boolean => {
    const oFrom = WORKFLOW_ORDER[from] ?? 0;
    const oTo = WORKFLOW_ORDER[to] ?? 0;
    if (oFrom > 0 && oFrom <= 11 && oTo > 0 && oTo <= 11) {
        return oTo < oFrom;
    }
    return false;
};

export default function VoyagesShow({
    voyage,
    relationships,
    cargo,
    checklists,
    documents,
    linkableDocuments,
    agency,
    charterInvoices,
    events,
    approvals,
    expenses,
    actions,
    fuelLogs = [],
    demurrage,
}: PageProps<{
    voyage: Record<string, any>;
    relationships: Array<Record<string, any>>;
    cargo: Array<Record<string, any>>;
    checklists: Array<Record<string, any>>;
    documents: Array<Record<string, any>>;
    linkableDocuments?: Array<Record<string, any>>;
    agency?: Array<Record<string, any>>;
    charterInvoices?: Array<Record<string, any>>;
    events: Array<Record<string, any>>;
    approvals: Array<Record<string, any>>;
    expenses: { bills: Array<Record<string, any>>; total: number };
    actions: { can_update: boolean; can_approve: boolean; can_confirm_external: boolean };
    fuelLogs?: Array<Record<string, any>>;
    demurrage?: Record<string, any>;
}>) {
    const [tab, setTab] = useState('overview');
    const [modal, setModal] = useState<null | 'approve' | 'external' | 'status' | 'cancel'>(null);
    const [nextStatus, setNextStatus] = useState('');
    const [busy, setBusy] = useState(false);
    const [loading] = useState(false);

    const approveForm = useForm({ decision: 'approved', comments: '' });
    const externalForm = useForm({ evidence: null as File | null, source_note: '' });
    const statusForm = useForm({ to: '', note: '' });
    const issueInvForm = useForm({ kind: 'dp', fp_number: '' });

    const tabs = [
        { key: 'overview', label: 'Overview', icon: Anchor },
        { key: 'vessel', label: 'Vessel & Route', icon: Ship },
        { key: 'documents', label: 'Documents', icon: FileStack, count: documents.length },
        { key: 'checklist', label: 'Checklist', icon: ListChecks, count: checklists.length },
        { key: 'berkas', label: 'Berkas Perjalanan', icon: FileStack },
        { key: 'manifest', label: 'Manifest', icon: Users },
        { key: 'approvals', label: 'Approvals', icon: ShieldCheck, count: approvals.length },
        { key: 'timeline', label: 'Timeline', icon: GitCommitVertical, count: events.length },
        { key: 'expenses', label: 'Operational Expenses', icon: Wallet },
        { key: 'reports', label: 'Reports', icon: Printer },
    ];

    const submitApprove = (e: FormEvent) => {
        e.preventDefault();
        approveForm.post(`/perjalanan/${voyage.id}/approve`, {
            preserveScroll: true,
            onSuccess: () => setModal(null),
        });
    };

    const submitExternal = (e: FormEvent) => {
        e.preventDefault();
        router.post(
            `/perjalanan/${voyage.id}/confirm-external`,
            {
                evidence: externalForm.data.evidence,
                source_note: externalForm.data.source_note,
            },
            {
                forceFormData: true,
                preserveScroll: true,
                onSuccess: () => setModal(null),
            },
        );
    };

    const submitStatus = (e: FormEvent) => {
        e.preventDefault();
        const isBackward = isBackwardTransition(voyage.voyage_status, statusForm.data.to);
        const trimmedNote = (statusForm.data.note || '').trim();
        if (isBackward && trimmedNote === '') {
            alert('Alasan perubahan wajib diisi jika status dimundurkan.');
            return;
        }
        router.post(
            `/perjalanan/${voyage.id}/status`,
            { to: statusForm.data.to, note: trimmedNote },
            {
                preserveScroll: true,
                onSuccess: () => setModal(null),
            },
        );
    };

    const checklistWajib = checklists.filter((c) => c.applicability === 'wajib');
    const checklistTerpenuhi = checklistWajib.filter((c) => c.completion_status === 'terpenuhi');
    const checklistPct = checklistWajib.length > 0
        ? Math.round((checklistTerpenuhi.length / checklistWajib.length) * 100)
        : 100;

    const currentStepIdx = STATUS_STEPS.indexOf(voyage.voyage_status);
    const charterStepIdx = voyage.charter_stage ? CHARTER_STAGES.indexOf(voyage.charter_stage) : -1;

    return (
        <AuthenticatedLayout>
            <Head title={`Perjalanan ${voyage.voyage_code}`} />
            <div id={`record-voyage-${voyage.id}`}>

            <div className="mb-4">
                <Link href="/perjalanan" className="inline-flex items-center gap-1.5 text-sm text-[#8A8580] hover:text-[#1C1B1A]">
                    <ArrowLeft size={15} /> Kembali ke Voyage Management
                </Link>
            </div>

            <PageHeader
                title={voyage.voyage_code}
                description={`${voyage.vessel_name} · ${voyage.origin} → ${voyage.destination} · ${voyage.activity_type?.replace('_', ' ')}`}
                actions={
                    <>
                        <Badge tone={STATUS_TONES[voyage.voyage_status] ?? 'neutral'}>
                            {VOYAGE_STATUS_LABELS[voyage.voyage_status] ?? voyage.voyage_status}
                        </Badge>
                        <Badge
                            tone={
                                voyage.external_approval_status === 'terkonfirmasi'
                                    ? 'success'
                                    : voyage.external_approval_status === 'menunggu'
                                      ? 'warning'
                                      : 'neutral'
                            }
                        >
                            Eksternal: {voyage.external_approval_status === 'terkonfirmasi' ? 'Terkonfirmasi' : voyage.external_approval_status === 'menunggu' ? 'Menunggu' : 'Tidak Berlaku'}
                        </Badge>
                        {actions.can_update && (
                            <>
                                <Link href={`/perjalanan/${voyage.id}/edit`}>
                                    <Button>Edit</Button>
                                </Link>
                                {!['cancelled', 'completed'].includes(voyage.voyage_status) && (
                                    <Button
                                        danger
                                        onClick={() => setModal('cancel')}
                                    >
                                        Batalkan
                                    </Button>
                                )}
                            </>
                        )}
                        {actions.can_update && voyage.allowed_transitions.length > 0 && (
                            <Button
                                type="primary"
                                onClick={() => {
                                    setNextStatus(voyage.allowed_transitions[0]);
                                    statusForm.setData('to', voyage.allowed_transitions[0]);
                                    setModal('status');
                                }}
                            >
                                Ubah Status
                            </Button>
                        )}
                    </>
                }
            />

            <Skeleton loading={loading} active paragraph={{ rows: 8 }}>
                <TabNav tabs={tabs} active={tab} onChange={setTab} />

                {tab === 'overview' && (
                    <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
                        <Card title="Status Perjalanan" className="xl:col-span-2">
                            {/* Current Status Badge - Large & Prominent */}
                            <div className="mb-6 rounded-xl border-2 border-[#C1121F]/20 bg-gradient-to-br from-[#C1121F]/5 to-transparent p-5">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <Text type="secondary" className="text-xs uppercase tracking-wide">
                                            Status Saat Ini
                                        </Text>
                                        <div className="mt-2 flex items-center gap-3">
                                            <Badge tone={STATUS_TONES[voyage.voyage_status] ?? 'neutral'}>
                                                <span className="text-base font-semibold">
                                                    {VOYAGE_STATUS_LABELS[voyage.voyage_status] ?? voyage.voyage_status}
                                                </span>
                                            </Badge>
                                        </div>
                                    </div>
                                    {actions.can_update && voyage.allowed_transitions.length > 0 && (
                                        <Select
                                            value={voyage.voyage_status}
                                            onChange={(target) => {
                                                if (target && target !== voyage.voyage_status) {
                                                    setNextStatus(target);
                                                    statusForm.setData({ to: target, note: '' });
                                                    setModal('status');
                                                }
                                            }}
                                            style={{ width: 200 }}
                                            size="small"
                                            options={[
                                                { value: voyage.voyage_status, label: `${VOYAGE_STATUS_LABELS[voyage.voyage_status]} (Saat Ini)` },
                                                ...(voyage.allowed_transitions ?? []).map((s: string) => ({
                                                    value: s,
                                                    label: `${isBackwardTransition(voyage.voyage_status, s) ? '← Mundur: ' : '→ '}${VOYAGE_STATUS_LABELS[s] ?? s}`,
                                                })),
                                            ]}
                                        />
                                    )}
                                </div>
                            </div>

                            {/* Simplified Steps - Only Show Key Milestones */}
                            <div className="mb-6">
                                <Text type="secondary" className="mb-3 block text-xs font-semibold uppercase tracking-wide">
                                    Progress Perjalanan
                                </Text>
                                <div className="relative">
                                    {/* Progress Line */}
                                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-[#E7E1D9]" />
                                    
                                    {/* Steps */}
                                    <div className="space-y-4">
                                        {[
                                            { status: 'planned', label: 'Direncanakan', icon: '📋' },
                                            { status: 'document_preparation', label: 'Persiapan Dokumen', icon: '📄' },
                                            { status: 'ready_for_departure', label: 'Siap Berangkat', icon: '✅' },
                                            { status: 'departed', label: 'Berangkat', icon: '🚢' },
                                            { status: 'in_transit', label: 'Dalam Pelayaran', icon: '🌊' },
                                            { status: 'arrived', label: 'Tiba', icon: '⚓' },
                                            { status: 'completed', label: 'Selesai', icon: '✓' },
                                        ].map((step) => {
                                            const stepOrder = WORKFLOW_ORDER[step.status] ?? 0;
                                            const currentOrder = WORKFLOW_ORDER[voyage.voyage_status] ?? 0;
                                            const isCompleted = stepOrder <= currentOrder && currentOrder < 90;
                                            const isCurrent = step.status === voyage.voyage_status;
                                            
                                            return (
                                                <div key={step.status} className="relative flex items-start gap-4">
                                                    {/* Dot */}
                                                    <div
                                                        className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${
                                                            isCurrent
                                                                ? 'border-[#C1121F] bg-[#C1121F] text-white'
                                                                : isCompleted
                                                                ? 'border-[#2F8F68] bg-[#2F8F68] text-white'
                                                                : 'border-[#E7E1D9] bg-white text-[#8A8580]'
                                                        }`}
                                                    >
                                                        <span className="text-sm">{step.icon}</span>
                                                    </div>
                                                    
                                                    {/* Content */}
                                                    <div className="flex-1 pt-1">
                                                        <div
                                                            className={`text-sm font-semibold ${
                                                                isCurrent
                                                                    ? 'text-[#C1121F]'
                                                                    : isCompleted
                                                                    ? 'text-[#1C1B1A]'
                                                                    : 'text-[#8A8580]'
                                                            }`}
                                                        >
                                                            {step.label}
                                                        </div>
                                                        {isCurrent && (
                                                            <div className="mt-1 text-xs text-[#8A8580]">
                                                                ← Status saat ini
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Schedule Info */}
                            <Descriptions
                                column={{ xs: 1, sm: 2, md: 4 }}
                                size="small"
                                className="mb-5"
                                items={[
                                    { key: 'planned_dep', label: 'Jadwal Berangkat', children: formatDateTime(voyage.planned_departure) },
                                    { key: 'actual_dep', label: 'Berangkat Aktual', children: formatDateTime(voyage.actual_departure) },
                                    { key: 'est_arr', label: 'Perkiraan Tiba', children: formatDateTime(voyage.estimated_arrival) },
                                    { key: 'actual_arr', label: 'Tiba Aktual', children: formatDateTime(voyage.actual_arrival) },
                                ]}
                            />

                            {/* Checklist Progress */}
                            <div className="mb-4">
                                <Text type="secondary" className="text-xs uppercase tracking-wide">Progres Checklist Wajib</Text>
                                <div className="mt-1.5 flex items-center gap-3">
                                    <Progress
                                        percent={checklistPct}
                                        size="small"
                                        strokeColor={checklistTerpenuhi.length === checklistWajib.length && checklistWajib.length > 0 ? '#2F8F68' : '#D99A2B'}
                                        className="flex-1"
                                    />
                                    <Text strong className="text-sm tabular-nums text-[#1C1B1A]">
                                        {checklistTerpenuhi.length}/{checklistWajib.length}
                                    </Text>
                                </div>
                            </div>

                            {/* Disclaimer */}
                            <div className="rounded-lg bg-[#1E4668]/5 p-2.5">
                                <Text type="secondary" className="text-[11px]">
                                    Status kesiapan adalah <strong>indikator internal sistem</strong> - bukan
                                    pengganti penilaian nakhoda atau persetujuan otoritas pelayaran.
                                </Text>
                            </div>
                        </Card>
                        <Card title="Identitas Perjalanan">
                            <Descriptions
                                column={1}
                                size="small"
                                items={[
                                    { key: 'activity', label: 'Kegiatan', children: <span className="capitalize">{voyage.activity_type?.replace('_', ' ')}</span> },
                                    { key: 'pic', label: 'PIC', children: voyage.person_in_charge },
                                    { key: 'customer', label: 'Customer', children: voyage.customer_name ?? '-' },
                                    { key: 'contract', label: 'No. Kontrak', children: voyage.contract_no ?? '-' },
                                    { key: 'route', label: 'Tipe Rute', children: voyage.route_type },
                                ]}
                            />
                        </Card>

                        <Card
                            title="Informasi Demurrage & Laytime (SPAL)"
                            description="Data faktual berbasis waktu operasional riil, tanpa asumsi prediktif."
                            className="xl:col-span-3"
                        >
                            <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
                                {[
                                    ['Laytime Kontrak', (demurrage?.laytime_days ?? 0) > 0 ? `${demurrage?.laytime_days} hari` : 'Tidak diatur'],
                                    ['Tarif Demurrage', (demurrage?.demurrage_rate ?? 0) > 0 ? `${formatRupiah(demurrage?.demurrage_rate ?? 0)} / hari` : 'Tidak diatur'],
                                    ['Waktu Operasi Aktual', `${demurrage?.elapsed_days ?? 0} hari`],
                                    ['Kelebihan Hari', (demurrage?.demurrage_days ?? 0) > 0 ? `${demurrage?.demurrage_days} hari` : 'Dalam batas'],
                                    ['Estimasi Demurrage', (demurrage?.demurrage_amount ?? 0) > 0 ? formatRupiah(demurrage?.demurrage_amount ?? 0) : 'Rp 0'],
                                ].map(([k, v]) => (
                                    <div key={k as string} className="rounded-lg border border-[#E7E1D9] bg-[#FAF7F2]/30 p-3">
                                        <Text type="secondary" className="text-xs uppercase tracking-wide">{k}</Text>
                                        <p className="mt-1 font-semibold text-[#1C1B1A]">{v as string}</p>
                                    </div>
                                ))}
                            </div>
                            <Divider style={{ margin: '16px 0 12px', borderColor: '#E7E1D9' }} />
                            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                                <Text type="secondary">
                                    Status kepatuhan: <Text strong className="text-[#1C1B1A]">{demurrage?.status ?? 'Dalam batas laytime'}</Text>
                                </Text>
                                <div className="flex gap-2">
                                    <Button type="link" size="small" onClick={() => setTab('berkas')}>
                                        Lihat Berkas SPAL & Kontrak &rarr;
                                    </Button>
                                    <Button type="link" size="small" onClick={() => setTab('timeline')}>
                                        Histori Kejadian Perjalanan &rarr;
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    </div>
                )}

                {tab === 'vessel' && (
                    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                        <Card title="Vessel Utama">
                            <Link
                                href={`/armada/${voyage.vessel_id}`}
                                className="inline-flex items-center gap-2 text-sm font-semibold text-[#C1121F] hover:underline"
                            >
                                <Ship size={16} /> {voyage.vessel_name} ({voyage.vessel_type?.replace('_', ' ')})
                            </Link>
                            <Paragraph type="secondary" className="mt-2 text-sm mb-0">
                                Rute: {voyage.origin} → {voyage.destination} ({voyage.route_type})
                            </Paragraph>
                        </Card>
                        <Card title="Relasi Tugboat ↔ Tongkang" description="Dicatat per perjalanan, bukan permanen.">
                            {relationships.length === 0 ? (
                                <Paragraph type="secondary" className="text-sm mb-0">
                                    Tidak ada relasi (kapal penumpang / tanpa penarikan).
                                </Paragraph>
                            ) : (
                                relationships.map((r, i) => (
                                    <div key={i} className="flex items-center gap-3 text-sm">
                                        <span className="rounded-lg bg-[#1E4668]/10 px-2.5 py-1 font-medium text-[#1E4668]">
                                            {r.tugboat_name}
                                        </span>
                                        <Text type="secondary">menarik</Text>
                                        <span className="rounded-lg bg-[#D99A2B]/10 px-2.5 py-1 font-medium text-[#D99A2B]">
                                            {r.barge_name}
                                        </span>
                                    </div>
                                ))
                            )}
                            {cargo.length > 0 && (
                                <>
                                    <Divider style={{ margin: '16px 0', borderColor: '#E7E1D9' }} />
                                    <Text type="secondary" className="mb-2 block text-xs font-semibold uppercase tracking-wide">Muatan</Text>
                                    {cargo.map((c) => (
                                        <div key={c.id} className="text-sm text-[#1C1B1A]">
                                            <span className="capitalize">{c.commodity_type?.replace('_', ' ')}</span>
                                            {c.weight_ton && (
                                                <Text type="secondary"> · {formatNumber(c.weight_ton, 1)} ton</Text>
                                            )}
                                            <Text type="secondary"> · {c.origin} → {c.destination}</Text>
                                        </div>
                                    ))}
                                </>
                            )}
                        </Card>
                    </div>
                )}

                {tab === 'documents' && (
                    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                        <Card title="Dokumen Tertaut" description="Dipakai ulang tanpa upload ganda.">
                            {documents.length === 0 ? (
                                <Paragraph type="secondary" className="text-sm mb-0">Belum ada dokumen tertaut.</Paragraph>
                            ) : (
                                <ul className="space-y-2">
                                    {documents.map((d) => (
                                        <li key={d.id} className="flex items-center justify-between gap-2 rounded-lg border border-[#E7E1D9] px-3 py-2 text-sm">
                                            <Link href={`/dokumen/${d.id}`} className="font-medium text-[#1C1B1A] hover:text-[#C1121F]">
                                                {d.document_name}
                                            </Link>
                                            <Text type="secondary" className="text-xs">
                                                {d.group_code} · {d.verification_status}
                                            </Text>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Card>
                        <Card title="Tautkan Dokumen" description="Pilih dari dokumen kapal/perusahaan yang sudah ada.">
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    const sel = (e.currentTarget.elements.namedItem('document_id') as HTMLSelectElement).value;
                                    if (!sel) return;
                                    router.post(
                                        `/perjalanan/${voyage.id}/link-document`,
                                        { document_id: sel },
                                        { preserveScroll: true },
                                    );
                                }}
                            >
                                <select
                                    name="document_id"
                                    className="block w-full rounded-md border border-[#E7E1D9] bg-white p-2 text-sm shadow-sm focus:border-[#C1121F] focus:outline-none focus:ring-2 focus:ring-[#C1121F]/20"
                                >
                                    <option value="">— pilih dokumen —</option>
                                    {(linkableDocuments ?? []).map((d) => (
                                        <option key={d.id} value={d.id}>
                                            {d.document_name}
                                        </option>
                                    ))}
                                </select>
                                <Text type="secondary" className="mt-2 block text-xs">
                                    Pilih dokumen kapal atau perusahaan yang BELUM tertaut ke perjalanan ini.
                                </Text>
                            </form>
                        </Card>
                    </div>
                )}

                {tab === 'checklist' && (
                    <div className="overflow-hidden rounded-xl border border-[#E7E1D9] bg-white shadow-sm">
                        <table className="min-w-full divide-y divide-[#E7E1D9] text-sm">
                            <thead className="bg-[#FAF7F2]">
                                <tr>
                                    {['Grup', 'Persyaratan', 'Sifat', 'Status', 'Aksi'].map((h) => (
                                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#8A8580]">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E7E1D9]">
                                {checklists.map((c) => (
                                    <tr key={c.id}>
                                        <td className="px-4 py-3 text-[#8A8580]">{c.group_code}</td>
                                        <td className="px-4 py-3 font-medium text-[#1C1B1A]">{c.name}</td>
                                        <td className="px-4 py-3">
                                            <Badge tone={c.applicability === 'wajib' ? 'info' : 'neutral'}>
                                                {c.applicability === 'wajib' ? 'Wajib' : c.applicability === 'kondisional' ? 'Kondisional' : 'Menunggu Konfirmasi'}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge tone={CHECK_TONES[c.completion_status] ?? 'neutral'}>
                                                {c.completion_status === 'terpenuhi'
                                                    ? 'Terpenuhi'
                                                    : c.completion_status === 'tidak_berlaku'
                                                      ? 'Tidak Berlaku'
                                                      : 'Belum'}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3">
                                            {actions.can_update ? (
                                                <form
                                                    onSubmit={(e) => {
                                                        e.preventDefault();
                                                        const sel = (e.currentTarget.elements.namedItem('completion_status') as HTMLSelectElement).value;
                                                        router.post(
                                                            `/perjalanan/${voyage.id}/checklist/${c.id}`,
                                                            { completion_status: sel },
                                                            { preserveScroll: true },
                                                        );
                                                    }}
                                                    className="flex items-center gap-2"
                                                >
                                                    <select
                                                        name="completion_status"
                                                        defaultValue={c.completion_status}
                                                        className="rounded-md border border-[#E7E1D9] bg-white py-1 text-xs shadow-sm focus:border-[#C1121F] focus:outline-none focus:ring-2 focus:ring-[#C1121F]/20"
                                                    >
                                                        <option value="terpenuhi">Terpenuhi</option>
                                                        <option value="belum">Belum</option>
                                                        <option value="tidak_berlaku">Tidak Berlaku</option>
                                                    </select>
                                                    <button type="submit" className="text-xs font-medium text-[#C1121F] hover:underline">
                                                        Simpan
                                                    </button>
                                                </form>
                                            ) : (
                                                <Text type="secondary" className="text-xs">—</Text>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="border-t border-[#E7E1D9] bg-[#FAF7F2] p-3">
                            <Text type="secondary" className="text-xs">
                                Item kondisional tidak diwajibkan untuk semua perjalanan, hanya berlaku sesuai
                                jenis kapal & muatan.
                            </Text>
                        </div>
                    </div>
                )}

                {tab === 'berkas' && (
                    <div className="space-y-5">
                        {voyage.charter_stage && (
                            <Card title="Tahap Berkas SPAL" description="SI → SPAL → DP → Keagenan Muat → DSR → Pelunasan → Keagenan Bongkar → Closing.">
                                <Steps
                                    current={charterStepIdx >= 0 ? charterStepIdx : 0}
                                    size="small"
                                    items={CHARTER_STAGES.map((s) => ({
                                        title: CHARTER_LABELS[s],
                                        status: CHARTER_STAGES.indexOf(s) < charterStepIdx ? 'finish' : CHARTER_STAGES.indexOf(s) === charterStepIdx ? 'process' : 'wait',
                                    }))}
                                />
                                {actions.can_update && (
                                    <form
                                        onSubmit={(e) => {
                                            e.preventDefault();
                                            const fd = new FormData(e.currentTarget as HTMLFormElement);
                                            router.post(`/perjalanan/${voyage.id}/charter`, {
                                                charter_stage: fd.get('charter_stage'),
                                                dsr_mt: fd.get('dsr_mt') || null,
                                                dsr_date: fd.get('dsr_date') || null,
                                            }, { preserveScroll: true });
                                        }}
                                        className="mt-4 flex flex-wrap items-end gap-3 border-t border-[#E7E1D9] pt-4"
                                    >
                                        <div>
                                            <Text type="secondary" className="text-xs font-medium">Tahap saat ini</Text>
                                            <select name="charter_stage" defaultValue={voyage.charter_stage} className="mt-1 block rounded-md border border-[#E7E1D9] bg-white p-2 text-sm shadow-sm focus:border-[#C1121F] focus:outline-none focus:ring-2 focus:ring-[#C1121F]/20">
                                                {CHARTER_STAGES.map((s) => (
                                                    <option key={s} value={s}>{CHARTER_LABELS[s]}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <Text type="secondary" className="text-xs font-medium">DSR — Total Muatan (MT)</Text>
                                            <NumericInput name="dsr_mt" decimalPlaces={2} defaultValue={voyage.dsr_mt ?? ''} className="mt-1 block w-32 rounded-md border border-[#E7E1D9] bg-white p-2 text-sm shadow-sm focus:border-[#C1121F] focus:outline-none focus:ring-2 focus:ring-[#C1121F]/20" />
                                        </div>
                                        <div>
                                            <Text type="secondary" className="text-xs font-medium">Tanggal DSR</Text>
                                            <input name="dsr_date" type="date" defaultValue={voyage.dsr_date ?? ''} className="mt-1 block rounded-md border border-[#E7E1D9] bg-white p-2 text-sm shadow-sm focus:border-[#C1121F] focus:outline-none focus:ring-2 focus:ring-[#C1121F]/20" />
                                        </div>
                                        <Button type="primary" htmlType="submit" style={{ background: '#1C1B1A', borderColor: '#1C1B1A' }}>
                                            Simpan Tahap
                                        </Button>
                                    </form>
                                )}
                                <Text type="secondary" className="mt-3 block text-xs">
                                    Tahap <strong>pelunasan</strong> membutuhkan DSR dari nakhoda. Invoice DP/pelunasan diterbitkan lewat menu Keuangan → Invoice (tag voyage ini).
                                </Text>
                            </Card>
                        )}

                        {voyage.spal_number && (
                            <Card
                                title={`SPAL ${voyage.spal_number}`}
                                actions={
                                    <a href={`/cetak/spal/${voyage.id}`} target="_blank" rel="noreferrer">
                                        <Button type="primary" size="small" icon={<Printer size={13} />}>
                                            Cetak SPAL (PDF)
                                        </Button>
                                    </a>
                                }
                            >
                                <Descriptions
                                    column={{ xs: 1, sm: 2, md: 3 }}
                                    size="small"
                                    items={[
                                        { key: 'spal_date', label: 'Tanggal SPAL', children: voyage.spal_date },
                                        { key: 'payment', label: 'Sistem Bayar', children: <span className="capitalize">{(voyage.payment_terms ?? '').replace('_', ' ')}</span> },
                                        { key: 'freight', label: 'Freight', children: voyage.freight_rate ? `${formatRupiah(voyage.freight_rate)}${voyage.freight_unit === 'MT' ? ' /MT' : ' lumpsum'}` : '—' },
                                        { key: 'laytime', label: 'Laytime', children: voyage.laytime_days ? `${voyage.laytime_days} hari` : '—' },
                                        { key: 'demurrage', label: 'Demurrage', children: voyage.demurrage_per_day ? `${formatRupiah(voyage.demurrage_per_day)} /hari` : '—' },
                                        { key: 'loading', label: 'Muat', children: voyage.jetty_loading ?? '—' },
                                        { key: 'discharge', label: 'Bongkar', children: voyage.jetty_discharge ?? '—' },
                                        { key: 'shipper', label: 'Shipper', children: voyage.shipper ?? '—' },
                                        { key: 'consignee', label: 'Consignee', children: voyage.consignee ?? '—' },
                                    ]}
                                />
                                {(charterInvoices ?? []).length > 0 && (
                                    <>
                                        <Divider style={{ margin: '16px 0 12px', borderColor: '#E7E1D9' }} />
                                        <Text type="secondary" className="mb-2 block text-xs font-semibold uppercase tracking-wide">
                                            Invoice Charter (DP / Pelunasan)
                                        </Text>
                                        <ul className="space-y-1.5">
                                            {(charterInvoices ?? []).map((inv: any) => (
                                                <li key={inv.id} className="flex items-center justify-between gap-2 rounded-lg border border-[#E7E1D9] px-3 py-2 text-sm">
                                                    <span className="font-medium text-[#1C1B1A]">
                                                        {inv.number}
                                                        <Text type="secondary" className="ms-2 text-xs font-normal">
                                                            {inv.fp_number ? `FP: ${inv.fp_number}` : 'FP: —'}
                                                        </Text>
                                                    </span>
                                                    <span className="flex items-center gap-2">
                                                        <Badge tone={inv.status === 'paid' ? 'success' : inv.status === 'partial' ? 'warning' : 'danger'}>
                                                            {inv.status}
                                                        </Badge>
                                                        <span className="tabular-nums text-[#1C1B1A]">{formatRupiah(inv.total)}</span>
                                                        <a href={`/cetak/invoice-charter/${inv.id}?kind=${inv.invoice_kind === 'pelunasan' ? 'pelunasan' : 'dp'}`} target="_blank" rel="noreferrer" className="text-xs font-medium text-[#C1121F] hover:underline">
                                                            Cetak
                                                        </a>
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    </>
                                )}
                                <Divider style={{ margin: '16px 0 12px', borderColor: '#E7E1D9' }} />
                                <Text type="secondary" className="mb-2 block text-xs font-semibold uppercase tracking-wide">Terbitkan Invoice Charter</Text>
                                <Text type="secondary" className="mb-2 block text-xs">
                                    Auto-fill dari SPAL (rate x MT). Pelunasan memakai DSR. PPN 11%, PPh 1,2%, nomor terbit urut, PDF otomatis terarsip. Kolom FP: nomor & file (sistem tidak menerbitkan FP).
                                </Text>
                                <form
                                    onSubmit={(e: FormEvent) => {
                                        e.preventDefault();
                                        issueInvForm.post(`/perjalanan/${voyage.id}/invoice-charter`, { preserveScroll: true, onSuccess: () => issueInvForm.reset() });
                                    }}
                                    className="flex flex-wrap items-end gap-2"
                                >
                                    <div>
                                        <Text type="secondary" className="text-xs">Tahap</Text>
                                        <select
                                            value={issueInvForm.data.kind}
                                            onChange={(e) => issueInvForm.setData('kind', e.target.value)}
                                            className="mt-1 block w-44 rounded-md border border-[#E7E1D9] bg-white p-2 text-sm shadow-sm focus:border-[#C1121F] focus:outline-none focus:ring-2 focus:ring-[#C1121F]/20"
                                        >
                                            <option value="dp">DP (50% / terms)</option>
                                            <option value="dp100">DP 100% (penuh)</option>
                                            <option value="pelunasan">Pelunasan (DSR − DP)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <Text type="secondary" className="text-xs">Nomor FP (opsional)</Text>
                                        <input
                                            value={issueInvForm.data.fp_number}
                                            onChange={(e) => issueInvForm.setData('fp_number', e.target.value)}
                                            placeholder="010.045-777.197.2026"
                                            className="mt-1 block w-56 rounded-md border border-[#E7E1D9] bg-white p-2 text-sm shadow-sm focus:border-[#C1121F] focus:outline-none focus:ring-2 focus:ring-[#C1121F]/20"
                                        />
                                    </div>
                                    <PrimaryButton disabled={issueInvForm.processing || !voyage.spal_number || !voyage.freight_rate}>
                                        Terbitkan & Cetak
                                    </PrimaryButton>
                                </form>
                                {!voyage.spal_number && <Text type="secondary" className="mt-1.5 block text-xs">Terbitkan SPAL terlebih dahulu.</Text>}
                                {issueInvForm.errors?.kind && <p className="mt-1 text-xs text-[#C1121F]">{issueInvForm.errors.kind}</p>}
                            </Card>
                        )}

                        <Card title="Penunjukan Keagenan" description="Surat penunjukan agen sebelum kapal tiba di pelabuhan muat & bongkar.">
                            {(agency ?? []).length === 0 ? (
                                <Paragraph type="secondary" className="text-sm mb-0">Belum ada surat keagenan.</Paragraph>
                            ) : (
                                <ul className="space-y-2">
                                    {(agency ?? []).map((ag: any) => (
                                        <li key={ag.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#E7E1D9] px-3 py-2.5 text-sm">
                                            <div>
                                                <p className="font-medium text-[#1C1B1A]">
                                                    <Text type="secondary" className="font-mono text-xs">{ag.letter_no}</Text> · {ag.agent_name}
                                                </p>
                                                <p className="text-xs capitalize text-[#8A8580]">
                                                    {ag.port_type} · {ag.port_name ?? '—'} · Nakhoda: {ag.captain_name ?? '—'} {ag.captain_phone ? `(${ag.captain_phone})` : ''} · GRT {ag.grt ?? '—'}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs font-medium">
                                                <a href={`/cetak/keagenan/${ag.id}`} target="_blank" rel="noreferrer" className="text-[#C1121F] hover:underline">Cetak</a>
                                                <Text type="secondary">{formatDate(ag.letter_date)}</Text>
                                                {actions.can_update && (
                                                    <Popconfirm
                                                        title="Hapus surat keagenan ini?"
                                                        onConfirm={() => router.delete(`/perjalanan/${voyage.id}/keagenan/${ag.id}`, { preserveScroll: true })}
                                                    >
                                                        <button type="button" className="text-[#C1121F] hover:underline">Hapus</button>
                                                    </Popconfirm>
                                                )}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            {actions.can_update && (
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        const fd = new FormData(e.currentTarget as HTMLFormElement);
                                        router.post(`/perjalanan/${voyage.id}/keagenan`, Object.fromEntries(fd), {
                                            preserveScroll: true,
                                            onSuccess: () => (e.currentTarget as HTMLFormElement).reset(),
                                        });
                                    }}
                                    className="mt-4 grid grid-cols-2 gap-3 border-t border-[#E7E1D9] pt-4 md:grid-cols-4"
                                >
                                    <div>
                                        <Text type="secondary" className="text-xs font-medium">Jenis Pelabuhan *</Text>
                                        <select name="port_type" className="mt-1 block rounded-md border border-[#E7E1D9] bg-white p-2 text-sm shadow-sm focus:border-[#C1121F] focus:outline-none focus:ring-2 focus:ring-[#C1121F]/20">
                                            <option value="muat">Muat</option>
                                            <option value="bongkar">Bongkar</option>
                                            <option value="lainnya">Lainnya</option>
                                        </select>
                                    </div>
                                    <div>
                                        <Text type="secondary" className="text-xs font-medium">Nama Pelabuhan</Text>
                                        <input name="port_name" className="mt-1 block rounded-md border border-[#E7E1D9] bg-white p-2 text-sm shadow-sm focus:border-[#C1121F] focus:outline-none focus:ring-2 focus:ring-[#C1121F]/20" />
                                    </div>
                                    <div>
                                        <Text type="secondary" className="text-xs font-medium">Agen *</Text>
                                        <input name="agent_name" required className="mt-1 block rounded-md border border-[#E7E1D9] bg-white p-2 text-sm shadow-sm focus:border-[#C1121F] focus:outline-none focus:ring-2 focus:ring-[#C1121F]/20" />
                                    </div>
                                    <div>
                                        <Text type="secondary" className="text-xs font-medium">Alamat Agen</Text>
                                        <input name="agent_address" className="mt-1 block rounded-md border border-[#E7E1D9] bg-white p-2 text-sm shadow-sm focus:border-[#C1121F] focus:outline-none focus:ring-2 focus:ring-[#C1121F]/20" />
                                    </div>
                                    <div>
                                        <Text type="secondary" className="text-xs font-medium">Nakhoda</Text>
                                        <input name="captain_name" className="mt-1 block rounded-md border border-[#E7E1D9] bg-white p-2 text-sm shadow-sm focus:border-[#C1121F] focus:outline-none focus:ring-2 focus:ring-[#C1121F]/20" />
                                    </div>
                                    <div>
                                        <Text type="secondary" className="text-xs font-medium">HP Nakhoda</Text>
                                        <input name="captain_phone" className="mt-1 block rounded-md border border-[#E7E1D9] bg-white p-2 text-sm shadow-sm focus:border-[#C1121F] focus:outline-none focus:ring-2 focus:ring-[#C1121F]/20" />
                                    </div>
                                    <div>
                                        <Text type="secondary" className="text-xs font-medium">Tanggal Surat</Text>
                                        <input name="letter_date" type="date" className="mt-1 block rounded-md border border-[#E7E1D9] bg-white p-2 text-sm shadow-sm focus:border-[#C1121F] focus:outline-none focus:ring-2 focus:ring-[#C1121F]/20" />
                                    </div>
                                    <div className="flex items-end">
                                        <Button type="primary" htmlType="submit">
                                            Terbitkan Surat
                                        </Button>
                                    </div>
                                </form>
                            )}
                        </Card>

                        <Card title="Dokumen Berkas Perjalanan" description="Dokumen tertaut perjalanan ini, arsip terpadu.">
                            {documents.length === 0 ? (
                                <Paragraph type="secondary" className="text-sm mb-0">Belum ada dokumen tertaut. Gunakan tab Documents untuk menautkan.</Paragraph>
                            ) : (
                                <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
                                    {documents.map((d: any) => (
                                        <li key={d.id} className="flex items-center justify-between rounded-lg border border-[#E7E1D9] px-3 py-2 text-sm">
                                            <Link href={`/dokumen/${d.id}`} className="font-medium text-[#1C1B1A] hover:text-[#C1121F]">
                                                {d.document_name}
                                            </Link>
                                            <Text type="secondary" className="text-xs">{d.group_code} · {d.verification_status}</Text>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Card>
                    </div>
                )}

                {tab === 'manifest' && (
                    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                        {voyage.vessel_type === 'kapal_penumpang' ? (
                            <>
                                <Card title="Rekap Penumpang">
                                    <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                                        {[
                                            ['Kapasitas', voyage.capacity],
                                            ['Tiket Terjual', voyage.tickets_sold],
                                            ['Naik (Boarded)', voyage.boarded],
                                            ['Turun (Landed)', voyage.landed],
                                            ['Batal', voyage.cancelled],
                                        ].map(([k, v]) => (
                                            <div key={k as string} className="rounded-lg bg-[#FAF7F2] p-3">
                                                <Text type="secondary" className="text-xs uppercase tracking-wide">{k}</Text>
                                                <p className="mt-0.5 text-xl font-semibold tabular-nums text-[#1C1B1A]">
                                                    {v == null ? '—' : formatNumber(Number(v))}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                    {actions.can_update && (
                                        <form
                                            onSubmit={(e) => {
                                                e.preventDefault();
                                                const type = (e.currentTarget.elements.namedItem('type') as HTMLSelectElement).value;
                                                const count = (e.currentTarget.elements.namedItem('count') as HTMLInputElement).value;
                                                router.post(
                                                    `/perjalanan/${voyage.id}/passenger-log`,
                                                    { type, count: count || null },
                                                    { preserveScroll: true },
                                                );
                                            }}
                                            className="mt-4 flex flex-wrap items-end gap-2 border-t border-[#E7E1D9] pt-4"
                                        >
                                            <div>
                                                <Text type="secondary" className="text-xs font-medium">Jenis Log</Text>
                                                <select name="type" className="mt-1 block rounded-md border border-[#E7E1D9] bg-white p-2 text-sm shadow-sm focus:border-[#C1121F] focus:outline-none focus:ring-2 focus:ring-[#C1121F]/20">
                                                    <option value="keberangkatan">Keberangkatan (jumlah naik)</option>
                                                    <option value="kedatangan">Kedatangan (jumlah turun)</option>
                                                    <option value="batal">Pembatalan tiket</option>
                                                    <option value="perubahan_jumlah">Perubahan jumlah</option>
                                                </select>
                                            </div>
                                            <div>
                                                <Text type="secondary" className="text-xs font-medium">Jumlah</Text>
                                                <NumericInput name="count" min={0} className="mt-1 block w-28 rounded-md border border-[#E7E1D9] bg-white p-2 text-sm shadow-sm focus:border-[#C1121F] focus:outline-none focus:ring-2 focus:ring-[#C1121F]/20" />
                                            </div>
                                            <Button type="primary" htmlType="submit" style={{ background: '#1C1B1A', borderColor: '#1C1B1A' }}>
                                                Catat Log
                                            </Button>
                                        </form>
                                    )}
                                    <Text type="secondary" className="mt-3 block text-xs">
                                        Data penumpang bersifat simulasi/agregat. Produksi wajib
                                        pembatasan akses data pribadi.
                                    </Text>
                                </Card>
                                <Card title="Cek Kesiapan Penumpang">
                                    <Paragraph type="secondary" className="text-sm mb-0">
                                        Cek kesiapan (kapasitas vs jumlah, life jacket, APAR) dicatat pada
                                        pemeriksaan kesiapan sebelum berangkat. Lihat Operations & Dokumen
                                        keselamatan kapal.
                                    </Paragraph>
                                </Card>
                            </>
                        ) : (
                            <Card title="Muatan" description="Data terstruktur perjalanan tongkang/tugboat.">
                                {cargo.length === 0 ? (
                                    <Paragraph type="secondary" className="text-sm mb-0">Tidak ada data muatan.</Paragraph>
                                ) : (
                                    cargo.map((c) => (
                                        <div key={c.id} className="rounded-lg border border-[#E7E1D9] p-3 text-sm">
                                            <p className="font-semibold capitalize text-[#1C1B1A]">
                                                {c.commodity_type?.replace('_', ' ')}
                                            </p>
                                            <Text type="secondary">
                                                {formatNumber(c.weight_ton, 1)} ton · {c.origin} → {c.destination}
                                            </Text>
                                        </div>
                                    ))
                                )}
                            </Card>
                        )}
                    </div>
                )}

                {tab === 'approvals' && (
                    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                        <Card
                            title="Persetujuan Internal"
                            actions={
                                actions.can_approve && (
                                    <Button type="primary" size="small" style={{ background: '#2F8F68', borderColor: '#2F8F68' }} onClick={() => setModal('approve')}>
                                        Beri Keputusan
                                    </Button>
                                )
                            }
                        >
                            {approvals.filter((a) => a.scope === 'internal').length === 0 ? (
                                <Paragraph type="secondary" className="text-sm mb-0">
                                    Belum ada persetujuan internal. Diberikan supervisor setelah pemeriksaan.
                                </Paragraph>
                            ) : (
                                <ul className="space-y-3">
                                    {approvals.filter((a) => a.scope === 'internal').map((a) => (
                                        <li key={a.id} className="rounded-lg border border-[#E7E1D9] p-3">
                                            <div className="flex items-center justify-between">
                                                <Badge
                                                    tone={
                                                        a.status === 'approved'
                                                            ? 'success'
                                                            : a.status === 'rejected'
                                                              ? 'danger'
                                                              : 'warning'
                                                    }
                                                >
                                                    {a.status === 'approved' ? 'Disetujui' : a.status === 'rejected' ? 'Ditolak' : 'Perlu Revisi'}
                                                </Badge>
                                                <Text type="secondary" className="text-xs">{formatDateTime(a.decision_timestamp)}</Text>
                                            </div>
                                            <p className="mt-1.5 text-xs text-[#8A8580]">{a.approver_name} · persetujuan internal</p>
                                            {a.comments && <p className="mt-1 text-sm italic text-[#1C1B1A]">"{a.comments}"</p>}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Card>
                        <Card
                            title="Persetujuan Eksternal"
                            actions={
                                actions.can_confirm_external && (
                                    <Button type="primary" size="small" onClick={() => setModal('external')}>
                                        Catat dengan Bukti
                                    </Button>
                                )
                            }
                        >
                            <div className="rounded-lg border border-[#E7E1D9] p-3 text-sm">
                                <p className="font-medium text-[#1C1B1A]">
                                    Status:{' '}
                                    {voyage.external_approval_status === 'terkonfirmasi'
                                        ? 'Terkonfirmasi'
                                        : voyage.external_approval_status === 'menunggu'
                                          ? 'Menunggu'
                                          : 'Tidak berlaku untuk jenis perjalanan ini'}
                                </p>
                                {voyage.has_external_evidence && (
                                    <p className="mt-1 flex items-center gap-1.5 text-xs text-[#2F8F68]">
                                        <CheckCircle2 size={14} /> Bukti lampiran tersimpan
                                    </p>
                                )}
                            </div>
                            <div className="mt-3 rounded-lg bg-[#D99A2B]/5 p-3">
                                <Text type="secondary" className="text-xs leading-relaxed">
                                    Persetujuan eksternal hanya dapat dikonfirmasi dengan <strong>lampiran
                                    bukti/sumber sah</strong> (berkas dari pihak otoritas/agen/penerima).
                                    Persetujuan internal di sistem ini <strong>bukan</strong> persetujuan resmi
                                    otoritas pelayaran.
                                </Text>
                            </div>
                        </Card>
                    </div>
                )}

                {tab === 'timeline' && (
                    <Card title="Timeline Perjalanan" description="Semua kejadian riil perjalanan beserta waktu, pelaku, dan status.">
                        {events.length === 0 ? (
                            <Paragraph type="secondary" className="text-sm mb-0">Belum ada riwayat kejadian tercatat.</Paragraph>
                        ) : (
                            <Timeline
                                items={events.map((e) => {
                                    const fromLabel = e.from_label || (e.from_status ? (VOYAGE_STATUS_LABELS[e.from_status] ?? e.from_status) : null);
                                    const toLabel = e.to_label || (e.to_status ? (VOYAGE_STATUS_LABELS[e.to_status] ?? e.to_status) : null);
                                    const hasStatusChange = Boolean(fromLabel && toLabel);
                                    const isBackward = Boolean(e.is_backward);
                                    const reason = e.reason || (e.payload && e.payload.reason) || null;

                                    return {
                                        color: isBackward ? '#D99A2B' : '#C1121F',
                                        children: (
                                            <div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <p className="text-sm font-semibold text-[#1C1B1A]">
                                                        {isBackward
                                                            ? 'Status Dimundurkan'
                                                            : (hasStatusChange ? 'Perubahan Status' : e.description)}
                                                    </p>
                                                    {isBackward && (
                                                        <span className="rounded bg-[#D99A2B]/15 px-2 py-0.5 text-[11px] font-semibold text-[#D99A2B]">
                                                            Status Mundur
                                                        </span>
                                                    )}
                                                </div>
                                                {hasStatusChange && (
                                                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                                                        <Text type="secondary">Status sebelumnya:</Text>
                                                        <span className="rounded bg-[#FAF7F2] px-2 py-0.5 font-medium text-[#1C1B1A]">
                                                            {fromLabel}
                                                        </span>
                                                        <Text type="secondary">menjadi</Text>
                                                        <span className="rounded bg-[#C1121F]/10 px-2 py-0.5 font-semibold text-[#C1121F]">
                                                            {toLabel}
                                                        </span>
                                                    </div>
                                                )}
                                                {reason && (
                                                    <p className="mt-1.5 rounded bg-[#FAF7F2]/80 px-2.5 py-1.5 text-xs text-[#1C1B1A]">
                                                        <Text type="secondary" className="font-semibold">Alasan: </Text>
                                                        {reason}
                                                    </p>
                                                )}
                                                <p className="mt-1 text-xs text-[#8A8580]">
                                                    {formatDateTime(e.occurred_at)} · Pelaku: {e.user_name ?? 'Sistem'}
                                                </p>
                                            </div>
                                        ),
                                    };
                                })}
                            />
                        )}
                    </Card>
                )}

                {tab === 'expenses' && (
                    <Card title="Operational Expenses" description="Biaya ter-tag perjalanan (bill), dari modul Keuangan.">
                        {expenses.bills.length === 0 ? (
                            <Paragraph type="secondary" className="text-sm mb-0">
                                Belum ada biaya tercatat untuk perjalanan ini.
                            </Paragraph>
                        ) : (
                            <>
                                <ul className="space-y-2">
                                    {expenses.bills.map((b) => (
                                        <li key={b.id} className="flex items-center justify-between rounded-lg border border-[#E7E1D9] px-3 py-2 text-sm">
                                            <span className="font-medium text-[#1C1B1A]">{b.number} · {b.category}</span>
                                            <span className="tabular-nums text-[#1C1B1A]">{formatRupiah(b.total)}</span>
                                        </li>
                                    ))}
                                </ul>
                                <Divider style={{ margin: '16px 0', borderColor: '#E7E1D9' }} />
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-semibold text-[#1C1B1A]">Total Biaya</span>
                                    <span className="text-lg font-semibold tabular-nums text-[#C1121F]">
                                        {formatRupiah(expenses.total)}
                                    </span>
                                </div>
                            </>
                        )}
                    </Card>
                )}

                {tab === 'reports' && (
                    <Card
                        title="Ringkasan Perjalanan"
                        actions={
                            <Button icon={<Printer size={14} />} onClick={() => window.print()}>
                                Cetak
                            </Button>
                        }
                    >
                        <Descriptions
                            column={{ xs: 1, sm: 2, md: 3 }}
                            size="small"
                            items={[
                                { key: 'code', label: 'Kode', children: voyage.voyage_code },
                                { key: 'vessel', label: 'Vessel', children: voyage.vessel_name },
                                { key: 'route', label: 'Rute', children: `${voyage.origin} → ${voyage.destination}` },
                                { key: 'status', label: 'Status', children: VOYAGE_STATUS_LABELS[voyage.voyage_status] },
                                { key: 'dep', label: 'Berangkat', children: formatDateTime(voyage.actual_departure) },
                                { key: 'arr', label: 'Tiba', children: formatDateTime(voyage.actual_arrival) },
                                { key: 'checklist', label: 'Checklist Wajib', children: `${checklistTerpenuhi.length}/${checklistWajib.length} terpenuhi` },
                                { key: 'cost', label: 'Biaya', children: formatRupiah(expenses.total) },
                                { key: 'pic', label: 'PIC', children: voyage.person_in_charge },
                            ]}
                        />
                        <div className="mt-6 rounded-lg bg-[#FAF7F2] p-3">
                            <Text type="secondary" className="text-xs">
                                Dokumen resmi PT Bunga Teratai - DEMO DATA. Indikator kesiapan bersifat internal.
                            </Text>
                        </div>
                    </Card>
                )}
            </Skeleton>

            <Modal show={modal === 'approve'} onClose={() => setModal(null)} maxWidth="md">
                <form onSubmit={submitApprove} className="p-6">
                    <h2 className="text-lg font-semibold text-[#1C1B1A]">Keputusan Persetujuan Internal</h2>
                    <p className="mt-1 text-sm text-[#8A8580]">
                        Keputusan tercatat di histori & audit trail. Bukan persetujuan otoritas.
                    </p>
                    <div className="mt-4">
                        <label className="text-sm font-medium text-[#1C1B1A]">Keputusan</label>
                        <select
                            value={approveForm.data.decision}
                            onChange={(e) => approveForm.setData('decision', e.target.value)}
                            className="mt-1 block w-full rounded-md border border-[#E7E1D9] bg-white p-2 text-sm shadow-sm focus:border-[#C1121F] focus:outline-none focus:ring-2 focus:ring-[#C1121F]/20"
                        >
                            <option value="approved">Approve — Setujui</option>
                            <option value="revision_required">Request Revision — Minta Revisi</option>
                            <option value="rejected">Reject — Tolak</option>
                        </select>
                    </div>
                    <div className="mt-4">
                        <label className="text-sm font-medium text-[#1C1B1A]">Komentar *</label>
                        <textarea
                            value={approveForm.data.comments}
                            onChange={(e) => approveForm.setData('comments', e.target.value)}
                            rows={3}
                            className="mt-1 block w-full rounded-md border border-[#E7E1D9] bg-white p-2 text-sm shadow-sm focus:border-[#C1121F] focus:outline-none focus:ring-2 focus:ring-[#C1121F]/20"
                        />
                        {approveForm.errors.comments && (
                            <p className="mt-1 text-xs text-[#C1121F]">{approveForm.errors.comments}</p>
                        )}
                    </div>
                    <div className="mt-5 flex justify-end gap-3">
                        <SecondaryButton type="button" onClick={() => setModal(null)}>
                            Batal
                        </SecondaryButton>
                        <PrimaryButton disabled={approveForm.processing || !approveForm.data.comments.trim()}>
                            Simpan Keputusan
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>

            <Modal show={modal === 'external'} onClose={() => setModal(null)} maxWidth="md">
                <form onSubmit={submitExternal} className="p-6">
                    <h2 className="text-lg font-semibold text-[#1C1B1A]">Catat Persetujuan Eksternal</h2>
                    <p className="mt-1 text-sm text-[#8A8580]">
                        Wajib melampirkan bukti sah (berkas dari otoritas/agen/penerima).
                    </p>
                    <div className="mt-4">
                        <label className="text-sm font-medium text-[#1C1B1A]">Lampiran Bukti *</label>
                        <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => externalForm.setData('evidence', e.target.files?.[0] ?? null)}
                            className="mt-1 block w-full text-sm text-[#8A8580] file:mr-3 file:rounded-lg file:border-0 file:bg-[#FAF7F2] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-[#1C1B1A] hover:file:bg-[#E7E1D9]"
                        />
                    </div>
                    <div className="mt-4">
                        <label className="text-sm font-medium text-[#1C1B1A]">Sumber / Keterangan *</label>
                        <input
                            value={externalForm.data.source_note}
                            onChange={(e) => externalForm.setData('source_note', e.target.value)}
                            placeholder="mis. Surat Persetujuan KSOP Samarinda No. ..."
                            className="mt-1 block w-full rounded-md border border-[#E7E1D9] bg-white p-2 text-sm shadow-sm focus:border-[#C1121F] focus:outline-none focus:ring-2 focus:ring-[#C1121F]/20"
                        />
                    </div>
                    <div className="mt-5 flex justify-end gap-3">
                        <SecondaryButton type="button" onClick={() => setModal(null)}>
                            Batal
                        </SecondaryButton>
                        <PrimaryButton disabled={externalForm.processing || !externalForm.data.evidence}>
                            Simpan Bukti
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>

            <Modal show={modal === 'status'} onClose={() => setModal(null)} maxWidth="md">
                <form onSubmit={submitStatus} className="p-6">
                    <h2 className="text-lg font-semibold text-[#1C1B1A]">Ubah Status Perjalanan</h2>
                    <p className="mt-1 text-sm text-[#8A8580]">
                        Status saat ini: <strong>{VOYAGE_STATUS_LABELS[voyage.voyage_status] ?? voyage.voyage_status}</strong>.
                    </p>

                    {isBackwardTransition(voyage.voyage_status, statusForm.data.to) && (
                        <div className="mt-3 rounded-md bg-[#D99A2B]/15 p-3 text-xs text-[#D99A2B]">
                            <strong>Perhatian:</strong> Anda sedang memundurkan status. Deskripsi alasan perubahan wajib diisi dan tidak boleh kosong atau hanya berisi spasi.
                        </div>
                    )}

                    <div className="mt-4">
                        <label className="text-sm font-medium text-[#1C1B1A]">Pindah ke</label>
                        <select
                            value={statusForm.data.to}
                            onChange={(e) => {
                                setNextStatus(e.target.value);
                                statusForm.setData('to', e.target.value);
                            }}
                            className="mt-1 block w-full rounded-md border border-[#E7E1D9] bg-white p-2 text-sm shadow-sm focus:border-[#C1121F] focus:outline-none focus:ring-2 focus:ring-[#C1121F]/20"
                        >
                            {voyage.allowed_transitions.map((s: string) => {
                                const isBwd = isBackwardTransition(voyage.voyage_status, s);
                                return (
                                    <option key={s} value={s}>
                                        {isBwd ? '<< Mundur ke: ' : ''}{VOYAGE_STATUS_LABELS[s] ?? s}
                                    </option>
                                );
                            })}
                        </select>
                    </div>
                    <div className="mt-4">
                        <label className="text-sm font-medium text-[#1C1B1A]">
                            {isBackwardTransition(voyage.voyage_status, statusForm.data.to)
                                ? 'Alasan Perubahan Status (Wajib)'
                                : statusForm.data.to === 'ready_for_departure'
                                  ? 'Catatan — jadi alasan override bila kesiapan awak < 100%'
                                  : 'Catatan'}
                        </label>
                        <input
                            value={statusForm.data.note}
                            onChange={(e) => statusForm.setData('note', e.target.value)}
                            placeholder={
                                isBackwardTransition(voyage.voyage_status, statusForm.data.to)
                                    ? 'Tuliskan alasan jelas pemunduran status...'
                                    : statusForm.data.to === 'ready_for_departure'
                                      ? 'Wajib diisi jika kesiapan awak kapal belum 100% (tercatat di timeline)...'
                                      : 'Catatan opsional...'
                            }
                            required={isBackwardTransition(voyage.voyage_status, statusForm.data.to)}
                            className="mt-1 block w-full rounded-md border border-[#E7E1D9] bg-white p-2 text-sm shadow-sm focus:border-[#C1121F] focus:outline-none focus:ring-2 focus:ring-[#C1121F]/20"
                        />
                    </div>
                    <div className="mt-5 flex justify-end gap-3">
                        <SecondaryButton type="button" onClick={() => setModal(null)}>
                            Batal
                        </SecondaryButton>
                        <PrimaryButton
                            disabled={
                                statusForm.processing ||
                                (isBackwardTransition(voyage.voyage_status, statusForm.data.to) &&
                                    (!statusForm.data.note || statusForm.data.note.trim() === ''))
                            }
                        >
                            {statusForm.processing ? <Loader2 size={16} className="animate-spin" /> : null}
                            Simpan Status
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>

            <ConfirmModal
                show={modal === 'cancel'}
                title="Batalkan perjalanan ini?"
                message={`Perjalanan ${voyage.voyage_code} (${voyage.vessel_name}) akan dibatalkan. Transisi status tercatat di timeline; dokumen tetap tersimpan.`}
                confirmLabel="Ya, batalkan"
                tone="danger"
                processing={busy}
                onClose={() => setModal(null)}
                onConfirm={() => {
                    setBusy(true);
                    router.post(
                        `/perjalanan/${voyage.id}/status`,
                        { to: 'cancelled', note: 'Dibatalkan oleh pengguna' },
                        {
                            preserveScroll: true,
                            onFinish: () => { setBusy(false); setModal(null); },
                        },
                    );
                }}
            />
            </div>
        </AuthenticatedLayout>
    );
}
