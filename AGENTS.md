# AGENTS.md

## Apa ini

**PortWind Intelligence** — prototype ERP manajemen dokumen & operasi pelayaran (PT Bunga Teratai, Samarinda). Status: **Fase 0–8 SELESAI** (aplikasi penuh, seed demo, 53 test hijau). **Fase A–E BELUM dieksekusi** (lihat bawah) — inilah pekerjaan berikutnya.

Stack: **Laravel 13 + Inertia (React 19 + TypeScript) + SQLite + Tailwind + Recharts + Leaflet + lucide-react**. Desktop-first, UI **Bahasa Indonesia**, timezone **Asia/Makassar (WITA)**, primer `#C41212`, sidebar `#172B3A`.

## Baca dulu: `/docs` (gitignored — spesifikasi internal)

1. `docs/README.md` — index & status
2. `docs/06-data-model.md` — ±68 tabel (kontrak skema; berisi skema Fase A–E yang akan dibangun)
3. `docs/02-product-modules.md` — aturan bisnis per modul (**M03 Arsip Dokumen Terpadu**, M04 Charter SPAL + Berkas Perjalanan, M09 Penerbitan Dokumen)
4. `docs/10-implementation-roadmap.md` — **Fase A–E** (urutan build selanjutnya, ikuti exit criteria)
5. `docs/08-user-journeys.md` — Journey A–N + acceptance criteria
6. `docs/01/03/04/05/07/09/11` — brief, ERP, navigasi, UI, RBAC, teknis, scope

Aturan spek yang gampang dilanggar (hafalkan):

- **`#C41212` primer**; sidebar `#172B3A`; sukses `#2F8F68` / waspada `#D99A2B` / bahaya `#C94C4C`. Warna SELALU + teks + ikon.
- Dokumen punya **2 kolom status terpisah**: `verification_status` vs **masa berlaku terhitung**; `has_expiry=false` → jangan pernah buat tanggal fiktif/reminder. Ditambah **endorsement cycle** terpisah (last/next/status) utk Surat Laut & Sertifikat Klasifikasi.
- Voyage punya **13 status**; `Ready for Departure` wajib lolos validasi server; approval internal ≠ persetujuan otoritas.
- **Arsip Dokumen Terpadu**: unggahan (scan fisik) & terbitan (hasil generate sistem) di tabel `documents` yang sama (`source_type`). **Setiap dokumen WAJIB berpenempatan `vessel` atau `company`** (owner_type required — tidak ada dokumen menggantung); inheritance: dari voyage → kapal otomatis, dari PO → unit kapal (kosong = umum), bukti bayar/nota → ikut PO-nya. Fleet Detail tab Dokumen = SEMUA dokumen milik kapal.
- **Numbering**: nomor terbit dari pola per template (`{seq}/PO-BT/TB/{roman}/{tahun}`, `{seq}/{kode_penyewa}/FC/{kode_kapal}/…`); nomor arsip internal `ARS/{kode}/{tahun}/{seq}` (counter terpisah) untuk unggahan; **nomor tidak dipakai ulang setelah void**. Labeling file: `{kode}-{nomor}-{kapal?}-{tanggal}.{ext}`.
- **SPAL = Surat Perjanjian Angkutan Laut** (kontrak charter, format GENCON). Alur: SI → SPAL → invoice DP 50% (+FP) → keagenan muat → DSR → invoice pelunasan (+FP) → keagenan bongkar → closing.
- **Faktur Pajak elektronik TIDAK dibuat sistem** (legalitas DJP) — hanya dicatat nomornya + file FP diunggah. PPN 11%; PPh jasa charter preset **1.2%** (juga 2%/custom).
- **Data demo**: armada asli dari materi klien (**TB Syukur 01/03/23/32/54/58/62 + BG Syukur 03/06/07/09/49/59/61**, KM Prince Soya, KM Etam Bahari) — nama kapal asli berizin dari materi klien; **transaksi/angka tetap simulasi berlabel `DEMO DATA`**. Alamat surat: Jl. Mulawarman No. 23 Samarinda, Telp 0541-731034, adm.teratai@gmail.com, Direktur H. Syarif, BRI Cab. Samarinda 1 a/c 0082-01000-409-309.
- **Assist kolong jembatan = beban (Hutang)** yang DIBAYAR perusahaan, bukan pendapatan.
- **Larangan klaim**: AIS/GGPS real-time, SPB otomatis, email/WA terkirim, integrasi otoritas/DJP — semua simulasi.
- PDF output = **rekonstruksi struktur via CSS print** (dompdf), bukan rasterisasi scan.

## Perintah (Windows, PowerShell)

```powershell
php artisan serve                    # server dev (port 8000)
npm run dev                          # Vite dev
npm run build                        # VERIFIKASI wajib sebelum selesai task
php artisan test                     # 53 test PortWindTest + Breeze — wajib lulus semua
php artisan migrate:fresh --seed     # reset + seed demo (±16 detik, wajib sukses)
```

- Verifikasi akhir berurutan: `php artisan test` → `php artisan migrate:fresh --seed` → `npm run build` → uji manual journey di `docs/08-user-journeys.md`.
- SQLite: `database/database.sqlite`; `*.sqlite` di-.gitignore (di-seed ulang, jangan commit).
- Environment: PHP 8.3.30, Composer 2.9.4, Node 22.22.0, npm 11.14.1 — tidak ada pnpm/yarn.
- Library yang AKAN ditambahkan (Fase B/C): `barryvdh/laravel-dompdf`, `maatwebsite/excel`.

## Konvensi repo

