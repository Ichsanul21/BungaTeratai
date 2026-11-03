<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('vessels', function (Blueprint $table) {
            if (!Schema::hasColumn('vessels', 'mmsi')) {
                $table->string('mmsi', 9)->nullable()->index()->after('vessel_type_custom');
            }
            if (!Schema::hasColumn('vessels', 'imo')) {
                $table->string('imo', 7)->nullable()->index()->after('mmsi');
            }
            if (!Schema::hasColumn('vessels', 'call_sign')) {
                $table->string('call_sign', 10)->nullable()->after('imo');
            }
            if (!Schema::hasColumn('vessels', 'ais_last_update')) {
                $table->timestamp('ais_last_update')->nullable()->after('last_position_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('vessels', function (Blueprint $table) {
            $table->dropColumn(['mmsi', 'imo', 'call_sign', 'ais_last_update']);
        });
    }
};
