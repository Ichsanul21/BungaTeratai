<?php

namespace App\Http\Controllers\Dev;

use App\Http\Controllers\Controller;
use App\Models\DevActivityLog;
use App\Models\Device;
use App\Models\DocumentTemplate;
use App\Models\SyncConflict;
use App\Models\User;
use App\Services\Dev\DevActivityService;
use App\Services\Dev\FeatureFlagService;
use App\Services\Dev\SqlConsoleService;
use App\Services\Dev\SystemInfoService;
use App\Services\ReminderService;
use App\Services\WatermarkService;
use Database\Seeders\DemoDataSeeder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Panel Developer (Alenkosa). Semua route-nya dijaga middleware "dev"
 * (DEV_MODE=true + role developer, selain itu 404).
 */
class DeveloperController extends Controller
{
    private const TABS = [
        'ringkasan', 'akses', 'maintenance', 'data',
        'sinkronisasi', 'log', 'fitur', 'sql', 'nomor', 'watermark',
    ];

    public function index(Request $request): Response
    {
        $tab = $request->string('tab')->toString();
        if (! in_array($tab, self::TABS, true)) {
            $tab = 'ringkasan';
        }

        return Inertia::render('Developer/Index', [
            'tab' => $tab,
            'tabs' => self::TABS,
            'system' => SystemInfoService::summary(),
            'users' => $tab === 'akses' ? $this->userRows() : [],
            'devLogs' => in_array($tab, ['ringkasan', 'log'], true) ? $this->devLogRows() : [],
            'devices' => $tab === 'sinkronisasi' ? $this->deviceRows() : [],
            'conflicts' => $tab === 'sinkronisasi' ? $this->conflictRows() : [],
            'flags' => FeatureFlagService::meta(),
            'templates' => $tab === 'nomor' ? $this->templateRows() : [],
            'watermarkConfig' => WatermarkService::get(),
            'logTail' => $tab === 'log' ? $this->logTail($request) : null,
            'sqlResult' => $request->session()->pull('dev_sql_result'),
        ]);
    }

    /** Aksi maintenance (daftar putih perintah artisan). */
    public function maintenance(Request $request)
    {
        $data = $request->validate([
            'action' => ['required', 'in:optimize,view_cache,config_cache,route_cache,storage_link'],
        ]);

        $command = match ($data['action']) {
            'optimize' => 'optimize:clear',
            'view_cache' => 'view:cache',
            'config_cache' => 'config:cache',
            'route_cache' => 'route:cache',
            'storage_link' => 'storage:link',
        };

        try {
            Artisan::call($command);
            $output = trim(Artisan::output());

            DevActivityService::log('maintenance', 'system', null, null, ['command' => $command], "Maintenance: php artisan {$command}");

            return back()->with('success', "php artisan {$command} selesai.".($output !== '' ? ' '.mb_substr($output, 0, 240) : ''));
        } catch (\Throwable $e) {
            return back()->with('error', "php artisan {$command} gagal: ".mb_substr($e->getMessage(), 0, 300));
        }
    }

    /** Aksi data berat — sengaja butuh konfirmasi teks. */
    public function dataAction(Request $request)
    {
        $data = $request->validate([
            'action' => ['required', 'in:reseed_demo,reminder_sync'],
            'confirm' => ['nullable', 'string', 'max:20'],
        ]);

        try {
            if ($data['action'] === 'reseed_demo') {
                if (($data['confirm'] ?? '') !== 'RESEED') {
                    return back()->with('error', 'Ketik RESEED pada kolom konfirmasi untuk menjalankan seed demo.');
                }

                @set_time_limit(0);
                Artisan::call('db:seed', [
                    '--class' => DemoDataSeeder::class,
                    '--force' => true,
                ]);

                DevActivityService::log('data_reseed', 'system', null, null, null, 'Seed demo dijalankan ulang dari panel developer');

                return back()->with('success', 'Seed demo selesai dijalankan.');
            }

            app(ReminderService::class)->sync();

            DevActivityService::log('data_reminder_sync', 'system', null, null, null, 'Sinkronisasi reminder dijalankan manual');

            return back()->with('success', 'Reminder dokumen & invoice disinkronkan.');
        } catch (\Throwable $e) {
            return back()->with('error', 'Aksi data gagal: '.mb_substr($e->getMessage(), 0, 300));
        }
    }

