<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('crews', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('nik')->nullable();
            $table->string('birth_place')->nullable();
            $table->date('birth_date')->nullable();
            $table->string('gender')->nullable();
            $table->text('address')->nullable();
            $table->string('phone')->nullable();
            $table->string('npwp')->nullable();
            $table->string('rank');                    // nakhoda|chief_engineer|mualim|mualim_2|mudi|kelasi|oiler|juru_masak|abk
            $table->decimal('base_salary', 15, 2)->default(0);
            $table->string('status')->default('aktif'); // aktif|cuti|selesai
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('crew_certificates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('crew_id')->constrained('crews')->cascadeOnDelete();
            $table->string('cert_type');               // SKK|medical_fitness|BST|ROC|CDC|passport|lainnya
            $table->string('number')->nullable();
            $table->date('issued_at')->nullable();
            $table->boolean('has_expiry')->default(true);
            $table->date('expiry_date')->nullable();
            $table->string('file_path')->nullable();
            $table->timestamps();
        });

        Schema::create('crew_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('crew_id')->constrained('crews')->cascadeOnDelete();
            $table->foreignId('vessel_id')->constrained('vessels')->cascadeOnDelete();
            $table->string('role');                    // jabatan pelayaran di kapal
            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->string('status')->default('aktif'); // aktif|cuti|berakhir
            $table->timestamps();
        });

        Schema::create('office_employees', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('nik')->nullable();
            $table->string('npwp')->nullable();
            $table->string('position');
            $table->string('department')->nullable();
            $table->date('join_date')->nullable();
            $table->string('status')->default('aktif'); // aktif|keluar
            $table->decimal('base_salary', 15, 2)->default(0);
            $table->decimal('allowances', 15, 2)->default(0);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('office_employees');
        Schema::dropIfExists('crew_assignments');
        Schema::dropIfExists('crew_certificates');
        Schema::dropIfExists('crews');
    }
};
