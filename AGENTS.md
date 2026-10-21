# AGENTS.md

## Apa ini

**PortWind Intelligence** — prototype ERP manajemen dokumen & operasi pelayaran (PT Bunga Teratai, Samarinda). Status: **Phase 0–8 SELESAI** (aplikasi penuh + seed demo + 53 test hijau).

Stack: **Laravel 13 + Inertia (React 19 + TypeScript) + SQLite + Tailwind v4 + Recharts + Leaflet + lucide-react**. Desktop-first, UI **Bahasa Indonesia**, timezone **Asia/Makassar (WITA)**, primer `#C41212`, sidebar `#172B3A`.

## Baca dulu: `/docs` (gitignored — spesifikasi internal)

1. `docs/README.md` — index & prinsip
2. `docs/06-data-model.md` — ±55 tabel, relasi (kontrak skema)
3. `docs/02-product-modules.md` + `docs/03-erp-modules.md` — aturan bisnis per modul
4. `docs/04-navigation.md`, `docs/05-ui-ux.md`, `docs/07-rbac.md` — menu, palet, 7 role
5. `docs/08-user-journeys.md` — acceptance criteria
6. `docs/10-implementation-roadmap.md` — urutan build Phase 0–8 (sudah diikuti)

Aturan spek yang gampang dilanggar (hafalkan):

- **`#C41212` primer**; sidebar `#172B3A`; sukses `#2F8F68` / waspada `#D99A2B` / bahaya `#C94C4C`. Warna SELALU + teks + ikon.
- Dokumen punya **2 kolom status terpisah**: `verification_status` (8 status) vs **masa berlaku terhitung** (Normal/Expiring Soon/Expired). `has_expiry=false` → **jangan pernah** buat tanggal kedaluwarsa fiktif / reminder.
- Voyage punya **13 status** berurutan; `Ready for Departure` wajib lolos validasi server (checklist wajib terpenuhi + approval internal + **bukti** approval eksternal berupa lampiran). Approval internal ≠ persetujuan otoritas (teks penolakan ditampilkan di UI).
- Checklist **wajib vs kondisional** sesuai jenis kapal × tipe navigasi × muatan — jangan anggap kondisional wajib untuk semua voyage.
- Data demo wajib berlabel **`DEMO DATA`** (badge header permanen). Armada = KM Prince Soya (data publik, tetap berlabel) + fiktif. Jangan masukkan identitas/dokumen asli client.
- **Larangan klaim**: AIS/GGPS real-time, SPB otomatis, email/WA terkirim, integrasi otoritas — semua simulasi.
- **Assist kolong jembatan = beban (Hutang)** yang DIBAYAR perusahaan, bukan pendapatan. Pendapatan = towing, sewa tongkang, tiket.
- Angka target seed spek §7 dicek otomatis di test: 12 kapal (8 siap / 3 tindak lanjut / 1 ditinjau), 4 voyage menunggu review, 5 dokumen expiring.

## Perintah (Windows, PowerShell)

```powershell
php artisan serve                    # server dev (port 8000)
npm run dev                          # Vite dev
npm run build                        # VERIFIKASI wajib sebelum selesai task
php artisan test                     # 53 test PortWindTest + Breeze — wajib lulus semua
php artisan migrate:fresh --seed     # reset + seed demo (±14 detik, wajib sukses)
```

- Verifikasi akhir berurutan: `php artisan test` → `php artisan migrate:fresh --seed` → `npm run build` → uji manual journey di `docs/08-user-journeys.md`.
- SQLite: `database/database.sqlite`; `*.sqlite` di-.gitignore (di-seed ulang, jangan commit).
- Environment: PHP 8.3.30, Composer 2.9.4, Node 22.22.0, npm 11.14.1 — tidak ada pnpm/yarn.

## Konvensi repo

- **.gitignore root** (Laravel + Node + SQLite + `/docs/` + `/storage/app/documents/`). Jangan ganti; pertahankan baris `/docs/` & upload privat.
- Repo remote: `https://github.com/Ichsanul21/BungaTeratai.git` (branch `main`). Commit terpisah per fitur; jangan commit `.env`/sqlite.
- UI bahasa Indonesia, format `Rp` (id-ID), tanggal WITA.
- Jurnal ganda: **hanya lewat `JournalService`** — satu pintu.
- Status/enum: pakai PHP enum di `app/Enums/` (30 enum tersedia).
- RBAC: **Policies + Gate per-menu** di route; 7 role via pivot `role_user`. Route placeholder punya gate `menu.*`.
- File dokumen: privat `storage/app/documents/`, unduh via route terautentikasi. Validasi MIME + ekstensi (PDF/JPG/PNG, maks 10 MB).
- Audit: `AuditService::log()` pada setiap perubahan penting (before/after JSON).
- Data penting: **soft delete / arsip**, jangan hard delete.

## Struktur yang sudah dibangun (Phase 0–8 SELESAI)

- `app/Http/Controllers/` — Dashboard, Fleet, Document, Voyage, Approvals, Notification, Operations, Finance (14 tab), Inventory, Hr, Reports, AuditTrail, Settings, Profile
- `app/Services/` — DocumentCompleteness, Reminder, FuelAnalysis, **JournalService (satu-satunya pintu jurnal)**, Payroll (PPh21 UU HPP), VoyageWorkflow (13 status tervalidasi), Audit
- `app/Policies/` — Vessel, Document, Voyage + Gate: `menu.finance`, `menu.inventory`, `menu.hr`, `menu.audit`, `menu.settings`, `operations.manage`, `finance.manage`, `verify-documents`
- `resources/js/Pages/` — 13 menu sidebar; tab halaman memakai query param `?tab=` (server-driven)
- `database/seeders/DemoDataSeeder.php` — satu pintu seed: 12 kapal (8 siap/3 tindak lanjut/1 ditinjau), 15 voyage (4 menunggu review), 251 dokumen (5 expiring, 2 expired), 42 invoice tersebar ≥6 bulan, 25 bill (16 assist kolong jembatan), payroll 6 bulan posted, 20 ABK + sertifikat, 15 karyawan, 20 item inventory, 116+ jurnal entries
- **Test: `tests/Feature/PortWindTest.php` (53 test / 244 assertions)** — smoke 13 menu + semua tab, RBAC 7 role, journey A–F spek + G–J ERP, angka target spek §7

## Jebakan yang sudah ditemukan (JANGAN diulangi)

- **`Relation::morphMap`** ('voyage','document') wajib di AppServiceProvider — kolom `approvable_type` string pendek; morphMany error tanpa peta
- Tabel irregular: `service_catalog` & `voyage_cargo` → set `protected $table` di model
- `App\Models\Notification`: `const UPDATED_AT = null` — jangan pakai relasi `notifications()` bawaan trait Notifiable (bentrok skema)
- `AuditLog`: `$timestamps = false` + relasi `user()`
- PHP 8 melarang nested ternary telanjang → pakai `match(true)`
- Laravel 13 base Controller **tidak punya** `AuthorizesRequests` — tambah trait manual (sudah dilakukan)
- Validasi nullable: `$data['key']` bisa undefined → selalu `?? null`
- PowerShell `Set-Content -Encoding UTF8` = **BOM** → fatal PHP; pakai `[System.IO.File]::WriteAllText(path, content, UTF8Encoding($false))`
- `with()` hanya untuk relasi yang ada di model
- Seeder voyage: transisi status berurutan + prasyarat (approval internal → checklist wajib → **bukti eksternal** sebelum Ready for Departure)
- Jangan typo `Gate: : authorize` (spasi) — pernah terjadi 2×
