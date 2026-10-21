<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('approvals', function (Blueprint $table) {
            $table->id();
            $table->string('approvable_type');     // voyage|document
            $table->unsignedBigInteger('approvable_id')->index();
            $table->foreignId('approver_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('approval_scope');      // internal|external
            $table->string('approval_status');     // approved|revision_required|rejected
            $table->text('comments')->nullable();
            $table->timestamp('decision_timestamp')->nullable();
            $table->string('evidence_file')->nullable();
            $table->timestamps();
        });

        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('recipient_id')->constrained('users')->cascadeOnDelete();
            $table->string('notification_type');   // 9 tipe spek
            $table->string('title')->nullable();
            $table->text('message');
            $table->string('reference_type')->nullable();
            $table->unsignedBigInteger('reference_id')->nullable();
            $table->boolean('read_status')->default(false);
            $table->timestamp('created_at')->useCurrent();
            $table->index(['recipient_id', 'read_status']);
        });

        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action');              // created|updated|deleted|approved|posted|...
            $table->string('entity_type');
            $table->unsignedBigInteger('entity_id');
            $table->json('before')->nullable();
            $table->json('after')->nullable();
            $table->text('change_summary')->nullable();
            $table->text('reason')->nullable();
            $table->string('reference_type')->nullable();
            $table->unsignedBigInteger('reference_id')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->timestamp('timestamp')->useCurrent();
            $table->index(['entity_type', 'entity_id']);
            $table->index('timestamp');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('notifications');
        Schema::dropIfExists('approvals');
    }
};
