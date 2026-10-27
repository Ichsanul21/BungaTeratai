<?php

namespace App\Services\Sync;

use App\Models\Device;
use App\Models\Document;
use App\Models\SyncBatch;
use App\Models\SyncConflict;
use App\Models\SyncReceipt;
use App\Models\User;
use App\Services\AuditService;
use App\Services\FuelAnalysisService;
use App\Services\HoursOfRestService;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Mesin sinkronisasi maritim: kapal (store-and-forward) <-> kantor.
 *
 * Prinsip:
 * - Otoritas terbagi: hanya field di SHIP_FIELDS yang boleh diubah mutasi offline.
 *   Nomor, status voyage, verifikasi/void dokumen, invoice/jurnal = WENANG KANTOR.
 * - Idempoten: tiap mutasi wajib idempotency_key; replay (tautan satelit putus
 *   lalu diulang) tidak menggandakan baris.
 * - Konflik tidak ditimpa diam-diam: bila baris berubah di kantor sejak perangkat
 *   melihatnya (base_updated_at basi) -> SyncConflict (review), bukan timpa.
 * - Tombstone: pull mengirimkan id yang dihapus/void agar mirror kapal bersih.
 */
class SyncService
{
    public const CLOCK_SKEW_MINUTES = 15;

    /** Kunci penunjuk target/provenance — boleh dikirim kapal, hanya dibaca (tidak ditulis sembarangan). */
    public const ROUTING_KEYS = ['voyage_id', 'vessel_id', 'crew_id', 'client_uuid', 'device_occurred_at'];

    /** Field yang menjadi WENANG KAPAL (catatan operasional onboard). */
    public const SHIP_FIELDS = [
        'voyage_progress' => ['dsr_mt', 'dsr_date', 'actual_departure', 'actual_arrival', 'notes_progress'],
        'vessel_position' => ['lat', 'lng', 'speed_knots', 'heading', 'recorded_at'],
        'fuel_log' => ['trip_date', 'route', 'cargo_type', 'duration_hours', 'distance_nm', 'liters', 'notes'],
        'voyage_safety_check' => ['checked_at', 'checklist', 'passenger_count', 'capacity', 'status', 'notes'],
        'hours_of_rest' => ['crew_id', 'voyage_id', 'log_date', 'rest_entries', 'notes', 'device_occurred_at'],
        'crew_movement' => ['crew_id', 'vessel_id', 'type', 'movement_date', 'role', 'reason', 'notes'],
    ];

    public function __construct(
        private HoursOfRestService $hor,
        private FuelAnalysisService $fuel,
    ) {}

    /** Tanggal/waktu dari perangkat kapal — tahan format rusak (jam kapal bisa kacau). */
    private function parseDate(?string $value, string $default): string
    {
        if ($value === null || $value === '') {
            return $default;
        }

        try {
            return Carbon::parse($value)->format(
                str_contains($default, ':') ? 'Y-m-d H:i:s' : 'Y-m-d'
            );
        } catch (\Throwable) {
            return $default;
        }
    }

    public function registerDevice(User $user, array $data): Device
    {
        $device = Device::updateOrCreate(
            ['device_id' => $data['device_id']],
            [
                'user_id' => $user->id,
                'vessel_id' => $data['vessel_id'] ?? null,
                'device_name' => $data['device_name'] ?? null,
                'platform' => $data['platform'] ?? null,
                'is_ship' => (bool) ($data['is_ship'] ?? false),
                'last_seen_at' => now(),
            ]
        );

        abort_if($device->isRevoked(), 403, 'Akses perangkat dicabut kantor — hubungi admin.');

        return $device;
    }

