<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use App\Services\PermissionCatalog;
use Illuminate\Database\Seeder;

/**
 * Katalog permission + grant default per role (replikasi persis Gate lama).
 * Idempoten: updateOrCreate per kode; grant disinkron ulang tanpa menyentuh
 * Super Admin (selalu bypass via Gate::before).
 */
class RbacPermissionSeeder extends Seeder
{
    public function run(): void
    {
        $sort = 0;
        foreach (PermissionCatalog::all() as $perm) {
            Permission::updateOrCreate(
                ['code' => $perm['code']],
                [
                    'label' => $perm['label'],
                    'module' => $perm['module'],
                    'action' => $perm['action'],
                    'description' => $perm['description'],
                    'sort' => $sort++,
                ]
            );
        }

        $defaults = PermissionCatalog::defaults();
        foreach (Role::where('slug', '!=', 'super_admin')->get() as $role) {
            $role->syncPermissionCodes($defaults[$role->slug] ?? []);
        }

        PermissionCatalog::flushInitCache();
    }
}
