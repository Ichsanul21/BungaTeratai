<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Hours of Rest (Jam Istirahat Awak) — MLC 2006 / SOLAS XI/1.
     * Dicatat onboard (offline-friendly), disinkronkan ke kantor, dasar
     * inspeksi PSC & bukti kepatuhan WLR (Work / Length of Rest).
     */
    public function up(): void
    {
        Schema::create('hours_of_rest_logs', function (Blueprint $table) {
            $table->id();
            $table->string('client_uuid', 36)->nullable()->unique(); // idempotensi sinkron offline
            $table->foreignId('crew_id')->constrained('crews')->restrictOnDelete();
            $table->foreignId('voyage_id')->nullable()->constrained('voyages')->nullOnDelete();
            $table->date('log_date');
            $table->json('rest_entries')->nullable();     // [{start:'08:00', end:'12:00'}] WITA
            $table->unsignedInteger('total_rest_minutes')->default(0);
            $table->unsignedInteger('total_work_minutes')->default(0);
            $table->boolean('is_compliant')->default(true);
            $table->json('violations')->nullable();       // kode: rest_min_10h|work_max_14h|rest_min_6h_block
            $table->timestamp('device_occurred_at')->nullable(); // jam kapal (clock-skew ditandai server)
            $table->timestamp('synced_at')->nullable();
            $table->foreignId('device_id')->nullable()->constrained('devices')->nullOnDelete();
            $table->foreignId('entered_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['crew_id', 'log_date']);
            $table->index('log_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hours_of_rest_logs');
    }
};