    /**
     * Proses batch mutasi offline. Aman di-replay: hasil per key disimpan di sync_receipts.
     *
     * @return array{batch_id: int, results: list<array>}
     */
    public function push(User $user, Device $device, array $mutations, ?string $deviceNow = null): array
    {
        $skewMinutes = null;
        if ($deviceNow) {
            try {
                $skewMinutes = (float) abs(Carbon::parse($deviceNow)->diffInMinutes(now(), absolute: false));
            } catch (\Throwable) {
                $skewMinutes = null;
            }
        }

        $batch = SyncBatch::create([
            'device_id' => $device->id,
            'user_id' => $user->id,
            'direction' => 'push',
            'record_count' => count($mutations),
            'started_at' => now(),
            'bytes' => strlen((string) json_encode($mutations)),
        ]);

        $results = [];
        foreach ($mutations as $mutation) {
            $results[] = $this->applyMutation($user, $device, $mutation, $skewMinutes, $batch->id);
        }

        $count = fn (string $status) => count(array_filter($results, fn ($r) => $r['status'] === $status));
        $batch->update([
            'accepted' => $count('accepted'),
            'conflicted' => $count('conflict'),
            'rejected' => $count('rejected'),
            'finished_at' => now(),
        ]);

        $device->forceFill(['last_seen_at' => now(), 'last_sync_at' => now()])->save();

        return [
            'batch_id' => $batch->id,
            'server_time' => now()->toIso8601String(),
            'clock_skew_minutes' => $skewMinutes,
            'results' => $results,
        ];
    }

    /** Delta per domain sejak cursor (+ tombstone id yang dihapus/void). */
    public function pull(User $user, Device $device, ?string $cursor = null): array
    {
        try {
            $since = $cursor ? Carbon::parse($cursor) : now()->subDays(7);
        } catch (\Throwable) {
            $since = now()->subDays(7);
        }

        $changes = [];

        if ($user->can('viewAny', Document::class)) {
            $changes['documents'] = $this->deltaDocuments($since);
        }
        if ($user->can('fleet.view') || $user->isSuperAdmin()) {
            $changes['vessels'] = $this->deltaBasic('vessels', ['id', 'vessel_name', 'last_lat', 'last_lng', 'last_position_at', 'updated_at'], $since);
        }
        if ($user->can('voyages.view') || $user->isSuperAdmin()) {
            $changes['voyages'] = $this->deltaBasic('voyages', ['id', 'voyage_code', 'vessel_id', 'voyage_status', 'origin', 'destination', 'dsr_mt', 'dsr_date', 'actual_departure', 'actual_arrival', 'updated_at'], $since);
        }
        if ($user->can('menu.hr') || $user->isSuperAdmin()) {
            $changes['crew_movements'] = $this->deltaBasic('crew_movements', ['id', 'crew_id', 'vessel_id', 'type', 'movement_date', 'role', 'reason', 'no_surat', 'updated_at'], $since);
        }
        if ($user->can('hor.view') || $user->isSuperAdmin()) {
            $changes['hours_of_rest'] = $this->deltaBasic('hours_of_rest_logs', ['id', 'client_uuid', 'crew_id', 'voyage_id', 'log_date', 'rest_entries', 'total_rest_minutes', 'total_work_minutes', 'is_compliant', 'violations', 'updated_at'], $since);
        }

        // Notifikasi pribadi (tanpa tombstone — tabel tanpa updated_at)
        $changes['notifications'] = DB::table('notifications')
            ->where('recipient_id', $user->id)
            ->where('created_at', '>', $since)
            ->orderBy('id')
            ->limit(500)
            ->get(['id', 'notification_type', 'title', 'message', 'reference_type', 'reference_id', 'read_status', 'created_at'])
            ->toArray();

        $device->forceFill(['last_seen_at' => now(), 'last_sync_at' => now()])->save();

        return [
            'cursor' => now()->toIso8601String(),
            'server_time' => now()->toIso8601String(),
            'changes' => $changes,
        ];
    }

