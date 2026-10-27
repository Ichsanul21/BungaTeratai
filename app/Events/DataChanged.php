<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Pemberitahuan "ada perubahan data di server" ke semua perangkat aktif.
 * Payload sengaja minimal — penerima MENARIK delta sendiri lewat pull
 * (/api/sync/pull), sehingga otoritas & konsistensi tetap dihitung server.
 *
 * ShouldBroadcastNow (tanpa antrean): beban kecil (10-30 user) & VPS tidak
 * wajib menjalankan queue worker hanya untuk realtime.
 */
class DataChanged implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public string $kind,
        public ?int $userId = null,
    ) {}

    /**
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        $channels = [];

        if ($this->userId !== null) {
            $channels[] = new \Illuminate\Broadcasting\PrivateChannel("user.{$this->userId}");
        }

        foreach (\App\Models\Role::pluck('slug') as $slug) {
            $channels[] = new \Illuminate\Broadcasting\PrivateChannel("role.{$slug}");
        }

        return $channels;
    }

    public function broadcastAs(): string
    {
        return 'data-changed';
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'kind' => $this->kind,
            'at' => now()->toIso8601String(),
        ];
    }
}
