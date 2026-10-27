<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Perangkat terdaftar (laptop kantor / HP/tablet kapal). Akses bisa dicabut.
        Schema::create('devices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('vessel_id')->nullable()->constrained('vessels')->nullOnDelete();
            $table->string('device_id', 64)->unique();   // UUID yang dihasilkan klien (IndexedDB)
            $table->string('device_name')->nullable();
            $table->string('platform', 40)->nullable();  // desktop|mobile|tablet
            $table->boolean('is_ship')->default(false);  // perangkat kapal (store-and-forward)
            $table->timestamp('last_seen_at')->nullable();
            $table->timestamp('last_sync_at')->nullable();
            $table->timestamp('revoked_at')->nullable();
            $table->timestamps();
        });

        // Satu batch push/pull — jejak audit per jendela sinkron (standar ISM/PSC).
        Schema::create('sync_batches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('device_id')->constrained('devices')->restrictOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('direction', 10);            // push|pull
            $table->unsignedInteger('record_count')->default(0);
            $table->unsignedInteger('accepted')->default(0);
            $table->unsignedInteger('conflicted')->default(0);
            $table->unsignedInteger('rejected')->default(0);
            $table->unsignedInteger('bytes')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('finished_at')->nullable();
            $table->timestamps();
        });

        // Idempotency: tautan satelit suka putus di tengah upload; replay harus aman
        // (tidak menggandakan invoice/nomor). Key unik per mutasi offline klien.
        Schema::create('sync_receipts', function (Blueprint $table) {
            $table->id();
            $table->string('idempotency_key', 64)->unique();
            $table->foreignId('device_id')->constrained('devices')->restrictOnDelete();
            $table->string('entity_type', 40)->index();  // voyage_progress|dsr|fuel_log|...
            $table->string('entity_id', 40)->nullable(); // UUID offline atau ID server
            $table->string('action', 16);                // create|update|delete
            $table->string('result', 16);                // accepted|conflict|rejected
            $table->unsignedBigInteger('server_entity_id')->nullable();
            $table->json('detail')->nullable();          // nomor resmi, alasan tolak, field konflik
            $table->timestamp('server_applied_at')->nullable();
            $table->timestamps();
        });

        // Konflik dua arah: JANGAN timpa diam-diam — antre review dengan provenance.
        Schema::create('sync_conflicts', function (Blueprint $table) {
            $table->id();
            $table->string('entity_type', 40)->index();
            $table->unsignedBigInteger('entity_id')->index();
            $table->string('field', 60);
            $table->text('ship_value')->nullable();
            $table->text('shore_value')->nullable();
            $table->foreignId('device_id')->nullable()->constrained('devices')->nullOnDelete();
            $table->timestamp('ship_occurred_at')->nullable();
            $table->string('policy', 30)->default('review'); // shore_wins|ship_wins|review
            $table->string('status', 20)->default('open')->index(); // open|resolved
            $table->foreignId('resolved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('resolved_at')->nullable();
            $table->text('resolution_note')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sync_conflicts');
        Schema::dropIfExists('sync_receipts');
        Schema::dropIfExists('sync_batches');
        Schema::dropIfExists('devices');
    }
};
