<?php

namespace Tests\Feature;

use App\Models\Document;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use App\Models\Vessel;
use App\Services\PermissionCatalog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * RBAC configurable: katalog izin + matriks role (Pengaturan -> Hak Akses).
 * Default grant = replikasi persis Gate lama, lalu superadmin boleh ubah.
 */
class RbacConfigurableTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\DemoDataSeeder::class);
    }

    private function userWithRole(string $slug): User
    {
        $user = User::factory()->create();
        $user->roles()->attach(Role::where('slug', $slug)->first());

        return $user;
    }

    public function test_katalog_terpasang_dan_default_meniru_gate_lama(): void
    {
        $this->assertDatabaseCount('permissions', count(PermissionCatalog::all()));

        // Gate lama: finance.manage = super_admin + finance
        $this->assertContains('finance.manage', Role::where('slug', 'finance')->first()->permissionCodes());
        $this->assertNotContains('finance.manage', Role::where('slug', 'ship_ops')->first()->permissionCodes());

        // Gate lama: menu.finance = super, finance, management, auditor
        $this->assertContains('menu.finance', Role::where('slug', 'auditor')->first()->permissionCodes());
        $this->assertNotContains('menu.finance', Role::where('slug', 'doc_controller')->first()->permissionCodes());

        // Policy lama: fleet.create = ship_ops + management
        $this->assertContains('fleet.create', Role::where('slug', 'ship_ops')->first()->permissionCodes());
        $this->assertNotContains('fleet.create', Role::where('slug', 'auditor')->first()->permissionCodes());

        // settings.rbac: tidak ada role non-super yang dapat (hanya Super Admin)
        foreach (Role::where('slug', '!=', 'super_admin')->get() as $role) {
            $this->assertNotContains('settings.rbac', $role->permissionCodes());
        }
    }

    public function test_super_admin_see_rbac_matrix_and_doc_controller_403(): void
    {
        $this->actingAs($this->userWithRole('super_admin'))
            ->get('/pengaturan?tab=rbac')
            ->assertOk();

        $this->actingAs($this->userWithRole('doc_controller'))
            ->get('/pengaturan?tab=rbac')
            ->assertForbidden();
    }

    public function test_revoke_menu_finance_blocks_finance_module(): void
    {
        $financeUser = $this->userWithRole('finance');
        $this->actingAs($financeUser)->get('/keuangan')->assertOk();

        $role = Role::where('slug', 'finance')->first();
        $role->syncPermissionCodes(array_values(array_diff($role->permissionCodes(), ['menu.finance'])));

        $this->actingAs($financeUser)->get('/keuangan')->assertForbidden();
    }

    public function test_grant_fleet_create_to_auditor_allows_vessel_create(): void
    {
        $auditor = $this->userWithRole('auditor');
        $this->assertFalse($auditor->can('create', Vessel::class));

        $role = Role::where('slug', 'auditor')->first();
        $role->syncPermissionCodes([...$role->permissionCodes(), 'fleet.create']);

        $this->assertTrue($auditor->fresh()->can('create', Vessel::class));
    }

    public function test_revoke_documents_verify_from_supervisor_blocks_verify(): void
    {
        $supervisor = $this->userWithRole('supervisor');
        $document = Document::first();
        $this->assertNotNull($document);
        $this->assertTrue($supervisor->can('verify', $document));

        $role = Role::where('slug', 'supervisor')->first();
        $role->syncPermissionCodes(array_values(array_diff($role->permissionCodes(), ['documents.verify'])));

        $this->assertFalse($supervisor->fresh()->can('verify', $document));
    }

    public function test_update_role_permissions_via_http_and_audit_logged(): void
    {
        $sa = $this->userWithRole('super_admin');
        $auditorRole = Role::where('slug', 'auditor')->first();
        $permIds = Permission::whereIn('code', ['fleet.create', 'fleet.update'])->pluck('id');

        $this->actingAs($sa)->put("/pengaturan/rbac/{$auditorRole->id}", [
            'permissions' => [...$auditorRole->permissionCodes() /* tidak valid id */, ...$permIds->all()],
        ])->assertSessionHasErrors('permissions.0'); // kode izin bukan ID -> validasi exists menolak string

        // Kirim ID izin yang benar (grant auditor bisa update armada)
        $allowed = Permission::whereIn('code', [
            'menu.dashboard', 'menu.fleet', 'menu.documents', 'menu.voyages', 'menu.operations',
            'menu.reports', 'menu.notifications', 'fleet.view', 'documents.view', 'voyages.view',
            'reports.view', 'reports.export', 'sync.offline', 'fleet.update',
        ])->pluck('id')->all();

        $this->actingAs($sa)->put("/pengaturan/rbac/{$auditorRole->id}", [
            'permissions' => $allowed,
        ])->assertSessionHas('success');

        $codes = $auditorRole->fresh()->permissionCodes();
        $this->assertContains('fleet.update', $codes);
        $this->assertNotContains('menu.finance', $codes);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'updated',
            'entity_type' => 'role',
            'entity_id' => $auditorRole->id,
        ]);
    }

    public function test_super_admin_role_update_is_noop(): void
    {
        $sa = $this->userWithRole('super_admin');
        $saRole = Role::where('slug', 'super_admin')->first();

        $this->actingAs($sa)
            ->put("/pengaturan/rbac/{$saRole->id}", ['permissions' => []])
            ->assertSessionHas('success');

        // Super Admin tetap lolos semua gate meski pivot kosong
        $this->actingAs($sa)->get('/keuangan')->assertOk();
    }

    public function test_ship_ops_default_flow_tetap_bisa_create_vessel(): void
    {
        $shipOps = $this->userWithRole('ship_ops');
        $this->assertTrue($shipOps->can('create', Vessel::class));
        $this->assertFalse($shipOps->can('approve', \App\Models\Voyage::first() ?? new \App\Models\Voyage()));
    }
}
