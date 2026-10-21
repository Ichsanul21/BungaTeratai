<?php

namespace App\Http\Controllers;

use App\Models\Approval;
use App\Models\Document;
use App\Models\Voyage;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ApprovalsController extends Controller
{
    public function index(Request $request): Response
    {
        $tab = $request->string('tab')->toString() ?: 'pending';
        $user = auth()->user();

        $query = Approval::with(['approver', 'approvable'])
            ->orderByDesc('decision_timestamp')
            ->orderByDesc('id');

        $baseQuery = fn () => match ($tab) {
            'pending' => Approval::query()
                ->where('approval_status', 'pending')
                ->orWhere(function ($q) {
                    // "menunggu pemeriksaan" = dokumen under_review & voyage internal_review tanpa keputusan
                    $q->where('approvable_type', 'document')->where('approval_status', 'pending');
                }),
            'approved' => clone $query->where('approval_status', 'approved'),
            'revision' => clone $query->where('approval_status', 'revision_required'),
            default => clone $query,
        };

        // Pending = dokumen under_review + voyage internal_review (belum ada approval approved)
        $pendingDocuments = Document::where('verification_status', 'under_review')
            ->with('category')
            ->latest()
            ->limit(50)
            ->get()
            ->map(fn ($d) => [
                'type' => 'document',
                'id' => $d->id,
                'code' => $d->document_number,
                'name' => $d->document_name,
                'owner' => $d->ownerName(),
                'status' => 'Menunggu Pemeriksaan',
                'updated_at' => $d->updated_at,
                'link' => '/dokumen/'.$d->id,
            ]);

        $pendingVoyages = Voyage::where('voyage_status', 'internal_review')
            ->whereDoesntHave('approvals', function ($q) {
                $q->where('approval_scope', 'internal')->where('approval_status', 'approved');
            })
            ->with('vessel')
            ->latest('updated_at')
            ->limit(50)
            ->get()
            ->map(fn ($v) => [
                'type' => 'voyage',
                'id' => $v->id,
                'code' => $v->voyage_code,
                'name' => $v->origin.' → '.$v->destination,
                'owner' => $v->vessel?->vessel_name,
                'status' => 'Pemeriksaan Internal',
                'updated_at' => $v->updated_at,
                'link' => '/perjalanan/'.$v->id,
            ]);

        $history = $tab === 'pending'
            ? collect()
            : ($baseQuery()->limit(50)->get())->map(fn ($a) => [
                'type' => $a->approvable_type,
                'id' => $a->approvable_id,
                'name' => $a->approvable_type === 'voyage'
                    ? (Voyage::find($a->approvable_id)?->voyage_code ?? 'Perjalanan')
                    : (Document::find($a->approvable_id)?->document_name ?? 'Dokumen'),
                'scope' => $a->approval_scope,
                'status' => $a->approval_status,
                'approver' => $a->approver?->name,
                'comments' => $a->comments,
                'decision_timestamp' => $a->decision_timestamp,
                'link' => $a->approvable_type === 'voyage'
                    ? '/perjalanan/'.$a->approvable_id
                    : '/dokumen/'.$a->approvable_id,
            ]);

        return Inertia::render('Approvals/Index', [
            'tab' => $tab,
            'pending' => $tab === 'pending'
                ? $pendingVoyages->concat($pendingDocuments)->values()
                : collect(),
            'history' => $history,
            'counts' => [
                'pending' => $pendingVoyages->count() + $pendingDocuments->count(),
                'approved' => Approval::where('approval_status', 'approved')->count(),
                'revision' => Approval::where('approval_status', 'revision_required')->count(),
            ],
            'canApprove' => $user?->hasAnyRole(['super_admin', 'supervisor', 'management']) ?? false,
        ]);
    }
}
