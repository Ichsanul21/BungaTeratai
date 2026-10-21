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
        return $user->hasAnyRole(['ship_ops', 'management']);
    }

    public function update(User $user, Voyage $voyage): bool
    {
        if ($user->isReadOnly()) {
            return false;
        }

        return $user->hasAnyRole(['ship_ops', 'management']);
    }

    /** Persetujuan internal / konfirmasi eksternal. */
    public function approve(User $user, Voyage $voyage): bool
    {
        if ($user->isReadOnly()) {
            return false;
        }

        return $user->hasAnyRole(['supervisor', 'management']);
    }
}
