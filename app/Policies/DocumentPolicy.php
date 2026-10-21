<?php

namespace App\Policies;

use App\Models\Document;
use App\Models\User;

class DocumentPolicy
{
    public function before(User $user): ?bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        return null;
    }

    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Document $document): bool
    {
        return true;
    }

    public function create(User $user): bool
    {
        return $user->hasAnyRole(['doc_controller', 'ship_ops']);
    }

    public function update(User $user, Document $document): bool
    {
        if ($user->isReadOnly()) {
            return false;
        }

        return $user->hasAnyRole(['doc_controller', 'ship_ops']);
    }

    /** Kirim untuk pemeriksaan. */
    public function submit(User $user, Document $document): bool
    {
        return ! $user->isReadOnly() && $user->hasAnyRole(['doc_controller', 'ship_ops']);
    }

    /** Approve / minta revisi / tolak — Supervisor. */
    public function verify(User $user, Document $document): bool
    {
        if ($user->isReadOnly()) {
            return false;
        }

        return $user->hasAnyRole(['supervisor', 'management']);
    }

    public function download(User $user, Document $document): bool
    {
        return true;
    }

    public function delete(User $user, Document $document): bool
    {
        return false; // arsip/soft delete saja
    }
}
