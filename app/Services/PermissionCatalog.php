<?php

namespace App\Services;

use App\Models\Permission;
use Illuminate\Support\Facades\Cache;

/**
 * Katalog izin kanonik (satu-satunya sumber daftar permission).
 *
 * Default grant direplikasi PERSIS dari Gate lama (AppServiceProvider) +
 * policy (Vessel/Document/Voyage) supaya perilaku tidak berubah saat migrasi
 * ke RBAC configurable. Setelah itu Super Admin boleh menambah/mengurangi
 * lewat halaman Pengaturan -> Hak Akses.
 *
 * Aturan integrasi:
 * - Gate::before di AppServiceProvider menanyakan katalog ini dulu
 *   (super_admin selalu true; izin terkelola yang tidak diberikan = tolak;
 *   ability yang tidak ada di katalog = jatuh ke Gate/policy lama).
 * - Policy (create/update/verify/approve/submit) juga menanyakan izin
 *   modulnya (fleet.create, documents.verify, dst.) sebelum logika role lama.
 */
class PermissionCatalog
{
    /** @var array<string, true>|null */
    private static ?array $codes = null;

    /**
     * Apakah tabel permissions sudah terisi (selesai di-seed)?
     * false = RBAC belum diinisialisasi (mis. migrate tanpa seed) -> Gate/policy
     * lama dipakai agar aplikasi tidak lumpuh untuk semua role non-superadmin.
     */
    public static function isInitialized(): bool
    {
        return Cache::remember('rbac.initialized', 60, fn () => Permission::query()->exists());
    }

    public static function flushInitCache(): void
    {
        Cache::forget('rbac.initialized');
    }

