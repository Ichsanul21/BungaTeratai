<?php

namespace Tests\Feature;

use App\Events\DataChanged;
use App\Models\Document;
use App\Models\Notification;
use App\Models\Role;
use App\Models\User;
use App\Services\Realtime\RealtimeBus;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

/**
 * Realtime antar-perangkat (Reverb):
 * - RealtimeBus hanya broadcast bila BROADCAST_CONNECTION=reverb (guard test).
 * - Event = ping DataChanged (client menarik delta sendiri via pull).
 * - Channel auth per user & per role.
 */
class RealtimeBroadcastTest extends TestCase
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

    public function test_bus_tidak_broadcast_bila_bukan_reverb(): void
    {
        Event::fake([DataChanged::class]);
        config()->set('broadcasting.default', 'log');

        RealtimeBus::dataChanged('document');

        Event::assertNotDispatched(DataChanged::class);
    }

    public function test_bus_broadcast_bila_reverb_dan_event_berisi_kind(): void
    {
        Event::fake([DataChanged::class]);
        config()->set('broadcasting.default', 'reverb');

        RealtimeBus::dataChanged('voyage');
        RealtimeBus::userChanged('notification', 7);

        Event::assertDispatched(DataChanged::class, fn (DataChanged $e) => $e->kind === 'voyage');
        Event::assertDispatched(DataChanged::class, fn (DataChanged $e) => $e->kind === 'notification' && $e->userId === 7);
    }

    public function test_observer_notifikasi_memicu_broadcast_ke_penerima(): void
    {
        Event::fake([DataChanged::class]);
        config()->set('broadcasting.default', 'reverb');

        $recipient = $this->userWithRole('ship_ops');
        Notification::create([
            'recipient_id' => $recipient->id,
            'notification_type' => 'dokumen_mendekati_kedaluwarsa',
            'title' => 'Uji coba',
            'message' => 'Notifikasi uji coba realtime',
            'read_status' => false,
        ]);

        Event::assertDispatched(DataChanged::class, fn (DataChanged $e) => $e->kind === 'notification' && $e->userId === $recipient->id);
    }

    public function test_observer_verifikasi_dokumen_memicu_broadcast(): void
    {
        Event::fake([DataChanged::class]);
        config()->set('broadcasting.default', 'reverb');

        $document = Document::where('owner_type', 'vessel')->first();
        $document->forceFill(['verification_status' => 'under_review'])->save();

        Event::assertDispatched(DataChanged::class, fn (DataChanged $e) => $e->kind === 'document');
    }

    public function test_channel_auth_user_dan_role(): void
    {
        // Driver 'log' sengaja melewati seluruh pengecekan channel
        // (LogBroadcaster::auth kosong) — uji memakai driver reverb sungguhan
        // agar callback routes/channels.php yang dievaluasi.
        config()->set('broadcasting.default', 'reverb');
        config()->set('broadcasting.connections.reverb', [
            'driver' => 'reverb',
            'key' => 'test-key',
            'secret' => 'test-secret',
            'app_id' => 'test-app',
            'options' => ['client_options' => []],
        ]);
        config()->set('reverb.app.key', 'test-key');
        config()->set('reverb.app.secret', 'test-secret');

        // channels.php di-require saat boot ke driver default saat itu ('log').
        // Setelah memindai default ke reverb, daftarkan ulang ke driver reverb
        // (di produksi env sudah reverb sejak awal — tak perlu langkah ini).
        require base_path('routes/channels.php');

        $user = $this->userWithRole('finance');
        $socket = '12345.67890';

        // channel user sendiri: boleh; user lain: tolak
        $this->actingAs($user)->post('/broadcasting/auth', [
            'channel_name' => 'private-user.'.$user->id,
            'socket_id' => $socket,
        ])->assertOk();

        $other = $this->userWithRole('ship_ops');
        $this->actingAs($user)->post('/broadcasting/auth', [
            'channel_name' => 'private-user.'.$other->id,
            'socket_id' => $socket,
        ])->assertForbidden();

        // channel role miliknya: boleh; role lain: tolak
        $this->actingAs($user)->post('/broadcasting/auth', [
            'channel_name' => 'private-role.finance',
            'socket_id' => $socket,
        ])->assertOk();

        $this->actingAs($user)->post('/broadcasting/auth', [
            'channel_name' => 'private-role.auditor',
            'socket_id' => $socket,
        ])->assertForbidden();

        // tamu (tanpa login) selalu ditolak
        auth()->logout();
        $this->post('/broadcasting/auth', [
            'channel_name' => 'private-role.finance',
            'socket_id' => $socket,
        ])->assertForbidden();
    }

    public function test_event_didispatch_dari_perubahan_dsr_kapal(): void
    {
        Event::fake([DataChanged::class]);
        config()->set('broadcasting.default', 'reverb');

        $voyage = \App\Models\Voyage::whereNotNull('vessel_id')->first();
        $voyage->forceFill(['dsr_mt' => 7777.77])->save();

        Event::assertDispatched(DataChanged::class, fn (DataChanged $e) => $e->kind === 'voyage');
    }
}
