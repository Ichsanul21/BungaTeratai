<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // crews: kolom identitas & dokumen lengkap sesuai Data Crew klien
        Schema::table('crews', function (Blueprint $table) {
            $table->string('kode_nik', 20)->nullable()->unique()->after('id');       // NIK internal 6 digit (020107)
            $table->string('name_ktp')->nullable()->after('name');                   // nama sesuai KTP
            $table->date('joined_on')->nullable()->after('status');                  // tanggal masuk
            $table->string('religion', 30)->nullable()->after('gender');             // agama
            $table->string('mother_name')->nullable()->after('religion');            // nama ibu kandung
            $table->string('bank_account', 50)->nullable()->after('mother_name');    // no rekening
            $table->string('seafarer_code', 40)->nullable()->after('npwp');          // kode pelaut (620...)
            $table->string('sccw', 60)->nullable()->after('seafarer_code');          // SCCW / ANT-ATT utama
            $table->string('stcw_reference')->nullable()->after('sccw');             // rujukan STCW
            $table->string('no_ijazah', 60)->nullable()->after('stcw_reference');
            $table->string('no_pkl', 60)->nullable()->after('no_ijazah');            // No PKL (0107/BT-MI/...)
            $table->string('no_surat_mutasi', 60)->nullable()->after('no_pkl');      // No Surat Mutasi
            $table->string('school_origin')->nullable()->after('no_surat_mutasi');   // asal sekolah (kadet)
            $table->string('nit', 40)->nullable()->after('school_origin');           // NIT kadet
            $table->boolean('is_blacklist')->default(false)->after('npwp');
        });

        // Register ON/OFF/Mutasi/kadet — satu pintu riwayat gerakan awak
        Schema::create('crew_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('crew_id')->constrained('crews')->cascadeOnDelete();
            $table->foreignId('vessel_id')->nullable()->constrained('vessels')->nullOnDelete();
            $table->string('type', 30);              // sign_on|sign_off|mutasi_kapal|mutasi_jabatan|kadet_on|kadet_off
            $table->string('role', 60)->nullable();  // jabatan saat gerakan
            $table->date('movement_date');
            $table->string('reason', 80)->nullable(); // alasan OFF (enum materi gAJI)
            $table->string('no_surat', 80)->nullable(); // 0105/BT-OFF/X/2026 dst
            $table->string('recommendation_by', 60)->nullable(); // nakhoda|kkm|management
            $table->foreignId('replacement_crew_id')->nullable()->constrained('crews')->nullOnDelete();
            $table->unsignedBigInteger('document_id')->nullable(); // surat terbit terkait
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->index(['crew_id', 'type']);
        });

        // Surat Permohonan Sijil ON/OFF ke Kesyahbandaran (multi-crew)
        Schema::create('sijil_requests', function (Blueprint $table) {
            $table->id();
            $table->string('no_surat', 80)->nullable();   // 0547/AG/BT-ADM/X/2026
            $table->date('letter_date');
            $table->string('kind', 10)->default('on');    // on|off
            $table->foreignId('vessel_id')->constrained('vessels')->cascadeOnDelete();
            $table->json('crew_ids');                     // daftar crew id saat permohonan
            $table->string('signed_by')->nullable();      // Capt. Azwar Saputra
            $table->string('status', 20)->default('draft'); // draft|terbit
            $table->unsignedBigInteger('document_id')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sijil_requests');
        Schema::dropIfExists('crew_movements');
        Schema::table('crews', function (Blueprint $table) {
            $table->dropColumn([
                'kode_nik', 'name_ktp', 'joined_on', 'religion', 'mother_name',
                'bank_account', 'seafarer_code', 'sccw', 'stcw_reference', 'no_ijazah',
                'no_pkl', 'no_surat_mutasi', 'school_origin', 'nit', 'is_blacklist',
            ]);
        });
    }
};