    public function resolveConflict(Request $request, SyncConflict $conflict)
    {
        $data = $request->validate([
            'choice' => ['required', 'in:ship,shore'],
            'note' => ['nullable', 'string', 'max:200'],
        ]);

        $label = $data['choice'] === 'ship' ? 'Pakai laporan kapal' : 'Pertahankan versi kantor';

        $conflict->update([
            'status' => 'resolved',
            'resolved_by' => $request->user()?->id,
            'resolved_at' => now(),
            'resolution_note' => trim($label.' (developer). '.($data['note'] ?? '')),
        ]);

        DevActivityService::log(
            'sync_conflict_resolved',
            'sync_conflict',
            $conflict->id,
            ['status' => 'open'],
            ['status' => 'resolved', 'choice' => $data['choice']],
            $label,
        );

        return back()->with('success', "Konflik #{$conflict->id} ditandai selesai: {$label}.");
    }

    public function updateFlags(Request $request)
    {
        $data = $request->validate([
            'flags' => ['required', 'array'],
            'flags.*' => ['boolean'],
        ]);

        $before = FeatureFlagService::all();
        $after = FeatureFlagService::set($data['flags']);

        DevActivityService::log('feature_flags_updated', 'setting', null, $before, $after, 'Feature flag diperbarui');

        return back()->with('success', 'Feature flag diperbarui.');
    }

    public function resetCounter(Request $request, DocumentTemplate $template)
    {
        $data = $request->validate([
            'seq_last' => ['required', 'integer', 'min:0', 'max:999999'],
            'archive_seq_last' => ['required', 'integer', 'min:0', 'max:999999'],
        ]);

        $before = $template->only(['seq_last', 'archive_seq_last']);
        $template->update($data);

        DevActivityService::log(
            'numbering_counter_updated',
            'document_template',
            $template->id,
            $before,
            ['seq_last' => (int) $data['seq_last'], 'archive_seq_last' => (int) $data['archive_seq_last']],
            "Counter template {$template->code} disesuaikan",
        );

        return back()->with('success', "Counter {$template->code} disimpan. Nomor lama tidak dipakai ulang oleh sistem.");
    }

    public function runSql(Request $request, SqlConsoleService $console)
    {
        if (! FeatureFlagService::enabled('sql_console')) {
            abort(404);
        }

        $data = $request->validate([
            'sql' => ['required', 'string', 'max:5000'],
        ]);

        $result = $console->run($data['sql']);
        $request->session()->put('dev_sql_result', [...$result, 'sql' => $data['sql']]);

        DevActivityService::log(
            'sql_query',
            'system',
            null,
            null,
            ['sql' => mb_substr($data['sql'], 0, 500), 'rows' => count($result['rows']), 'error' => $result['error']],
            'Query konsol SQL dijalankan',
        );

        return redirect('/developer?tab=sql');
    }