    /** Berkas Offline Kapal: manifest dokumen aktif utk kesiapan inspeksi PSC. */
    public function documentPack(User $user, \App\Models\Vessel $vessel): array
    {
        abort_unless($user->can('view', $vessel), 403, 'Tidak berwenang melihat kapal ini.');

        $documents = Document::query()
            ->where('owner_type', 'vessel')
            ->where('owner_id', $vessel->id)
            ->whereNull('deleted_at')
            ->with('versions')
            ->orderBy('requirement_code')
            ->get()
            ->map(function (Document $doc) {
                $version = $doc->current_version_id
                    ? $doc->versions->firstWhere('id', $doc->current_version_id)
                    : $doc->versions->last();

                return [
                    'id' => $doc->id,
                    'requirement_code' => $doc->requirement_code,
                    'document_name' => $doc->document_name,
                    'document_number' => $doc->document_number,
                    'verification_status' => $doc->verification_status,
                    'has_expiry' => $doc->has_expiry,
                    'expiry_date' => $doc->expiry_date?->toDateString(),
                    'days_left' => $doc->has_expiry && $doc->expiry_date
                        ? (int) now()->startOfDay()->diffInDays($doc->expiry_date, false)
                        : null,
                    'has_endorsement' => $doc->has_endorsement,
                    'endorsement_next_date' => $doc->endorsement_next_date?->toDateString(),
                    'voided_at' => $doc->voided_at?->toIso8601String(),
                    'updated_at' => $doc->updated_at?->toIso8601String(),
                    'file' => $version ? [
                        'name' => basename((string) $version->file_path),
                        'mime' => $version->file_mime,
                        'size' => $version->file_size,
                        'checksum' => md5($version->file_path.'|'.$version->file_size.'|'.$version->uploaded_at),
                    ] : null,
                    'checksum' => md5(implode('|', [
                        $doc->id, $doc->document_number, $doc->verification_status,
                        $doc->expiry_date, $doc->voided_at, $doc->updated_at,
                    ])),
                ];
            })
            ->values();

        return [
            'vessel' => [
                'id' => $vessel->id,
                'vessel_name' => $vessel->vessel_name,
            ],
            'generated_at' => now()->toIso8601String(),
            'generated_by' => $user->name,
            'summary' => [
                'total' => $documents->count(),
                'verified' => $documents->where('verification_status', 'verified')->count(),
                'expiring_30' => $documents->filter(fn ($d) => $d['days_left'] !== null && $d['days_left'] >= 0 && $d['days_left'] <= 30)->count(),
                'expired' => $documents->filter(fn ($d) => $d['days_left'] !== null && $d['days_left'] < 0)->count(),
            ],
            'checksum' => md5($documents->pluck('checksum')->implode(',')),
            'documents' => $documents,
        ];
    }

    // ------------------------------------------------------------------
    // Mutasi
    // ------------------------------------------------------------------

