<?php

namespace Database\Seeders;

use App\Models\Account;
use App\Models\CashAccount;
use App\Models\Company;
use App\Models\DocumentCategory;
use App\Models\DocumentRequirement;
use App\Models\Role;
use App\Models\ServiceCatalog;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Satu pintu data demo Bunga Teratai System.
 * SEMUA data = DEMO DATA (fiktif), kecuali spesifikasi publik KM Prince Soya.
 */
class DemoDataSeeder extends Seeder
{
    public function run(): void
    {
        $this->seedRolesAndUsers();
        $this->seedCompanyAndSettings();
        $this->seedDocumentCategories();
        $this->seedDocumentRequirements();
        $this->seedFinanceMaster();
        $this->seedDocumentTemplates();
        $this->seedFleet();
        $this->seedDocuments();
        $this->seedInventory();
        $this->seedHr();
        $this->seedAssets();
        $this->seedMasterFinanceParties();
        $this->seedVoyages();
        $this->seedOperationalHistory();
        $this->seedFinanceHistory();
        $this->seedPayrollHistory();
        $this->seedFuelLogs();
        $this->extendOperationalHistory();
        $this->seedAssetDepreciations();
        $this->seedTaxPayments();
        $this->seedDocumentApprovals();
        $this->seedTrackerDocuments();
        $this->seedSpal104();
        $this->seedClientPurchases();
        $this->seedSptArchive();
        $this->seedOutstanding();
        $this->seedDokumenKapal();
        app(\App\Services\ReminderService::class)->sync();
    }

    private function seedRolesAndUsers(): void
    {
        $roles = [
            ['slug' => 'super_admin', 'name' => 'Super Admin'],
            ['slug' => 'management', 'name' => 'Management / Direksi'],
            ['slug' => 'ship_ops', 'name' => 'Ship Operations'],
            ['slug' => 'doc_controller', 'name' => 'Document Controller'],
            ['slug' => 'supervisor', 'name' => 'Supervisor / Approver'],
            ['slug' => 'finance', 'name' => 'Finance / Accounting'],
            ['slug' => 'auditor', 'name' => 'Read-Only / Auditor'],
        ];

        foreach ($roles as $role) {
            Role::firstOrCreate(['slug' => $role['slug']], $role);
        }

        $users = [
            ['name' => 'Admin Sistem', 'email' => 'admin@bungateratai.id', 'role' => 'super_admin'],
            ['name' => 'Direktur Utama', 'email' => 'management@bungateratai.id', 'role' => 'management'],
            ['name' => 'Kepala Operasional', 'email' => 'ops@bungateratai.id', 'role' => 'ship_ops'],
            ['name' => 'Staf Dokumen', 'email' => 'dokumen@bungateratai.id', 'role' => 'doc_controller'],
            ['name' => 'Supervisor Pelayaran', 'email' => 'supervisor@bungateratai.id', 'role' => 'supervisor'],
            ['name' => 'Staf Keuangan', 'email' => 'finance@bungateratai.id', 'role' => 'finance'],
            ['name' => 'Auditor Internal', 'email' => 'auditor@bungateratai.id', 'role' => 'auditor'],
        ];

        foreach ($users as $data) {
            $user = User::firstOrCreate(
                ['email' => $data['email']],
                ['name' => $data['name'], 'password' => 'password']
            );
            $role = Role::where('slug', $data['role'])->first();
            if ($role && ! $user->roles->contains('id', $role->id)) {
                $user->roles()->attach($role);
            }
        }
    }

    private function seedCompanyAndSettings(): void
    {
        Company::firstOrCreate(['company_name' => 'PT Bunga Teratai'], [
            'business_license_reference' => 'NIB-DEMO-001123',
            'npwp' => '00.000.000.0-000.000',
            'address' => 'Jl. Mulawarman No. 23, Samarinda, Kalimantan Timur',
            'city' => 'Samarinda',
            'phone' => '(0541) 731034',
            'email' => 'adm.teratai@gmail.com',
        ]);

        $settings = [
            ['key' => 'reminder_days', 'value' => '30,14,7,0', 'group' => 'reminder'],
            ['key' => 'demo_label', 'value' => 'DEMO DATA', 'group' => 'general'],
            ['key' => 'internal_approval_required', 'value' => '1', 'group' => 'workflow'],
            ['key' => 'external_approval_requires_evidence', 'value' => '1', 'group' => 'workflow'],
            ['key' => 'readiness_is_internal_indicator', 'value' => '1', 'group' => 'workflow'],
        ];

        foreach ($settings as $setting) {
            Setting::firstOrCreate(['key' => $setting['key']], $setting);
        }
    }

    private function seedDocumentCategories(): void
    {
        $categories = [
            ['code' => 'A1', 'name' => 'Legalitas Perusahaan', 'group_code' => 'A', 'sort' => 1],
            ['code' => 'A2', 'name' => 'Perizinan Usaha', 'group_code' => 'A', 'sort' => 2],
            ['code' => 'A3', 'name' => 'Dokumen Operator & Kepemilikan', 'group_code' => 'A', 'sort' => 3],
            ['code' => 'B1', 'name' => 'Identitas Kapal', 'group_code' => 'B', 'sort' => 4],
            ['code' => 'B2', 'name' => 'Surat Ukur & Pendaftaran', 'group_code' => 'B', 'sort' => 5],
            ['code' => 'C1', 'name' => 'Sertifikat Kelaiklautan', 'group_code' => 'C', 'sort' => 6],
            ['code' => 'C2', 'name' => 'Sertifikat Keselamatan', 'group_code' => 'C', 'sort' => 7],
            ['code' => 'C3', 'name' => 'Pemeriksaan & Docking', 'group_code' => 'C', 'sort' => 8],
            ['code' => 'D1', 'name' => 'Crew List & Keanggotaan', 'group_code' => 'D', 'sort' => 9],
            ['code' => 'D2', 'name' => 'Sertifikat Kompetensi Awak', 'group_code' => 'D', 'sort' => 10],
            ['code' => 'D3', 'name' => 'Kesehatan Awak', 'group_code' => 'D', 'sort' => 11],
            ['code' => 'E1', 'name' => 'Izin & Persetujuan Perjalanan', 'group_code' => 'E', 'sort' => 12],
            ['code' => 'E2', 'name' => 'Manifest & Muatan', 'group_code' => 'E', 'sort' => 13],
            ['code' => 'E3', 'name' => 'Kontrak & Instruksi Pelayaran', 'group_code' => 'E', 'sort' => 14],
            ['code' => 'F1', 'name' => 'Laporan Keberangkatan & Kedatangan', 'group_code' => 'F', 'sort' => 15],
            ['code' => 'F2', 'name' => 'Bukti Bongkar Muat & Penerimaan', 'group_code' => 'F', 'sort' => 16],
            ['code' => 'G1', 'name' => 'Laporan Operasional & Kejadian', 'group_code' => 'G', 'sort' => 17],
            ['code' => 'G2', 'name' => 'Bukti Pemeriksaan', 'group_code' => 'G', 'sort' => 18],
            ['code' => 'G3', 'name' => 'Arsip SPT Unifikasi (Pajak)', 'group_code' => 'G', 'sort' => 19],
        ];

        foreach ($categories as $category) {
            DocumentCategory::firstOrCreate(['code' => $category['code']], $category);
        }
    }

    /**
     * Template kelengkapan wajib A–F (x jenis kapal x navigasi x muatan).
     */
    private function seedDocumentRequirements(): void
    {
        $vesselOnly = fn (array $vesselTypes = null, array $navigation = null, array $cargo = null) => json_encode(array_filter([
            'vessel_types' => $vesselTypes,
            'navigation_types' => $navigation,
            'cargo_types' => $cargo,
        ]));

        $requirements = [
            // A — Legalitas perusahaan
            ['code' => 'A_NIB', 'name' => 'NIB (Nomor Induk Berusaha)', 'group_code' => 'A', 'applies_to' => 'vessel', 'applicability' => null, 'is_conditional' => false, 'sort' => 1],
            ['code' => 'A_NPWP', 'name' => 'NPWP Badan', 'group_code' => 'A', 'applies_to' => 'vessel', 'applicability' => null, 'is_conditional' => false, 'sort' => 2],
            ['code' => 'A_AKTA', 'name' => 'Akta Pendirian & Perubahan', 'group_code' => 'A', 'applies_to' => 'vessel', 'applicability' => null, 'is_conditional' => false, 'sort' => 3],
            ['code' => 'A_SK_MENKUMHAM', 'name' => 'SK Kemenkumham', 'group_code' => 'A', 'applies_to' => 'vessel', 'applicability' => null, 'is_conditional' => false, 'sort' => 4],
            ['code' => 'A_SIUP', 'name' => 'SIUP / OSS KBLI', 'group_code' => 'A', 'applies_to' => 'vessel', 'applicability' => null, 'is_conditional' => false, 'sort' => 5],
            ['code' => 'A_IZIN_OPERATOR', 'name' => 'Izin Operator / SIUPAL Perusahaan', 'group_code' => 'A', 'applies_to' => 'vessel', 'applicability' => null, 'is_conditional' => false, 'sort' => 6],
            ['code' => 'A_ISO', 'name' => 'Sertifikat ISO (opsional)', 'group_code' => 'A', 'applies_to' => 'vessel', 'applicability' => null, 'is_conditional' => true, 'sort' => 7],
            // B — Identitas kapal
            ['code' => 'B_STKB', 'name' => 'STKB / Surat Tanda Kebangsaan Kapal', 'group_code' => 'B', 'applies_to' => 'vessel', 'applicability' => null, 'is_conditional' => false, 'sort' => 10],
            ['code' => 'B_SURAT_UKUR', 'name' => 'Surat Ukur Kapal', 'group_code' => 'B', 'applies_to' => 'vessel', 'applicability' => null, 'is_conditional' => false, 'sort' => 11],
            ['code' => 'B_AKTA_KEPEMILIKAN', 'name' => 'Akta Kepemilikan Kapal', 'group_code' => 'B', 'applies_to' => 'vessel', 'applicability' => null, 'is_conditional' => false, 'sort' => 12],
            ['code' => 'B_CEK_FISIK', 'name' => 'Surat Keterangan Cek Fisik', 'group_code' => 'B', 'applies_to' => 'vessel', 'applicability' => null, 'is_conditional' => false, 'sort' => 13],
            ['code' => 'B_SHIP_PARTICULARS', 'name' => 'Ship Particulars', 'group_code' => 'B', 'applies_to' => 'vessel', 'applicability' => null, 'is_conditional' => false, 'sort' => 14],
            ['code' => 'B_CALLSIGN', 'name' => 'Keterangan Call Sign & MMSI', 'group_code' => 'B', 'applies_to' => 'vessel', 'applicability' => null, 'is_conditional' => false, 'sort' => 15],
            // C — Sertifikat & keselamatan
            ['code' => 'C_SKL', 'name' => 'Sertifikat Kelayakan Layar (SKL)', 'group_code' => 'C', 'applies_to' => 'vessel', 'applicability' => null, 'is_conditional' => false, 'sort' => 20],
            ['code' => 'C_SART', 'name' => 'Sertifikat Keselamatan Pencarian & Penyelamatan', 'group_code' => 'C', 'applies_to' => 'vessel', 'applicability' => $vesselOnly(['kapal_penumpang']), 'is_conditional' => false, 'sort' => 21],
            ['code' => 'C_FIRE', 'name' => 'Sertifikat Alat Pemadam Kebakaran', 'group_code' => 'C', 'applies_to' => 'vessel', 'applicability' => null, 'is_conditional' => false, 'sort' => 22],
            ['code' => 'C_RADIO', 'name' => 'Sertifikat Radio / GMDSS', 'group_code' => 'C', 'applies_to' => 'vessel', 'applicability' => null, 'is_conditional' => false, 'sort' => 23],
            ['code' => 'C_PEMERIKSAAN_TAHUNAN', 'name' => 'Surat Keterangan Pemeriksaan Tahunan', 'group_code' => 'C', 'applies_to' => 'vessel', 'applicability' => null, 'is_conditional' => false, 'sort' => 24],
            ['code' => 'C_DRYDOCK', 'name' => 'Laporan Drydock / Docking', 'group_code' => 'C', 'applies_to' => 'vessel', 'applicability' => null, 'is_conditional' => false, 'sort' => 25],
            ['code' => 'C_ISPS', 'name' => 'Sertifikat ISPS', 'group_code' => 'C', 'applies_to' => 'vessel', 'applicability' => $vesselOnly(['kapal_penumpang']), 'is_conditional' => true, 'sort' => 26],
            // D — Awak kapal
            ['code' => 'D_CREW_LIST', 'name' => 'Crew List', 'group_code' => 'D', 'applies_to' => 'vessel', 'applicability' => null, 'is_conditional' => false, 'sort' => 30],
            ['code' => 'D_SKK', 'name' => 'Sertifikat Kompetensi (SKK) Awak', 'group_code' => 'D', 'applies_to' => 'vessel', 'applicability' => null, 'is_conditional' => false, 'sort' => 31],
            ['code' => 'D_MEDICAL', 'name' => 'Surat Kesehatan Pelaut (Medical Fitness)', 'group_code' => 'D', 'applies_to' => 'vessel', 'applicability' => null, 'is_conditional' => false, 'sort' => 32],
            ['code' => 'D_BST', 'name' => 'Basic Safety Training (BST)', 'group_code' => 'D', 'applies_to' => 'vessel', 'applicability' => null, 'is_conditional' => false, 'sort' => 33],
            // E — Dokumen perjalanan
            ['code' => 'E_SPB', 'name' => 'Permohonan SPB', 'group_code' => 'E', 'applies_to' => 'voyage', 'applicability' => null, 'is_conditional' => false, 'sort' => 40],
            ['code' => 'E_SURAT_NAKHODA', 'name' => 'Surat Pernyataan Nakhoda', 'group_code' => 'E', 'applies_to' => 'voyage', 'applicability' => null, 'is_conditional' => false, 'sort' => 41],
            ['code' => 'E_MANIFEST', 'name' => 'Manifest', 'group_code' => 'E', 'applies_to' => 'voyage', 'applicability' => null, 'is_conditional' => false, 'sort' => 42],
            ['code' => 'E_INSTRUKSI', 'name' => 'Instruksi Pengangkutan / Pelayaran', 'group_code' => 'E', 'applies_to' => 'voyage', 'applicability' => null, 'is_conditional' => false, 'sort' => 43],
            ['code' => 'E_KONTRAK', 'name' => 'Kontrak Pengangkutan', 'group_code' => 'E', 'applies_to' => 'voyage', 'applicability' => null, 'is_conditional' => false, 'sort' => 44],
            ['code' => 'E_SURAT_MUAT', 'name' => 'Surat Muat', 'group_code' => 'E', 'applies_to' => 'voyage', 'applicability' => null, 'is_conditional' => false, 'sort' => 45],
            ['code' => 'E_BUKTI_TIMBANG', 'name' => 'Bukti Timbang Muatan', 'group_code' => 'E', 'applies_to' => 'voyage', 'applicability' => $vesselOnly(null, null, ['batu_bara', 'semen']), 'is_conditional' => true, 'sort' => 46],
            ['code' => 'E_UJI_MUTU', 'name' => 'Dokumen Uji Mutu Muatan', 'group_code' => 'E', 'applies_to' => 'voyage', 'applicability' => $vesselOnly(null, null, ['batu_bara']), 'is_conditional' => true, 'sort' => 47],
            ['code' => 'E_MANIFEST_PENUMPANG', 'name' => 'Manifest Penumpang', 'group_code' => 'E', 'applies_to' => 'voyage', 'applicability' => $vesselOnly(['kapal_penumpang']), 'is_conditional' => false, 'sort' => 48],
            ['code' => 'E_REKAP_TIKET', 'name' => 'Rekap Tiket / Reservasi', 'group_code' => 'E', 'applies_to' => 'voyage', 'applicability' => $vesselOnly(['kapal_penumpang']), 'is_conditional' => true, 'sort' => 49],
            // F — Bukti operasional
            ['code' => 'F_LAPORAN_BERANGKAT', 'name' => 'Laporan Keberangkatan', 'group_code' => 'F', 'applies_to' => 'voyage', 'applicability' => null, 'is_conditional' => false, 'sort' => 50],
            ['code' => 'F_LAPORAN_TIBA', 'name' => 'Laporan Kedatangan', 'group_code' => 'F', 'applies_to' => 'voyage', 'applicability' => null, 'is_conditional' => false, 'sort' => 51],
            ['code' => 'F_BUKTI_BONGKAR', 'name' => 'Bukti Bongkar Muat', 'group_code' => 'F', 'applies_to' => 'voyage', 'applicability' => $vesselOnly(['tongkang', 'tugboat']), 'is_conditional' => false, 'sort' => 52],
            ['code' => 'F_BUKTI_TERIMA', 'name' => 'Bukti Penerimaan Muatan (Receipt)', 'group_code' => 'F', 'applies_to' => 'voyage', 'applicability' => $vesselOnly(['tongkang', 'tugboat']), 'is_conditional' => false, 'sort' => 53],
            ['code' => 'F_PENUTUPAN', 'name' => 'Laporan Penutupan Perjalanan', 'group_code' => 'F', 'applies_to' => 'voyage', 'applicability' => null, 'is_conditional' => false, 'sort' => 54],
        ];

        foreach ($requirements as $requirement) {
            DocumentRequirement::firstOrCreate(['code' => $requirement['code']], $requirement);
        }
    }

