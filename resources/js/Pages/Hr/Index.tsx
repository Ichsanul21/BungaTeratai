import Badge, { type BadgeTone } from '@/Components/ui/Badge';
import Card from '@/Components/ui/Card';
import ConfirmModal from '@/Components/ui/ConfirmModal';
import EmptyState from '@/Components/ui/EmptyState';
import Modal from '@/Components/Modal';
import PriceInput from '@/Components/PriceInput';
import PageHeader from '@/Components/ui/PageHeader';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TabNav from '@/Components/ui/TabNav';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { classNames, formatDate, formatRupiah } from '@/lib/format';
import { type PageProps } from '@/types';
import { useSync } from '@/lib/sync/SyncProvider';
import { Head, router, useForm } from '@inertiajs/react';
import { AlertTriangle, Briefcase, CheckCircle2, Clock, Plus, Printer, ShieldCheck, Trash2, Users } from 'lucide-react';
import { FormEvent, useState } from 'react';

// Fallback lama — server mengirim rankList (36 jabatan materi gAJI + kadet + lainnya)
const LEGACY_RANKS: [string, string][] = [
    ['nakhoda', 'Nakhoda'],
    ['chief_engineer', 'Chief Engineer'],
    ['mualim', 'Mualim I'],
    ['mualim_2', 'Mualim II'],
    ['juru_mudi', 'Juru Mudi'],
    ['kelasi', 'Kelasi'],
    ['oiler', 'Oiler'],
    ['juru_masak', 'Juru Masak'],
    ['abk', 'ABK'],
];

const CERT_TYPES: [string, string][] = [
    ['buku_pelaut', 'Buku Pelaut'],
    ['ant_iii_m', 'ANT III M'], ['ant_iii', 'ANT III'], ['ant_iv_m', 'ANT IV M'], ['ant_iv', 'ANT IV'],
    ['att_iii_m', 'ATT III M'], ['att_iii', 'ATT III'], ['att_iv_m', 'ATT IV M'], ['att_iv', 'ATT IV'],
    ['ratings_deck', 'RATINGS DECK'], ['ratings_engine', 'RATINGS ENGINE'],
    ['bst', 'BST'], ['mfa', 'Medical Fitness (MFA)'], ['mc', 'MC'], ['scrb', 'SCRB'], ['aff', 'AFF'],
    ['brm', 'BRM'], ['erm', 'ERM'], ['radar', 'RADAR'], ['arpa', 'ARPA'], ['ecdis', 'ECDIS'],
    ['sso', 'SSO'], ['sat', 'SAT'], ['ijazah', 'Ijazah'],
    ['skk', 'SKK'], ['medical_fitness', 'Medical Fitness'], ['roc', 'ROC'], ['cdc', 'CDC / Buku Pelaut (lama)'],
    ['passport', 'Passpor'], ['lainnya', 'Lainnya'],
];

const INPUT_CLS = 'mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary';