    private function applyMutation(User $user, Device $device, array $mutation, ?float $skew, int $batchId): array
    {
        $key = $mutation['idempotency_key'] ?? null;
        $type = $mutation['entity_type'] ?? '';
        $payload = $mutation['payload'] ?? [];
        $action = $mutation['action'] ?? 'create';

        $receipt = fn (string $result, ?int $serverId = null, ?array $detail = null) => [
            'idempotency_key' => $key,
            'entity_type' => $type,
            'status' => $result,
            'server_entity_id' => $serverId,
            'detail' => $detail,
            'replayed' => false,
        ];

        $saveReceipt = function (string $result, ?int $serverId = null, ?array $detail = null) use ($key, $device, $type, $mutation, $batchId) {
            if ($key === null || $key === '') {
                return;
            }
            SyncReceipt::create([
                'idempotency_key' => $key,
                'device_id' => $device->id,
                'entity_type' => $type,
                'entity_id' => $mutation['entity_id'] ?? null,
                'action' => $mutation['action'] ?? 'create',
                'result' => $result,
                'server_entity_id' => $serverId,
                'detail' => $detail,
                'server_applied_at' => now(),
            ]);
        };

        if (! $key) {
            return $receipt('rejected', null, ['reason' => 'idempotency_key wajib ada']);
        }

        // Replay-safe: pernah diproses -> kembalikan hasil lama, JANGAN apply ulang.
        $existing = SyncReceipt::where('idempotency_key', $key)->first();
        if ($existing) {
            return [
                'idempotency_key' => $key,
                'entity_type' => $existing->entity_type,
                'status' => $existing->result,
                'server_entity_id' => $existing->server_entity_id,
                'detail' => $existing->detail,
                'replayed' => true,
            ];
        }

        if (! isset(self::SHIP_FIELDS[$type])) {
            $saveReceipt('rejected', null, ['reason' => "tipe mutasi '$type' tidak didukung / di luar wewenang kapal"]);
            return $receipt('rejected', null, ['reason' => "tipe mutasi '$type' tidak didukung / di luar wewenang kapal"]);
        }

        $disallowed = array_diff(array_keys($payload), self::SHIP_FIELDS[$type], self::ROUTING_KEYS);
        if ($disallowed !== []) {
            $reason = 'field di luar wewenang kapal: '.implode(', ', $disallowed).' (kantor yang mengubah)';
            $saveReceipt('rejected', null, ['reason' => $reason]);
            return $receipt('rejected', null, ['reason' => $reason]);
        }

        try {
            return DB::transaction(function () use ($user, $device, $type, $payload, $mutation, $skew, $saveReceipt, $receipt) {
                $out = match ($type) {
                    'voyage_progress' => $this->applyVoyageProgress($user, $payload, $mutation),
                    'vessel_position' => $this->applyVesselPosition($user, $device, $payload),
                    'fuel_log' => $this->applyFuelLog($user, $device, $payload),
                    'voyage_safety_check' => $this->applySafetyCheck($user, $payload),
                    'hours_of_rest' => $this->applyHoursOfRest($user, $device, $payload, $skew),
                    'crew_movement' => $this->applyCrewMovement($user, $device, $payload),
                    default => $receipt('rejected', null, ['reason' => 'tipe tidak dikenal']),
                };

                $saveReceipt($out['status'], $out['server_entity_id'] ?? null, $out['detail'] ?? null);

                return $out;
            });
        } catch (\Throwable $e) {
            $saveReceipt('rejected', null, ['reason' => $e->getMessage()]);
            return $receipt('rejected', null, ['reason' => $e->getMessage()]);
        }
    }

