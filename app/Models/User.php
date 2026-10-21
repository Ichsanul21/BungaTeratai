<?php

namespace App\Models;

use App\Enums\RoleSlug;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

#[Fillable(['name', 'email', 'password'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    protected $guarded = [];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class);
    }

    public function hasRole(string $slug): bool
    {
        return $this->roles->contains('slug', $slug);
    }

    public function hasAnyRole(array $slugs): bool
    {
        foreach ($slugs as $slug) {
            if ($this->hasRole($slug)) {
                return true;
            }
        }

        return false;
    }

    public function isSuperAdmin(): bool
    {
        return $this->hasRole(RoleSlug::SuperAdmin->value);
    }

    public function isReadOnly(): bool
    {
        return $this->hasRole(RoleSlug::Auditor->value)
            && ! $this->hasAnyRole([
                RoleSlug::SuperAdmin->value,
                RoleSlug::Management->value,
                RoleSlug::ShipOps->value,
                RoleSlug::DocController->value,
                RoleSlug::Supervisor->value,
                RoleSlug::Finance->value,
            ]);
    }
}