    private function seedFinanceMaster(): void
    {
        $accounts = [
            ['code' => '1001', 'name' => 'Kas Tunai', 'type' => 'asset', 'normal_balance' => 'debit', 'is_cash' => true],
            ['code' => '1002', 'name' => 'Bank BRI Operasional', 'type' => 'asset', 'normal_balance' => 'debit', 'is_cash' => true],
            ['code' => '1003', 'name' => 'Bank Mandiri Payroll', 'type' => 'asset', 'normal_balance' => 'debit', 'is_cash' => true],
            ['code' => '1100', 'name' => 'Piutang Usaha', 'type' => 'asset', 'normal_balance' => 'debit', 'is_cash' => false],
            ['code' => '1200', 'name' => 'Persediaan Barang', 'type' => 'asset', 'normal_balance' => 'debit', 'is_cash' => false],
            ['code' => '1300', 'name' => 'Aset Tetap', 'type' => 'asset', 'normal_balance' => 'debit', 'is_cash' => false],
            ['code' => '1399', 'name' => 'Akumulasi Penyusutan', 'type' => 'asset', 'normal_balance' => 'credit', 'is_cash' => false],
            ['code' => '2100', 'name' => 'Hutang Usaha (AP)', 'type' => 'liability', 'normal_balance' => 'credit', 'is_cash' => false],
            ['code' => '2101', 'name' => 'Hutang Pajak', 'type' => 'liability', 'normal_balance' => 'credit', 'is_cash' => false],
            ['code' => '2200', 'name' => 'Hutang Gaji', 'type' => 'liability', 'normal_balance' => 'credit', 'is_cash' => false],
            ['code' => '3000', 'name' => 'Modal Disetor', 'type' => 'equity', 'normal_balance' => 'credit', 'is_cash' => false],
            ['code' => '3100', 'name' => 'Laba Ditahan', 'type' => 'equity', 'normal_balance' => 'credit', 'is_cash' => false],
            ['code' => '4000', 'name' => 'Pendapatan Towing', 'type' => 'revenue', 'normal_balance' => 'credit', 'is_cash' => false],
            ['code' => '4100', 'name' => 'Pendapatan Sewa Tongkang', 'type' => 'revenue', 'normal_balance' => 'credit', 'is_cash' => false],
            ['code' => '4200', 'name' => 'Pendapatan Tiket', 'type' => 'revenue', 'normal_balance' => 'credit', 'is_cash' => false],
            ['code' => '4300', 'name' => 'Pendapatan Jasa Lain', 'type' => 'revenue', 'normal_balance' => 'credit', 'is_cash' => false],
            ['code' => '5000', 'name' => 'Beban BBM', 'type' => 'expense', 'normal_balance' => 'debit', 'is_cash' => false],
            ['code' => '5100', 'name' => 'Beban Servis & Pemeliharaan', 'type' => 'expense', 'normal_balance' => 'debit', 'is_cash' => false],
            ['code' => '5200', 'name' => 'Beban Gaji & Upah', 'type' => 'expense', 'normal_balance' => 'debit', 'is_cash' => false],
            ['code' => '5300', 'name' => 'Beban Jasa Assist', 'type' => 'expense', 'normal_balance' => 'debit', 'is_cash' => false],
            ['code' => '5400', 'name' => 'Beban Sewa', 'type' => 'expense', 'normal_balance' => 'debit', 'is_cash' => false],
            ['code' => '5500', 'name' => 'Beban Penyusutan', 'type' => 'expense', 'normal_balance' => 'debit', 'is_cash' => false],
            ['code' => '5600', 'name' => 'Beban Pajak & Retribusi', 'type' => 'expense', 'normal_balance' => 'debit', 'is_cash' => false],
            ['code' => '5900', 'name' => 'Beban Lain-lain', 'type' => 'expense', 'normal_balance' => 'debit', 'is_cash' => false],
        ];

        foreach ($accounts as $account) {
            Account::firstOrCreate(['code' => $account['code']], $account);
        }

        $catalog = [
            ['name' => 'Jasa Towing (Penarikan)', 'kind' => 'pendapatan', 'default_price' => 15000000, 'account_id' => Account::where('code', '4000')->value('id')],
            ['name' => 'Sewa Tongkang', 'kind' => 'pendapatan', 'default_price' => 25000000, 'account_id' => Account::where('code', '4100')->value('id')],
            ['name' => 'Tiket Penumpang', 'kind' => 'pendapatan', 'default_price' => 185000, 'account_id' => Account::where('code', '4200')->value('id')],
            ['name' => 'Jasa Bongkar Muat', 'kind' => 'pendapatan', 'default_price' => 7500000, 'account_id' => Account::where('code', '4300')->value('id')],
            ['name' => 'Jasa Assist Kolong Jembatan', 'kind' => 'biaya', 'default_price' => 5000000, 'account_id' => Account::where('code', '5300')->value('id')],
            ['name' => 'Drydock / Pengerukan', 'kind' => 'biaya', 'default_price' => 75000000, 'account_id' => Account::where('code', '5100')->value('id')],
            ['name' => 'Sparepart & Suku Cadang', 'kind' => 'biaya', 'default_price' => 2500000, 'account_id' => Account::where('code', '5100')->value('id')],
            ['name' => 'Jasa Bengkel', 'kind' => 'biaya', 'default_price' => 4000000, 'account_id' => Account::where('code', '5100')->value('id')],
            ['name' => 'BBM Solar Marine', 'kind' => 'biaya', 'default_price' => 12500, 'account_id' => Account::where('code', '5000')->value('id')],
            ['name' => 'Sewa Dermaga / Pangkalan', 'kind' => 'biaya', 'default_price' => 10000000, 'account_id' => Account::where('code', '5400')->value('id')],
        ];

        foreach ($catalog as $item) {
            ServiceCatalog::firstOrCreate(['name' => $item['name']], $item);
        }

        $cashAccounts = [
            ['name' => 'Kas Tunai Operasional', 'type' => 'kas', 'account_number' => null, 'account_id' => Account::where('code', '1001')->value('id'), 'balance' => 50000000],
            ['name' => 'Bank BRI Operasional', 'type' => 'bank', 'account_number' => '0022-001-DEMO', 'account_id' => Account::where('code', '1002')->value('id'), 'balance' => 850000000],
            ['name' => 'Bank Mandiri Payroll', 'type' => 'bank', 'account_number' => '0033-001-DEMO', 'account_id' => Account::where('code', '1003')->value('id'), 'balance' => 320000000],
        ];

        foreach ($cashAccounts as $account) {
            CashAccount::firstOrCreate(['name' => $account['name']], $account);
        }
    }

    /**
     * 39 kapal sesuai materi klien: 18 TB + 18 BG (GT dari Master Tracker)
     * + KM Prince Soya + KM Etam Bahari + KM Tata Armada 01 (Dokumen_Kapal).
     * Nama & GT = asli; tahun/LOA/mesin = demo (materi tidak memuatnya).
     */
    private function seedFleet(): void
    {
        if (\App\Models\Vessel::count() > 0) {
            return;
        }

        // [nama, tipe, navigasi, imo, mmsi, callsign, tahun, loa, beam, gt, dwt, kapasitas, satuan, mesin, bbm, baseline, pemilik, lokasi, status, catatan]
        $vessels = [
            ['KM Prince Soya', 'kapal_penumpang', 'laut', '9110157', '525200166', 'PNSR', 1995, 95.70, 15.02, 3655, 763, 1800, 'penumpang', 'MAN B&W 8L32/40', 'MDO', 300, 'PT Bunga Teratai', 'Pelabuhan Samarinda', 'aktif', 'Ro-Ro penumpang (GRT 3655 per Crew List klien). Insiden kebakaran dek 1 Agustus 2026 — DEMO DATA.'],
            ['TB Syukur 01', 'tugboat', 'laut', null, '525201001', 'PKSA1', 2012, 24.50, 7.20, 198, 90, null, null, '2 × Cummins KTA38', 'Diesel', 95, 'PT Bunga Teratai', 'Sungai Kunjang, Samarinda', 'aktif', null],
            ['BG Syukur 03', 'tongkang', 'laut', null, '525201002', 'PKSB8', 2010, 60.00, 14.00, 3100, 4350, 4350, 'ton', '— (ditowel)', '—', null, 'PT Bunga Teratai', 'Sungai Kunjang, Samarinda', 'aktif', 'Tongkang muatan umum (GT 3100 per Master Tracker).'],
            ['TB Syukur 03', 'tugboat', 'laut', null, '525201003', 'PKSC2', 2016, 26.00, 8.00, 250, 120, null, null, '2 × CAT 3512B', 'Diesel', 110, 'PT Bunga Teratai', 'Pelabuhan Samarinda', 'aktif', null],
            ['KM Etam Bahari', 'kapal_penumpang', 'sungai_danau', null, '525201004', 'PKSD4', 2014, 42.00, 9.00, 320, 120, 320, 'penumpang', '2 × Mitsubishi S6R', 'Diesel', 160, 'PT Bunga Teratai', 'Dermaga Tenggarong', 'aktif', 'Pelayaran sungai Mahakam.'],
            ['TB Syukur 11', 'tugboat', 'laut', null, '525201012', 'PKSL2', 2011, 25.50, 7.60, 246, 110, null, null, '2 × CAT C18', 'Diesel', 100, 'PT Bunga Teratai', 'Pelabuhan Samarinda', 'aktif', null],
            ['TB Syukur 23', 'tugboat', 'sungai_danau', null, '525201006', 'PKSF6', 2018, 19.80, 6.50, 196, 60, null, null, '2 × Yanmar 6EY', 'Diesel', 85, 'PT Bunga Teratai', 'Sungai Mahakam', 'aktif', null],
            ['TB Syukur 30', 'tugboat', 'laut', null, '525201013', 'PKSM3', 2014, 23.00, 7.00, 187, 95, null, null, '2 × Cummins KTA38', 'Diesel', 95, 'PT Bunga Teratai', 'Pelabuhan Samarinda', 'aktif', null],
            ['TB Syukur 32', 'tugboat', 'laut', null, '525201014', 'PKSN4', 2013, 26.50, 8.20, 263, 130, null, null, '2 × CAT 3512B', 'Diesel', 110, 'PT Bunga Teratai', 'Pelabuhan Samarinda', 'aktif', null],
            ['TB Syukur 36', 'tugboat', 'laut', null, '525201015', 'PKSO5', 2016, 27.00, 8.40, 278, 135, null, null, '2 × CAT 3512B', 'Diesel', 112, 'PT Bunga Teratai', 'Pelabuhan Samarinda', 'aktif', null],
            ['TB Syukur 45', 'tugboat', 'laut', null, '525201016', 'PKSP6', 2012, 24.00, 7.40, 260, 120, null, null, '2 × Mitsubishi S6A3', 'Diesel', 105, 'PT Bunga Teratai', 'Pelabuhan Samarinda', 'aktif', null],
            ['TB Syukur 51', 'tugboat', 'laut', null, '525201017', 'PKSQ7', 2015, 24.20, 7.40, 260, 120, null, null, '2 × Mitsubishi S6A3', 'Diesel', 105, 'PT Bunga Teratai', 'Pelabuhan Samarinda', 'aktif', null],
            ['TB Syukur 52', 'tugboat', 'laut', null, '525201018', 'PKSR8', 2017, 26.00, 8.00, 264, 125, null, null, '2 × CAT 3512B', 'Diesel', 110, 'PT Bunga Teratai', 'Pelabuhan Samarinda', 'aktif', null],
            ['TB Syukur 54', 'tugboat', 'laut', null, '525201019', 'PKSS9', 2018, 25.80, 8.00, 261, 122, null, null, '2 × CAT 3512B', 'Diesel', 108, 'PT Bunga Teratai', 'Pelabuhan Samarinda', 'aktif', null],
            ['TB Syukur 56', 'tugboat', 'laut', null, '525201020', 'PKST0', 2016, 25.90, 8.10, 262, 124, null, null, '2 × CAT 3512B', 'Diesel', 108, 'PT Bunga Teratai', 'Pelabuhan Samarinda', 'aktif', null],
            ['TB Syukur 58', 'tugboat', 'laut', null, '525201010', 'PKSJ0', 2013, 22.00, 7.00, 260, 80, null, null, '2 × Mitsubishi S6A3', 'Diesel', 100, 'PT Bunga Teratai', 'Galangan, Samarinda', 'dalam_perbaikan', 'Sedang perbaikan mesin utama.'],
            ['TB Syukur 62', 'tugboat', 'laut', null, '525201021', 'PKSU1', 2019, 27.50, 8.50, 285, 140, null, null, '2 × CAT C32', 'Diesel', 118, 'PT Bunga Teratai', 'Pelabuhan Samarinda', 'aktif', null],
            ['TB Syukur 70', 'tugboat', 'laut', null, '525201022', 'PKSV2', 2012, 23.50, 7.20, 232, 100, null, null, '2 × Cummins KTA38', 'Diesel', 96, 'PT Bunga Teratai', 'Pelabuhan Samarinda', 'aktif', null],
            ['TB Syukur 75', 'tugboat', 'laut', null, '525201023', 'PKSW3', 2015, 26.80, 8.30, 274, 132, null, null, '2 × CAT 3512B', 'Diesel', 112, 'PT Bunga Teratai', 'Pelabuhan Samarinda', 'aktif', null],
            ['TB Syukur 78', 'tugboat', 'laut', null, '525201024', 'PKSX4', 2015, 26.90, 8.30, 274, 132, null, null, '2 × CAT 3512B', 'Diesel', 112, 'PT Bunga Teratai', 'Pelabuhan Samarinda', 'aktif', null],
            ['TB Syukur 82', 'tugboat', 'laut', null, '525201025', 'PKSY5', 2013, 24.80, 7.60, 231, 105, null, null, '2 × Yanmar 6EY', 'Diesel', 98, 'PT Bunga Teratai', 'Pelabuhan Samarinda', 'aktif', null],
            ['BG Syukur 06', 'tongkang', 'sungai_danau', null, '525201008', 'PKSH8', 2015, 62.00, 14.50, 3103, 4350, 4350, 'ton', '— (ditowel)', '—', null, 'PT Bunga Teratai', 'Loa Buah, Samarinda', 'aktif', null],
            ['BG Syukur 07', 'tongkang', 'laut', null, '525201009', 'PKSI9', 2011, 65.00, 15.00, 3107, 4350, 4350, 'ton', '— (ditowel)', '—', null, 'PT Bunga Teratai', 'Sungai Kunjang, Samarinda', 'aktif', null],
            ['BG Syukur 09', 'tongkang', 'laut', null, '525201026', 'PKSZ6', 2012, 62.00, 14.50, 3103, 4350, 4350, 'ton', '— (ditowel)', '—', null, 'PT Bunga Teratai', 'Sungai Kunjang, Samarinda', 'aktif', null],
            ['BG Syukur 29', 'tongkang', 'laut', null, '525201027', 'PKSA7', 2014, 63.00, 14.60, 3107, 4350, 4350, 'ton', '— (ditowel)', '—', null, 'PT Bunga Teratai', 'Sungai Kunjang, Samarinda', 'aktif', null],
            ['BG Syukur 37', 'tongkang', 'laut', null, '525201028', 'PKSB9', 2014, 63.00, 14.60, 3107, 4350, 4350, 'ton', '— (ditowel)', '—', null, 'PT Bunga Teratai', 'Sungai Kunjang, Samarinda', 'aktif', null],
            ['BG Syukur 47', 'tongkang', 'laut', null, '525201029', 'PKSC0', 2013, 66.00, 15.20, 3173, 4450, 4450, 'ton', '— (ditowel)', '—', null, 'PT Bunga Teratai', 'Sungai Kunjang, Samarinda', 'aktif', null],
            ['BG Syukur 49', 'tongkang', 'laut', null, '525201030', 'PKSD1', 2016, 68.00, 15.50, 3379, 4750, 4750, 'ton', '— (ditowel)', '—', null, 'PT Bunga Teratai', 'Sungai Kunjang, Samarinda', 'aktif', null],
            ['BG Syukur 53', 'tongkang', 'laut', null, '525201031', 'PKSE2', 2015, 64.00, 14.80, 3117, 4350, 4350, 'ton', '— (ditowel)', '—', null, 'PT Bunga Teratai', 'Sungai Kunjang, Samarinda', 'aktif', null],
            ['BG Syukur 55', 'tongkang', 'laut', null, '525201032', 'PKSF3', 2013, 66.00, 15.20, 3173, 4450, 4450, 'ton', '— (ditowel)', '—', null, 'PT Bunga Teratai', 'Sungai Kunjang, Samarinda', 'aktif', null],
            ['BG Syukur 57', 'tongkang', 'laut', null, '525201033', 'PKSG4', 2013, 66.00, 15.20, 3173, 4450, 4450, 'ton', '— (ditowel)', '—', null, 'PT Bunga Teratai', 'Sungai Kunjang, Samarinda', 'aktif', null],
            ['BG Syukur 59', 'tongkang', 'laut', null, '525201034', 'PKSH5', 2015, 64.00, 14.80, 3117, 4350, 4350, 'ton', '— (ditowel)', '—', null, 'PT Bunga Teratai', 'Sungai Kunjang, Samarinda', 'aktif', null],
            ['BG Syukur 61', 'tongkang', 'laut', null, '525201035', 'PKSJ6', 2015, 64.00, 14.80, 3117, 4350, 4350, 'ton', '— (ditowel)', '—', null, 'PT Bunga Teratai', 'Sungai Kunjang, Samarinda', 'aktif', null],
            ['BG Syukur 71', 'tongkang', 'laut', null, '525201036', 'PKSK7', 2012, 61.00, 14.30, 3099, 4350, 4350, 'ton', '— (ditowel)', '—', null, 'PT Bunga Teratai', 'Sungai Kunjang, Samarinda', 'aktif', null],
            ['BG Syukur 73', 'tongkang', 'laut', null, '525201037', 'PKSL8', 2012, 61.00, 14.30, 3099, 4350, 4350, 'ton', '— (ditowel)', '—', null, 'PT Bunga Teratai', 'Sungai Kunjang, Samarinda', 'aktif', null],
            ['BG Syukur 80', 'tongkang', 'laut', null, '525201038', 'PKSM9', 2017, 67.00, 15.30, 3178, 4450, 4450, 'ton', '— (ditowel)', '—', null, 'PT Bunga Teratai', 'Sungai Kunjang, Samarinda', 'aktif', 'Belum ada berkas fisik di Dokumen_Kapal.'],
            ['BG Syukur 81', 'tongkang', 'laut', null, '525201039', 'PKSN0', 2017, 69.00, 15.60, 3204, 4500, 4500, 'ton', '— (ditowel)', '—', null, 'PT Bunga Teratai', 'Sungai Kunjang, Samarinda', 'aktif', null],
            ['BG Syukur 115', 'tongkang', 'laut', null, '525201040', 'PKSP1', 2016, 62.00, 14.50, 3103, 4350, 4350, 'ton', '— (ditowel)', '—', null, 'PT Bunga Teratai', 'Sungai Kunjang, Samarinda', 'aktif', null],
            ['KM Tata Armada 01', 'tugboat', 'laut', null, '525201041', 'PKSQ2', 2015, 24.00, 7.30, 260, 115, null, null, '2 × CAT C18', 'Diesel', 100, 'PT Tata Armada Bersama', 'Pelabuhan Samarinda', 'aktif', 'Kapal milik PT Tata Armada Bersama (SIUPAL pada materi Dokumen_Kapal), dioperasikan PT Bunga Teratai.'],
        ];

        foreach ($vessels as $v) {
            \App\Models\Vessel::create([
                'vessel_name' => $v[0],
                'vessel_type' => $v[1],
                'navigation_type' => $v[2],
                'imo' => $v[3],
                'mmsi' => $v[4],
                'call_sign' => $v[5],
                'year_built' => $v[6],
                'length_m' => $v[7],
                'beam_m' => $v[8],
                'gt' => $v[9],
                'dwt' => $v[10],
                'capacity_value' => $v[11],
                'capacity_unit' => $v[12],
                'engine_spec' => $v[13],
                'fuel_spec' => $v[14],
                'fuel_baseline_lph' => $v[15],
                'owner' => $v[16],
                'operator' => 'PT Bunga Teratai',
                'base_location' => $v[17],
                'operational_status' => $v[18],
                'notes' => $v[19],
                'registration_number' => strtoupper(substr(preg_replace('/[^A-Za-z0-9]/', '', $v[0]), 0, 3)).'-'.str_pad((string) (100 + \App\Models\Vessel::count()), 4, '0', STR_PAD_LEFT),
                'last_lat' => -0.5020 + (mt_rand(-40, 40) / 10000),
                'last_lng' => 117.1500 + (mt_rand(-40, 40) / 10000),
                'last_position_at' => now()->subMinutes(mt_rand(5, 180)),
            ]);
        }
    }

