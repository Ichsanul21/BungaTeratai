<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Vessel;

class VesselPolicy
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

    public function view(User $user, Vessel $vessel): bool
    {
        return true;
    }

    public function create(User $user): bool
    {
        return $user->hasAnyRole(['ship_ops', 'management']);
    }

    public function update(User $user, Vessel $vessel): bool
    {
        if ($user->isReadOnly()) {
            return false;
        }

        return $user->hasAnyRole(['ship_ops', 'management']);
    }

    public function delete(User $user, Vessel $vessel): bool
    {
        return false; // data penting: arsip, bukan hard delete
    }
}
