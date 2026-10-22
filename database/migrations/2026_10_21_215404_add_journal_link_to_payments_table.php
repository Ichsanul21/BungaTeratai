<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->unsignedBigInteger('journal_entry_id')->nullable()->index();
        });

        Schema::table('bill_payments', function (Blueprint $table) {
            $table->unsignedBigInteger('journal_entry_id')->nullable()->index();
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropColumn('journal_entry_id');
        });

        Schema::table('bill_payments', function (Blueprint $table) {
            $table->dropColumn('journal_entry_id');
        });
    }
};