export default function HrIndex({
    tab,
    crews,
    vessels,
    employees,
    rankList,
    horLogs,
    horCrew,
    horMonth,
    horCrewId,
    horAccess,
    canHorManage,
}: PageProps<{
    tab: string;
    crews?: Array<Record<string, any>>;
    vessels?: Array<{ id: number; vessel_name: string }>;
    employees?: Array<Record<string, any>>;
    rankList?: Array<{ value: string; label: string }>;
    horLogs?: Array<Record<string, any>>;
    horCrew?: Array<{ id: number; name: string; rank: string }>;
    horMonth?: string;
    horCrewId?: number | null;
    horAccess?: boolean;
    canHorManage?: boolean;
}>) {
    // 36 jabatan materi gAJI (+ kadet/lainnya) dari server; fallback legacy
    const RANKS: [string, string][] = (rankList ?? LEGACY_RANKS.map(([value, label]) => ({ value, label })))
        .map((r: any) => [String(r.value ?? r[0]), String(r.label ?? r[1])]);

    const [modal, setModal] = useState<null | 'crew' | 'employee' | 'cert' | 'editCrew' | 'editCert' | 'editAssignment' | 'addAssignment' | 'editEmployee'
        | 'hor'>(null);
    const [certCrewId, setCertCrewId] = useState<number | null>(null);
    const [editCrew, setEditCrew] = useState<any>(null);
    const [editCert, setEditCert] = useState<{ crewId: number; cert: any } | null>(null);
    const [editAssignment, setEditAssignment] = useState<any>(null);
    const [addAssignmentCrewId, setAddAssignmentCrewId] = useState<number | null>(null);
    const [editEmployee, setEditEmployee] = useState<any>(null);
    const [confirmDel, setConfirmDel] = useState<{ url: string; label: string } | null>(null);
    const [busy, setBusy] = useState(false);
    const [printVessel, setPrintVessel] = useState('');

    const crewForm = useForm({
        name: '', kode_nik: '', nik: '', birth_place: '', birth_date: '', gender: 'L', phone: '', npwp: '',
        seafarer_code: '', sccw: '', no_pkl: '', joined_on: '',
        rank: 'kelasi_2', base_salary: '', status: 'aktif', vessel_id: '', assignment_role: '',
    });
    const employeeForm = useForm({
        name: '', nik: '', npwp: '', position: '', department: '', join_date: '',
        status: 'aktif', base_salary: '', allowances: '',
    });
    const certForm = useForm({
        cert_type: 'buku_pelaut', number: '', issued_at: '', has_expiry: true, expiry_date: '',
    });
    const editCrewForm = useForm({
        name: '', kode_nik: '', nik: '', birth_place: '', birth_date: '', gender: 'L', phone: '', npwp: '',
        seafarer_code: '', sccw: '', no_pkl: '', joined_on: '',
        rank: 'kelasi_2', base_salary: '', status: 'aktif',
    });
    const editCertForm = useForm({
        cert_type: 'buku_pelaut', number: '', issued_at: '', has_expiry: true, expiry_date: '',
    });
    const assignmentForm = useForm({
        crew_id: '', vessel_id: '', role: '', start_date: '', end_date: '',
    });
    const editAssignmentForm = useForm({
        vessel_id: '', role: '', start_date: '', end_date: '', status: 'aktif',
    });
    const editEmployeeForm = useForm({
        name: '', nik: '', npwp: '', position: '', department: '', join_date: '',
        status: 'aktif', base_salary: '', allowances: '',
    });
    // ===== Hours of Rest (MLC 2006) =====
    const { engine } = useSync();
    const HOR_VLABEL: Record<string, string> = {
        rest_min_10h: 'Istirahat < 10 jam / 24 jam',
        rest_block_min_6h: 'Tidak ada blok istirahat ≥ 6 jam',
        work_max_14h: 'Kerja > 14 jam / 24 jam',
        rest_min_77h_week: 'Istirahat mingguan < 77 jam',
    };
    const [horFilter, setHorFilter] = useState({
        crew_id: String(horCrewId ?? ''),
        month: horMonth ?? new Date().toISOString().slice(0, 7),
    });
    const [editHor, setEditHor] = useState<any>(null);
    const horForm = useForm({
        crew_id: '', log_date: '', notes: '', client_uuid: '',
        rest_entries: [{ start: '00:00', end: '06:00' }] as Array<{ start: string; end: string }>,
    });

    const reloadHor = () => router.get('/sdm', {
        tab: 'hor',
        crew_id: horFilter.crew_id || undefined,
        month: horFilter.month,
    }, { preserveState: true, preserveScroll: true });

    const openHorAdd = () => {
        setEditHor(null);
        horForm.setData({
            crew_id: horFilter.crew_id,
            log_date: new Date().toISOString().slice(0, 10),
            notes: '',
            client_uuid: typeof crypto !== 'undefined' && crypto.randomUUID
                ? crypto.randomUUID()
                : `hor-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
            rest_entries: [{ start: '00:00', end: '06:00' }],
        });
        setModal('hor');
    };

    const openHorEdit = (log: any) => {
        setEditHor(log);
        horForm.setData({
            crew_id: String(log.crew_id),
            log_date: log.log_date,
            notes: log.notes ?? '',
            client_uuid: log.client_uuid ?? '',
            rest_entries: (log.rest_entries?.length ? log.rest_entries : [{ start: '00:00', end: '06:00' }]),
        });
        setModal('hor');
    };

    const submitHor = (e: FormEvent) => {
        e.preventDefault();

        // Offline: catatan masuk outbox sinkronisasi (client_uuid = idempoten),
        // dikirim ke kantor begitu kembali online — aturan WLR dihitung server.
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            void engine.enqueue({
                entity_type: 'hours_of_rest',
                label: `Jam istirahat ${horForm.data.log_date}${editHor ? ' (ubah)' : ''}`,
                priority: 'safety',
                payload: {
                    crew_id: Number(horForm.data.crew_id),
                    log_date: horForm.data.log_date,
                    rest_entries: horForm.data.rest_entries,
                    notes: horForm.data.notes || undefined,
                    client_uuid: horForm.data.client_uuid || undefined,
                },
            });
            engine.notify(`Jam istirahat ${horForm.data.log_date} masuk antrean offline — otomatis terkirim saat online.`);
            setModal(null);
            setEditHor(null);
            return;
        }

        const opts = { preserveScroll: true, onSuccess: () => { setModal(null); setEditHor(null); } };
        if (editHor) {
            horForm.put(`/sdm/hor/${editHor.id}`, opts);
        } else {
            horForm.post('/sdm/hor', opts);
        }
    };

    const setHorEntry = (idx: number, field: 'start' | 'end', value: string) => {
        horForm.setData('rest_entries', horForm.data.rest_entries.map((entry, i) => (
            i === idx ? { ...entry, [field]: value } : entry
        )));
    };

    // Pratinjau WLR di form (aturan sama dgn server)
    const horPreview = (() => {
        let rest = 0;
        let longest = 0;
        for (const entry of horForm.data.rest_entries) {
            if (!/^\d{2}:\d{2}$/.test(entry.start) || !/^\d{2}:\d{2}$/.test(entry.end)) continue;
            const [sh, sm] = entry.start.split(':').map(Number);
            const [eh, em] = entry.end.split(':').map(Number);
            const mins = eh * 60 + em - (sh * 60 + sm);
            if (mins <= 0) continue;
            rest += mins;
            longest = Math.max(longest, mins);
        }
        rest = Math.min(rest, 1440);
        const work = 1440 - rest;
        const violations: string[] = [];
        if (rest < 600) violations.push('rest_min_10h');
        if (rest > 0 && longest < 360) violations.push('rest_block_min_6h');
        if (work > 840) violations.push('work_max_14h');
        return { rest, work, violations };
    })();

    const horLogsList = horLogs ?? [];
    const horWeeks = (() => {
        const [y, m] = horFilter.month.split('-').map(Number);
        if (!y || !m) return [];
        const daysInMonth = new Date(y, m, 0).getDate();
        const byDate = new Map(horLogsList.map((l: any) => [l.log_date, l]));
        const weeks: Array<{ label: string; range: string; restH: number; complete: boolean; ok: boolean }> = [];
        for (let day = 1; day <= daysInMonth; day += 7) {
            const endDay = Math.min(day + 6, daysInMonth);
            let sum = 0;
            let logged = 0;
            let total = 0;
            for (let d = day; d <= endDay; d++) {
                total++;
                const dateStr = `${horFilter.month}-${String(d).padStart(2, '0')}`;
                const log = byDate.get(dateStr);
                if (log) {
                    logged++;
                    sum += Number(log.total_rest_minutes ?? 0);
                }
            }
            const restH = Math.round((sum / 60) * 10) / 10;
            weeks.push({
                label: `Minggu ${weeks.length + 1}`,
                range: `${String(day).padStart(2, '0')}/${String(m).padStart(2, '0')} - ${String(endDay).padStart(2, '0')}/${String(m).padStart(2, '0')}`,
                restH,
                complete: logged === total,
                ok: logged === total && restH >= 77,
            });
        }
        return weeks;
    })();

    const horStats = {
        recorded: horLogsList.length,
        compliant: horLogsList.filter((l: any) => l.is_compliant).length,
        violations: horLogsList.filter((l: any) => !l.is_compliant).length,
        avgRest: horLogsList.length
            ? Math.round((horLogsList.reduce((s: number, l: any) => s + Number(l.total_rest_minutes ?? 0), 0) / horLogsList.length / 60) * 10) / 10
            : 0,
    };

    const horStatusBadge = (log: any) => {
        if (log.is_compliant) {
            return <Badge tone="success"><CheckCircle2 size={11} /> Patuh</Badge>;
        }
        return (
            <Badge tone="danger">
                <AlertTriangle size={11} /> Langgar: {(log.violations ?? []).map((v: string) => HOR_VLABEL[v] ?? v).join('; ')}
            </Badge>
        );
    };

    const submitEditEmployee = (e: FormEvent) => {
        e.preventDefault();
        if (! editEmployee) return;
        editEmployeeForm.put(`/sdm/karyawan/${editEmployee.id}`, { preserveScroll: true, onSuccess: () => { setModal(null); setEditEmployee(null); } });
    };

    const tabs = [
        { key: 'abk', label: 'ABK (Awak Kapal)', icon: Users, count: crews?.length },
        { key: 'karyawan', label: 'Karyawan Kantor', icon: Briefcase, count: employees?.length },
        ...(horAccess ? [{ key: 'hor', label: 'Hours of Rest', icon: Clock }] : []),
    ];

    const submitCrew = (e: FormEvent) => {
        e.preventDefault();
        crewForm.post('/sdm/abk', { preserveScroll: true, onSuccess: () => setModal(null) });
    };
    const submitEmployee = (e: FormEvent) => {
        e.preventDefault();
        employeeForm.post('/sdm/karyawan', { preserveScroll: true, onSuccess: () => setModal(null) });
    };
    const submitCert = (e: FormEvent) => {
        e.preventDefault();
        if (! certCrewId) return;
        certForm.post(`/sdm/abk/${certCrewId}/sertifikat`, { preserveScroll: true, onSuccess: () => { setModal(null); setCertCrewId(null); certForm.reset(); } });
    };
    const submitEditCrew = (e: FormEvent) => {
        e.preventDefault();
        if (! editCrew) return;
        editCrewForm.put(`/sdm/abk/${editCrew.id}`, { preserveScroll: true, onSuccess: () => { setModal(null); setEditCrew(null); } });
    };
    const submitEditCert = (e: FormEvent) => {
        e.preventDefault();
        if (! editCert) return;
        editCertForm.put(`/sdm/abk/${editCert.crewId}/sertifikat/${editCert.cert.id}`, { preserveScroll: true, onSuccess: () => { setModal(null); setEditCert(null); } });
    };
    const submitAssignment = (e: FormEvent) => {
        e.preventDefault();
        assignmentForm.post('/sdm/penempatan', { preserveScroll: true, onSuccess: () => { setModal(null); assignmentForm.reset(); setAddAssignmentCrewId(null); } });
    };
    const submitEditAssignment = (e: FormEvent) => {
        e.preventDefault();
        if (! editAssignment) return;
        editAssignmentForm.put(`/sdm/penempatan/${editAssignment.id}`, { preserveScroll: true, onSuccess: () => { setModal(null); setEditAssignment(null); } });
    };

    return (
        <AuthenticatedLayout>
            <Head title="SDM & Karyawan" />

            <PageHeader
                title="SDM & Karyawan"
                description="Roster ABK (penempatan per kapal + sertifikat ber-masa berlaku → ikut Reminder) dan karyawan kantor. Payroll di menu Keuangan."
                actions={
                    <div className="flex flex-wrap items-center gap-2">
                        {tab === 'abk' && (
                            <>
                                <div className="flex items-center gap-1.5">
                                    <select value={printVessel} onChange={(e) => setPrintVessel(e.target.value)} className="rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary">
                                        <option value="">Crew List kapal…</option>
                                        {(vessels ?? []).map((v) => <option key={v.id} value={v.id}>{v.vessel_name}</option>)}
                                    </select>
                                    <button
                                        type="button"
                                        disabled={!printVessel}
                                        onClick={() => window.open(`/sdm/crew-list/${printVessel}/cetak`, '_blank')}
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-hairline px-2.5 py-1.5 text-xs font-medium text-ink hover:border-primary/40 disabled:opacity-50"
                                    >
                                        <Printer size={13} /> Cetak
                                    </button>
                                </div>
                                <PrimaryButton onClick={() => setModal('crew')}><Plus size={15} className="inline me-1" /> ABK Baru</PrimaryButton>
                            </>
                        )}
                        {tab === 'hor' && canHorManage && (
                            <PrimaryButton onClick={openHorAdd}><Plus size={15} className="inline me-1" /> Catat Istirahat</PrimaryButton>
                        )}
                        {tab === 'karyawan' && (
                            <PrimaryButton onClick={() => setModal('employee')}><Plus size={15} className="inline me-1" /> Karyawan Baru</PrimaryButton>
                        )}
                    </div>
                }
            />

            <TabNav
                tabs={tabs}
                active={tab}
                onChange={(key) => router.get('/sdm', { tab: key }, { preserveState: true })}
            />

            {tab === 'hor' && horAccess && (
                <div className="space-y-4">
                    <Card
                        title="Register Jam Istirahat Awak — Hours of Rest (MLC 2006 / SOLAS XI/1)"
                        description="Wajib: ≥10 jam istirahat per 24 jam (satu blok ≥6 jam), maksimal 14 jam kerja per 24 jam, ≥77 jam istirahat per 7 hari. Dicatat onboard (mode offline) lalu disinkronkan ke kantor."
                    >
                        <div className="flex flex-wrap items-end gap-3">
                            <div>
                                <label className="text-xs font-medium text-muted">Awak</label>
                                <select
                                    value={horFilter.crew_id}
                                    onChange={(e) => setHorFilter((f) => ({ ...f, crew_id: e.target.value }))}
                                    className={classNames(INPUT_CLS, 'w-56')}
                                >
                                    <option value="">— semua awak —</option>
                                    {(horCrew ?? []).map((c) => <option key={c.id} value={c.id}>{c.name} — {c.rank}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-muted">Bulan</label>
                                <input
                                    type="month"
                                    value={horFilter.month}
                                    onChange={(e) => setHorFilter((f) => ({ ...f, month: e.target.value }))}
                                    className={classNames(INPUT_CLS, 'w-44')}
                                />
                            </div>
                            <SecondaryButton type="button" onClick={reloadHor}>Terapkan</SecondaryButton>
                            {horFilter.crew_id && (
                                <button
                                    type="button"
                                    onClick={() => window.open(`/sdm/hor/cetak/${horFilter.crew_id}?month=${horFilter.month}`, '_blank')}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-hairline px-2.5 py-2 text-xs font-medium text-ink hover:border-primary/40"
                                >
                                    <Printer size={13} /> Cetak Register (PSC)
                                </button>
                            )}
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                            {[
                                { label: 'Hari tercatat', value: String(horStats.recorded), tone: 'text-ink' },
                                { label: 'Patuh WLR', value: String(horStats.compliant), tone: 'text-ok' },
                                { label: 'Langgar', value: String(horStats.violations), tone: horStats.violations > 0 ? 'text-primary' : 'text-muted' },
                                { label: 'Rata² istirahat', value: `${horStats.avgRest} jam`, tone: 'text-ink' },
                            ].map((s) => (
                                <div key={s.label} className="rounded-lg bg-appbg px-3 py-2">
                                    <div className="text-xs text-muted">{s.label}</div>
                                    <div className={classNames('text-lg font-semibold', s.tone)}>{s.value}</div>
                                </div>
                            ))}
                        </div>
                    </Card>

                    {horWeeks.length > 0 && (
                        <Card title="Kepatuhan Mingguan (77 jam / 7 hari)">
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                                {horWeeks.map((w) => (
                                    <div key={w.label} className="rounded-lg border border-hairline px-3 py-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-ink">{w.label}</span>
                                            {w.ok ? (
                                                <Badge tone="success"><CheckCircle2 size={11} /> Patuh</Badge>
                                            ) : (
                                                <Badge tone="danger"><AlertTriangle size={11} /> {w.complete ? 'Langgar' : 'Belum lengkap'}</Badge>
                                            )}
                                        </div>
                                        <div className="mt-1 text-xs text-muted">{w.range} · {w.restH} jam {w.complete ? '' : `(${w.restH}/77)`}</div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}

                    <Card
                        title="Catatan Harian"
                        actions={canHorManage && horFilter.crew_id ? (
                            <PrimaryButton onClick={openHorAdd}><Plus size={14} className="inline me-1" /> Catat</PrimaryButton>
                        ) : null}
                    >
                        {horLogsList.length === 0 ? (
                            <EmptyState
                                icon={Clock}
                                title="Belum ada catatan jam istirahat"
                                description="Pilih awak lalu klik “Catat Istirahat”. Saat offline, catatan masuk antrean sinkronisasi."
                            />
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-appbg text-left text-xs uppercase tracking-wide text-muted">
                                        <tr>{['Tanggal', 'Awak', 'Blok Istirahat', 'Istirahat', 'Kerja', 'Status WLR', ...(canHorManage ? ['Aksi'] : [])].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr>
                                    </thead>
                                    <tbody className="divide-y divide-hairline">
                                        {horLogsList.map((log: any) => (
                                            <tr key={log.id} className="hover:bg-appbg">
                                                <td className="px-3 py-2 whitespace-nowrap">{formatDate(log.log_date)}</td>
                                                <td className="px-3 py-2">{log.crew_name}</td>
                                                <td className="px-3 py-2">
                                                    {(log.rest_entries ?? []).length > 0
                                                        ? (log.rest_entries as any[]).map((en, i) => `${en.start}-${en.end}`).join(', ')
                                                        : '—'}
                                                </td>
                                                <td className="px-3 py-2">{Math.round(Number(log.total_rest_minutes) / 6) / 10} jam</td>
                                                <td className="px-3 py-2">{Math.round(Number(log.total_work_minutes) / 6) / 10} jam</td>
                                                <td className="px-3 py-2">{horStatusBadge(log)}</td>
                                                {canHorManage && (
                                                    <td className="px-3 py-2">
                                                        <div className="flex gap-2">
                                                            <button type="button" onClick={() => openHorEdit(log)} className="text-primary hover:underline" title="Ubah">
                                                                <ShieldCheck size={14} />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setConfirmDel({ url: `/sdm/hor/${log.id}`, label: `Jam istirahat ${log.log_date}` })}
                                                                className="text-primary hover:underline"
                                                                title="Hapus"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        <p className="mt-3 text-xs text-muted">
                            Hari tanpa catatan berarti belum dilaporkan awak. Cetak register bulanan lewat tombol di atas untuk berkas inspeksi PSC.
                        </p>
                    </Card>
                </div>
            )}

            {tab === 'abk' && (
                <>
                    {(crews ?? []).length === 0 ? (
                        <EmptyState icon={Users} title="Belum ada ABK" description="Daftarkan awak kapal beserta penempatan & sertifikat." />
                    ) : (
                        <div className="space-y-4">
                            {(crews ?? []).map((c) => (
                                <div key={c.id} id={`record-crew-${c.id}`}>
                                <Card
                                    title={c.name}
                                    description={`${c.rank_label ?? RANKS.find((r) => r[0] === c.rank)?.[1] ?? c.rank} · ${c.status} · Gaji pokok ${formatRupiah(c.base_salary)}`}
                                    actions={
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setEditCrew(c);
                                                    editCrewForm.setData({
                                                        name: c.name, kode_nik: c.kode_nik ?? '', nik: c.nik ?? '', birth_place: c.birth_place ?? '',
                                                        birth_date: c.birth_date ? String(c.birth_date).slice(0, 10) : '',
                                                        gender: c.gender ?? 'L', phone: c.phone ?? '', npwp: c.npwp ?? '',
                                                        seafarer_code: c.seafarer_code ?? '', sccw: c.sccw ?? '', no_pkl: c.no_pkl ?? '',
                                                        joined_on: c.joined_on ? String(c.joined_on).slice(0, 10) : '',
                                                        rank: c.rank, base_salary: String(c.base_salary), status: c.status,
                                                    });
                                                    setModal('editCrew');
                                                }}
                                                className="inline-flex items-center gap-1.5 rounded-lg border border-hairline px-2.5 py-1.5 text-xs font-medium text-ink hover:border-primary/40"
                                            >
                                                Edit ABK
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setConfirmDel({ url: `/sdm/abk/${c.id}`, label: `ABK ${c.name}` })}
                                                className="inline-flex items-center gap-1.5 rounded-lg border border-hairline px-2.5 py-1.5 text-xs font-medium text-primary hover:border-primary/40"
                                            >
                                                Hapus
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => { setCertCrewId(c.id); setModal('cert'); }}
                                                className="inline-flex items-center gap-1.5 rounded-lg border border-hairline px-2.5 py-1.5 text-xs font-medium text-ink hover:border-primary/40"
                                            >
                                                <ShieldCheck size={13} /> Tambah Sertifikat
                                            </button>
                                        </div>
                                    }
                                >
                                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                                        <div>
                                            <div className="mb-1.5 flex items-center justify-between">
                                                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Penempatan</p>
                                                <button
                                                    type="button"
                                                    onClick={() => { setAddAssignmentCrewId(c.id); assignmentForm.setData('crew_id', String(c.id)); assignmentForm.setData('role', c.rank); setModal('addAssignment'); }}
                                                    className="text-xs font-medium text-primary hover:underline"
                                                >
                                                    + Tambah
                                                </button>
                                            </div>
                                            {c.assignments.length === 0 ? (
                                                <p className="text-sm text-muted">Belum ditempatkan.</p>
                                            ) : (
                                                <ul className="space-y-1 text-sm">
                                                    {c.assignments.map((a: any, i: number) => (
                                                        <li key={i} className="flex items-center justify-between rounded-lg border border-hairline px-3 py-1.5">
                                                            <span className="text-ink">{a.vessel_name}</span>
                                                            <span className="text-xs text-muted">
                                                                {a.role} · {formatDate(a.start_date)} → {formatDate(a.end_date)}
                                                            </span>
                                                            <Badge tone={a.status === 'aktif' ? 'success' : 'neutral'}>{a.status}</Badge>
                                                            <span className="flex gap-2 text-xs font-medium">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setEditAssignment(a);
                                                                        editAssignmentForm.setData({
                                                                            vessel_id: String((vessels ?? []).find((v: any) => v.vessel_name === a.vessel_name)?.id ?? ''),
                                                                            role: a.role,
                                                                            start_date: String(a.start_date).slice(0, 10),
                                                                            end_date: a.end_date ? String(a.end_date).slice(0, 10) : '',
                                                                            status: a.status,
                                                                        });
                                                                        setModal('editAssignment');
                                                                    }}
                                                                    className="text-primary hover:underline"
                                                                >
                                                                    Edit
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setConfirmDel({ url: `/sdm/penempatan/${a.id}`, label: `penempatan ${a.vessel_name} — ${c.name}` })}
                                                                    className="text-primary hover:underline"
                                                                >
                                                                    Lepas
                                                                </button>
                                                            </span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                            <p className="mt-3 text-xs text-muted">
                                                NIK: {c.nik ?? '—'} · {c.birth_place ?? '—'}, {formatDate(c.birth_date)} · HP: {c.phone ?? '—'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">Sertifikat & Kesehatan</p>
                                            {c.certificates.length === 0 ? (
                                                <p className="text-sm text-muted">Belum ada sertifikat.</p>
                                            ) : (
                                                <ul className="space-y-1.5">
                                                    {c.certificates.map((cert: any) => {
                                                        const tone: BadgeTone = cert.days_left === null
                                                            ? 'neutral'
                                                            : cert.days_left < 0
                                                              ? 'danger'
                                                              : cert.days_left <= 30
                                                                ? 'warning'
                                                                : 'success';
                                                        return (
                                                            <li key={cert.id} id={`record-cert-${cert.id}`} className="flex items-center justify-between rounded-lg border border-hairline px-3 py-1.5 text-sm">
                                                                <span className="text-ink">
                                                                    {CERT_TYPES.find((t) => t[0] === cert.cert_type)?.[1] ?? cert.cert_type}
                                                                    <span className="ms-1.5 text-xs text-muted">{cert.number}</span>
                                                                </span>
                                                                <Badge tone={tone}>
                                                                    {cert.days_left === null
                                                                        ? 'Tanpa masa berlaku'
                                                                        : cert.days_left < 0
                                                                          ? `Kedaluwarsa ${Math.abs(cert.days_left)} hr`
                                                                          : `${cert.days_left} hr lagi`}
                                                                </Badge>
                                                                <span className="flex gap-2 text-xs font-medium">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setEditCert({ crewId: c.id, cert });
                                                                            editCertForm.setData({
                                                                                cert_type: cert.cert_type,
                                                                                number: cert.number ?? '',
                                                                                issued_at: cert.issued_at ? String(cert.issued_at).slice(0, 10) : '',
                                                                                has_expiry: Boolean(cert.has_expiry),
                                                                                expiry_date: cert.expiry_date ? String(cert.expiry_date).slice(0, 10) : '',
                                                                            });
                                                                            setModal('editCert');
                                                                        }}
                                                                        className="text-primary hover:underline"
                                                                    >
                                                                        Edit
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setConfirmDel({ url: `/sdm/abk/${c.id}/sertifikat/${cert.id}`, label: `sertifikat ${cert.cert_type} milik ${c.name}` })}
                                                                        className="text-primary hover:underline"
                                                                    >
                                                                        Hapus
                                                                    </button>
                                                                </span>
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {tab === 'karyawan' && (
                <div className="overflow-hidden rounded-xl border border-hairline bg-white shadow-sm">
                    <table className="min-w-full text-sm">
                        <thead className="bg-appbg text-left text-xs uppercase tracking-wide text-muted">
                            <tr>{['Nama', 'Jabatan', 'Departemen', 'Masuk', 'Pokok', 'Tunjangan', 'Status', 'Aksi'].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr>
                        </thead>
                        <tbody className="divide-y divide-hairline">
                            {(employees ?? []).map((e) => (
                                <tr key={e.id} className="hover:bg-appbg">
                                    <td className="px-3 py-2 font-medium text-ink">{e.name}</td>
                                    <td className="px-3 py-2 text-muted">{e.position}</td>
                                    <td className="px-3 py-2 text-muted">{e.department}</td>
                                    <td className="px-3 py-2 text-muted">{formatDate(e.join_date)}</td>
                                    <td className="px-3 py-2 tabular-nums">{formatRupiah(e.base_salary)}</td>
                                    <td className="px-3 py-2 tabular-nums">{formatRupiah(e.allowances)}</td>
                                    <td className="px-3 py-2"><Badge tone={e.status === 'aktif' ? 'success' : 'neutral'}>{e.status}</Badge></td>
                                    <td className="px-3 py-2">
                                        <div className="flex gap-2 text-xs font-medium">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setEditEmployee(e);
                                                    editEmployeeForm.setData({
                                                        name: e.name, nik: e.nik ?? '', npwp: e.npwp ?? '',
                                                        position: e.position, department: e.department ?? '',
                                                        join_date: e.join_date ? String(e.join_date).slice(0, 10) : '',
                                                        status: e.status, base_salary: String(e.base_salary),
                                                        allowances: String(e.allowances ?? 0),
                                                    });
                                                    setModal('editEmployee');
                                                }}
                                                className="text-primary hover:underline"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setConfirmDel({ url: `/sdm/karyawan/${e.id}`, label: `karyawan ${e.name}` })}
                                                className="text-primary hover:underline"
                                            >
                                                Hapus
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <Modal show={modal === 'crew'} onClose={() => setModal(null)} maxWidth="lg">
                <form onSubmit={submitCrew} className="p-6">
                    <h2 className="text-lg font-semibold text-ink">Daftar ABK Baru</h2>
                    <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
                        <div><label className="text-xs font-medium text-muted">Nama *</label>
                            <input value={crewForm.data.name} onChange={(e) => crewForm.setData('name', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" /></div>
                        <div><label className="text-xs font-medium text-muted">NIK</label>
                            <input value={crewForm.data.nik} onChange={(e) => crewForm.setData('nik', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" /></div>
                        <div><label className="text-xs font-medium text-muted">Tempat Lahir</label>
                            <input value={crewForm.data.birth_place} onChange={(e) => crewForm.setData('birth_place', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" /></div>
                        <div><label className="text-xs font-medium text-muted">Tanggal Lahir</label>
                            <input type="date" value={crewForm.data.birth_date} onChange={(e) => crewForm.setData('birth_date', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" /></div>
                        <div><label className="text-xs font-medium text-muted">Gender</label>
                            <select value={crewForm.data.gender} onChange={(e) => crewForm.setData('gender', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary">
                                <option value="L">Laki-laki</option><option value="P">Perempuan</option>
                            </select></div>
                        <div><label className="text-xs font-medium text-muted">HP</label>
                            <input value={crewForm.data.phone} onChange={(e) => crewForm.setData('phone', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" /></div>
                        <div><label className="text-xs font-medium text-muted">NPWP</label>
                            <input value={crewForm.data.npwp} onChange={(e) => crewForm.setData('npwp', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" /></div>
                        <div><label className="text-xs font-medium text-muted">Kode NIK Internal</label>
                            <input value={crewForm.data.kode_nik} onChange={(e) => crewForm.setData('kode_nik', e.target.value)} placeholder="020107" className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" /></div>
                        <div><label className="text-xs font-medium text-muted">Kode Pelaut</label>
                            <input value={crewForm.data.seafarer_code} onChange={(e) => crewForm.setData('seafarer_code', e.target.value)} placeholder="6201297511" className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" /></div>
                        <div><label className="text-xs font-medium text-muted">SCCW / Sert. Utama</label>
                            <input value={crewForm.data.sccw} onChange={(e) => crewForm.setData('sccw', e.target.value)} placeholder="ANT IV M / RATINGS" className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" /></div>
                        <div><label className="text-xs font-medium text-muted">No PKL</label>
                            <input value={crewForm.data.no_pkl} onChange={(e) => crewForm.setData('no_pkl', e.target.value)} placeholder="0107/BT-MI/S.ya/IV/2024" className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" /></div>
                        <div><label className="text-xs font-medium text-muted">Tanggal Masuk</label>
                            <input type="date" value={crewForm.data.joined_on} onChange={(e) => crewForm.setData('joined_on', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" /></div>
                        <div><label className="text-xs font-medium text-muted">Jabatan Pelayaran *</label>
                            <select value={crewForm.data.rank} onChange={(e) => crewForm.setData('rank', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary">
                                {RANKS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select></div>
                        <div><label className="text-xs font-medium text-muted">Gaji Pokok *</label>
                            <PriceInput value={crewForm.data.base_salary} onChange={(e) => crewForm.setData('base_salary', e.target.value)} className="mt-1 block w-full" /></div>
                        <div><label className="text-xs font-medium text-muted">Penempatan Awal</label>
                            <select value={crewForm.data.vessel_id} onChange={(e) => crewForm.setData('vessel_id', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary">
                                <option value="">— belum —</option>
                                {(vessels ?? []).map((v) => <option key={v.id} value={v.id}>{v.vessel_name}</option>)}
                            </select></div>
                        <div><label className="text-xs font-medium text-muted">Status</label>
                            <select value={crewForm.data.status} onChange={(e) => crewForm.setData('status', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary">
                                <option value="aktif">Aktif</option><option value="cuti">Cuti</option><option value="selesai">Selesai</option>
                            </select></div>
                    </div>
                    <div className="mt-5 flex justify-end gap-3">
                        <SecondaryButton type="button" onClick={() => setModal(null)}>Batal</SecondaryButton>
                        <PrimaryButton disabled={crewForm.processing}>Simpan ABK</PrimaryButton>
                    </div>
                </form>
            </Modal>

            <Modal show={modal === 'cert'} onClose={() => setModal(null)} maxWidth="md">
                <form onSubmit={submitCert} className="p-6">
                    <h2 className="text-lg font-semibold text-ink">Tambah Sertifikat ABK</h2>
                    <div className="mt-4 space-y-3">
                        <div><label className="text-xs font-medium text-muted">Jenis *</label>
                            <select value={certForm.data.cert_type} onChange={(e) => certForm.setData('cert_type', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary">
                                {CERT_TYPES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select></div>
                        <div><label className="text-xs font-medium text-muted">Nomor</label>
                            <input value={certForm.data.number} onChange={(e) => certForm.setData('number', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" /></div>
                        <div><label className="text-xs font-medium text-muted">Tanggal Terbit</label>
                            <input type="date" value={certForm.data.issued_at} onChange={(e) => certForm.setData('issued_at', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" /></div>
                        <label className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={certForm.data.has_expiry} onChange={(e) => certForm.setData('has_expiry', e.target.checked)} className="rounded border-gray-300 text-primary focus:ring-primary" />
                            Punya masa berlaku (ikut reminder)
                        </label>
                        {certForm.data.has_expiry && (
                            <div><label className="text-xs font-medium text-muted">Berlaku s/d *</label>
                                <input type="date" value={certForm.data.expiry_date} onChange={(e) => certForm.setData('expiry_date', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" /></div>
                        )}
                    </div>
                    <div className="mt-5 flex justify-end gap-3">
                        <SecondaryButton type="button" onClick={() => setModal(null)}>Batal</SecondaryButton>
                        <PrimaryButton disabled={certForm.processing}>Simpan Sertifikat</PrimaryButton>
                    </div>
                </form>
            </Modal>

            <Modal show={modal === 'employee'} onClose={() => setModal(null)} maxWidth="md">
                <form onSubmit={submitEmployee} className="p-6">
                    <h2 className="text-lg font-semibold text-ink">Karyawan Kantor Baru</h2>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                        <div><label className="text-xs font-medium text-muted">Nama *</label>
                            <input value={employeeForm.data.name} onChange={(e) => employeeForm.setData('name', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" /></div>
                        <div><label className="text-xs font-medium text-muted">Jabatan *</label>
                            <input value={employeeForm.data.position} onChange={(e) => employeeForm.setData('position', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" /></div>
                        <div><label className="text-xs font-medium text-muted">Departemen</label>
                            <input value={employeeForm.data.department} onChange={(e) => employeeForm.setData('department', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" /></div>
                        <div><label className="text-xs font-medium text-muted">Tanggal Masuk</label>
                            <input type="date" value={employeeForm.data.join_date} onChange={(e) => employeeForm.setData('join_date', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" /></div>
                        <div><label className="text-xs font-medium text-muted">Gaji Pokok *</label>
                            <PriceInput value={employeeForm.data.base_salary} onChange={(e) => employeeForm.setData('base_salary', e.target.value)} className="mt-1 block w-full" /></div>
                        <div><label className="text-xs font-medium text-muted">Tunjangan</label>
                            <PriceInput value={employeeForm.data.allowances} onChange={(e) => employeeForm.setData('allowances', e.target.value)} className="mt-1 block w-full" /></div>
                    </div>
                    <div className="mt-5 flex justify-end gap-3">
                        <SecondaryButton type="button" onClick={() => setModal(null)}>Batal</SecondaryButton>
                        <PrimaryButton disabled={employeeForm.processing}>Simpan Karyawan</PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* Modal: Edit ABK */}
            <Modal show={modal === 'editCrew'} onClose={() => setModal(null)} maxWidth="lg">
                <form onSubmit={submitEditCrew} className="p-6">
                    <h2 className="text-lg font-semibold text-ink">Edit ABK — {editCrew?.name}</h2>
                    <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
                        <div><label className="text-xs font-medium text-muted">Nama *</label>
                            <input value={editCrewForm.data.name} onChange={(e) => editCrewForm.setData('name', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" /></div>
                        <div><label className="text-xs font-medium text-muted">NIK</label>
                            <input value={editCrewForm.data.nik} onChange={(e) => editCrewForm.setData('nik', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" /></div>
                        <div><label className="text-xs font-medium text-muted">Tempat Lahir</label>
                            <input value={editCrewForm.data.birth_place} onChange={(e) => editCrewForm.setData('birth_place', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" /></div>
                        <div><label className="text-xs font-medium text-muted">Tanggal Lahir</label>
                            <input type="date" value={editCrewForm.data.birth_date} onChange={(e) => editCrewForm.setData('birth_date', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" /></div>
                        <div><label className="text-xs font-medium text-muted">Gender</label>
                            <select value={editCrewForm.data.gender} onChange={(e) => editCrewForm.setData('gender', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary">
                                <option value="L">Laki-laki</option><option value="P">Perempuan</option>
                            </select></div>
                        <div><label className="text-xs font-medium text-muted">HP</label>
                            <input value={editCrewForm.data.phone} onChange={(e) => editCrewForm.setData('phone', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" /></div>
                        <div><label className="text-xs font-medium text-muted">NPWP</label>
                            <input value={editCrewForm.data.npwp} onChange={(e) => editCrewForm.setData('npwp', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" /></div>
                        <div><label className="text-xs font-medium text-muted">Kode NIK Internal</label>
                            <input value={editCrewForm.data.kode_nik} onChange={(e) => editCrewForm.setData('kode_nik', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" /></div>
                        <div><label className="text-xs font-medium text-muted">Kode Pelaut</label>
                            <input value={editCrewForm.data.seafarer_code} onChange={(e) => editCrewForm.setData('seafarer_code', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" /></div>
                        <div><label className="text-xs font-medium text-muted">SCCW / Sert. Utama</label>
                            <input value={editCrewForm.data.sccw} onChange={(e) => editCrewForm.setData('sccw', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" /></div>
                        <div><label className="text-xs font-medium text-muted">No PKL</label>
                            <input value={editCrewForm.data.no_pkl} onChange={(e) => editCrewForm.setData('no_pkl', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" /></div>
                        <div><label className="text-xs font-medium text-muted">Tanggal Masuk</label>
                            <input type="date" value={editCrewForm.data.joined_on} onChange={(e) => editCrewForm.setData('joined_on', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" /></div>
                        <div><label className="text-xs font-medium text-muted">Jabatan *</label>
                            <select value={editCrewForm.data.rank} onChange={(e) => editCrewForm.setData('rank', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary">
                                {RANKS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select></div>
                        <div><label className="text-xs font-medium text-muted">Gaji Pokok *</label>
                            <PriceInput value={editCrewForm.data.base_salary} onChange={(e) => editCrewForm.setData('base_salary', e.target.value)} className="mt-1 block w-full" /></div>
                        <div><label className="text-xs font-medium text-muted">Status</label>
                            <select value={editCrewForm.data.status} onChange={(e) => editCrewForm.setData('status', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary">
                                <option value="aktif">Aktif</option><option value="cuti">Cuti</option><option value="selesai">Selesai</option>
                            </select></div>
                    </div>
                    <div className="mt-5 flex justify-end gap-3">
                        <SecondaryButton type="button" onClick={() => setModal(null)}>Batal</SecondaryButton>
                        <PrimaryButton disabled={editCrewForm.processing}>Simpan</PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* Modal: Edit Sertifikat */}
            <Modal show={modal === 'editCert'} onClose={() => setModal(null)} maxWidth="md">
                <form onSubmit={submitEditCert} className="p-6">
                    <h2 className="text-lg font-semibold text-ink">Edit Sertifikat ABK</h2>
                    <div className="mt-4 space-y-3">
                        <div><label className="text-xs font-medium text-muted">Jenis *</label>
                            <select value={editCertForm.data.cert_type} onChange={(e) => editCertForm.setData('cert_type', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary">
                                {CERT_TYPES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select></div>
                        <div><label className="text-xs font-medium text-muted">Nomor</label>
                            <input value={editCertForm.data.number} onChange={(e) => editCertForm.setData('number', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" /></div>
                        <div><label className="text-xs font-medium text-muted">Tanggal Terbit</label>
                            <input type="date" value={editCertForm.data.issued_at} onChange={(e) => editCertForm.setData('issued_at', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" /></div>
                        <label className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={editCertForm.data.has_expiry} onChange={(e) => editCertForm.setData('has_expiry', e.target.checked)} className="rounded border-gray-300 text-primary focus:ring-primary" />
                            Punya masa berlaku (ikut reminder)
                        </label>
                        {editCertForm.data.has_expiry && (
                            <div><label className="text-xs font-medium text-muted">Berlaku s/d *</label>
                                <input type="date" value={editCertForm.data.expiry_date} onChange={(e) => editCertForm.setData('expiry_date', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" /></div>
                        )}
                    </div>
                    <div className="mt-5 flex justify-end gap-3">
                        <SecondaryButton type="button" onClick={() => setModal(null)}>Batal</SecondaryButton>
                        <PrimaryButton disabled={editCertForm.processing}>Simpan</PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* Modal: Tambah Penempatan */}
            <Modal show={modal === 'addAssignment'} onClose={() => setModal(null)} maxWidth="md">
                <form onSubmit={submitAssignment} className="p-6">
                    <h2 className="text-lg font-semibold text-ink">Tambah Penempatan ABK</h2>
                    <p className="text-xs text-muted">Penempatan aktif sebelumnya (di kapal mana pun) akan otomatis ditutup.</p>
                    <div className="mt-4 space-y-3">
                        <div><label className="text-xs font-medium text-muted">Kapal *</label>
                            <select value={assignmentForm.data.vessel_id} onChange={(e) => assignmentForm.setData('vessel_id', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary">
                                <option value="">— pilih —</option>
                                {(vessels ?? []).map((v: any) => <option key={v.id} value={v.id}>{v.vessel_name}</option>)}
                            </select></div>
                        <div><label className="text-xs font-medium text-muted">Jabatan di Kapal *</label>
                            <input value={assignmentForm.data.role} onChange={(e) => assignmentForm.setData('role', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" /></div>
                        <div><label className="text-xs font-medium text-muted">Mulai *</label>
                            <input type="date" value={assignmentForm.data.start_date} onChange={(e) => assignmentForm.setData('start_date', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" /></div>
                        <div><label className="text-xs font-medium text-muted">Selesai</label>
                            <input type="date" value={assignmentForm.data.end_date} onChange={(e) => assignmentForm.setData('end_date', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" /></div>
                    </div>
                    <div className="mt-5 flex justify-end gap-3">
                        <SecondaryButton type="button" onClick={() => setModal(null)}>Batal</SecondaryButton>
                        <PrimaryButton disabled={assignmentForm.processing}>Simpan Penempatan</PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* Modal: Edit Penempatan */}
            <Modal show={modal === 'editAssignment'} onClose={() => setModal(null)} maxWidth="md">
                <form onSubmit={submitEditAssignment} className="p-6">
                    <h2 className="text-lg font-semibold text-ink">Edit Penempatan</h2>
                    <div className="mt-4 space-y-3">
                        <div><label className="text-xs font-medium text-muted">Kapal *</label>
                            <select value={editAssignmentForm.data.vessel_id} onChange={(e) => editAssignmentForm.setData('vessel_id', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary">
                                {(vessels ?? []).map((v: any) => <option key={v.id} value={v.id}>{v.vessel_name}</option>)}
                            </select></div>
                        <div><label className="text-xs font-medium text-muted">Jabatan *</label>
                            <input value={editAssignmentForm.data.role} onChange={(e) => editAssignmentForm.setData('role', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" /></div>
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className="text-xs font-medium text-muted">Mulai *</label>
                                <input type="date" value={editAssignmentForm.data.start_date} onChange={(e) => editAssignmentForm.setData('start_date', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" /></div>
                            <div><label className="text-xs font-medium text-muted">Selesai</label>
                                <input type="date" value={editAssignmentForm.data.end_date} onChange={(e) => editAssignmentForm.setData('end_date', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" /></div>
                            <div><label className="text-xs font-medium text-muted">Status</label>
                                <select value={editAssignmentForm.data.status} onChange={(e) => editAssignmentForm.setData('status', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary">
                                    <option value="aktif">Aktif</option><option value="cuti">Cuti</option><option value="berakhir">Berakhir</option>
                                </select></div>
                        </div>
                    </div>
                    <div className="mt-5 flex justify-end gap-3">
                        <SecondaryButton type="button" onClick={() => setModal(null)}>Batal</SecondaryButton>
                        <PrimaryButton disabled={editAssignmentForm.processing}>Simpan</PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* Modal: Edit Karyawan */}
            <Modal show={modal === 'editEmployee'} onClose={() => setModal(null)} maxWidth="md">
                <form onSubmit={submitEditEmployee} className="p-6">
                    <h2 className="text-lg font-semibold text-ink">Edit Karyawan — {editEmployee?.name}</h2>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                        <div><label className="text-xs font-medium text-muted">Nama *</label>
                            <input value={editEmployeeForm.data.name} onChange={(e) => editEmployeeForm.setData('name', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" /></div>
                        <div><label className="text-xs font-medium text-muted">Jabatan *</label>
                            <input value={editEmployeeForm.data.position} onChange={(e) => editEmployeeForm.setData('position', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" /></div>
                        <div><label className="text-xs font-medium text-muted">Departemen</label>
                            <input value={editEmployeeForm.data.department} onChange={(e) => editEmployeeForm.setData('department', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" /></div>
                        <div><label className="text-xs font-medium text-muted">Masuk</label>
                            <input type="date" value={editEmployeeForm.data.join_date} onChange={(e) => editEmployeeForm.setData('join_date', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" /></div>
                        <div><label className="text-xs font-medium text-muted">Gaji Pokok *</label>
                            <PriceInput value={editEmployeeForm.data.base_salary} onChange={(e) => editEmployeeForm.setData('base_salary', e.target.value)} className="mt-1 block w-full" /></div>
                        <div><label className="text-xs font-medium text-muted">Tunjangan</label>
                            <PriceInput value={editEmployeeForm.data.allowances} onChange={(e) => editEmployeeForm.setData('allowances', e.target.value)} className="mt-1 block w-full" /></div>
                        <div><label className="text-xs font-medium text-muted">Status</label>
                            <select value={editEmployeeForm.data.status} onChange={(e) => editEmployeeForm.setData('status', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary">
                                <option value="aktif">Aktif</option><option value="keluar">Keluar</option>
                            </select></div>
                    </div>
                    <div className="mt-5 flex justify-end gap-3">
                        <SecondaryButton type="button" onClick={() => setModal(null)}>Batal</SecondaryButton>
                        <PrimaryButton disabled={editEmployeeForm.processing}>Simpan</PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* Modal: Hours of Rest (catat/ubah blok istirahat) */}
            <Modal show={modal === 'hor'} onClose={() => { setModal(null); setEditHor(null); }} maxWidth="lg">
                <form onSubmit={submitHor} className="p-6">
                    <h2 className="text-lg font-semibold text-ink">
                        {editHor ? `Ubah Jam Istirahat — ${editHor.log_date}` : 'Catat Jam Istirahat Awak'}
                    </h2>
                    <p className="mt-1 text-xs text-muted">
                        Aturan MLC 2006: istirahat ≥10 jam per 24 jam (satu blok ≥6 jam), kerja maksimal 14 jam per 24 jam.
                        Jam memakai waktu kapal (WITA).
                    </p>

                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                            <label className="text-xs font-medium text-muted">Awak *</label>
                            <select
                                value={horForm.data.crew_id}
                                onChange={(e) => horForm.setData('crew_id', e.target.value)}
                                className={INPUT_CLS}
                                required
                            >
                                <option value="">— pilih —</option>
                                {(horCrew ?? []).map((c) => <option key={c.id} value={c.id}>{c.name} — {c.rank}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-muted">Tanggal *</label>
                            <input
                                type="date"
                                value={horForm.data.log_date}
                                onChange={(e) => horForm.setData('log_date', e.target.value)}
                                className={INPUT_CLS}
                                required
                            />
                        </div>
                    </div>

                    <div className="mt-4">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-medium text-muted">Blok Istirahat (WITA) *</label>
                            <button
                                type="button"
                                onClick={() => horForm.setData('rest_entries', [...horForm.data.rest_entries, { start: '', end: '' }])}
                                className="text-xs font-medium text-primary hover:underline"
                            >
                                + Tambah blok
                            </button>
                        </div>
                        <div className="mt-2 space-y-2">
                            {horForm.data.rest_entries.map((entry, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <input
                                        type="time"
                                        value={entry.start}
                                        onChange={(e) => setHorEntry(idx, 'start', e.target.value)}
                                        className={classNames(INPUT_CLS, 'w-32')}
                                        required
                                    />
                                    <span className="text-muted">s/d</span>
                                    <input
                                        type="time"
                                        value={entry.end}
                                        onChange={(e) => setHorEntry(idx, 'end', e.target.value)}
                                        className={classNames(INPUT_CLS, 'w-32')}
                                        required
                                    />
                                    {horForm.data.rest_entries.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => horForm.setData('rest_entries', horForm.data.rest_entries.filter((_, i) => i !== idx))}
                                            className="text-primary hover:underline"
                                            title="Hapus blok"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className={classNames(
                        'mt-4 rounded-lg px-3 py-2 text-sm',
                        horPreview.violations.length === 0 ? 'bg-ok/10 text-ok' : 'bg-primary/10 text-primary',
                    )}>
                        {horPreview.violations.length === 0 ? (
                            <span className="inline-flex items-center gap-1.5">
                                <CheckCircle2 size={14} /> Patuh WLR — istirahat {Math.round((horPreview.rest / 60) * 10) / 10} jam, kerja {Math.round((horPreview.work / 60) * 10) / 10} jam.
                            </span>
                        ) : (
                            <span className="inline-flex items-start gap-1.5">
                                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                                <span>
                                    Langgar WLR: {horPreview.violations.map((v) => HOR_VLABEL[v] ?? v).join('; ')}.
                                    (istirahat {Math.round((horPreview.rest / 60) * 10) / 10} jam)
                                </span>
                            </span>
                        )}
                    </div>

                    <div className="mt-3">
                        <label className="text-xs font-medium text-muted">Catatan (opsional)</label>
                        <input
                            value={horForm.data.notes}
                            onChange={(e) => horForm.setData('notes', e.target.value)}
                            className={INPUT_CLS}
                            placeholder="mis. istirahat terpecah saat penjagaan malam"
                        />
                    </div>

                    <div className="mt-5 flex justify-end gap-3">
                        <SecondaryButton type="button" onClick={() => { setModal(null); setEditHor(null); }}>Batal</SecondaryButton>
                        <PrimaryButton disabled={horForm.processing}>
                            {editHor ? 'Simpan Perubahan' : 'Catat Jam Istirahat'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>

            <ConfirmModal
                show={!!confirmDel}
                title="Hapus data ini?"
                message={confirmDel ? `${confirmDel.label} akan dihapus. Penempatan aktif ABK (jika ada) akan ditutup otomatis. Tindakan tercatat di audit trail.` : ''}
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
