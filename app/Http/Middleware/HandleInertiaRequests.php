<?php

namespace App\Http\Middleware;

use App\Models\Notification;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $user ? [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'roles' => $user->roles()->pluck('slug')->values(),
                    'is_developer' => $user->isDeveloper(),
                ] : null,
            ],
            'impersonating' => $request->session()->has('dev_impersonator_id')
                ? [
                    'name' => $request->session()->get('dev_impersonator_name') ?? 'Developer',
                    'current' => $user?->name,
                ]
                : null,
            'watermark' => \App\Services\WatermarkService::clientPayload($request),
            'features' => \App\Services\Dev\FeatureFlagService::all(),
            'unreadNotifications' => $user
                ? Notification::where('recipient_id', $user->id)
                    ->where('read_status', false)
                    ->count()
                : 0,
            'notifCounts' => $this->notificationCounts($user),
            'flash' => [
                'success' => session('success'),
                'error' => session('error'),
            ],
            'demoLabel' => \App\Services\Dev\FeatureFlagService::enabled('demo_banner') ? 'DEMO DATA' : null,
        ];
    }

    /**
     * Ringkasan notifikasi untuk blok sidebar bawah.
     *
     * @return array{total:int,unread:int,reminder:int,workflow:int}
     */
    private function notificationCounts(?\App\Models\User $user): array
    {
        if (! $user) {
            return ['total' => 0, 'unread' => 0, 'reminder' => 0, 'workflow' => 0];
        }

        $reminderTypes = [
            'dokumen_mendekati_kedaluwarsa',
            'dokumen_kedaluwarsa',
            'endorsement_jatuh_tempo',
            'endorsement_kedaluwarsa',
            'invoice_jatuh_tempo',
            'bill_jatuh_tempo',
        ];

        $base = Notification::where('recipient_id', $user->id);

        return [
            'total' => (clone $base)->count(),
            'unread' => (clone $base)->where('read_status', false)->count(),
            'reminder' => (clone $base)->whereIn('notification_type', $reminderTypes)->count(),
            'workflow' => (clone $base)->whereNotIn('notification_type', $reminderTypes)->count(),
        ];
    }
}
