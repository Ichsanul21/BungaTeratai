<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Models\Company;
use App\Models\Customer;
use App\Models\DocumentCategory;
use App\Models\Invoice;
use App\Models\Bill;
use App\Models\Role;
use App\Models\ServiceCatalog;
use App\Models\Setting;
use App\Models\Supplier;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Route;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class SettingsController extends Controller
{
    public function index(Request $request): Response
    {
        $this->authorize('menu.settings');

        $tab = $request->string('tab')->toString() ?: 'users';

        if ($tab === 'rbac') {
            $this->authorize('settings.rbac');
        }

        $data = match ($tab) {
            'profil' => [
                'company' => Company::first(),
            ],
            'kategori' => [
                'categories' => DocumentCategory::orderBy('sort')->get(),
            ],
            'template' => $this->templates(),
            'reminder' => [
                'reminderDays' => Setting::where('key', 'reminder_days')->value('value') ?? '30,14,7,0',
            ],
            'master' => [
                'customers' => Customer::orderBy('name')->limit(100)->get(),
                'suppliers' => Supplier::orderBy('name')->limit(100)->get(),
                'serviceCatalog' => ServiceCatalog::orderBy('kind')->get(),
                'accountsList' => Account::orderBy('code')->get(),
            ],
            'rbac' => $this->rbacData(),
            default => [
                'usersList' => User::with('roles')->orderBy('name')->get()->map(fn ($u) => [
                    'id' => $u->id,
                    'name' => $u->name,
                    'email' => $u->email,
                    'roles' => $u->roles->pluck('slug'),
                    'created_at' => $u->created_at?->toDateString(),
                ]),
                'roles' => Role::orderBy('id')->get(['id', 'slug', 'name']),
                'workflow' => [
                    'internal_approval_required' => (bool) Setting::where('key', 'internal_approval_required')->value('value'),
                    'external_approval_requires_evidence' => (bool) Setting::where('key', 'external_approval_requires_evidence')->value('value'),
                ],
            ],
        };

        return Inertia::render('Settings/Index', [
            'tab' => $tab,
            'canManageUsers' => auth()->user()?->isSuperAdmin() ?? false,
            'canRbac' => auth()->user()?->can('settings.rbac') ?? false,
            ...$data,
        ]);
    }

    /** Matriks hak akses: izin (katalog DB) × role. */
    private function rbacData(): array
    {
        $roles = Role::orderBy('id')->get(['id', 'slug', 'name']);
        $permissions = \App\Models\Permission::orderBy('module')->orderBy('sort')->get([
            'id', 'code', 'label', 'module', 'action', 'description',
        ]);

        $rolePermissions = [];
        foreach ($roles as $role) {
            $rolePermissions[$role->id] = $role->slug === 'super_admin'
                ? $permissions->pluck('id')->values()
                : $permissions->whereIn('id', $role->permissions()->pluck('permission_id'))->pluck('id')->values();
        }

        return [
            'rbacRoles' => $roles->values(),
            'rbacPermissions' => $permissions->groupBy('module'),
            'rbacGrants' => $rolePermissions,
        ];
    }

    public function updateRolePermissions(Request $request, Role $role)
    {
        $this->authorize('settings.rbac');

        if ($role->slug === 'super_admin') {
            return back()->with('success', 'Role Super Admin selalu memiliki semua hak akses.');
        }

        $data = $request->validate([
            'permissions' => ['required', 'array'],
            'permissions.*' => ['integer', 'exists:permissions,id'],
        ]);

        $before = $role->permissionCodes();

        $codes = \App\Models\Permission::whereIn('id', $data['permissions'])->pluck('code')->all();
        $role->syncPermissionCodes($codes);

        AuditService::log(
            'updated',
            'role',
            $role->id,
            ['permissions' => $before],
            ['permissions' => $codes],
            "Hak akses role {$role->name} diperbarui (".count($codes).' izin)'
        );

        return back()->with('success', "Hak akses role {$role->name} disimpan (".count($codes).' izin aktif).');
    }

    public function storeUser(Request $request)
    {
        abort_unless(auth()->user()?->isSuperAdmin(), 403);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
            'role' => ['required', 'exists:roles,slug'],
        ]);

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
        ]);
        $user->roles()->attach(Role::where('slug', $data['role'])->first());

        AuditService::log('created', 'user', $user->id, null, ['email' => $data['email'], 'role' => $data['role']], "Pengguna baru: {$user->name}");

        return back()->with('success', "Pengguna {$user->name} dibuat dengan role {$data['role']}.");
    }

    public function updateCompany(Request $request)
    {
        $this->authorize('menu.settings');

        $data = $request->validate([
            'company_name' => ['required', 'string', 'max:160'],
            'business_license_reference' => ['nullable', 'string', 'max:120'],
            'npwp' => ['nullable', 'string', 'max:40'],
            'address' => ['nullable', 'string', 'max:240'],
            'city' => ['nullable', 'string', 'max:80'],
            'phone' => ['nullable', 'string', 'max:40'],
            'email' => ['nullable', 'email', 'max:120'],
        ]);

        Company::first()?->update($data);

        return back()->with('success', 'Profil perusahaan diperbarui.');
    }

    public function updateReminderRules(Request $request)
    {
        abort_unless(auth()->user()?->isSuperAdmin(), 403);

        $data = $request->validate([
            'reminder_days' => ['required', 'string', 'max:60'],
        ]);

        // validasi deretan angka
        $parts = array_map('trim', explode(',', $data['reminder_days']));
        foreach ($parts as $part) {
            if (! ctype_digit($part)) {
                return back()->withErrors(['reminder_days' => 'Gunakan deretan angka hari dipisah koma, mis. 30,14,7,0']);
            }
        }

        Setting::where('key', 'reminder_days')->update(['value' => $data['reminder_days']]);

        AuditService::log('updated', 'setting', 1, null, $data, 'Aturan reminder diperbarui');

        return back()->with('success', 'Aturan reminder diperbarui: '.$data['reminder_days'].' hari.');
    }

    public function storeCustomer(Request $request)
    {
        $this->authorize('menu.settings');

        $data = $request->validate([
            'name' => ['required', 'string', 'max:160'],
            'phone' => ['nullable', 'string', 'max:40'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        Customer::create($data);

        return back()->with('success', "Customer {$data['name']} ditambahkan.");
    }

    public function storeSupplier(Request $request)
    {
        $this->authorize('menu.settings');

        $data = $request->validate([
            'name' => ['required', 'string', 'max:160'],
            'category' => ['nullable', 'string', 'max:60'],
            'category_is_custom' => ['nullable', 'boolean'],
            'phone' => ['nullable', 'string', 'max:40'],
        ]);
        $data = $this->normalizeSupplierCategory($data);

        Supplier::create($data);

        return back()->with('success', "Supplier {$data['name']} ditambahkan.");
    }

    public function storeCatalog(Request $request)
    {
        $this->authorize('menu.settings');

        $data = $request->validate([
            'name' => ['required', 'string', 'max:160'],
            'kind' => ['required', 'in:pendapatan,biaya'],
            'default_price' => ['required', 'numeric', 'min:0'],
        ]);

        ServiceCatalog::create($data);

        return back()->with('success', "Katalog {$data['name']} ditambahkan.");
    }

    // ===== CRUD tambahan (Fase A) =====

    public function updateUser(Request $request, User $user)
    {
        abort_unless(auth()->user()?->isSuperAdmin(), 403);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'unique:users,email,'.$user->id],
            'role' => ['required', 'exists:roles,slug'],
            'password' => ['nullable', 'string', 'min:8'],
        ]);

        $before = ['name' => $user->name, 'email' => $user->email, 'roles' => $user->roles()->pluck('slug')->all()];

        $user->update([
            'name' => $data['name'],
            'email' => $data['email'],
            ...(! empty($data['password']) ? ['password' => \Illuminate\Support\Facades\Hash::make($data['password'])] : []),
        ]);

        // Ganti role: detach semua, attach baru
        $user->roles()->sync([Role::where('slug', $data['role'])->value('id')]);

        AuditService::log('updated', 'user', $user->id, $before, ['name' => $data['name'], 'email' => $data['email'], 'role' => $data['role'], 'password_changed' => ! empty($data['password'])], "Pengguna diperbarui: {$user->name}");

        return back()->with('success', "Pengguna {$user->name} diperbarui.");
    }

    public function deleteUser(User $user)
    {
        abort_unless(auth()->user()?->isSuperAdmin(), 403);

        if ($user->id === auth()->id()) {
            return back()->with('error', 'Tidak dapat menghapus akun sendiri.');
        }

        if ($user->hasRole('super_admin')) {
            $otherAdmins = User::whereKeyNot($user->id)->get()->filter(fn ($u) => $u->hasRole('super_admin'))->count();
            if ($otherAdmins === 0) {
                return back()->with('error', 'Tidak dapat menghapus Super Admin terakhir.');
            }
        }

        $before = ['name' => $user->name, 'email' => $user->email];
        $user->roles()->detach();
        $user->delete();

        AuditService::log('deleted', 'user', $user->id, $before, null, "Pengguna dihapus: {$before['email']}");

        return back()->with('success', "Pengguna {$before['email']} dihapus.");
    }

    public function updateCustomer(Request $request, Customer $customer)
    {
        $this->authorize('menu.settings');

        $open = Invoice::where('customer_id', $customer->id)->whereIn('status', ['unpaid', 'partial'])->count();
        if ($open > 0) {
            return back()->with('error', "Customer masih memiliki {$open} invoice belum lunas — tidak dapat diubah/dihapus identitasnya.");
        }

        $data = $request->validate([
            'name' => ['required', 'string', 'max:160'],
            'npwp' => ['nullable', 'string', 'max:60'],
            'address' => ['nullable', 'string', 'max:240'],
            'phone' => ['nullable', 'string', 'max:40'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $before = $customer->only(['name', 'phone', 'npwp']);
        $customer->update($data);

        return back()->with('success', "Customer {$customer->name} diperbarui.");
    }

    public function deleteCustomer(Request $request, Customer $customer)
    {
        $this->authorize('menu.settings');

        $open = Invoice::where('customer_id', $customer->id)->whereIn('status', ['unpaid', 'partial'])->count();
        if ($open > 0) {
            return back()->with('error', "Customer masih memiliki {$open} invoice belum lunas.");
        }

        AuditService::log('deleted', 'customer', $customer->id, $customer->toArray(), null, "Customer dihapus (soft): {$customer->name}");
        $customer->delete();

        return back()->with('success', "Customer {$customer->name} dihapus.");
    }

    public function updateSupplier(Request $request, Supplier $supplier)
    {
        $this->authorize('menu.settings');

        $data = $request->validate([
            'name' => ['required', 'string', 'max:160'],
            'category' => ['nullable', 'string', 'max:60'],
            'category_is_custom' => ['nullable', 'boolean'],
            'address' => ['nullable', 'string', 'max:240'],
            'phone' => ['nullable', 'string', 'max:40'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);
        $data = $this->normalizeSupplierCategory($data);

        $before = $supplier->only(['name', 'category', 'phone']);
        $supplier->update($data);

        return back()->with('success', "Supplier {$supplier->name} diperbarui.");
    }

    private function normalizeSupplierCategory(array $data): array
    {
        if (($data['category_is_custom'] ?? false) && blank($data['category'])) {
            throw ValidationException::withMessages([
                'category' => 'Kategori lainnya wajib diisi.',
            ]);
        }

        unset($data['category_is_custom']);

        return $data;
    }

    public function deleteSupplier(Supplier $supplier)
    {
        $this->authorize('menu.settings');

        $open = Bill::where('supplier_id', $supplier->id)->whereIn('status', ['unpaid', 'partial'])->count();
        if ($open > 0) {
            return back()->with('error', "Supplier masih memiliki {$open} bill belum lunas.");
        }

        AuditService::log('deleted', 'supplier', $supplier->id, $supplier->toArray(), null, "Supplier dihapus (soft): {$supplier->name}");
        $supplier->delete();

        return back()->with('success', "Supplier {$supplier->name} dihapus.");
    }

    public function updateCatalog(Request $request, ServiceCatalog $catalog)
    {
        $this->authorize('menu.settings');

        $data = $request->validate([
            'name' => ['required', 'string', 'max:160'],
            'kind' => ['required', 'in:pendapatan,biaya'],
            'default_price' => ['required', 'numeric', 'min:0'],
        ]);

        $catalog->update($data);

        return back()->with('success', "Katalog {$catalog->name} diperbarui.");
    }

    public function deleteCatalog(ServiceCatalog $catalog)
    {
        $this->authorize('menu.settings');

        $used = \App\Models\InvoiceItem::where('service_catalog_id', $catalog->id)->count();
        if ($used > 0) {
            return back()->with('error', "Katalog sudah dipakai di {$used} item invoice — tidak dapat dihapus.");
        }

        AuditService::log('deleted', 'service_catalog', $catalog->id, $catalog->toArray(), null, "Katalog dihapus: {$catalog->name}");
        $catalog->delete();

        return back()->with('success', 'Katalog dihapus.');
    }

    public function storeCategory(Request $request)
    {
        abort_unless(auth()->user()?->isSuperAdmin(), 403);

        $data = $request->validate([
            'code' => ['required', 'string', 'max:10', 'unique:document_categories,code'],
            'name' => ['required', 'string', 'max:120'],
            'group_code' => ['required', 'in:A,B,C,D,E,F,G'],
            'sort' => ['nullable', 'integer', 'min:0'],
        ]);

        DocumentCategory::create([...$data, 'sort' => $data['sort'] ?? 99]);

        return back()->with('success', "Kategori dokumen {$data['code']} ditambahkan.");
    }

    public function updateCategory(Request $request, DocumentCategory $category)
    {
        abort_unless(auth()->user()?->isSuperAdmin(), 403);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'group_code' => ['required', 'in:A,B,C,D,E,F,G'],
            'sort' => ['nullable', 'integer', 'min:0'],
        ]);

        $category->update($data);

        return back()->with('success', "Kategori {$category->code} diperbarui.");
    }

    public function deleteCategory(DocumentCategory $category)
    {
        abort_unless(auth()->user()?->isSuperAdmin(), 403);

        $used = \App\Models\Document::where('category_id', $category->id)->count();
        if ($used > 0) {
            return back()->with('error', "Kategori dipakai {$used} dokumen — tidak dapat dihapus.");
        }

        AuditService::log('deleted', 'document_category', $category->id, $category->toArray(), null, "Kategori dihapus: {$category->code}");
        $category->delete();

        return back()->with('success', 'Kategori dokumen dihapus.');
    }

    // ===== B5: Master Template & Nomor Surat =====

    public function templates(): array
    {
        return [
            'templates' => \App\Models\DocumentTemplate::orderBy('kategori')->orderBy('code')->get(),
        ];
    }

    public function updateTemplate(Request $request, \App\Models\DocumentTemplate $template)
    {
        abort_unless(auth()->user()?->isSuperAdmin(), 403);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:160'],
            'numbering_pattern' => ['nullable', 'string', 'max:160'],
            'archive_pattern' => ['nullable', 'string', 'max:160'],
            'enabled' => ['required', 'boolean'],
        ]);

        $before = $template->only(['name', 'numbering_pattern', 'archive_pattern', 'enabled']);
        $template->update($data);

        AuditService::log('updated', 'document_template', $template->id, $before, $data, "Template diperbarui: {$template->code}");

        return back()->with('success', "Template {$template->code} diperbarui.");
    }

    public function resetTemplateCounter(Request $request, \App\Models\DocumentTemplate $template)
    {
        abort_unless(auth()->user()?->isSuperAdmin(), 403);

        $request->validate(['kind' => ['required', 'in:terbit,arsip']]);

        $column = $request->string('kind')->toString() === 'arsip' ? 'archive_seq_last' : 'seq_last';
        $template->update([$column => 0]);

        AuditService::log('counter_reset', 'document_template', $template->id, null, ['kind' => $request->string('kind')], "Counter {$column} direset: {$template->code}");

        return back()->with('success', "Counter {$request->string('kind')} template {$template->code} direset ke 0. (Catatan: nomor lama tidak dipakai ulang — reset hanya untuk proyeksi nomor berikutnya.)");
    }
}
