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
 * Satu pintu data demo PortWind Intelligence.
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
            ['name' => 'Admin PortWind', 'email' => 'admin@bungateratai.id', 'role' => 'super_admin'],
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
            'address' => 'Jl. Nakhoda No. 35, Samarinda Ilir',
            'city' => 'Samarinda',
            'phone' => '(0541) 731034',
            'email' => 'demo@bungateratai.id',
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
     * 12 kapal demo — target spek §7: 8 siap / 3 tindak lanjut / 1 ditinjau.
     * KM Prince Soya = data publik; sisanya fiktif. Semua = DEMO DATA.
     */
    private function seedFleet(): void
    {
        if (\App\Models\Vessel::count() > 0) {
            return;
        }

        $vessels = [
            // [nama, tipe, navigasi, imo, mmsi, callsign, tahun, loa, beam, gt, dwt, kapasitas, satuan, mesin, bbm, baseline, pemilik, lokasi, status, catatan]
            ['KM Prince Soya', 'kapal_penumpang', 'laut', '9110157', '525200166', 'PNSR', 1995, 95.70, 15.02, 1566, 763, 1800, 'penumpang', 'MAN B&W 8L32/40', 'MDO', 300, 'PT Bunga Teratai', 'Pelabuhan Samarinda', 'aktif', 'Ro-Ro penumpang. Insiden kebakaran dek 1 Agustus 2026 (tanpa korban jiwa) — DEMO DATA.'],
            ['TB Samudra 01', 'tugboat', 'laut', null, '525201001', 'PKSA1', 2012, 24.50, 7.20, 165, 90, null, null, '2 × Cummins KTA38', 'Diesel', 95, 'PT Bunga Teratai', 'Sungai Kunjang, Samarinda', 'aktif', null],
            ['BG Samudra 08', 'tongkang', 'laut', null, '525201002', 'PKSB8', 2010, 60.00, 14.00, 850, 1600, 1500, 'ton', '— (ditowel)', '—', null, 'PT Bunga Teratai', 'Sungai Kunjang, Samarinda', 'aktif', 'Tongkang muatan umum.'],
            ['TB Nusantara 02', 'tugboat', 'laut', null, '525201003', 'PKSC2', 2016, 26.00, 8.00, 210, 120, null, null, '2 × CAT 3512B', 'Diesel', 110, 'PT Bunga Teratai', 'Pelabuhan Samarinda', 'aktif', null],
            ['KM Etam Bahari', 'kapal_penumpang', 'sungai_danau', null, '525201004', 'PKSD4', 2014, 42.00, 9.00, 320, 120, 320, 'penumpang', '2 × Mitsubishi S6R', 'Diesel', 160, 'PT Bunga Teratai', 'Dermaga Tenggarong', 'aktif', 'Pelayaran sungai Mahakam.'],
            ['KM Pesisir Raya', 'kapal_penumpang', 'laut', null, '525201005', 'PKSE5', 2008, 72.00, 13.00, 980, 450, 950, 'penumpang', '2 × MAN 6L16/24', 'MDO', 280, 'PT Bunga Teratai', 'Pelabuhan Samarinda', 'aktif', null],
            ['TB Bunga Teratai I', 'tugboat', 'sungai_danau', null, '525201006', 'PKSF6', 2018, 19.80, 6.50, 130, 60, null, null, '2 × Yanmar 6EY', 'Diesel', 85, 'PT Bunga Teratai', 'Sungai Mahakam', 'aktif', null],
            ['TB Bunga Teratai II', 'tugboat', 'sungai_danau', null, '525201007', 'PKSG7', 2019, 19.80, 6.50, 130, 60, null, null, '2 × Yanmar 6EY', 'Diesel', 88, 'PT Bunga Teratai', 'Sungai Mahakam', 'aktif', null],
            ['BG Samudra 09', 'tongkang', 'sungai_danau', null, '525201008', 'PKSH8', 2015, 45.00, 11.00, 520, 900, 900, 'ton', '— (ditowel)', '—', null, 'PT Bunga Teratai', 'Loa Buah, Samarinda', 'aktif', null],
            ['BG Mahakam 03', 'tongkang', 'laut', null, '525201009', 'PKSI9', 2011, 70.00, 15.00, 980, 1800, 1800, 'ton', '— (ditowel)', '—', null, 'PT Bunga Teratai', 'Sungai Kunjang, Samarinda', 'aktif', null],
            ['TB Cakra 05', 'tugboat', 'laut', null, '525201010', 'PKSJ0', 2013, 22.00, 7.00, 150, 80, null, null, '2 × Mitsubishi S6A3', 'Diesel', 100, 'PT Bunga Teratai', 'Galangan, Samarinda', 'dalam_perbaikan', 'Sedang perbaikan mesin utama.'],
            ['KM Sungai Kunjang', 'kapal_penumpang', 'penyeberangan', null, '525201011', 'PKSK1', 2020, 36.00, 9.50, 240, 80, 250, 'penumpang', '2 × Yamaha Marine (diesel)', 'Diesel', 140, 'PT Bunga Teratai', 'Dermaga Sungai Kunjang', 'aktif', 'Penyeberangan sungai.'],
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
            // 3 kapal tindak lanjut: requirement yang sengaja TIDAK dibuat
            'BG Samudra 09' => ['C_DRYDOCK', 'C_PEMERIKSAAN_TAHUNAN', 'B_CEK_FISIK', 'D_MEDICAL', 'D_BST', 'C_RADIO'],
            'BG Mahakam 03' => ['C_SKL', 'C_DRYDOCK', 'B_STKB', 'D_SKK', 'C_RADIO', 'D_MEDICAL', 'B_CEK_FISIK'],
            'TB Cakra 05' => ['C_PEMERIKSAAN_TAHUNAN', 'B_SHIP_PARTICULARS', 'D_BST', 'C_FIRE', 'D_MEDICAL'],
        ];

        // 1 kapal ditinjau: semua dokumen ada, 1 berstatus under_review
        $underReviewVessel = 'KM Sungai Kunjang';

        $expiringSoonDocs = [
            ['KM Prince Soya', 'C_RADIO'], ['TB Samudra 01', 'C_SKL'],
            ['KM Etam Bahari', 'C_PEMERIKSAAN_TAHUNAN'], ['KM Pesisir Raya', 'B_CEK_FISIK'],
            ['TB Nusantara 02', 'D_MEDICAL'],
        ];
        $expiredDocs = [
            ['BG Samudra 08', 'C_FIRE'], ['TB Bunga Teratai I', 'C_RADIO'],
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

    private function seedHr(): void
    {
        if (\App\Models\Crew::count() > 0) {
            return;
        }

        $ranks = ['nakhoda', 'chief_engineer', 'mualim', 'mualim_2', 'juru_mudi', 'kelasi', 'oiler', 'juru_masak', 'abk'];
        $names = [
            'H. Rusdiansyah', 'Ir. Marwan Hakim', 'Syaifuddin', 'Agus Salim', 'M. Arifin',
            'Dedi Kurniawan', 'Rahmat Hidayat', 'Joko Prasetyo', 'Muslimin', 'Ansar',
            'Hendrik Tampubolon', 'Muhammad Fauzi', 'Iwan Setiawan', 'Slamet Riyadi', 'Yusuf Ali',
            'Abdul Rahman', 'Ismail Marzuki', 'Tarmizi', 'Burhanuddin', 'Nasrullah',
        ];

        $vessels = \App\Models\Vessel::where('vessel_type', '!=', 'tongkang')->get();
        foreach ($names as $i => $name) {
            $rank = $ranks[$i % count($ranks)];
            $crew = \App\Models\Crew::create([
                'name' => $name,
                'nik' => '6471'.mt_rand(1000000000, 9999999999),
                'birth_place' => ['Samarinda', 'Balikpapan', 'Tenggarong', 'Bontang', 'Penajam'][mt_rand(0, 4)],
                'birth_date' => now()->subYears(mt_rand(22, 52))->toDateString(),
                'gender' => 'L',
                'phone' => '08'.mt_rand(1100000000, 9999999999),
                'npwp' => mt_rand(0, 1) ? sprintf('9%d.%03d.%03d.000-%03d', mt_rand(100, 999), mt_rand(100, 999), mt_rand(100, 999), mt_rand(100, 999)) : null,
                'rank' => $rank,
                'base_salary' => match ($rank) {
                    'nakhoda' => 8500000, 'chief_engineer' => 7500000, 'mualim', 'mualim_2' => 5500000,
                    default => mt_rand(2800000, 4200000),
                },
                'status' => 'aktif',
            ]);
            // typo di match — perbaiki manual
            $crew->update(['base_salary' => match ($rank) {
                'nakhoda' => 8500000,
                'chief_engineer' => 7500000,
                'mualim', 'mualim_2' => 5500000,
                default => mt_rand(2800000, 4200000),
            }]);

            if ($i < count($vessels) * 2) {
                $vessel = $vessels[$i % count($vessels)];
                \App\Models\CrewAssignment::create([
                    'crew_id' => $crew->id,
                    'vessel_id' => $vessel->id,
                    'role' => $rank,
                    'start_date' => now()->subMonths(mt_rand(1, 18))->toDateString(),
                    'status' => 'aktif',
                ]);
            }

            // Sertifikat: sebagian expired / expiring
            $certs = [
                ['SKK', now()->addYears(mt_rand(1, 5)), now()->subYears(1)],
                ['medical_fitness', now()->addMonths(mt_rand(1, 20)), now()->subMonths(6)],
                ['BST', null, now()->subYears(3)],
            ];
            foreach ($certs as [$type, $expiry, $issued]) {
                $useExpiry = $type !== 'BST';
                if (! $useExpiry && mt_rand(0, 1)) {
                    continue;
                }
                $days = mt_rand(-40, 400);
                \App\Models\CrewCertificate::create([
                    'crew_id' => $crew->id,
                    'cert_type' => $type,
                    'number' => strtoupper($type).'-'.mt_rand(10000, 99999),
                    'issued_at' => $issued->toDateString(),
                    'has_expiry' => $useExpiry,
                    'expiry_date' => $useExpiry ? now()->addDays($days)->toDateString() : null,
                ]);
            }
        }

        $offices = [
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
            ['TB Samudra 01', 'kapal', 9500000000, 180, \App\Models\Vessel::where('vessel_name', 'TB Samudra 01')->value('id')],
            ['BG Samudra 08', 'tongkang', 6200000000, 240, \App\Models\Vessel::where('vessel_name', 'BG Samudra 08')->value('id')],
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
            ['internal_review', 'TB Samudra 01', 'BG Samudra 08', 'Bontang', 'batu_bara', 1500, 2],
            ['internal_review', 'TB Nusantara 02', 'BG Mahakam 03', 'Balikpapan', 'batu_bara', 1800, 3],
            ['awaiting_external_approval', 'TB Bunga Teratai I', 'BG Samudra 09', 'Tanjung Redeb', 'sawit', 900, 4],
            ['document_preparation', 'TB Bunga Teratai II', 'BG Samudra 08', 'Sangatta', 'batu_bara', 1600, 5],
            // 2 aktif non-review (siap/berangkat/dalam pelayaran)
            ['in_transit', 'TB Samudra 01', 'BG Mahakam 03', 'Taboneo', 'batu_bara', 1400, -2],
            ['departed', 'TB Nusantara 02', 'BG Samudra 09', 'Marunda', 'semen', 1200, -1],
            // 4 completed
            ['completed', 'TB Samudra 01', 'BG Samudra 08', 'Bontang', 'batu_bara', 1500, -30],
            ['completed', 'TB Nusantara 02', 'BG Mahakam 03', 'Balikpapan', 'batu_bara', 1700, -45],
            ['completed', 'TB Bunga Teratai I', 'BG Samudra 09', 'Tanjung Harapan', 'batu_bara', 1100, -60],
            ['completed', 'TB Bunga Teratai II', 'BG Samudra 08', 'Sangatta', 'curah_lain', 800, -75],
            // 1 delayed + 1 cancelled (variasi status)
            ['delayed', 'TB Samudra 01', 'BG Samudra 08', 'Bontang', 'batu_bara', 1300, 1],
            ['cancelled', 'TB Nusantara 02', 'BG Mahakam 03', 'Penajam', 'semen', 700, -5],
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
                        $workflow->transition($voyage, $s);
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
                $workflow->transition($voyage, $s);
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

        // Bills: assist kolong jembatan + operasional (6 bulan)
        $supplierAssist = \App\Models\Supplier::where('name', 'like', '%Pemandu%')->first()
            ?? \App\Models\Supplier::first();
        $supplierSparepart = \App\Models\Supplier::where('category', 'sparepart')->first();
        $supplierBengkel = \App\Models\Supplier::where('category', 'bengkel')->first();

        $billSpecs = [];
        for ($i = 0; $i < 16; $i++) {
            $billSpecs[] = ['assist', $supplierAssist, mt_rand(25, 80) * 100000, 'Jasa Assist Kolong Jembatan'];
        }
        for ($i = 0; $i < 6; $i++) {
            $billSpecs[] = ['sparepart', $supplierSparepart, mt_rand(2, 30) * 500000, 'Pengadaan sparepart'];
        }
        $billSpecs[] = ['drydock', $supplierBengkel, 78500000, 'Drydock BG Mahakam 03'];
        $billSpecs[] = ['bbm', \App\Models\Supplier::where('category', 'lainnya')->first() ?? \App\Models\Supplier::first(), 45000000, 'Pengadaan BBM solar marine'];
        $billSpecs[] = ['sewa', \App\Models\Supplier::where('category', 'lainnya')->first() ?? \App\Models\Supplier::first(), 25000000, 'Sewa pangkalan 3 bulan'];

        foreach ($billSpecs as $i => [$category, $supplier, $amount, $desc]) {
            if (! $supplier) {
                continue;
            }
            $issue = now()->subMonths(mt_rand(0, 5))->subDays(mt_rand(0, 25));
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

            if (mt_rand(0, 9) < 6) {
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

    /** 10 master template dokumen terbit + arsip (pola nomor sesuai materi klien). */
    private function seedDocumentTemplates(): void
    {
        if (\App\Models\DocumentTemplate::count() > 0) {
            return;
        }

        $templates = [
            ['SPAL', 'Surat Perjanjian Angkutan Laut', 'kontrak', 'spal', '{seq_raw}/{kode_penyewa}/FC/{kode_kapal}/{bulan_romawi}/{tahun}', 'ARS/SPAL/{tahun}/{seq}', false],
            ['INV_CHARTER', 'Invoice Charter (DP/Pelunasan)', 'invoice', 'invoice_charter', '{seq_raw}/INV-CHTR/{bulan_romawi}/{tahun}', 'ARS/INV/{tahun}/{seq}', false],
            ['KEAGENAN', 'Surat Penunjukan Keagenan', 'surat', 'keagenan', '{seq_raw}/{kode_penyewa}/AG/{bulan_romawi}/{tahun}', 'ARS/AGT/{tahun}/{seq}', false],
            ['PO', 'Purchase Order', 'po', 'po', '{seq}/PO-BT/TB/{bulan_romawi}/{tahun}', 'ARS/PO/{tahun}/{seq}', false],
            ['LAPORAN_EXPIRY', 'Monthly Document Expiry Report', 'laporan', 'monthly_report', 'LAP-EXP/{bulan_romawi}/{tahun}', null, false],
            ['LAPORAN_ENDORSEMENT', 'Monthly Document Endorsement Report', 'laporan', 'monthly_report', 'LAP-END/{bulan_romawi}/{tahun}', null, false],
            ['MASTER_TRACKER', 'TB BG Master Tracker Export', 'laporan', 'monthly_report', 'TRK/{bulan_romawi}/{tahun}', null, false],
            ['REKAP_NOTA', 'Rekap Nota', 'laporan', 'rekap_nota', 'RN/{bulan_romawi}/{tahun}', null, false],
            ['OUTSTANDING', 'Rencana Pembayaran Outstanding', 'laporan', 'outstanding', 'OUT/{bulan_romawi}/{tahun}', null, false],
            ['SURAT_UMUM', 'Surat Umum (Kop PT Bunga Teratai)', 'surat', 'generic_letter', '{seq}/BT/{bulan_romawi}/{tahun}', 'ARS/SU/{tahun}/{seq}', true],
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
}
