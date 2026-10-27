<?php

namespace Tests\Feature;

use App\Models\Crew;
use App\Models\HoursOfRestLog;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Hours of Rest (MLC 2006 / SOLAS XI/1): catat, evaluasi WLR,
 * RBAC hor.view/hor.manage, idempotensi offline, cetak register PSC.
 */
class HoursOfRestModuleTest extends TestCase
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

    public function test_tab_hor_render_for_ship_ops_with_data(): void
    {
        $user = $this->userWithRole('ship_ops');
        $crew = Crew::where('status', 'aktif')->first();

        HoursOfRestLog::create([
            'crew_id' => $crew->id,
            'log_date' => now()->toDateString(),
            'rest_entries' => [['start' => '00:00', 'end' => '06:00'], ['start' => '18:00', 'end' => '23:00']],
            'total_rest_minutes' => 660,
            'total_work_minutes' => 780,
            'is_compliant' => true,
            'violations' => [],
            'entered_by' => $user->id,
            'synced_at' => now(),
        ]);

        $this->actingAs($user)
            ->get('/sdm?tab=hor')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Hr/Index')
                ->where('tab', 'hor')
                ->has('horLogs', 1)
                ->where('canHorManage', true)
                ->where('horAccess', true));
    }

    public function test_store_patuh_wlr_dan_audit(): void
    {
        $user = $this->userWithRole('ship_ops');
        $crew = Crew::where('status', 'aktif')->first();

        $this->actingAs($user)->post('/sdm/hor', [
            'crew_id' => $crew->id,
            'log_date' => '2026-10-22',
            'rest_entries' => [
                ['start' => '00:00', 'end' => '06:00'],
                ['start' => '18:00', 'end' => '23:00'],
            ],
            'notes' => 'jaga malam',
        ])->assertSessionHas('success');

        $log = HoursOfRestLog::where('crew_id', $crew->id)->where('log_date', '2026-10-22')->first();
        $this->assertNotNull($log);
        $this->assertSame(660, (int) $log->total_rest_minutes);
        $this->assertSame(780, (int) $log->total_work_minutes);
        $this->assertTrue($log->is_compliant);
        $this->assertSame([], $log->violations);

        $this->assertDatabaseHas('audit_logs', ['action' => 'created', 'entity_type' => 'hours_of_rest']);
    }

    public function test_store_langgar_wlr_ditandai(): void
    {
        $user = $this->userWithRole('ship_ops');
        $crew = Crew::where('status', 'aktif')->first();

        $this->actingAs($user)->post('/sdm/hor', [
            'crew_id' => $crew->id,
            'log_date' => '2026-10-23',
            'rest_entries' => [['start' => '08:00', 'end' => '12:00']],
        ])->assertSessionHas('success');

        $log = HoursOfRestLog::where('log_date', '2026-10-23')->first();
        $this->assertFalse($log->is_compliant);
        $this->assertContains('rest_min_10h', $log->violations);
        $this->assertContains('work_max_14h', $log->violations);
    }

    public function test_client_uuid_idempoten_tidak_duplikat(): void
    {
        $user = $this->userWithRole('ship_ops');
        $crew = Crew::where('status', 'aktif')->first();

        $payload = [
            'crew_id' => $crew->id,
            'log_date' => '2026-10-24',
            'rest_entries' => [['start' => '00:00', 'end' => '07:00']],
            'client_uuid' => 'hor-offline-abc-123',
        ];

        $this->actingAs($user)->post('/sdm/hor', $payload)->assertSessionHas('success');
        $this->actingAs($user)->post('/sdm/hor', $payload)->assertSessionHas('success');

        $this->assertSame(1, HoursOfRestLog::where('client_uuid', 'hor-offline-abc-123')->count());
    }

    public function test_update_recompute_dan_delete_soft(): void
    {
        $user = $this->userWithRole('ship_ops');
        $crew = Crew::where('status', 'aktif')->first();
        $log = HoursOfRestLog::create([
            'crew_id' => $crew->id,
            'log_date' => '2026-10-25',
            'rest_entries' => [['start' => '00:00', 'end' => '04:00']],
            'total_rest_minutes' => 240,
            'total_work_minutes' => 1200,
            'is_compliant' => false,
            'violations' => ['rest_min_10h'],
            'synced_at' => now(),
        ]);

        $this->actingAs($user)->put("/sdm/hor/{$log->id}", [
            'crew_id' => $crew->id,
            'log_date' => '2026-10-25',
            'rest_entries' => [
                ['start' => '00:00', 'end' => '06:00'],
                ['start' => '18:00', 'end' => '23:00'],
            ],
        ])->assertSessionHas('success');

        $log->refresh();
        $this->assertSame(660, (int) $log->total_rest_minutes);
        $this->assertTrue($log->is_compliant);

        $this->actingAs($user)->delete("/sdm/hor/{$log->id}")->assertSessionHas('success');
        $this->assertSoftDeleted('hours_of_rest_logs', ['id' => $log->id]);
    }

    public function test_rbac_finance_view_tanpa_manage(): void
    {
        $finance = $this->userWithRole('finance');
        $crew = Crew::where('status', 'aktif')->first();

        // finance: boleh lihat tab HoR
        $this->actingAs($finance)->get('/sdm?tab=hor')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('canHorManage', false));

        // tapi TIDAK boleh mencatat
        $this->actingAs($finance)->post('/sdm/hor', [
            'crew_id' => $crew->id,
            'log_date' => '2026-10-26',
            'rest_entries' => [['start' => '00:00', 'end' => '06:00']],
        ])->assertForbidden();

        // auditor: tidak punya hor.view & menu.hr -> tab 403
        $auditor = $this->userWithRole('auditor');
        $this->actingAs($auditor)->get('/sdm?tab=hor')->assertForbidden();
    }

    public function test_cetak_register_pdf(): void
    {
        $user = $this->userWithRole('ship_ops');
        $crew = Crew::where('status', 'aktif')->first();
        HoursOfRestLog::create([
            'crew_id' => $crew->id,
            'log_date' => now()->toDateString(),
            'rest_entries' => [['start' => '00:00', 'end' => '06:00']],
            'total_rest_minutes' => 360,
            'total_work_minutes' => 1080,
            'is_compliant' => false,
            'violations' => ['rest_min_10h'],
            'synced_at' => now(),
        ]);

        $response = $this->actingAs($user)->get("/sdm/hor/cetak/{$crew->id}?month=".now()->format('Y-m'));
        $response->assertOk();
        $this->assertStringContainsString('pdf', (string) $response->headers->get('content-type'));
    }
}