    /**
     * Semua izin: [code, label, module, action, description]
     *
     * @return list<array{code: string, label: string, module: string, action: string, description: string|null}>
     */
    public static function all(): array
    {
        $menu = fn (string $code, string $label) => [$code, $label, 'menu', 'special', 'Akses tampilnya menu di sidebar'];

        $items = [
            // --- Akses menu (route-level, sama dengan Gate menu.* lama) ---
            $menu('menu.dashboard', 'Menu Dashboard'),
            $menu('menu.fleet', 'Menu Armada'),
            $menu('menu.documents', 'Menu Arsip Dokumen Terpadu'),
            $menu('menu.voyages', 'Menu Perjalanan (Voyage)'),
            $menu('menu.operations', 'Menu Operasional'),
            $menu('menu.approvals', 'Menu Persetujuan'),
            $menu('menu.finance', 'Menu Keuangan'),
            $menu('menu.inventory', 'Menu Inventaris'),
            $menu('menu.hr', 'Menu SDM / Crewing'),
            $menu('menu.reports', 'Menu Laporan'),
            $menu('menu.audit', 'Menu Jejak Audit'),
            $menu('menu.settings', 'Menu Pengaturan'),
            $menu('menu.notifications', 'Menu Notifikasi'),

            // --- Armada (VesselPolicy: create/update = ship_ops + management) ---
            ['fleet.view', 'Armada: lihat', 'fleet', 'view', 'Melihat daftar & detail kapal'],
            ['fleet.create', 'Armada: tambah kapal', 'fleet', 'create', 'Membuat kapal baru'],
            ['fleet.update', 'Armada: ubah kapal', 'fleet', 'update', 'Mengubah data kapal (termasuk posisi manual)'],

            // --- Dokumen (DocumentPolicy) ---
            ['documents.view', 'Dokumen: lihat', 'documents', 'view', 'Melihat arsip dokumen'],
            ['documents.upload', 'Dokumen: unggah', 'documents', 'create', 'Mengunggah dokumen baru'],
            ['documents.update', 'Dokumen: ubah', 'documents', 'update', 'Mengubah metadata / versi dokumen'],
            ['documents.submit', 'Dokumen: kirim periksa', 'documents', 'special', 'Mengirim dokumen untuk pemeriksaan'],
            ['documents.verify', 'Dokumen: verifikasi', 'documents', 'special', 'Setujui / revisi / tolak dokumen (Supervisor)'],
            ['documents.void', 'Dokumen: batalkan terbit', 'documents', 'special', 'Membatalkan dokumen terbit (void, nomor tidak dipakai ulang)'],
            ['documents.generate', 'Dokumen: terbitkan (PDF/Excel)', 'documents', 'special', 'Menerbitkan SPAL/invoice/keagenan/surat dari template'],

            // --- Voyage (VoyagePolicy) ---
            ['voyages.view', 'Voyage: lihat', 'voyages', 'view', 'Melihat daftar & detail perjalanan'],
            ['voyages.create', 'Voyage: buat', 'voyages', 'create', 'Membuat perjalanan baru'],
            ['voyages.update', 'Voyage: ubah', 'voyages', 'update', 'Mengubah data perjalanan (DSR, data penumpang, dll.)'],
            ['voyages.transition', 'Voyage: ubah status', 'voyages', 'special', 'Transisi 13 status (gate server teta berlaku)'],
            ['voyages.approve', 'Voyage: persetujuan', 'voyages', 'special', 'Persetujuan internal & konfirmasi eksternal'],

            // --- Operasional (gate lama operations.manage) ---
            ['operations.manage', 'Operasional: kelola', 'operations', 'manage', 'Kondisi, servis, BBM, posisi manual'],

            // --- Keuangan ---
            ['finance.manage', 'Keuangan: kelola', 'finance', 'manage', 'Invoice, bill, bayar, jurnal (pintu lama finance.manage)'],
            ['finance.view-balances', 'Keuangan: lihat saldo', 'finance', 'special', 'Melihat total saldo kas & bank perusahaan'],
            ['finance.view', 'Keuangan: lihat modul', 'finance', 'view', 'Melihat tab keuangan'],
            ['finance.invoice', 'Keuangan: invoice', 'finance', 'create', 'Membuat & menerbitkan invoice'],
            ['finance.payment', 'Keuangan: pembayaran', 'finance', 'create', 'Mencatat penerimaan / pembayaran'],
            ['finance.journal', 'Keuangan: jurnal manual', 'finance', 'update', 'Membuat / mengedit jurnal manual'],

            // --- Inventaris ---
            ['inventory.view', 'Inventaris: lihat', 'inventory', 'view', 'Melihat stok & aset'],
            ['inventory.manage', 'Inventaris: kelola', 'inventory', 'manage', 'Stok opname, servis, pengadaan, penyusutan'],

            // --- SDM / Crewing ---
            ['hr.view', 'SDM: lihat', 'hr', 'view', 'Melihat modul SDM'],
            ['hr.crew', 'SDM: kelola awak', 'hr', 'manage', 'Sign ON/OFF, mutasi, sijil, kadet, daftar hadir'],
            ['hr.payroll', 'SDM: payroll', 'hr', 'manage', 'Generate & posting payroll'],

            // --- Hours of Rest (MLC 2006) ---
            ['hor.view', 'Hours of Rest: lihat', 'hours_of_rest', 'view', 'Melihat register jam istirahat awak'],
            ['hor.manage', 'Hours of Rest: kelola', 'hours_of_rest', 'manage', 'Mencatat & menyinkronkan jam istirahat awak'],

            // --- Laporan & audit ---
            ['reports.view', 'Laporan: lihat', 'reports', 'view', 'Melihat laporan'],
            ['reports.export', 'Laporan: ekspor', 'reports', 'export', 'Ekspor Excel Master Tracker & laporan lain'],
            ['audit.view', 'Jejak Audit: lihat', 'audit', 'view', 'Melihat jejak audit'],

            // --- Pengaturan ---
            ['settings.view', 'Pengaturan: lihat', 'settings', 'view', 'Membuka halaman Pengaturan'],
            ['settings.users', 'Pengaturan: kelola user', 'settings', 'manage', 'Menambah / mengubah / menghapus user & role'],
            ['settings.templates', 'Pengaturan: template & nomor', 'settings', 'manage', 'Template dokumen & pola nomor surat'],
            ['settings.rbac', 'Pengaturan: hak akses (RBAC)', 'settings', 'manage', 'Mengatur izin per role (hanya Super Admin)'],

            // --- Sinkronisasi maritim ---
            ['sync.offline', 'Sinkronisasi: mode offline', 'sync', 'special', 'Memakai mode offline (outbox) & menyinkronkan ke kantor'],
            ['sync.conflicts', 'Sinkronisasi: kelola konflik', 'sync', 'manage', 'Melihat & menyelesaikan konflik sinkronisasi kapal vs kantor'],
        ];

        return array_map(
            fn (array $p) => [
                'code' => $p[0],
                'label' => $p[1],
                'module' => $p[2],
                'action' => $p[3],
                'description' => $p[4],
            ],
            $items
        );
    }

