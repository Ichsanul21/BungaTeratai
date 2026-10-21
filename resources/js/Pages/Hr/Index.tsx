import Badge, { type BadgeTone } from '@/Components/ui/Badge';
import Card from '@/Components/ui/Card';
import EmptyState from '@/Components/ui/EmptyState';
import Modal from '@/Components/Modal';
import PageHeader from '@/Components/ui/PageHeader';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TabNav from '@/Components/ui/TabNav';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { classNames, daysUntil, formatDate, formatRupiah } from '@/lib/format';
import { type PageProps } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { Briefcase, Plus, ShieldCheck, UserRound, Users } from 'lucide-react';
import { FormEvent, useState } from 'react';

const RANKS = [
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

const CERT_TYPES = [
    ['SKK', 'Sertifikat Kompetensi (SKK)'],
    ['medical_fitness', 'Medical Fitness'],
    ['BST', 'Basic Safety Training'],
    ['ROC', 'Radio Operator Certificate'],
    ['CDC', 'CDC / Buku Pelaut'],
    ['passport', 'Paspor'],
    ['lainnya', 'Lainnya'],
];

export default function HrIndex({
    tab,
    crews,
    vessels,
    employees,
}: PageProps<{
    tab: string;
    crews?: Array<Record<string, any>>;
    vessels?: Array<{ id: number; vessel_name: string }>;
    employees?: Array<Record<string, any>>;
}>) {
    const [modal, setModal] = useState<null | 'crew' | 'employee' | 'cert'>(null);
    const [certCrewId, setCertCrewId] = useState<number | null>(null);

    const crewForm = useForm({
        name: '', nik: '', birth_place: '', birth_date: '', gender: 'L', phone: '', npwp: '',
        rank: 'kelasi', base_salary: '', status: 'aktif', vessel_id: '', assignment_role: '',
    });
    const employeeForm = useForm({
        name: '', nik: '', npwp: '', position: '', department: '', join_date: '',
        status: 'aktif', base_salary: '', allowances: '',
    });
    const certForm = useForm({
        cert_type: 'SKK', number: '', issued_at: '', has_expiry: true, expiry_date: '',
    });

    const tabs = [
        { key: 'abk', label: 'ABK (Awak Kapal)', icon: Users, count: crews?.length },
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

    return (
        <AuthenticatedLayout>
            <Head title="SDM & Karyawan" />

            <PageHeader
                title="SDM & Karyawan"
                description="Roster ABK (penempatan per kapal + sertifikat ber-masa berlaku → ikut Reminder) dan karyawan kantor. Payroll di menu Keuangan."
                actions={
                    tab === 'abk' ? (
                        <PrimaryButton onClick={() => setModal('crew')}><Plus size={15} className="inline me-1" /> ABK Baru</PrimaryButton>
                    ) : (
                        <PrimaryButton onClick={() => setModal('employee')}><Plus size={15} className="inline me-1" /> Karyawan Baru</PrimaryButton>
                    )
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
                                <Card
                                    key={c.id}
                                    title={c.name}
                                    description={`${RANKS.find((r) => r[0] === c.rank)?.[1] ?? c.rank} · ${c.status} · Gaji pokok ${formatRupiah(c.base_salary)}`}
                                    actions={
                                        <button
                                            type="button"
                                            onClick={() => { setCertCrewId(c.id); setModal('cert'); }}
                                            className="inline-flex items-center gap-1.5 rounded-lg border border-hairline px-2.5 py-1.5 text-xs font-medium text-ink hover:border-primary/40"
                                        >
                                            <ShieldCheck size={13} /> Tambah Sertifikat
                                        </button>
                                    }
                                >
                                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                                        <div>
                                            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">Penempatan</p>
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
                                                            <li key={cert.id} className="flex items-center justify-between rounded-lg border border-hairline px-3 py-1.5 text-sm">
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
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </>
            )}

            {tab === 'karyawan' && (
                <div className="overflow-hidden rounded-xl border border-hairline bg-white shadow-sm">
                    <table className="min-w-full text-sm">
                        <thead className="bg-appbg text-left text-xs uppercase tracking-wide text-muted">
                            <tr>{['Nama', 'Jabatan', 'Departemen', 'Masuk', 'Pokok', 'Tunjangan', 'Status'].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr>
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
                        <div><label className="text-xs font-medium text-muted">Jabatan Pelayaran *</label>
                            <select value={crewForm.data.rank} onChange={(e) => crewForm.setData('rank', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary">
                                {RANKS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select></div>
                        <div><label className="text-xs font-medium text-muted">Gaji Pokok *</label>
                            <input type="number" value={crewForm.data.base_salary} onChange={(e) => crewForm.setData('base_salary', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" /></div>
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
                            <input type="number" value={employeeForm.data.base_salary} onChange={(e) => employeeForm.setData('base_salary', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" /></div>
                        <div><label className="text-xs font-medium text-muted">Tunjangan</label>
                            <input type="number" value={employeeForm.data.allowances} onChange={(e) => employeeForm.setData('allowances', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" /></div>
                    </div>
                    <div className="mt-5 flex justify-end gap-3">
                        <SecondaryButton type="button" onClick={() => setModal(null)}>Batal</SecondaryButton>
                        <PrimaryButton disabled={employeeForm.processing}>Simpan Karyawan</PrimaryButton>
                    </div>
                </form>
            </Modal>
        </AuthenticatedLayout>
    );
}
