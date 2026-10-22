import Badge from '@/Components/ui/Badge';
import Card from '@/Components/ui/Card';
import ConfirmModal from '@/Components/ui/ConfirmModal';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import Modal from '@/Components/Modal';
import PageHeader from '@/Components/ui/PageHeader';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TabNav from '@/Components/ui/TabNav';
import TextInput from '@/Components/TextInput';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { classNames, formatDate, formatRupiah } from '@/lib/format';
import { type PageProps } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { Bell, BookOpen, Briefcase, Building2, Pencil, Plus, ScrollText, Shield, Trash2, Users } from 'lucide-react';
import { FormEvent, useState } from 'react';

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
    templates,
    customers,
    suppliers,
    serviceCatalog,
    accountsList,
    workflow,
}: PageProps<Record<string, any>>) {
    const tabs = [
        { key: 'users', label: 'Users & Roles', icon: Users },
        { key: 'profil', label: 'Profil Perusahaan', icon: Building2 },
        { key: 'template', label: 'Template & Nomor Surat', icon: ScrollText },
        { key: 'reminder', label: 'Aturan Reminder', icon: Bell },
        { key: 'workflow', label: 'Alur Persetujuan', icon: Shield },
        { key: 'kategori', label: 'Kategori Dokumen', icon: BookOpen },
        { key: 'master', label: 'Master Data', icon: Briefcase },
    ];

    const [modal, setModal] = useState<null | 'editUser' | 'editCustomer' | 'editSupplier' | 'editCatalog' | 'editCategory' | 'addCategory' | 'editTemplate'>(null);
    const [editUser, setEditUser] = useState<any>(null);
    const [editCustomer, setEditCustomer] = useState<any>(null);
    const [editSupplier, setEditSupplier] = useState<any>(null);
    const [editCatalog, setEditCatalog] = useState<any>(null);
    const [editCategory, setEditCategory] = useState<any>(null);
    const [editTemplate, setEditTemplate] = useState<any>(null);
    const [confirmDel, setConfirmDel] = useState<{ url: string; label: string; note?: string } | null>(null);
    const [busy, setBusy] = useState(false);

    const userForm = useForm({ name: '', email: '', password: '', role: 'ship_ops' });
    const editUserForm = useForm({ name: '', email: '', password: '', role: 'ship_ops' });
    const editCustomerForm = useForm({ name: '', npwp: '', address: '', phone: '', notes: '' });
    const editSupplierForm = useForm({ name: '', category: '', address: '', phone: '', notes: '' });
    const editCatalogForm = useForm({ name: '', kind: 'pendapatan', default_price: '' });
    const editCategoryForm = useForm({ name: '', group_code: 'A', sort: '0' });
    const addCategoryForm = useForm({ code: '', name: '', group_code: 'A', sort: '' });
    const editTemplateForm = useForm({ name: '', numbering_pattern: '', archive_pattern: '', enabled: true });

    const submitEditTemplate = (e: FormEvent) => {
        e.preventDefault();
        if (! editTemplate) return;
        editTemplateForm.put(`/pengaturan/templates/${editTemplate.id}`, { preserveScroll: true, onSuccess: () => { setModal(null); setEditTemplate(null); } });
    };
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
    const submitEditUser = (e: FormEvent) => {
        e.preventDefault();
        if (! editUser) return;
        editUserForm.put(`/pengaturan/users/${editUser.id}`, { preserveScroll: true, onSuccess: () => { setModal(null); setEditUser(null); } });
    };
    const submitEditCustomer = (e: FormEvent) => {
        e.preventDefault();
        if (! editCustomer) return;
        editCustomerForm.put(`/pengaturan/customers/${editCustomer.id}`, { preserveScroll: true, onSuccess: () => { setModal(null); setEditCustomer(null); } });
    };
    const submitEditSupplier = (e: FormEvent) => {
        e.preventDefault();
        if (! editSupplier) return;
        editSupplierForm.put(`/pengaturan/suppliers/${editSupplier.id}`, { preserveScroll: true, onSuccess: () => { setModal(null); setEditSupplier(null); } });
    };
    const submitEditCatalog = (e: FormEvent) => {
        e.preventDefault();
        if (! editCatalog) return;
        editCatalogForm.put(`/pengaturan/katalog/${editCatalog.id}`, { preserveScroll: true, onSuccess: () => { setModal(null); setEditCatalog(null); } });
    };
    const submitEditCategory = (e: FormEvent) => {
        e.preventDefault();
        if (! editCategory) return;
        editCategoryForm.put(`/pengaturan/kategori/${editCategory.id}`, { preserveScroll: true, onSuccess: () => { setModal(null); setEditCategory(null); } });
    };
    const submitAddCategory = (e: FormEvent) => {
        e.preventDefault();
        addCategoryForm.post('/pengaturan/kategori', { preserveScroll: true, onSuccess: () => { setModal(null); addCategoryForm.reset(); } });
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
                                <tr>{['Nama', 'Email', 'Role', 'Dibuat', ...(canManageUsers ? ['Aksi'] : [])].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr>
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
                                        {canManageUsers && (
                                            <td className="px-3 py-2">
                                                <div className="flex gap-2 text-xs font-medium">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setEditUser(u);
                                                            editUserForm.setData({ name: u.name, email: u.email, password: '', role: u.roles[0] ?? 'ship_ops' });
                                                            setModal('editUser');
                                                        }}
                                                        className="text-primary hover:underline"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setConfirmDel({ url: `/pengaturan/users/${u.id}`, label: `pengguna ${u.email}` })}
                                                        className="text-primary hover:underline"
                                                    >
                                                        Hapus
                                                    </button>
                                                </div>
                                            </td>
                                        )}
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

            {tab === 'template' && (
                <div className="space-y-3">
                    <p className="text-sm text-muted">
                        Token pola nomor: <code className="rounded bg-appbg px-1">{'{seq}'}</code>{' '}
                        <code className="rounded bg-appbg px-1">{'{seq_raw}'}</code>{' '}
                        <code className="rounded bg-appbg px-1">{'{tahun}'}</code>{' '}
                        <code className="rounded bg-appbg px-1">{'{bulan_romawi}'}</code>{' '}
                        <code className="rounded bg-appbg px-1">{'{kode}'}</code>{' '}
                        <code className="rounded bg-appbg px-1">{'{kode_penyewa}'}</code>{' '}
                        <code className="rounded bg-appbg px-1">{'{kode_kapal}'}</code>
                    </p>
                    {(templates ?? []).map((t: any) => (
                        <div key={t.id} className="rounded-xl border border-hairline bg-white p-4 shadow-sm">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                    <p className="font-semibold text-ink">
                                        <span className="font-mono text-xs text-muted">{t.code}</span> · {t.name}
                                    </p>
                                    <p className="text-xs text-muted">
                                        {t.kategori} · layout: {t.layout_type}
                                        {t.is_generic_letter ? ' · surat umum' : ''}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge tone={t.enabled ? 'success' : 'neutral'}>{t.enabled ? 'Aktif' : 'Nonaktif'}</Badge>
                                    {canManageUsers && (
                                        <div className="flex gap-2 text-xs font-medium">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setEditTemplate(t);
                                                    editTemplateForm.setData({
                                                        name: t.name,
                                                        numbering_pattern: t.numbering_pattern ?? '',
                                                        archive_pattern: t.archive_pattern ?? '',
                                                        enabled: Boolean(t.enabled),
                                                    });
                                                    setModal('editTemplate');
                                                }}
                                                className="text-primary hover:underline"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => router.post(`/pengaturan/templates/${t.id}/reset-counter`, { kind: 'terbit' }, { preserveScroll: true })}
                                                className="text-muted hover:text-ink"
                                            >
                                                Reset counter terbit
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => router.post(`/pengaturan/templates/${t.id}/reset-counter`, { kind: 'arsip' }, { preserveScroll: true })}
                                                className="text-muted hover:text-ink"
                                            >
                                                Reset counter arsip
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="mt-2 grid grid-cols-1 gap-2 text-xs md:grid-cols-2">
                                <p className="rounded-lg bg-appbg px-3 py-1.5 text-muted">
                                    Pola nomor terbit:{' '}
                                    <span className="font-mono text-ink">{t.numbering_pattern ?? '—'}</span>
                                    {' '}<span className="text-primary">(counter: {t.seq_last})</span>
                                </p>
                                <p className="rounded-lg bg-appbg px-3 py-1.5 text-muted">
                                    Pola nomor arsip:{' '}
                                    <span className="font-mono text-ink">{t.archive_pattern ?? '—'}</span>
                                    {' '}<span className="text-primary">(counter: {t.archive_seq_last})</span>
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
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
                <Card title="Kategori Dokumen (A–G)" actions={canManageUsers && (
                    <button type="button" onClick={() => setModal('addCategory')} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                        <Plus size={13} /> Tambah
                    </button>
                )}>
                    <table className="min-w-full text-sm">
                        <thead className="bg-appbg text-left text-xs uppercase text-muted">
                            <tr>{['Kode', 'Nama', 'Kelompok', ...(canManageUsers ? ['Aksi'] : [])].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr>
                        </thead>
                        <tbody className="divide-y divide-hairline">
                            {(categories ?? []).map((c: any) => (
                                <tr key={c.id} className="hover:bg-appbg">
                                    <td className="px-3 py-2 font-mono text-xs text-ink">{c.code}</td>
                                    <td className="px-3 py-2 text-ink">{c.name}</td>
                                    <td className="px-3 py-2"><Badge tone="info">{c.group_code}</Badge></td>
                                    {canManageUsers && (
                                        <td className="px-3 py-2">
                                            <div className="flex gap-2 text-xs font-medium">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setEditCategory(c);
                                                        editCategoryForm.setData({ name: c.name, group_code: c.group_code, sort: String(c.sort ?? 0) });
                                                        setModal('editCategory');
                                                    }}
                                                    className="text-primary hover:underline"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setConfirmDel({ url: `/pengaturan/kategori/${c.id}`, label: `kategori ${c.code} — ${c.name}` })}
                                                    className="text-primary hover:underline"
                                                >
                                                    Hapus
                                                </button>
                                            </div>
                                        </td>
                                    )}
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
                                <li key={c.id} className="flex items-center justify-between gap-2 rounded-lg border border-hairline px-3 py-1.5">
                                    <span className="text-ink">{c.name}</span>
                                    <span className="text-xs text-muted">{c.phone}</span>
                                    <span className="flex gap-2 text-xs font-medium">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setEditCustomer(c);
                                                editCustomerForm.setData({ name: c.name, npwp: c.npwp ?? '', address: c.address ?? '', phone: c.phone ?? '', notes: c.notes ?? '' });
                                                setModal('editCustomer');
                                            }}
                                            className="text-primary hover:underline"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setConfirmDel({ url: `/pengaturan/customers/${c.id}`, label: `customer ${c.name}` })}
                                            className="text-primary hover:underline"
                                        >
                                            Hapus
                                        </button>
                                    </span>
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
                                <li key={s.id} className="flex items-center justify-between gap-2 rounded-lg border border-hairline px-3 py-1.5">
                                    <span className="text-ink">{s.name}</span>
                                    <span className="text-xs capitalize text-muted">{s.category}</span>
                                    <span className="flex gap-2 text-xs font-medium">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setEditSupplier(s);
                                                editSupplierForm.setData({ name: s.name, category: s.category ?? '', address: s.address ?? '', phone: s.phone ?? '', notes: s.notes ?? '' });
                                                setModal('editSupplier');
                                            }}
                                            className="text-primary hover:underline"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setConfirmDel({ url: `/pengaturan/suppliers/${s.id}`, label: `supplier ${s.name}` })}
                                            className="text-primary hover:underline"
                                        >
                                            Hapus
                                        </button>
                                    </span>
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
                                    <li key={s.id} className="flex items-center justify-between gap-2 rounded-lg border border-hairline px-3 py-1.5">
                                        <span className={classNames('text-ink', s.kind === 'biaya' && 'text-primary')}>{s.name}</span>
                                        <span className="tabular-nums text-muted">{formatRupiah(s.default_price)}</span>
                                        <span className="flex gap-2 text-xs font-medium">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setEditCatalog(s);
                                                    editCatalogForm.setData({ name: s.name, kind: s.kind, default_price: String(s.default_price) });
                                                    setModal('editCatalog');
                                                }}
                                                className="text-primary hover:underline"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setConfirmDel({ url: `/pengaturan/katalog/${s.id}`, label: `katalog ${s.name}` })}
                                                className="text-primary hover:underline"
                                            >
                                                Hapus
                                            </button>
                                        </span>
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
            {/* Modal: Edit Pengguna */}
            <Modal show={modal === 'editUser'} onClose={() => setModal(null)} maxWidth="md">
                <form onSubmit={submitEditUser} className="p-6">
                    <h2 className="text-lg font-semibold text-ink">Edit Pengguna — {editUser?.email}</h2>
                    <div className="mt-4 space-y-3">
                        <div><label className="text-xs font-medium text-muted">Nama *</label>
                            <input value={editUserForm.data.name} onChange={(e) => editUserForm.setData('name', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" /></div>
                        <div><label className="text-xs font-medium text-muted">Email *</label>
                            <input value={editUserForm.data.email} onChange={(e) => editUserForm.setData('email', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" /></div>
                        <div><label className="text-xs font-medium text-muted">Role *</label>
                            <select value={editUserForm.data.role} onChange={(e) => editUserForm.setData('role', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary">
                                {(roles ?? []).map((r: any) => <option key={r.slug} value={r.slug}>{r.name}</option>)}
                            </select></div>
                        <div><label className="text-xs font-medium text-muted">Password Baru (opsional, min 8)</label>
                            <input type="password" value={editUserForm.data.password} onChange={(e) => editUserForm.setData('password', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" /></div>
                    </div>
                    <div className="mt-5 flex justify-end gap-3">
                        <SecondaryButton type="button" onClick={() => setModal(null)}>Batal</SecondaryButton>
                        <PrimaryButton disabled={editUserForm.processing}>Simpan</PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* Modal: Edit Customer */}
            <Modal show={modal === 'editCustomer'} onClose={() => setModal(null)} maxWidth="md">
                <form onSubmit={submitEditCustomer} className="p-6">
                    <h2 className="text-lg font-semibold text-ink">Edit Customer — {editCustomer?.name}</h2>
                    <div className="mt-4 space-y-3">
                        <div><label className="text-xs font-medium text-muted">Nama *</label>
                            <input value={editCustomerForm.data.name} onChange={(e) => editCustomerForm.setData('name', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" /></div>
                        <div><label className="text-xs font-medium text-muted">NPWP</label>
                            <input value={editCustomerForm.data.npwp} onChange={(e) => editCustomerForm.setData('npwp', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" /></div>
                        <div><label className="text-xs font-medium text-muted">Alamat</label>
                            <input value={editCustomerForm.data.address} onChange={(e) => editCustomerForm.setData('address', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" /></div>
                        <div><label className="text-xs font-medium text-muted">Telepon</label>
                            <input value={editCustomerForm.data.phone} onChange={(e) => editCustomerForm.setData('phone', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" /></div>
                    </div>
                    <div className="mt-5 flex justify-end gap-3">
                        <SecondaryButton type="button" onClick={() => setModal(null)}>Batal</SecondaryButton>
                        <PrimaryButton disabled={editCustomerForm.processing}>Simpan</PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* Modal: Edit Supplier */}
            <Modal show={modal === 'editSupplier'} onClose={() => setModal(null)} maxWidth="md">
                <form onSubmit={submitEditSupplier} className="p-6">
                    <h2 className="text-lg font-semibold text-ink">Edit Supplier — {editSupplier?.name}</h2>
                    <div className="mt-4 space-y-3">
                        <div><label className="text-xs font-medium text-muted">Nama *</label>
                            <input value={editSupplierForm.data.name} onChange={(e) => editSupplierForm.setData('name', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" /></div>
                        <div><label className="text-xs font-medium text-muted">Kategori</label>
                            <select value={editSupplierForm.data.category} onChange={(e) => editSupplierForm.setData('category', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary">
                                <option value="">—</option>
                                {['bengkel', 'sparepart', 'operator_lain', 'pemerintah', 'lainnya'].map((k) => <option key={k} value={k}>{k}</option>)}
                            </select></div>
                        <div><label className="text-xs font-medium text-muted">Telepon</label>
                            <input value={editSupplierForm.data.phone} onChange={(e) => editSupplierForm.setData('phone', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" /></div>
                    </div>
                    <div className="mt-5 flex justify-end gap-3">
                        <SecondaryButton type="button" onClick={() => setModal(null)}>Batal</SecondaryButton>
                        <PrimaryButton disabled={editSupplierForm.processing}>Simpan</PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* Modal: Edit Katalog */}
            <Modal show={modal === 'editCatalog'} onClose={() => setModal(null)} maxWidth="md">
                <form onSubmit={submitEditCatalog} className="p-6">
                    <h2 className="text-lg font-semibold text-ink">Edit Katalog — {editCatalog?.name}</h2>
                    <div className="mt-4 space-y-3">
                        <div><label className="text-xs font-medium text-muted">Nama *</label>
                            <input value={editCatalogForm.data.name} onChange={(e) => editCatalogForm.setData('name', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" /></div>
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className="text-xs font-medium text-muted">Jenis</label>
                                <select value={editCatalogForm.data.kind} onChange={(e) => editCatalogForm.setData('kind', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary">
                                    <option value="pendapatan">Pendapatan</option><option value="biaya">Biaya</option>
                                </select></div>
                            <div><label className="text-xs font-medium text-muted">Harga Default *</label>
                                <input type="number" step="0.01" value={editCatalogForm.data.default_price} onChange={(e) => editCatalogForm.setData('default_price', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" /></div>
                        </div>
                    </div>
                    <div className="mt-5 flex justify-end gap-3">
                        <SecondaryButton type="button" onClick={() => setModal(null)}>Batal</SecondaryButton>
                        <PrimaryButton disabled={editCatalogForm.processing}>Simpan</PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* Modal: Edit Kategori */}
            <Modal show={modal === 'editCategory'} onClose={() => setModal(null)} maxWidth="md">
                <form onSubmit={submitEditCategory} className="p-6">
                    <h2 className="text-lg font-semibold text-ink">Edit Kategori — {editCategory?.code}</h2>
                    <div className="mt-4 space-y-3">
                        <div><label className="text-xs font-medium text-muted">Nama *</label>
                            <input value={editCategoryForm.data.name} onChange={(e) => editCategoryForm.setData('name', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" /></div>
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className="text-xs font-medium text-muted">Kelompok</label>
                                <select value={editCategoryForm.data.group_code} onChange={(e) => editCategoryForm.setData('group_code', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary">
                                    {['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((g) => <option key={g} value={g}>{g}</option>)}
                                </select></div>
                            <div><label className="text-xs font-medium text-muted">Urutan</label>
                                <input type="number" value={editCategoryForm.data.sort} onChange={(e) => editCategoryForm.setData('sort', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" /></div>
                        </div>
                    </div>
                    <div className="mt-5 flex justify-end gap-3">
                        <SecondaryButton type="button" onClick={() => setModal(null)}>Batal</SecondaryButton>
                        <PrimaryButton disabled={editCategoryForm.processing}>Simpan</PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* Modal: Tambah Kategori */}
            <Modal show={modal === 'addCategory'} onClose={() => setModal(null)} maxWidth="md">
                <form onSubmit={submitAddCategory} className="p-6">
                    <h2 className="text-lg font-semibold text-ink">Tambah Kategori Dokumen</h2>
                    <div className="mt-4 space-y-3">
                        <div><label className="text-xs font-medium text-muted">Kode *</label>
                            <input value={addCategoryForm.data.code} onChange={(e) => addCategoryForm.setData('code', e.target.value)} placeholder="mis. H1" className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" /></div>
                        <div><label className="text-xs font-medium text-muted">Nama *</label>
                            <input value={addCategoryForm.data.name} onChange={(e) => addCategoryForm.setData('name', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" /></div>
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className="text-xs font-medium text-muted">Kelompok</label>
                                <select value={addCategoryForm.data.group_code} onChange={(e) => addCategoryForm.setData('group_code', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary">
                                    {['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((g) => <option key={g} value={g}>{g}</option>)}
                                </select></div>
                            <div><label className="text-xs font-medium text-muted">Urutan</label>
                                <input type="number" value={addCategoryForm.data.sort} onChange={(e) => addCategoryForm.setData('sort', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" /></div>
                        </div>
                    </div>
                    <div className="mt-5 flex justify-end gap-3">
                        <SecondaryButton type="button" onClick={() => setModal(null)}>Batal</SecondaryButton>
                        <PrimaryButton disabled={addCategoryForm.processing}>Simpan Kategori</PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* Modal: Edit Template */}
            <Modal show={modal === 'editTemplate'} onClose={() => setModal(null)} maxWidth="md">
                <form onSubmit={submitEditTemplate} className="p-6">
                    <h2 className="text-lg font-semibold text-ink">Edit Template — {editTemplate?.code}</h2>
                    <div className="mt-4 space-y-3">
                        <div><label className="text-xs font-medium text-muted">Nama *</label>
                            <input value={editTemplateForm.data.name} onChange={(e) => editTemplateForm.setData('name', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" /></div>
                        <div><label className="text-xs font-medium text-muted">Pola Nomor Terbit</label>
                            <input value={editTemplateForm.data.numbering_pattern} onChange={(e) => editTemplateForm.setData('numbering_pattern', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 font-mono text-sm focus:border-primary focus:ring-primary" /></div>
                        <div><label className="text-xs font-medium text-muted">Pola Nomor Arsip</label>
                            <input value={editTemplateForm.data.archive_pattern} onChange={(e) => editTemplateForm.setData('archive_pattern', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 font-mono text-sm focus:border-primary focus:ring-primary" /></div>
                        <label className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={editTemplateForm.data.enabled} onChange={(e) => editTemplateForm.setData('enabled', e.target.checked)} className="rounded border-gray-300 text-primary focus:ring-primary" />
                            Template aktif (muncul di form penerbitan)
                        </label>
                    </div>
                    <div className="mt-5 flex justify-end gap-3">
                        <SecondaryButton type="button" onClick={() => setModal(null)}>Batal</SecondaryButton>
                        <PrimaryButton disabled={editTemplateForm.processing}>Simpan</PrimaryButton>
                    </div>
                </form>
            </Modal>

            <ConfirmModal
                show={!!confirmDel}
                title="Hapus data ini?"
                message={confirmDel ? `${confirmDel.label} akan dihapus. ${confirmDel.note ?? 'Diblokir bila masih dipakai transaksi aktif.'}` : ''}
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