    /**
     * Dokumen A (perusahaan) + B/C/D (per kapal) dengan requirement_code.
     * Target: 8 kapal 100% siap · 3 kapal <70% (tindak lanjut) · 1 kapal ditinjau.
     * ±5 dokumen expiring ≤30 hari, beberapa kedaluwarsa & tanpa masa berlaku.
     */
    private function seedDocuments(): void
    {
        if (\App\Models\Document::count() > 0) {
            return;
        }

        $uploader = User::where('email', 'dokumen@bungateratai.id')->first()
            ?? User::first();

        // --- Dokumen perusahaan (kelompok A) ---
        $companyDocs = [
            // req_code, nama, nomor, kategori, expiry (null = tanpa masa berlaku), status
            ['A_NIB', 'NIB — Nomor Induk Berusaha', 'NIB-DEMO-001123', 'A2', null, 'verified'],
            ['A_NPWP', 'NPWP Badan PT Bunga Teratai', '00.000.000.0-000.000', 'A1', null, 'verified'],
            ['A_AKTA', 'Akta Pendirian & Perubahan Perseroan', 'AKTA-2018-DEMO', 'A1', null, 'verified'],
            ['A_SK_MENKUMHAM', 'SK Kemenkumham Pendirian Perseroan', 'AHU-001123.AH.01.01', 'A1', null, 'verified'],
            ['A_SIUP', 'SIUP / OSS KBLI 52221', 'NIB-KBLI-52221-DEMO', 'A2', now()->addMonths(8)->toDateString(), 'verified'],
            ['A_IZIN_OPERATOR', 'Izin Operator Kapal (SIUPAL Perusahaan)', 'SIUPAL-DEMO-2024', 'A3', now()->addMonths(10)->toDateString(), 'verified'],
        ];

        foreach ($companyDocs as $d) {
            $doc = \App\Models\Document::create([
                'document_name' => $d[1],
                'category_id' => \App\Models\DocumentCategory::where('code', $d[3])->value('id'),
                'document_number' => $d[2],
                'owner_type' => 'company',
                'owner_id' => null,
                'requirement_code' => $d[0],
                'issue_date' => now()->subYears(2)->toDateString(),
                'has_expiry' => $d[4] !== null,
                'expiry_date' => $d[4],
                'verification_status' => $d[5],
                'uploaded_by' => $uploader->id,
                'responsible_person' => 'Staf Dokumen',
                'archive_location' => 'Lemari Arsip A — Kantor Pusat',
            ]);
            $this->createVersion($doc, $uploader, 'Unggahan awal');
        }

        // --- Dokumen per kapal (B, C, D) ---
        $requirementMeta = [
            'B_STKB' => ['STKB — Surat Tanda Kebangsaan Kapal', 'B1', now()->addYears(3)],
            'B_SURAT_UKUR' => ['Surat Ukur Kapal', 'B2', null],
            'B_AKTA_KEPEMILIKAN' => ['Akta Kepemilikan Kapal', 'B1', null],
            'B_CEK_FISIK' => ['Surat Keterangan Cek Fisik', 'B2', now()->addMonths(11)],
            'B_SHIP_PARTICULARS' => ['Ship Particulars', 'B1', null],
            'B_CALLSIGN' => ['Keterangan Call Sign & MMSI', 'B1', null],
            'C_SKL' => ['Sertifikat Kelayakan Layar (SKL)', 'C1', now()->addMonths(9)],
            'C_SART' => ['Sertifikat Keselamatan Pencarian & Penyelamatan', 'C2', now()->addYears(2)],
            'C_FIRE' => ['Sertifikat Alat Pemadam Kebakaran', 'C2', now()->addMonths(14)],
            'C_RADIO' => ['Sertifikat Radio / GMDSS', 'C2', now()->addMonths(6)],
            'C_PEMERIKSAAN_TAHUNAN' => ['Surat Keterangan Pemeriksaan Tahunan', 'C3', now()->addMonths(4)],
            'C_DRYDOCK' => ['Laporan Drydock / Docking', 'C3', now()->addMonths(7)],
            'D_CREW_LIST' => ['Crew List', 'D1', null],
            'D_SKK' => ['Sertifikat Kompetensi (SKK) Awak', 'D2', now()->addYears(4)],
            'D_MEDICAL' => ['Surat Kesehatan Pelaut (Medical Fitness)', 'D3', now()->addMonths(10)],
            'D_BST' => ['Basic Safety Training (BST)', 'D2', now()->addYears(5)],
        ];

        $skipFor = [
            // Kapal tindak lanjut: requirement sengaja TIDAK dibuat (<90%)
            'BG Syukur 80' => ['C_DRYDOCK', 'C_PEMERIKSAAN_TAHUNAN', 'B_CEK_FISIK', 'D_MEDICAL', 'D_BST', 'C_RADIO', 'D_SKK'],
            'TB Syukur 11' => ['C_DRYDOCK', 'C_PEMERIKSAAN_TAHUNAN', 'B_CEK_FISIK', 'D_MEDICAL', 'D_BST', 'B_STKB'],
            'BG Syukur 29' => ['C_DRYDOCK', 'B_CEK_FISIK', 'D_MEDICAL', 'D_BST', 'C_RADIO', 'B_STKB'],
            'TB Syukur 51' => ['C_DRYDOCK', 'B_CEK_FISIK', 'D_MEDICAL', 'D_BST', 'C_RADIO', 'B_STKB'],
        ];

        // 1 kapal ditinjau: semua dokumen ada, 1 berstatus under_review
        $underReviewVessel = 'TB Syukur 30';

        $expiringSoonDocs = [
            ['KM Prince Soya', 'C_RADIO'], ['TB Syukur 01', 'C_SKL'],
            ['KM Etam Bahari', 'C_PEMERIKSAAN_TAHUNAN'], ['BG Syukur 06', 'B_CEK_FISIK'],
            ['TB Syukur 03', 'D_MEDICAL'],
        ];
        $expiredDocs = [
            ['BG Syukur 03', 'C_FIRE'], ['TB Syukur 23', 'C_RADIO'],
        ];

        foreach (\App\Models\Vessel::orderBy('id')->get() as $vessel) {
            $requirements = $this->vesselRequirementCodes($vessel);
            foreach ($requirements as $code) {
                if (! isset($requirementMeta[$code])) {
                    continue;
                }
                if (in_array($code, $skipFor[$vessel->vessel_name] ?? [], true)) {
                    continue;
                }

                [$name, $catCode, $expiry] = $requirementMeta[$code];

                // variasi masa berlaku
                if (in_array($code, ['B_SHIP_PARTICULARS', 'D_CREW_LIST'], true)) {
                    $expiry = null;
                }

                $status = 'verified';

                // 5 dokumen expiring ≤30 hari
                foreach ($expiringSoonDocs as $flag) {
                    if ($flag[0] === $vessel->vessel_name && $flag[1] === $code) {
                        $expiry = now()->addDays(mt_rand(4, 28))->toDateString();
                    }
                }
                // 2 dokumen sudah kedaluwarsa
                foreach ($expiredDocs as $flag) {
                    if ($flag[0] === $vessel->vessel_name && $flag[1] === $code) {
                        $expiry = now()->subDays(mt_rand(10, 60))->toDateString();
                        $status = 'uploaded';
                    }
                }
                // 1 kapal ditinjau: 1 dokumen under_review
                if ($vessel->vessel_name === $underReviewVessel && $code === 'C_SKL') {
                    $status = 'under_review';
                }

                $doc = \App\Models\Document::create([
                    'document_name' => $name,
                    'category_id' => \App\Models\DocumentCategory::where('code', $catCode)->value('id'),
                    'document_number' => strtoupper(preg_replace('/[^A-Z0-9]/', '', substr($vessel->vessel_name, 0, 4))).'-'.str_pad((string) mt_rand(100, 9999), 4, '0', STR_PAD_LEFT),
                    'owner_type' => 'vessel',
                    'owner_id' => $vessel->id,
                    'requirement_code' => $code,
                    'issue_date' => now()->subMonths(mt_rand(3, 30))->toDateString(),
                    'has_expiry' => $expiry !== null,
                    'expiry_date' => $expiry,
                    'verification_status' => $status,
                    'uploaded_by' => $uploader->id,
                    'responsible_person' => 'Staf Dokumen',
                    'archive_location' => 'Lemari Arsip B — Folder '.$vessel->vessel_name,
                    'notes' => $status === 'under_review' ? 'Menunggu pemeriksaan supervisor.' : null,
                ]);
                $this->createVersion($doc, $uploader, 'Unggahan awal');
            }
        }

        app(\App\Services\ReminderService::class)->sync();
    }

    /** @return string[] */
    private function vesselRequirementCodes(\App\Models\Vessel $vessel): array
    {
        return app(\App\Services\DocumentCompletenessService::class)
            ->applicableVesselRequirements($vessel)
            ->pluck('code')
            ->all();
    }

    private function createVersion(\App\Models\Document $doc, User $uploader, string $note): void
    {
        // file demo placeholder (tanpa file fisik — unduh menampilkan 404 hingga upload nyata)
        $version = \App\Models\DocumentVersion::create([
            'document_id' => $doc->id,
            'version_number' => 1,
            'file_path' => 'documents/demo-placeholder.txt',
            'file_mime' => 'text/plain',
            'file_size' => 128,
            'uploaded_at' => $doc->created_at ?? now(),
            'uploaded_by' => $uploader->id,
            'revision_notes' => $note,
        ]);
        $doc->update(['current_version_id' => $version->id]);
    }

    private function seedInventory(): void
    {
        if (\App\Models\InventoryItem::count() > 0) {
            return;
        }

        $items = [
            ['SP-OLI-20L', 'Oli Mesin Utama 20L', 'habis_pakai', 'pail', 480000, true, true, 4],
            ['SP-OLI-HYD', 'Oli Hidraulik 20L', 'habis_pakai', 'pail', 520000, true, true, 3],
            ['SP-FILTER-O', 'Filter Oli Mesin', 'sparepart', 'pcs', 350000, false, false, 6],
            ['SP-FILTER-A', 'Filter Udara', 'sparepart', 'pcs', 275000, false, false, 6],
            ['SP-BAKAR-40', 'Bakar Lampu Halogen 40W', 'sparepart', 'pcs', 45000, true, false, 20],
            ['SP-KAWAT-L', 'Kawat Las 2kg', 'sparepart', 'batang', 85000, true, false, 10],
            ['SP-ROPE-22', 'Tali Tambang PP 22mm (20m)', 'sparepart', 'roll', 650000, false, false, 4],
            ['SP-LIFE-JKT', 'Life Jacket Dewasa', 'ppe', 'pcs', 385000, false, false, 24],
            ['SP-APAR-9KG', 'APAR Dry Chemical 9kg', 'ppe', 'pcs', 620000, false, true, 10],
            ['SP-MASKER-R', 'Masker Respirator', 'habis_pakai', 'pcs', 18000, true, true, 50],
            ['SP-GLOVE', 'Sarung Tangan Kerja', 'ppe', 'pasang', 25000, true, false, 30],
            ['SP-BISCUIT', 'Biskuit ABK (karton)', 'konsumsi', 'karton', 95000, true, true, 8],
            ['SP-AIR-MIN', 'Air Mineral Galon 19L', 'konsumsi', 'galon', 21000, true, false, 15],
            ['SP-RAGUM', 'Ragum Kecil', 'sparepart', 'pcs', 875000, false, false, 2],
            ['SP-SEAL-KIT', 'Seal Kit Pompa', 'sparepart', 'set', 1450000, false, false, 3],
            ['SP-COUPON', 'Coupon Valve 1"', 'sparepart', 'pcs', 210000, false, false, 5],
            ['SP-GREASE', 'Grease Teflon (tub)', 'habis_pakai', 'tub', 125000, true, true, 5],
            ['SP-WELD-ROD', 'Kawat Elektroda 3.2mm', 'sparepart', 'kg', 42000, true, false, 25],
            ['SP-PAINT-M', 'Marine Paint Putih (pail)', 'habis_pakai', 'pail', 780000, true, true, 3],
            ['SP-BATTERY', 'Aki Kering 12V', 'sparepart', 'pcs', 1250000, false, true, 4],
        ];

        foreach ($items as [$sku, $name, $cat, $unit, $price, $consumable, $perishable, $min]) {
            $item = \App\Models\InventoryItem::create([
                'sku' => $sku,
                'name' => $name,
                'category' => $cat,
                'unit' => $unit,
                'unit_price' => $price,
                'is_consumable' => $consumable,
                'is_perishable' => $perishable,
                'min_stock' => $min,
            ]);
            $qty = $min * mt_rand(2, 5);
            \App\Models\InventoryBalance::create(['item_id' => $item->id, 'location_type' => 'kantor', 'qty' => $qty]);
            if ($perishable) {
                \App\Models\InventoryBatch::create([
                    'item_id' => $item->id,
                    'location_type' => 'kantor',
                    'batch_no' => 'B'.strtoupper(substr($sku, -4)).'-'.mt_rand(100, 999),
                    'qty' => (int) ceil($qty / 2),
                    'expires_at' => now()->addDays(mt_rand(-10, 200))->toDateString(), // sebagian expired/awning
                ]);
            }
        }

        // Stok awal di beberapa kapal
        foreach (\App\Models\Vessel::where('vessel_type', '!=', 'tongkang')->take(6)->get() as $vessel) {
            foreach (\App\Models\InventoryItem::inRandomOrder()->take(6)->get() as $item) {
                \App\Models\InventoryBalance::create([
                    'item_id' => $item->id,
                    'location_type' => 'vessel',
                    'vessel_id' => $vessel->id,
                    'qty' => mt_rand(1, 8),
                ]);
            }
        }
    }

    /**
     * Crew dari materi CREWING: 366 ABK nyata (Data Crew) + roster detail per
     * kapal (Crew List) + register OFF + kadet Prala + sertifikat buku pelaut/ANT
     * + gaji persis tabel gAJI + kantor (H. Syarif, H. Ariyanto, Capt Azwar).
     */

