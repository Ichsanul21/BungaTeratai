<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use App\Services\ReminderService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class NotificationController extends Controller
{
    public function index(Request $request): Response
    {
        $filter = $request->string('filter')->toString() ?: 'semua';

        $query = Notification::where('recipient_id', auth()->id())->orderByDesc('created_at');

        if ($filter === 'unread') {
            $query->where('read_status', false);
        } elseif ($filter === 'reminder') {
            $query->whereIn('notification_type', [
                'dokumen_mendekati_kedaluwarsa',
                'dokumen_kedaluwarsa',
                'endorsement_jatuh_tempo',
                'endorsement_kedaluwarsa',
            ]);
        } elseif ($filter === 'workflow') {
            $query->whereNotIn('notification_type', [
                'dokumen_mendekati_kedaluwarsa',
                'dokumen_kedaluwarsa',
            ]);
        }

        $reminder = app(ReminderService::class);

        return Inertia::render('Notifications/Index', [
            'notifications' => $query->limit(100)->get()->map(fn ($n) => [
                'id' => $n->id,
                'notification_type' => $n->notification_type,
                'title' => $n->title,
                'message' => $n->message,
                'reference_type' => $n->reference_type,
                'reference_id' => $n->reference_id,
                'read_status' => $n->read_status,
                'created_at' => $n->created_at,
                'link' => match ($n->reference_type) {
                    'document' => '/dokumen/'.$n->reference_id,
                    'crew_certificate' => '/sdm',
                    'voyage' => '/perjalanan/'.$n->reference_id,
                    default => null,
                },
            ]),
            'filter' => $filter,
            'counts' => [
                'semua' => Notification::where('recipient_id', auth()->id())->count(),
                'unread' => Notification::where('recipient_id', auth()->id())->where('read_status', false)->count(),
                'reminder' => Notification::where('recipient_id', auth()->id())
                    ->whereIn('notification_type', ['dokumen_mendekati_kedaluwarsa', 'dokumen_kedaluwarsa', 'endorsement_jatuh_tempo', 'endorsement_kedaluwarsa'])
                    ->count(),
            ],
            'due' => $reminder->dueDocuments()->concat($reminder->dueEndorsements())->sortBy('days')->take(15)->values(),
        ]);
    }

    public function markRead(Request $request, Notification $notification)
    {
        abort_unless($notification->recipient_id === auth()->id(), 403);

        $notification->update(['read_status' => true]);

        return back()->with('success', 'Notifikasi ditandai sudah dibaca.');
    }

    public function markAllRead(): void
    {
        Notification::where('recipient_id', auth()->id())
            ->where('read_status', false)
            ->update(['read_status' => true]);
    }

    public function markAllReadResponse()
    {
        $this->markAllRead();

        return back()->with('success', 'Semua notifikasi ditandai sudah dibaca.');
    }

    public function destroy(Notification $notification)
    {
        abort_unless($notification->recipient_id === auth()->id(), 403);
        $notification->delete();

        return back()->with('success', 'Notifikasi dihapus.');
    }

    public function deleteRead()
    {
        Notification::where('recipient_id', auth()->id())
            ->where('read_status', true)
            ->delete();

        return back()->with('success', 'Notifikasi yang sudah dibaca dihapus.');
    }
}
