<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Models\Company;
use App\Models\Customer;
use App\Models\DocumentCategory;
use App\Models\Role;
use App\Models\ServiceCatalog;
use App\Models\Setting;
use App\Models\Supplier;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Inertia\Response;

class SettingsController extends Controller
{
    public function index(Request $request): Response
    {
        $this->authorize('menu.settings');

        $tab = $request->string('tab')->toString() ?: 'users';

        $data = match ($tab) {
            'profil' => [
                'company' => Company::first(),
            ],
            'kategori' => [
                'categories' => DocumentCategory::orderBy('sort')->get(),
            ],
            'reminder' => [
                'reminderDays' => Setting::where('key', 'reminder_days')->value('value') ?? '30,14,7,0',
            ],
            'master' => [
                'customers' => Customer::orderBy('name')->limit(100)->get(),
                'suppliers' => Supplier::orderBy('name')->limit(100)->get(),
                'serviceCatalog' => ServiceCatalog::orderBy('kind')->get(),
                'accountsList' => Account::orderBy('code')->get(),
            ],
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
            ...$data,
        ]);
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
            'phone' => ['nullable', 'string', 'max:40'],
        ]);

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
}
