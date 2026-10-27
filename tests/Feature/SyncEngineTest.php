<?php

namespace Tests\Feature;

use App\Models\Crew;
use App\Models\Device;
use App\Models\Document;
use App\Models\Role;
use App\Models\User;
use App\Models\Vessel;
use App\Models\Voyage;
use App\Services\HoursOfRestService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Mesin sinkronisasi maritim: push idempoten, otoritas kapal vs kantor,
 * konflik review (tidak timpa diam-diam), tombstone pull, Berkas Offline.
 */
class SyncEngineTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\DemoDataSeeder::class);
    }

    private function shipUser(): User
    {
        $user = User::factory()->create();
        $user->roles()->attach(Role::where('slug', 'ship_ops')->first());

        return $user;
    }

    private function registerDevice(User $user, array $extra = []): Device
    {
        $this->actingAs($user)->postJson('/api/sync/device', array_merge([
            'device_id' => 'SHIP-TB01-001',
            'device_name' => 'Tablet Nakhoda TB Syukur 01',
            'platform' => 'tablet',
            'is_ship' => true,
        ], $extra))->assertOk();

        return Device::where('device_id', $extra['device_id'] ?? 'SHIP-TB01-001')->first();
    }

    private function push(User $user, array $mutations, array $extra = [])
    {
        return $this->actingAs($user)->postJson('/api/sync/push', array_merge([
            'device_id' => 'SHIP-TB01-001',
            'device_now' => now()->toIso8601String(),
            'mutations' => $mutations,
        ], $extra));
    }

    public function test_register_device_and_revoked_blocks(): void
    {
        $user = $this->shipUser();
        $device = $this->registerDevice($user);
        $this->assertTrue($device->is_ship);

        $device->forceFill(['revoked_at' => now()])->save();
        $this->actingAs($user)->postJson('/api/sync/device', ['device_id' => 'SHIP-TB01-001'])
            ->assertForbidden();
    }

    public function test_push_idempotent_replay_tidak_menggandakan(): void
    {
        $user = $this->shipUser();
        $this->registerDevice($user);
        $voyage = Voyage::whereNotNull('vessel_id')->first();
        $key = 'uuid-replay-001';

        $mutation = [
            'idempotency_key' => $key,
            'entity_type' => 'voyage_progress',
            'payload' => ['voyage_id' => $voyage->id, 'dsr_mt' => 7539.27, 'notes_progress' => 'Bongkar selesai 90%'],
        ];

        $first = $this->push($user, [$mutation])->assertOk()->json('results.0');
        $this->assertSame('accepted', $first['status']);

        $eventsBefore = \App\Models\VoyageEvent::count();
        $second = $this->push($user, [$mutation])->assertOk()->json('results.0');

        $this->assertTrue($second['replayed']);
        $this->assertSame('accepted', $second['status']);
        $this->assertSame($eventsBefore, \App\Models\VoyageEvent::count());
        $this->assertSame(1, \App\Models\SyncReceipt::where('idempotency_key', $key)->count());
    }

    public function test_voyage_progress_dsr_diterapkan_dan_event_ship(): void
    {
        $user = $this->shipUser();
        $this->registerDevice($user);
        $voyage = Voyage::whereNotNull('vessel_id')->first();

        $this->push($user, [[
            'idempotency_key' => 'uuid-dsr-001',
            'entity_type' => 'voyage_progress',
            'payload' => [
                'voyage_id' => $voyage->id,
                'dsr_mt' => 7539.27,
                'dsr_date' => '2026-10-20',
                'notes_progress' => 'Muat selesai di Taboneo',
            ],
            'base_updated_at' => now()->addMinute()->toIso8601String(),
        ]])->assertOk();

        $voyage->refresh();
        $this->assertEquals(7539.27, (float) $voyage->dsr_mt);
        $this->assertSame('2026-10-20', $voyage->dsr_date->toDateString());
        $this->assertDatabaseHas('voyage_events', [
            'voyage_id' => $voyage->id,
            'event_type' => 'ship_progress',
            'source' => 'ship',
        ]);
    }

    public function test_status_voyage_ditolak_wenang_kantor(): void
    {
        $user = $this->shipUser();
        $this->registerDevice($user);
        $voyage = Voyage::first();

        $result = $this->push($user, [[
            'idempotency_key' => 'uuid-status-001',
            'entity_type' => 'voyage_progress',
            'payload' => ['voyage_id' => $voyage->id, 'voyage_status' => 'siap_berangkat'],
        ]])->assertOk()->json('results.0');

        $this->assertSame('rejected', $result['status']);
        $this->assertStringContainsString('wewenang kapal', $result['detail']['reason']);
    }

    public function test_konflik_tidak_ditimpa_diam_diam(): void
    {
        $user = $this->shipUser();
        $this->registerDevice($user);
        $voyage = Voyage::whereNotNull('vessel_id')->first();
        $voyage->forceFill(['dsr_mt' => 1000])->save(); // kantor sudah ubah

        $this->push($user, [[
            'idempotency_key' => 'uuid-conflict-001',
            'entity_type' => 'voyage_progress',
            'payload' => ['voyage_id' => $voyage->id, 'dsr_mt' => 2222],
            'base_updated_at' => now()->subDay()->toIso8601String(), // basi
        ]])->assertOk();

        $this->assertEquals(1000, (float) $voyage->fresh()->dsr_mt); // TIDAK ditimpa
        $this->assertDatabaseHas('sync_conflicts', [
            'entity_type' => 'voyage',
            'entity_id' => $voyage->id,
            'status' => 'open',
        ]);
    }

    public function test_vessel_position_update_kapal(): void
    {
        $user = $this->shipUser();
        $vessel = Vessel::first();
        $this->registerDevice($user, ['vessel_id' => $vessel->id]);

        $this->push($user, [[
            'idempotency_key' => 'uuid-pos-001',
            'entity_type' => 'vessel_position',
            'payload' => ['vessel_id' => $vessel->id, 'lat' => -3.3166667, 'lng' => 114.5900033, 'speed_knots' => 7.5],
        ]])->assertOk();

        $vessel->refresh();
        $this->assertEquals(-3.3166667, (float) $vessel->last_lat);
        $this->assertDatabaseHas('vessel_positions', ['vessel_id' => $vessel->id, 'source' => 'ship_sync']);
    }

    public function test_fuel_log_analisis_oto_dan_biaya_tetap_nol(): void
    {
        $user = $this->shipUser();
        $vessel = Vessel::whereNotNull('fuel_baseline_lph')->first() ?? Vessel::first();
        $this->registerDevice($user, ['vessel_id' => $vessel->id]);

        $result = $this->push($user, [[
            'idempotency_key' => 'uuid-fuel-001',
            'entity_type' => 'fuel_log',
            'payload' => ['vessel_id' => $vessel->id, 'trip_date' => '2026-10-21', 'route' => 'Samarinda-Taboneo', 'duration_hours' => 10, 'liters' => 500],
        ]])->assertOk()->json('results.0');

        $this->assertSame('accepted', $result['status']);
        $log = \App\Models\FuelLog::find($result['server_entity_id']);
        $this->assertNotNull($log);
        $this->assertEquals(0, (float) $log->cost); // biaya = wenang kantor
        $this->assertNotNull($log->analysis_status);
    }

    public function test_hours_of_rest_wlr_violations(): void
    {
        $user = $this->shipUser();
        $this->registerDevice($user);
        $crew = Crew::where('status', 'aktif')->first();

        // Istirahat cuma 8 jam dalam 3 blok pendek -> langgar rest_min_10h + rest_block_min_6h
        $result = $this->push($user, [[
            'idempotency_key' => 'uuid-hor-001',
            'entity_type' => 'hours_of_rest',
            'payload' => [
                'crew_id' => $crew->id,
                'client_uuid' => 'hor-uuid-001',
                'log_date' => '2026-10-22',
                'rest_entries' => [
                    ['start' => '00:00', 'end' => '03:00'],
                    ['start' => '12:00', 'end' => '14:00'],
                    ['start' => '20:00', 'end' => '23:00'],
                ],
            ],
        ]])->assertOk()->json('results.0');

        $this->assertSame('accepted', $result['status']);
        $this->assertFalse($result['detail']['compliant']);
        $this->assertContains('rest_min_10h', $result['detail']['violations']);

        $log = \App\Models\HoursOfRestLog::where('client_uuid', 'hor-uuid-001')->first();
        $this->assertSame(480, (int) $log->total_rest_minutes);
        $this->assertSame(960, (int) $log->total_work_minutes);
    }

    public function test_crew_movement_perwira_butuh_verifikasi_kantor(): void
    {
        $user = $this->shipUser();
        $this->registerDevice($user);
        $perwira = Crew::where('rank', 'nakhoda')->first() ?? Crew::first();

        $result = $this->push($user, [[
            'idempotency_key' => 'uuid-crew-001',
            'entity_type' => 'crew_movement',
            'payload' => ['crew_id' => $perwira->id, 'type' => 'sign_off', 'movement_date' => '2026-10-23', 'reason' => 'sakit'],
        ]])->assertOk()->json('results.0');

        $this->assertSame('accepted', $result['status']);
        $this->assertTrue($result['detail']['needs_office_review']);
        $this->assertStringContainsString('verifikasi kantor', \App\Models\CrewMovement::find($result['server_entity_id'])->notes);
    }

    public function test_pull_delta_dan_tombstone_void(): void
    {
        $user = $this->shipUser();
        $this->registerDevice($user);

        $doc = Document::where('owner_type', 'vessel')->first();
        $doc->forceFill(['voided_at' => now()])->save();

        $cursor = now()->subMinute()->toIso8601String();
        $payload = $this->actingAs($user)->getJson("/api/sync/pull?device_id=SHIP-TB01-001&cursor={$cursor}")
            ->assertOk()
            ->json();

        $this->assertArrayHasKey('cursor', $payload);
        $this->assertNotEmpty($payload['changes']['documents']->upserted ?? $payload['changes']['documents']['upserted'] ?? []);
        $deleted = $payload['changes']['documents']->deleted ?? $payload['changes']['documents']['deleted'] ?? [];
        $this->assertContains($doc->id, collect($deleted)->map(fn ($v) => (int) $v)->all());
    }

    public function test_auditor_pull_tanpa_domain_hr_dan_hor(): void
    {
        $auditor = User::factory()->create();
        $auditor->roles()->attach(Role::where('slug', 'auditor')->first());
        $this->registerDevice($auditor, ['device_id' => 'AUDIT-PC-01']);

        $payload = $this->actingAs($auditor)->getJson('/api/sync/pull?device_id=AUDIT-PC-01')
            ->assertOk()
            ->json();

        $this->assertArrayNotHasKey('hours_of_rest', $payload['changes']);
        $this->assertArrayNotHasKey('crew_movements', $payload['changes']);
        $this->assertArrayHasKey('documents', $payload['changes']);
    }

    public function test_berkas_offline_pack_manifest(): void
    {
        $user = $this->shipUser();
        $doc = Document::where('owner_type', 'vessel')->whereNull('deleted_at')->first();
        $vessel = Vessel::findOrFail($doc->owner_id);

        $pack = $this->actingAs($user)->getJson("/api/sync/pack/{$vessel->id}")->assertOk()->json();

        $this->assertSame($vessel->id, $pack['vessel']['id']);
        $this->assertNotEmpty($pack['documents']);
        $this->assertSame($pack['summary']['total'], count($pack['documents']));
        $this->assertMatchesRegularExpression('/^[a-f0-9]{32}$/', $pack['checksum']);
        $this->assertArrayHasKey('days_left', $pack['documents'][0]);
    }

    public function test_hours_of_rest_service_evaluasi(): void
    {
        $service = app(HoursOfRestService::class);

        $ok = $service->evaluateDay([
            ['start' => '00:00', 'end' => '06:00'],
            ['start' => '18:00', 'end' => '23:00'], // 5 jam
        ]);
        $this->assertSame(660, $ok['rest']);
        $this->assertTrue($ok['compliant']);

        $bad = $service->evaluateDay([['start' => '08:00', 'end' => '12:00']]);
        $this->assertContains('rest_min_10h', $bad['violations']);
        $this->assertContains('work_max_14h', $bad['violations']);

        $this->assertSame(['rest_min_77h_week'], $service->weeklyViolations([600, 600, 600, 600, 600, 600, 600]));
        $this->assertSame([], $service->weeklyViolations([660, 660, 660, 660, 660, 660, 660]));
    }
}
