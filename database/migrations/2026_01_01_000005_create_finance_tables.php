<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('accounts', function (Blueprint $table) {
            $table->id();
            $table->string('code', 20)->unique();
            $table->string('name');
            $table->string('type');                  // asset|liability|equity|revenue|expense
            $table->string('normal_balance');        // debit|credit
            $table->boolean('is_cash')->default(false);
            $table->timestamps();
        });

        Schema::create('customers', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('npwp')->nullable();
            $table->string('address')->nullable();
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('suppliers', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('category')->nullable();   // bengkel|sparepart|operator_lain|pemerintah|lainnya
            $table->string('npwp')->nullable();
            $table->string('address')->nullable();
            $table->string('phone')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('service_catalog', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('kind');                   // pendapatan|biaya
            $table->decimal('default_price', 15, 2)->default(0);
            $table->foreignId('account_id')->nullable()->constrained('accounts')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->string('number')->unique();
            $table->foreignId('customer_id')->constrained()->restrictOnDelete();
            $table->unsignedBigInteger('voyage_id')->nullable()->index();
            $table->date('issue_date');
            $table->date('due_date')->nullable();
            $table->string('status')->default('draft'); // draft|unpaid|partial|paid
            $table->decimal('subtotal', 15, 2)->default(0);
            $table->decimal('ppn_rate', 5, 2)->default(11);
            $table->decimal('ppn_amount', 15, 2)->default(0);
            $table->decimal('pph23_amount', 15, 2)->default(0);
            $table->decimal('total', 15, 2)->default(0);
            $table->decimal('paid_amount', 15, 2)->default(0);
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('invoice_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_id')->constrained()->cascadeOnDelete();
            $table->unsignedBigInteger('service_catalog_id')->nullable();
            $table->string('description');
            $table->decimal('qty', 12, 2)->default(1);
            $table->decimal('price', 15, 2);
            $table->decimal('amount', 15, 2);
            $table->timestamps();
        });

        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_id')->constrained()->cascadeOnDelete();
            $table->date('date');
            $table->decimal('amount', 15, 2);
            $table->string('method')->default('transfer'); // transfer|cash|giro
            $table->string('reference')->nullable();
            $table->unsignedBigInteger('cash_account_id')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('bills', function (Blueprint $table) {
            $table->id();
            $table->string('number')->unique();
            $table->foreignId('supplier_id')->constrained()->restrictOnDelete();
            $table->unsignedBigInteger('voyage_id')->nullable()->index();
            $table->string('category')->nullable();    // sparepart|drydock|bbm|assist|jasa_bengkel|sewa|gaji|lainnya
            $table->date('issue_date');
            $table->date('due_date')->nullable();
            $table->string('status')->default('unpaid'); // unpaid|partial|paid
            $table->decimal('subtotal', 15, 2)->default(0);
            $table->decimal('ppn_amount', 15, 2)->default(0);
            $table->decimal('pph_withheld', 15, 2)->default(0);
            $table->string('pph_type')->nullable();     // pph23|pph4(2)
            $table->decimal('total', 15, 2)->default(0);
            $table->decimal('paid_amount', 15, 2)->default(0);
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('bill_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('bill_id')->constrained()->cascadeOnDelete();
            $table->date('date');
            $table->decimal('amount', 15, 2);
            $table->string('method')->default('transfer');
            $table->unsignedBigInteger('cash_account_id')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('cash_accounts', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('type')->default('kas');   // kas|bank
            $table->string('account_number')->nullable();
            $table->foreignId('account_id')->constrained('accounts')->restrictOnDelete();
            $table->decimal('balance', 15, 2)->default(0);
            $table->timestamps();
        });

        Schema::create('cash_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cash_account_id')->constrained()->cascadeOnDelete();
            $table->string('direction');              // in|out|transfer
            $table->decimal('amount', 15, 2);
            $table->date('date');
            $table->string('category')->nullable();   // pendapatan|bbm|servis|gaji|assist|lainnya
            $table->string('reference')->nullable();
            $table->unsignedBigInteger('journal_entry_id')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('payment_schedules', function (Blueprint $table) {
            $table->id();
            $table->string('ref_type');               // bill|manual
            $table->unsignedBigInteger('ref_id')->nullable();
            $table->date('due_date');
            $table->decimal('amount', 15, 2);
            $table->string('description');
            $table->string('status')->default('menunggu'); // menunggu|lunas|telat
            $table->date('paid_at')->nullable();
            $table->timestamps();
        });

        Schema::create('journal_entries', function (Blueprint $table) {
            $table->id();
            $table->date('entry_date');
            $table->string('memo')->nullable();
            $table->string('source_type')->nullable(); // invoice|bill|payment|cash|payroll|depreciation|tax|manual
            $table->unsignedBigInteger('source_id')->nullable();
            $table->foreignId('posted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('journal_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('entry_id')->constrained('journal_entries')->cascadeOnDelete();
            $table->foreignId('account_id')->constrained('accounts')->restrictOnDelete();
            $table->decimal('debit', 15, 2)->default(0);
            $table->decimal('credit', 15, 2)->default(0);
            $table->timestamps();
        });

        Schema::create('assets', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('category')->nullable();    // kapal|tongkang|peralatan|kendaraan
            $table->decimal('acquisition_cost', 15, 2);
            $table->date('acquisition_date');
            $table->unsignedSmallInteger('useful_life_months');
            $table->decimal('salvage_value', 15, 2)->default(0);
            $table->decimal('accumulated_depreciation', 15, 2)->default(0);
            $table->unsignedBigInteger('vessel_id')->nullable();
            $table->string('status')->default('aktif'); // aktif|disposal
            $table->timestamps();
        });

        Schema::create('asset_depreciations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('asset_id')->constrained()->cascadeOnDelete();
            $table->string('period', 7);               // YYYY-MM
            $table->decimal('amount', 15, 2);
            $table->unsignedBigInteger('journal_entry_id')->nullable();
            $table->timestamps();
            $table->unique(['asset_id', 'period']);
        });

        Schema::create('payroll_periods', function (Blueprint $table) {
            $table->id();
            $table->string('year_month', 7)->unique(); // YYYY-MM
            $table->string('status')->default('draft'); // draft|posted
            $table->timestamp('posted_at')->nullable();
            $table->foreignId('posted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('payroll_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('period_id')->constrained('payroll_periods')->cascadeOnDelete();
            $table->string('person_type');             // abk|karyawan
            $table->unsignedBigInteger('crew_id')->nullable();
            $table->unsignedBigInteger('employee_id')->nullable();
            $table->string('person_name');
            $table->decimal('gaji_pokok', 15, 2)->default(0);
            $table->decimal('tunjangan', 15, 2)->default(0);
            $table->decimal('borongan_insentif', 15, 2)->default(0);
            $table->decimal('potongan_lain', 15, 2)->default(0);
            $table->decimal('bpjs', 15, 2)->default(0);
            $table->decimal('pph21', 15, 2)->default(0);
            $table->decimal('total', 15, 2)->default(0);
            $table->string('status')->default('draft');
            $table->date('paid_at')->nullable();
            $table->timestamps();
        });

        Schema::create('withholding_taxes', function (Blueprint $table) {
            $table->id();
            $table->string('type');                    // pph21|pph23|pph4(2)
            $table->string('period', 7)->nullable();   // YYYY-MM
            $table->date('date');
            $table->decimal('base_amount', 15, 2);
            $table->decimal('rate', 5, 2);
            $table->decimal('tax_amount', 15, 2);
            $table->string('counterparty')->nullable();
            $table->string('ref_type')->nullable();
            $table->unsignedBigInteger('ref_id')->nullable();
            $table->string('status')->default('tercatat'); // tercatat|setor
            $table->date('paid_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('withholding_taxes');
        Schema::dropIfExists('payroll_entries');
        Schema::dropIfExists('payroll_periods');
        Schema::dropIfExists('asset_depreciations');
        Schema::dropIfExists('assets');
        Schema::dropIfExists('journal_lines');
        Schema::dropIfExists('journal_entries');
        Schema::dropIfExists('payment_schedules');
        Schema::dropIfExists('cash_transactions');
        Schema::dropIfExists('cash_accounts');
        Schema::dropIfExists('bill_payments');
        Schema::dropIfExists('bills');
        Schema::dropIfExists('payments');
        Schema::dropIfExists('invoice_items');
        Schema::dropIfExists('invoices');
        Schema::dropIfExists('service_catalog');
        Schema::dropIfExists('suppliers');
        Schema::dropIfExists('customers');
        Schema::dropIfExists('accounts');
    }
};
