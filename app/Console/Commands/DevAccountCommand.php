<?php

namespace App\Console\Commands;

use App\Enums\RoleSlug;
use App\Models\Role;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

/**
 * Membuat / merotasi akun developer internal (Alenkosa).
 *
 * Sandi TIDAK pernah disimpan di repo atau seeder — hanya ditentukan di sini.
 * Akun tetap tidak bisa dipakai selama DEV_MODE=false.
 */
class DevAccountCommand extends Command
{
    protected $signature = 'dev:account
        {--email= : Email akun developer (default: DEV_EMAIL)}
        {--password= : Sandi baru (kosong = dibuat acak)}
        {--name= : Nama tampilan (default: DEV_NAME)}
        {--rotate : Ganti sandi akun yang sudah ada}';

    protected $description = 'Buat atau rotasi akun developer (akses penuh, jejak terpisah dari audit klien)';

    public function handle(): int
    {
        $email = (string) ($this->option('email') ?: config('dev.email'));
        $name = (string) ($this->option('name') ?: config('dev.name', 'Developer'));
        $password = $this->option('password');
        $rotate = (bool) $this->option('rotate');

        if ($email === '' || ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->error('Email tidak valid. Isi --email atau DEV_EMAIL di .env.');

            return self::FAILURE;
        }

        $role = Role::firstOrCreate(
            ['slug' => RoleSlug::Developer->value],
            ['name' => 'Developer'],
        );

        $user = User::where('email', $email)->first();
        $generated = false;

        if ($user === null) {
            $password = $password ?: Str::random(16);
            $generated = ! $this->option('password');

            $user = User::create([
                'name' => $name,
                'email' => $email,
                'password' => $password,
                'email_verified_at' => now(),
            ]);

            $this->info("Akun developer dibuat: {$email}");
        } elseif ($rotate || $password) {
            $password = $password ?: Str::random(16);
            $generated = ! $this->option('password');

            $user->update([
                'name' => $name,
                'password' => $password,
            ]);

            $this->info("Sandi akun developer diperbarui: {$email}");
        } else {
            $this->info("Akun developer sudah ada: {$email} (pakai --rotate untuk ganti sandi)");
        }

        if (! $user->roles->contains('id', $role->id)) {
            $user->roles()->syncWithoutDetaching([$role->id]);
        }

        if ($generated && $password) {
            $this->newLine();
            $this->warn('Sandi sementara (catat sekarang, tidak ditampilkan lagi):');
            $this->line('  '.$password);
            $this->newLine();
        }

        $this->line('DEV_MODE saat ini: '.(config('dev.enabled') ? 'AKTIF' : 'NONAKTIF'));
        $this->line('Panel: /developer');

        return self::SUCCESS;
    }
}
