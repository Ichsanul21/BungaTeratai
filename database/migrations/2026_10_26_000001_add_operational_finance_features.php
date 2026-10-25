<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Invoice tracking per vessel
        Schema::table('invoices', function (Blueprint $table) {
            if (! Schema::hasColumn('invoices', 'vessel_id')) {
                $table->unsignedBigInteger('vessel_id')->nullable()->index()->after('voyage_id');
            }
        });

        // 2. Potongan bank & nominal bersih pembayaran invoice
        Schema::table('payments', function (Blueprint $table) {
            if (! Schema::hasColumn('payments', 'bank_fee')) {
                $table->decimal('bank_fee', 15, 2)->default(0)->after('amount');
            }
            if (! Schema::hasColumn('payments', 'net_amount')) {
                $table->decimal('net_amount', 15, 2)->nullable()->after('bank_fee');
            }
        });

        // 3. Potongan bank & nominal keluar pembayaran bill
        Schema::table('bill_payments', function (Blueprint $table) {
            if (! Schema::hasColumn('bill_payments', 'bank_fee')) {
                $table->decimal('bank_fee', 15, 2)->default(0)->after('amount');
            }
            if (! Schema::hasColumn('bill_payments', 'net_amount')) {
                $table->decimal('net_amount', 15, 2)->nullable()->after('bank_fee');
            }
        });

        // 4. Kas transaksi bruto & potongan
        Schema::table('cash_transactions', function (Blueprint $table) {
            if (! Schema::hasColumn('cash_transactions', 'gross_amount')) {
                $table->decimal('gross_amount', 15, 2)->nullable()->after('amount');
            }
            if (! Schema::hasColumn('cash_transactions', 'fee_amount')) {
                $table->decimal('fee_amount', 15, 2)->default(0)->after('gross_amount');
            }
        });

        // 5. Tanda terima pada Purchase Order
        Schema::table('purchase_orders', function (Blueprint $table) {
            if (! Schema::hasColumn('purchase_orders', 'receipt_number')) {
                $table->string('receipt_number', 80)->nullable()->after('status');
                $table->date('receipt_date')->nullable()->after('receipt_number');
                $table->string('received_by', 120)->nullable()->after('receipt_date');
                $table->text('receipt_notes')->nullable()->after('received_by');
                $table->unsignedBigInteger('receipt_document_id')->nullable()->after('receipt_notes');
            }
        });

        // 6. Barang habis pakai pada po_items
        Schema::table('po_items', function (Blueprint $table) {
            if (! Schema::hasColumn('po_items', 'is_consumable')) {
                $table->boolean('is_consumable')->default(false)->after('inventory_item_id');
            }
        });

        // 7. Input manual BBM: cuaca, kecepatan, keterlambatan
        Schema::table('fuel_logs', function (Blueprint $table) {
            if (! Schema::hasColumn('fuel_logs', 'weather_condition')) {
                $table->string('weather_condition', 80)->nullable()->after('cargo_type');
            }
            if (! Schema::hasColumn('fuel_logs', 'speed_knots')) {
                $table->decimal('speed_knots', 6, 2)->nullable()->after('distance_nm');
            }
            if (! Schema::hasColumn('fuel_logs', 'delay_hours')) {
                $table->decimal('delay_hours', 6, 2)->nullable()->after('speed_knots');
            }
        });

        // 8. Progress stage pada voyage
        Schema::table('voyages', function (Blueprint $table) {
            if (! Schema::hasColumn('voyages', 'progress_stage')) {
                $table->string('progress_stage', 50)->nullable()->default('penerimaan_si')->after('charter_stage');
            }
        });

        // 9. Assignment tracking pada audit_logs
        Schema::table('audit_logs', function (Blueprint $table) {
            if (! Schema::hasColumn('audit_logs', 'assigner_id')) {
                $table->unsignedBigInteger('assigner_id')->nullable()->after('user_id');
            }
            if (! Schema::hasColumn('audit_logs', 'assigner_name')) {
                $table->string('assigner_name', 120)->nullable()->after('assigner_id');
            }
            if (! Schema::hasColumn('audit_logs', 'assigned_to')) {
                $table->string('assigned_to', 120)->nullable()->after('assigner_name');
            }
        });
    }

    public function down(): void
    {
    }
};
