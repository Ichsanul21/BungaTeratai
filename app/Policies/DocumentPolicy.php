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
        $perm = $user->checkPermission('documents.upload');
        if ($perm !== null) {
            return $perm;
        }

        return $user->hasAnyRole(['doc_controller', 'ship_ops']);
    }

    public function update(User $user, Document $document): bool
    {
        $perm = $user->checkPermission('documents.update');
        if ($perm !== null) {
            if ($perm === false) {
                return false;
            }
        }

        if ($user->isReadOnly()) {
            return false;
        }

        return $perm ?? $user->hasAnyRole(['doc_controller', 'ship_ops']);
    }

    /** Kirim untuk pemeriksaan. */
    public function submit(User $user, Document $document): bool
    {
        $perm = $user->checkPermission('documents.submit');
        if ($perm !== null) {
            return $perm && ! $user->isReadOnly();
        }

        return ! $user->isReadOnly() && $user->hasAnyRole(['doc_controller', 'ship_ops']);
    }

    /** Approve / minta revisi / tolak — Supervisor. */
    public function verify(User $user, Document $document): bool
    {
        $perm = $user->checkPermission('documents.verify');
        if ($perm !== null) {
            return $perm && ! $user->isReadOnly();
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
