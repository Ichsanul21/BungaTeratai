<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Facades\Cache;

class Role extends Model
{
    protected $guarded = [];

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class);
    }

    public function permissions(): BelongsToMany
    {
        return $this->belongsToMany(Permission::class, 'role_permission');
    }

    /** @return list<string> Kode izin role ini (cached per role, 10 menit). */
    public function permissionCodes(): array
    {
        return Cache::remember(
            "role-permissions.{$this->id}",
            now()->addMinutes(10),
            fn () => $this->permissions()->pluck('code')->all()
        );
    }

    /** @param  list<string>  $codes */
    public function syncPermissionCodes(array $codes): void
    {
        $ids = Permission::whereIn('code', $codes)->pluck('id');
        $this->permissions()->sync($ids);
        Cache::forget("role-permissions.{$this->id}");
    }
}