- **.gitignore root** (Laravel + Node + SQLite + `/docs/` + `/storage/app/documents/`). Jangan ganti; pertahankan baris `/docs/` & upload privat.
- Repo remote: `https://github.com/Ichsanul21/BungaTeratai.git` (branch `main`). Commit tematik per fase; jangan commit `.env`/sqlite.
- UI bahasa Indonesia, format `Rp` (id-ID), tanggal WITA.
- Jurnal ganda: **hanya lewat `JournalService`** — satu pintu.
- Status/enum: pakai PHP enum di `app/Enums/`.
- RBAC: **Policies + Gate per-menu** di route; 7 role via pivot `role_user`.
- File dokumen: privat `storage/app/documents/`, nama UUID (labeling file mengikuti konvensi `{kode}-{nomor}-{kapal?}-{tanggal}` saat generate), unduh via route terautentikasi. Validasi MIME + ekstensi (PDF/JPG/PNG, maks 10 MB).
- Audit: `AuditService::log()` pada setiap perubahan penting (before/after JSON).
- Data penting: **soft delete / arsip**, jangan hard delete. Dokumen terbit yang dibatalkan: `voided_at` diisi (nomor tidak dipakai ulang).

## Struktur yang sudah dibangun (Fase 0–8 SELESAI)

- `app/Http/Controllers/` — Dashboard, Fleet, Document, Voyage, Approvals, Notification, Operations, Finance (14 tab), Inventory, Hr, Reports, AuditTrail, Settings, Profile
- `app/Services/` — DocumentCompleteness, Reminder, FuelAnalysis, **JournalService (satu-satunya pintu jurnal)**, Payroll (PPh21 UU HPP), VoyageWorkflow (13 status tervalidasi), Audit
- `app/Policies/` — Vessel, Document, Voyage + Gate: `menu.*`, `operations.manage`, `finance.manage`, `verify-documents`
- `resources/js/Pages/` — 13 menu sidebar; tab = query param `?tab=` (server-driven)
- `database/seeders/DemoDataSeeder.php` — satu pintu seed: 12 kapal (8 siap/3 tindak lanjut/1 ditinjau), 15 voyage, 251 dokumen (5 expiring, 2 expired), 42 invoice, 25 bill (16 assist), payroll 6 bulan posted, 20 ABK, 15 karyawan, 20 item inventory, 116+ jurnal
- **Test: `tests/Feature/PortWindTest.php` (53 test / 244 assertions)** — smoke 13 menu + semua tab, RBAC 7 role, journey A–J, angka target spek

## Fase A–E (BELUM dieksekusi — urutan kerja berikutnya)

Detail per fase & exit criteria: `docs/10-implementation-roadmap.md`.

- **Fase A — CRUD lengkap semua modul + seed interkoneksi**: edit/hapus muncul di semua tabel (kolom Aksi + modal; armada/dokumen/voyage/kondisi/servis/BBM/inventory/batch/mutasi( reversal stok)/ABK/sertifikat/penempatan/karyawan/invoice(unpaid)/bayar(reversal jurnal)/bill/kas/jurnal manual(rewrite)/aset/jadwal bayar/akun/COA/payroll entry(draft)/customer/supplier/katalog/kategori/pengguna/notifikasi). Seeder: tongkang punya riwayat voyage (relasi tug↔tongkang), ~70 fuel_logs, inventory_movements + service_items, posisi+ kondisi semua kapal, asset_depreciations + jurnal, setor pajak berjurnal, approval dokumen.
- **Fase B — Fitur BahanBT**: template dokumen A1–K1 (TB vs BG, dukung Permanent) + **endorsement cycle** (docs + reminder terpisah + laporan bulanan Excel persis Master Tracker) · **Charter SPAL** (voyage tipe charter: SI intake → kontrak → invoice DP/pelunasan PPh 1.2% → keagenan muat/bongkar → DSR → closing; **Berkas Perjalanan** = agregasi satu layar) · **PO penuh** (purchase_orders+po_items, cetak PO, Buat Bill dari PO) · Outstanding/Rekap Nota + no cek/BG · Arsip SPT Unifikasi · **master document_templates CRUD** (pola nomor konfigurabel, surat umum tanpa programmer) + register dokumen terbit (tab Document Center).
- **Fase C — Engine generator dokumen**: `barryvdh/laravel-dompdf` + `maatwebsite/excel`; 10 output (PDF: SPAL 2 halaman GENCON, invoice DP/pelunasan, keagenan, PO; Excel: Master Tracker TugBoat/Barge, Monthly Expiry & Endorsement Report, Rekap Nota, Outstanding; PDF invoice keuangan berkop); autosimpan ke arsip (documents + version); tombol Terbitkan & Cetak kontekstual.
- **Fase D — Seed data klien**: armada TB/BG Syukur menggantikan fiktif Samudra/Nusantara (Prince Soya & Etam Bahari tetap); dokumen tracker A1–K1 nyata (expiry serial Excel + endorsement; sebagian Permanent); SPAL 104 lengkap (TB Syukur 23–BG Syukur 03, PT Sinar Laut Maritim, silica sand 7.500 MT × Rp125.000, invoice 197 DP & 211 pelunasan, 2 keagenan, PPh 1.2%); ~8 PO contoh; rencana pembayaran outstanding (Delta Artha Nusa dgn no cek/BG, Anugerah Lubrindo Raya dgn PO ref); arsip SPT 6 bulan; 10 template terbit dgn counter menyambung (lanjut #105/#361).
- **Fase E — Verifikasi & push**: ±18 test baru (endorsement reminder, SPAL workflow, PO→Bill, reversal bayar, seed Syukur, nomor urut, arsip terbit) → `php artisan test` → `migrate:fresh --seed` → `npm run build` → commit tematik (`feat: CRUD lengkap…`, `feat: arsip terpadu + penerbitan dokumen (BahanBT)`, `feat: generator PDF/Excel`, `chore: seed data klien`) → **push** ke main.

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
