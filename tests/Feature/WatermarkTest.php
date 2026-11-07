<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use App\Services\WatermarkService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class WatermarkTest extends TestCase
{
    use RefreshDatabase;

    private function devUser(): User
    {
        config()->set('dev.enabled', true);

        $role = Role::firstOrCreate(['slug' => 'developer'], ['name' => 'Developer']);
        $user = User::create([
            'name' => 'Developer Alenkosa',
            'email' => 'dev@watermark.test',
            'password' => 'rahasia123',
        ]);
        $user->roles()->attach($role);

        return $user;
    }

    private function defaultPayload(): array
    {
        return [
            'enabled' => true,
            'line1' => 'Copyright of Alenkosa - Your IT Solutions',
            'line2' => '{ip} - {device} - {timestamp} - {user}',
            'opacity' => 0.07,
            'speed' => 40,
            'angle' => -28,
            'font_size' => 11,
            'color' => '#00205B',
            'show_login' => true,
            'pdf_enabled' => true,
        ];
    }

    public function test_default_watermark_is_shared_with_visitor_identity(): void
    {
        $user = $this->devUser();

        $this->actingAs($user)->get('/dashboard')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('watermark.line1', 'Copyright of Alenkosa - Your IT Solutions')
                ->where('watermark.show_login', true)
                ->where('watermark.values.user', 'Developer Alenkosa')
                ->etc());
    }

    public function test_watermark_also_rendered_on_login_page(): void
    {
        $this->get('/login')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('watermark.line1', 'Copyright of Alenkosa - Your IT Solutions')
                ->where('watermark.values.user', 'Tamu')
                ->etc());
    }

    public function test_watermark_can_be_disabled(): void
    {
        WatermarkService::save(['enabled' => false]);

        $this->assertNull(WatermarkService::clientPayload(request()));
        $this->assertNull(WatermarkService::pdf());
    }

    public function test_developer_can_update_and_reset_watermark(): void
    {
        $dev = $this->devUser();

        $payload = $this->defaultPayload();
        $payload['line1'] = 'Khusus Alenkosa';
        $payload['line2'] = '{user} - {ip} - {timestamp}';
        $payload['opacity'] = 0.12;
        $payload['speed'] = 25;
        $payload['color'] = '#BA0C2F';

        $this->actingAs($dev)->put('/developer/watermark', $payload)->assertRedirect();

        $this->assertSame('Khusus Alenkosa', WatermarkService::get()['line1']);
        $this->assertSame(0.12, WatermarkService::get()['opacity']);
        $this->assertSame(25, WatermarkService::get()['speed']);
        $this->assertSame('#BA0C2F', WatermarkService::get()['color']);
        $this->assertDatabaseHas('dev_activity_logs', ['action' => 'watermark_updated']);

        $client = WatermarkService::clientPayload(request());
        $this->assertSame(0.12, $client['opacity']);
        $this->assertSame(25, $client['speed']);
        $this->assertSame('#BA0C2F', $client['color']);

        $this->actingAs($dev)->post('/developer/watermark/reset')->assertRedirect();

        $this->assertSame(
            'Copyright of Alenkosa - Your IT Solutions',
            WatermarkService::get()['line1'],
        );
    }

    public function test_watermark_values_are_sanitized_and_clamped(): void
    {
        $config = WatermarkService::save([
            'line1' => '<script>alert(1)</script>Alenkosa',
            'opacity' => 5,
            'speed' => 1,
            'angle' => -999,
            'font_size' => 100,
            'color' => 'not-a-color',
        ]);

        $this->assertSame('alert(1)Alenkosa', $config['line1']);
        $this->assertSame(0.35, $config['opacity']);
        $this->assertSame(10, $config['speed']);
        $this->assertSame(-60, $config['angle']);
        $this->assertSame(24, $config['font_size']);
        $this->assertSame('#00205B', $config['color']);
    }

    public function test_pdf_watermark_uses_resolved_tokens(): void
    {
        $user = $this->devUser();

        $this->actingAs($user);

        $pdf = WatermarkService::pdf();

        $this->assertNotNull($pdf);
        $this->assertSame('Copyright of Alenkosa - Your IT Solutions', $pdf['line1']);
        $this->assertStringContainsString('Developer Alenkosa', $pdf['line2']);
        $this->assertStringContainsString('WITA', $pdf['line2']);
        $this->assertMatchesRegularExpression('/^#[0-9A-F]{6}$/', $pdf['color']);
    }

    public function test_pdf_watermark_can_be_disabled_separately(): void
    {
        WatermarkService::save(['pdf_enabled' => false]);

        $this->assertNotNull(WatermarkService::clientPayload(request()));
        $this->assertNull(WatermarkService::pdf());
    }
}
