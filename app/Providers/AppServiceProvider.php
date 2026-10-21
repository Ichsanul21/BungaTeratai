<?php

namespace App\Providers;

use App\Enums\RoleSlug;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);

        // Peta morph konsisten dengan kolom approval (string pendek)
        \Illuminate\Database\Eloquent\Relations\Relation::morphMap([
            'voyage' => \App\Models\Voyage::class,
            'document' => \App\Models\Document::class,
        ]);

        // Gate akses menu (dipakai route placeholder sampai controller modul dibuat;
        // tetap dipertahankan sebagai lapisan RBAC route-level).
        Gate::define('menu.approvals', fn ($user) => $user->hasAnyRole([
            RoleSlug::SuperAdmin->value, RoleSlug::Supervisor->value, RoleSlug::Management->value,
        ]));

        Gate::define('menu.finance', fn ($user) => $user->hasAnyRole([
            RoleSlug::SuperAdmin->value, RoleSlug::Finance->value, RoleSlug::Management->value, RoleSlug::Auditor->value,
        ]));

        Gate::define('menu.inventory', fn ($user) => $user->hasAnyRole([
            RoleSlug::SuperAdmin->value, RoleSlug::ShipOps->value, RoleSlug::Finance->value,
            RoleSlug::Management->value, RoleSlug::Auditor->value,
        ]));

        Gate::define('menu.hr', fn ($user) => $user->hasAnyRole([
            RoleSlug::SuperAdmin->value, RoleSlug::ShipOps->value, RoleSlug::Management->value, RoleSlug::Finance->value,
        ]));

        Gate::define('menu.audit', fn ($user) => $user->hasAnyRole([
            RoleSlug::SuperAdmin->value, RoleSlug::Auditor->value, RoleSlug::Management->value,
        ]));

        Gate::define('menu.settings', fn ($user) => $user->hasAnyRole([
            RoleSlug::SuperAdmin->value, RoleSlug::DocController->value,
        ]));

        // Operasional harian (kondisi, servis, BBM)
        Gate::define('operations.manage', fn ($user) => $user->hasAnyRole([
            RoleSlug::SuperAdmin->value, RoleSlug::ShipOps->value, RoleSlug::Management->value,
        ]));

        Gate::define('finance.manage', fn ($user) => $user->hasAnyRole([
            RoleSlug::SuperAdmin->value, RoleSlug::Finance->value,
        ]));

        // Class-level ability (tanpa instance dokumen) untuk menampilkan tombol aksi
        Gate::define('verify-documents', fn ($user) => $user->hasAnyRole([
            RoleSlug::SuperAdmin->value, RoleSlug::Supervisor->value, RoleSlug::Management->value,
        ]));
    }
}
