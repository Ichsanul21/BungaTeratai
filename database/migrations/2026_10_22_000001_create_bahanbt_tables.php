<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ===== B1: Arsip Dokumen Terpadu =====
        Schema::table('documents', function (Blueprint $table) {
            $table->string('source_type')->default('unggahan')->after('id'); // unggahan|terbitan
            $table->unsignedBigInteger('template_id')->nullable()->index()->after('category_id');
            $table->string('archive_number')->nullable()->index()->after('document_number');
            $table->string('period', 7)->nullable()->index()->after('archive_number');
            $table->timestamp('voided_at')->nullable();
            $table->string('void_reason')->nullable();
            $table->boolean('has_endorsement')->default(false);
            $table->date('endorsement_last_date')->nullable();
            $table->date('endorsement_next_date')->nullable();
        });

        Schema::create('document_templates', function (Blueprint $table) {
            $table->id();
            $table->string('code', 40)->unique();
            $table->string('name');
            $table->string('kategori', 40);              // kontrak|invoice|surat|po|laporan|pajak|lainnya
            $table->string('layout_type', 40);           // spal|invoice_charter|keagenan|po|monthly_report|rekap_nota|outstanding|generic_letter|doc_registry
            $table->string('numbering_pattern')->nullable();
            $table->string('archive_pattern')->nullable(); // default ARS/{kode}/{tahun}/{seq}
            $table->string('seq_scope')->default('tahunan'); // tahunan|bulanan|global
            $table->unsignedInteger('seq_last')->default(0);
            $table->unsignedInteger('archive_seq_last')->default(0);
            $table->boolean('enabled')->default(true);
            $table->boolean('is_generic_letter')->default(false);
            $table->json('defaults')->nullable();       // bank, ttd, ppn, pph, klausul
            $table->timestamps();
        });

        Schema::create('document_relations', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('from_document_id')->index();
            $table->unsignedBigInteger('to_document_id')->index();
            $table->string('relation_type', 40);        // terbit_dari|melampiri|pelaksanaan|pendukung|pembayaran|revisi
            $table->string('notes')->nullable();
            $table->timestamps();
            $table->unique(['from_document_id', 'to_document_id', 'relation_type']);
        });

        Schema::create('document_links', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('document_id')->index();
            $table->string('linkable_type', 60);        // voyage|invoice|po|bill|cash
            $table->unsignedBigInteger('linkable_id')->index();
            $table->timestamps();
            $table->unique(['document_id', 'linkable_type', 'linkable_id']);
        });

        // ===== B3: Charter SPAL & Keagenan =====
        Schema::table('voyages', function (Blueprint $table) {
            $table->string('spal_number')->nullable()->index();
            $table->date('spal_date')->nullable();
            $table->string('payment_terms')->nullable();     // dp_50_50|dp_100|custom
            $table->string('payment_terms_note')->nullable();
            $table->decimal('freight_rate', 15, 2)->nullable();
            $table->string('freight_unit', 20)->nullable();  // MT|lumpsum
            $table->unsignedSmallInteger('laytime_days')->nullable();
            $table->decimal('demurrage_per_day', 15, 2)->nullable();
            $table->string('jetty_loading')->nullable();
            $table->string('jetty_discharge')->nullable();
            $table->string('shipper')->nullable();
            $table->string('consignee')->nullable();
            $table->decimal('dsr_mt', 12, 2)->nullable();
            $table->date('dsr_date')->nullable();
            $table->string('charter_stage')->nullable();     // si|spal|dp|keagenan_muat|dsr|pelunasan|keagenan_bongkar|closing
        });

        Schema::create('agency_appointments', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('voyage_id')->index();
            $table->string('letter_no')->nullable();
            $table->date('letter_date')->nullable();
            $table->string('port_type');                     // muat|bongkar|lainnya
            $table->string('port_name')->nullable();
            $table->string('agent_name');
            $table->string('agent_address')->nullable();
            $table->string('captain_name')->nullable();
            $table->string('captain_phone')->nullable();
            $table->unsignedInteger('grt')->nullable();
            $table->string('file_path')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();
        });

        // ===== B3: Invoice charter (FP + PPh rate) =====
        Schema::table('invoices', function (Blueprint $table) {
            $table->string('fp_number')->nullable();
            $table->string('fp_file_path')->nullable();
            $table->decimal('pph_rate', 6, 4)->default(0.02);
            $table->string('invoice_kind')->default('umum'); // umum|dp|pelunasan|dp100
        });

        // ===== B4: PO + cek/BG =====
        Schema::create('purchase_orders', function (Blueprint $table) {
            $table->id();
            $table->string('po_number')->unique();
            $table->date('order_date');
            $table->unsignedBigInteger('supplier_id')->index();
            $table->unsignedBigInteger('vessel_id')->nullable()->index(); // null = umum
            $table->string('dept')->default('ENGINE');       // ENGINE|DECK|HRD|OPERATION
            $table->string('status')->default('diterima');   // diterima|diambil|di_bill|lunas
            $table->decimal('subtotal', 15, 2)->default(0);
            $table->text('notes')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();
        });

        Schema::create('po_items', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('po_id')->index();
            $table->string('item_name');
            $table->string('item_code')->nullable();
            $table->decimal('qty', 12, 2)->default(1);
            $table->string('unit')->nullable();
            $table->decimal('price', 15, 2)->default(0);
            $table->decimal('amount', 15, 2)->default(0);
            $table->unsignedBigInteger('inventory_item_id')->nullable();
            $table->timestamps();
        });

        Schema::table('bills', function (Blueprint $table) {
            $table->unsignedBigInteger('po_id')->nullable()->index();
        });

        Schema::table('bill_payments', function (Blueprint $table) {
            $table->string('cheque_number')->nullable();
        });

        Schema::table('cash_accounts', function (Blueprint $table) {
            $table->string('bank_name')->nullable();
            $table->string('account_holder')->nullable();
        });
    }

    public function down(): void
    {
        // Migration satu arah untuk prototype — tidak dibalik otomatis
    }
};
