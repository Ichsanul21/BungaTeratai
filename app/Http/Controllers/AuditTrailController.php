<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AuditTrailController extends Controller
{
    public function index(Request $request): Response
    {
        $this->authorize('menu.audit');

        $query = AuditLog::with('user')->orderByDesc('timestamp')->orderByDesc('id');

        if ($userId = $request->integer('user_id')) {
            $query->where('user_id', $userId);
        }
        if ($action = $request->string('action')->toString()) {
            $query->where('action', $action);
        }
        if ($entity = $request->string('entity')->toString()) {
            $query->where('entity_type', $entity);
        }
        if ($from = $request->string('from')->toString()) {
            $query->whereDate('timestamp', '>=', $from);
        }
        if ($to = $request->string('to')->toString()) {
            $query->whereDate('timestamp', '<=', $to);
        }
        if ($search = $request->string('search')->toString()) {
            $query->where(fn ($q) => $q
                ->where('change_summary', 'like', "%{$search}%")
                ->orWhere('entity_type', 'like', "%{$search}%"));
        }

        return Inertia::render('AuditTrail/Index', [
            'logs' => $query->paginate(30)->withQueryString()->through(fn ($a) => [
                'id' => $a->id,
                'user_name' => $a->user?->name ?? 'Sistem',
                'action' => $a->action,
                'entity_type' => $a->entity_type,
                'entity_id' => $a->entity_id,
                'change_summary' => $a->change_summary,
                'reason' => $a->reason,
                'before' => $a->before,
                'after' => $a->after,
                'ip_address' => $a->ip_address,
                'timestamp' => $a->timestamp,
            ]),
            'filters' => $request->only(['user_id', 'action', 'entity', 'from', 'to', 'search']),
            'users' => User::orderBy('name')->get(['id', 'name']),
            'actions' => AuditLog::selectRaw('DISTINCT action')->orderBy('action')->pluck('action'),
            'entities' => AuditLog::selectRaw('DISTINCT entity_type')->orderBy('entity_type')->pluck('entity_type'),
        ]);
    }
}
