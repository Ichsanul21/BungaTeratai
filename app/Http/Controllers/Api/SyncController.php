<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Device;
use App\Services\Sync\SyncService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Endpoint sinkronisasi maritim (session auth + CSRF, sama-origin via axios).
 * Kapal: store-and-forward — push saat ada jendela, pull delta + tombstone.
 */
class SyncController extends Controller
{
    public function __construct(private SyncService $sync) {}

    public function registerDevice(Request $request): JsonResponse
    {
        $this->authorize('sync.offline');

        $data = $request->validate([
            'device_id' => ['required', 'string', 'max:64'],
            'device_name' => ['nullable', 'string', 'max:120'],
            'platform' => ['nullable', 'string', 'max:40'],
            'vessel_id' => ['nullable', 'integer', 'exists:vessels,id'],
            'is_ship' => ['nullable', 'boolean'],
        ]);

        $device = $this->sync->registerDevice($request->user(), $data);

        return response()->json([
            'device' => [
                'device_id' => $device->device_id,
                'is_ship' => $device->is_ship,
                'vessel_id' => $device->vessel_id,
                'last_sync_at' => $device->last_sync_at?->toIso8601String(),
            ],
        ]);
    }

    public function push(Request $request): JsonResponse
    {
        $this->authorize('sync.offline');

        $data = $request->validate([
            'device_id' => ['required', 'string', 'max:64'],
            'device_now' => ['nullable', 'string', 'max:40'],
            'mutations' => ['required', 'array', 'max:200'],
            'mutations.*.idempotency_key' => ['required', 'string', 'max:64'],
            'mutations.*.entity_type' => ['required', 'string', 'max:40'],
            'mutations.*.entity_id' => ['nullable', 'string', 'max:40'],
            'mutations.*.action' => ['nullable', 'in:create,update,delete'],
            'mutations.*.payload' => ['nullable', 'array'],
            'mutations.*.priority' => ['nullable', 'in:safety,operational,financial,bulk'],
            'mutations.*.base_updated_at' => ['nullable', 'string', 'max:40'],
        ]);

        $device = Device::where('device_id', $data['device_id'])->first();
        abort_if(! $device || $device->isRevoked(), 403, 'Perangkat tidak terdaftar atau akses dicabut.');
        $device->forceFill(['user_id' => $request->user()->id])->save();

        return response()->json(
            $this->sync->push($request->user(), $device, $data['mutations'], $data['device_now'] ?? null)
        );
    }

    public function pull(Request $request): JsonResponse
    {
        $this->authorize('sync.offline');

        $data = $request->validate([
            'device_id' => ['required', 'string', 'max:64'],
            'cursor' => ['nullable', 'string', 'max:40'],
        ]);

        $device = Device::where('device_id', $data['device_id'])->first();
        abort_if(! $device || $device->isRevoked(), 403, 'Perangkat tidak terdaftar atau akses dicabut.');

        return response()->json(
            $this->sync->pull($request->user(), $device, $data['cursor'] ?? null)
        );
    }

    public function pack(Request $request, int $vessel): JsonResponse
    {
        $this->authorize('sync.offline');

        $target = \App\Models\Vessel::findOrFail($vessel);

        return response()->json($this->sync->documentPack($request->user(), $target));
    }

    /** Konflik terbuka (review kantor). */
    public function conflicts(): JsonResponse
    {
        $this->authorize('sync.conflicts');

        return response()->json(['conflicts' => $this->sync->openConflicts()]);
    }

    /** Putuskan konflik: decision = ship | shore. */
    public function resolveConflict(Request $request, \App\Models\SyncConflict $conflict): JsonResponse
    {
        $this->authorize('sync.conflicts');

        $data = $request->validate(['decision' => ['required', 'in:ship,shore']]);

        $this->sync->resolveConflict($conflict, $data['decision'], $request->user());

        return response()->json(['ok' => true]);
    }
}
