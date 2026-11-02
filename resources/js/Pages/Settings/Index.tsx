import Badge from '@/Components/ui/Badge';
import Card from '@/Components/ui/Card';
import ConfirmModal from '@/Components/ui/ConfirmModal';
import Modal from '@/Components/Modal';
import NumericInput from '@/Components/NumericInput';
import PageHeader from '@/Components/ui/PageHeader';
import PriceInput from '@/Components/PriceInput';
import PrimaryButton from '@/Components/PrimaryButton';
import SearchableSelect from '@/Components/SearchableSelect';
import SecondaryButton from '@/Components/SecondaryButton';
import TabNav from '@/Components/ui/TabNav';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { classNames, formatDate, formatRupiah } from '@/lib/format';
import { type PageProps } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { Bell, BookOpen, Briefcase, Building2, KeyRound, Plus, ScrollText, Shield, Users } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Table, Button, Input, Select, Switch, Alert, Divider } from 'antd';

const ROLE_LABELS: Record<string, string> = {
    super_admin: 'Super Admin',
    management: 'Management',
    ship_ops: 'Ship Operations',
    doc_controller: 'Document Controller',
    supervisor: 'Supervisor',
    finance: 'Finance',
    auditor: 'Auditor',
};

const SUPPLIER_CATEGORIES = ['bengkel', 'sparepart', 'operator_lain', 'pemerintah'];

const FormLabel = ({ children }: { children: React.ReactNode }) => (
    <label className="mb-1 block text-sm font-medium text-[#1C1B1A]">{children}</label>
);

const FormError = ({ message }: { message?: string }) =>
    message ? <div className="mt-1 text-xs text-[#C1121F]">{message}</div> : null;

