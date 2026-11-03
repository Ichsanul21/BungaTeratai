<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ais_external_vessels', function (Blueprint $table) {
            $table->id();
            $table->string('mmsi', 9)->unique();
            $table->string('imo', 7)->nullable();
            $table->string('vessel_name', 255);
            $table->string('call_sign', 10)->nullable();
            $table->string('vessel_type', 100)->nullable();
            $table->integer('vessel_type_code')->nullable();
            $table->decimal('latitude', 10, 7);
            $table->decimal('longitude', 10, 7);
            $table->decimal('speed', 5, 2)->nullable();
            $table->decimal('course', 5, 2)->nullable();
            $table->integer('heading')->nullable();
            $table->decimal('draught', 5, 2)->nullable();
            $table->string('destination', 255)->nullable();
            $table->string('eta', 50)->nullable();
            $table->timestamp('last_seen_at');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ais_external_vessels');
    }
};
