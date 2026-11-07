<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Jejak aktivitas akun developer — TERPISAH dari audit_logs milik klien.
 *
 * Alasan: akun developer memegang seluruh izin (termasuk melihat data
 * sensitif) dan sengaja tidak mengotori Jejak Audit operasional. Jejaknya
 * tetap ada di sini (append-only) supaya penyalahgunaan masih bisa ditelusuri.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dev_activity_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action', 64);
            $table->string('entity_type', 64)->nullable();
            $table->string('entity_id', 64)->nullable();
            $table->json('before')->nullable();
            $table->json('after')->nullable();
            $table->string('summary', 500)->nullable();
            $table->string('reason', 500)->nullable();
            $table->string('ip_address', 64)->nullable();
            $table->string('device', 120)->nullable();
            $table->string('session_id', 191)->nullable();
            $table->foreignId('impersonated_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('timestamp')->nullable()->index();
            $table->index(['entity_type', 'entity_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dev_activity_logs');
    }
};