    /** @return array<string, true> */
    public static function codes(): array
    {
        return self::$codes ??= array_column(self::all(), null, 'code');
    }

    public static function isManaged(string $ability): bool
    {
        return isset(self::codes()[$ability]);
    }

    /**
     * Default grant per role — REPLIKASI PERSIS perilaku Gate/policy lama.
     * Super Admin tidak dicatat di pivot (selalu bypass), tapi ditampilkan
     * tercentang penuh di matriks.
     *
     * @return array<string, list<string>> role slug => kode izin
     */
    public static function defaults(): array
    {
        $allMenus = [
            'menu.dashboard', 'menu.fleet', 'menu.documents', 'menu.voyages',
            'menu.operations', 'menu.reports', 'menu.notifications',
        ];
        $allView = [
            'fleet.view', 'documents.view', 'voyages.view',
            'reports.view', 'reports.export', 'sync.offline',
        ];

        $everyone = [...$allMenus, ...$allView];

        return [
            'management' => [...$everyone,
                'menu.approvals', 'menu.finance', 'menu.inventory', 'menu.hr', 'menu.audit',
                'fleet.create', 'fleet.update',
                'voyages.create', 'voyages.update', 'voyages.transition', 'voyages.approve',
                'operations.manage', 'finance.view-balances', 'finance.view',
                'inventory.view', 'inventory.manage',
                'hr.view', 'hr.crew', 'hr.payroll',
                'audit.view', 'hor.view', 'hor.manage',
            ],
            'ship_ops' => [...$everyone,
                'menu.inventory', 'menu.hr',
                'fleet.create', 'fleet.update',
                'documents.upload', 'documents.update', 'documents.submit',
                'voyages.create', 'voyages.update', 'voyages.transition',
                'operations.manage', 'inventory.view', 'inventory.manage',
                'hr.view', 'hr.crew', 'hr.payroll',
                'hor.view', 'hor.manage',
            ],
            'doc_controller' => [...$everyone,
                'menu.settings',
                'documents.upload', 'documents.update', 'documents.submit', 'documents.void',
                'settings.view', 'settings.users', 'settings.templates',
                'hor.view',
            ],
            'supervisor' => [...$everyone,
                'menu.approvals',
                'documents.verify', 'documents.void',
                'voyages.approve',
                'hor.view',
            ],
            'finance' => [...$everyone,
                'menu.finance', 'menu.inventory', 'menu.hr',
                'finance.manage', 'finance.view', 'finance.invoice', 'finance.payment', 'finance.journal',
                'documents.generate',
                'inventory.view', 'inventory.manage',
                'hr.view', 'hr.crew', 'hr.payroll',
                'hor.view',
            ],
            'auditor' => [...$everyone,
                'menu.finance', 'menu.inventory', 'menu.audit',
                'finance.view', 'finance.view-balances',
                'inventory.view',
                'audit.view',
            ],
        ];
    }
}
