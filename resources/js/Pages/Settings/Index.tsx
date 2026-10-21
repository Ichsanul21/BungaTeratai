import Badge from '@/Components/ui/Badge';
import Card from '@/Components/ui/Card';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PageHeader from '@/Components/ui/PageHeader';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TabNav from '@/Components/ui/TabNav';
import TextInput from '@/Components/TextInput';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { classNames, formatDate, formatRupiah } from '@/lib/format';
import { type PageProps } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { Bell, BookOpen, Briefcase, Building2, Plus, ScrollText, Shield, Users } from 'lucide-react';
import { FormEvent } from 'react';

const ROLE_LABELS: Record<string, string> = {
    super_admin: 'Super Admin',
    management: 'Management',
    ship_ops: 'Ship Operations',
    doc_controller: 'Document Controller',
    supervisor: 'Supervisor',
    finance: 'Finance',
    auditor: 'Auditor',
};

export default function SettingsIndex({
    tab,
    canManageUsers,
    usersList,
    roles,
    company,
    categories,
    reminderDays,
    customers,
    suppliers,
    serviceCatalog,
    accountsList,
    workflow,
}: PageProps<Record<string, any>>) {
    const tabs = [
        { key: 'users', label: 'Users & Roles', icon: Users },
        { key: 'profil', label: 'Profil Perusahaan', icon: Building2 },
        { key: 'reminder', label: 'Aturan Reminder', icon: Bell },
        { key: 'workflow', label: 'Alur Persetujuan', icon: Shield },
        { key: 'kategori', label: 'Kategori Dokumen', icon: BookOpen },
        { key: 'master', label: 'Master Data', icon: ScrollText },
    ];

    const userForm = useForm({ name: '', email: '', password: '', role: 'ship_ops' });
    const companyForm = useForm({
        company_name: company?.company_name ?? '',
        business_license_reference: company?.business_license_reference ?? '',
        npwp: company?.npwp ?? '',
        address: company?.address ?? '',
        city: company?.city ?? '',
        phone: company?.phone ?? '',
        email: company?.email ?? '',
    });
    const reminderForm = useForm({ reminder_days: reminderDays ?? '30,14,7,0' });
    const customerForm = useForm({ name: '', phone: '', notes: '' });
    const supplierForm = useForm({ name: '', category: '', phone: '' });
    const catalogForm = useForm({ name: '', kind: 'pendapatan', default_price: '' });

    const submitUser = (e: FormEvent) => {
        e.preventDefault();
        userForm.post('/pengaturan/users', { preserveScroll: true, onSuccess: () => userForm.reset() });
    };
    const submitCompany = (e: FormEvent) => {
        e.preventDefault();
        companyForm.put('/pengaturan/profil', { preserveScroll: true });
    };
    const submitReminder = (e: FormEvent) => {
        e.preventDefault();
        reminderForm.put('/pengaturan/reminder', { preserveScroll: true });
    };
    const submitCustomer = (e: FormEvent) => {
        e.preventDefault();
        customerForm.post('/pengaturan/customers', { preserveScroll: true, onSuccess: () => customerForm.reset() });
    };
    const submitSupplier = (e: FormEvent) => {
        e.preventDefault();
        supplierForm.post('/pengaturan/suppliers', { preserveScroll: true, onSuccess: () => supplierForm.reset() });
    };
    const submitCatalog = (e: FormEvent) => {
        e.preventDefault();
        catalogForm.post('/pengaturan/katalog', { preserveScroll: true, onSuccess: () => catalogForm.reset() });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Pengaturan" />

            <PageHeader
                title="Pengaturan"
                description="Users & roles, profil perusahaan, aturan reminder & persetujuan, kategori dokumen, dan master data."
            />

            <TabNav
                tabs={tabs}
                active={tab}
                onChange={(key) => router.get('/pengaturan', { tab: key }, { preserveState: true })}
            />

            {tab === 'users' && (
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
                    <Card title="Daftar Pengguna & Hak Akses" className="xl:col-span-2">
                        <table className="min-w-full text-sm">
                            <thead className="bg-appbg text-left text-xs uppercase text-muted">
                                <tr>{['Nama', 'Email', 'Role', 'Dibuat'].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr>
                            </thead>
                            <tbody className="divide-y divide-hairline">
                                {(usersList ?? []).map((u: any) => (
                                    <tr key={u.id} className="hover:bg-appbg">
                                        <td className="px-3 py-2 font-medium text-ink">{u.name}</td>
                                        <td className="px-3 py-2 text-muted">{u.email}</td>
                                        <td className="px-3 py-2">
                                            <div className="flex flex-wrap gap-1">
                                                {u.roles.map((r: string) => (
                                                    <Badge key={r} tone={r === 'super_admin' ? 'primary' : 'info'}>
                                                        {ROLE_LABELS[r] ?? r}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-3 py-2 text-xs text-muted">{formatDate(u.created_at)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </Card>
                    <Card title="Tambah Pengguna" description="Hanya Super Admin.">
                        {canManageUsers ? (
                            <form onSubmit={submitUser} className="space-y-3">
                                <div>
                                    <InputLabel value="Nama *" />
                                    <TextInput value={userForm.data.name} onChange={(e) => userForm.setData('name', e.target.value)} className="mt-1 block w-full" />
                                    <InputError message={userForm.errors.name} className="mt-1" />
                                </div>
                                <div>
                                    <InputLabel value="Email *" />
                                    <TextInput type="email" value={userForm.data.email} onChange={(e) => userForm.setData('email', e.target.value)} className="mt-1 block w-full" />
                                    <InputError message={userForm.errors.email} className="mt-1" />
                                </div>
                                <div>
                                    <InputLabel value="Password * (min 8)" />
                                    <TextInput type="password" value={userForm.data.password} onChange={(e) => userForm.setData('password', e.target.value)} className="mt-1 block w-full" />
                                    <InputError message={userForm.errors.password} className="mt-1" />
                                </div>
                                <div>
                                    <InputLabel value="Role *" />
                                    <select value={userForm.data.role} onChange={(e) => userForm.setData('role', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary">
                                        {(roles ?? []).map((r: any) => <option key={r.slug} value={r.slug}>{r.name}</option>)}
                                    </select>
                                </div>
                                <PrimaryButton disabled={userForm.processing}>Buat Pengguna</PrimaryButton>
                            </form>
                        ) : (
                            <p className="text-sm text-muted">Hanya Super Admin yang dapat menambah pengguna.</p>
                        )}
                    </Card>
                </div>
            )}

            {tab === 'profil' && (
                <Card title="Profil Perusahaan" className="max-w-3xl">
                    <form onSubmit={submitCompany} className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div><InputLabel value="Nama Perusahaan *" />
                            <TextInput value={companyForm.data.company_name} onChange={(e) => companyForm.setData('company_name', e.target.value)} className="mt-1 block w-full" /></div>
                        <div><InputLabel value="NIB / Legalitas" />
                            <TextInput value={companyForm.data.business_license_reference} onChange={(e) => companyForm.setData('business_license_reference', e.target.value)} className="mt-1 block w-full" /></div>
                        <div><InputLabel value="NPWP" />
                            <TextInput value={companyForm.data.npwp} onChange={(e) => companyForm.setData('npwp', e.target.value)} className="mt-1 block w-full" /></div>
                        <div><InputLabel value="Kota" />
                            <TextInput value={companyForm.data.city} onChange={(e) => companyForm.setData('city', e.target.value)} className="mt-1 block w-full" /></div>
                        <div className="md:col-span-2"><InputLabel value="Alamat" />
                            <TextInput value={companyForm.data.address} onChange={(e) => companyForm.setData('address', e.target.value)} className="mt-1 block w-full" /></div>
                        <div><InputLabel value="Telepon" />
                            <TextInput value={companyForm.data.phone} onChange={(e) => companyForm.setData('phone', e.target.value)} className="mt-1 block w-full" /></div>
                        <div><InputLabel value="Email" />
                            <TextInput value={companyForm.data.email} onChange={(e) => companyForm.setData('email', e.target.value)} className="mt-1 block w-full" /></div>
                        <div className="md:col-span-2">
                            <PrimaryButton disabled={companyForm.processing}>Simpan Profil</PrimaryButton>
                        </div>
                    </form>
                </Card>
            )}

            {tab === 'reminder' && (
                <Card title="Aturan Reminder Dokumen" description="Jeda hari sebelum kedaluwarsa (dipisah koma). Tanpa masa berlaku → tanpa reminder." className="max-w-xl">
                    <form onSubmit={submitReminder} className="flex items-end gap-3">
                        <div className="flex-1">
                            <InputLabel value="Hari pengingat *" />
                            <TextInput value={reminderForm.data.reminder_days} onChange={(e) => reminderForm.setData('reminder_days', e.target.value)} className="mt-1 block w-full" placeholder="30,14,7,0" />
                            <InputError message={reminderForm.errors.reminder_days} className="mt-1" />
                        </div>
                        <PrimaryButton disabled={reminderForm.processing}>Simpan</PrimaryButton>
                    </form>
                    <p className="mt-3 rounded-lg bg-appbg p-3 text-xs text-muted">
                        Berlaku untuk dokumen perusahaan, dokumen kapal, dan sertifikat ABK. Tanggal fiktif tidak pernah dibuat sistem.
                    </p>
                </Card>
            )}

            {tab === 'workflow' && (
                <Card title="Aturan Alur Persetujuan" className="max-w-2xl">
                    <ul className="space-y-3 text-sm">
                        {[
                            ['Persetujuan internal wajib sebelum tahap menunggu persetujuan eksternal', workflow?.internal_approval_required],
                            ['Persetujuan eksternal wajib melampirkan bukti/berkas sah', workflow?.external_approval_requires_evidence],
                            ['Ready for Departure hanya setelah checklist wajib terpenuhi + approval internal + status eksternal jelas', true],
                            ['Status siap berangkat = indikator internal, bukan persetujuan otoritas pelayaran', true],
                        ].map(([label, active]) => (
                            <li key={label as string} className="flex items-start justify-between gap-3 rounded-lg border border-hairline p-3">
                                <span className="text-ink">{label}</span>
                                <Badge tone={active ? 'success' : 'neutral'}>{active ? 'Aktif' : 'Nonaktif'}</Badge>
                            </li>
                        ))}
                    </ul>
                    <p className="mt-4 text-xs text-muted">
                        Konfigurasi lanjutan (multi-level approver, eskalasi) masuk roadmap implementasi.
                    </p>
                </Card>
            )}

            {tab === 'kategori' && (
                <Card title="Kategori Dokumen (A–G)">
                    <table className="min-w-full text-sm">
                        <thead className="bg-appbg text-left text-xs uppercase text-muted">
                            <tr>{['Kode', 'Nama', 'Kelompok'].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr>
                        </thead>
                        <tbody className="divide-y divide-hairline">
                            {(categories ?? []).map((c: any) => (
                                <tr key={c.id} className="hover:bg-appbg">
                                    <td className="px-3 py-2 font-mono text-xs text-ink">{c.code}</td>
                                    <td className="px-3 py-2 text-ink">{c.name}</td>
                                    <td className="px-3 py-2"><Badge tone="info">{c.group_code}</Badge></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Card>
            )}

            {tab === 'master' && (
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
                    <Card title="Customer" actions={
                        <button type="button" onClick={submitCustomer as any} className="hidden" />
                    }>
                        <form onSubmit={submitCustomer} className="mb-4 flex gap-2">
                            <input value={customerForm.data.name} onChange={(e) => customerForm.setData('name', e.target.value)} placeholder="Nama customer baru" className="h-9 flex-1 rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary" />
                            <PrimaryButton disabled={customerForm.processing || !customerForm.data.name}><Plus size={14} /></PrimaryButton>
                        </form>
                        <ul className="max-h-72 space-y-1 overflow-y-auto text-sm">
                            {(customers ?? []).map((c: any) => (
                                <li key={c.id} className="flex justify-between rounded-lg border border-hairline px-3 py-1.5">
                                    <span className="text-ink">{c.name}</span>
                                    <span className="text-xs text-muted">{c.phone}</span>
                                </li>
                            ))}
                        </ul>
                    </Card>
                    <Card title="Supplier">
                        <form onSubmit={submitSupplier} className="mb-4 flex gap-2">
                            <input value={supplierForm.data.name} onChange={(e) => supplierForm.setData('name', e.target.value)} placeholder="Nama supplier baru" className="h-9 flex-1 rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary" />
                            <select value={supplierForm.data.category} onChange={(e) => supplierForm.setData('category', e.target.value)} className="h-9 rounded-md border-gray-300 text-xs shadow-sm focus:border-primary focus:ring-primary">
                                <option value="">kategori…</option>
                                {['bengkel', 'sparepart', 'operator_lain', 'pemerintah', 'lainnya'].map((k) => <option key={k} value={k}>{k}</option>)}
                            </select>
                            <PrimaryButton disabled={supplierForm.processing || !supplierForm.data.name}><Plus size={14} /></PrimaryButton>
                        </form>
                        <ul className="max-h-72 space-y-1 overflow-y-auto text-sm">
                            {(suppliers ?? []).map((s: any) => (
                                <li key={s.id} className="flex justify-between rounded-lg border border-hairline px-3 py-1.5">
                                    <span className="text-ink">{s.name}</span>
                                    <span className="text-xs capitalize text-muted">{s.category}</span>
                                </li>
                            ))}
                        </ul>
                    </Card>
                    <div className="space-y-5">
                        <Card title="Katalog Jasa & Biaya">
                            <form onSubmit={submitCatalog} className="mb-4 space-y-2">
                                <input value={catalogForm.data.name} onChange={(e) => catalogForm.setData('name', e.target.value)} placeholder="Nama katalog" className="h-9 w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary" />
                                <div className="flex gap-2">
                                    <select value={catalogForm.data.kind} onChange={(e) => catalogForm.setData('kind', e.target.value)} className="h-9 flex-1 rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary">
                                        <option value="pendapatan">Pendapatan</option>
                                        <option value="biaya">Biaya</option>
                                    </select>
                                    <input type="number" value={catalogForm.data.default_price} onChange={(e) => catalogForm.setData('default_price', e.target.value)} placeholder="Harga" className="h-9 w-32 rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary" />
                                    <PrimaryButton disabled={catalogForm.processing || !catalogForm.data.name}><Plus size={14} /></PrimaryButton>
                                </div>
                            </form>
                            <ul className="max-h-52 space-y-1 overflow-y-auto text-sm">
                                {(serviceCatalog ?? []).map((s: any) => (
                                    <li key={s.id} className="flex justify-between rounded-lg border border-hairline px-3 py-1.5">
                                        <span className={classNames('text-ink', s.kind === 'biaya' && 'text-primary')}>{s.name}</span>
                                        <span className="tabular-nums text-muted">{formatRupiah(s.default_price)}</span>
                                    </li>
                                ))}
                            </ul>
                        </Card>
                        <Card title="Bagan Akun (COA)">
                            <ul className="max-h-48 space-y-1 overflow-y-auto text-sm">
                                {(accountsList ?? []).map((a: any) => (
                                    <li key={a.id} className="flex justify-between border-b border-hairline py-1">
                                        <span className="font-mono text-xs text-muted">{a.code}</span>
                                        <span className="text-ink">{a.name}</span>
                                    </li>
                                ))}
                            </ul>
                        </Card>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
