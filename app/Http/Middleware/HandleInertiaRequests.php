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
                ] : null,
            ],
            'unreadNotifications' => $user
                ? Notification::where('recipient_id', $user->id)
                    ->where('read_status', false)
                    ->count()
                : 0,
            'flash' => [
                'success' => session('success'),
                'error' => session('error'),
            ],
            'demoLabel' => 'DEMO DATA',
        ];
    }
}