    /** Tanggal valid 'Y-m-d' dari data klien; selain itu -> fallback (default null). */
    private function asDate($value, ?string $fallback = null): ?string
    {
        if ($value instanceof \Carbon\Carbon || $value instanceof \DateTimeInterface) {
            return $value->format('Y-m-d');
        }
        if ($value === null) {
            return $fallback;
        }
        $s = is_string($value) ? trim($value) : (string) $value;
        if ($s === '') {
            return $fallback;
        }
        if (preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $s, $m) && checkdate((int) $m[2], (int) $m[3], (int) $m[1])) {
            return $s;
        }
        return $fallback;
    }
    private function seedHr(): void
    {
        if (\App\Models\Crew::count() > 0) {
            return;
        }

        $gaji = require __DIR__.'/data/gaji.php';
        $salaryBySlug = [];
        foreach ($gaji['salary'] as $label => $amount) {
            $salaryBySlug[\App\Enums\CrewRank::fromLabel($label)] = (int) $amount;
        }

        $antMap = [
            'ANT IV M' => 'ant_iv_m', 'ANT V M' => 'ant_iv_m', 'ANT IV' => 'ant_iv',
            'ANT III M' => 'ant_iii_m', 'ANT III' => 'ant_iii',
            'ATT IV M' => 'att_iv_m', 'ATT IV' => 'att_iv',
            'ATT III M' => 'att_iii_m', 'ATT III' => 'att_iii',
        ];

        $byName = [];
        $byKode = [];
        $kodeUsed = [];

        foreach (require __DIR__.'/data/crews.php' as $c) {
            $rank = \App\Enums\CrewRank::fromLabel($c['rank_label']);
            $vesselId = $this->resolveVesselId($c['vessel']);
            $kode = $c['kode_nik'] ?? null;
            if ($kode !== null) {
                if (isset($kodeUsed[$kode])) {
                    $kodeUsed[$kode]++;
                    $kode = $kode.'-'.$kodeUsed[$kode];
                } else {
                    $kodeUsed[$kode] = 1;
                }
            }

            $crew = \App\Models\Crew::create([
                'kode_nik' => $kode,
                'name' => $c['name'],
                'name_ktp' => $c['name_ktp'],
                'nik' => $c['nik'],
                'birth_place' => $c['birth_place'],
                'birth_date' => $this->asDate($c['birth_date']),
                'religion' => $c['religion'],
                'mother_name' => $c['mother_name'],
                'bank_account' => $c['bank_account'],
                'address' => $c['address'],
                'npwp' => $c['npwp'],
                'seafarer_code' => $c['seafarer_code'],
                'sccw' => $c['sccw'],
                'stcw_reference' => $c['stcw'],
                'no_ijazah' => $c['no_ijazah'],
                'no_pkl' => $c['no_pkl'],
                'no_surat_mutasi' => $c['no_surat_mutasi'],
                'is_blacklist' => $c['blacklist'],
                'joined_on' => $this->asDate($c['join_date']),
                'rank' => $rank,
                'base_salary' => $salaryBySlug[$rank] ?? 3800000,
                'status' => $vesselId ? 'aktif' : 'selesai',
            ]);

            $byName[mb_strtolower($c['name'])] = $crew;
            if ($c['kode_nik']) {
                $byKode[$c['kode_nik']] = $crew;
            }

            if ($c['buku_no']) {
                \App\Models\CrewCertificate::create([
                    'crew_id' => $crew->id,
                    'cert_type' => 'buku_pelaut',
                    'number' => $c['buku_no'],
                    'issued_at' => null,
                    'has_expiry' => $c['buku_exp'] !== null,
                    'expiry_date' => $this->asDate($c['buku_exp']),
                ]);
            }
            $sccwKey = mb_strtoupper(trim((string) $c['sccw']));
            if ($c['sccw'] !== null && isset($antMap[$sccwKey])) {
                \App\Models\CrewCertificate::create([
                    'crew_id' => $crew->id,
                    'cert_type' => $antMap[$sccwKey],
                    'number' => $c['seafarer_code'],
                    'issued_at' => null,
                    'has_expiry' => false,
                    'expiry_date' => null,
                ]);
            }

            if ($vesselId) {
                \App\Models\CrewAssignment::create([
                    'crew_id' => $crew->id,
                    'vessel_id' => $vesselId,
                    'role' => $c['rank_label'] ?? (\App\Enums\CrewRank::tryFrom($rank)?->label() ?? $rank),
                    'start_date' => $this->asDate($c['join_date'], now()->subYear()->toDateString()),
                    'status' => 'aktif',
                ]);
            }
        }

        // Overlay roster detail per kapal (Crew List: buku pelaut, PKL, ANT, sign-on)
        foreach (require __DIR__.'/data/ship_roster.php' as $vesselName => $rows) {
            $vesselId = $this->resolveVesselId($vesselName);
            if (! $vesselId) {
                continue;
            }
            foreach ($rows as $r) {
                $key = mb_strtolower(trim($r['name']));
                $rank = \App\Enums\CrewRank::fromLabel($r['rank_label']);
                $crew = $byName[$key] ?? null;
                if (! $crew) {
                    $crew = \App\Models\Crew::create([
                        'name' => trim($r['name']),
                        'rank' => $rank,
                        'base_salary' => $salaryBySlug[$rank] ?? 3800000,
                        'seafarer_code' => $r['seafarer_code'],
                        'no_pkl' => $r['no_pkl'],
                        'sccw' => $r['sccw'],
                        'joined_on' => $this->asDate($r['sign_on']),
                        'status' => 'aktif',
                    ]);
                    $byName[$key] = $crew;
                } else {
                    $crew->update([
                        'seafarer_code' => $r['seafarer_code'] ?? $crew->seafarer_code,
                        'no_pkl' => $r['no_pkl'] ?? $crew->no_pkl,
                        'sccw' => $r['sccw'] ?? $crew->sccw,
                        'stcw_reference' => $r['stcw'] ?? $crew->stcw_reference,
                    ]);
                }

                if ($r['buku_no']) {
                    $hasBook = $crew->certificates()
                        ->where('cert_type', 'buku_pelaut')
                        ->where('number', $r['buku_no'])
                        ->exists();
                    if (! $hasBook) {
                        \App\Models\CrewCertificate::create([
                            'crew_id' => $crew->id,
                            'cert_type' => 'buku_pelaut',
                            'number' => $r['buku_no'],
                            'has_expiry' => $r['buku_exp'] !== null,
                            'expiry_date' => $this->asDate($r['buku_exp']),
                        ]);
                    }
                }

                // Penempatan aktif dgn sign-on sesuai materi
                $crew->assignments()->where('status', 'aktif')->get()->each(function ($a) {
                    $a->update(['status' => 'berakhir', 'end_date' => now()->toDateString()]);
                });
                \App\Models\CrewAssignment::create([
                    'crew_id' => $crew->id,
                    'vessel_id' => $vesselId,
                    'role' => $r['rank_label'],
                    'start_date' => $this->asDate($r['sign_on'], now()->subMonths(6)->toDateString()),
                    'status' => 'aktif',
                ]);
                $crew->update(['status' => 'aktif']);
            }
        }

        // Register OFF klien -> gerakan historis sign_off (dgn no surat BT-OFF)
        foreach (require __DIR__.'/data/crew_off.php' as $o) {
            if (! $o['off_date']) {
                continue;
            }
            $crew = null;
            if ($o['nik'] && isset($byKode[$o['nik']])) {
                $crew = $byKode[$o['nik']];
            }
            if (! $crew && isset($byName[mb_strtolower($o['name'])])) {
                $crew = $byName[mb_strtolower($o['name'])];
            }
            if (! $crew) {
                continue;
            }
            $reason = \App\Enums\CrewOffReason::fromLabel($o['reason']);
            $active = $crew->assignments()->where('status', 'aktif')->latest('id')->first();

            \App\Models\CrewMovement::create([
                'crew_id' => $crew->id,
                'vessel_id' => $active?->vessel_id,
                'type' => \App\Enums\CrewMovementType::SignOff->value,
                'role' => \App\Enums\CrewRank::tryFrom($crew->rank)?->label() ?? $crew->rank,
                'movement_date' => $this->asDate($o['off_date'], now()->toDateString()),
                'reason' => $reason,
                'no_surat' => $o['letter_no'],
                'notes' => 'Tercatat dari register OFF klien.',
            ]);
        }

        $letters = require __DIR__.'/data/crew_letters.php';

        // Contoh Surat Pemberhentian (MUTASI OFF) 0105/BT-OFF/X/2026 — Fransiskho K.A Lumape
        $mutOff = $letters['mutasi_off_sample'] ?? null;
        if ($mutOff && ! empty($mutOff['name'])) {
            $crew = null;
            if (! empty($mutOff['nip']) && isset($byKode[$mutOff['nip']])) {
                $crew = $byKode[$mutOff['nip']];
            }
            if (! $crew && isset($byName[mb_strtolower($mutOff['name'])])) {
                $crew = $byName[mb_strtolower($mutOff['name'])];
            }
            if ($crew) {
                $vesselId = $this->resolveVesselId($mutOff['vessel'] ?? null);
                \App\Models\CrewMovement::create([
                    'crew_id' => $crew->id,
                    'vessel_id' => $vesselId,
                    'type' => \App\Enums\CrewMovementType::SignOff->value,
                    'role' => \App\Enums\CrewRank::tryFrom($crew->rank)?->label() ?? $crew->rank,
                    'movement_date' => '2026-10-15',
                    'reason' => \App\Enums\CrewOffReason::SelesaiKontrak->value,
                    'no_surat' => $mutOff['letter_no'],
                    'notes' => 'Surat pemberhentian contoh dari materi MUT OFF.',
                ]);
            }
        }

        // Contoh Surat Permohonan Sijil ON 0547/AG/BT-ADM/X/2026 (TB Syukur 62)
        $sijil = $letters['sijil_on_sample'] ?? null;
        $tb62 = $this->resolveVesselId('TB Syukur 62');
        if ($sijil && $tb62 && ! empty($sijil['crew'])) {
            $ids = [];
            foreach ($sijil['crew'] as $row) {
                $key = mb_strtolower($row['name']);
                $crew = $byName[$key] ?? null;
                if (! $crew) {
                    $rank = \App\Enums\CrewRank::fromLabel($row['rank_label']);
                    $crew = \App\Models\Crew::create([
                        'name' => $row['name'],
                        'rank' => $rank,
                        'base_salary' => $salaryBySlug[$rank] ?? 3800000,
                        'status' => 'aktif',
                    ]);
                    $byName[$key] = $crew;
                }
                \App\Models\CrewAssignment::create([
                    'crew_id' => $crew->id,
                    'vessel_id' => $tb62,
                    'role' => $crew->rank,
                    'start_date' => '2026-10-20',
                    'status' => 'aktif',
                ]);
                $crew->update(['status' => 'aktif']);
                $ids[] = $crew->id;
            }
            \App\Models\SijilRequest::create([
                'no_surat' => $sijil['letter_no'] ?? null,
                'letter_date' => '2026-10-20',
                'kind' => 'on',
                'vessel_id' => $tb62,
                'crew_ids' => $ids,
                'signed_by' => 'Capt Azwar Saputra',
                'status' => 'terbit',
                'notes' => 'Contoh surat dari materi CREWING (S. PERMOHONAN ON).',
            ]);
        }

        // Kadet Prala (Format crew ON OFF kadet)
        foreach (require __DIR__.'/data/kadets.php' as $k) {
            $rank = \App\Enums\CrewRank::fromLabel($k['rank_label']);
            $vesselId = $this->resolveVesselId($k['vessel']);
            $active = $k['pkl_date'] !== null && $vesselId !== null && $k['pkl_date'] >= '2026-01-01';

            $crew = \App\Models\Crew::create([
                'name' => $k['name'],
                'birth_place' => $k['birth_place'],
                'birth_date' => $this->asDate($k['birth_date']),
                'address' => $k['address'],
                'seafarer_code' => $k['seafarer_code'],
                'school_origin' => $k['school'],
                'nit' => $k['nit'],
                'joined_on' => $this->asDate($k['pkl_date']),
                'rank' => $rank,
                'base_salary' => 0, // kadet prala — tanpa gaji pokok
                'status' => $active ? 'aktif' : 'selesai',
            ]);

            if ($k['buku_no']) {
                \App\Models\CrewCertificate::create([
                    'crew_id' => $crew->id,
                    'cert_type' => 'buku_pelaut',
                    'number' => $k['buku_no'],
                    'has_expiry' => $k['buku_exp'] !== null,
                    'expiry_date' => $this->asDate($k['buku_exp']),
                ]);
            }
            if ($active) {
                \App\Models\CrewAssignment::create([
                    'crew_id' => $crew->id,
                    'vessel_id' => $vesselId,
                    'role' => (\App\Enums\CrewRank::tryFrom($rank)?->label() ?? $rank),
                    'start_date' => $this->asDate($k['pkl_date'], now()->toDateString()),
                    'status' => 'aktif',
                ]);
            }
            if ($k['pkl_date']) {
                \App\Models\CrewMovement::create([
                    'crew_id' => $crew->id,
                    'vessel_id' => $vesselId,
                    'type' => \App\Enums\CrewMovementType::KadetOn->value,
                    'role' => (\App\Enums\CrewRank::tryFrom($rank)?->label() ?? $rank),
                    'movement_date' => $this->asDate($k['pkl_date'], now()->toDateString()),
                    'notes' => 'Tercatat dari register kadet klien (Prala).',
                ]);
            }
        }

        $offices = [
            ['H. Syarif', 'Direktur Utama', 'Direksi'],
            ['H. Ariyanto', 'Kepala Operasional', 'Operasional'],
            ['Capt. Azwar Saputra', 'Nakhoda Senior', 'Operasional'],
            ['Hj. Siti Aminah', 'Direktur Utama', 'Direksi'],
            ['Drs. Halim Kusuma', 'Direktur Operasional', 'Operasional'],
            ['Rina Kartika', 'Staf Dokumen', 'Operasional'],
            ['Ahmad Fauzan', 'Supervisor Pelayaran', 'Operasional'],
            ['Dewi Lestari', 'Staf Keuangan', 'Keuangan'],
            ['Bagus Prakoso', 'Akuntan', 'Keuangan'],
            ['Nurul Hidayah', 'Admin Gudang', 'Operasional'],
            ['Yusuf Maulana', 'HR & GA', 'Umum'],
            ['Fitri Handayani', 'Akuntan Junior', 'Keuangan'],
            ['Rizky Ramadhan', 'IT Support', 'Umum'],
            ['Wulan Sari', 'Sekretaris', 'Umum'],
            ['Irfan Hakim', 'Staf Operasional', 'Operasional'],
            ['Melati Anggraini', 'Staf Keuangan', 'Keuangan'],
            ['Doni Saputra', 'Security', 'Umum'],
            ['Endang Purwanto', 'Bendahara', 'Keuangan'],
        ];

        foreach ($offices as [$name, $position, $dept]) {
            if (\App\Models\OfficeEmployee::where('name', $name)->exists()) {
                continue;
            }
            \App\Models\OfficeEmployee::create([
                'name' => $name,
                'nik' => '6471'.mt_rand(1000000000, 9999999999),
                'npwp' => sprintf('8%d.%03d.%03d.000-%03d', mt_rand(10, 99), mt_rand(100, 999), mt_rand(100, 999), mt_rand(100, 999)),
                'position' => $position,
                'department' => $dept,
                'join_date' => now()->subYears(mt_rand(1, 10))->toDateString(),
                'status' => 'aktif',
                'base_salary' => match ($dept) {
                    'Direksi' => 25000000, 'Keuangan' => 7000000, 'Operasional' => 6000000, default => 5000000,
                },
                'allowances' => mt_rand(5, 20) * 100000,
            ]);
        }
    }

    private function seedAssets(): void
    {
        if (\App\Models\Asset::count() > 0) {
            return;
        }

        $assets = [
            ['KM Prince Soya (kapal penumpang)', 'kapal', 45000000000, 300, \App\Models\Vessel::where('vessel_name', 'KM Prince Soya')->value('id')],
            ['TB Syukur 01', 'kapal', 9500000000, 180, \App\Models\Vessel::where('vessel_name', 'TB Syukur 01')->value('id')],
            ['BG Syukur 03', 'tongkang', 6200000000, 240, \App\Models\Vessel::where('vessel_name', 'BG Syukur 03')->value('id')],
            ['Gudang & Kantor Sungai Kunjang', 'peralatan', 2500000000, 120, null],
            ['Kendaraan Operasional Double Cabin', 'kendaraan', 850000000, 60, null],
            ['Peralatan Bengkel & Las', 'peralatan', 1200000000, 84, null],
        ];

        foreach ($assets as [$name, $cat, $cost, $life, $vesselId]) {
            $asset = \App\Models\Asset::create([
                'name' => $name,
                'category' => $cat,
                'acquisition_cost' => $cost,
                'acquisition_date' => now()->subMonths(mt_rand(12, 48))->toDateString(),
                'useful_life_months' => $life,
                'salvage_value' => round($cost * 0.05),
                'vessel_id' => $vesselId,
                'status' => 'aktif',
            ]);
            // akumulasi penyusutan 3 bulan awal (jurnal dibuat saat runDepreciation; di sisi seed cukup angka)
            $monthly = ($cost - round($cost * 0.05)) / $life;
            $asset->update(['accumulated_depreciation' => round($monthly * 3, 2)]);
        }
    }

    private function seedMasterFinanceParties(): void
    {
        if (\App\Models\Customer::count() > 0) {
            return;
        }

        $customers = [
            ['PT Kaltim Batu Bara Persada', 'batu bara'],
            ['PT Samarinda Sejahtera Abadi', 'kontraktor'],
            ['PT Borneo Energi Lestari', 'batu bara'],
            ['KSOP Kelas I Samarinda', 'pemerintah'],
            ['PT Kutai Martime Line', 'pelayaran'],
            ['PT Indominco Mandiri', 'batu bara'],
            ['PT Sangatta Coal Terminal', 'batu bara'],
            ['Umum / Penumpang Tiket', 'tiket'],
        ];
        foreach ($customers as [$name, $note]) {
            \App\Models\Customer::create([
                'name' => $name,
                'npwp' => sprintf('0%d.%03d.%03d.0-%02d.%03d', mt_rand(1, 99), mt_rand(100, 999), mt_rand(100, 999), mt_rand(10, 99), crc32($name) % 1000),
                'address' => 'Samarinda, Kalimantan Timur',
                'phone' => '0541-'.mt_rand(200000, 999999),
                'notes' => 'DEMO DATA — sektor '.$note,
            ]);
        }

        $suppliers = [
            ['Galangan Kapal Teluk Bajo', 'bengkel'],
            ['PT Sumber Part Nusantara', 'sparepart'],
            ['TB Mitra Pemandu Samarinda', 'operator_lain'],
            ['PT Borneo Fuel Energy', 'lainnya'],
            ['PT Dermaga Makmur Sejahtera', 'lainnya'],
            ['Bengkel Kapal Loa Buah', 'bengkel'],
        ];
        foreach ($suppliers as [$name, $cat]) {
            \App\Models\Supplier::create([
                'name' => $name,
                'category' => $cat,
                'address' => 'Samarinda, Kalimantan Timur',
                'phone' => '0541-'.mt_rand(200000, 999999),
                'notes' => 'DEMO DATA',
            ]);
        }
    }

    private function seedVoyages(): void
    {
        if (\App\Models\Voyage::count() > 0) {
            return;
        }

        $workflow = app(\App\Services\VoyageWorkflowService::class);
        $admin = User::where('email', 'ops@bungateratai.id')->first() ?? User::first();
        $supervisor = User::where('email', 'supervisor@bungateratai.id')->first();

        $tb = fn (string $name) => \App\Models\Vessel::where('vessel_name', $name)->value('id');
        $bg = fn (string $name) => \App\Models\Vessel::where('vessel_name', $name)->value('id');

        // [status_target, tug, barge, tujuan, muatan, ton, hari_lalu/ke_depan]
        $specs = [
            // 4 menunggu pemeriksaan internal (pending review)
            ['internal_review', 'TB Syukur 01', 'BG Syukur 03', 'Bontang', 'batu_bara', 1500, 2],
            ['internal_review', 'TB Syukur 03', 'BG Syukur 07', 'Balikpapan', 'batu_bara', 1800, 3],
            ['awaiting_external_approval', 'TB Syukur 23', 'BG Syukur 06', 'Tanjung Redeb', 'sawit', 900, 4],
            ['document_preparation', 'TB Syukur 11', 'BG Syukur 03', 'Sangatta', 'batu_bara', 1600, 5],
            // 2 aktif non-review (siap/berangkat/dalam pelayaran)
            ['in_transit', 'TB Syukur 01', 'BG Syukur 07', 'Taboneo', 'batu_bara', 1400, -2],
            ['departed', 'TB Syukur 03', 'BG Syukur 06', 'Marunda', 'semen', 1200, -1],
            // 4 completed
            ['completed', 'TB Syukur 01', 'BG Syukur 03', 'Bontang', 'batu_bara', 1500, -30],
            ['completed', 'TB Syukur 03', 'BG Syukur 07', 'Balikpapan', 'batu_bara', 1700, -45],
            ['completed', 'TB Syukur 23', 'BG Syukur 06', 'Tanjung Harapan', 'batu_bara', 1100, -60],
            ['completed', 'TB Syukur 11', 'BG Syukur 03', 'Sangatta', 'curah_lain', 800, -75],
            // 1 delayed + 1 cancelled (variasi status)
            ['delayed', 'TB Syukur 01', 'BG Syukur 03', 'Bontang', 'batu_bara', 1300, 1],
            ['cancelled', 'TB Syukur 03', 'BG Syukur 07', 'Penajam', 'semen', 700, -5],
        ];

        foreach ($specs as $i => [$target, $tug, $barge, $dest, $cargo, $ton, $offset]) {
            $departAt = now()->addDays($offset)->startOfHour();
            $voyage = \App\Models\Voyage::create([
                'voyage_code' => sprintf('VYG-%d-%04d', now()->year, $i + 1),
                'vessel_id' => $tb($tug),
                'route_type' => 'kombinasi',
                'origin' => 'Samarinda',
                'destination' => $dest,
                'planned_departure' => $departAt,
                'estimated_arrival' => $departAt->copy()->addDays(2),
                'voyage_status' => 'draft',
                'activity_type' => 'towing',
                'person_in_charge' => 'Andi (Operator)',
                'customer_id' => \App\Models\Customer::inRandomOrder()->value('id'),
                'contract_no' => 'KTR-DEMO-'.str_pad((string) ($i + 1), 3, '0', STR_PAD_LEFT),
                'external_approval_status' => 'menunggu',
                'notes' => 'DEMO DATA perjalanan tongkang.',
            ]);

            \App\Models\VesselRelationship::create([
                'voyage_id' => $voyage->id,
                'tugboat_id' => $tb($tug),
                'barge_id' => $bg($barge),
            ]);
            \App\Models\VoyageCargo::create([
                'voyage_id' => $voyage->id,
                'commodity_type' => $cargo,
                'weight_ton' => $ton,
                'origin' => 'Samarinda',
                'destination' => $dest,
            ]);
            $workflow->buildChecklist($voyage);

            // Dokumen perjalanan lengkap untuk yang completed / sebagian untuk lainnya
            $needsFullDocs = in_array($target, ['completed', 'in_transit', 'departed', 'awaiting_external_approval'], true);
            $docCodes = $needsFullDocs
                ? ['E_SPB', 'E_SURAT_NAKHODA', 'E_MANIFEST', 'E_KONTRAK', 'E_BUKTI_TIMBANG', 'F_LAPORAN_BERANGKAT']
                : ['E_SPB'];
            if ($target === 'completed') {
                $docCodes[] = 'F_LAPORAN_TIBA';
                $docCodes[] = 'F_PENUTUPAN';
                $docCodes[] = 'F_BUKTI_BONGKAR';
            }
            foreach ($docCodes as $code) {
                $req = \App\Models\DocumentRequirement::where('code', $code)->first();
                $cat = \App\Models\DocumentCategory::where('group_code', $req?->group_code)->first();
                if (! $req || ! $cat) {
                    continue;
                }
                $doc = \App\Models\Document::create([
                    'document_name' => $req->name.' — '.$voyage->voyage_code,
                    'category_id' => $cat->id,
                    'document_number' => $voyage->voyage_code.'-'.str_replace('E_', '', str_replace('F_', '', $code)),
                    'owner_type' => 'vessel',
                    'owner_id' => $voyage->vessel_id,
                    'requirement_code' => $code,
                    'issue_date' => $departAt->copy()->subDays(2)->toDateString(),
                    'has_expiry' => false,
                    'verification_status' => 'verified',
                    'uploaded_by' => $admin->id,
                ]);
                $this->createVersion($doc, $admin, 'Unggahan perjalanan');
                $voyage->documents()->attach($doc->id);
            }
            $workflow->refreshChecklistCompletion($voyage);

            // Untuk perjalanan yang maju sampai menunggu persetujuan eksternal:
            // seluruh checklist wajib dianggap terpenuhi (dokumen demo sudah dilampirkan)
            if (in_array($target, ['awaiting_external_approval', 'ready_for_departure', 'departed', 'in_transit', 'arrived', 'voyage_closure', 'completed'], true)) {
                $voyage->checklists()->where('applicability', 'wajib')->update(['completion_status' => 'terpenuhi']);
            }

            // Majukan status sesuai target
            $order = ['draft', 'planned', 'document_preparation', 'internal_review', 'awaiting_external_approval', 'ready_for_departure', 'departed', 'in_transit', 'arrived', 'voyage_closure', 'completed'];

            if (in_array($target, ['awaiting_external_approval', 'ready_for_departure', 'departed', 'in_transit', 'arrived', 'voyage_closure', 'completed'], true)) {
                // Tahap internal: sampai awaiting_external_approval
                $preSteps = array_slice($order, 0, array_search('awaiting_external_approval', $order, true) + 1);
                foreach ($preSteps as $s) {
                    if ($s === 'internal_review') {
                        $workflow->transition($voyage, $s);
                        \App\Models\Approval::create([
                            'approvable_type' => 'voyage',
                            'approvable_id' => $voyage->id,
                            'approver_id' => $supervisor?->id,
                            'approval_scope' => 'internal',
                            'approval_status' => 'approved',
                            'comments' => 'Berkas lengkap — DEMO DATA',
                            'decision_timestamp' => $departAt->copy()->subDay(),
                        ]);
                        continue;
                    }
                    $workflow->transition($voyage, $s);
                }

                if (in_array($target, ['ready_for_departure', 'departed', 'in_transit', 'arrived', 'voyage_closure', 'completed'], true)) {
                    $workflow->confirmExternalApproval(
                        $voyage,
                        \Illuminate\Http\UploadedFile::fake()->create('persetujuan-eksternal.pdf', 64, 'application/pdf'),
                        'Surat Persetujuan KSOP Samarinda (DEMO) No. '.($i + 100).'/KSOP/2026',
                    );
                    $rest = array_slice(
                        $order,
                        array_search('ready_for_departure', $order, true),
                        array_search($target, $order, true) - array_search('ready_for_departure', $order, true) + 1,
                    );
                    foreach ($rest as $s) {
                        $workflow->transition($voyage, $s, $s === 'ready_for_departure'
                            ? 'Override kesiapan awak (seed — roster diverifikasi dari materi klien).'
                            : null);
                    }
                }
            } else {
                $steps = array_slice($order, 0, array_search($target, $order, true) + 1);
                foreach ($steps as $s) {
                    $workflow->transition($voyage, $s);
                }
            }

            // delayed/cancelled flags
            if ($target === 'delayed') {
                if ($voyage->fresh()->voyage_status === 'draft') {
                    $workflow->transition($voyage, 'planned');
                }
                $workflow->transition($voyage->fresh(), 'delayed', 'Cuaca buruk di muara');
            }
            if ($target === 'cancelled') {
                $workflow->transition($voyage->fresh(), 'cancelled', 'Customer membatalkan');
            }
        }

        // 3 kapal penumpang
        $passengerSpecs = [
            ['KM Prince Soya', 'Bontang', -3, 'completed', 1650, 1580],
            ['KM Prince Soya', 'Tanjung Redeb', 1, null, 1800, 1420],
            ['KM Etam Bahari', 'Tenggarong', -1, null, 320, 280],
        ];
        $base = \App\Models\Voyage::count();
        foreach ($passengerSpecs as $j => [$vesselName, $dest, $offset, $target, $cap, $tickets]) {
            $departAt = now()->addDays($offset)->startOfHour();
            $voyage = \App\Models\Voyage::create([
                'voyage_code' => sprintf('VYG-%d-%04d', now()->year, $base + $j + 1),
                'vessel_id' => \App\Models\Vessel::where('vessel_name', $vesselName)->value('id'),
                'route_type' => 'laut',
                'origin' => 'Samarinda',
                'destination' => $dest,
                'planned_departure' => $departAt,
                'estimated_arrival' => $departAt->copy()->addHours(8),
                'voyage_status' => 'draft',
                'activity_type' => 'penumpang',
                'person_in_charge' => 'Budi (Ops Penumpang)',
                'external_approval_status' => 'tidak_diperlukan',
                'capacity' => $cap,
                'tickets_sold' => $tickets,
                'notes' => 'DEMO DATA pelayaran penumpang.',
            ]);
            $workflow->buildChecklist($voyage);

            foreach (['E_SPB', 'E_MANIFEST_PENUMPANG', 'E_REKAP_TIKET', 'F_LAPORAN_BERANGKAT'] as $code) {
                $req = \App\Models\DocumentRequirement::where('code', $code)->first();
                $cat = \App\Models\DocumentCategory::where('group_code', $req?->group_code)->first();
                if (! $req || ! $cat) {
                    continue;
                }
                $doc = \App\Models\Document::create([
                    'document_name' => $req->name.' — '.$voyage->voyage_code,
                    'category_id' => $cat->id,
                    'document_number' => $voyage->voyage_code.'-P',
                    'owner_type' => 'vessel',
                    'owner_id' => $voyage->vessel_id,
                    'requirement_code' => $code,
                    'issue_date' => $departAt->copy()->subDay()->toDateString(),
                    'has_expiry' => false,
                    'verification_status' => 'verified',
                    'uploaded_by' => $admin->id,
                ]);
                $this->createVersion($doc, $admin, 'Dokumen penumpang');
                $voyage->documents()->attach($doc->id);
            }
            $workflow->refreshChecklistCompletion($voyage);
            $voyage->checklists()->where('applicability', 'wajib')->update(['completion_status' => 'terpenuhi']);

            $order = ['draft', 'planned', 'document_preparation', 'internal_review', 'awaiting_external_approval', 'ready_for_departure', 'departed', 'in_transit', 'arrived', 'voyage_closure', 'completed'];
            $targetStatus = $target ?? 'ready_for_departure';
            $steps = array_slice($order, 0, array_search($targetStatus, $order, true) + 1);
            foreach ($steps as $s) {
                if ($s === 'internal_review') {
                    $workflow->transition($voyage, $s);
                    \App\Models\Approval::create([
                        'approvable_type' => 'voyage',
                        'approvable_id' => $voyage->id,
                        'approver_id' => $supervisor?->id,
                        'approval_scope' => 'internal',
                        'approval_status' => 'approved',
                        'comments' => 'Kesiapan penumpang OK (DEMO)',
                        'decision_timestamp' => $departAt->copy()->subHours(6),
                    ]);
                    continue;
                }
                $workflow->transition($voyage, $s, $s === 'ready_for_departure'
                    ? 'Override kesiapan awak (seed — roster penumpang diverifikasi).'
                    : null);
            }

            $voyage->update(['boarded' => min($tickets, $cap), 'landed' => $target === 'completed' ? min($tickets, $cap) : null, 'cancelled' => max(0, $cap - $tickets - 50)]);
            $workflow->recordEvent($voyage, \App\Enums\VoyageEventType::PassengerChange, "Manifest: kapasitas {$cap}, tiket {$tickets} (DEMO)");
        }
    }

    private function seedOperationalHistory(): void
    {
        if (\App\Models\VesselPosition::count() > 0) {
            return;
        }

        foreach (\App\Models\Vessel::where('operational_status', 'aktif')->get() as $vessel) {
            $lat = $vessel->last_lat ?? -0.502;
            $lng = $vessel->last_lng ?? 117.15;
            foreach (range(1, 8) as $k) {
                \App\Models\VesselPosition::create([
                    'vessel_id' => $vessel->id,
                    'lat' => $lat + ($k * 0.004) + mt_rand(-10, 10) / 1000,
                    'lng' => $lng + ($k * 0.006) + mt_rand(-10, 10) / 1000,
                    'speed_knots' => mt_rand(20, 120) / 10,
                    'recorded_at' => now()->subHours($k * 3),
                    'source' => 'AIS-sim',
                ]);
            }
        }

        foreach (\App\Models\Vessel::where('vessel_type', '!=', 'tongkang')->get() as $vessel) {
            foreach (range(1, 4) as $k) {
                $score = mt_rand(72, 98);
                \App\Models\VesselCondition::create([
                    'vessel_id' => $vessel->id,
                    'checked_at' => now()->subDays($k * 12),
                    'checklist' => [
                        'mesin' => $score > 80 ? 'baik' : 'cukup',
                        'navigasi' => 'baik',
                        'keselamatan' => $score > 75 ? 'baik' : 'cukup',
                        'dek' => 'cukup',
                        'kamar' => 'baik',
                    ],
                    'score' => $score,
                    'notes' => $score < 80 ? 'Perlu pengecekan pompa baling-baling.' : null,
                    'checked_by' => User::where('email', 'ops@bungateratai.id')->value('id'),
                ]);
            }

            \App\Models\Service::create([
                'vessel_id' => $vessel->id,
                'type' => 'rutin',
                'title' => 'Servis rutin mesin utama & filter',
                'start_date' => now()->subMonths(2)->toDateString(),
                'end_date' => now()->subMonths(2)->addDays(3)->toDateString(),
                'workshop' => 'Bengkel Kapal Loa Buah',
                'cost' => mt_rand(8, 40) * 500000,
                'status' => 'selesai',
            ]);
        }
    }

    private function seedFinanceHistory(): void
    {
        if (\App\Models\Invoice::count() > 0) {
            return;
        }

        $journal = app(\App\Services\JournalService::class);
        $ops = User::where('email', 'finance@bungateratai.id')->first() ?? User::first();

        // Saldo awal (modal disetor)
        $journal->post(
            [
                ['account' => '1002', 'debit' => 1500000000],
                ['account' => '1001', 'debit' => 100000000],
                ['account' => '3000', 'credit' => 1600000000],
            ],
            'Modal disetor awal (DEMO)',
            'manual',
            null,
            now()->subMonths(8)->toDateString(),
        );
        \App\Models\CashAccount::where('name', 'Bank BRI Operasional')->update(['balance' => 850000000 + 1500000000]);
        \App\Models\CashAccount::where('name', 'Kas Tunai Operasional')->update(['balance' => 50000000 + 100000000]);

        $completedVoyages = \App\Models\Voyage::whereNotIn('voyage_status', ['draft', 'cancelled'])->get();
        $services = \App\Models\ServiceCatalog::where('kind', 'pendapatan')->get();

        // 40+ invoice selama 6 bulan
        for ($i = 0; $i < 42; $i++) {
            $monthOffset = mt_rand(0, 5);
            $issue = now()->subMonths($monthOffset)->subDays(mt_rand(0, 27));
            $customer = \App\Models\Customer::where('notes', 'NOT LIKE', '%tiket%')->inRandomOrder()->first()
                ?? \App\Models\Customer::first();
            $service = $services->random();
            $qty = $service->name === 'Tiket Penumpang' ? mt_rand(80, 600) : 1;
            $price = $service->name === 'Tiket Penumpang' ? 185000 : (float) $service->default_price + mt_rand(-2, 4) * 1000000;
            $voyage = $completedVoyages->isNotEmpty() ? $completedVoyages->random() : null;

            $subtotal = $qty * $price;
            $ppn = round($subtotal * 0.11);
            $pph23 = mt_rand(0, 1) ? round($subtotal * 0.02) : 0;
            $total = $subtotal + $ppn - $pph23;

            $invoice = \App\Models\Invoice::create([
                'number' => sprintf('INV-%d-%04d', $issue->year, $i + 1),
                'customer_id' => $customer->id,
                'voyage_id' => $voyage?->id,
                'issue_date' => $issue->toDateString(),
                'due_date' => $issue->copy()->addDays(14)->toDateString(),
                'status' => 'unpaid',
                'subtotal' => $subtotal,
                'ppn_rate' => 11,
                'ppn_amount' => $ppn,
                'pph23_amount' => $pph23,
                'total' => $total,
                'created_by' => $ops->id,
                'notes' => 'DEMO DATA — jasa '.$service->name.($voyage ? ' untuk '.$voyage->voyage_code : ''),
            ]);
            \App\Models\InvoiceItem::create([
                'invoice_id' => $invoice->id,
                'description' => $service->name.($qty > 1 ? " × {$qty}" : ''),
                'qty' => $qty,
                'price' => $price,
                'amount' => $subtotal,
            ]);

            $journal->post(
                [
                    ['account' => '1100', 'debit' => $total],
                    ...( $pph23 > 0 ? [['account' => '2101', 'debit' => $pph23]] : [] ),
                    ['account' => match ($service->name) {
                        'Tiket Penumpang' => '4200',
                        'Sewa Tongkang' => '4100',
                        default => '4000',
                    }, 'credit' => $subtotal],
                    ...( $ppn > 0 ? [['account' => '2101', 'credit' => $ppn]] : [] ),
                ],
                "Invoice {$invoice->number}",
                'invoice',
                $invoice->id,
                $issue->toDateString(),
            );

            if ($pph23 > 0) {
                \App\Models\WithholdingTax::create([
                    'type' => 'pph23',
                    'period' => $issue->format('Y-m'),
                    'date' => $issue->toDateString(),
                    'base_amount' => $subtotal,
                    'rate' => 2,
                    'tax_amount' => $pph23,
                    'counterparty' => $customer->name,
                    'ref_type' => 'invoice',
                    'ref_id' => $invoice->id,
                    'status' => $monthOffset > 1 ? 'setor' : 'tercatat',
                    'paid_at' => $monthOffset > 1 ? $issue->copy()->addDays(20)->toDateString() : null,
                ]);
            }

            // 70% sudah dibayar
            if (mt_rand(0, 9) < 7) {
                $cash = \App\Models\CashAccount::where('type', 'bank')->inRandomOrder()->first()
                    ?? \App\Models\CashAccount::first();
                $payDate = $issue->copy()->addDays(mt_rand(3, 25));
                $amount = mt_rand(0, 4) === 0 ? round($total / 2) : $total;

                \App\Models\Payment::create([
                    'invoice_id' => $invoice->id,
                    'date' => $payDate->toDateString(),
                    'amount' => $amount,
                    'method' => ['transfer', 'cash', 'giro'][mt_rand(0, 2)],
                    'cash_account_id' => $cash->id,
                ]);
                $invoice->update([
                    'paid_amount' => $amount,
                    'status' => $amount >= $total - 1 ? 'paid' : 'partial',
                ]);
                $cash->increment('balance', $amount);
                \App\Models\CashTransaction::create([
                    'cash_account_id' => $cash->id,
                    'direction' => 'in',
                    'amount' => $amount,
                    'date' => $payDate->toDateString(),
                    'category' => 'pendapatan',
                    'reference' => $invoice->number,
                    'created_by' => $ops->id,
                ]);
                $entry = $journal->post(
                    [
                        ['account' => '1002', 'debit' => $amount],
                        ['account' => '1100', 'credit' => $amount],
                    ],
                    "Pembayaran invoice {$invoice->number}",
                    'payment',
                    $invoice->id,
                    $payDate->toDateString(),
                );
                \App\Models\CashTransaction::where('reference', $invoice->number)->whereNull('journal_entry_id')
                    ->update(['journal_entry_id' => $entry->id]);
            }
        }

        // Bills: 16 assist nyata (materi assist klien) + tagihan jasa keagenan/CO + operasional
        $supplierAssist = \App\Models\Supplier::firstOrCreate(['name' => 'KOPERASI KARTIKA'], [
            'category' => 'lainnya',
            'address' => 'Samarinda, Kalimantan Timur',
            'phone' => '0541-'.mt_rand(200000, 999999),
            'notes' => 'DEMO DATA — pemandu & assist Jetty Senyiur (materi assist klien).',
        ]);
        $supplierCo = \App\Models\Supplier::firstOrCreate(['name' => 'PELINDO & JASA PELABUHAN'], [
            'category' => 'lainnya',
            'address' => 'Samarinda, Kalimantan Timur',
            'phone' => '0541-'.mt_rand(200000, 999999),
            'notes' => 'DEMO DATA — jasa pelabuhan/keagenan (materi INVOICE CO + Pelindo Jembatan).',
        ]);
        $supplierSparepart = \App\Models\Supplier::where('category', 'sparepart')->first();
        $supplierBengkel = \App\Models\Supplier::where('category', 'bengkel')->first();

        $billSpecs = [];
        foreach (array_slice(require __DIR__.'/data/assist.php', 0, 16) as $a) {
            $issue = $a['date'] ? \Carbon\Carbon::parse($a['date']) : now()->subMonths(3);
            $desc = 'Jasa Assist/Tambat/Pandu — '.$a['vessel'].($a['port'] ? ' ('.$a['port'].')' : '').($a['spal'] ? ' | SPAL '.$a['spal'] : '');
            $billSpecs[] = ['assist', $supplierAssist, $a['amount'], $desc, $issue, true];
        }
        // Tagihan jasa keagenan/NOTA DEBET dari materi INVOICE CO (beban, outstanding)
        foreach (require __DIR__.'/data/invoice_co.php' as $co) {
            $issue = $co['date'] ? \Carbon\Carbon::parse($co['date']) : now()->subMonths(6);
            $desc = 'Jasa keagenan/NOTA DEBET CO-'.($co['no'] ?? '').($co['pair'] ? ' ('.$co['pair'].')' : '');
            $billSpecs[] = ['lainnya', $supplierCo, (float) ($co['total'] ?? 0), $desc, $issue, false];
        }
        for ($i = 0; $i < 6; $i++) {
            $billSpecs[] = ['sparepart', $supplierSparepart, mt_rand(2, 30) * 500000, 'Pengadaan sparepart', null, true];
        }
        $billSpecs[] = ['drydock', $supplierBengkel, 78500000, 'Drydock BG Syukur 07', null, true];
        $billSpecs[] = ['bbm', \App\Models\Supplier::where('category', 'lainnya')->first() ?? \App\Models\Supplier::first(), 45000000, 'Pengadaan BBM solar marine', null, true];
        $billSpecs[] = ['sewa', \App\Models\Supplier::where('category', 'lainnya')->first() ?? \App\Models\Supplier::first(), 25000000, 'Sewa pangkalan 3 bulan', null, true];

        foreach ($billSpecs as $i => [$category, $supplier, $amount, $desc, $issueDate, $allowRandomPay]) {
            if (! $supplier) {
                continue;
            }
            $issue = $issueDate ?? now()->subMonths(mt_rand(0, 5))->subDays(mt_rand(0, 25));
            $ppn = round($amount * 0.11);
            $total = $amount + $ppn;
            $voyage = $completedVoyages->isNotEmpty() && $category === 'assist' ? $completedVoyages->random() : null;

            $bill = \App\Models\Bill::create([
                'number' => sprintf('BILL-%d-%04d', $issue->year, $i + 1),
                'supplier_id' => $supplier->id,
                'voyage_id' => $voyage?->id,
                'category' => $category,
                'issue_date' => $issue->toDateString(),
                'due_date' => $issue->copy()->addDays(21)->toDateString(),
                'status' => 'unpaid',
                'subtotal' => $amount,
                'ppn_amount' => $ppn,
                'pph_withheld' => 0,
                'total' => $total,
                'notes' => 'DEMO DATA — '.$desc,
            ]);

            $expenseCode = match ($category) {
                'assist' => '5300',
                'bbm' => '5000',
                'sewa' => '5400',
                'sparepart', 'drydock' => '5100',
                default => '5900',
            };
            $journal->post(
                [
                    ['account' => $expenseCode, 'debit' => $amount],
                    ['account' => '1200', 'debit' => $ppn],
                    ['account' => '2100', 'credit' => $total],
                ],
                "Bill {$bill->number} — {$desc}",
                'bill',
                $bill->id,
                $issue->toDateString(),
            );

            \App\Models\PaymentSchedule::create([
                'ref_type' => 'bill',
                'ref_id' => $bill->id,
                'due_date' => $issue->copy()->addDays(21)->toDateString(),
                'amount' => $total,
                'description' => "Bayar bill {$bill->number} — {$desc}",
                'status' => 'menunggu',
            ]);

            if ($allowRandomPay && mt_rand(0, 9) < 6) {
                $cash = \App\Models\CashAccount::where('type', 'bank')->inRandomOrder()->first()
                    ?? \App\Models\CashAccount::first();
                $payDate = $issue->copy()->addDays(mt_rand(5, 30));
                \App\Models\BillPayment::create([
                    'bill_id' => $bill->id,
                    'date' => $payDate->toDateString(),
                    'amount' => $total,
                    'method' => 'transfer',
                    'cash_account_id' => $cash->id,
                ]);
                $bill->update(['paid_amount' => $total, 'status' => 'paid']);
                $cash->decrement('balance', $total);
                \App\Models\CashTransaction::create([
                    'cash_account_id' => $cash->id,
                    'direction' => 'out',
                    'amount' => $total,
                    'date' => $payDate->toDateString(),
                    'category' => $category,
                    'reference' => $bill->number,
                    'created_by' => $ops->id,
                ]);
                $journal->post(
                    [
                        ['account' => '2100', 'debit' => $total],
                        ['account' => '1002', 'credit' => $total],
                    ],
                    "Pembayaran bill {$bill->number}",
                    'bill_payment',
                    $bill->id,
                    $payDate->toDateString(),
                );
                \App\Models\PaymentSchedule::where('ref_type', 'bill')->where('ref_id', $bill->id)
                    ->update(['status' => 'lunas', 'paid_at' => $payDate->toDateString()]);
            }
        }
    }

    private function seedPayrollHistory(): void
    {
        if (\App\Models\PayrollPeriod::count() > 0) {
            return;
        }

        $finance = User::where('email', 'finance@bungateratai.id')->first() ?? User::first();
        $payrollService = app(\App\Services\PayrollService::class);
        $journal = app(\App\Services\JournalService::class);

        foreach (range(5, 0) as $offset) {
            $periodDate = now()->subMonths($offset);
            $period = \App\Models\PayrollPeriod::create([
                'year_month' => $periodDate->format('Y-m'),
                'status' => 'draft',
            ]);
            $payrollService->generate($period);

            $gross = (float) $period->entries()->sum('gaji_pokok') + (float) $period->entries()->sum('tunjangan');
            $bpjs = (float) $period->entries()->sum('bpjs');
            $pph = (float) $period->entries()->sum('pph21');
            $netto = (float) $period->entries()->sum('total');

            $journal->post(
                [
                    ['account' => '5200', 'debit' => $gross],
                    ['account' => '2100', 'credit' => $bpjs],
                    ['account' => '2101', 'credit' => $pph],
                    ['account' => '1003', 'credit' => $netto],
                ],
                "Gaji & upah {$period->year_month} (payroll DEMO)",
                'payroll',
                $period->id,
                $periodDate->copy()->startOfMonth()->addDays(25)->toDateString(),
            );

            $period->update(['status' => 'posted', 'posted_at' => $periodDate->copy()->addDays(25), 'posted_by' => $finance->id]);
            $period->entries()->update(['status' => 'posted', 'paid_at' => $periodDate->copy()->addDays(25)->toDateString()]);

            if ($pph > 0) {
                \App\Models\WithholdingTax::create([
                    'type' => 'pph21',
                    'period' => $period->year_month,
                    'date' => $periodDate->copy()->addDays(25)->toDateString(),
                    'base_amount' => $gross,
                    'rate' => round($pph / max($gross, 1) * 100, 2),
                    'tax_amount' => $pph,
                    'counterparty' => 'Karyawan & ABK — '.$period->year_month,
                    'ref_type' => 'payroll',
                    'ref_id' => $period->id,
                    'status' => $offset > 1 ? 'setor' : 'tercatat',
                    'paid_at' => $offset > 1 ? $periodDate->copy()->addDays(28)->toDateString() : null,
                ]);
            }

            \App\Models\CashAccount::where('name', 'Bank Mandiri Payroll')->decrement('balance', $netto);
        }
    }

    /** ~70 log trip BBM (tug & kapal penumpang) — 6 bulan, ~15% tidak normal. */
    private function seedFuelLogs(): void
    {
        if (\App\Models\FuelLog::count() > 0) {
            return;
        }

        $journal = app(\App\Services\JournalService::class);
        $analyzer = app(\App\Services\FuelAnalysisService::class);
        $routes = [
            ['Samarinda → Bontang', 6], ['Samarinda → Balikpapan', 9],
            ['Samarinda → Sangatta', 14], ['Samarinda → Marunda', 18],
            ['Samarinda → Taboneo', 22], ['Samarinda → Tenggarong', 4],
            ['Bontang → Samarinda', 6], ['Samarinda → Tanjung Redeb', 16],
        ];
        $passengerRoutes = [
            ['Samarinda → Bontang', 8], ['Samarinda → Tanjung Redeb', 15],
            ['Samarinda → Tenggarong', 3.5], ['Samarinda → Sebatik', 20],
        ];

        $vessels = \App\Models\Vessel::whereNotNull('fuel_baseline_lph')
            ->where('vessel_type', '!=', 'tongkang')
            ->get();

        $i = 0;
        foreach ($vessels as $vessel) {
            $trips = $vessel->vessel_type === 'kapal_penumpang' ? 8 : 7;
            for ($t = 0; $t < $trips; $t++) {
                $i++;
                $isPassenger = $vessel->vessel_type === 'kapal_penumpang';
                [$route, $hours] = ($isPassenger ? $passengerRoutes : $routes)[mt_rand(0, count($isPassenger ? $passengerRoutes : $routes) - 1)];
                $hours = $hours + (mt_rand(0, 6) * 0.5);

                $baseline = (float) $vessel->fuel_baseline_lph;
                $anomaly = $i % 7 === 0; // ~15% tidak normal
                $factor = $anomaly ? [1.28, 1.42][mt_rand(0, 1)] : [0.92, 0.97, 1.0, 1.05, 1.12][mt_rand(0, 4)];
                $liters = round($baseline * $factor * $hours, 1);
                $tripDate = now()->subDays(mt_rand(1, 175));

                $analysis = $analyzer->analyze($liters, $hours, $baseline);
                if ($analysis['status'] === 'tidak_normal' && ! $anomaly) {
                    $liters = round($baseline * 1.05 * $hours, 1);
                    $analysis = $analyzer->analyze($liters, $hours, $baseline);
                }

                \App\Models\FuelLog::create([
                    'vessel_id' => $vessel->id,
                    'voyage_id' => null,
                    'trip_date' => $tripDate->toDateString(),
                    'route' => $route,
                    'cargo_type' => $isPassenger ? null : ['batu_bara', 'semen', 'sawit', 'curah_lain'][mt_rand(0, 3)],
                    'duration_hours' => $hours,
                    'distance_nm' => round($hours * 7.5, 1),
                    'liters' => $liters,
                    'cost' => round($liters * 12500),
                    'baseline_lph_snapshot' => $baseline,
                    'analysis_status' => $analysis['status'],
                    'analysis_diff_pct' => $analysis['diff_pct'],
                    'explanation_note' => $anomaly
                        ? ['Arus deras sungai + muatan penuh, AC kapal penumpang menyala terus.', 'Kemacetan jalur pemandu di muara & menunggu pasang surut.'][mt_rand(0, 1)]
                        : null,
                    'created_by' => User::where('email', 'ops@bungateratai.id')->value('id'),
                ]);
            }
        }
    }

    /** Kondisi + servis utk tongkang, service_items dgn pemakaian stok utk semua servis. */
    private function extendOperationalHistory(): void
    {
        $ops = User::where('email', 'ops@bungateratai.id')->value('id');

        // Kondisi tongkang (deck/tambat) — kapal yang belum punya kondisi
        foreach (\App\Models\Vessel::whereDoesntHave('conditions')->get() as $vessel) {
            foreach (range(1, 3) as $k) {
                $score = mt_rand(70, 96);
                \App\Models\VesselCondition::create([
                    'vessel_id' => $vessel->id,
                    'checked_at' => now()->subDays($k * 15),
                    'checklist' => [
                        'mesin' => $vessel->vessel_type === 'tongkang' ? 'tidak berlaku' : ($score > 80 ? 'baik' : 'cukup'),
                        'navigasi' => 'baik',
                        'keselamatan' => $score > 75 ? 'baik' : 'cukup',
                        'dek' => $score > 85 ? 'baik' : 'cukup',
                        'kamar' => 'cukup',
                    ],
                    'score' => $score,
                    'notes' => $score < 78 ? 'Perlu pengecekan tambang & fender.' : null,
                    'checked_by' => $ops,
                ]);
            }
        }

        // Servis tongkang (drydock perawatan lambung)
        foreach (\App\Models\Vessel::where('vessel_type', 'tongkang')->whereDoesntHave('services')->get() as $vessel) {
            \App\Models\Service::create([
                'vessel_id' => $vessel->id,
                'type' => 'drydock',
                'title' => 'Drydock & perawatan lambung tongkang',
                'start_date' => now()->subMonths(mt_rand(2, 5))->toDateString(),
                'end_date' => now()->subMonths(mt_rand(2, 5))->addDays(5)->toDateString(),
                'workshop' => 'Galangan Kapal Teluk Bajo',
                'cost' => mt_rand(25, 95) * 1000000,
                'status' => 'selesai',
                'notes' => 'DEMO DATA',
            ]);
        }

        // Sambungkan servis dgn sparepart (sekali saja)
        if (\App\Models\ServiceItem::count() > 0) {
            return;
        }

        $items = \App\Models\InventoryItem::get();
        foreach (\App\Models\Service::where('status', 'selesai')->get() as $service) {
            $picked = $items->random(mt_rand(1, 3));
            foreach ($picked as $item) {
                $qty = max(1, (int) round(mt_rand(1, 4)));
                \App\Models\ServiceItem::create([
                    'service_id' => $service->id,
                    'item_id' => $item->id,
                    'qty' => $qty,
                ]);
                // Potong stok kantor + catat mutasi
                $balance = \App\Models\InventoryBalance::where('item_id', $item->id)
                    ->where('location_type', 'kantor')->first();
                if ($balance) {
                    $balance->decrement('qty', min((float) $balance->qty, $qty));
                }
                \App\Models\InventoryMovement::create([
                    'item_id' => $item->id,
                    'type' => 'keluar',
                    'qty' => $qty,
                    'from_location' => 'kantor',
                    'ref_type' => 'service',
                    'ref_id' => $service->id,
                    'movement_date' => $service->end_date ?? now()->toDateString(),
                    'user_id' => $ops,
                    'notes' => "Pemakaian utk servis: {$service->title}",
                ]);
            }
        }

        // Beberapa servis terkait perjalanan (Project P&L)
        $voyages = \App\Models\Voyage::whereNotIn('voyage_status', ['draft', 'cancelled'])->get();
        foreach ($voyages->take(4) as $voyage) {
            $service = \App\Models\Service::where('vessel_id', $voyage->vessel_id)
                ->whereNull('voyage_id')->inRandomOrder()->first();
            $service?->update(['voyage_id' => $voyage->id]);
        }
    }

    /** Penyusutan aset 3 bulan + jurnal nyata (ganti angka akumulasi hasil seed awal). */
    private function seedAssetDepreciations(): void
    {
        if (\App\Models\AssetDepreciation::count() > 0) {
            return;
        }

        $journal = app(\App\Services\JournalService::class);

        foreach (\App\Models\Asset::where('status', 'aktif')->get() as $asset) {
            $asset->update(['accumulated_depreciation' => 0]);

            $monthly = round(((float) $asset->acquisition_cost - (float) $asset->salvage_value) / max(1, $asset->useful_life_months), 2);
            foreach (range(3, 1) as $offset) {
                $periodDate = now()->subMonths($offset);
                $period = $periodDate->format('Y-m');

                $entry = $journal->post(
                    [
                        ['account' => '5500', 'debit' => $monthly],
                        ['account' => '1399', 'credit' => $monthly],
                    ],
                    "Penyusutan {$asset->name} ({$period})",
                    'depreciation',
                    $asset->id,
                    $periodDate->copy()->startOfMonth()->addDays(28)->toDateString(),
                );

                \App\Models\AssetDepreciation::create([
                    'asset_id' => $asset->id,
                    'period' => $period,
                    'amount' => $monthly,
                    'journal_entry_id' => $entry->id,
                ]);
            }

            $asset->increment('accumulated_depreciation', $monthly * 3);
        }
    }

    /** Setor pajak (yang berstatus 'setor') → kas keluar + jurnal 2101↔kas. */
    private function seedTaxPayments(): void
    {
        if (\App\Models\CashTransaction::where('category', 'pajak')->count() > 0) {
            return;
        }

        $journal = app(\App\Services\JournalService::class);
        $cash = \App\Models\CashAccount::where('type', 'bank')->first()
            ?? \App\Models\CashAccount::first();

        foreach (\App\Models\WithholdingTax::where('status', 'setor')->get() as $tax) {
            if (! $tax->paid_at) {
                continue;
            }
            $cash->decrement('balance', $tax->tax_amount);
            $txn = \App\Models\CashTransaction::create([
                'cash_account_id' => $cash->id,
                'direction' => 'out',
                'amount' => $tax->tax_amount,
                'date' => $tax->paid_at,
                'category' => 'pajak',
                'reference' => strtoupper($tax->type).' '.($tax->period ?? ''),
                'created_by' => User::where('email', 'finance@bungateratai.id')->value('id'),
            ]);
            $entry = $journal->post(
                [
                    ['account' => '2101', 'debit' => $tax->tax_amount],
                    ['account' => '1002', 'credit' => $tax->tax_amount],
                ],
                'Setor pajak '.strtoupper($tax->type).' periode '.($tax->period ?? '-'),
                'tax',
                $tax->id,
                $tax->paid_at,
            );
            $txn->update(['journal_entry_id' => $entry->id]);
        }
    }

    /** Approval internal utk sebagian dokumen verified (histori Approvals). */
    private function seedDocumentApprovals(): void
    {
        if (\App\Models\Approval::where('approvable_type', 'document')->count() > 0) {
            return;
        }

        $supervisor = User::where('email', 'supervisor@bungateratai.id')->first()
            ?? User::first();

        $docs = \App\Models\Document::where('verification_status', 'verified')
            ->inRandomOrder()->limit(18)->get();

        foreach ($docs as $doc) {
            \App\Models\Approval::create([
                'approvable_type' => 'document',
                'approvable_id' => $doc->id,
                'approver_id' => $supervisor->id,
                'approval_scope' => 'internal',
                'approval_status' => 'approved',
                'comments' => ['Berkas lengkap.', 'Nomor & masa berlaku sesuai.', 'Verifikasi lulus — DEMO DATA.'][mt_rand(0, 2)],
                'decision_timestamp' => $doc->updated_at ?? now()->subDays(mt_rand(1, 60)),
            ]);
        }

        // Sedikit variasi: dokumen dalam revisi
        $revisionDocs = \App\Models\Document::where('verification_status', 'revision_required')
            ->inRandomOrder()->limit(4)->get();
        foreach ($revisionDocs as $doc) {
            \App\Models\Approval::create([
                'approvable_type' => 'document',
                'approvable_id' => $doc->id,
                'approver_id' => $supervisor->id,
                'approval_scope' => 'internal',
                'approval_status' => 'revision_required',
                'comments' => 'Nomor dokumen tidak terbaca jelas pada scan — unggah ulang.',
                'decision_timestamp' => $doc->updated_at ?? now()->subDays(mt_rand(1, 20)),
            ]);
        }
    }

    /** 16 master template dokumen terbit + arsip (pola nomor sesuai materi klien — SPAL/Invoice/Keagenan/PO/Crewing). */
    private function seedDocumentTemplates(): void
    {
        if (\App\Models\DocumentTemplate::count() > 0) {
            return;
        }

        $templates = [
            ['SPAL', 'Surat Perjanjian Angkutan Laut', 'kontrak', 'spal', '{seq_raw}/{kode_penyewa}/FC/{kode_kapal}/{bulan_romawi}/{tahun}', 'ARS/SPAL/{tahun}/{seq}', false],
            ['INV_CHARTER', 'Invoice Charter (DP/Pelunasan)', 'invoice', 'invoice_charter', '{seq_raw}/{kode_penyewa}/{kode_kapal}/{bulan_romawi}/{tahun2}', 'ARS/INV/{tahun}/{seq}', false],
            ['KEAGENAN', 'Surat Penunjukan Keagenan', 'surat', 'keagenan', '{seq_raw}/{kode_penyewa}/AG/{bulan_romawi}/{tahun}', 'ARS/AGT/{tahun}/{seq}', false],
            ['PO', 'Purchase Order', 'po', 'po', '{seq}/PO-BT/TB/{bulan_romawi}/{tahun}', 'ARS/PO/{tahun}/{seq}', false],
            ['LAPORAN_EXPIRY', 'Monthly Document Expiry Report', 'laporan', 'monthly_report', 'LAP-EXP/{bulan_romawi}/{tahun}', null, false],
            ['LAPORAN_ENDORSEMENT', 'Monthly Document Endorsement Report', 'laporan', 'monthly_report', 'LAP-END/{bulan_romawi}/{tahun}', null, false],
            ['MASTER_TRACKER', 'TB BG Master Tracker Export', 'laporan', 'monthly_report', 'TRK/{bulan_romawi}/{tahun}', null, false],
            ['REKAP_NOTA', 'Rekap Nota', 'laporan', 'rekap_nota', 'RN/{bulan_romawi}/{tahun}', null, false],
            ['OUTSTANDING', 'Rencana Pembayaran Outstanding', 'laporan', 'outstanding', 'OUT/{bulan_romawi}/{tahun}', null, false],
            ['SURAT_UMUM', 'Surat Umum (Kop PT Bunga Teratai)', 'surat', 'generic_letter', '{seq}/BT/{bulan_romawi}/{tahun}', 'ARS/SU/{tahun}/{seq}', true],
            // Crewing (materi CREWING) — counter diinit dari nomor materi terakhir
            ['OFF_CREW', 'Surat Pemberhentian Awak Kapal (Mutasi OFF)', 'surat', 'surat_crew', '{seq4}/BT-OFF/{bulan_romawi}/{tahun}', 'ARS/OFF/{tahun}/{seq}', false],
            ['SIJIL_ON', 'Permohonan Sijil ON/OFF Kesyahbandaran', 'surat', 'surat_crew', '{seq4}/AG/BT-ADM/{bulan_romawi}/{tahun}', 'ARS/AGT/{tahun}/{seq}', false],
            ['MUTASI_CREW', 'Surat Mutasi Awak Kapal', 'surat', 'surat_crew', '{seq_raw}/BT-MI/{bulan_romawi}/{tahun}', 'ARS/MI/{tahun}/{seq}', false],
            ['KADET_ON', 'Surat Pengangkatan Taruna (Prala)', 'surat', 'surat_crew', '{seq4}/BT-KDT/{bulan_romawi}/{tahun}', 'ARS/KDT/{tahun}/{seq}', false],
            ['KADET_OFF', 'Mutasi OFF Kadet (Selesai PK)', 'surat', 'surat_crew', '{seq4}/BT-KDT-OFF/{bulan_romawi}/{tahun}', 'ARS/KDT/{tahun}/{seq}', false],
            ['KUASA_PKL', 'Surat Kuasa PKL', 'surat', 'surat_crew', '{seq}/BT/SK-TB.{kode_kapal}/{bulan}/{tahun}', 'ARS/SK/{tahun}/{seq}', false],
        ];

        foreach ($templates as [$code, $name, $kategori, $layout, $pattern, $archive, $generic]) {
            \App\Models\DocumentTemplate::create([
                'code' => $code,
                'name' => $name,
                'kategori' => $kategori,
                'layout_type' => $layout,
                'numbering_pattern' => $pattern,
                'archive_pattern' => $archive,
                'seq_scope' => 'tahunan',
                'seq_last' => match ($code) {
                    'SPAL' => 104,
                    'KEAGENAN' => 44,
                    'PO' => 362,
                    'SURAT_UMUM' => 50,
                    'INV_CHARTER' => 211,
                    'OFF_CREW' => 107,
                    'SIJIL_ON' => 547,
                    'MUTASI_CREW' => 70,
                    'KADET_ON' => 29,
                    'KADET_OFF' => 25,
                    'KUASA_PKL' => 9,
                    default => 0,
                },
                'archive_seq_last' => 0,
                'enabled' => true,
                'is_generic_letter' => $generic,
                'defaults' => [
                    'bank' => 'Bank BRI Cab. Samarinda 1 — a/c 0082 01000 409 309 a.n. PT Bunga Teratai',
                    'penandatangan' => 'H. Syarif',
                    'jabatan_ttd' => 'Direktur',
                    'ppn_rate' => 11,
                    'default_pph_rate' => 1.2,
                ],
            ]);
        }
    }

    /**
     * Overlay dokumen tracker klien PER KAPAL dari data/tracker.php (540 entri,
     * 36 kapal): nama kode A1–K1, expiry serial Excel, endorsement last/next asli.
     * Guard: dokumen expiring ≤30 hari (target sintetis) tidak ditimpa.
     */
    private function seedTrackerDocuments(): void
    {
        if (\App\Models\Document::where('document_name', 'like', '%Surat Ukur International%')->count() > 0) {
            return;
        }

        $trackerData = require __DIR__.'/data/tracker.php';

        $serialToDate = function ($serial): ?string {
            if (! is_numeric($serial)) {
                return null;
            }

            return date('Y-m-d', ((float) $serial - 25569) * 86400);
        };

        // requirement_code => kode dokumen di Master Tracker (tugboat)
        $tbMap = [
            'B_SURAT_UKUR' => 'A1',
            'B_STKB' => 'A2',
            'C_PEMERIKSAAN_TAHUNAN' => 'B1',
            'C_RADIO' => 'B3',
            'C_SKL' => 'C1',
            'C_FIRE' => 'D3',
            'D_BST' => 'D1',
            'D_MEDICAL' => 'D2',
            'B_CALLSIGN' => 'I1',
            'D_SKK' => 'J1',
            'C_DRYDOCK' => 'K1',
        ];
        // tongkang: B2 IMDG, C1 Hull, C2 Load Line, D1 Polis/WRC, F1 Anti Teritip
        $bgMap = [
            'B_SURAT_UKUR' => 'A1',
            'B_STKB' => 'A2',
            'C_PEMERIKSAAN_TAHUNAN' => 'B1',
            'C_FIRE' => 'B2',
            'C_SKL' => 'C1',
            'C_DRYDOCK' => 'C2',
            'D_BST' => 'D1',
            'D_MEDICAL' => 'D2',
            'D_SKK' => 'F1',
        ];

        foreach (\App\Models\Vessel::whereIn('vessel_type', ['tugboat', 'tongkang'])->get() as $vessel) {
            if (! isset($trackerData[$vessel->vessel_name])) {
                continue;
            }
            $entries = [];
            foreach ($trackerData[$vessel->vessel_name] as $entry) {
                $entries[$entry['code']] = $entry;
            }
            $map = $vessel->vessel_type === 'tugboat' ? $tbMap : $bgMap;
            $docs = \App\Models\Document::where('owner_type', 'vessel')
                ->where('owner_id', $vessel->id)
                ->get()
                ->keyBy('requirement_code');

            foreach ($map as $reqCode => $trackerCode) {
                $doc = $docs->get($reqCode);
                if (! $doc || ! isset($entries[$trackerCode])) {
                    continue;
                }
                $entry = $entries[$trackerCode];
                $updates = ['document_name' => $entry['name'].' — '.$vessel->vessel_name];

                if (($entry['exp'] ?? null) === 'Permanent') {
                    // A1 Surat Ukur & A2 Surat Laut permanen (A2 diendorse tahunan)
                    $updates['has_expiry'] = false;
                    $updates['expiry_date'] = null;
                } elseif (is_numeric($entry['exp'] ?? null)) {
                    $expiryDate = $serialToDate($entry['exp']);
                    $currentDays = $doc->has_expiry && $doc->expiry_date
                        ? (int) now()->startOfDay()->diffInDays($doc->expiry_date, false)
                        : null;
                    // Jangan timpa dokumen expiring ≤30 hari / sudah expired (target sintetis)
                    if ($currentDays === null || $currentDays > 30) {
                        $updates['has_expiry'] = true;
                        $updates['expiry_date'] = $expiryDate;
                    }
                }

                if (! empty($entry['ne']) && is_numeric($entry['ne'])) {
                    $updates['has_endorsement'] = true;
                    $updates['endorsement_next_date'] = $serialToDate($entry['ne']);
                    $updates['endorsement_last_date'] = $serialToDate($entry['le'] ?? null);
                }

                $doc->update($updates);
            }
        }

        app(\App\Services\ReminderService::class)->sync();
    }

    /** SPAL 104 lengkap: TB Syukur 23 – BG Syukur 03, PT Sinar Laut Maritim, silica sand. */
    private function seedSpal104(): void
    {
        if (\App\Models\Voyage::where('spal_number', 'like', '104/%')->exists()) {
            return;
        }

        $workflow = app(\App\Services\VoyageWorkflowService::class);
        $ops = User::where('email', 'ops@bungateratai.id')->first() ?? User::first();
        $supervisor = User::where('email', 'supervisor@bungateratai.id')->first();
        $finance = User::where('email', 'finance@bungateratai.id')->first();

        $customer = \App\Models\Customer::firstOrCreate(
            ['name' => 'PT Sinar Laut Maritim'],
            ['npwp' => '01.352.876.4-092.000', 'address' => 'Jl. Pluit Indah Raya No. 168 Blok B-G, Penjaringan, Jakarta Utara', 'phone' => '021-6680000', 'email' => 'agency@sinarlautmaritim.com', 'notes' => 'Penyewa charter SPAL 104 (DEMO dari materi klien).'],
        );

        // Tanggal tetap sesuai materi: SPAL 28-Sep-2026, berangkat 29-Sep-2026
        $departAt = \Carbon\Carbon::parse('2026-09-29 08:00');
        $voyage = \App\Models\Voyage::create([
            'voyage_code' => 'VYG-2026-0104',
            'vessel_id' => \App\Models\Vessel::where('vessel_name', 'TB Syukur 23')->value('id'),
            'route_type' => 'kombinasi',
            'origin' => 'Samarinda',
            'destination' => 'Lolak, Manado',
            'planned_departure' => $departAt,
            'estimated_arrival' => $departAt->copy()->addDays(6),
            'actual_departure' => $departAt,
            'actual_arrival' => $departAt->copy()->addDays(6),
            'voyage_status' => 'draft',
            'activity_type' => 'towing',
            'person_in_charge' => 'Dedi (Operator Charter)',
            'customer_id' => $customer->id,
            'contract_no' => '104/BT-SLM/FC/S.2303/IX/2026',
            'external_approval_status' => 'terkonfirmasi',
            'external_approval_evidence' => 'documents/demo-spal-104-ksop.pdf',
            'notes' => 'DEMO DATA dari materi klien: SPAL 104 Sinar Laut Maritim — Silica sand 7.500 MT.',
            // Charter fields
            'spal_number' => '104/BT-SLM/FC/S.2303/IX/2026',
            'spal_date' => '2026-09-28',
            'payment_terms' => 'dp_50_50',
            'payment_terms_note' => '50% dibayar pada saat muat; 50% dibayar pada saat kapal tiba POD sebelum bongkar',
            'freight_rate' => 125000,
            'freight_unit' => 'MT',
            'laytime_days' => 10,
            'demurrage_per_day' => 25000000,
            'jetty_loading' => 'Jetty PT. Anabella Energy Indonesia',
            'jetty_discharge' => 'Jetty Conch Manado, Lolak',
            'shipper' => 'PT. Anabella Energy Indonesia',
            'consignee' => 'PT. Conch North Sulawesi Cement',
            'dsr_mt' => 7539.27,
            'dsr_date' => '2026-10-04',
            'charter_stage' => 'closing',
        ]);

        \App\Models\VesselRelationship::create([
            'voyage_id' => $voyage->id,
            'tugboat_id' => $voyage->vessel_id,
            'barge_id' => \App\Models\Vessel::where('vessel_name', 'BG Syukur 03')->value('id'),
        ]);
        \App\Models\VoyageCargo::create([
            'voyage_id' => $voyage->id,
            'commodity_type' => 'lainnya',
            'weight_ton' => 7500,
            'origin' => 'Samarinda',
            'notes' => 'Silica sand ± 7.500 MT',
        ]);

        $workflow->buildChecklist($voyage);
        $voyage->checklists()->where('applicability', 'wajib')->update(['completion_status' => 'terpenuhi']);

        // Approval internal + maju status
        $order = ['planned', 'document_preparation', 'internal_review', 'awaiting_external_approval'];
        foreach ($order as $s) {
            if ($s === 'internal_review') {
                $workflow->transition($voyage, $s);
                \App\Models\Approval::create([
                    'approvable_type' => 'voyage', 'approvable_id' => $voyage->id,
                    'approver_id' => $supervisor?->id, 'approval_scope' => 'internal',
                    'approval_status' => 'approved', 'comments' => 'Berkas SPAL 104 lengkap.',
                    'decision_timestamp' => $departAt->copy()->subDays(2),
                ]);
                continue;
            }
            $workflow->transition($voyage, $s);
        }

        // Dokumen perjalanan: SI, SPAL, manifest, dsr
        $spalDoc = null;
        foreach ([
            ['E_INSTRUKSI', 'SHIP INSTRUCTION — Sinar Laut Maritim'],
            ['E_KONTRAK', 'SPAL 104/BT-SLM/FC/S.2303/IX/2026 (materai & ttd)'],
            ['E_MANIFEST', 'Manifest Silica Sand 7.500 MT'],
            ['F_LAPORAN_BERANGKAT', 'DSR Nakhoda — 7.539,27 MT (Lolak, Manado)'],
        ] as [$code, $name]) {
            $req = \App\Models\DocumentRequirement::where('code', $code)->first();
            $cat = \App\Models\DocumentCategory::where('group_code', $req?->group_code)->first();
            if (! $req || ! $cat) {
                continue;
            }
            $doc = \App\Models\Document::create([
                'document_name' => $name,
                'category_id' => $cat->id,
                'document_number' => '104/'.str_replace('E_', '', $code),
                'owner_type' => 'vessel',
                'owner_id' => $voyage->vessel_id,
                'requirement_code' => $code,
                'issue_date' => $departAt->copy()->subDays(3)->toDateString(),
                'has_expiry' => false,
                'verification_status' => 'verified',
                'uploaded_by' => $ops->id,
                'notes' => 'DEMO DATA — dokumen SPAL 104 dari materi klien.',
            ]);
            $this->createVersion($doc, $ops, 'Dokumen SPAL 104');
            $voyage->documents()->attach($doc->id);
            if ($code === 'E_KONTRAK') {
                $spalDoc = $doc;
            }
        }

        // Invoice 197 (DP 50%) & 211 (Pelunasan) — nomor & nominal persis INVOICE.xlsx
        foreach ([
            ['197', 'dp', \Carbon\Carbon::parse('2026-10-01'), 468750000, 5],
            ['211', 'pelunasan', \Carbon\Carbon::parse('2026-10-16'), 473658750, 6],
        ] as [$invNo, $kind, $date, $amount, $dd]) {
            $ppn = round($amount * 0.11);
            $pph = round($amount * 0.012);
            $total = $amount + $ppn - $pph;
            $invoice = \App\Models\Invoice::create([
                'number' => $invNo.'/BT-SLM/S.23/X/26',
                'customer_id' => $customer->id,
                'voyage_id' => $voyage->id,
                'issue_date' => $date->toDateString(),
                'due_date' => $date->copy()->addDays(14)->toDateString(),
                'status' => $invNo === '211' ? 'unpaid' : 'unpaid',
                'subtotal' => $amount,
                'ppn_rate' => 11,
                'ppn_amount' => $ppn,
                'pph23_amount' => $pph,
                'pph_rate' => 0.012,
                'invoice_kind' => $kind,
                'total' => $total,
                'fp_number' => '010.045-777.'.$invNo.'.2026',
                'created_by' => $finance?->id,
                'notes' => $kind === 'pelunasan'
                    ? 'Pelunasan 50% sisa — lampir DSR 7.539,27 MT (DEMO).'
                    : 'DP 50% saat kapal tiba jetty muat (DEMO).',
            ]);
            \App\Models\InvoiceItem::create([
                'invoice_id' => $invoice->id,
                'description' => ($kind === 'pelunasan' ? 'Pelunasan (DSR 7.539,27 MT x Rp. 125.000 = Rp 942.408.750 - DP Rp 468.750.000)' : 'Down Payment 50% - Silica sand 7.500 MT x Rp. 125.000').' (Samarinda → Jetty Conch Manado, Lolak)',
                'qty' => 1,
                'price' => $amount,
                'amount' => $amount,
            ]);
            app(\App\Services\JournalService::class)->post(
                [
                    ['account' => '1100', 'debit' => $total],
                    ['account' => '2101', 'debit' => $pph],
                    ['account' => '4300', 'credit' => $amount],
                    ['account' => '2101', 'credit' => $ppn],
                ],
                "Invoice {$invoice->number} (SPAL 104)",
                'invoice', $invoice->id, $date->toDateString(),
            );
            \App\Models\WithholdingTax::create([
                'type' => 'pph23', 'period' => $date->format('Y-m'), 'date' => $date->toDateString(),
                'base_amount' => $amount, 'rate' => 1.2, 'tax_amount' => $pph,
                'counterparty' => 'PT Sinar Laut Maritim', 'ref_type' => 'invoice', 'ref_id' => $invoice->id,
                'status' => $invNo === '197' ? 'setor' : 'tercatat',
                'paid_at' => $invNo === '197' ? $date->copy()->addDays(7)->toDateString() : null,
            ]);
        }

        // Penunjukan keagenan 040 (muat, Kutai Lama) & 044 (bongkar, Bolaang Mangondow) — persis dokumen klien
        foreach ([
            ['muat', 'Kutai Lama', 'PT. Sinar Laut Maritim', '2026-09-30', 'TB Syukur 23', '040/BT-SLM/AG/IX/2026'],
            ['bongkar', 'Bolaang Mangondow', 'PT. Tujuh Tunas Satu Samudera', '2026-10-15', 'BG Syukur 03', '044/BT-TTSS/AG/X/2026'],
        ] as [$portType, $portName, $agent, $date, $kapal, $letterNo]) {
            $agency = \App\Models\AgencyAppointment::create([
                'voyage_id' => $voyage->id,
                'letter_no' => $letterNo,
                'letter_date' => $date,
                'port_type' => $portType,
                'port_name' => $portName,
                'agent_name' => $agent,
                'captain_name' => 'Firmansyah',
                'captain_phone' => '0822-7972-2866',
                'grt' => $kapal === 'TB Syukur 23' ? 196 : 3100,
                'created_by' => $ops->id,
            ]);

            $doc = \App\Models\Document::create([
                'document_name' => "Penunjukan Keagenan ({$portType}) — {$portName}",
                'category_id' => \App\Models\DocumentCategory::where('group_code', 'E')->value('id'),
                'document_number' => $agency->letter_no,
                'owner_type' => 'vessel',
                'owner_id' => $voyage->vessel_id,
                'source_type' => 'terbitan',
                'template_id' => \App\Models\DocumentTemplate::where('code', 'KEAGENAN')->value('id'),
                'period' => substr($date, 0, 7),
                'issue_date' => $date,
                'has_expiry' => false,
                'verification_status' => 'verified',
                'uploaded_by' => $ops->id,
            ]);
            $voyage->documents()->attach($doc->id);
        }

        $workflow->transition($voyage, 'ready_for_departure', 'Override kesiapan awak (seed — roster SPAL 104 diverifikasi dari materi klien).');
        $workflow->transition($voyage->fresh(), 'departed');
        $workflow->transition($voyage->fresh(), 'in_transit');
        $workflow->transition($voyage->fresh(), 'arrived');
        $workflow->transition($voyage->fresh(), 'voyage_closure');
        $workflow->transition($voyage->fresh(), 'completed');

        \App\Models\Notification::create([
            'recipient_id' => $ops?->id ?? 1,
            'notification_type' => 'persetujuan_internal_menunggu',
            'title' => 'SPAL 104 tercatat (DEMO DATA)',
            'message' => 'Berkas charter SPAL 104 Sinar Laut Maritim lengkap & closing.',
            'reference_type' => 'voyage',
            'reference_id' => $voyage->id,
            'created_at' => now(),
        ]);
    }

    /** PO klien + supplier toko nyata + pembayaran outstanding dgn no cek/BG. */
    private function seedClientPurchases(): void
    {
        if (\App\Models\PurchaseOrder::count() > 0) {
            return;
        }

        $journal = app(\App\Services\JournalService::class);
        $ops = User::where('email', 'ops@bungateratai.id')->first() ?? User::first();

        // 29 toko master dari materi REKAP NOTA + TIGA BERLIAN (dari PO 003)
        $rekapToko = require __DIR__.'/data/rekap_toko.php';
        foreach ($rekapToko as $tokoName) {
            $name = $tokoName === 'DELTA ARTA NUSA' ? 'DELTA ARTHA NUSA' : $tokoName;
            $cat = 'lainnya';
            if (stripos($name, 'MASEBA') !== false) {
                $cat = 'bengkel';
            } elseif (preg_match('/GEMBIRA|FILTER|SUBUR|ANUGERAH|DELTA ARTHA/i', $name)) {
                $cat = 'sparepart';
            }
            \App\Models\Supplier::firstOrCreate(['name' => $name], [
                'category' => $cat,
                'address' => 'Samarinda, Kalimantan Timur',
                'phone' => '0541-'.mt_rand(200000, 999999),
                'notes' => 'DEMO DATA — toko materi REKAP NOTA klien.',
            ]);
        }
        \App\Models\Supplier::firstOrCreate(['name' => 'TIGA BERLIAN'], [
            'category' => 'sparepart',
            'address' => 'Samarinda, Kalimantan Timur',
            'phone' => '0541-'.mt_rand(200000, 999999),
            'notes' => 'DEMO DATA — supplier PO 003 materi klien.',
        ]);

        // 8 PO persis materi (sheet 001-58 .. 008-30): nomor, tgl, supplier, unit, item
        $pos = require __DIR__.'/data/pos.php';
        $billSeq = 99; // 0100+ — tidak bentrok dgn BILL-2026-00xx dari seedFinanceHistory

        foreach ($pos as $poKey => $p) {
            $supplier = \App\Models\Supplier::where('name', trim($p['supplier']))->first()
                ?? \App\Models\Supplier::firstOrCreate(['name' => trim($p['supplier'])], [
                    'category' => 'lainnya',
                    'address' => 'Samarinda, Kalimantan Timur',
                    'phone' => '0541-'.mt_rand(200000, 999999),
                    'notes' => 'DEMO DATA — toko dari materi PO TB SYUKUR 2026.',
                ]);
            $vesselId = $this->resolveVesselId($p['vessel']);
            $orderDate = $p['date'] ? \Carbon\Carbon::parse($p['date']) : now()->subMonths(3);
            $isPaid = $poKey === '001-58';

            $po = \App\Models\PurchaseOrder::create([
                'po_number' => $p['number'],
                'order_date' => $orderDate->toDateString(),
                'supplier_id' => $supplier->id,
                'vessel_id' => $vesselId,
                'dept' => $p['dept'] ?? 'ENGINE',
                'status' => 'diterima',
                'subtotal' => 0,
                'notes' => 'DEMO DATA — PO dari materi klien PO TB SYUKUR 2026 (sheet '.$p['sheet'].').',
                'created_by' => $ops?->id,
            ]);

            $subtotal = 0;
            foreach ($p['items'] as $item) {
                $price = (float) ($item['price'] ?? 0);
                $qty = (float) ($item['qty'] ?? 1);
                $amount = $item['amount'] !== null ? (float) $item['amount'] : round($price * $qty);
                $subtotal += $amount;
                \App\Models\PoItem::create([
                    'po_id' => $po->id,
                    'item_name' => $item['name'],
                    'item_code' => strtoupper(substr(md5($item['name']), 0, 8)),
                    'qty' => $qty,
                    'unit' => mb_strtolower($item['unit'] ?? 'pcs') ?: 'pcs',
                    'price' => $price,
                    'amount' => $amount,
                ]);
            }
            $po->update(['subtotal' => $subtotal]);

            // Terbitkan PO ke arsip
            try {
                app(\App\Services\Generators\DocumentGeneratorService::class)->generatePo($po->fresh()->load(['supplier', 'vessel', 'items']));
            } catch (\Throwable $e) {
                // PDF gagal tidak menggagalkan seed
            }

            // Bill dari PO — hanya subtotal > 0 (materi 002–004 belum diisi harganya);
            // PO 001 lunas dgn cek/BG (materi Outstanding), sisanya outstanding.
            if ($subtotal > 0) {
                $ppn = round($subtotal * 0.11);
                $total = $subtotal + $ppn;
                $due = $orderDate->copy()->addDays(21);
                $paid = $isPaid;
                $billSeq++;
                $bill = \App\Models\Bill::create([
                    'number' => sprintf('BILL-%d-%04d', 2026, $billSeq),
                    'supplier_id' => $supplier->id,
                    'category' => 'sparepart',
                    'issue_date' => $orderDate->toDateString(),
                    'due_date' => $due->toDateString(),
                    'status' => $paid ? 'paid' : 'unpaid',
                    'subtotal' => $subtotal,
                    'ppn_amount' => $ppn,
                    'total' => $total,
                    'paid_amount' => $paid ? $total : 0,
                    'po_id' => $po->id,
                    'notes' => "Bill dari PO {$po->po_number} (DEMO).",
                ]);

                $journal->post(
                    [
                        ['account' => '5100', 'debit' => $subtotal],
                        ['account' => '1200', 'debit' => $ppn],
                        ['account' => '2100', 'credit' => $total],
                    ],
                    "Bill {$bill->number} dari PO {$po->po_number}",
                    'bill', $bill->id, $orderDate->toDateString(),
                );
                $po->update(['status' => $paid ? 'lunas' : 'di_bill']);

                \App\Models\PaymentSchedule::create([
                    'ref_type' => 'bill', 'ref_id' => $bill->id,
                    'due_date' => $due->toDateString(), 'amount' => $total,
                    'description' => "Bayar bill {$bill->number} — ".trim($p['supplier'])." (PO {$po->po_number})",
                    'status' => $paid ? 'lunas' : 'menunggu',
                    'paid_at' => $paid ? $due->toDateString() : null,
                ]);

                if ($paid) {
                    $cash = \App\Models\CashAccount::where('type', 'bank')->first();
                    $cash->decrement('balance', $total);
                    $txn = \App\Models\CashTransaction::create([
                        'cash_account_id' => $cash->id, 'direction' => 'out',
                        'amount' => $total, 'date' => $due->toDateString(),
                        'category' => 'sparepart', 'reference' => $bill->number,
                        'created_by' => $ops?->id,
                    ]);
                    $entry = $journal->post(
                        [['account' => '2100', 'debit' => $total], ['account' => '1002', 'credit' => $total]],
                        "Pembayaran bill {$bill->number} (cek/BG)", 'bill_payment', $bill->id, $due->toDateString(),
                    );
                    $txn->update(['journal_entry_id' => $entry->id]);
                    \App\Models\BillPayment::create([
                        'bill_id' => $bill->id, 'date' => $due->toDateString(), 'amount' => $total,
                        'method' => 'giro', 'cheque_number' => 'BG 0'.mt_rand(10000, 99999),
                        'cash_account_id' => $cash->id, 'journal_entry_id' => $entry->id,
                    ]);
                }
            }
        }

        // Nota Delta Artha Nusa (dari materi REKAP NOTA: total 12.690.963)
        $delta = \App\Models\Supplier::where('name', 'DELTA ARTHA NUSA')->first();
        if ($delta) {
            $cash = \App\Models\CashAccount::where('type', 'bank')->first();
            $amount = 12690963;
            $bill = \App\Models\Bill::create([
                'number' => 'BILL-2026-0901',
                'supplier_id' => $delta->id,
                'category' => 'sparepart',
                'issue_date' => now()->subDays(40)->toDateString(),
                'due_date' => now()->addDays(10)->toDateString(),
                'status' => 'partial',
                'subtotal' => 11433300,
                'ppn_amount' => 1257663,
                'total' => $amount,
                'paid_amount' => 4000000,
                'notes' => 'DEMO DATA — nota Delta Artha Nusa Rp 12.690.963 (materi REKAP NOTA klien).',
            ]);
            $journal->post(
                [['account' => '5100', 'debit' => 11433300], ['account' => '1200', 'debit' => 1257663], ['account' => '2100', 'credit' => $amount]],
                'Bill BILL-2026-0901 Delta Artha Nusa (DEMO)', 'bill', $bill->id, now()->subDays(40)->toDateString(),
            );
            \App\Models\PaymentSchedule::create([
                'ref_type' => 'bill', 'ref_id' => $bill->id,
                'due_date' => now()->addDays(10)->toDateString(), 'amount' => $amount - 4000000,
                'description' => 'Bayar sisa nota Delta Artha Nusa (DEMO OUTSTANDING)',
                'status' => 'menunggu',
            ]);
            // pembayaran parsial dgn no cek tercatat
            $cash->decrement('balance', 4000000);
            $txn = \App\Models\CashTransaction::create([
                'cash_account_id' => $cash->id, 'direction' => 'out', 'amount' => 4000000,
                'date' => now()->subDays(20)->toDateString(), 'category' => 'sparepart',
                'reference' => 'BILL-2026-0901', 'created_by' => $ops?->id,
            ]);
            $entry = $journal->post(
                [['account' => '2100', 'debit' => 4000000], ['account' => '1002', 'credit' => 4000000]],
                'Bayar sebagian Delta Artha Nusa', 'bill_payment', $bill->id, now()->subDays(20)->toDateString(),
            );
            $txn->update(['journal_entry_id' => $entry->id]);
            \App\Models\BillPayment::create([
                'bill_id' => $bill->id, 'date' => now()->subDays(20)->toDateString(), 'amount' => 4000000,
                'method' => 'giro', 'cheque_number' => 'BG 0'.mt_rand(10000, 99999),
                'cash_account_id' => $cash->id, 'journal_entry_id' => $entry->id,
            ]);
            $bill->update(['paid_amount' => 4000000, 'status' => 'partial']);
        }
    }

    /** Arsip SPT Unifikasi — SEMUA 30 file asli (folder Jan–Jun materi klien). */
    private function seedSptArchive(): void
    {
        if (\App\Models\Document::where('document_name', 'like', '%SPT_Unifikasi%')->count() > 0) {
            return;
        }

        $uploader = User::where('email', 'finance@bungateratai.id')->first() ?? User::first();
        $sptByMonth = require __DIR__.'/data/spt.php';

        $category = \App\Models\DocumentCategory::where('code', 'G3')->first()
            ?? \App\Models\DocumentCategory::where('group_code', 'G')->first();

        foreach ($sptByMonth as $month => $files) {
            $issued = \Carbon\Carbon::create(2026, (int) $month, 1);
            foreach ($files as $name) {
                $number = null;
                if (preg_match('/(BPU[_ ]\w+)/', $name, $m)) {
                    $number = str_replace('_', ' ', $m[1]);
                }
                \App\Models\Document::create([
                    'document_name' => $name,
                    'category_id' => $category?->id,
                    'document_number' => $number,
                    'owner_type' => 'company',
                    'source_type' => 'unggahan',
                    'period' => $issued->format('Y-m'),
                    'issue_date' => $issued->toDateString(),
                    'has_expiry' => false,
                    'verification_status' => 'verified',
                    'uploaded_by' => $uploader->id,
                    'responsible_person' => 'Staf Keuangan',
                    'archive_location' => 'Arsip Pajak — folder per bulan (DEMO dari nama file klien)',
                    'notes' => 'Arsip SPT Unifikasi bulanan hasil cetak DJP — DEMO DATA.',
                ]);
            }
        }
    }

    /** Rencana pembayaran Outstanding per bulan/toko (materi OUTSTANDING.xlsx). */
    private function seedOutstanding(): void
    {
        if (\App\Models\PaymentSchedule::where('description', 'like', 'Outstanding %')->exists()) {
            return;
        }

        $rows = require __DIR__.'/data/outstanding.php';
        $bulanNum = ['Januari' => 1, 'Februari' => 2, 'Maret' => 3, 'April' => 4, 'Mei' => 5, 'Juni' => 6,
            'Juli' => 7, 'Agustus' => 8, 'September' => 9, 'Oktober' => 10, 'November' => 11, 'Desember' => 12];

        foreach ($rows as $row) {
            if (! $row['amount'] || $row['amount'] <= 0) {
                continue;
            }
            $firstWord = explode(' ', trim($row['month']))[0] ?? '';
            $monthNo = $bulanNum[$firstWord] ?? 12;
            $due = \Carbon\Carbon::create(2026, $monthNo, 1)->endOfMonth();
            \App\Models\PaymentSchedule::create([
                'ref_type' => 'manual',
                'ref_id' => null,
                'due_date' => $due->toDateString(),
                'amount' => $row['amount'],
                'description' => 'Outstanding '.trim($row['toko']).' — '.$row['month'].($row['cek'] ? ' (cek '.$row['cek'].')' : ''),
                'status' => $row['lunas'] ? 'lunas' : 'menunggu',
                'paid_at' => $row['lunas'] ? $due->toDateString() : null,
            ]);
        }
    }

    /**
     * Metadata scan Dokumen_Kapal (646 file / 20 folder pair materi klien).
     * File TIDAK disalin — hanya record Document (unggahan, expiry dari nama file).
     */
    private function seedDokumenKapal(): void
    {
        if (\App\Models\Document::where('archive_location', 'like', 'Dokumen_Kapal%')->exists()) {
            return;
        }

        $uploader = User::where('email', 'dokumen@bungateratai.id')->first() ?? User::first();
        $folders = require __DIR__.'/data/dokumen_kapal.php';

        // keyword (urut, first-match) -> kode kategori dokumen
        $catMap = [
            'SURAT UKUR' => 'B2', 'SURAT LAUT' => 'B1', 'GROSS' => 'B1', 'SPEK' => 'B1', 'CALL SIGN' => 'B1',
            'KONTRUKSI' => 'C1', 'KONSTRUKSI' => 'C1', 'BKI KLASS' => 'C1', 'BKI LAMBUNG' => 'C1',
            'BKI MESIN' => 'C1', 'GARIS MUAT' => 'C1',
            'PERLENGKAPAN' => 'C2', 'RADIO' => 'C2', 'SNPP' => 'C2', 'IMDG' => 'C2', 'PEMADAM' => 'C2',
            'LIFERAFT' => 'C2', 'HRU' => 'C2', 'HYDRO' => 'C2', 'ANTI TERITIP' => 'C2', 'AFS' => 'C2',
            'KESELAMATAN' => 'C2', 'SMC' => 'C2',
            'CLC' => 'C3', 'WRC' => 'C3', 'ILR' => 'C3', 'PMK' => 'C3',
            'SAFE' => 'D1', 'KESEHATAN' => 'D3', 'SANITASI' => 'D3',
            'SIUPAL' => 'A3', 'ASURANSI' => 'E3', 'BLUE CARD' => 'E3', 'COI' => 'E3',
        ];
        $categoryByCode = \App\Models\DocumentCategory::pluck('id', 'code');
        $fleetIds = [];
        foreach (\App\Models\Vessel::all() as $v) {
            $fleetIds[mb_strtolower($v->vessel_name)] = $v->id;
        }

        foreach ($folders as $folder => $info) {
            foreach ($info['files'] as $f) {
                // 1 file -> 1 kapal: derive dari nama file ('TB 32', 'BG 115', 'TATA', 'KMP'),
                // fallback ke kapal pertama folder (file tanpa kode).
                $derived = $this->vesselFromFile($f['file'], $info['vessels']);
                $vesselId = $this->resolveVesselId($derived);
                if (! $vesselId && $info['vessels']) {
                    $vesselId = $this->resolveVesselId($info['vessels'][0]);
                }
                if (! $vesselId) {
                    continue;
                }

                $catCode = 'B1';
                $upper = mb_strtoupper($f['file']);
                foreach ($catMap as $keyword => $code) {
                    if (mb_strpos($upper, $keyword) !== false) {
                        $catCode = $code;
                        break;
                    }
                }
                \App\Models\Document::create([
                    'document_name' => preg_replace('/\.pdf$/i', '', $f['file']),
                    'category_id' => $categoryByCode[$catCode] ?? null,
                    'owner_type' => 'vessel',
                    'owner_id' => $vesselId,
                    'source_type' => 'unggahan',
                    'issue_date' => null,
                    'has_expiry' => $f['exp'] !== null,
                    'expiry_date' => $f['exp'],
                    'verification_status' => 'verified',
                    'uploaded_by' => $uploader->id,
                    'responsible_person' => 'Staf Dokumen',
                    'archive_location' => 'Dokumen_Kapal (materi klien)',
                    'notes' => 'Metadata scan: '.$folder.'/'.$f['file'],
                ]);
            }
        }
    }

    /** Tebak kapal dari nama file scan ('001 TB 32 SURAT UKUR' -> 'TB Syukur 32'). */
    private function vesselFromFile(string $file, array $folderVessels): ?string
    {
        $u = mb_strtoupper($file);
        if (preg_match('/\bTB(?:\s+SYUKUR)?\s+(\d{1,3})\b/', $u, $m)) {
            return 'TB Syukur '.$m[1];
        }
        if (preg_match('/\bBG(?:\s+SYUKUR)?\s+(\d{1,3})\b/', $u, $m)) {
            return 'BG Syukur '.$m[1];
        }
        if (mb_strpos($u, 'TATA') !== false) {
            return 'KM Tata Armada 01';
        }
        if (mb_strpos($u, 'PRINCE') !== false || mb_strpos($u, 'KMP') !== false) {
            return 'KM Prince Soya';
        }
        return $folderVessels[0] ?? null;
    }

    /** Cari vessel id dari nama materi (case-insensitive; varian 'KM. Prince Soya' / 'TATA ARMADA 01'). */
    private function resolveVesselId(?string $name): ?int
    {
        $target = mb_strtolower(trim(preg_replace('/\s+/', ' ', str_replace('.', '', (string) $name))));
        if ($target === '') {
            return null;
        }
        foreach (\App\Models\Vessel::all() as $v) {
            $vn = mb_strtolower(trim(preg_replace('/\s+/', ' ', str_replace('.', '', $v->vessel_name))));
            if ($vn === $target || str_ends_with($vn, $target) || str_ends_with($target, $vn)) {
                return $v->id;
            }
        }
        return null;
    }
}
