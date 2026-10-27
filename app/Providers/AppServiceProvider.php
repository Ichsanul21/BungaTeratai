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

        // RBAC configurable: katalog PermissionCatalog jadi otoritas utama untuk
        // ability yang terdaftar di sana (super_admin selalu true; izin yang tidak
        // diberikan = tolak meski Gate lama di bawah mengizinkan). Ability yang
        // tidak ada di katalog (mis. ability policy: create/update) jatuh ke
        // Gate/policy lama seperti biasa.
        Gate::before(function ($user, $ability) {
            if ($user->isSuperAdmin()) {
                return true;
            }

            return $user->checkPermission($ability);
        });

        // Gate akses menu (dipakai route placeholder sampai controller modul dibuat;
        // tetap dipertahankan sebagai lapisan RBAC route-level / fallback).
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

        // Hak akses melihat total saldo perusahaan (hanya Superadmin & Direktur/Management)
        Gate::define('finance.view-balances', fn ($user) => $user->hasAnyRole([
            RoleSlug::SuperAdmin->value, RoleSlug::Management->value,
        ]));

        $this->registerRealtimeObservers();
    }

    /**
     * Observers realtime: tiap perubahan data penting mem-broadcast DataChanged
     * (client menerima event -> menarik delta via /api/sync/pull + reload halaman).
     * Semua no-op kecuali BROADCAST_CONNECTION=reverb (lihat RealtimeBus).
     */
    private function registerRealtimeObservers(): void
    {
        $bus = \App\Services\Realtime\RealtimeBus::class;

        // Badge notifikasi pribadi — realtime ke perangkat penerima saja.
        \App\Models\Notification::created(function ($notification) use ($bus) {
            $bus::userChanged('notification', (int) $notification->recipient_id);
        });

        // Dokumen: verifikasi/void/hapus lewat path mana pun (kantor maupun sinkron).
        \App\Models\Document::updated(function ($document) use ($bus) {
            if ($document->wasChanged(['verification_status', 'voided_at', 'deleted_at'])) {
                $bus::dataChanged('document');
            }
        });

        // Voyage: transisi status (13 status) & perubahan DSR dari kapal.
        \App\Models\Voyage::updated(function ($voyage) use ($bus) {
            if ($voyage->wasChanged(['voyage_status', 'dsr_mt', 'dsr_date', 'actual_departure', 'actual_arrival'])) {
                $bus::dataChanged('voyage');
            }
        });

        // Approval internal/eksternal.
        \App\Models\Approval::updated(function ($approval) use ($bus) {
            if ($approval->wasChanged(['approval_status'])) {
                $bus::dataChanged('approval');
            }
        });

        // Keuangan: pembayaran invoice/bill & jurnal.
        \App\Models\Payment::created(fn () => $bus::dataChanged('finance'));
        \App\Models\BillPayment::created(fn () => $bus::dataChanged('finance'));
        \App\Models\JournalEntry::created(fn () => $bus::dataChanged('finance'));

        // Crewing: gerbak ON/OFF/mutasi (kantor & dari kapal via sinkronisasi).
        \App\Models\CrewMovement::created(fn () => $bus::dataChanged('crew'));
        \App\Models\HoursOfRestLog::saved(fn () => $bus::dataChanged('hours_of_rest'));
    }
}
