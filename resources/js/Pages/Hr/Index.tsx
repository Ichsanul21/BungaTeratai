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
import { Button, Checkbox, Col, Divider, Form, Input, InputNumber, Row, Select as AntSelect, Table, Tag } from 'antd';
import { FormEvent, useState } from 'react';

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

    const employeeColumns = [
        { title: 'Nama', dataIndex: 'name', key: 'name', render: (v: string) => <span className="font-medium text-[#111827]">{v}</span> },
        { title: 'Jabatan', dataIndex: 'position', key: 'position', render: (v: string) => <span className="text-[#5B6474]">{v}</span> },
        { title: 'Departemen', dataIndex: 'department', key: 'department', render: (v: string) => <span className="text-[#5B6474]">{v}</span> },
        { title: 'Masuk', dataIndex: 'join_date', key: 'join_date', render: (v: string) => <span className="text-[#5B6474]">{formatDate(v)}</span> },
        { title: 'Pokok', dataIndex: 'base_salary', key: 'base_salary', render: (v: any) => <span className="tabular-nums">{formatRupiah(v)}</span> },
        { title: 'Tunjangan', dataIndex: 'allowances', key: 'allowances', render: (v: any) => <span className="tabular-nums">{formatRupiah(v)}</span> },
        {
            title: 'Status', dataIndex: 'status', key: 'status',
            render: (v: string) => <Badge tone={v === 'aktif' ? 'success' : 'neutral'}>{v}</Badge>,
        },
        {
            title: 'Aksi', key: 'aksi',
            render: (_: any, r: Record<string, any>) => (
                <div className="flex gap-2 text-xs font-medium">
                    <button
                        type="button"
                        onClick={() => {
                            setEditEmployee(r);
                            editEmployeeForm.setData({
                                name: r.name, nik: r.nik ?? '', npwp: r.npwp ?? '',
                                position: r.position, department: r.department ?? '',
                                join_date: r.join_date ? String(r.join_date).slice(0, 10) : '',
                                status: r.status, base_salary: String(r.base_salary),
                                allowances: String(r.allowances ?? 0),
                            });
                            setModal('editEmployee');
                        }}
                        className="text-[#BA0C2F] hover:underline"
                    >
                        Edit
                    </button>
                    <button
                        type="button"
                        onClick={() => setConfirmDel({ url: `/sdm/karyawan/${r.id}`, label: `karyawan ${r.name}` })}
                        className="text-[#BA0C2F] hover:underline"
                    >
                        Hapus
                    </button>
                </div>
            ),
        },
    ];

    const horColumns = [
        { title: 'Tanggal', dataIndex: 'log_date', key: 'log_date', render: (v: string) => <span className="whitespace-nowrap">{formatDate(v)}</span> },
        { title: 'Awak', dataIndex: 'crew_name', key: 'crew_name' },
        {
            title: 'Blok Istirahat', key: 'rest_entries',
            render: (_: any, r: Record<string, any>) => (
                (r.rest_entries ?? []).length > 0
                    ? (r.rest_entries as any[]).map((en, i) => `${en.start}-${en.end}`).join(', ')
                    : '—'
            ),
        },
        {
            title: 'Istirahat', key: 'total_rest_minutes',
            render: (_: any, r: Record<string, any>) => `${Math.round(Number(r.total_rest_minutes) / 6) / 10} jam`,
        },
        {
            title: 'Kerja', key: 'total_work_minutes',
            render: (_: any, r: Record<string, any>) => `${Math.round(Number(r.total_work_minutes) / 6) / 10} jam`,
        },
        {
            title: 'Status WLR', key: 'status',
            render: (_: any, r: Record<string, any>) => horStatusBadge(r),
        },
        ...(canHorManage ? [{
            title: 'Aksi', key: 'aksi',
            render: (_: any, r: Record<string, any>) => (
                <div className="flex gap-2">
                    <button type="button" onClick={() => openHorEdit(r)} className="text-[#BA0C2F] hover:underline" title="Ubah">
                        <ShieldCheck size={14} />
                    </button>
                    <button
                        type="button"
                        onClick={() => setConfirmDel({ url: `/sdm/hor/${r.id}`, label: `Jam istirahat ${r.log_date}` })}
                        className="text-[#BA0C2F] hover:underline"
                        title="Hapus"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            ),
        }] : []),
    ];

    return (
        <AuthenticatedLayout>
            <Head title="SDM & Karyawan" />

            <PageHeader
                title="SDM & Karyawan"
                description="Roster ABK (penempatan per kapal + sertifikat ber-masa berlaku → ikut Reminder) dan karyawan kantor. Payroll di menu Keuangan."
                metrics={[
                    { label: 'ABK Aktif', value: (crews ?? []).filter((c) => (c.status ?? 'aktif') === 'aktif').length, tone: 'primary', sub: 'roster pelaut' },
                    { label: 'Karyawan Kantor', value: (employees ?? []).filter((e) => (e.status ?? 'aktif') === 'aktif').length, sub: 'staff aktif' },
                    { label: 'Catatan HoR', value: (horLogs ?? []).length, tone: 'navy', sub: `periode ${horMonth ?? 'bulan ini'}` },
                    { label: 'HoR Tidak Patuh', value: (horLogs ?? []).filter((l) => l.is_compliant === false || l.compliant === false).length, tone: 'warning', sub: 'perlu tindak lanjut' },
                ]}
                actions={
                    <div className="flex flex-wrap items-center gap-2">
                        {tab === 'abk' && (
                            <>
                                <div className="flex items-center gap-1.5">
                                    <AntSelect
                                        value={printVessel || undefined}
                                        onChange={(v) => setPrintVessel(v ?? '')}
                                        placeholder="Crew List kapal…"
                                        style={{ width: 200 }}
                                        allowClear
                                        options={(vessels ?? []).map((v) => ({ value: String(v.id), label: v.vessel_name }))}
                                    />
                                    <SecondaryButton
                                        disabled={!printVessel}
                                        onClick={() => window.open(`/sdm/crew-list/${printVessel}/cetak`, '_blank')}
                                        icon={<Printer size={13} />}
                                    >
                                        Cetak
                                    </SecondaryButton>
                                </div>
                                <PrimaryButton onClick={() => setModal('crew')} icon={<Plus size={15} />}>ABK Baru</PrimaryButton>
                            </>
                        )}
                        {tab === 'hor' && canHorManage && (
                            <PrimaryButton onClick={openHorAdd} icon={<Plus size={15} />}>Catat Istirahat</PrimaryButton>
                        )}
                        {tab === 'karyawan' && (
                            <PrimaryButton onClick={() => setModal('employee')} icon={<Plus size={15} />}>Karyawan Baru</PrimaryButton>
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
                                <label className="text-xs font-medium text-[#5B6474]">Awak</label>
                                <AntSelect
                                    value={horFilter.crew_id || undefined}
                                    onChange={(v) => setHorFilter((f) => ({ ...f, crew_id: v ?? '' }))}
                                    placeholder="— semua awak —"
                                    style={{ width: 224 }}
                                    allowClear
                                    options={(horCrew ?? []).map((c) => ({ value: String(c.id), label: `${c.name} — ${c.rank}` }))}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-[#5B6474]">Bulan</label>
                                <Input
                                    type="month"
                                    value={horFilter.month}
                                    onChange={(e) => setHorFilter((f) => ({ ...f, month: e.target.value }))}
                                    style={{ width: 176 }}
                                />
                            </div>
                            <SecondaryButton onClick={reloadHor}>Terapkan</SecondaryButton>
                            {horFilter.crew_id && (
                                <SecondaryButton
                                    onClick={() => window.open(`/sdm/hor/cetak/${horFilter.crew_id}?month=${horFilter.month}`, '_blank')}
                                    icon={<Printer size={13} />}
                                >
                                    Cetak Register (PSC)
                                </SecondaryButton>
                            )}
                        </div>

                        <Row gutter={12} className="mt-4">
                            {[
                                { label: 'Hari tercatat', value: String(horStats.recorded), color: '#111827' },
                                { label: 'Patuh WLR', value: String(horStats.compliant), color: '#15803D' },
                                { label: 'Langgar', value: String(horStats.violations), color: horStats.violations > 0 ? '#BA0C2F' : '#5B6474' },
                                { label: 'Rata² istirahat', value: `${horStats.avgRest} jam`, color: '#111827' },
                            ].map((s) => (
                                <Col key={s.label} xs={12} lg={6}>
                                    <div className="rounded-lg px-3 py-2" style={{ background: '#F5F7FA' }}>
                                        <div className="text-xs text-[#5B6474]">{s.label}</div>
                                        <div className="text-lg font-semibold" style={{ color: s.color }}>{s.value}</div>
                                    </div>
                                </Col>
                            ))}
                        </Row>
                    </Card>

                    {horWeeks.length > 0 && (
                        <Card title="Kepatuhan Mingguan (77 jam / 7 hari)">
                            <Row gutter={[8, 8]}>
                                {horWeeks.map((w) => (
                                    <Col key={w.label} xs={24} sm={12} lg={6}>
                                        <div className="rounded-lg border border-[#E3E8F0] px-3 py-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium text-[#111827]">{w.label}</span>
                                                {w.ok ? (
                                                    <Badge tone="success"><CheckCircle2 size={11} /> Patuh</Badge>
                                                ) : (
                                                    <Badge tone="danger"><AlertTriangle size={11} /> {w.complete ? 'Langgar' : 'Belum lengkap'}</Badge>
                                                )}
                                            </div>
                                            <div className="mt-1 text-xs text-[#5B6474]">{w.range} · {w.restH} jam {w.complete ? '' : `(${w.restH}/77)`}</div>
                                        </div>
                                    </Col>
                                ))}
                            </Row>
                        </Card>
                    )}

                    <Card
                        title="Catatan Harian"
                        actions={canHorManage && horFilter.crew_id ? (
                            <PrimaryButton onClick={openHorAdd} icon={<Plus size={14} />}>Catat</PrimaryButton>
                        ) : null}
                    >
                        {horLogsList.length === 0 ? (
                            <EmptyState
                                icon={Clock}
                                title="Belum ada catatan jam istirahat"
                                description={'Pilih awak lalu klik "Catat Istirahat". Saat offline, catatan masuk antrean sinkronisasi.'}
                            />
                        ) : (
                            <Table
                                dataSource={horLogsList}
                                columns={horColumns}
                                rowKey="id"
                                pagination={false}
                                size="small"
                                scroll={{ x: 700 }}
                                rowClassName={() => 'hover:bg-[#F5F7FA]'}
                            />
                        )}
                        <p className="mt-3 text-xs text-[#5B6474]">
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
                                            <SecondaryButton
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
                                            >
                                                Edit ABK
                                            </SecondaryButton>
                                            <Button
                                                danger
                                                onClick={() => setConfirmDel({ url: `/sdm/abk/${c.id}`, label: `ABK ${c.name}` })}
                                            >
                                                Hapus
                                            </Button>
                                            <SecondaryButton
                                                onClick={() => { setCertCrewId(c.id); setModal('cert'); }}
                                                icon={<ShieldCheck size={13} />}
                                            >
                                                Tambah Sertifikat
                                            </SecondaryButton>
                                        </div>
                                    }
                                >
                                    <Row gutter={20}>
                                        <Col xs={24} lg={12}>
                                            <div className="mb-1.5 flex items-center justify-between">
                                                <p className="text-xs font-semibold uppercase tracking-wide text-[#5B6474]">Penempatan</p>
                                                <button
                                                    type="button"
                                                    onClick={() => { setAddAssignmentCrewId(c.id); assignmentForm.setData('crew_id', String(c.id)); assignmentForm.setData('role', c.rank); setModal('addAssignment'); }}
                                                    className="text-xs font-medium text-[#BA0C2F] hover:underline"
                                                >
                                                    + Tambah
                                                </button>
                                            </div>
                                            {c.assignments.length === 0 ? (
                                                <p className="text-sm text-[#5B6474]">Belum ditempatkan.</p>
                                            ) : (
                                                <div className="space-y-1">
                                                    {c.assignments.map((a: any, i: number) => (
                                                        <div key={i} className="flex items-center justify-between rounded-lg border border-[#E3E8F0] px-3 py-1.5">
                                                            <span className="text-[#111827]">{a.vessel_name}</span>
                                                            <span className="text-xs text-[#5B6474]">
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
                                                                    className="text-[#BA0C2F] hover:underline"
                                                                >
                                                                    Edit
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setConfirmDel({ url: `/sdm/penempatan/${a.id}`, label: `penempatan ${a.vessel_name} — ${c.name}` })}
                                                                    className="text-[#BA0C2F] hover:underline"
                                                                >
                                                                    Lepas
                                                                </button>
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            <p className="mt-3 text-xs text-[#5B6474]">
                                                NIK: {c.nik ?? '—'} · {c.birth_place ?? '—'}, {formatDate(c.birth_date)} · HP: {c.phone ?? '—'}
                                            </p>
                                        </Col>
                                        <Col xs={24} lg={12}>
                                            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[#5B6474]">Sertifikat & Kesehatan</p>
                                            {c.certificates.length === 0 ? (
                                                <p className="text-sm text-[#5B6474]">Belum ada sertifikat.</p>
                                            ) : (
                                                <div className="space-y-1.5">
                                                    {c.certificates.map((cert: any) => {
                                                        const tone: BadgeTone = cert.days_left === null
                                                            ? 'neutral'
                                                            : cert.days_left < 0
                                                              ? 'danger'
                                                              : cert.days_left <= 30
                                                                ? 'warning'
                                                                : 'success';
                                                        return (
                                                            <div key={cert.id} id={`record-cert-${cert.id}`} className="flex items-center justify-between rounded-lg border border-[#E3E8F0] px-3 py-1.5 text-sm">
                                                                <span className="text-[#111827]">
                                                                    {CERT_TYPES.find((t) => t[0] === cert.cert_type)?.[1] ?? cert.cert_type}
                                                                    <span className="ms-1.5 text-xs text-[#5B6474]">{cert.number}</span>
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
                                                                        className="text-[#BA0C2F] hover:underline"
                                                                    >
                                                                        Edit
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setConfirmDel({ url: `/sdm/abk/${c.id}/sertifikat/${cert.id}`, label: `sertifikat ${cert.cert_type} milik ${c.name}` })}
                                                                        className="text-[#BA0C2F] hover:underline"
                                                                    >
                                                                        Hapus
                                                                    </button>
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </Col>
                                    </Row>
                                </Card>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {tab === 'karyawan' && (
                <Table
                    dataSource={employees ?? []}
                    columns={employeeColumns}
                    rowKey="id"
                    pagination={false}
                    size="small"
                    scroll={{ x: 900 }}
                    rowClassName={() => 'hover:bg-[#F5F7FA]'}
                />
            )}

            <Modal show={modal === 'crew'} onClose={() => setModal(null)} maxWidth="lg">
                <form onSubmit={submitCrew} className="p-6">
                    <h2 className="text-lg font-semibold text-[#111827]">Daftar ABK Baru</h2>
                    <Row gutter={12} className="mt-4">
                        <Col xs={12} md={8}>
                            <Form.Item label={<span className="text-xs font-medium text-[#5B6474]">Nama *</span>}>
                                <Input value={crewForm.data.name} onChange={(e) => crewForm.setData('name', e.target.value)} />
                            </Form.Item>
                        </Col>
                        <Col xs={12} md={8}>
                            <Form.Item label={<span className="text-xs font-medium text-[#5B6474]">NIK</span>}>
                                <Input value={crewForm.data.nik} onChange={(e) => crewForm.setData('nik', e.target.value)} />
                            </Form.Item>
                        </Col>
                        <Col xs={12} md={8}>
                            <Form.Item label={<span className="text-xs font-medium text-[#5B6474]">Tempat Lahir</span>}>
                                <Input value={crewForm.data.birth_place} onChange={(e) => crewForm.setData('birth_place', e.target.value)} />
                            </Form.Item>
                        </Col>
                        <Col xs={12} md={8}>
                            <Form.Item label={<span className="text-xs font-medium text-[#5B6474]">Tanggal Lahir</span>}>
                                <Input type="date" value={crewForm.data.birth_date} onChange={(e) => crewForm.setData('birth_date', e.target.value)} />
                            </Form.Item>
                        </Col>
                        <Col xs={12} md={8}>
                            <Form.Item label={<span className="text-xs font-medium text-[#5B6474]">Gender</span>}>
                                <AntSelect
                                    value={crewForm.data.gender}
                                    onChange={(v) => crewForm.setData('gender', v)}
                                    style={{ width: '100%' }}
                                    options={[{ value: 'L', label: 'Laki-laki' }, { value: 'P', label: 'Perempuan' }]}
                                />
                            </Form.Item>
                        </Col>
                        <Col xs={12} md={8}>
                            <Form.Item label={<span className="text-xs font-medium text-[#5B6474]">HP</span>}>
                                <Input value={crewForm.data.phone} onChange={(e) => crewForm.setData('phone', e.target.value)} />
                            </Form.Item>
                        </Col>
                        <Col xs={12} md={8}>
                            <Form.Item label={<span className="text-xs font-medium text-[#5B6474]">NPWP</span>}>
                                <Input value={crewForm.data.npwp} onChange={(e) => crewForm.setData('npwp', e.target.value)} />
                            </Form.Item>
                        </Col>
                        <Col xs={12} md={8}>
                            <Form.Item label={<span className="text-xs font-medium text-[#5B6474]">Kode NIK Internal</span>}>
                                <Input value={crewForm.data.kode_nik} onChange={(e) => crewForm.setData('kode_nik', e.target.value)} placeholder="020107" />
                            </Form.Item>
                        </Col>
                        <Col xs={12} md={8}>
                            <Form.Item label={<span className="text-xs font-medium text-[#5B6474]">Kode Pelaut</span>}>
                                <Input value={crewForm.data.seafarer_code} onChange={(e) => crewForm.setData('seafarer_code', e.target.value)} placeholder="6201297511" />
                            </Form.Item>
                        </Col>
                        <Col xs={12} md={8}>
                            <Form.Item label={<span className="text-xs font-medium text-[#5B6474]">SCCW / Sert. Utama</span>}>
                                <Input value={crewForm.data.sccw} onChange={(e) => crewForm.setData('sccw', e.target.value)} placeholder="ANT IV M / RATINGS" />
                            </Form.Item>
                        </Col>
                        <Col xs={12} md={8}>
                            <Form.Item label={<span className="text-xs font-medium text-[#5B6474]">No PKL</span>}>
                                <Input value={crewForm.data.no_pkl} onChange={(e) => crewForm.setData('no_pkl', e.target.value)} placeholder="0107/BT-MI/S.ya/IV/2024" />
                            </Form.Item>
                        </Col>
                        <Col xs={12} md={8}>
                            <Form.Item label={<span className="text-xs font-medium text-[#5B6474]">Tanggal Masuk</span>}>
                                <Input type="date" value={crewForm.data.joined_on} onChange={(e) => crewForm.setData('joined_on', e.target.value)} />
                            </Form.Item>
                        </Col>
                        <Col xs={12} md={8}>
                            <Form.Item label={<span className="text-xs font-medium text-[#5B6474]">Jabatan Pelayaran *</span>}>
                                <AntSelect
                                    value={crewForm.data.rank}
                                    onChange={(v) => crewForm.setData('rank', v)}
                                    style={{ width: '100%' }}
                                    options={RANKS.map(([k, v]) => ({ value: k, label: v }))}
                                />
                            </Form.Item>
                        </Col>
                        <Col xs={12} md={8}>
                            <Form.Item label={<span className="text-xs font-medium text-[#5B6474]">Gaji Pokok *</span>}>
                                <PriceInput value={crewForm.data.base_salary} onChange={(e) => crewForm.setData('base_salary', e.target.value)} />
                            </Form.Item>
                        </Col>
                        <Col xs={12} md={8}>
                            <Form.Item label={<span className="text-xs font-medium text-[#5B6474]">Penempatan Awal</span>}>
                                <AntSelect
                                    value={crewForm.data.vessel_id || undefined}
                                    onChange={(v) => crewForm.setData('vessel_id', v ?? '')}
                                    placeholder="— belum —"
                                    style={{ width: '100%' }}
                                    allowClear
                                    options={(vessels ?? []).map((v) => ({ value: String(v.id), label: v.vessel_name }))}
                                />
                            </Form.Item>
                        </Col>
                        <Col xs={12} md={8}>
                            <Form.Item label={<span className="text-xs font-medium text-[#5B6474]">Status</span>}>
                                <AntSelect
                                    value={crewForm.data.status}
                                    onChange={(v) => crewForm.setData('status', v)}
                                    style={{ width: '100%' }}
                                    options={[
                                        { value: 'aktif', label: 'Aktif' },
                                        { value: 'cuti', label: 'Cuti' },
                                        { value: 'selesai', label: 'Selesai' },
                                    ]}
                                />
                            </Form.Item>
                        </Col>
                    </Row>
                    <div className="mt-5 flex justify-end gap-3">
                        <SecondaryButton onClick={() => setModal(null)}>Batal</SecondaryButton>
                        <PrimaryButton htmlType="submit" disabled={crewForm.processing}>Simpan ABK</PrimaryButton>
                    </div>
                </form>
            </Modal>

            <Modal show={modal === 'cert'} onClose={() => setModal(null)} maxWidth="md">
                <form onSubmit={submitCert} className="p-6">
                    <h2 className="text-lg font-semibold text-[#111827]">Tambah Sertifikat ABK</h2>
                    <div className="mt-4 space-y-3">
                        <Form.Item label={<span className="text-xs font-medium text-[#5B6474]">Jenis *</span>}>
                            <AntSelect
                                value={certForm.data.cert_type}
                                onChange={(v) => certForm.setData('cert_type', v)}
                                style={{ width: '100%' }}
                                options={CERT_TYPES.map(([k, v]) => ({ value: k, label: v }))}
                            />
                        </Form.Item>
                        <Form.Item label={<span className="text-xs font-medium text-[#5B6474]">Nomor</span>}>
                            <Input value={certForm.data.number} onChange={(e) => certForm.setData('number', e.target.value)} />
                        </Form.Item>
                        <Form.Item label={<span className="text-xs font-medium text-[#5B6474]">Tanggal Terbit</span>}>
                            <Input type="date" value={certForm.data.issued_at} onChange={(e) => certForm.setData('issued_at', e.target.value)} />
                        </Form.Item>
                        <Checkbox checked={certForm.data.has_expiry} onChange={(e) => certForm.setData('has_expiry', e.target.checked)}>
                            Punya masa berlaku (ikut reminder)
                        </Checkbox>
                        {certForm.data.has_expiry && (
                            <Form.Item label={<span className="text-xs font-medium text-[#5B6474]">Berlaku s/d *</span>}>
                                <Input type="date" value={certForm.data.expiry_date} onChange={(e) => certForm.setData('expiry_date', e.target.value)} />
                            </Form.Item>
                        )}
                    </div>
                    <div className="mt-5 flex justify-end gap-3">
                        <SecondaryButton onClick={() => setModal(null)}>Batal</SecondaryButton>
                        <PrimaryButton htmlType="submit" disabled={certForm.processing}>Simpan Sertifikat</PrimaryButton>
                    </div>
                </form>
            </Modal>

            <Modal show={modal === 'employee'} onClose={() => setModal(null)} maxWidth="md">
                <form onSubmit={submitEmployee} className="p-6">
                    <h2 className="text-lg font-semibold text-[#111827]">Karyawan Kantor Baru</h2>
                    <Row gutter={12} className="mt-4">
                        <Col span={12}>
                            <Form.Item label={<span className="text-xs font-medium text-[#5B6474]">Nama *</span>}>
                                <Input value={employeeForm.data.name} onChange={(e) => employeeForm.setData('name', e.target.value)} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label={<span className="text-xs font-medium text-[#5B6474]">Jabatan *</span>}>
                                <Input value={employeeForm.data.position} onChange={(e) => employeeForm.setData('position', e.target.value)} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label={<span className="text-xs font-medium text-[#5B6474]">Departemen</span>}>
                                <Input value={employeeForm.data.department} onChange={(e) => employeeForm.setData('department', e.target.value)} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label={<span className="text-xs font-medium text-[#5B6474]">Tanggal Masuk</span>}>
                                <Input type="date" value={employeeForm.data.join_date} onChange={(e) => employeeForm.setData('join_date', e.target.value)} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label={<span className="text-xs font-medium text-[#5B6474]">Gaji Pokok *</span>}>
                                <PriceInput value={employeeForm.data.base_salary} onChange={(e) => employeeForm.setData('base_salary', e.target.value)} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label={<span className="text-xs font-medium text-[#5B6474]">Tunjangan</span>}>
                                <PriceInput value={employeeForm.data.allowances} onChange={(e) => employeeForm.setData('allowances', e.target.value)} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <div className="mt-5 flex justify-end gap-3">
                        <SecondaryButton onClick={() => setModal(null)}>Batal</SecondaryButton>
                        <PrimaryButton htmlType="submit" disabled={employeeForm.processing}>Simpan Karyawan</PrimaryButton>
                    </div>
                </form>
            </Modal>

            <Modal show={modal === 'editCrew'} onClose={() => setModal(null)} maxWidth="lg">
                <form onSubmit={submitEditCrew} className="p-6">
                    <h2 className="text-lg font-semibold text-[#111827]">Edit ABK — {editCrew?.name}</h2>
                    <Row gutter={12} className="mt-4">
                        <Col xs={12} md={8}>
                            <Form.Item label={<span className="text-xs font-medium text-[#5B6474]">Nama *</span>}>
                                <Input value={editCrewForm.data.name} onChange={(e) => editCrewForm.setData('name', e.target.value)} />
                            </Form.Item>
                        </Col>
                        <Col xs={12} md={8}>
                            <Form.Item label={<span className="text-xs font-medium text-[#5B6474]">NIK</span>}>
                                <Input value={editCrewForm.data.nik} onChange={(e) => editCrewForm.setData('nik', e.target.value)} />
                            </Form.Item>
                        </Col>
                        <Col xs={12} md={8}>
                            <Form.Item label={<span className="text-xs font-medium text-[#5B6474]">Tempat Lahir</span>}>
                                <Input value={editCrewForm.data.birth_place} onChange={(e) => editCrewForm.setData('birth_place', e.target.value)} />
                            </Form.Item>
                        </Col>
                        <Col xs={12} md={8}>
                            <Form.Item label={<span className="text-xs font-medium text-[#5B6474]">Tanggal Lahir</span>}>
                                <Input type="date" value={editCrewForm.data.birth_date} onChange={(e) => editCrewForm.setData('birth_date', e.target.value)} />
                            </Form.Item>
                        </Col>
                        <Col xs={12} md={8}>
                            <Form.Item label={<span className="text-xs font-medium text-[#5B6474]">Gender</span>}>
                                <AntSelect
                                    value={editCrewForm.data.gender}
                                    onChange={(v) => editCrewForm.setData('gender', v)}
                                    style={{ width: '100%' }}
                                    options={[{ value: 'L', label: 'Laki-laki' }, { value: 'P', label: 'Perempuan' }]}
                                />
                            </Form.Item>
                        </Col>
                        <Col xs={12} md={8}>
                            <Form.Item label={<span className="text-xs font-medium text-[#5B6474]">HP</span>}>
                                <Input value={editCrewForm.data.phone} onChange={(e) => editCrewForm.setData('phone', e.target.value)} />
                            </Form.Item>
                        </Col>
                        <Col xs={12} md={8}>
                            <Form.Item label={<span className="text-xs font-medium text-[#5B6474]">NPWP</span>}>
                                <Input value={editCrewForm.data.npwp} onChange={(e) => editCrewForm.setData('npwp', e.target.value)} />
                            </Form.Item>
                        </Col>
                        <Col xs={12} md={8}>
                            <Form.Item label={<span className="text-xs font-medium text-[#5B6474]">Kode NIK Internal</span>}>
                                <Input value={editCrewForm.data.kode_nik} onChange={(e) => editCrewForm.setData('kode_nik', e.target.value)} />
                            </Form.Item>
                        </Col>
                        <Col xs={12} md={8}>
                            <Form.Item label={<span className="text-xs font-medium text-[#5B6474]">Kode Pelaut</span>}>
                                <Input value={editCrewForm.data.seafarer_code} onChange={(e) => editCrewForm.setData('seafarer_code', e.target.value)} />
                            </Form.Item>
                        </Col>
                        <Col xs={12} md={8}>
                            <Form.Item label={<span className="text-xs font-medium text-[#5B6474]">SCCW / Sert. Utama</span>}>
                                <Input value={editCrewForm.data.sccw} onChange={(e) => editCrewForm.setData('sccw', e.target.value)} />
                            </Form.Item>
                        </Col>
                        <Col xs={12} md={8}>
                            <Form.Item label={<span className="text-xs font-medium text-[#5B6474]">No PKL</span>}>
                                <Input value={editCrewForm.data.no_pkl} onChange={(e) => editCrewForm.setData('no_pkl', e.target.value)} />
                            </Form.Item>
                        </Col>
                        <Col xs={12} md={8}>
                            <Form.Item label={<span className="text-xs font-medium text-[#5B6474]">Tanggal Masuk</span>}>
                                <Input type="date" value={editCrewForm.data.joined_on} onChange={(e) => editCrewForm.setData('joined_on', e.target.value)} />
                            </Form.Item>
                        </Col>
                        <Col xs={12} md={8}>
                            <Form.Item label={<span className="text-xs font-medium text-[#5B6474]">Jabatan *</span>}>
                                <AntSelect
                                    value={editCrewForm.data.rank}
                                    onChange={(v) => editCrewForm.setData('rank', v)}
                                    style={{ width: '100%' }}
                                    options={RANKS.map(([k, v]) => ({ value: k, label: v }))}
                                />
                            </Form.Item>
                        </Col>
                        <Col xs={12} md={8}>
                            <Form.Item label={<span className="text-xs font-medium text-[#5B6474]">Gaji Pokok *</span>}>
                                <PriceInput value={editCrewForm.data.base_salary} onChange={(e) => editCrewForm.setData('base_salary', e.target.value)} />
                            </Form.Item>
                        </Col>
                        <Col xs={12} md={8}>
                            <Form.Item label={<span className="text-xs font-medium text-[#5B6474]">Status</span>}>
                                <AntSelect
                                    value={editCrewForm.data.status}
                                    onChange={(v) => editCrewForm.setData('status', v)}
                                    style={{ width: '100%' }}
                                    options={[
                                        { value: 'aktif', label: 'Aktif' },
                                        { value: 'cuti', label: 'Cuti' },
                                        { value: 'selesai', label: 'Selesai' },
                                    ]}
                                />
                            </Form.Item>
                        </Col>
                    </Row>
                    <div className="mt-5 flex justify-end gap-3">
                        <SecondaryButton onClick={() => setModal(null)}>Batal</SecondaryButton>
                        <PrimaryButton htmlType="submit" disabled={editCrewForm.processing}>Simpan</PrimaryButton>
                    </div>
                </form>
            </Modal>

            <Modal show={modal === 'editCert'} onClose={() => setModal(null)} maxWidth="md">
                <form onSubmit={submitEditCert} className="p-6">
                    <h2 className="text-lg font-semibold text-[#111827]">Edit Sertifikat ABK</h2>
                    <div className="mt-4 space-y-3">
                        <Form.Item label={<span className="text-xs font-medium text-[#5B6474]">Jenis *</span>}>
                            <AntSelect
                                value={editCertForm.data.cert_type}
                                onChange={(v) => editCertForm.setData('cert_type', v)}
                                style={{ width: '100%' }}
                                options={CERT_TYPES.map(([k, v]) => ({ value: k, label: v }))}
                            />
                        </Form.Item>
                        <Form.Item label={<span className="text-xs font-medium text-[#5B6474]">Nomor</span>}>
                            <Input value={editCertForm.data.number} onChange={(e) => editCertForm.setData('number', e.target.value)} />
                        </Form.Item>
                        <Form.Item label={<span className="text-xs font-medium text-[#5B6474]">Tanggal Terbit</span>}>
                            <Input type="date" value={editCertForm.data.issued_at} onChange={(e) => editCertForm.setData('issued_at', e.target.value)} />
                        </Form.Item>
                        <Checkbox checked={editCertForm.data.has_expiry} onChange={(e) => editCertForm.setData('has_expiry', e.target.checked)}>
                            Punya masa berlaku (ikut reminder)
                        </Checkbox>
                        {editCertForm.data.has_expiry && (
                            <Form.Item label={<span className="text-xs font-medium text-[#5B6474]">Berlaku s/d *</span>}>
                                <Input type="date" value={editCertForm.data.expiry_date} onChange={(e) => editCertForm.setData('expiry_date', e.target.value)} />
                            </Form.Item>
                        )}
                    </div>
                    <div className="mt-5 flex justify-end gap-3">
                        <SecondaryButton onClick={() => setModal(null)}>Batal</SecondaryButton>
                        <PrimaryButton htmlType="submit" disabled={editCertForm.processing}>Simpan</PrimaryButton>
                    </div>
                </form>
            </Modal>

            <Modal show={modal === 'addAssignment'} onClose={() => setModal(null)} maxWidth="md">
                <form onSubmit={submitAssignment} className="p-6">
                    <h2 className="text-lg font-semibold text-[#111827]">Tambah Penempatan ABK</h2>
                    <p className="text-xs text-[#5B6474]">Penempatan aktif sebelumnya (di kapal mana pun) akan otomatis ditutup.</p>
                    <div className="mt-4 space-y-3">
                        <Form.Item label={<span className="text-xs font-medium text-[#5B6474]">Kapal *</span>}>
                            <AntSelect
                                value={assignmentForm.data.vessel_id || undefined}
                                onChange={(v) => assignmentForm.setData('vessel_id', v ?? '')}
                                placeholder="— pilih —"
                                style={{ width: '100%' }}
                                options={(vessels ?? []).map((v: any) => ({ value: String(v.id), label: v.vessel_name }))}
                            />
                        </Form.Item>
                        <Form.Item label={<span className="text-xs font-medium text-[#5B6474]">Jabatan di Kapal *</span>}>
                            <Input value={assignmentForm.data.role} onChange={(e) => assignmentForm.setData('role', e.target.value)} />
                        </Form.Item>
                        <Form.Item label={<span className="text-xs font-medium text-[#5B6474]">Mulai *</span>}>
                            <Input type="date" value={assignmentForm.data.start_date} onChange={(e) => assignmentForm.setData('start_date', e.target.value)} />
                        </Form.Item>
                        <Form.Item label={<span className="text-xs font-medium text-[#5B6474]">Selesai</span>}>
                            <Input type="date" value={assignmentForm.data.end_date} onChange={(e) => assignmentForm.setData('end_date', e.target.value)} />
                        </Form.Item>
                    </div>
                    <div className="mt-5 flex justify-end gap-3">
                        <SecondaryButton onClick={() => setModal(null)}>Batal</SecondaryButton>
                        <PrimaryButton htmlType="submit" disabled={assignmentForm.processing}>Simpan Penempatan</PrimaryButton>
                    </div>
                </form>
            </Modal>

            <Modal show={modal === 'editAssignment'} onClose={() => setModal(null)} maxWidth="md">
                <form onSubmit={submitEditAssignment} className="p-6">
                    <h2 className="text-lg font-semibold text-[#111827]">Edit Penempatan</h2>
                    <div className="mt-4 space-y-3">
                        <Form.Item label={<span className="text-xs font-medium text-[#5B6474]">Kapal *</span>}>
                            <AntSelect
                                value={editAssignmentForm.data.vessel_id || undefined}
                                onChange={(v) => editAssignmentForm.setData('vessel_id', v ?? '')}
                                style={{ width: '100%' }}
                                options={(vessels ?? []).map((v: any) => ({ value: String(v.id), label: v.vessel_name }))}
                            />
                        </Form.Item>
                        <Form.Item label={<span className="text-xs font-medium text-[#5B6474]">Jabatan *</span>}>
                            <Input value={editAssignmentForm.data.role} onChange={(e) => editAssignmentForm.setData('role', e.target.value)} />
                        </Form.Item>
                        <Row gutter={12}>
                            <Col span={8}>
                                <Form.Item label={<span className="text-xs font-medium text-[#5B6474]">Mulai *</span>}>
                                    <Input type="date" value={editAssignmentForm.data.start_date} onChange={(e) => editAssignmentForm.setData('start_date', e.target.value)} />
                                </Form.Item>
                            </Col>
                            <Col span={8}>
                                <Form.Item label={<span className="text-xs font-medium text-[#5B6474]">Selesai</span>}>
                                    <Input type="date" value={editAssignmentForm.data.end_date} onChange={(e) => editAssignmentForm.setData('end_date', e.target.value)} />
                                </Form.Item>
                            </Col>
                            <Col span={8}>
                                <Form.Item label={<span className="text-xs font-medium text-[#5B6474]">Status</span>}>
                                    <AntSelect
                                        value={editAssignmentForm.data.status}
                                        onChange={(v) => editAssignmentForm.setData('status', v)}
                                        style={{ width: '100%' }}
                                        options={[
                                            { value: 'aktif', label: 'Aktif' },
                                            { value: 'cuti', label: 'Cuti' },
                                            { value: 'berakhir', label: 'Berakhir' },
                                        ]}
                                    />
                                </Form.Item>
                            </Col>
                        </Row>
                    </div>
                    <div className="mt-5 flex justify-end gap-3">
                        <SecondaryButton onClick={() => setModal(null)}>Batal</SecondaryButton>
                        <PrimaryButton htmlType="submit" disabled={editAssignmentForm.processing}>Simpan</PrimaryButton>
                    </div>
                </form>
            </Modal>

            <Modal show={modal === 'editEmployee'} onClose={() => setModal(null)} maxWidth="md">
                <form onSubmit={submitEditEmployee} className="p-6">
                    <h2 className="text-lg font-semibold text-[#111827]">Edit Karyawan — {editEmployee?.name}</h2>
                    <Row gutter={12} className="mt-4">
                        <Col span={12}>
                            <Form.Item label={<span className="text-xs font-medium text-[#5B6474]">Nama *</span>}>
                                <Input value={editEmployeeForm.data.name} onChange={(e) => editEmployeeForm.setData('name', e.target.value)} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label={<span className="text-xs font-medium text-[#5B6474]">Jabatan *</span>}>
                                <Input value={editEmployeeForm.data.position} onChange={(e) => editEmployeeForm.setData('position', e.target.value)} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label={<span className="text-xs font-medium text-[#5B6474]">Departemen</span>}>
                                <Input value={editEmployeeForm.data.department} onChange={(e) => editEmployeeForm.setData('department', e.target.value)} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label={<span className="text-xs font-medium text-[#5B6474]">Masuk</span>}>
                                <Input type="date" value={editEmployeeForm.data.join_date} onChange={(e) => editEmployeeForm.setData('join_date', e.target.value)} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label={<span className="text-xs font-medium text-[#5B6474]">Gaji Pokok *</span>}>
                                <PriceInput value={editEmployeeForm.data.base_salary} onChange={(e) => editEmployeeForm.setData('base_salary', e.target.value)} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label={<span className="text-xs font-medium text-[#5B6474]">Tunjangan</span>}>
                                <PriceInput value={editEmployeeForm.data.allowances} onChange={(e) => editEmployeeForm.setData('allowances', e.target.value)} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label={<span className="text-xs font-medium text-[#5B6474]">Status</span>}>
                                <AntSelect
                                    value={editEmployeeForm.data.status}
                                    onChange={(v) => editEmployeeForm.setData('status', v)}
                                    style={{ width: '100%' }}
                                    options={[
                                        { value: 'aktif', label: 'Aktif' },
                                        { value: 'keluar', label: 'Keluar' },
                                    ]}
                                />
                            </Form.Item>
                        </Col>
                    </Row>
                    <div className="mt-5 flex justify-end gap-3">
                        <SecondaryButton onClick={() => setModal(null)}>Batal</SecondaryButton>
                        <PrimaryButton htmlType="submit" disabled={editEmployeeForm.processing}>Simpan</PrimaryButton>
                    </div>
                </form>
            </Modal>

            <Modal show={modal === 'hor'} onClose={() => { setModal(null); setEditHor(null); }} maxWidth="lg">
                <form onSubmit={submitHor} className="p-6">
                    <h2 className="text-lg font-semibold text-[#111827]">
                        {editHor ? `Ubah Jam Istirahat — ${editHor.log_date}` : 'Catat Jam Istirahat Awak'}
                    </h2>
                    <p className="mt-1 text-xs text-[#5B6474]">
                        Aturan MLC 2006: istirahat ≥10 jam per 24 jam (satu blok ≥6 jam), kerja maksimal 14 jam per 24 jam.
                        Jam memakai waktu kapal (WITA).
                    </p>

                    <Row gutter={12} className="mt-4">
                        <Col xs={12}>
                            <Form.Item label={<span className="text-xs font-medium text-[#5B6474]">Awak *</span>} required>
                                <AntSelect
                                    value={horForm.data.crew_id || undefined}
                                    onChange={(v) => horForm.setData('crew_id', v ?? '')}
                                    placeholder="— pilih —"
                                    style={{ width: '100%' }}
                                    options={(horCrew ?? []).map((c) => ({ value: String(c.id), label: `${c.name} — ${c.rank}` }))}
                                />
                            </Form.Item>
                        </Col>
                        <Col xs={12}>
                            <Form.Item label={<span className="text-xs font-medium text-[#5B6474]">Tanggal *</span>} required>
                                <Input type="date" value={horForm.data.log_date} onChange={(e) => horForm.setData('log_date', e.target.value)} />
                            </Form.Item>
                        </Col>
                    </Row>

                    <div className="mt-4">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-medium text-[#5B6474]">Blok Istirahat (WITA) *</label>
                            <button
                                type="button"
                                onClick={() => horForm.setData('rest_entries', [...horForm.data.rest_entries, { start: '', end: '' }])}
                                className="text-xs font-medium text-[#BA0C2F] hover:underline"
                            >
                                + Tambah blok
                            </button>
                        </div>
                        <div className="mt-2 space-y-2">
                            {horForm.data.rest_entries.map((entry, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <Input
                                        type="time"
                                        value={entry.start}
                                        onChange={(e) => setHorEntry(idx, 'start', e.target.value)}
                                        style={{ width: 128 }}
                                    />
                                    <span className="text-[#5B6474]">s/d</span>
                                    <Input
                                        type="time"
                                        value={entry.end}
                                        onChange={(e) => setHorEntry(idx, 'end', e.target.value)}
                                        style={{ width: 128 }}
                                    />
                                    {horForm.data.rest_entries.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => horForm.setData('rest_entries', horForm.data.rest_entries.filter((_, i) => i !== idx))}
                                            className="text-[#BA0C2F] hover:underline"
                                            title="Hapus blok"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div
                        className="mt-4 rounded-lg px-3 py-2 text-sm"
                        style={horPreview.violations.length === 0
                            ? { background: '#15803D1A', color: '#15803D' }
                            : { background: '#BA0C2F1A', color: '#BA0C2F' }
                        }
                    >
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
                        <Form.Item label={<span className="text-xs font-medium text-[#5B6474]">Catatan (opsional)</span>}>
                            <Input
                                value={horForm.data.notes}
                                onChange={(e) => horForm.setData('notes', e.target.value)}
                                placeholder="mis. istirahat terpecah saat penjagaan malam"
                            />
                        </Form.Item>
                    </div>

                    <div className="mt-5 flex justify-end gap-3">
                        <SecondaryButton onClick={() => { setModal(null); setEditHor(null); }}>Batal</SecondaryButton>
                        <PrimaryButton htmlType="submit" disabled={horForm.processing}>
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