    /** @return array{status: string, server_entity_id?: int, detail?: array} */
    private function applyVoyageProgress(User $user, array $payload, array $mutation): array
    {
        $voyage = \App\Models\Voyage::find($payload['voyage_id'] ?? null);
        if (! $voyage) {
            return ['status' => 'rejected', 'detail' => ['reason' => 'voyage tidak ditemukan']];
        }
        if (! $user->can('update', $voyage)) {
            return ['status' => 'rejected', 'detail' => ['reason' => 'tidak berwenang mengubah voyage ini']];
        }

        // Konflik: baris sudah berubah di kantor sejak terakhir dilihat perangkat.
        $base = $mutation['base_updated_at'] ?? null;
        if ($base && $voyage->updated_at && $voyage->updated_at->gt(Carbon::parse($base)->addSecond())) {
            SyncConflict::create([
                'entity_type' => 'voyage',
                'entity_id' => $voyage->id,
                'field' => '*',
                'ship_value' => (string) json_encode($payload),
                'shore_value' => (string) json_encode([
                    'voyage_status' => $voyage->voyage_status,
                    'dsr_mt' => $voyage->dsr_mt,
                    'dsr_date' => $voyage->dsr_date,
                    'actual_departure' => $voyage->actual_departure,
                    'actual_arrival' => $voyage->actual_arrival,
                    'updated_at' => $voyage->updated_at->toIso8601String(),
                ]),
                'device_id' => null,
                'ship_occurred_at' => isset($payload['device_occurred_at']) ? Carbon::parse($payload['device_occurred_at']) : null,
                'policy' => 'review',
                'status' => 'open',
            ]);

            return ['status' => 'conflict', 'server_entity_id' => $voyage->id, 'detail' => ['reason' => 'voyage berubah di kantor — masuk antrean konflik review']];
        }

        $before = $voyage->only(['dsr_mt', 'dsr_date', 'actual_departure', 'actual_arrival']);

        $updatable = array_intersect_key($payload, array_flip(['dsr_mt', 'dsr_date', 'actual_departure', 'actual_arrival']));
        foreach (['dsr_date' => 'Y-m-d', 'actual_departure' => 'Y-m-d H:i:s', 'actual_arrival' => 'Y-m-d H:i:s'] as $field => $format) {
            if (isset($updatable[$field])) {
                $updatable[$field] = $this->parseDate((string) $updatable[$field], $format === 'Y-m-d' ? now()->toDateString() : now()->toDateTimeString());
            }
        }
        if ($updatable !== []) {
            $voyage->forceFill($updatable)->save();
        }

        if (! empty($payload['notes_progress'])) {
            \App\Models\VoyageEvent::create([
                'voyage_id' => $voyage->id,
                'event_type' => 'ship_progress',
                'occurred_at' => isset($payload['device_occurred_at'])
                    ? Carbon::parse($payload['device_occurred_at'])
                    : now(),
                'user_id' => $user->id,
                'source' => 'ship',
                'description' => (string) $payload['notes_progress'],
                'payload' => ['via' => 'sync_offline', 'device_time' => $payload['device_occurred_at'] ?? null],
            ]);
        }

        if (isset($payload['dsr_mt']) || isset($payload['dsr_date'])) {
            AuditService::log(
                'updated',
                'voyage',
                $voyage->id,
                $before,
                $voyage->only(['dsr_mt', 'dsr_date']),
                'DSR dilaporkan dari kapal (sinkronisasi offline)'
            );
        }

        return ['status' => 'accepted', 'server_entity_id' => $voyage->id, 'detail' => ['applied' => array_keys($updatable)]];
    }

    private function applyVesselPosition(User $user, Device $device, array $payload): array
    {
        $vesselId = $payload['vessel_id'] ?? $device->vessel_id;
        $vessel = \App\Models\Vessel::find($vesselId);
        if (! $vessel) {
            return ['status' => 'rejected', 'detail' => ['reason' => 'kapal tidak ditemukan']];
        }
        if (! $user->can('view', $vessel)) {
            return ['status' => 'rejected', 'detail' => ['reason' => 'tidak berwenang pada kapal ini']];
        }

        $lat = (float) ($payload['lat'] ?? 0);
        $lng = (float) ($payload['lng'] ?? 0);
        if ($lat < -90 || $lat > 90 || $lng < -180 || $lng > 180) {
            return ['status' => 'rejected', 'detail' => ['reason' => 'lintang/bujur di luar rentang']];
        }

        $position = \App\Models\VesselPosition::create([
            'vessel_id' => $vessel->id,
            'lat' => $lat,
            'lng' => $lng,
            'speed_knots' => $payload['speed_knots'] ?? null,
            'heading' => $payload['heading'] ?? null,
            'recorded_at' => Carbon::parse($this->parseDate($payload['recorded_at'] ?? null, now()->toDateTimeString())),
            'source' => 'ship_sync',
        ]);

        $vessel->forceFill([
            'last_lat' => $lat,
            'last_lng' => $lng,
            'last_position_at' => $position->recorded_at,
        ])->save();

        return ['status' => 'accepted', 'server_entity_id' => $position->id];
    }

