<?php

namespace Tests\Feature;

use App\Models\DevActivityLog;
use App\Models\Role;
use App\Models\User;
use App\Services\AuditService;
use App\Services\Dev\FeatureFlagService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class DeveloperModeTest extends TestCase
{
    use RefreshDatabase;

    private function makeUser(string $email, string $roleSlug, string $name = 'Pengguna'): User
    {
        $role = Role::firstOrCreate(['slug' => $roleSlug], ['name' => ucfirst($roleSlug)]);

        $user = User::create([
            'name' => $name,
            'email' => $email,
            'password' => 'rahasia123',
        ]);

        $user->roles()->syncWithoutDetaching([$role->id]);

        return $user->fresh();
    }

    private function devUser(bool $enabled = true): User
    {
        config()->set('dev.enabled', $enabled);

        return $this->makeUser('dev@bungateratai.test', 'developer', 'Developer Alenkosa');
    }

    public function test_dev_panel_is_404_when_dev_mode_disabled(): void
    {
        $dev = $this->devUser(false);

        $this->actingAs($dev)->get('/developer')->assertNotFound();
    }

    public function test_dev_panel_is_available_for_developer_when_enabled(): void
    {
        $dev = $this->devUser();

        $this->actingAs($dev)->get('/developer')->assertOk();
        $this->actingAs($dev)->get('/developer?tab=watermark')->assertOk();
    }

    public function test_super_admin_cannot_open_dev_panel(): void
    {
        config()->set('dev.enabled', true);
        $admin = $this->makeUser('admin@bungateratai.test', 'super_admin', 'Admin Klien');

        $this->actingAs($admin)->get('/developer')->assertNotFound();
        $this->actingAs($admin)->post('/developer/maintenance', ['action' => 'optimize'])->assertNotFound();
    }

    public function test_developer_actions_go_to_dev_log_not_client_audit_trail(): void
    {
        $dev = $this->devUser();

        $this->actingAs($dev);

        AuditService::log('updated', 'vessel', 1, ['status' => 'aktif'], ['status' => 'perbaikan'], 'Uji aksi developer');

        $this->assertDatabaseCount('audit_logs', 0);
        $this->assertDatabaseCount('dev_activity_logs', 1);
        $this->assertDatabaseHas('dev_activity_logs', [
            'user_id' => $dev->id,
            'action' => 'updated',
            'entity_type' => 'vessel',
        ]);
    }

    public function test_normal_user_actions_still_enter_audit_trail(): void
    {
        config()->set('dev.enabled', true);
        $admin = $this->makeUser('admin2@bungateratai.test', 'super_admin');

        $this->actingAs($admin);

        AuditService::log('updated', 'vessel', 1, null, ['status' => 'aktif'], 'Aksi pengguna biasa');

        $this->assertDatabaseCount('audit_logs', 1);
        $this->assertDatabaseCount('dev_activity_logs', 0);
    }

    public function test_impersonation_start_and_stop(): void
    {
        $dev = $this->devUser();
        $target = $this->makeUser('finance@bungateratai.test', 'finance', 'Staf Keuangan');

        $this->actingAs($dev)
            ->post("/developer/masuk-sebagai/{$target->id}")
            ->assertRedirect('/dashboard');

        $this->assertAuthenticatedAs($target->fresh());
        $this->assertSame($dev->id, session('dev_impersonator_id'));

        $this->get('/dashboard')->assertInertia(fn (AssertableInertia $page) => $page
            ->where('impersonating.current', 'Staf Keuangan')
            ->where('impersonating.name', 'Developer Alenkosa')
            ->etc());

        $this->post('/kembali-ke-developer')->assertRedirect('/developer');

        $this->assertAuthenticatedAs($dev->fresh());
        $this->assertNull(session('dev_impersonator_id'));
        $this->assertDatabaseHas('dev_activity_logs', ['action' => 'impersonate_start']);
        $this->assertDatabaseHas('dev_activity_logs', ['action' => 'impersonate_stop']);
    }

    public function test_actions_while_impersonating_are_attributed_to_developer(): void
    {
        $dev = $this->devUser();
        $target = $this->makeUser('ops@bungateratai.test', 'ship_ops', 'Kepala Operasional');

        $this->actingAs($dev)->post("/developer/masuk-sebagai/{$target->id}");

        AuditService::log('updated', 'voyage', 9, null, ['status' => 'departed'], 'Aksi saat impersonasi');

        /** @var DevActivityLog $row */
        $row = DevActivityLog::where('action', 'updated')->latest('id')->firstOrFail();

        $this->assertSame($dev->id, (int) $row->user_id);
        $this->assertSame($target->id, (int) $row->impersonated_user_id);
        $this->assertDatabaseCount('audit_logs', 0);
    }

    public function test_sql_console_rejects_write_queries(): void
    {
        $dev = $this->devUser();

        $this->actingAs($dev)
            ->post('/developer/sql', ['sql' => 'delete from users'])
            ->assertRedirect('/developer?tab=sql');

        $this->assertDatabaseHas('users', ['id' => $dev->id]);

        $result = session('dev_sql_result');
        $this->assertNotNull($result);
        $this->assertNotNull($result['error']);
    }

    public function test_sql_console_allows_select(): void
    {
        $dev = $this->devUser();

        $this->actingAs($dev)->post('/developer/sql', ['sql' => 'select id, email from users order by id']);

        $result = session('dev_sql_result');
        $this->assertNotNull($result);
        $this->assertNull($result['error']);
        $this->assertNotEmpty($result['rows']);
    }

    public function test_sql_console_respects_feature_flag(): void
    {
        $dev = $this->devUser();
        FeatureFlagService::set(['sql_console' => false]);

        $this->actingAs($dev)
            ->post('/developer/sql', ['sql' => 'select 1'])
            ->assertNotFound();
    }

    public function test_dev_account_command_creates_developer_account(): void
    {
        $this->artisan('dev:account', ['--email' => 'dev@command.test', '--password' => 'rahasia123'])
            ->assertSuccessful();

        $user = User::where('email', 'dev@command.test')->first();

        $this->assertNotNull($user);
        $this->assertTrue($user->isDeveloper());
        $this->assertTrue(Hash::check('rahasia123', $user->password));
    }

    public function test_developer_account_is_hidden_from_settings_user_list(): void
    {
        $this->devUser();
        $admin = $this->makeUser('admin3@bungateratai.test', 'super_admin');

        $response = $this->actingAs($admin)->get('/pengaturan');

        $response->assertOk();
        $response->assertDontSee('dev@bungateratai.test', false);
    }
}
