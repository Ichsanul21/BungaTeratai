# AGENTS.md

## Apa ini

**PortWind Intelligence** — prototype ERP manajemen dokumen & operasi pelayaran (PT Bunga Teratai, Samarinda). Status: **belum ada kode** sampai scaffold selesai; sumber kebenaran adalah spek di `docs/`.

Stack terpilih: **Laravel 13 + Inertia (React 19 + TypeScript) + SQLite + Tailwind v4 + Recharts + Leaflet + lucide-react**. Desktop-first, UI **Bahasa Indonesia**, timezone **Asia/Makassar (WITA)**.

## Baca dulu: `/docs` (gitignored — spesifikasi internal)

Urutan baca sebelum menyentuh kode:

1. `docs/README.md` — index & prinsip
2. `docs/06-data-model.md` — ±55 tabel, relasi (ini kontrak skemanya)
3. `docs/02-product-modules.md` + `docs/03-erp-modules.md` — aturan bisnis per modul
4. `docs/04-navigation.md`, `docs/05-ui-ux.md`, `docs/07-rbac.md` — menu, palet, 7 role
5. `docs/08-user-journeys.md` — acceptance criteria (checklist verifikasi akhir)
6. `docs/10-implementation-roadmap.md` — urutan build Phase 0–8, ikuti exit criteria-nya

Aturan spek yang gampang dilanggar (hafalkan):

- **`#C41212` primer**; sidebar `#172B3A`; sukses `#2F8F68` / waspada `#D99A2B` / bahaya `#C94C4C`. Warna SELALU + teks + ikon. Palet lengkap di `docs/05-ui-ux.md`.
- Dokumen punya **2 kolom status terpisah**: `verification_status` (8 status) vs **masa berlaku terhitung** (Normal/Expiring Soon/Expired). Dokumen `has_expiry=false` → **jangan pernah** buat tanggal kedaluwarsa fiktif / reminder.
- Voyage punya **13 status** berurutan; `Ready for Departure` wajib lolos validasi server (checklist lengkap + approval internal + bukti approval eksternal berupa lampiran). Approval internal ≠ persetujuan otoritas (tampilkan teks penolakan di UI).
- Checklist bersifat **wajib vs kondisional** sesuai jenis kapal × tipe navigasi × muatan — jangan pernah anggap kondisional wajib untuk semua voyage.
- Data demo wajib berlabel **`DEMO DATA`** (badge header permanen). Armada = KM Prince Soya (data publik, tetap berlabel) + fiktif (TB Samudra 01, BG Samudra 08, TB Nusantara 02, KM Etam Bahari, KM Pesisir Raya). Jangan masukkan identitas/dokumen asli client.
- **Larangan klaim**: AIS/GGPS real-time, SPB otomatis, email/WA terkirim, integrasi otoritas — semua simulasi, jangan ditampilkan sebagai fitur aktif.
- Harga sewa/kinerja BBM: asist **kolong jembatan = beban (Hutang)**, bukan pendapatan. Pendapatan = towing, sewa tongkang, tiket.
- Target angka seed spek §7: 12 kapal (8 siap / 3 tindak lanjut / 1 ditinjau), 6 voyage aktif / 4 pending review, 5 dokumen expiring.

## Perintah (Windows, PowerShell)

```powershell
php artisan serve                    # server dev (port 8000)
npm run dev                          # Vite dev
npm run build                        # VERIFIKASI wajib sebelum selesai task
php artisan migrate:fresh --seed     # reset + seed demo (wajib tetap sukses)
php artisan breeze:install react     # scaffold awal (sekali saja)
```

- **Test suite: `php artisan test`** (PHPUnit sudah dikonfigurasi; `tests/Feature/PortWindTest.php` memuat smoke 13 menu + RBAC + journey dokumen). Wajib lulus bersama `npm run build` sebelum selesai task. Verifikasi akhir = `php artisan test` → `php artisan migrate:fresh --seed` → `npm run build` → uji manual journey di `docs/08-user-journeys.md`.
- Urutan verifikasi: `php artisan migrate:fresh --seed` → `npm run build` → cek alur di browser.
- SQLite: `database/database.sqlite`; file `*.sqlite` ada di `.gitignore` (di-seed ulang, jangan di-commit).
- Environment: PHP 8.3.30, Composer 2.9.4, Node 22.22.0, npm 11.14.1 — tidak ada pnpm/yarn.

## Konvensi repo

- **.gitignore root sudah dibuat** (Laravel + Node + SQLite + `/docs/` + `/storage/app/documents/`). Jangan ganti; jika scaffold menimpa, merge — wajib pertahankan baris `/docs/` dan upload privat.
- Semua tulisan UI bahasa Indonesia, format `Rp` (id-ID), tanggal WITA.
- Jurnal ganda: **hanya lewat `JournalService`** (satu pintu) — jangan bikin jurnal manual di controller.
- Status/enum: pakai PHP enum di `app/Enums/` (VoyageStatus, VerificationStatus, dll), jangan string lepas.
- RBAC: Laravel **Policies** di route (`authorize()`), bukan cuma sembunyikan tombol. 7 role: super_admin, management, ship_ops, doc_controller, supervisor, finance, auditor (multi-role via pivot).
- File dokumen: simpan privat `storage/app/documents/`, nama UUID, unduh hanya via route terautentikasi. Validasi MIME **dan** ekstensi (PDF/JPG/PNG).
- Setiap perubahan penting tulis `audit_logs` (before/after JSON) — hook lewat observer/service.
- Data penting: **soft delete / arsip**, jangan hard delete.

## Struktur yang akan dipakai

- `app/Http/Controllers/` per modul · `app/Services/` (DocumentCompleteness, Reminder, FuelAnalysis, Journal, Payroll, VoyageWorkflow, Audit) · `app/Policies/` · `app/Enums/`
- `resources/js/Pages/<menu>/` mengikuti 13 menu sidebar (`docs/04-navigation.md`); tab = komponen dalam folder page
- `resources/js/Components/` — `ui/`, `layout/` (Sidebar, Topbar), shared (Badge, DataTable, TabNav)
- Seed: `database/seeders/DemoDataSeeder.php` — satu pintu data demo, tetap memenuhi angka target spek