export default function SettingsIndex({
    tab,
    canManageUsers,
    canRbac,
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
    rbacRoles,
    rbacPermissions,
    rbacGrants,
}: PageProps<Record<string, any>>) {
    const tabs = [
        { key: 'users', label: 'Users & Roles', icon: Users },
        { key: 'profil', label: 'Profil Perusahaan', icon: Building2 },
        { key: 'template', label: 'Template & Nomor Surat', icon: ScrollText },
        { key: 'reminder', label: 'Aturan Reminder', icon: Bell },
        { key: 'workflow', label: 'Alur Persetujuan', icon: Shield },
        { key: 'kategori', label: 'Kategori Dokumen', icon: BookOpen },
        { key: 'master', label: 'Master Data', icon: Briefcase },
        ...(canRbac ? [{ key: 'rbac', label: 'Hak Akses (RBAC)', icon: KeyRound }] : []),
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

    const editableRoles: any[] = (rbacRoles ?? []).filter((r: any) => r.slug !== 'super_admin');
    const [rbacRoleId, setRbacRoleId] = useState<number | null>(editableRoles[0]?.id ?? null);
    const [rbacGrantsState, setRbacGrantsState] = useState<Record<number, number[]>>(() => {
        const init: Record<number, number[]> = {};
        (rbacRoles ?? []).forEach((r: any) => {
            init[r.id] = (rbacGrants?.[r.id] ?? []).map(Number);
        });
        return init;
    });
    const [savingRole, setSavingRole] = useState<number | null>(null);

    const MODULE_LABELS: Record<string, string> = {
        menu: 'Menu Sidebar',
        fleet: 'Armada (Kapal)',
        documents: 'Arsip Dokumen Terpadu',
        voyages: 'Perjalanan (Voyage)',
        operations: 'Operasional',
        finance: 'Keuangan',
        inventory: 'Inventaris',
        hr: 'SDM / Crewing',
        hours_of_rest: 'Hours of Rest (MLC 2006)',
        reports: 'Laporan',
        audit: 'Jejak Audit',
        settings: 'Pengaturan',
        sync: 'Sinkronisasi Offline',
    };

    const selectedRole: any = (rbacRoles ?? []).find((r: any) => r.id === rbacRoleId) ?? null;
    const selectedGrants = (rbacRoleId !== null ? rbacGrantsState[rbacRoleId] : []) ?? [];
    const isSuperRole = selectedRole?.slug === 'super_admin';

    const toggleRbacPermission = (roleId: number, permId: number) => {
        setRbacGrantsState((prev) => {
            const cur = prev[roleId] ?? [];
            return {
                ...prev,
                [roleId]: cur.includes(permId)
                    ? cur.filter((id) => id !== permId)
                    : [...cur, permId],
            };
        });
    };

    const setAllForRole = (roleId: number, permIds: number[]) => {
        setRbacGrantsState((prev) => ({ ...prev, [roleId]: permIds }));
    };

    const submitRbac = (roleId: number) => {
        setSavingRole(roleId);
        router.put(
            `/pengaturan/rbac/${roleId}`,
            { permissions: rbacGrantsState[roleId] ?? [] },
            { preserveScroll: true, onFinish: () => setSavingRole(null) },
        );
    };

    const userForm = useForm({ name: '', email: '', password: '', role: 'ship_ops' });
    const editUserForm = useForm({ name: '', email: '', password: '', role: 'ship_ops' });
    const editCustomerForm = useForm({ name: '', npwp: '', address: '', phone: '', notes: '' });
    const editSupplierForm = useForm({
        name: '', category: '', category_is_custom: false, address: '', phone: '', notes: '',
    });
    const editCatalogForm = useForm({ name: '', kind: 'pendapatan', default_price: '' });
    const editCategoryForm = useForm({ name: '', group_code: 'A', sort: '0' });
    const addCategoryForm = useForm({ code: '', name: '', group_code: 'A', sort: '' });
    const editTemplateForm = useForm({ name: '', numbering_pattern: '', archive_pattern: '', enabled: true });

    const submitEditTemplate = (e: FormEvent) => {
        e.preventDefault();
        if (!editTemplate) return;
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
    const supplierForm = useForm({ name: '', category: '', category_is_custom: false, phone: '' });
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
        if (!editUser) return;
        editUserForm.put(`/pengaturan/users/${editUser.id}`, { preserveScroll: true, onSuccess: () => { setModal(null); setEditUser(null); } });
    };
    const submitEditCustomer = (e: FormEvent) => {
        e.preventDefault();
        if (!editCustomer) return;
        editCustomerForm.put(`/pengaturan/customers/${editCustomer.id}`, { preserveScroll: true, onSuccess: () => { setModal(null); setEditCustomer(null); } });
    };
    const submitEditSupplier = (e: FormEvent) => {
        e.preventDefault();
        if (!editSupplier) return;
        editSupplierForm.put(`/pengaturan/suppliers/${editSupplier.id}`, { preserveScroll: true, onSuccess: () => { setModal(null); setEditSupplier(null); } });
    };
    const submitEditCatalog = (e: FormEvent) => {
        e.preventDefault();
        if (!editCatalog) return;
        editCatalogForm.put(`/pengaturan/katalog/${editCatalog.id}`, { preserveScroll: true, onSuccess: () => { setModal(null); setEditCatalog(null); } });
    };
    const submitEditCategory = (e: FormEvent) => {
        e.preventDefault();
        if (!editCategory) return;
        editCategoryForm.put(`/pengaturan/kategori/${editCategory.id}`, { preserveScroll: true, onSuccess: () => { setModal(null); setEditCategory(null); } });
    };
    const submitAddCategory = (e: FormEvent) => {
        e.preventDefault();
        addCategoryForm.post('/pengaturan/kategori', { preserveScroll: true, onSuccess: () => { setModal(null); addCategoryForm.reset(); } });
    };

    const userColumns = [
        { title: 'Nama', dataIndex: 'name', key: 'name', render: (v: string) => <span className="font-medium text-[#1C1B1A]">{v}</span> },
        { title: 'Email', dataIndex: 'email', key: 'email', render: (v: string) => <span className="text-[#8A8580]">{v}</span> },
        {
            title: 'Role', key: 'roles', render: (_: any, r: any) => (
                <div className="flex flex-wrap gap-1">
                    {r.roles.map((role: string) => (
                        <Badge key={role} tone={role === 'super_admin' ? 'primary' : 'info'}>
                            {ROLE_LABELS[role] ?? role}
                        </Badge>
                    ))}
                </div>
            ),
        },
        { title: 'Dibuat', dataIndex: 'created_at', key: 'created_at', render: (v: string) => <span className="text-xs text-[#8A8580]">{formatDate(v)}</span> },
        ...(canManageUsers ? [{
            title: 'Aksi', key: 'aksi', render: (_: any, u: any) => (
                <div className="flex gap-2 text-xs font-medium">
                    <button
                        type="button"
                        onClick={() => {
                            setEditUser(u);
                            editUserForm.setData({ name: u.name, email: u.email, password: '', role: u.roles[0] ?? 'ship_ops' });
                            setModal('editUser');
                        }}
                        className="text-[#C1121F] hover:underline"
                    >
                        Edit
                    </button>
                    <button
                        type="button"
                        onClick={() => setConfirmDel({ url: `/pengaturan/users/${u.id}`, label: `pengguna ${u.email}` })}
                        className="text-[#C1121F] hover:underline"
                    >
                        Hapus
                    </button>
                </div>
            ),
        }] : []),
    ];

    const categoryColumns = [
        { title: 'Kode', dataIndex: 'code', key: 'code', render: (v: string) => <span className="font-mono text-xs text-[#1C1B1A]">{v}</span> },
        { title: 'Nama', dataIndex: 'name', key: 'name', render: (v: string) => <span className="text-[#1C1B1A]">{v}</span> },
        { title: 'Kelompok', dataIndex: 'group_code', key: 'group_code', render: (v: string) => <Badge tone="info">{v}</Badge> },
        ...(canManageUsers ? [{
            title: 'Aksi', key: 'aksi', render: (_: any, c: any) => (
                <div className="flex gap-2 text-xs font-medium">
                    <button
                        type="button"
                        onClick={() => {
                            setEditCategory(c);
                            editCategoryForm.setData({ name: c.name, group_code: c.group_code, sort: String(c.sort ?? 0) });
                            setModal('editCategory');
                        }}
                        className="text-[#C1121F] hover:underline"
                    >
                        Edit
                    </button>
                    <button
                        type="button"
                        onClick={() => setConfirmDel({ url: `/pengaturan/kategori/${c.id}`, label: `kategori ${c.code} — ${c.name}` })}
                        className="text-[#C1121F] hover:underline"
                    >
                        Hapus
                    </button>
                </div>
            ),
        }] : []),
    ];

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

            {tab === 'rbac' && canRbac && (
                <div className="space-y-4">
                    <Card title="Matriks Hak Akses (RBAC)">
                        <p className="text-sm text-[#8A8580]">
                            Atur role mana yang boleh <strong>melihat</strong> / <strong>CRUD</strong> tiap modul & fungsi.
                            Super Admin selalu memiliki semua izin. Perubahan langsung berlaku dan tercatat di Jejak Audit.
                        </p>

                        <div className="mt-4 flex flex-wrap items-center gap-2">
                            {(rbacRoles ?? []).map((r: any) => (
                                <button
                                    key={r.id}
                                    type="button"
                                    onClick={() => setRbacRoleId(r.id)}
                                    className="rounded-full px-3 py-1.5 text-sm font-medium ring-1 transition"
                                    style={rbacRoleId === r.id
                                        ? { background: '#C1121F', color: '#FFFFFF', boxShadow: '0 0 0 1px #C1121F' }
                                        : { background: '#FAF7F2', color: '#1C1B1A', boxShadow: '0 0 0 1px #E7E1D9' }
                                    }
                                >
                                    {ROLE_LABELS[r.slug] ?? r.name}
                                </button>
                            ))}
                        </div>

                        {selectedRole && (
                            <div className="mt-5">
                                <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-[#FAF7F2] px-3 py-2">
                                    <div className="text-sm">
                                        <span className="font-semibold text-[#1C1B1A]">{ROLE_LABELS[selectedRole.slug] ?? selectedRole.name}</span>
                                        <span className="ml-2 text-[#8A8580]">
                                            {isSuperRole
                                                ? 'Selalu semua izin (bypass)'
                                                : `${selectedGrants.length} izin aktif dari ${Object.values(rbacPermissions ?? {}).flat().length}`}
                                        </span>
                                    </div>
                                    {!isSuperRole && (
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setAllForRole(selectedRole.id, (Object.values(rbacPermissions ?? {}) as any[][]).flat().map((p: any) => p.id))}
                                                className="rounded-md px-2 py-1 text-xs font-medium text-[#C1121F] hover:bg-[#FAF7F2]"
                                            >
                                                Centang semua
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setAllForRole(selectedRole.id, [])}
                                                className="rounded-md px-2 py-1 text-xs font-medium text-[#8A8580] hover:bg-[#FAF7F2]"
                                            >
                                                Kosongkan
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-2">
                                    {Object.entries(rbacPermissions ?? {}).map(([module, perms]) => (
                                        <div key={module} className="rounded-lg border border-[#E7E1D9] p-3">
                                            <h3 className="text-xs font-semibold uppercase tracking-wide text-[#8A8580]">
                                                {MODULE_LABELS[module] ?? module}
                                            </h3>
                                            <ul className="mt-2 space-y-1.5">
                                                {(perms as any[]).map((perm) => (
                                                    <li key={perm.id}>
                                                        <label className={classNames(
                                                            'flex items-start gap-2 text-sm',
                                                            isSuperRole ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
                                                        )}>
                                                            <input
                                                                type="checkbox"
                                                                checked={isSuperRole ? true : selectedGrants.includes(perm.id)}
                                                                disabled={isSuperRole}
                                                                onChange={() => toggleRbacPermission(selectedRole.id, perm.id)}
                                                                className="mt-0.5 rounded border-[#E7E1D9] text-[#C1121F] focus:ring-[#C1121F]"
                                                            />
                                                            <span>
                                                                {perm.label}
                                                                {perm.description && (
                                                                    <span className="block text-xs text-[#8A8580]">{perm.description}</span>
                                                                )}
                                                            </span>
                                                        </label>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))}
                                </div>

                                {!isSuperRole && (
                                    <div className="mt-5 flex justify-end">
                                        <PrimaryButton
                                            onClick={() => submitRbac(selectedRole.id)}
                                            disabled={savingRole === selectedRole.id}
                                        >
                                            {savingRole === selectedRole.id ? 'Menyimpan…' : `Simpan Hak Akses ${ROLE_LABELS[selectedRole.slug] ?? selectedRole.name}`}
                                        </PrimaryButton>
                                    </div>
                                )}
                            </div>
                        )}
                    </Card>
                </div>
            )}

            {tab === 'users' && (
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
                    <Card title="Daftar Pengguna & Hak Akses" className="xl:col-span-2">
                        <Table
                            columns={userColumns}
                            dataSource={usersList ?? []}
                            rowKey="id"
                            pagination={false}
                            size="small"
                        />
                    </Card>
                    <Card title="Tambah Pengguna" description="Hanya Super Admin.">
                        {canManageUsers ? (
                            <form onSubmit={submitUser} className="space-y-3">
                                <div>
                                    <FormLabel>Nama *</FormLabel>
                                    <Input value={userForm.data.name} onChange={(e) => userForm.setData('name', e.target.value)} />
                                    <FormError message={userForm.errors.name} />
                                </div>
                                <div>
                                    <FormLabel>Email *</FormLabel>
                                    <Input type="email" value={userForm.data.email} onChange={(e) => userForm.setData('email', e.target.value)} />
                                    <FormError message={userForm.errors.email} />
                                </div>
                                <div>
                                    <FormLabel>Password * (min 8)</FormLabel>
                                    <Input type="password" value={userForm.data.password} onChange={(e) => userForm.setData('password', e.target.value)} />
                                    <FormError message={userForm.errors.password} />
                                </div>
                                <div>
                                    <FormLabel>Role *</FormLabel>
                                    <SearchableSelect
                                        value={userForm.data.role}
                                        options={(roles ?? []).map((r: any) => ({ value: r.slug, label: r.name }))}
                                        onChange={(value) => userForm.setData('role', value)}
                                        required
                                    />
                                </div>
                                <PrimaryButton disabled={userForm.processing}>Buat Pengguna</PrimaryButton>
                            </form>
                        ) : (
                            <p className="text-sm text-[#8A8580]">Hanya Super Admin yang dapat menambah pengguna.</p>
                        )}
                    </Card>
                </div>
            )}

            {tab === 'profil' && (
                <Card title="Profil Perusahaan" className="max-w-3xl">
                    <form onSubmit={submitCompany} className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div><FormLabel>Nama Perusahaan *</FormLabel>
                            <Input value={companyForm.data.company_name} onChange={(e) => companyForm.setData('company_name', e.target.value)} /></div>
                        <div><FormLabel>NIB / Legalitas</FormLabel>
                            <Input value={companyForm.data.business_license_reference} onChange={(e) => companyForm.setData('business_license_reference', e.target.value)} /></div>
                        <div><FormLabel>NPWP</FormLabel>
                            <Input value={companyForm.data.npwp} onChange={(e) => companyForm.setData('npwp', e.target.value)} /></div>
                        <div><FormLabel>Kota</FormLabel>
                            <Input value={companyForm.data.city} onChange={(e) => companyForm.setData('city', e.target.value)} /></div>
                        <div className="md:col-span-2"><FormLabel>Alamat</FormLabel>
                            <Input value={companyForm.data.address} onChange={(e) => companyForm.setData('address', e.target.value)} /></div>
                        <div><FormLabel>Telepon</FormLabel>
                            <Input value={companyForm.data.phone} onChange={(e) => companyForm.setData('phone', e.target.value)} /></div>
                        <div><FormLabel>Email</FormLabel>
                            <Input value={companyForm.data.email} onChange={(e) => companyForm.setData('email', e.target.value)} /></div>
                        <div className="md:col-span-2">
                            <PrimaryButton disabled={companyForm.processing}>Simpan Profil</PrimaryButton>
                        </div>
                    </form>
                </Card>
            )}

            {tab === 'template' && (
                <div className="space-y-3">
                    <p className="text-sm text-[#8A8580]">
                        Token pola nomor: <code className="rounded bg-[#FAF7F2] px-1">{'{seq}'}</code>{' '}
                        <code className="rounded bg-[#FAF7F2] px-1">{'{seq_raw}'}</code>{' '}
                        <code className="rounded bg-[#FAF7F2] px-1">{'{tahun}'}</code>{' '}
                        <code className="rounded bg-[#FAF7F2] px-1">{'{bulan_romawi}'}</code>{' '}
                        <code className="rounded bg-[#FAF7F2] px-1">{'{kode}'}</code>{' '}
                        <code className="rounded bg-[#FAF7F2] px-1">{'{kode_penyewa}'}</code>{' '}
                        <code className="rounded bg-[#FAF7F2] px-1">{'{kode_kapal}'}</code>
                    </p>
                    {(templates ?? []).map((t: any) => (
                        <div key={t.id} className="rounded-xl border border-[#E7E1D9] bg-white p-4 shadow-sm">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                    <p className="font-semibold text-[#1C1B1A]">
                                        <span className="font-mono text-xs text-[#8A8580]">{t.code}</span> · {t.name}
                                    </p>
                                    <p className="text-xs text-[#8A8580]">
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
                                                className="text-[#C1121F] hover:underline"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => router.post(`/pengaturan/templates/${t.id}/reset-counter`, { kind: 'terbit' }, { preserveScroll: true })}
                                                className="text-[#8A8580] hover:text-[#1C1B1A]"
                                            >
                                                Reset counter terbit
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => router.post(`/pengaturan/templates/${t.id}/reset-counter`, { kind: 'arsip' }, { preserveScroll: true })}
                                                className="text-[#8A8580] hover:text-[#1C1B1A]"
                                            >
                                                Reset counter arsip
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="mt-2 grid grid-cols-1 gap-2 text-xs md:grid-cols-2">
                                <p className="rounded-lg bg-[#FAF7F2] px-3 py-1.5 text-[#8A8580]">
                                    Pola nomor terbit:{' '}
                                    <span className="font-mono text-[#1C1B1A]">{t.numbering_pattern ?? '—'}</span>
                                    {' '}<span className="text-[#C1121F]">(counter: {t.seq_last})</span>
                                </p>
                                <p className="rounded-lg bg-[#FAF7F2] px-3 py-1.5 text-[#8A8580]">
                                    Pola nomor arsip:{' '}
                                    <span className="font-mono text-[#1C1B1A]">{t.archive_pattern ?? '—'}</span>
                                    {' '}<span className="text-[#C1121F]">(counter: {t.archive_seq_last})</span>
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
                            <FormLabel>Hari pengingat *</FormLabel>
                            <Input value={reminderForm.data.reminder_days} onChange={(e) => reminderForm.setData('reminder_days', e.target.value)} placeholder="30,14,7,0" />
                            <FormError message={reminderForm.errors.reminder_days} />
                        </div>
                        <PrimaryButton disabled={reminderForm.processing}>Simpan</PrimaryButton>
                    </form>
                    <Alert
                        type="info"
                        showIcon
                        message="Berlaku untuk dokumen perusahaan, dokumen kapal, dan sertifikat ABK. Tanggal fiktif tidak pernah dibuat sistem."
                        className="mt-3"
                    />
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
                            <li key={label as string} className="flex items-start justify-between gap-3 rounded-lg border border-[#E7E1D9] p-3">
                                <span className="text-[#1C1B1A]">{label}</span>
                                <Badge tone={active ? 'success' : 'neutral'}>{active ? 'Aktif' : 'Nonaktif'}</Badge>
                            </li>
                        ))}
                    </ul>
                    <p className="mt-4 text-xs text-[#8A8580]">
                        Konfigurasi lanjutan (multi-level approver, eskalasi) masuk roadmap implementasi.
                    </p>
                </Card>
            )}

            {tab === 'kategori' && (
                <Card title="Kategori Dokumen (A–G)" actions={canManageUsers && (
                    <Button type="link" onClick={() => setModal('addCategory')} icon={<Plus size={13} />} size="small">
                        Tambah
                    </Button>
                )}>
                    <Table
                        columns={categoryColumns}
                        dataSource={categories ?? []}
                        rowKey="id"
                        pagination={false}
                        size="small"
                    />
                </Card>
            )}

            {tab === 'master' && (
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
                    <Card title="Customer" actions={
                        <button type="button" onClick={submitCustomer as any} className="hidden" />
                    }>
                        <form onSubmit={submitCustomer} className="mb-4 flex gap-2">
                            <Input
                                value={customerForm.data.name}
                                onChange={(e) => customerForm.setData('name', e.target.value)}
                                placeholder="Nama customer baru"
                                style={{ flex: 1 }}
                            />
                            <PrimaryButton disabled={customerForm.processing || !customerForm.data.name} icon={<Plus size={14} />} />
                        </form>
                        <ul className="max-h-72 space-y-1 overflow-y-auto text-sm">
                            {(customers ?? []).map((c: any) => (
                                <li key={c.id} className="flex items-center justify-between gap-2 rounded-lg border border-[#E7E1D9] px-3 py-1.5">
                                    <span className="text-[#1C1B1A]">{c.name}</span>
                                    <span className="text-xs text-[#8A8580]">{c.phone}</span>
                                    <span className="flex gap-2 text-xs font-medium">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setEditCustomer(c);
                                                editCustomerForm.setData({ name: c.name, npwp: c.npwp ?? '', address: c.address ?? '', phone: c.phone ?? '', notes: c.notes ?? '' });
                                                setModal('editCustomer');
                                            }}
                                            className="text-[#C1121F] hover:underline"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setConfirmDel({ url: `/pengaturan/customers/${c.id}`, label: `customer ${c.name}` })}
                                            className="text-[#C1121F] hover:underline"
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
                            <Input
                                value={supplierForm.data.name}
                                onChange={(e) => supplierForm.setData('name', e.target.value)}
                                placeholder="Nama supplier baru"
                                style={{ flex: 1 }}
                            />
                            <div className="w-40 shrink-0">
                                <SearchableSelect
                                    value={supplierForm.data.category_is_custom ? 'lainnya' : supplierForm.data.category}
                                    options={[
                                        { value: '', label: 'kategori…' },
                                        ...SUPPLIER_CATEGORIES.map((value) => ({ value, label: value })),
                                        { value: 'lainnya', label: 'Lainnya' },
                                    ]}
                                    onChange={(value) => {
                                        supplierForm.setData('category_is_custom', value === 'lainnya');
                                        supplierForm.setData('category', value === 'lainnya' ? '' : value);
                                    }}
                                    className="h-9"
                                />
                                {supplierForm.data.category_is_custom && (
                                    <Input
                                        value={supplierForm.data.category}
                                        onChange={(e) => supplierForm.setData('category', e.target.value)}
                                        placeholder="Kategori lainnya"
                                        maxLength={60}
                                        required
                                        style={{ marginTop: 4 }}
                                    />
                                )}
                                <FormError message={supplierForm.errors.category} />
                            </div>
                            <PrimaryButton disabled={supplierForm.processing || !supplierForm.data.name} icon={<Plus size={14} />} />
                        </form>
                        <ul className="max-h-72 space-y-1 overflow-y-auto text-sm">
                            {(suppliers ?? []).map((s: any) => (
                                <li key={s.id} className="flex items-center justify-between gap-2 rounded-lg border border-[#E7E1D9] px-3 py-1.5">
                                    <span className="text-[#1C1B1A]">{s.name}</span>
                                    <span className="text-xs capitalize text-[#8A8580]">{s.category}</span>
                                    <span className="flex gap-2 text-xs font-medium">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setEditSupplier(s);
                                                editSupplierForm.setData({
                                                    name: s.name,
                                                    category: s.category ?? '',
                                                    category_is_custom: Boolean(s.category) &&
                                                        (s.category === 'lainnya' || !SUPPLIER_CATEGORIES.includes(s.category)),
                                                    address: s.address ?? '',
                                                    phone: s.phone ?? '',
                                                    notes: s.notes ?? '',
                                                });
                                                setModal('editSupplier');
                                            }}
                                            className="text-[#C1121F] hover:underline"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setConfirmDel({ url: `/pengaturan/suppliers/${s.id}`, label: `supplier ${s.name}` })}
                                            className="text-[#C1121F] hover:underline"
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
                                <Input
                                    value={catalogForm.data.name}
                                    onChange={(e) => catalogForm.setData('name', e.target.value)}
                                    placeholder="Nama katalog"
                                />
                                <div className="flex gap-2">
                                    <SearchableSelect
                                        value={catalogForm.data.kind}
                                        options={[
                                            { value: 'pendapatan', label: 'Pendapatan' },
                                            { value: 'biaya', label: 'Biaya' },
                                        ]}
                                        onChange={(value) => catalogForm.setData('kind', value)}
                                        className="flex-1"
                                    />
                                    <PriceInput value={catalogForm.data.default_price} onChange={(e) => catalogForm.setData('default_price', e.target.value)} placeholder="Harga" className="h-9 w-32" />
                                    <PrimaryButton disabled={catalogForm.processing || !catalogForm.data.name} icon={<Plus size={14} />} />
                                </div>
                            </form>
                            <ul className="max-h-52 space-y-1 overflow-y-auto text-sm">
                                {(serviceCatalog ?? []).map((s: any) => (
                                    <li key={s.id} className="flex items-center justify-between gap-2 rounded-lg border border-[#E7E1D9] px-3 py-1.5">
                                        <span className={classNames('text-[#1C1B1A]', s.kind === 'biaya' && 'text-[#C1121F]')}>{s.name}</span>
                                        <span className="tabular-nums text-[#8A8580]">{formatRupiah(s.default_price)}</span>
                                        <span className="flex gap-2 text-xs font-medium">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setEditCatalog(s);
                                                    editCatalogForm.setData({ name: s.name, kind: s.kind, default_price: String(s.default_price) });
                                                    setModal('editCatalog');
                                                }}
                                                className="text-[#C1121F] hover:underline"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setConfirmDel({ url: `/pengaturan/katalog/${s.id}`, label: `katalog ${s.name}` })}
                                                className="text-[#C1121F] hover:underline"
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
                                    <li key={a.id} className="flex justify-between border-b border-[#E7E1D9] py-1">
                                        <span className="font-mono text-xs text-[#8A8580]">{a.code}</span>
                                        <span className="text-[#1C1B1A]">{a.name}</span>
                                    </li>
                                ))}
                            </ul>
                        </Card>
                    </div>
                </div>
            )}

            <Modal show={modal === 'editUser'} onClose={() => setModal(null)} maxWidth="md">
                <form onSubmit={submitEditUser} className="p-6">
                    <h2 className="text-lg font-semibold text-[#1C1B1A]">Edit Pengguna — {editUser?.email}</h2>
                    <div className="mt-4 space-y-3">
                        <div><label className="text-xs font-medium text-[#8A8580]">Nama *</label>
                            <Input value={editUserForm.data.name} onChange={(e) => editUserForm.setData('name', e.target.value)} style={{ marginTop: 4 }} /></div>
                        <div><label className="text-xs font-medium text-[#8A8580]">Email *</label>
                            <Input value={editUserForm.data.email} onChange={(e) => editUserForm.setData('email', e.target.value)} style={{ marginTop: 4 }} /></div>
                        <div><label className="text-xs font-medium text-[#8A8580]">Role *</label>
                            <SearchableSelect
                                value={editUserForm.data.role}
                                options={(roles ?? []).map((r: any) => ({ value: r.slug, label: r.name }))}
                                onChange={(value) => editUserForm.setData('role', value)}
                                required
                            /></div>
                        <div><label className="text-xs font-medium text-[#8A8580]">Password Baru (opsional, min 8)</label>
                            <Input type="password" value={editUserForm.data.password} onChange={(e) => editUserForm.setData('password', e.target.value)} style={{ marginTop: 4 }} /></div>
                    </div>
                    <div className="mt-5 flex justify-end gap-3">
                        <SecondaryButton onClick={() => setModal(null)}>Batal</SecondaryButton>
                        <PrimaryButton disabled={editUserForm.processing}>Simpan</PrimaryButton>
                    </div>
                </form>
            </Modal>

            <Modal show={modal === 'editCustomer'} onClose={() => setModal(null)} maxWidth="md">
                <form onSubmit={submitEditCustomer} className="p-6">
                    <h2 className="text-lg font-semibold text-[#1C1B1A]">Edit Customer — {editCustomer?.name}</h2>
                    <div className="mt-4 space-y-3">
                        <div><label className="text-xs font-medium text-[#8A8580]">Nama *</label>
                            <Input value={editCustomerForm.data.name} onChange={(e) => editCustomerForm.setData('name', e.target.value)} style={{ marginTop: 4 }} /></div>
                        <div><label className="text-xs font-medium text-[#8A8580]">NPWP</label>
                            <Input value={editCustomerForm.data.npwp} onChange={(e) => editCustomerForm.setData('npwp', e.target.value)} style={{ marginTop: 4 }} /></div>
                        <div><label className="text-xs font-medium text-[#8A8580]">Alamat</label>
                            <Input value={editCustomerForm.data.address} onChange={(e) => editCustomerForm.setData('address', e.target.value)} style={{ marginTop: 4 }} /></div>
                        <div><label className="text-xs font-medium text-[#8A8580]">Telepon</label>
                            <Input value={editCustomerForm.data.phone} onChange={(e) => editCustomerForm.setData('phone', e.target.value)} style={{ marginTop: 4 }} /></div>
                    </div>
                    <div className="mt-5 flex justify-end gap-3">
                        <SecondaryButton onClick={() => setModal(null)}>Batal</SecondaryButton>
                        <PrimaryButton disabled={editCustomerForm.processing}>Simpan</PrimaryButton>
                    </div>
                </form>
            </Modal>

            <Modal show={modal === 'editSupplier'} onClose={() => setModal(null)} maxWidth="md">
                <form onSubmit={submitEditSupplier} className="p-6">
                    <h2 className="text-lg font-semibold text-[#1C1B1A]">Edit Supplier — {editSupplier?.name}</h2>
                    <div className="mt-4 space-y-3">
                        <div><label className="text-xs font-medium text-[#8A8580]">Nama *</label>
                            <Input value={editSupplierForm.data.name} onChange={(e) => editSupplierForm.setData('name', e.target.value)} style={{ marginTop: 4 }} /></div>
                        <div><label className="text-xs font-medium text-[#8A8580]">Kategori</label>
                            <SearchableSelect
                                value={editSupplierForm.data.category_is_custom ? 'lainnya' : editSupplierForm.data.category}
                                options={[
                                    { value: '', label: '—' },
                                    ...SUPPLIER_CATEGORIES.map((value) => ({
                                        value,
                                        label: value,
                                    })),
                                    { value: 'lainnya', label: 'Lainnya' },
                                ]}
                                onChange={(value) => {
                                    editSupplierForm.setData('category_is_custom', value === 'lainnya');
                                    editSupplierForm.setData(
                                        'category',
                                        value === 'lainnya' ? '' : value,
                                    );
                                }}
                            /></div>
                        {editSupplierForm.data.category_is_custom && (
                            <div>
                                <label className="text-xs font-medium text-[#8A8580]">Kategori Lainnya</label>
                                <Input
                                    value={editSupplierForm.data.category === 'lainnya' ? '' : editSupplierForm.data.category}
                                    onChange={(e) => editSupplierForm.setData('category', e.target.value)}
                                    placeholder="Masukkan kategori"
                                    maxLength={60}
                                    required={editSupplierForm.data.category !== 'lainnya'}
                                    style={{ marginTop: 4 }}
                                />
                                <FormError message={editSupplierForm.errors.category} />
                            </div>
                        )}
                        <div><label className="text-xs font-medium text-[#8A8580]">Telepon</label>
                            <Input value={editSupplierForm.data.phone} onChange={(e) => editSupplierForm.setData('phone', e.target.value)} style={{ marginTop: 4 }} /></div>
                    </div>
                    <div className="mt-5 flex justify-end gap-3">
                        <SecondaryButton onClick={() => setModal(null)}>Batal</SecondaryButton>
                        <PrimaryButton disabled={editSupplierForm.processing}>Simpan</PrimaryButton>
                    </div>
                </form>
            </Modal>

            <Modal show={modal === 'editCatalog'} onClose={() => setModal(null)} maxWidth="md">
                <form onSubmit={submitEditCatalog} className="p-6">
                    <h2 className="text-lg font-semibold text-[#1C1B1A]">Edit Katalog — {editCatalog?.name}</h2>
                    <div className="mt-4 space-y-3">
                        <div><label className="text-xs font-medium text-[#8A8580]">Nama *</label>
                            <Input value={editCatalogForm.data.name} onChange={(e) => editCatalogForm.setData('name', e.target.value)} style={{ marginTop: 4 }} /></div>
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className="text-xs font-medium text-[#8A8580]">Jenis</label>
                                <SearchableSelect
                                    value={editCatalogForm.data.kind}
                                    options={[
                                        { value: 'pendapatan', label: 'Pendapatan' },
                                        { value: 'biaya', label: 'Biaya' },
                                    ]}
                                    onChange={(value) => editCatalogForm.setData('kind', value)}
                                /></div>
                            <div><label className="text-xs font-medium text-[#8A8580]">Harga Default *</label>
                                <PriceInput value={editCatalogForm.data.default_price} onChange={(e) => editCatalogForm.setData('default_price', e.target.value)} /></div>
                        </div>
                    </div>
                    <div className="mt-5 flex justify-end gap-3">
                        <SecondaryButton onClick={() => setModal(null)}>Batal</SecondaryButton>
                        <PrimaryButton disabled={editCatalogForm.processing}>Simpan</PrimaryButton>
                    </div>
                </form>
            </Modal>

            <Modal show={modal === 'editCategory'} onClose={() => setModal(null)} maxWidth="md">
                <form onSubmit={submitEditCategory} className="p-6">
                    <h2 className="text-lg font-semibold text-[#1C1B1A]">Edit Kategori — {editCategory?.code}</h2>
                    <div className="mt-4 space-y-3">
                        <div><label className="text-xs font-medium text-[#8A8580]">Nama *</label>
                            <Input value={editCategoryForm.data.name} onChange={(e) => editCategoryForm.setData('name', e.target.value)} style={{ marginTop: 4 }} /></div>
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className="text-xs font-medium text-[#8A8580]">Kelompok</label>
                                <SearchableSelect
                                    value={editCategoryForm.data.group_code}
                                    options={['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((value) => ({
                                        value,
                                        label: value,
                                    }))}
                                    onChange={(value) => editCategoryForm.setData('group_code', value)}
                                /></div>
                            <div><label className="text-xs font-medium text-[#8A8580]">Urutan</label>
                                <NumericInput value={editCategoryForm.data.sort} onChange={(e) => editCategoryForm.setData('sort', e.target.value)} /></div>
                        </div>
                    </div>
                    <div className="mt-5 flex justify-end gap-3">
                        <SecondaryButton onClick={() => setModal(null)}>Batal</SecondaryButton>
                        <PrimaryButton disabled={editCategoryForm.processing}>Simpan</PrimaryButton>
                    </div>
                </form>
            </Modal>

            <Modal show={modal === 'addCategory'} onClose={() => setModal(null)} maxWidth="md">
                <form onSubmit={submitAddCategory} className="p-6">
                    <h2 className="text-lg font-semibold text-[#1C1B1A]">Tambah Kategori Dokumen</h2>
                    <div className="mt-4 space-y-3">
                        <div><label className="text-xs font-medium text-[#8A8580]">Kode *</label>
                            <Input value={addCategoryForm.data.code} onChange={(e) => addCategoryForm.setData('code', e.target.value)} placeholder="mis. H1" style={{ marginTop: 4 }} /></div>
                        <div><label className="text-xs font-medium text-[#8A8580]">Nama *</label>
                            <Input value={addCategoryForm.data.name} onChange={(e) => addCategoryForm.setData('name', e.target.value)} style={{ marginTop: 4 }} /></div>
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className="text-xs font-medium text-[#8A8580]">Kelompok</label>
                                <SearchableSelect
                                    value={addCategoryForm.data.group_code}
                                    options={['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((value) => ({
                                        value,
                                        label: value,
                                    }))}
                                    onChange={(value) => addCategoryForm.setData('group_code', value)}
                                /></div>
                            <div><label className="text-xs font-medium text-[#8A8580]">Urutan</label>
                                <NumericInput value={addCategoryForm.data.sort} onChange={(e) => addCategoryForm.setData('sort', e.target.value)} /></div>
                        </div>
                    </div>
                    <div className="mt-5 flex justify-end gap-3">
                        <SecondaryButton onClick={() => setModal(null)}>Batal</SecondaryButton>
                        <PrimaryButton disabled={addCategoryForm.processing}>Simpan Kategori</PrimaryButton>
                    </div>
                </form>
            </Modal>

            <Modal show={modal === 'editTemplate'} onClose={() => setModal(null)} maxWidth="md">
                <form onSubmit={submitEditTemplate} className="p-6">
                    <h2 className="text-lg font-semibold text-[#1C1B1A]">Edit Template — {editTemplate?.code}</h2>
                    <div className="mt-4 space-y-3">
                        <div><label className="text-xs font-medium text-[#8A8580]">Nama *</label>
                            <Input value={editTemplateForm.data.name} onChange={(e) => editTemplateForm.setData('name', e.target.value)} style={{ marginTop: 4 }} /></div>
                        <div><label className="text-xs font-medium text-[#8A8580]">Pola Nomor Terbit</label>
                            <Input value={editTemplateForm.data.numbering_pattern} onChange={(e) => editTemplateForm.setData('numbering_pattern', e.target.value)} className="font-mono" style={{ marginTop: 4 }} /></div>
                        <div><label className="text-xs font-medium text-[#8A8580]">Pola Nomor Arsip</label>
                            <Input value={editTemplateForm.data.archive_pattern} onChange={(e) => editTemplateForm.setData('archive_pattern', e.target.value)} className="font-mono" style={{ marginTop: 4 }} /></div>
                        <label className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={editTemplateForm.data.enabled} onChange={(e) => editTemplateForm.setData('enabled', e.target.checked)} className="rounded border-[#E7E1D9] text-[#C1121F] focus:ring-[#C1121F]" />
                            Template aktif (muncul di form penerbitan)
                        </label>
                    </div>
                    <div className="mt-5 flex justify-end gap-3">
                        <SecondaryButton onClick={() => setModal(null)}>Batal</SecondaryButton>
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
