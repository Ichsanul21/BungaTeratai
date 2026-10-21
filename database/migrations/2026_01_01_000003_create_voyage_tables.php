<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('voyages', function (Blueprint $table) {
            $table->id();
            $table->string('voyage_code')->unique();       // auto, mis. VYG-2026-0001
            $table->foreignId('vessel_id')->constrained()->restrictOnDelete();
            $table->string('route_type')->default('laut'); // laut|sungai|kombinasi
            $table->string('origin');
            $table->string('destination');
            $table->timestamp('planned_departure')->nullable();
            $table->timestamp('estimated_arrival')->nullable();
            $table->timestamp('actual_departure')->nullable();
            $table->timestamp('actual_arrival')->nullable();
            $table->string('voyage_status')->default('draft'); // 13 status
            $table->string('activity_type')->nullable();       // towing|sewa_tongkang|penumpang|assist|...
            $table->string('person_in_charge')->nullable();
            $table->foreignId('customer_id')->nullable()->index();
            $table->string('contract_no')->nullable();
            $table->string('external_approval_status')->default('tidak_diperlukan'); // menunggu|terkonfirmasi|tidak_diperlukan
            $table->string('external_approval_evidence')->nullable();
            $table->text('notes')->nullable();
            // data penumpang
            $table->unsignedSmallInteger('capacity')->nullable();
            $table->unsignedSmallInteger('tickets_sold')->nullable();
            $table->unsignedSmallInteger('boarded')->nullable();
            $table->unsignedSmallInteger('landed')->nullable();
            $table->unsignedSmallInteger('cancelled')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('vessel_relationships', function (Blueprint $table) {
            $table->id();
            $table->foreignId('voyage_id')->constrained()->cascadeOnDelete();
            $table->foreignId('tugboat_id')->constrained('vessels')->cascadeOnDelete();
            $table->foreignId('barge_id')->constrained('vessels')->cascadeOnDelete();
            $table->timestamps();
        });

        Schema::create('document_voyage_links', function (Blueprint $table) {
            $table->id();
            $table->foreignId('document_id')->constrained()->cascadeOnDelete();
            $table->foreignId('voyage_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['document_id', 'voyage_id']);
        });

        Schema::create('voyage_cargo', function (Blueprint $table) {
            $table->id();
            $table->foreignId('voyage_id')->constrained()->cascadeOnDelete();
            $table->string('commodity_type');       // batu_bara|semen|sawit|cpo|curah_lain|lainnya
            $table->decimal('weight_ton', 14, 2)->nullable();
            $table->decimal('volume', 14, 2)->nullable();
            $table->string('origin')->nullable();
            $table->string('destination')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('voyage_checklists', function (Blueprint $table) {
            $table->id();
            $table->foreignId('voyage_id')->constrained()->cascadeOnDelete();
            $table->foreignId('requirement_id')->constrained('document_requirements')->restrictOnDelete();
            $table->string('applicability');            // wajib|kondisional|menunggu_konfirmasi
            $table->string('completion_status')->default('belum'); // terpenuhi|belum|tidak_berlaku
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('verified_by')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedBigInteger('evidence_document_id')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('voyage_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('voyage_id')->constrained()->cascadeOnDelete();
            $table->string('event_type');          // created|uploaded|revision|verified|...
            $table->timestamp('occurred_at');
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('source')->default('user'); // user|system
            $table->string('description');
            $table->json('payload')->nullable();
            $table->timestamps();
        });

        Schema::create('voyage_safety_checks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('voyage_id')->constrained()->cascadeOnDelete();
            $table->timestamp('checked_at');
            $table->json('checklist');
            $table->unsignedSmallInteger('capacity')->nullable();
            $table->unsignedSmallInteger('passenger_count')->nullable();
            $table->string('status');              // lulus|tidak
            $table->foreignId('checked_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('voyage_safety_checks');
        Schema::dropIfExists('voyage_events');
        Schema::dropIfExists('voyage_checklists');
        Schema::dropIfExists('voyage_cargo');
        Schema::dropIfExists('document_voyage_links');
        Schema::dropIfExists('vessel_relationships');
        Schema::dropIfExists('voyages');
    }
};
