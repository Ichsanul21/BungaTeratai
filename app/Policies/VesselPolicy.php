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
        $perm = $user->checkPermission('fleet.create');
        if ($perm !== null) {
            return $perm; // terkelola RBAC: katalog izin yang menentukan
        }

        return $user->hasAnyRole(['ship_ops', 'management']);
    }

    public function update(User $user, Vessel $vessel): bool
    {
        $perm = $user->checkPermission('fleet.update');
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

    public function delete(User $user, Vessel $vessel): bool
    {
        return false; // data penting: arsip, bukan hard delete
    }
}
