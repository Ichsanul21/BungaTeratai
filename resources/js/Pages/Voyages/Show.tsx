import Badge, { type BadgeTone } from '@/Components/ui/Badge';
import Card from '@/Components/ui/Card';
import Modal from '@/Components/Modal';
import PageHeader from '@/Components/ui/PageHeader';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TabNav from '@/Components/ui/TabNav';
import ConfirmModal from '@/Components/ui/ConfirmModal';
import { VOYAGE_STATUS_LABELS } from '@/Constants/navigation';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { classNames, formatDate, formatDateTime, formatNumber, formatRupiah } from '@/lib/format';
import { type PageProps } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    Anchor,
    ArrowLeft,
    CheckCircle2,
    ClipboardCheck,
    Coins,
    ExternalLink,
    FileStack,
    GitCommitVertical,
    ListChecks,
    Loader2,
    Map as MapIcon,
    MessageSquare,
    Printer,
    ShieldCheck,
    ShieldX,
    Ship,
    Users,
    Wallet,
    X,
} from 'lucide-react';
import { FormEvent, useState } from 'react';

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

export default function VoyagesShow({
    voyage,
    relationships,
    cargo,
    checklists,
    documents,
    linkableDocuments,
    agency,
    events,
    approvals,
    expenses,
    actions,
}: PageProps<{
    voyage: Record<string, any>;
    relationships: Array<Record<string, any>>;
    cargo: Array<Record<string, any>>;
    checklists: Array<Record<string, any>>;
    documents: Array<Record<string, any>>;
    linkableDocuments?: Array<Record<string, any>>;
    agency?: Array<Record<string, any>>;
    events: Array<Record<string, any>>;
    approvals: Array<Record<string, any>>;
    expenses: { bills: Array<Record<string, any>>; total: number };
    actions: { can_update: boolean; can_approve: boolean; can_confirm_external: boolean };
}>) {
    const [tab, setTab] = useState('overview');
    const [modal, setModal] = useState<null | 'approve' | 'external' | 'status' | 'cancel'>(null);
    const [nextStatus, setNextStatus] = useState('');
    const [busy, setBusy] = useState(false);

    const approveForm = useForm({ decision: 'approved', comments: '' });
    const externalForm = useForm({ evidence: null as File | null, source_note: '' });
    const statusForm = useForm({ to: '', note: '' });

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
        router.post(
            `/perjalanan/${voyage.id}/status`,
            { to: statusForm.data.to, note: statusForm.data.note },
            {
                preserveScroll: true,
                onSuccess: () => setModal(null),
            },
        );
    };

    const checklistWajib = checklists.filter((c) => c.applicability === 'wajib');
    const checklistTerpenuhi = checklistWajib.filter((c) => c.completion_status === 'terpenuhi');

    return (
        <AuthenticatedLayout>
            <Head title={`Perjalanan ${voyage.voyage_code}`} />

            <div className="mb-4">
                <Link href="/perjalanan" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
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
                                <Link
                                    href={`/perjalanan/${voyage.id}/edit`}
                                    className="inline-flex items-center gap-2 rounded-lg border border-hairline bg-white px-3 py-2 text-sm font-medium text-ink transition hover:border-primary/40"
                                >
                                    Edit
                                </Link>
                                {!['cancelled', 'completed'].includes(voyage.voyage_status) && (
                                    <button
                                        type="button"
                                        onClick={() => setModal('cancel')}
                                        className="inline-flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm font-medium text-primary transition hover:bg-primary/20"
                                    >
                                        Batalkan
                                    </button>
                                )}
                            </>
                        )}
                        {actions.can_update && voyage.allowed_transitions.length > 0 && (
                            <button
                                type="button"
                                onClick={() => {
                                    setNextStatus(voyage.allowed_transitions[0]);
                                    statusForm.setData('to', voyage.allowed_transitions[0]);
                                    setModal('status');
                                }}
                                className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover"
                            >
                                Ubah Status →
                            </button>
                        )}
                    </>
                }
            />

            <TabNav tabs={tabs} active={tab} onChange={setTab} />

            {tab === 'overview' && (
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
                    <Card title="Status Perjalanan" className="xl:col-span-2">
                        <div className="flex flex-wrap items-center gap-2">
                            {(Object.keys(VOYAGE_STATUS_LABELS) as string[])
                                .filter((s) => !['delayed', 'cancelled'].includes(s))
                                .map((s, i, arr) => {
                                    const currentIdx = arr.indexOf(voyage.voyage_status);
                                    const isDone = currentIdx >= 0 && i < arr.indexOf(voyage.voyage_status) === false && false;
                                    const reached = arr.indexOf(voyage.voyage_status) !== -1 && i <= arr.indexOf(voyage.voyage_status);
                                    return (
                                        <div key={s} className="flex items-center">
                                            <span
                                                className={classNames(
                                                    'rounded-full px-2.5 py-1 text-xs font-medium',
                                                    s === voyage.voyage_status
                                                        ? 'bg-primary text-white'
                                                        : reached
                                                          ? 'bg-ok/15 text-ok'
                                                          : 'bg-appbg text-muted',
                                                )}
                                            >
                                                {VOYAGE_STATUS_LABELS[s]}
                                            </span>
                                            {i < arr.length - 1 && <span className="mx-1 h-px w-4 bg-hairline" />}
                                        </div>
                                    );
                                })}
                        </div>
                        <div className="mt-5 grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                            <div>
                                <p className="text-xs uppercase tracking-wide text-muted">Jadwal Berangkat</p>
                                <p className="mt-0.5 font-medium text-ink">{formatDateTime(voyage.planned_departure)}</p>
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-wide text-muted">Berangkat Aktual</p>
                                <p className="mt-0.5 font-medium text-ink">{formatDateTime(voyage.actual_departure)}</p>
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-wide text-muted">Perkiraan Tiba</p>
                                <p className="mt-0.5 font-medium text-ink">{formatDateTime(voyage.estimated_arrival)}</p>
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-wide text-muted">Tiba Aktual</p>
                                <p className="mt-0.5 font-medium text-ink">{formatDateTime(voyage.actual_arrival)}</p>
                            </div>
                        </div>
                        <div className="mt-4">
                            <p className="text-xs uppercase tracking-wide text-muted">Progres Checklist Wajib</p>
                            <div className="mt-1.5 flex items-center gap-3">
                                <div className="h-2 flex-1 overflow-hidden rounded-full bg-appbg">
                                    <div
                                        className={classNames(
                                            'h-full rounded-full',
                                            checklistWajib.length > 0 &&
                                                checklistTerpenuhi.length === checklistWajib.length
                                                ? 'bg-ok'
                                                : 'bg-warn',
                                        )}
                                        style={{
                                            width: `${
                                                checklistWajib.length > 0
                                                    ? (checklistTerpenuhi.length / checklistWajib.length) * 100
                                                    : 100
                                            }%`,
                                        }}
                                    />
                                </div>
                                <span className="text-sm font-semibold tabular-nums text-ink">
                                    {checklistTerpenuhi.length}/{checklistWajib.length}
                                </span>
                            </div>
                        </div>
                        {voyage.notes && (
                            <p className="mt-4 rounded-lg bg-appbg p-3 text-sm text-muted">{voyage.notes}</p>
                        )}
                        <p className="mt-4 rounded-lg bg-maritime/5 p-2.5 text-[11px] text-muted">
                            Status kesiapan adalah <strong>indikator internal sistem</strong> — bukan
                            pengganti penilaian nakhoda atau persetujuan otoritas pelayaran.
                        </p>
                    </Card>
                    <Card title="Identitas Perjalanan">
                        <dl className="space-y-3 text-sm">
                            {[
                                ['Kegiatan', voyage.activity_type?.replace('_', ' ')],
                                ['PIC', voyage.person_in_charge],
                                ['Customer', voyage.customer_name ?? '—'],
                                ['No. Kontrak', voyage.contract_no ?? '—'],
                                ['Tipe Rute', voyage.route_type],
                            ].map(([k, v]) => (
                                <div key={k as string}>
                                    <dt className="text-xs uppercase tracking-wide text-muted">{k}</dt>
                                    <dd className="font-medium capitalize text-ink">{v}</dd>
                                </div>
                            ))}
                        </dl>
                    </Card>
                </div>
            )}

            {tab === 'vessel' && (
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                    <Card title="Kapal Utama">
                        <Link
                            href={`/armada/${voyage.vessel_id}`}
                            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
                        >
                            <Ship size={16} /> {voyage.vessel_name} ({voyage.vessel_type?.replace('_', ' ')})
                        </Link>
                        <p className="mt-2 text-sm text-muted">
                            Rute: {voyage.origin} → {voyage.destination} ({voyage.route_type})
                        </p>
                    </Card>
                    <Card
                        title="Relasi Tugboat ↔ Tongkang"
                        description="Dicatat per perjalanan — bukan permanen."
                    >
                        {relationships.length === 0 ? (
                            <p className="text-sm text-muted">
                                Tidak ada relasi (kapal penumpang / tanpa penarikan).
                            </p>
                        ) : (
                            relationships.map((r, i) => (
                                <div key={i} className="flex items-center gap-3 text-sm">
                                    <span className="rounded-lg bg-maritime/10 px-2.5 py-1 font-medium text-maritime">
                                        {r.tugboat_name}
                                    </span>
                                    <span className="text-muted">menarik</span>
                                    <span className="rounded-lg bg-warn/10 px-2.5 py-1 font-medium text-warn">
                                        {r.barge_name}
                                    </span>
                                </div>
                            ))
                        )}
                        {cargo.length > 0 && (
                            <div className="mt-4 border-t border-hairline pt-4">
                                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Muatan</p>
                                {cargo.map((c) => (
                                    <div key={c.id} className="text-sm text-ink">
                                        <span className="capitalize">{c.commodity_type?.replace('_', ' ')}</span>
                                        {c.weight_ton && (
                                            <span className="text-muted"> · {formatNumber(c.weight_ton, 1)} ton</span>
                                        )}
                                        <span className="text-muted"> · {c.origin} → {c.destination}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                </div>
            )}

            {tab === 'documents' && (
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                    <Card title="Dokumen Tertaut" description="Dipakai ulang tanpa upload ganda.">
                        {documents.length === 0 ? (
                            <p className="text-sm text-muted">Belum ada dokumen tertaut.</p>
                        ) : (
                            <ul className="space-y-2">
                                {documents.map((d) => (
                                    <li key={d.id} className="flex items-center justify-between gap-2 rounded-lg border border-hairline px-3 py-2 text-sm">
                                        <Link href={`/dokumen/${d.id}`} className="font-medium text-ink hover:text-primary">
                                            {d.document_name}
                                        </Link>
                                        <span className="text-xs text-muted">
                                            {d.group_code} · {d.verification_status}
                                        </span>
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
                                if (! sel) return;
                                router.post(
                                    `/perjalanan/${voyage.id}/link-document`,
                                    { document_id: sel },
                                    { preserveScroll: true },
                                );
                            }}
                        >
                            <select
                                name="document_id"
                                className="block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary"
                            >
                                <option value="">— pilih dokumen —</option>
                                {(linkableDocuments ?? []).map((d) => (
                                    <option key={d.id} value={d.id}>
                                        {d.document_name}
                                    </option>
                                ))}
                            </select>
                            <p className="mt-2 text-xs text-muted">
                                Pilih dokumen kapal atau perusahaan yang BELUM tertaut ke perjalanan ini.
                            </p>
                        </form>
                    </Card>
                </div>
            )}

            {tab === 'checklist' && (
                <div className="overflow-hidden rounded-xl border border-hairline bg-white shadow-sm">
                    <table className="min-w-full divide-y divide-hairline text-sm">
                        <thead className="bg-appbg">
                            <tr>
                                {['Grup', 'Persyaratan', 'Sifat', 'Status', 'Aksi'].map((h) => (
                                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-hairline">
                            {checklists.map((c) => (
                                <tr key={c.id}>
                                    <td className="px-4 py-3 text-muted">{c.group_code}</td>
                                    <td className="px-4 py-3 font-medium text-ink">{c.name}</td>
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
                                                    className="rounded-md border-gray-300 py-1 text-xs shadow-sm focus:border-primary focus:ring-primary"
                                                >
                                                    <option value="terpenuhi">Terpenuhi</option>
                                                    <option value="belum">Belum</option>
                                                    <option value="tidak_berlaku">Tidak Berlaku</option>
                                                </select>
                                                <button type="submit" className="text-xs font-medium text-primary hover:underline">
                                                    Simpan
                                                </button>
                                            </form>
                                        ) : (
                                            <span className="text-xs text-muted">—</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <p className="border-t border-hairline bg-appbg p-3 text-xs text-muted">
                        Item kondisional tidak diwajibkan untuk semua perjalanan — hanya berlaku sesuai
                        jenis kapal & muatan.
                    </p>
                </div>
            )}

            {tab === 'berkas' && (
                <div className="space-y-5">
                    {/* Stepper tahap charter */}
                    {voyage.charter_stage && (
                        <Card title="Tahap Berkas SPAL" description="SI → SPAL → DP → Keagenan Muat → DSR → Pelunasan → Keagenan Bongkar → Closing.">
                            {(() => {
                                const stages = CHARTER_STAGES;
                                const labels = CHARTER_LABELS;
                                const currentIdx = stages.indexOf(voyage.charter_stage);
                                return (
                                    <div className="flex flex-wrap items-center gap-1">
                                        {stages.map((s, i) => (
                                            <span key={s} className="flex items-center">
                                                <span
                                                    className={classNames(
                                                        'rounded-full px-2.5 py-1 text-xs font-medium',
                                                        i === currentIdx
                                                            ? 'bg-primary text-white'
                                                            : i < currentIdx
                                                              ? 'bg-ok/15 text-ok'
                                                              : 'bg-appbg text-muted',
                                                    )}
                                                >
                                                    {labels[s]}
                                                </span>
                                                {i < stages.length - 1 && <span className="mx-1 h-px w-3 bg-hairline" />}
                                            </span>
                                        ))}
                                    </div>
                                );
                            })()}
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
                                    className="mt-4 flex flex-wrap items-end gap-3 border-t border-hairline pt-4"
                                >
                                    <div>
                                        <label className="text-xs font-medium text-muted">Tahap saat ini</label>
                                        <select name="charter_stage" defaultValue={voyage.charter_stage} className="mt-1 block rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary">
                                            {CHARTER_STAGES.map((s) => (
                                                <option key={s} value={s}>{CHARTER_LABELS[s]}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-muted">DSR — Total Muatan (MT)</label>
                                        <input name="dsr_mt" type="number" step="0.01" defaultValue={voyage.dsr_mt ?? ''} className="mt-1 block w-32 rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-muted">Tanggal DSR</label>
                                        <input name="dsr_date" type="date" defaultValue={voyage.dsr_date ?? ''} className="mt-1 block rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary" />
                                    </div>
                                    <button type="submit" className="rounded-lg bg-ink px-3.5 py-2 text-sm font-medium text-white hover:bg-black">
                                        Simpan Tahap
                                    </button>
                                </form>
                            )}
                            <p className="mt-3 text-xs text-muted">
                                Tahap <strong>pelunasan</strong> membutuhkan DSR dari nakhoda. Invoice DP/pelunasan diterbitkan lewat menu Keuangan → Invoice (tag voyage ini).
                            </p>
                        </Card>
                    )}

                    {/* Ringkasan SPAL */}
                    {voyage.spal_number && (
                        <Card title={`SPAL ${voyage.spal_number}`}>
                            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm md:grid-cols-3">
                                {[
                                    ['Tanggal SPAL', voyage.spal_date],
                                    ['Sistem Bayar', (voyage.payment_terms ?? '').replace('_', ' ')],
                                    ['Freight', voyage.freight_rate ? `${formatRupiah(voyage.freight_rate)}${voyage.freight_unit === 'MT' ? ' /MT' : ' lumpsum'}` : '—'],
                                    ['Laytime', voyage.laytime_days ? `${voyage.laytime_days} hari` : '—'],
                                    ['Demurrage', voyage.demurrage_per_day ? `${formatRupiah(voyage.demurrage_per_day)} /hari` : '—'],
                                    ['Muat', voyage.jetty_loading ?? '—'],
                                    ['Bongkar', voyage.jetty_discharge ?? '—'],
                                    ['Shipper', voyage.shipper ?? '—'],
                                    ['Consignee', voyage.consignee ?? '—'],
                                ].map(([k, v]) => (
                                    <div key={k as string}>
                                        <dt className="text-xs uppercase tracking-wide text-muted">{k}</dt>
                                        <dd className="mt-0.5 font-medium capitalize text-ink">{v}</dd>
                                    </div>
                                ))}
                            </dl>
                        </Card>
                    )}

                    {/* Keagenan */}
                    <Card title="Penunjukan Keagenan" description="Surat penunjukan agen sebelum kapal tiba di pelabuhan muat & bongkar.">
                        {(agency ?? []).length === 0 ? (
                            <p className="text-sm text-muted">Belum ada surat keagenan.</p>
                        ) : (
                            <ul className="space-y-2">
                                {(agency ?? []).map((ag: any) => (
                                    <li key={ag.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-hairline px-3 py-2.5 text-sm">
                                        <div>
                                            <p className="font-medium text-ink">
                                                <span className="font-mono text-xs text-muted">{ag.letter_no}</span> · {ag.agent_name}
                                            </p>
                                            <p className="text-xs capitalize text-muted">
                                                {ag.port_type} · {ag.port_name ?? '—'} · Nakhoda: {ag.captain_name ?? '—'} {ag.captain_phone ? `(${ag.captain_phone})` : ''} · GRT {ag.grt ?? '—'}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs font-medium">
                                            <span className="text-muted">{formatDate(ag.letter_date)}</span>
                                            {actions.can_update && (
                                                <button
                                                    type="button"
                                                    onClick={() => router.delete(`/perjalanan/${voyage.id}/keagenan/${ag.id}`, { preserveScroll: true })}
                                                    className="text-primary hover:underline"
                                                >
                                                    Hapus
                                                </button>
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
                                className="mt-4 grid grid-cols-2 gap-3 border-t border-hairline pt-4 md:grid-cols-4"
                            >
                                <div>
                                    <label className="text-xs font-medium text-muted">Jenis Pelabuhan *</label>
                                    <select name="port_type" className="mt-1 block rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary">
                                        <option value="muat">Muat</option>
                                        <option value="bongkar">Bongkar</option>
                                        <option value="lainnya">Lainnya</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-muted">Nama Pelabuhan</label>
                                    <input name="port_name" className="mt-1 block rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary" />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-muted">Agen *</label>
                                    <input name="agent_name" required className="mt-1 block rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary" />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-muted">Alamat Agen</label>
                                    <input name="agent_address" className="mt-1 block rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary" />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-muted">Nakhoda</label>
                                    <input name="captain_name" className="mt-1 block rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary" />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-muted">HP Nakhoda</label>
                                    <input name="captain_phone" className="mt-1 block rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary" />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-muted">Tanggal Surat</label>
                                    <input name="letter_date" type="date" className="mt-1 block rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary" />
                                </div>
                                <div className="flex items-end">
                                    <button type="submit" className="rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-white hover:bg-primary-hover">
                                        Terbitkan Surat
                                    </button>
                                </div>
                            </form>
                        )}
                    </Card>

                    {/* Dokumen berkait */}
                    <Card title="Dokumen Berkas Perjalanan" description="Dokumen tertaut perjalanan ini — arsip terpadu.">
                        {documents.length === 0 ? (
                            <p className="text-sm text-muted">Belum ada dokumen tertaut — gunakan tab Documents untuk menautkan.</p>
                        ) : (
                            <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
                                {documents.map((d: any) => (
                                    <li key={d.id} className="flex items-center justify-between rounded-lg border border-hairline px-3 py-2 text-sm">
                                        <Link href={`/dokumen/${d.id}`} className="font-medium text-ink hover:text-primary">
                                            {d.document_name}
                                        </Link>
                                        <span className="text-xs text-muted">{d.group_code} · {d.verification_status}</span>
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
                                        <div key={k as string} className="rounded-lg bg-appbg p-3">
                                            <p className="text-xs uppercase tracking-wide text-muted">{k}</p>
                                            <p className="mt-0.5 text-xl font-semibold tabular-nums text-ink">
                                                {v ?? '—'}
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
                                        className="mt-4 flex flex-wrap items-end gap-2 border-t border-hairline pt-4"
                                    >
                                        <div>
                                            <label className="text-xs font-medium text-muted">Jenis Log</label>
                                            <select name="type" className="mt-1 block rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary">
                                                <option value="keberangkatan">Keberangkatan (jumlah naik)</option>
                                                <option value="kedatangan">Kedatangan (jumlah turun)</option>
                                                <option value="batal">Pembatalan tiket</option>
                                                <option value="perubahan_jumlah">Perubahan jumlah</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-muted">Jumlah</label>
                                            <input name="count" type="number" min={0} className="mt-1 block w-28 rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary" />
                                        </div>
                                        <button type="submit" className="rounded-lg bg-ink px-3.5 py-2 text-sm font-medium text-white hover:bg-black">
                                            Catat Log
                                        </button>
                                    </form>
                                )}
                                <p className="mt-3 text-xs text-muted">
                                    Data penumpang bersifat simulasi/ agregat — produksi wajib
                                    pembatasan akses data pribadi.
                                </p>
                            </Card>
                            <Card title="Cek Kesiapan Penumpang">
                                <p className="text-sm text-muted">
                                    Cek kesiapan (kapasitas vs jumlah, life jacket, APAR) dicatat pada
                                    pemeriksaan kesiapan sebelum berangkat — lihat Operations & Dokumen
                                    keselamatan kapal.
                                </p>
                            </Card>
                        </>
                    ) : (
                        <Card title="Muatan" description="Data terstruktur perjalanan tongkang/tugboat.">
                            {cargo.length === 0 ? (
                                <p className="text-sm text-muted">Tidak ada data muatan.</p>
                            ) : (
                                cargo.map((c) => (
                                    <div key={c.id} className="rounded-lg border border-hairline p-3 text-sm">
                                        <p className="font-semibold capitalize text-ink">
                                            {c.commodity_type?.replace('_', ' ')}
                                        </p>
                                        <p className="text-muted">
                                            {formatNumber(c.weight_ton, 1)} ton · {c.origin} → {c.destination}
                                        </p>
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
                                <button
                                    type="button"
                                    onClick={() => setModal('approve')}
                                    className="rounded-lg bg-ok px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                                >
                                    Beri Keputusan
                                </button>
                            )
                        }
                    >
                        {approvals.filter((a) => a.scope === 'internal').length === 0 ? (
                            <p className="text-sm text-muted">
                                Belum ada persetujuan internal. Diberikan supervisor setelah pemeriksaan.
                            </p>
                        ) : (
                            <ul className="space-y-3">
                                {approvals.filter((a) => a.scope === 'internal').map((a) => (
                                    <li key={a.id} className="rounded-lg border border-hairline p-3">
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
                                            <span className="text-xs text-muted">{formatDateTime(a.decision_timestamp)}</span>
                                        </div>
                                        <p className="mt-1.5 text-xs text-muted">{a.approver_name} · persetujuan internal</p>
                                        {a.comments && <p className="mt-1 text-sm italic text-ink">“{a.comments}”</p>}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Card>
                    <Card
                        title="Persetujuan Eksternal"
                        actions={
                            actions.can_confirm_external && (
                                <button
                                    type="button"
                                    onClick={() => setModal('external')}
                                    className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-hover"
                                >
                                    Catat dengan Bukti
                                </button>
                            )
                        }
                    >
                        <div className="rounded-lg border border-hairline p-3 text-sm">
                            <p className="font-medium text-ink">
                                Status:{' '}
                                {voyage.external_approval_status === 'terkonfirmasi'
                                    ? 'Terkonfirmasi'
                                    : voyage.external_approval_status === 'menunggu'
                                      ? 'Menunggu'
                                      : 'Tidak berlaku untuk jenis perjalanan ini'}
                            </p>
                            {voyage.has_external_evidence && (
                                <p className="mt-1 flex items-center gap-1.5 text-xs text-ok">
                                    <CheckCircle2 size={14} /> Bukti lampiran tersimpan
                                </p>
                            )}
                        </div>
                        <p className="mt-3 rounded-lg bg-warn/5 p-3 text-xs leading-relaxed text-muted">
                            Persetujuan eksternal hanya dapat dikonfirmasi dengan <strong>lampiran
                            bukti/sumber sah</strong> (berkas dari pihak otoritas/agen/penerima).
                            Persetujuan internal di sistem ini <strong>bukan</strong> persetujuan resmi
                            otoritas pelayaran.
                        </p>
                    </Card>
                </div>
            )}

            {tab === 'timeline' && (
                <Card title="Timeline Perjalanan" description="Semua kejadian dengan waktu & pencatat.">
                    <ol className="relative ms-3 space-y-5 border-s border-hairline ps-5">
                        {events.map((e) => (
                            <li key={e.id} className="relative">
                                <span className="absolute -start-[27px] top-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-primary" />
                                <p className="text-sm font-semibold text-ink">{e.description}</p>
                                <p className="text-xs text-muted">
                                    {formatDateTime(e.occurred_at)} · {e.user_name ?? 'Sistem'} · {e.event_type}
                                </p>
                            </li>
                        ))}
                    </ol>
                </Card>
            )}

            {tab === 'expenses' && (
                <Card
                    title="Operational Expenses"
                    description="Biaya ter-tag perjalanan (bill) — dari modul Keuangan."
                >
                    {expenses.bills.length === 0 ? (
                        <p className="text-sm text-muted">
                            Belum ada biaya tercatat untuk perjalanan ini.
                        </p>
                    ) : (
                        <>
                            <ul className="space-y-2">
                                {expenses.bills.map((b) => (
                                    <li key={b.id} className="flex items-center justify-between rounded-lg border border-hairline px-3 py-2 text-sm">
                                        <span className="font-medium text-ink">{b.number} · {b.category}</span>
                                        <span className="tabular-nums text-ink">{formatRupiah(b.total)}</span>
                                    </li>
                                ))}
                            </ul>
                            <div className="mt-4 flex items-center justify-between border-t border-hairline pt-4">
                                <span className="text-sm font-semibold text-ink">Total Biaya</span>
                                <span className="text-lg font-semibold tabular-nums text-primary">
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
                        <button
                            type="button"
                            onClick={() => window.print()}
                            className="inline-flex items-center gap-2 rounded-lg border border-hairline bg-white px-3 py-1.5 text-xs font-medium text-ink hover:border-primary/40"
                        >
                            <Printer size={14} /> Cetak
                        </button>
                    }
                >
                    <dl className="grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
                        {[
                            ['Kode', voyage.voyage_code],
                            ['Kapal', voyage.vessel_name],
                            ['Rute', `${voyage.origin} → ${voyage.destination}`],
                            ['Status', VOYAGE_STATUS_LABELS[voyage.voyage_status]],
                            ['Berangkat', formatDateTime(voyage.actual_departure)],
                            ['Tiba', formatDateTime(voyage.actual_arrival)],
                            ['Checklist Wajib', `${checklistTerpenuhi.length}/${checklistWajib.length} terpenuhi`],
                            ['Biaya', formatRupiah(expenses.total)],
                            ['PIC', voyage.person_in_charge],
                        ].map(([k, v]) => (
                            <div key={k as string}>
                                <dt className="text-xs uppercase tracking-wide text-muted">{k}</dt>
                                <dd className="mt-0.5 font-medium text-ink">{v}</dd>
                            </div>
                        ))}
                    </dl>
                    <p className="mt-6 rounded-lg bg-appbg p-3 text-xs text-muted">
                        Dokumen resmi PT Bunga Teratai — DEMO DATA. Indikator kesiapan bersifat internal.
                    </p>
                </Card>
            )}

            {/* Modal: Persetujuan internal */}
            <Modal show={modal === 'approve'} onClose={() => setModal(null)} maxWidth="md">
                <form onSubmit={submitApprove} className="p-6">
                    <h2 className="text-lg font-semibold text-ink">Keputusan Persetujuan Internal</h2>
                    <p className="mt-1 text-sm text-muted">
                        Keputusan tercatat di histori & audit trail. Bukan persetujuan otoritas.
                    </p>
                    <div className="mt-4">
                        <label className="text-sm font-medium text-ink">Keputusan</label>
                        <select
                            value={approveForm.data.decision}
                            onChange={(e) => approveForm.setData('decision', e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary"
                        >
                            <option value="approved">Approve — Setujui</option>
                            <option value="revision_required">Request Revision — Minta Revisi</option>
                            <option value="rejected">Reject — Tolak</option>
                        </select>
                    </div>
                    <div className="mt-4">
                        <label className="text-sm font-medium text-ink">Komentar *</label>
                        <textarea
                            value={approveForm.data.comments}
                            onChange={(e) => approveForm.setData('comments', e.target.value)}
                            rows={3}
                            className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary"
                        />
                        {approveForm.errors.comments && (
                            <p className="mt-1 text-xs text-primary">{approveForm.errors.comments}</p>
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

            {/* Modal: Konfirmasi eksternal */}
            <Modal show={modal === 'external'} onClose={() => setModal(null)} maxWidth="md">
                <form onSubmit={submitExternal} className="p-6">
                    <h2 className="text-lg font-semibold text-ink">Catat Persetujuan Eksternal</h2>
                    <p className="mt-1 text-sm text-muted">
                        Wajib melampirkan bukti sah (berkas dari otoritas/agen/penerima).
                    </p>
                    <div className="mt-4">
                        <label className="text-sm font-medium text-ink">Lampiran Bukti *</label>
                        <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => externalForm.setData('evidence', e.target.files?.[0] ?? null)}
                            className="mt-1 block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-appbg file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-ink hover:file:bg-hairline"
                        />
                    </div>
                    <div className="mt-4">
                        <label className="text-sm font-medium text-ink">Sumber / Keterangan *</label>
                        <input
                            value={externalForm.data.source_note}
                            onChange={(e) => externalForm.setData('source_note', e.target.value)}
                            placeholder="mis. Surat Persetujuan KSOP Samarinda No. …"
                            className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary"
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

            {/* Modal: Ubah status */}
            <Modal show={modal === 'status'} onClose={() => setModal(null)} maxWidth="md">
                <form onSubmit={submitStatus} className="p-6">
                    <h2 className="text-lg font-semibold text-ink">Ubah Status Perjalanan</h2>
                    <p className="mt-1 text-sm text-muted">
                        Status saat ini: <strong>{VOYAGE_STATUS_LABELS[voyage.voyage_status]}</strong>.
                        Transisi divalidasi server (checklist, approval, bukti eksternal).
                    </p>
                    <div className="mt-4">
                        <label className="text-sm font-medium text-ink">Pindah ke</label>
                        <select
                            value={statusForm.data.to}
                            onChange={(e) => {
                                setNextStatus(e.target.value);
                                statusForm.setData('to', e.target.value);
                            }}
                            className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary"
                        >
                            {voyage.allowed_transitions.map((s: string) => (
                                <option key={s} value={s}>
                                    {VOYAGE_STATUS_LABELS[s] ?? s}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="mt-4">
                        <label className="text-sm font-medium text-ink">Catatan</label>
                        <input
                            value={statusForm.data.note}
                            onChange={(e) => statusForm.setData('note', e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary"
                        />
                    </div>
                    <div className="mt-5 flex justify-end gap-3">
                        <SecondaryButton type="button" onClick={() => setModal(null)}>
                            Batal
                        </SecondaryButton>
                        <PrimaryButton disabled={statusForm.processing}>
                            {statusForm.processing ? <Loader2 size={16} className="animate-spin" /> : null}
                            Simpan Status
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>
            {/* Modal: Batalkan perjalanan */}
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
        </AuthenticatedLayout>
    );
}
