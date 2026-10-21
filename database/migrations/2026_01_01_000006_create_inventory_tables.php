<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inventory_items', function (Blueprint $table) {
            $table->id();
            $table->string('sku')->unique();
            $table->string('name');
            $table->string('category')->default('sparepart'); // sparepart|habis_pakai|konsumsi|ppe
            $table->string('unit')->default('pcs');
            $table->decimal('unit_price', 15, 2)->default(0);
            $table->boolean('is_consumable')->default(false);
            $table->boolean('is_perishable')->default(false);
            $table->decimal('min_stock', 12, 2)->default(0);
            $table->unsignedBigInteger('account_id')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('inventory_balances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('item_id')->constrained('inventory_items')->cascadeOnDelete();
            $table->string('location_type');           // kantor|vessel
            $table->unsignedBigInteger('vessel_id')->nullable()->index();
            $table->decimal('qty', 12, 2)->default(0);
            $table->timestamps();
            $table->unique(['item_id', 'location_type', 'vessel_id']);
        });

        Schema::create('inventory_batches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('item_id')->constrained('inventory_items')->cascadeOnDelete();
            $table->string('location_type');
            $table->unsignedBigInteger('vessel_id')->nullable()->index();
            $table->string('batch_no');
            $table->decimal('qty', 12, 2)->default(0);
            $table->date('expires_at')->nullable();
            $table->timestamps();
        });

        Schema::create('inventory_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('item_id')->constrained('inventory_items')->restrictOnDelete();
            $table->string('type');                    // masuk|keluar|transfer|penyesuaian
            $table->decimal('qty', 12, 2);
            $table->unsignedBigInteger('batch_id')->nullable();
            $table->string('from_location')->nullable();
            $table->string('to_location')->nullable();
            $table->string('ref_type')->nullable();    // service|voyage|manual
            $table->unsignedBigInteger('ref_id')->nullable();
            $table->date('movement_date');
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inventory_movements');
        Schema::dropIfExists('inventory_batches');
        Schema::dropIfExists('inventory_balances');
        Schema::dropIfExists('inventory_items');
    }
};