    private function applyFuelLog(User $user, Device $device, array $payload): array
    {
        $vessel = \App\Models\Vessel::find($payload['vessel_id'] ?? $device->vessel_id);
        if (! $vessel) {
            return ['status' => 'rejected', 'detail' => ['reason' => 'kapal tidak ditemukan']];
        }

        $liters = (float) ($payload['liters'] ?? 0);
        $hours = (float) ($payload['duration_hours'] ?? 0);
        if ($liters <= 0 || $hours <= 0) {
            return ['status' => 'rejected', 'detail' => ['reason' => 'liters & duration_hours wajib > 0']];
        }

        $analysis = $this->fuel->analyze($liters, $hours, $vessel->fuel_baseline_lph);

        $log = \App\Models\FuelLog::create([
            'vessel_id' => $vessel->id,
            'voyage_id' => $payload['voyage_id'] ?? null,
            'trip_date' => $this->parseDate($payload['trip_date'] ?? null, now()->toDateString()),
            'route' => $payload['route'] ?? '-',
            'cargo_type' => $payload['cargo_type'] ?? null,
            'duration_hours' => $hours,
            'distance_nm' => $payload['distance_nm'] ?? null,
            'liters' => $liters,
            'cost' => 0, // biaya = wenang kantor (tidak dikirim dari kapal)
            'baseline_lph_snapshot' => $vessel->fuel_baseline_lph,
            'analysis_status' => $analysis['status'] ?? 'normal',
            'analysis_diff_pct' => $analysis['diff_pct'] ?? 0,
            'explanation_note' => $payload['notes'] ?? ($analysis['note'] ?? null),
            'created_by' => $user->id,
        ]);

        return ['status' => 'accepted', 'server_entity_id' => $log->id, 'detail' => ['analysis' => $analysis['status'] ?? 'normal']];
    }

    private function applySafetyCheck(User $user, array $payload): array
    {
        $voyage = \App\Models\Voyage::find($payload['voyage_id'] ?? null);
        if (! $voyage) {
            return ['status' => 'rejected', 'detail' => ['reason' => 'voyage tidak ditemukan']];
        }

        $status = in_array($payload['status'] ?? '', ['lulus', 'tidak'], true) ? $payload['status'] : null;
        if (! $status) {
            return ['status' => 'rejected', 'detail' => ['reason' => 'status harus lulus|tidak']];
        }

        $check = \App\Models\VoyageSafetyCheck::create([
            'voyage_id' => $voyage->id,
            'checked_at' => Carbon::parse($this->parseDate($payload['checked_at'] ?? null, now()->toDateTimeString())),
            'checklist' => (object) ($payload['checklist'] ?? []),
            'capacity' => $payload['capacity'] ?? null,
            'passenger_count' => $payload['passenger_count'] ?? null,
            'status' => $status,
            'checked_by' => $user->id,
            'notes' => $payload['notes'] ?? null,
        ]);

        return ['status' => 'accepted', 'server_entity_id' => $check->id];
    }

    private function applyHoursOfRest(User $user, Device $device, array $payload, ?float $skew): array
    {
        $crew = \App\Models\Crew::find($payload['crew_id'] ?? null);
        if (! $crew) {
            return ['status' => 'rejected', 'detail' => ['reason' => 'awak tidak ditemukan']];
        }

        $entries = $payload['rest_entries'] ?? [];
        if (! is_array($entries)) {
            return ['status' => 'rejected', 'detail' => ['reason' => 'rest_entries harus berupa daftar']];
        }

        $evaluation = $this->hor->evaluateDay($entries);
        $deviceOccurredRaw = $payload['device_occurred_at'] ?? null;
        $deviceOccurred = $deviceOccurredRaw
            ? Carbon::parse($this->parseDate($deviceOccurredRaw, now()->toDateTimeString()))
            : null;
        $skewed = $skew !== null && $skew > self::CLOCK_SKEW_MINUTES;

        $log = \App\Models\HoursOfRestLog::updateOrCreate(
            ['client_uuid' => $payload['client_uuid'] ?? null],
            [
                'crew_id' => $crew->id,
                'voyage_id' => $payload['voyage_id'] ?? null,
                'log_date' => $this->parseDate($payload['log_date'] ?? null, now()->toDateString()),
                'rest_entries' => $entries,
                'total_rest_minutes' => $evaluation['rest'],
                'total_work_minutes' => $evaluation['work'],
                'is_compliant' => $evaluation['compliant'],
                'violations' => $evaluation['violations'],
                'device_occurred_at' => $deviceOccurred,
                'synced_at' => now(),
                'device_id' => $device->id,
                'entered_by' => $user->id,
                'notes' => ($skewed ? '[Jam kapal meleset >'.self::CLOCK_SKEW_MINUTES.' menit] ' : '').($payload['notes'] ?? null),
            ]
        );

        return [
            'status' => 'accepted',
            'server_entity_id' => $log->id,
            'detail' => ['compliant' => $evaluation['compliant'], 'violations' => $evaluation['violations'], 'clock_skewed' => $skewed],
        ];
    }

