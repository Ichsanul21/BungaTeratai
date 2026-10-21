<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vessels', function (Blueprint $table) {
            $table->id();
            $table->string('vessel_name');
            $table->string('vessel_type')->index();          // tugboat|tongkang|kapal_penumpang|lainnya
            $table->string('navigation_type')->index();      // laut|sungai_danau|penyeberangan
            $table->string('registration_number')->nullable();
            $table->string('imo')->nullable();
            $table->string('mmsi')->nullable();
            $table->string('call_sign')->nullable();
            $table->unsignedSmallInteger('year_built')->nullable();
            $table->decimal('length_m', 8, 2)->nullable();
            $table->decimal('beam_m', 8, 2)->nullable();
            $table->unsignedInteger('gt')->nullable();
            $table->unsignedInteger('dwt')->nullable();
            $table->decimal('capacity_value', 12, 2)->nullable(); // ton / penumpang
            $table->string('capacity_unit')->nullable();          // ton|penumpang
            $table->string('engine_spec')->nullable();
            $table->string('fuel_spec')->nullable();
            $table->decimal('fuel_baseline_lph', 10, 2)->nullable(); // liter/jam untuk analisis BBM
            $table->string('owner')->nullable();
            $table->string('operator')->nullable();
            $table->string('operational_status')->default('aktif'); // aktif|dalam_perbaikan|dock|mangkrak
            $table->string('base_location')->nullable();
            $table->decimal('doc_completeness', 5, 2)->nullable();   // cache persen
            $table->decimal('last_lat', 10, 7)->nullable();
            $table->decimal('last_lng', 10, 7)->nullable();
            $table->timestamp('last_position_at')->nullable();
            $table->string('photo_path')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('vessel_positions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('vessel_id')->constrained()->cascadeOnDelete();
            $table->decimal('lat', 10, 7);
            $table->decimal('lng', 10, 7);
            $table->decimal('speed_knots', 6, 2)->nullable();
            $table->unsignedSmallInteger('heading')->nullable();
            $table->timestamp('recorded_at');
            $table->string('source')->default('manual'); // AIS-sim|manual
            $table->timestamps();
        });

        Schema::create('vessel_conditions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('vessel_id')->constrained()->cascadeOnDelete();
            $table->timestamp('checked_at');
            $table->json('checklist');               // {mesin:navigasi:keselamatan:dek:...}
            $table->unsignedTinyInteger('score');     // 0-100
            $table->text('notes')->nullable();
            $table->foreignId('checked_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('services', function (Blueprint $table) {
            $table->id();
            $table->foreignId('vessel_id')->constrained()->cascadeOnDelete();
            $table->string('type');                   // rutin|urgent|drydock|pemeriksaan
            $table->string('title');
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->string('workshop')->nullable();
            $table->decimal('cost', 15, 2)->default(0);
            $table->string('status')->default('rencana'); // rencana|proses|selesai
            $table->unsignedBigInteger('voyage_id')->nullable()->index(); // FK voyages (migrasi berikutnya)
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('service_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('service_id')->constrained()->cascadeOnDelete();
            $table->unsignedBigInteger('item_id')->index(); // FK ke inventory_items (migrasi berikutnya)
            $table->decimal('qty', 12, 2);
            $table->timestamps();
        });

        Schema::create('fuel_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('vessel_id')->constrained()->cascadeOnDelete();
            $table->unsignedBigInteger('voyage_id')->nullable()->index(); // FK voyages (migrasi berikutnya)
            $table->date('trip_date');
            $table->string('route');
            $table->string('cargo_type')->nullable();
            $table->decimal('duration_hours', 8, 2);
            $table->decimal('distance_nm', 10, 2)->nullable();
            $table->decimal('liters', 12, 2);
            $table->decimal('cost', 15, 2)->default(0);
            $table->decimal('baseline_lph_snapshot', 10, 2)->nullable();
            $table->string('analysis_status');        // normal|waspada|tidak_normal
            $table->decimal('analysis_diff_pct', 7, 2);
            $table->text('explanation_note')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fuel_logs');
        Schema::dropIfExists('service_items');
        Schema::dropIfExists('services');
        Schema::dropIfExists('vessel_conditions');
        Schema::dropIfExists('vessel_positions');
        Schema::dropIfExists('vessels');
    }
};
