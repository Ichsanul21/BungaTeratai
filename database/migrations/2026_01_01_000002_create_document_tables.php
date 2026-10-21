<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('documents', function (Blueprint $table) {
            $table->id();
            $table->string('document_name');
            $table->foreignId('category_id')->constrained('document_categories')->restrictOnDelete();
            $table->string('document_number')->nullable();
            $table->string('owner_type')->default('company'); // company|vessel|crew
            $table->unsignedBigInteger('owner_id')->nullable()->index();
            $table->date('issue_date')->nullable();
            $table->boolean('has_expiry')->default(true);
            $table->date('expiry_date')->nullable();          // hanya diisi bila has_expiry = true
            $table->unsignedSmallInteger('reminder_days_override')->nullable();
            $table->string('verification_status')->default('draft'); // 8 status verifikasi
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('responsible_person')->nullable();
            $table->string('archive_location')->nullable();
            $table->string('file_path')->nullable();          // versi aktif (snapshot)
            $table->foreignId('current_version_id')->nullable();
            $table->text('notes')->nullable();
            $table->boolean('is_archived')->default(false);
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('document_versions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('document_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('version_number');
            $table->string('file_path');
            $table->string('file_mime')->nullable();
            $table->unsignedInteger('file_size')->nullable();
            $table->timestamp('uploaded_at');
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('revision_notes')->nullable();
            $table->timestamps();
            $table->unique(['document_id', 'version_number']);
        });

        Schema::create('document_requirements', function (Blueprint $table) {
            $table->id();
            $table->string('code', 40)->unique();
            $table->string('name');
            $table->string('group_code', 5)->index();     // kelompok A-F
            $table->string('applies_to')->default('vessel'); // vessel|voyage
            $table->json('applicability')->nullable();      // {vessel_types:[], navigation_types:[], cargo_types:[]}
            $table->string('regulatory_reference')->nullable();
            $table->boolean('is_conditional')->default(false);
            $table->unsignedSmallInteger('sort')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('document_requirements');
        Schema::dropIfExists('document_versions');
        Schema::dropIfExists('documents');
    }
};