    private function applyCrewMovement(User $user, Device $device, array $payload): array
    {
        $crew = \App\Models\Crew::find($payload['crew_id'] ?? null);
        if (! $crew) {
            return ['status' => 'rejected', 'detail' => ['reason' => 'awak tidak ditemukan']];
        }

        $allowedTypes = ['sign_on', 'sign_off', 'mutasi_kapal', 'mutasi_jabatan', 'kadet_on', 'kadet_off'];
        $type = $payload['type'] ?? '';
        if (! in_array($type, $allowedTypes, true)) {
            return ['status' => 'rejected', 'detail' => ['reason' => 'type gerakan tidak valid']];
        }

        // Gerakan perwira = wajib verifikasi kantor (aturan pengganti perwira di UI kantor).
        $perwira = in_array($crew->rank, ['nakhoda', 'mualim_i', 'mualim_ii', 'masinis_i', 'masinis_ii', 'masinis_iii'], true);

        $movement = \App\Models\CrewMovement::create([
            'crew_id' => $crew->id,
            'vessel_id' => $payload['vessel_id'] ?? $device->vessel_id,
            'type' => $type,
            'role' => $payload['role'] ?? null,
            'movement_date' => $this->parseDate($payload['movement_date'] ?? null, now()->toDateString()),
            'reason' => $payload['reason'] ?? null,
            'notes' => ($perwira ? '[Dari kapal — wajib verifikasi kantor: perwira] ' : '[Dari kapal] ').($payload['notes'] ?? null),
        ]);

        AuditService::log(
            'created',
            'crew_movement',
            $movement->id,
            null,
            ['crew' => $crew->name, 'type' => $type, 'via' => 'sync_offline'],
            'Gerakan awak dilaporkan dari kapal (sinkronisasi offline)'.($perwira ? ' — perlu verifikasi kantor' : '')
        );

        return [
            'status' => 'accepted',
            'server_entity_id' => $movement->id,
            'detail' => ['needs_office_review' => $perwira],
        ];
    }

    /** Daftar konflik terbuka utk review kantor (keputusan: pakai laporan kapal / pertahankan kantor). */
    public function openConflicts(): array
    {
        return \App\Models\SyncConflict::with('device')
            ->where('status', 'open')
            ->orderByDesc('id')
            ->limit(100)
            ->get()
            ->map(fn ($c) => [
                'id' => $c->id,
                'entity_type' => $c->entity_type,
                'entity_id' => $c->entity_id,
                'field' => $c->field,
                'ship_value' => $c->ship_value,
                'shore_value' => $c->shore_value,
                'ship_occurred_at' => $c->ship_occurred_at?->toIso8601String(),
                'device_name' => $c->device?->device_name,
                'policy' => $c->policy,
                'status' => $c->status,
                'created_at' => $c->created_at?->toIso8601String(),
            ])
            ->all();
    }

