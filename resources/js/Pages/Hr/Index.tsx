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
import { classNames, daysUntil, formatDate, formatRupiah } from '@/lib/format';
import { type PageProps } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { Anchor, ArrowLeftRight, Briefcase, ClipboardList, Plus, Printer, ShieldCheck, UserRound, Users } from 'lucide-react';
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
    movements,
    sijilRequests,
    reasonList,
    vesselReadiness,
}: PageProps<{
    tab: string;
    crews?: Array<Record<string, any>>;
    vessels?: Array<{ id: number; vessel_name: string }>;
    employees?: Array<Record<string, any>>;
    rankList?: Array<{ value: string; label: string }>;
    movements?: Array<Record<string, any>>;
    sijilRequests?: Array<Record<string, any>>;
    reasonList?: Array<{ value: string; label: string }>;
    vesselReadiness?: Array<Record<string, any>>;
}>) {
    // 36 jabatan materi gAJI (+ kadet/lainnya) dari server; fallback legacy
    const RANKS: [string, string][] = (rankList ?? LEGACY_RANKS.map(([value, label]) => ({ value, label })))
        .map((r: any) => [String(r.value ?? r[0]), String(r.label ?? r[1])]);
    const crewOptions = crews ?? [];

    const [modal, setModal] = useState<null | 'crew' | 'employee' | 'cert' | 'editCrew' | 'editCert' | 'editAssignment' | 'addAssignment' | 'editEmployee'
        | 'signOff' | 'signOn' | 'mutasi' | 'sijil' | 'kadet'>(null);
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
    // Crewing (materi CREWING)
    const signOffForm = useForm({
        crew_id: '', movement_date: '', reason: 'permohonan_sendiri', recommendation_by: '',
        replacement_crew_id: '', notes: '',
    });
    const signOnForm = useForm({
        crew_id: '', vessel_id: '', role: '', start_date: '', notes: '',
    });
    const mutasiForm = useForm({
        crew_id: '', kind: 'mutasi_kapal', vessel_id: '', role: '', movement_date: '', notes: '',
    });
    const sijilForm = useForm({
        vessel_id: '', kind: 'on', crew_ids: [] as string[], letter_date: '', signed_by: 'Capt Azwar Saputra', notes: '',
    });
    const kadetForm = useForm({
        crew_id: '', vessel_id: '', movement_date: '', notes: '',
    });
    const [kadetKind, setKadetKind] = useState<'on' | 'off'>('on');

    const submitEditEmployee = (e: FormEvent) => {
        e.preventDefault();
        if (! editEmployee) return;
        editEmployeeForm.put(`/sdm/karyawan/${editEmployee.id}`, { preserveScroll: true, onSuccess: () => { setModal(null); setEditEmployee(null); } });
    };

    const tabs = [
        { key: 'abk', label: 'ABK (Awak Kapal)', icon: Users, count: crews?.length },
        { key: 'register', label: 'Register ON/OFF', icon: ClipboardList, count: movements?.length },
        { key: 'kadet', label: 'Kadet (Prala)', icon: Anchor, count: tab === 'kadet' ? crews?.length : undefined },
        { key: 'karyawan', label: 'Karyawan Kantor', icon: Briefcase, count: employees?.length },
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

    // ===== Crewing handlers (materi CREWING) =====
    const submitSignOff = (e: FormEvent) => {
        e.preventDefault();
        signOffForm.post('/sdm/sign-off', { preserveScroll: true, onSuccess: () => { setModal(null); signOffForm.reset(); } });
    };
    const submitSignOn = (e: FormEvent) => {
        e.preventDefault();
        signOnForm.post('/sdm/sign-on', { preserveScroll: true, onSuccess: () => { setModal(null); signOnForm.reset(); } });
    };
    const submitMutasi = (e: FormEvent) => {
        e.preventDefault();
        mutasiForm.post('/sdm/mutasi', { preserveScroll: true, onSuccess: () => { setModal(null); mutasiForm.reset(); } });
    };
    const submitSijil = (e: FormEvent) => {
        e.preventDefault();
        sijilForm.post('/sdm/sijil', { preserveScroll: true, onSuccess: () => { setModal(null); sijilForm.reset(); } });
    };
    const submitKadet = (e: FormEvent) => {
        e.preventDefault();
        kadetForm.post(`/sdm/kadet/${kadetKind}`, { preserveScroll: true, onSuccess: () => { setModal(null); kadetForm.reset(); } });
    };

    const activeCrewOptions = crewOptions.filter((c: any) => c.status === 'aktif');
    const inactiveCrewOptions = crewOptions.filter((c: any) => c.status !== 'aktif');

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
                        {tab === 'register' && (
                            <>
                                <SecondaryButton type="button" onClick={() => setModal('signOn')}><ArrowLeftRight size={14} className="inline me-1" /> Sign ON</SecondaryButton>
                                <SecondaryButton type="button" onClick={() => setModal('signOff')}><ArrowLeftRight size={14} className="inline me-1" /> Sign OFF</SecondaryButton>
                                <SecondaryButton type="button" onClick={() => setModal('mutasi')}><ArrowLeftRight size={14} className="inline me-1" /> Mutasi</SecondaryButton>
                                <PrimaryButton onClick={() => { sijilForm.setData('letter_date', new Date().toISOString().slice(0, 10)); setModal('sijil'); }}><Plus size={15} className="inline me-1" /> Sijil ON</PrimaryButton>
                            </>
                        )}
                        {tab === 'kadet' && (
                            <>
                                <SecondaryButton type="button" onClick={() => { setKadetKind('on'); setModal('kadet'); }}><Plus size={15} className="inline me-1" /> Kadet ON (Prala)</SecondaryButton>
                                <PrimaryButton onClick={() => { setKadetKind('off'); setModal('kadet'); }}>Kadet OFF</PrimaryButton>
                            </>
                        )}
            {tab === 'register' && (
                <div className="space-y-5">
                    {/* Sijil ON/OFF ke Kesyahbandaran */}
                    <Card title="Permohonan Sijil (Kesyahbandaran & Otoritas Pelabuhan Kelas I)" description="Daftar permohonan sijil multi-awak — cetak surat untuk ditandatangani & diunggah ke sistem otoritas (manual).">
                        {(sijilRequests ?? []).length === 0 ? (
                            <p className="text-sm text-muted">Belum ada permohonan sijil. Klik “Sijil ON”.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-appbg text-left text-xs uppercase tracking-wide text-muted">
                                        <tr>{['No Surat', 'Tanggal', 'Jenis', 'Kapal', 'Awak', 'Oleh', 'Status', 'Aksi'].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr>
                                    </thead>
                                    <tbody className="divide-y divide-hairline">
                                        {(sijilRequests ?? []).map((s) => (
                                            <tr key={s.id} className="hover:bg-appbg">
                                                <td className="px-3 py-2 font-medium text-ink">{s.no_surat ?? '—'}</td>
                                                <td className="px-3 py-2 text-muted">{formatDate(s.letter_date)}</td>
                                                <td className="px-3 py-2"><Badge tone={s.kind === 'on' ? 'success' : 'neutral'}>SIJIL {s.kind.toUpperCase()}</Badge></td>
                                                <td className="px-3 py-2 text-muted">{s.vessel_name}</td>
                                                <td className="px-3 py-2 tabular-nums">{s.crew_count} orang</td>
                                                <td className="px-3 py-2 text-muted">{s.signed_by ?? '—'}</td>
                                                <td className="px-3 py-2"><Badge tone={s.status === 'terbit' ? 'success' : 'warning'}>{s.status}</Badge></td>
                                                <td className="px-3 py-2">
                                                    <button type="button" onClick={() => window.open(`/cetak/sijil/${s.id}`, '_blank')} className="text-xs font-medium text-primary hover:underline">Cetak Surat</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>

                    {/* Register gerakan awak */}
                    <Card title="Register Gerakan Awak (Sign ON/OFF · Mutasi · Kadet)" description="Riwayat gerakan beserta nomor surat terbit — materi CREWING (OFF, MUTASI, SIJIL).">
                        {(movements ?? []).length === 0 ? (
                            <p className="text-sm text-muted">Belum ada gerakan tercatat.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-appbg text-left text-xs uppercase tracking-wide text-muted">
                                        <tr>{['Tanggal', 'Jenis', 'ABK', 'Kapal', 'Jabatan', 'Alasan', 'No Surat', 'Aksi'].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr>
                                    </thead>
                                    <tbody className="divide-y divide-hairline">
                                        {(movements ?? []).map((m) => {
                                            const tone: BadgeTone = m.type === 'sign_on' || m.type === 'kadet_on' ? 'success' : m.type === 'sign_off' || m.type === 'kadet_off' ? 'danger' : 'warning';
                                            const printUrl = (m.type === 'sign_off' && m.no_surat) ? `/cetak/surat-off/${m.id}`
                                                : (m.type === 'kadet_on' || m.type === 'kadet_off') && m.no_surat ? `/cetak/kadet/${m.id}?kind=${m.type === 'kadet_on' ? 'on' : 'off'}` : null;
                                            return (
                                                <tr key={m.id} className="hover:bg-appbg">
                                                    <td className="px-3 py-2 text-muted">{formatDate(m.movement_date)}</td>
                                                    <td className="px-3 py-2"><Badge tone={tone}>{m.type_label}</Badge></td>
                                                    <td className="px-3 py-2 font-medium text-ink">{m.crew_name}</td>
                                                    <td className="px-3 py-2 text-muted">{m.vessel_name}</td>
                                                    <td className="px-3 py-2 text-muted">{m.role ?? '—'}</td>
                                                    <td className="px-3 py-2 text-muted">{m.reason ? (reasonList ?? []).find((r) => r.value === m.reason)?.label ?? m.reason : '—'}</td>
                                                    <td className="px-3 py-2 font-medium text-ink">{m.no_surat ?? '—'}</td>
                                                    <td className="px-3 py-2">
                                                        {printUrl ? (
                                                            <button type="button" onClick={() => window.open(printUrl, '_blank')} className="text-xs font-medium text-primary hover:underline">Cetak Surat</button>
                                                        ) : <span className="text-xs text-muted">—</span>}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>

                    {((vesselReadiness ?? []).length > 0) && (
                        <Card title="Kesiapan Awak per Kapal (TABLE CREW — 11 jabatan wajib)" description="Indikator internal kesiapan awak; jadi gate peringatan saat status → Siap Berangkat.">
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                {(vesselReadiness ?? []).filter((r) => r.percent < 100).map((r) => (
                                    <div key={r.vessel_id} className="rounded-lg border border-hairline px-3 py-2 text-sm">
                                        <span className="font-medium text-ink">{r.vessel_name}</span>
                                        <span className={`ms-2 text-xs font-semibold ${r.percent >= 100 ? 'text-success' : 'text-warning'}`}>{r.percent}%</span>
                                        <p className="text-xs text-muted">{(r.missing ?? []).map((m: any) => `${m.label} ×${m.need - m.have}`).join(', ') || 'Lengkap'}</p>
                                    </div>
                                ))}
                                {(vesselReadiness ?? []).filter((r) => r.percent >= 100).length > 0 && (
                                    <div className="rounded-lg border border-hairline px-3 py-2 text-sm text-muted">
                                        {(vesselReadiness ?? []).filter((r) => r.percent >= 100).length} kapal lain siap 100%.
                                    </div>
                                )}
                            </div>
                        </Card>
                    )}
                </div>
            )}

            {tab === 'kadet' && (
                (crews ?? []).length === 0 ? (
                    <EmptyState icon={Anchor} title="Belum ada kadet" description="Daftarkan taruna Praktek Laut (Prala) lewat ABK Baru dengan jabatan Kadet Deck/Mesin." />
                ) : (
                    <div className="overflow-hidden rounded-xl border border-hairline bg-white shadow-sm">
                        <table className="min-w-full text-sm">
                            <thead className="bg-appbg text-left text-xs uppercase tracking-wide text-muted">
                                <tr>{['Nama', 'Jabatan', 'Sekolah', 'NIT', 'Kode Pelaut', 'Buku Pelaut', 'Kapal', 'Status', 'Aksi'].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr>
                            </thead>
                            <tbody className="divide-y divide-hairline">
                                {(crews ?? []).map((c) => {
                                    const book = (c.certificates ?? []).find((cert: any) => cert.cert_type === 'buku_pelaut');
                                    const activeAsg = (c.assignments ?? []).find((a: any) => a.status === 'aktif');
                                    return (
                                        <tr key={c.id} className="hover:bg-appbg">
                                            <td className="px-3 py-2 font-medium text-ink">{c.name}</td>
                                            <td className="px-3 py-2 text-muted">{c.rank_label ?? c.rank}</td>
                                            <td className="px-3 py-2 text-muted">{c.school_origin ?? '—'}</td>
                                            <td className="px-3 py-2 text-muted">{c.nit ?? '—'}</td>
                                            <td className="px-3 py-2 text-muted">{c.seafarer_code ?? '—'}</td>
                                            <td className="px-3 py-2 text-muted">{book ? `${book.number ?? '—'} · ${formatDate(book.expiry_date)}` : '—'}</td>
                                            <td className="px-3 py-2 text-muted">{activeAsg?.vessel_name ?? '—'}</td>
                                            <td className="px-3 py-2"><Badge tone={c.status === 'aktif' ? 'success' : 'neutral'}>{c.status}</Badge></td>
                                            <td className="px-3 py-2">
                                                <div className="flex gap-2 text-xs font-medium">
                                                    <button type="button" onClick={() => { setKadetKind('on'); kadetForm.setData('crew_id', String(c.id)); kadetForm.setData('movement_date', new Date().toISOString().slice(0, 10)); setModal('kadet'); }} className="text-primary hover:underline">ON (Prala)</button>
                                                    <button type="button" onClick={() => { setKadetKind('off'); kadetForm.setData('crew_id', String(c.id)); kadetForm.setData('movement_date', new Date().toISOString().slice(0, 10)); setModal('kadet'); }} className="text-primary hover:underline">OFF (Selesai PK)</button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )
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

            {/* ===== Crewing modals (materi CREWING) ===== */}

            {/* Modal: Sign OFF */}
            <Modal show={modal === 'signOff'} onClose={() => setModal(null)} maxWidth="lg">
                <form onSubmit={submitSignOff} className="p-6">
                    <h2 className="text-lg font-semibold text-ink">Sign OFF Awak Kapal</h2>
                    <p className="mt-1 text-xs text-muted">Surat Pemberhentian (MUTASI OFF) bernomor <b>…/BT-OFF/…</b>. Perwira wajib menyertakan pengganti + rekomendasi Nakhoda/KKM. Prosedur: ajukan H-7 sebelum efektif.</p>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                        <div><label className="text-xs font-medium text-muted">ABK (aktif) *</label>
                            <select value={signOffForm.data.crew_id} onChange={(e) => signOffForm.setData('crew_id', e.target.value)} className={INPUT_CLS}>
                                <option value="">— pilih —</option>
                                {activeCrewOptions.map((c: any) => <option key={c.id} value={c.id}>{c.name} — {c.rank}</option>)}
                            </select>
                            {signOffForm.errors.crew_id && <p className="mt-1 text-xs text-danger">{signOffForm.errors.crew_id}</p>}
                        </div>
                        <div><label className="text-xs font-medium text-muted">Tanggal Efektif OFF *</label>
                            <input type="date" value={signOffForm.data.movement_date} onChange={(e) => signOffForm.setData('movement_date', e.target.value)} className={INPUT_CLS} />
                        </div>
                        <div><label className="text-xs font-medium text-muted">Alasan *</label>
                            <select value={signOffForm.data.reason} onChange={(e) => signOffForm.setData('reason', e.target.value)} className={INPUT_CLS}>
                                {(reasonList ?? []).map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                            </select>
                        </div>
                        <div><label className="text-xs font-medium text-muted">Rekomendasi (wajib utk perwira)</label>
                            <select value={signOffForm.data.recommendation_by} onChange={(e) => signOffForm.setData('recommendation_by', e.target.value)} className={INPUT_CLS}>
                                <option value="">— pilih —</option>
                                <option value="nakhoda">Rekomendasi Nakhoda</option>
                                <option value="kkm">Rekomendasi KKM</option>
                                <option value="management">Rekomendasi Management</option>
                            </select>
                            {signOffForm.errors.recommendation_by && <p className="mt-1 text-xs text-danger">{signOffForm.errors.recommendation_by}</p>}
                        </div>
                        <div><label className="text-xs font-medium text-muted">Pengganti (wajib utk perwira)</label>
                            <select value={signOffForm.data.replacement_crew_id} onChange={(e) => signOffForm.setData('replacement_crew_id', e.target.value)} className={INPUT_CLS}>
                                <option value="">— belum —</option>
                                {activeCrewOptions.filter((c: any) => String(c.id) !== signOffForm.data.crew_id).map((c: any) => <option key={c.id} value={c.id}>{c.name} — {c.rank}</option>)}
                            </select>
                            {signOffForm.errors.replacement_crew_id && <p className="mt-1 text-xs text-danger">{signOffForm.errors.replacement_crew_id}</p>}
                        </div>
                        <div className="col-span-2"><label className="text-xs font-medium text-muted">Catatan</label>
                            <input value={signOffForm.data.notes} onChange={(e) => signOffForm.setData('notes', e.target.value)} className={INPUT_CLS} />
                        </div>
                    </div>
                    <div className="mt-5 flex justify-end gap-3">
                        <SecondaryButton type="button" onClick={() => setModal(null)}>Batal</SecondaryButton>
                        <PrimaryButton disabled={signOffForm.processing}>Catat Sign OFF</PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* Modal: Sign ON */}
            <Modal show={modal === 'signOn'} onClose={() => setModal(null)} maxWidth="lg">
                <form onSubmit={submitSignOn} className="p-6">
                    <h2 className="text-lg font-semibold text-ink">Sign ON Awak Kapal</h2>
                    <p className="mt-1 text-xs text-muted">Kelengkapan sertifikat & buku pelaut diverifikasi — bila belum lengkap sistem memberi <b>peringatan</b> (wajib dilengkapi sebelum kapal berangkat).</p>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                        <div><label className="text-xs font-medium text-muted">ABK (belum aktif) *</label>
                            <select value={signOnForm.data.crew_id} onChange={(e) => signOnForm.setData('crew_id', e.target.value)} className={INPUT_CLS}>
                                <option value="">— pilih —</option>
                                {inactiveCrewOptions.map((c: any) => <option key={c.id} value={c.id}>{c.name} — {c.rank}</option>)}
                            </select>
                        </div>
                        <div><label className="text-xs font-medium text-muted">Kapal *</label>
                            <select value={signOnForm.data.vessel_id} onChange={(e) => signOnForm.setData('vessel_id', e.target.value)} className={INPUT_CLS}>
                                <option value="">— pilih —</option>
                                {(vessels ?? []).map((v) => <option key={v.id} value={v.id}>{v.vessel_name}</option>)}
                            </select>
                        </div>
                        <div><label className="text-xs font-medium text-muted">Jabatan di Kapal *</label>
                            <select value={signOnForm.data.role} onChange={(e) => signOnForm.setData('role', e.target.value)} className={INPUT_CLS}>
                                <option value="">— pilih —</option>
                                {RANKS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                        </div>
                        <div><label className="text-xs font-medium text-muted">Tanggal Sign ON *</label>
                            <input type="date" value={signOnForm.data.start_date} onChange={(e) => signOnForm.setData('start_date', e.target.value)} className={INPUT_CLS} />
                        </div>
                        <div className="col-span-2"><label className="text-xs font-medium text-muted">Catatan</label>
                            <input value={signOnForm.data.notes} onChange={(e) => signOnForm.setData('notes', e.target.value)} className={INPUT_CLS} />
                        </div>
                    </div>
                    <div className="mt-5 flex justify-end gap-3">
                        <SecondaryButton type="button" onClick={() => setModal(null)}>Batal</SecondaryButton>
                        <PrimaryButton disabled={signOnForm.processing}>Catat Sign ON</PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* Modal: Mutasi */}
            <Modal show={modal === 'mutasi'} onClose={() => setModal(null)} maxWidth="lg">
                <form onSubmit={submitMutasi} className="p-6">
                    <h2 className="text-lg font-semibold text-ink">Mutasi Awak Kapal</h2>
                    <p className="mt-1 text-xs text-muted">Menutup penempatan lama + membuka baru, terbit surat <b>…/BT-MI/…</b> (No Surat Mutasi).</p>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                        <div><label className="text-xs font-medium text-muted">ABK *</label>
                            <select value={mutasiForm.data.crew_id} onChange={(e) => mutasiForm.setData('crew_id', e.target.value)} className={INPUT_CLS}>
                                <option value="">— pilih —</option>
                                {activeCrewOptions.map((c: any) => <option key={c.id} value={c.id}>{c.name} — {c.rank}</option>)}
                            </select>
                        </div>
                        <div><label className="text-xs font-medium text-muted">Jenis *</label>
                            <select value={mutasiForm.data.kind} onChange={(e) => mutasiForm.setData('kind', e.target.value)} className={INPUT_CLS}>
                                <option value="mutasi_kapal">Mutasi Kapal</option>
                                <option value="mutasi_jabatan">Mutasi Jabatan</option>
                            </select>
                        </div>
                        <div><label className="text-xs font-medium text-muted">{mutasiForm.data.kind === 'mutasi_kapal' ? 'Kapal Tujuan *' : 'Kapal (opsional)'}</label>
                            <select value={mutasiForm.data.vessel_id} onChange={(e) => mutasiForm.setData('vessel_id', e.target.value)} className={INPUT_CLS}>
                                <option value="">— pilih —</option>
                                {(vessels ?? []).map((v) => <option key={v.id} value={v.id}>{v.vessel_name}</option>)}
                            </select>
                            {mutasiForm.errors.vessel_id && <p className="mt-1 text-xs text-danger">{mutasiForm.errors.vessel_id}</p>}
                        </div>
                        <div><label className="text-xs font-medium text-muted">Jabatan Baru *</label>
                            <select value={mutasiForm.data.role} onChange={(e) => mutasiForm.setData('role', e.target.value)} className={INPUT_CLS}>
                                <option value="">— pilih —</option>
                                {RANKS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                        </div>
                        <div><label className="text-xs font-medium text-muted">Tanggal Efektif *</label>
                            <input type="date" value={mutasiForm.data.movement_date} onChange={(e) => mutasiForm.setData('movement_date', e.target.value)} className={INPUT_CLS} />
                        </div>
                        <div><label className="text-xs font-medium text-muted">Catatan</label>
                            <input value={mutasiForm.data.notes} onChange={(e) => mutasiForm.setData('notes', e.target.value)} className={INPUT_CLS} />
                        </div>
                    </div>
                    <div className="mt-5 flex justify-end gap-3">
                        <SecondaryButton type="button" onClick={() => setModal(null)}>Batal</SecondaryButton>
                        <PrimaryButton disabled={mutasiForm.processing}>Catat Mutasi</PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* Modal: Sijil ON/OFF */}
            <Modal show={modal === 'sijil'} onClose={() => setModal(null)} maxWidth="lg">
                <form onSubmit={submitSijil} className="p-6">
                    <h2 className="text-lg font-semibold text-ink">Permohonan Sijil ON/OFF</h2>
                    <p className="mt-1 text-xs text-muted">Surat permohonan multi-awak ke Kepala Kantor Kesyahbandaran & Otoritas Pelabuhan Kelas I Samarinda — nomor <b>…/AG/BT-ADM/…</b>.</p>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                        <div><label className="text-xs font-medium text-muted">Kapal *</label>
                            <select value={sijilForm.data.vessel_id} onChange={(e) => sijilForm.setData('vessel_id', e.target.value)} className={INPUT_CLS}>
                                <option value="">— pilih —</option>
                                {(vessels ?? []).map((v) => <option key={v.id} value={v.id}>{v.vessel_name}</option>)}
                            </select>
                        </div>
                        <div><label className="text-xs font-medium text-muted">Jenis *</label>
                            <select value={sijilForm.data.kind} onChange={(e) => sijilForm.setData('kind', e.target.value)} className={INPUT_CLS}>
                                <option value="on">Sijil ON</option>
                                <option value="off">Sijil OFF</option>
                            </select>
                        </div>
                        <div><label className="text-xs font-medium text-muted">Tanggal Surat *</label>
                            <input type="date" value={sijilForm.data.letter_date} onChange={(e) => sijilForm.setData('letter_date', e.target.value)} className={INPUT_CLS} />
                        </div>
                        <div><label className="text-xs font-medium text-muted">Ditandatangani</label>
                            <input value={sijilForm.data.signed_by} onChange={(e) => sijilForm.setData('signed_by', e.target.value)} className={INPUT_CLS} />
                        </div>
                        <div className="col-span-2"><label className="text-xs font-medium text-muted">Awak yang disijil * (centang)</label>
                            <div className="mt-1 max-h-48 overflow-y-auto rounded-lg border border-hairline p-2">
                                {activeCrewOptions.map((c: any) => {
                                    const checked = sijilForm.data.crew_ids.includes(String(c.id));
                                    return (
                                        <label key={c.id} className="flex items-center gap-2 px-1 py-1 text-sm hover:bg-appbg">
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={() => sijilForm.setData('crew_ids', checked
                                                    ? sijilForm.data.crew_ids.filter((id) => id !== String(c.id))
                                                    : [...sijilForm.data.crew_ids, String(c.id)])}
                                                className="rounded border-gray-300 text-primary focus:ring-primary"
                                            />
                                            <span className="text-ink">{c.name}</span>
                                            <span className="text-xs text-muted">{c.rank}</span>
                                        </label>
                                    );
                                })}
                            </div>
                            {sijilForm.errors.crew_ids && <p className="mt-1 text-xs text-danger">{sijilForm.errors['crew_ids'] ?? 'Pilih minimal 1 awak.'}</p>}
                            {sijilForm.errors['crew_ids.0'] && <p className="mt-1 text-xs text-danger">Pilih minimal 1 awak.</p>}
                        </div>
                    </div>
                    <div className="mt-5 flex justify-end gap-3">
                        <SecondaryButton type="button" onClick={() => setModal(null)}>Batal</SecondaryButton>
                        <PrimaryButton disabled={sijilForm.processing}>Simpan Permohonan</PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* Modal: Kadet ON/OFF */}
            <Modal show={modal === 'kadet'} onClose={() => setModal(null)} maxWidth="md">
                <form onSubmit={submitKadet} className="p-6">
                    <h2 className="text-lg font-semibold text-ink">{kadetKind === 'on' ? 'Kadet ON — Pengangkatan Praktek Laut (Prala)' : 'Kadet OFF — Selesai Praktek Kerja'}</h2>
                    <p className="mt-1 text-xs text-muted">{kadetKind === 'on'
                        ? 'Membuka penempatan kadet + surat pengangkatan bernomor …/BT-KDT/…'
                        : 'Menutup penempatan kadet + surat penyelesaian bernomor …/BT-KDT-OFF/…'}</p>
                    <div className="mt-4 space-y-3">
                        <div><label className="text-xs font-medium text-muted">Kadet *</label>
                            <select value={kadetForm.data.crew_id} onChange={(e) => kadetForm.setData('crew_id', e.target.value)} className={INPUT_CLS}>
                                <option value="">— pilih —</option>
                                {crewOptions.map((c: any) => <option key={c.id} value={c.id}>{c.name} — {c.rank}</option>)}
                            </select>
                        </div>
                        <div><label className="text-xs font-medium text-muted">{kadetKind === 'on' ? 'Kapal *' : 'Kapal (opsional)'}</label>
                            <select value={kadetForm.data.vessel_id} onChange={(e) => kadetForm.setData('vessel_id', e.target.value)} className={INPUT_CLS}>
                                <option value="">— pilih —</option>
                                {(vessels ?? []).map((v) => <option key={v.id} value={v.id}>{v.vessel_name}</option>)}
                            </select>
                        </div>
                        <div><label className="text-xs font-medium text-muted">Tanggal *</label>
                            <input type="date" value={kadetForm.data.movement_date} onChange={(e) => kadetForm.setData('movement_date', e.target.value)} className={INPUT_CLS} />
                        </div>
                        <div><label className="text-xs font-medium text-muted">Catatan</label>
                            <input value={kadetForm.data.notes} onChange={(e) => kadetForm.setData('notes', e.target.value)} className={INPUT_CLS} />
                        </div>
                    </div>
                    <div className="mt-5 flex justify-end gap-3">
                        <SecondaryButton type="button" onClick={() => setModal(null)}>Batal</SecondaryButton>
                        <PrimaryButton disabled={kadetForm.processing}>{kadetKind === 'on' ? 'Catat Kadet ON' : 'Catat Kadet OFF'}</PrimaryButton>
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
