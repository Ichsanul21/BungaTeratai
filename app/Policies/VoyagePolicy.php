<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Voyage;

class VoyagePolicy
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

    public function view(User $user, Voyage $voyage): bool
    {
        return true;
    }

    public function create(User $user): bool
    {
        $perm = $user->checkPermission('voyages.create');
        if ($perm !== null) {
            return $perm;
        }

        return $user->hasAnyRole(['ship_ops', 'management']);
    }

    public function update(User $user, Voyage $voyage): bool
    {
        $perm = $user->checkPermission('voyages.update');
        if ($perm !== null) {
            if ($perm === false) {
                return false;
            }
        }

        if ($user->isReadOnly()) {
            return false;
        }

        return $perm ?? $user->hasAnyRole(['ship_ops', 'management']);
    }

    /** Persetujuan internal / konfirmasi eksternal. */
    public function approve(User $user, Voyage $voyage): bool
    {
        $perm = $user->checkPermission('voyages.approve');
        if ($perm !== null) {
            return $perm && ! $user->isReadOnly();
        }

        return $user->hasAnyRole(['supervisor', 'management']);
    }
}