    /**
     * Selesaikan konflik: 'ship' = terapkan laporan kapal; 'shore' = pertahankan kantor.
     * Tidak pernah menimpa diam-diam — keputusan tercatat + audit.
     */
    public function resolveConflict(\App\Models\SyncConflict $conflict, string $decision, User $user): void
    {
        abort_if($conflict->status !== 'open', 422, 'Konflik sudah pernah diselesaikan.');

        if ($decision === 'ship' && $conflict->entity_type === 'voyage') {
            $voyage = \App\Models\Voyage::find($conflict->entity_id);
            if ($voyage) {
                $shipPayload = json_decode((string) $conflict->ship_value, true) ?: [];
                $applyable = array_intersect_key($shipPayload, array_flip(['dsr_mt', 'dsr_date', 'actual_departure', 'actual_arrival']));
                foreach (['dsr_date' => 'Y-m-d', 'actual_departure' => 'Y-m-d H:i:s', 'actual_arrival' => 'Y-m-d H:i:s'] as $field => $format) {
                    if (isset($applyable[$field])) {
                        $applyable[$field] = $this->parseDate((string) $applyable[$field], $format === 'Y-m-d' ? now()->toDateString() : now()->toDateTimeString());
                    }
                }
                if ($applyable !== []) {
                    $voyage->forceFill($applyable)->save();
                }
            }
        }

        $conflict->forceFill([
            'status' => 'resolved',
            'resolved_by' => $user->id,
            'resolved_at' => now(),
            'resolution_note' => $decision === 'ship'
                ? 'Keputusan kantor: terapkan laporan kapal (sinkronisasi offline).'
                : 'Keputusan kantor: pertahankan data kantor.',
        ])->save();

        AuditService::log(
            'updated',
            'sync_conflict',
            $conflict->id,
            ['status' => 'open'],
            ['status' => 'resolved', 'decision' => $decision],
            'Konflik sinkronisasi diselesaikan ('.($decision === 'ship' ? 'pakai laporan kapal' : 'pertahankan kantor').") entity {$conflict->entity_type}#{$conflict->entity_id}"
        );
    }

    // ------------------------------------------------------------------
    // Pull helpers
    // ------------------------------------------------------------------

    private function deltaDocuments(\Carbon\Carbon $since): object
    {
        $fields = ['id', 'document_name', 'document_number', 'owner_type', 'owner_id', 'requirement_code',
            'verification_status', 'has_expiry', 'expiry_date', 'has_endorsement', 'endorsement_next_date',
            'voided_at', 'deleted_at', 'updated_at'];

        $upserted = Document::withTrashed()
            ->where(function ($q) use ($since) {
                $q->where('updated_at', '>', $since);
            })
            ->whereNull('deleted_at')
            ->whereNull('voided_at')
            ->orderBy('id')
            ->limit(1000)
            ->get($fields)
            ->map(fn ($d) => $d->toArray())
            ->values();

        $deleted = Document::withTrashed()
            ->where(function ($q) use ($since) {
                $q->where('deleted_at', '>', $since)->orWhere('voided_at', '>', $since);
            })
            ->orderBy('id')
            ->limit(1000)
            ->pluck('id');

        return (object) ['upserted' => $upserted, 'deleted' => $deleted];
    }

    private function deltaBasic(string $table, array $fields, \Carbon\Carbon $since): object
    {
        $hasSoft = in_array($table, ['vessels', 'voyages', 'hours_of_rest_logs'], true);
        $query = DB::table($table)->where('updated_at', '>', $since);

        $upserted = (clone $query)->orderBy('id')->limit(1000)->get($fields);

        $deletedQuery = DB::table($table)->where('updated_at', '>', $since);
        $deleted = $hasSoft
            ? (clone $deletedQuery)->whereNotNull('deleted_at')->orderBy('id')->limit(1000)->pluck('id')
            : collect();

        return (object) ['upserted' => $upserted, 'deleted' => $deleted];
    }
}