    /** @return list<array<string, mixed>> */
    private function userRows(): array
    {
        return User::with('roles')
            ->orderBy('name')
            ->get()
            ->map(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'roles' => $user->roles->pluck('slug')->values()->all(),
                'is_developer' => $user->isDeveloper(),
                'last_activity' => $user->updated_at?->diffForHumans(),
            ])
            ->values()
            ->all();
    }

    /** @return list<array<string, mixed>> */
    private function devLogRows(): array
    {
        return DevActivityLog::with(['user:id,name', 'impersonatedUser:id,name'])
            ->orderByDesc('id')
            ->limit(150)
            ->get()
            ->map(fn (DevActivityLog $log) => [
                'id' => $log->id,
                'actor' => $log->user?->name ?? 'Sistem',
                'impersonated' => $log->impersonatedUser?->name,
                'action' => $log->action,
                'entity_type' => $log->entity_type,
                'entity_id' => $log->entity_id,
                'summary' => $log->summary,
                'ip_address' => $log->ip_address,
                'device' => $log->device,
                'timestamp' => $log->timestamp?->toIso8601String(),
            ])
            ->values()
            ->all();
    }

    /** @return list<array<string, mixed>> */
    private function deviceRows(): array
    {
        return Device::with(['user:id,name', 'vessel:id,vessel_name'])
            ->orderByDesc('last_seen_at')
            ->limit(60)
            ->get()
            ->map(fn (Device $device) => [
                'id' => $device->id,
                'name' => $device->device_name ?? 'Perangkat #'.$device->id,
                'platform' => $device->platform,
                'is_ship' => (bool) $device->is_ship,
                'user' => $device->user?->name,
                'vessel' => $device->vessel?->vessel_name,
                'last_seen_at' => $device->last_seen_at?->toIso8601String(),
                'revoked' => $device->revoked_at !== null,
            ])
            ->values()
            ->all();
    }

    /** @return list<array<string, mixed>> */
    private function conflictRows(): array
    {
        return SyncConflict::with('device:id,name')
            ->orderByDesc('id')
            ->limit(60)
            ->get()
            ->map(fn (SyncConflict $conflict) => [
                'id' => $conflict->id,
                'entity_type' => $conflict->entity_type,
                'entity_id' => $conflict->entity_id,
                'field' => $conflict->field,
                'ship_value' => $conflict->ship_value,
                'shore_value' => $conflict->shore_value,
                'device' => $conflict->device?->name,
                'status' => $conflict->status,
                'ship_occurred_at' => $conflict->ship_occurred_at?->toIso8601String(),
                'created_at' => $conflict->created_at?->toIso8601String(),
            ])
            ->values()
            ->all();
    }

    /** @return list<array<string, mixed>> */
    private function templateRows(): array
    {
        return DocumentTemplate::orderBy('code')
            ->get(['id', 'code', 'name', 'numbering_pattern', 'archive_pattern', 'seq_last', 'archive_seq_last'])
            ->map(fn (DocumentTemplate $template) => [
                'id' => $template->id,
                'code' => $template->code,
                'name' => $template->name,
                'pattern' => $template->numbering_pattern,
                'archive_pattern' => $template->archive_pattern,
                'seq_last' => (int) $template->seq_last,
                'archive_seq_last' => (int) $template->archive_seq_last,
            ])
            ->values()
            ->all();
    }

    /** @return array{path: string, lines: list<string>, size: int, level: string, lines_requested: int} */
    private function logTail(Request $request): array
    {
        $path = storage_path('logs/laravel.log');
        $requested = (int) $request->integer('lines', (int) config('dev.log_lines', 400));
        $requested = max(50, min(2000, $requested));
        $level = strtolower($request->string('level')->toString());

        if (! is_file($path)) {
            return ['path' => $path, 'lines' => [], 'size' => 0, 'level' => $level, 'lines_requested' => $requested];
        }

        $lines = [];
        try {
            $size = (int) filesize($path);
            $handle = fopen($path, 'rb');

            if ($handle !== false) {
                // Baca maksimal 1 MB terakhir — log bisa ratusan MB.
                $offset = max(0, $size - 1024 * 1024);
                fseek($handle, $offset);
                $chunk = (string) stream_get_contents($handle);
                fclose($handle);

                $lines = preg_split("/\r?\n/", $chunk) ?: [];
                if ($offset > 0) {
                    array_shift($lines); // baris pertama kemungkinan terpotong
                }
                $lines = array_values(array_filter($lines, fn (string $line) => trim($line) !== ''));
                $lines = array_slice($lines, -$requested);
            }
        } catch (\Throwable) {
            $lines = [];
        }

        if ($level !== '' && $level !== 'semua') {
            $lines = array_values(array_filter(
                $lines,
                fn (string $line) => str_contains(mb_strtolower($line), '.'.$level),
            ));
        }

        return [
            'path' => $path,
            'lines' => array_slice($lines, -$requested),
            'size' => (int) @filesize($path),
            'level' => $level,
            'lines_requested' => $requested,
        ];
    }
}
