# AGENTS.md

## Apa ini

**Bunga Teratai System** — prototype ERP manajemen dokumen & operasi pelayaran (PT Bunga Teratai, Samarinda). Status: **Fase 0–G SELESAI** (aplikasi penuh, CRUD lengkap, generator PDF/Excel BahanBT, seed data klien **39 kapal + SPAL 104 + modul Crewing lengkap**, **68 test / 374 assertions hijau**).

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
- **Data demo**: armada asli dari materi klien — **39 kapal = 18 TB (01/03/11/23/30/32/36/45/51/52/54/56/58/62/70/75/78/82) + 18 BG (03/06/07/09/29/37/47/49/53/55/57/59/61/71/73/80/81/115) + KM Prince Soya + KM Etam Bahari + KM Tata Armada 01** (GT = asli dari Master Tracker); nama kapal asli berizin dari materi klien; **transaksi/angka tetap simulasi berlabel `DEMO DATA`**. Alamat surat: Jl. Mulawarman No. 23 Samarinda, Telp 0541-731034, adm.teratai@gmail.com, Direktur H. Syarif, BRI Cab. Samarinda 1 a/c 0082-01000-409-309.
- **Assist kolong jembatan = beban (Hutang)** yang DIBAYAR perusahaan, bukan pendapatan.
- **Larangan klaim**: AIS/GGPS real-time, SPB otomatis, email/WA terkirim, integrasi otoritas/DJP — semua simulasi.
- PDF output = **rekonstruksi struktur via CSS print** (dompdf), bukan rasterisasi scan.

## Perintah (Windows, PowerShell)

```powershell
php artisan serve                    # server dev (port 8000)
npm run dev                          # Vite dev
npm run build                        # VERIFIKASI wajib sebelum selesai task (sekalian compile SW PWA)
php artisan test                     # 102 test / 537 assertions — wajib lulus semua
php artisan migrate:fresh --seed     # reset + seed data klien (±45 detik, wajib sukses)
```

- Verifikasi akhir berurutan: `php artisan test` → `php artisan migrate:fresh --seed` → `npm run build` → uji manual journey di `docs/08-user-journeys.md`.
- SQLite: `database/database.sqlite`; `*.sqlite` di-.gitignore (di-seed ulang, jangan commit).
- Environment: PHP 8.3.30, Composer 2.9.4, Node 22.22.0, npm 11.14.1 — tidak ada pnpm/yarn.
- Library PDF/Excel: **`barryvdh/laravel-dompdf`** (generator SPAL/invoice/keagenan/PO/surat umum) + **`maatwebsite/excel`** (Master Tracker, Monthly Report, Rekap NotA, Outstanding). Export class wajib `implements Export` (marker interface maatwebsite v4). Nama file download wajib **tanpa `/`** (sanitasi `preg_replace('/[^A-Za-z0-9._-]+/', '_', ...)`).
- Generator: `app/Services/Generators/DocumentGeneratorService` + blade di `resources/views/pdf/`; setiap generate **otomatis terarsip** (documents source_type=terbitan + nomor arsip ARS/...). Nomor terbit: `NumberingService::next(template, replacements, 'terbit'|'arsip')` — counter per template (PO lanjut #363, SPAL #105, Keagenan #045, INV Charter #212, BT-OFF #108, Sijil #0548 — jangan direset). Placeholder tersedia: `{seq}` `{seq_raw}` `{seq4}` `{tahun}` `{tahun2}` `{bulan_romawi}` `{kode_penyewa}` `{kode_kapal}`.

## Konvensi repo

- **.gitignore root** (Laravel + Node + SQLite + `/docs/` + `/storage/app/documents/`). Jangan ganti; pertahankan baris `/docs/` & upload privat.
- Repo remote: `https://github.com/Ichsanul21/BungaTeratai.git` (branch `main`). Commit tematik per fase; jangan commit `.env`/sqlite.
- UI bahasa Indonesia, format `Rp` (id-ID), tanggal WITA.
- Jurnal ganda: **hanya lewat `JournalService`** — satu pintu.
- Status/enum: pakai PHP enum di `app/Enums/`.
- RBAC: **CONFIGURABLE** — katalog `app/Services/PermissionCatalog.php` (51 izin) + pivot `role_permission`, Gate::before di AppServiceProvider menanyakan katalog dulu (super_admin selalu true; izin terkelola yang tak diberikan = tolak meski Gate lama izinkan; ability tak dikelola → jatuh ke Gate/policy lama). Default grant direplikasi persis Gate lama — **setiap mengubah katalog WAJIB sinkron default di `PermissionCatalog::defaults()` agar 68+ test lama tetap hijau**. UI matriks: Pengaturan → Hak Akses (hanya super_admin). Policies (Vessel/Document/Voyage) menanyakan izin modulnya (`fleet.create`, `documents.verify`, dst) — kodenya otoritatif bila ada di katalog.
- File dokumen: privat `storage/app/documents/`, nama UUID (labeling file mengikuti konvensi `{kode}-{nomor}-{kapal?}-{tanggal}` saat generate), unduh via route terautentikasi. Validasi MIME + ekstensi (PDF/JPG/PNG, maks 10 MB).
- Audit: `AuditService::log()` pada setiap perubahan penting (before/after JSON).
- Data penting: **soft delete / arsip**, jangan hard delete. Dokumen terbit yang dibatalkan: `voided_at` diisi (nomor tidak dipakai ulang).

## Struktur yang sudah dibangun (Fase 0–8 SELESAI)

- `app/Http/Controllers/` — Dashboard, Fleet, Document, Voyage, Approvals, Notification, Operations, Finance (14 tab), Inventory, Hr, Reports, AuditTrail, Settings, Profile
- `app/Services/` — DocumentCompleteness, Reminder, FuelAnalysis, **JournalService (satu-satunya pintu jurnal)**, Payroll (PPh21 UU HPP), VoyageWorkflow (13 status tervalidasi + gate awak), **CrewCompliance (matriks 11 jabatan + sertifikat pengawakan)**, NumberingService, Audit
- `app/Policies/` — Vessel, Document, Voyage + Gate: `menu.*`, `operations.manage`, `finance.manage`, `verify-documents`
- `resources/js/Pages/` — 13 menu sidebar; tab = query param `?tab=` (server-driven); **SDM punya tab ABK · Register ON/OFF · Kadet (Prala) · Karyawan · Hours of Rest**; **Operasional punya tab Posisi · Checklist · Log · Laporan Kapal (offline)**; **Pengaturan punya tab Hak Akses (RBAC, super_admin)**
- `database/seeders/DemoDataSeeder.php` + **`database/seeders/data/*.php`** (12 file hasil ekstraksi sekali dari BahanBT — JANGAN diedit manual): 39 kapal, ±1.365 dokumen (termasuk 645 metadata Dokumen_Kapal + 30 SPT + tracker per-kapal), 15 voyage + SPAL 104 (DSR 7.539,27 MT, invoice `197/211-BT-SLM/S.23/X/26`, keagenan 040/044 asli), 44 invoice, 56 bill (16 assist nyata + 25 keagenan/CO), 8 PO persis materi (nomor 001–008/I/2025), **413 crew (366 ABK + 46 kadet) + 109 register OFF + sijil 0547** gaji persis tabel gAJI, payroll 6 bulan (2.310 entries), 30 toko REKAP NOTA
- **Test: `tests/Feature/BungaTerataiTest.php` (68 test / 374 assertions — BungaTerataiTest)** — smoke 13 menu + semua tab, RBAC 7 role, journey A–N, target seed klien, **crewing (sign OFF wajib pengganti perwira, nomor BT-OFF/BT-MI/AG-BT-ADM/BT-KDT, cetak surat, crew list) + gate awak override + endpoint invoice charter**

## Fase A–E (SELESAI — riwayat; semua sudah terimplementasi & ter-push)

Rincian per fase: `docs/10-implementation-roadmap.md`.

- **Fase A** — CRUD edit/hapus semua modul (kolom Aksi + modal + ConfirmModal); seed interkoneksi (fuel_logs, movements, service_items, asset_depreciations + jurnal, setor pajak, approval dokumen, tongkang punya riwayat voyage); aturan Aman: invoice/bill terbayar terkunci, hapus pembayaran = reversal jurnal+kas, hanya jurnal manual yang diedit.
- **Fase B** — Arsip terpadu (owner wajib kapal/umum, inheritance voyage→kapal & PO→unit), sub-tab Document Center (Arsip/Terbitan/Unggahan/Expiring+Endorsement), void dokumen terbit, document_templates + NumberingService, document_relations/links, template A1–K1 + endorsement (reminder terpisah), Charter SPAL (voyage fields + Berkas Perjalanan stepper + DSR wajib utk pelunasan + Keagenan CRUD), Modul PO (penerimaan stok → Bill dari PO), Outstanding + no cek/BG, tab Template & Nomor Surat.
- **Fase C** — Generator: 6 PDF (SPAL 2 hal GENCON, invoice charter DP/pelunasan PPh 1.2%, keagenan, PO, invoice keuangan, surat umum) + 4 Excel (Master Tracker TugBoat/Barge, Monthly Expiry & Endorsement, Rekap NotA, Outstanding) — endpoint `/cetak/*` & `/laporan/export/*`, autosave ke arsip.
- **Fase D** — Seed klien: 8 TB/BG Syukur + 4 kapal lain; dokumen tracker A1–K1 (expiry serial Excel + 15 endorsement); SPAL 104 lengkap (invoice 197/211 FP+PPh1.2%, keagenan 040/044, DSR 7.500 MT); 8 PO + 3 bill + bayar cek/BG; arsip SPT 6 bulan.
- **Fase E** — Test BahanBT (nomor urut, issue PDF+void, surat umum, export Excel, endorsement reminder, DSR validation, seed Syukur) → **63 test / 311 assertions lulus** → `migrate:fresh --seed` → `npm run build` → push.
- **Fase G** — Penyelarasan penuh ke materi BahanBT (`D:\ICHSAN\Prototype\BahanBT`): armada **39 kapal** (GT asli tracker), overlay dokumen tracker **per-kapal** (serial expiry + endorsement asli), 645 metadata Dokumen_Kapal (tanpa file), SPT 30 file, PO 001–008 persis Excel +29 toko REKAP NOTA + TIGA BERLIAN, assist 16 nyata + 25 bill keagenan/CO, SPAL 104 (nomor invoice `197/211-BT-SLM/S.23/X/26`, DSR 7.539,27, keagenan `040/BT-SLM/AG/IX/2026` & `044/BT-TTSS/AG/X/2026` port Bolaang Mangondow), kop PDF baca Company (Jl. Mulawarman). **Modul Crewing**: kolom lengkap (kode pelaut, buku pelaut, PKL, mutasi), `crew_movements` + `sijil_requests`, enum37 jabatan (tabel gAJI)+kadet, Sign ON/OFF (perwira wajib pengganti+rekomendasi, H-7), Mutasi BT-MI, Sijil ON multi-crew AG/BT-ADM, Kadet ON/OFF BT-KDT, Surat Kuasa PKL, Cetak Crew List format materi, tab SDM Register ON/OFF + Kadet. **Alur charter**: gate awak (warning+override → voyage_events) di Ready for Departure, **tombol Terbitkan Invoice DP/Pelunasan dari voyage** (auto-fill SPAL+DSR, PPh 1,2%, FP dicatat+diunggah, PDF auto-arsip), `charter_stage` = satu-satunya stage machine (progress_stage → events), Finance invoice + kolom FP/tahap/tarif PPh. → **68 test / 374 assertions lulus**.

## Fase H — Offline-First + Realtime Maritim + RBAC Configurable (SELESAI)

Arsitektur ala sistem pelayaran komersial: **kapal = store-and-forward, kantor = realtime**.

- **Sync engine server** (`app/Services/Sync/SyncService.php` + `Api/SyncController`, route `/api/sync/*`): `push` batch idempoten (`sync_receipts` unique per `idempotency_key` — replay tautan satelit aman), **otoritas per domain** (`SHIP_FIELDS`: DSR/posisi/BBM/safety/HoR/gerbak = kapal; nomor, status voyage, verifikasi/void, invoice/jurnal = kantor → ditolak `reason: field di luar wewenang kapal`), **konflik tidak ditimpa diam-diam** (`base_updated_at` basi → `sync_conflicts` + review di drawer: Pakai laporan kapal / Pertahankan kantor), `pull` delta per domain **termasuk tombstone** (void/hapus), `documentPack` = Berkas Offline PSC (manifest+checksum, tombol di Fleet Detail → tab Dokumen). Tabel: `devices`, `sync_batches`, `sync_receipts`, `sync_conflicts`.
- **Sync engine client** (`resources/js/lib/sync/`): **Dexie/IndexedDB outbox** tahan reload/crash, prioritas `safety > operational > financial > bulk`, retry backoff (MAX 6, batch 50), chip status + banner offline + drawer antrean/konflik (`Components/sync/`), `useSync` context dipasang di `app.tsx`. Tulis offline = `engine.enqueue()` → flush otomatis saat online.
- **PWA** (`vite-plugin-pwa` injectManifest + `resources/js/sw.js`): precache aset build + **NetworkFirst per-URL utk halaman Inertia** (aman karena aplikasi TIDAK memakai partial reload `only:`/`router.reload`) → pernah dikunjungi = masih dibuka offline. Registrasi manual di `app.tsx` (PROD saja) + `<link rel=manifest>` manual di blade.
- **Tab "Laporan Kapal"** (Operasional) — 5 form kapal (DSR/progres, posisi, BBM, keselamatan, gerbak awak) seragam lewat outbox: jalan online ATAU offline; offline juga otomatis lewat form HoR (tab SDM). Validasi/otoritas tetap server.
- **Hours of Rest (MLC 2006 / SOLAS XI/1)** — tab SDM: catat blok istirahat (offline-friendly, `client_uuid` idempoten), evaluasi WLR (`HoursOfRestService`: ≥10j istirahat/24j dgn 1 blok ≥6j, ≤14j kerja/24j, ≥77j/7h), badge patuh/langgar, **cetak register PDF** `/sdm/hor/cetak/{crew}` (laporan periodik — TANPA nomor & tanpa arsip).
- **RBAC configurable** (lihat bagian Konvensi): katalog 51 izin + matriks role di Pengaturan → Hak Akses, Gate::before + integrasi policy.
- **Realtime Reverb** (`laravel/reverb`): event `DataChanged` (**ShouldBroadcastNow** — tanpa queue worker) di channel privat `user.{id}` + `role.{slug}`; observers di AppServiceProvider (Notification created, Document verification/void, Voyage status+DSR, Approval, Payment/BillPayment/Journal, CrewMovement, HoursOfRestLog) → `RealtimeBus` (**guard `broadcasting.default === 'reverb'` — di luar itu NO-OP, test aman**). Client (`lib/realtime/echo.ts` + bridge di SyncProvider): tiap `.data-changed` → `pull()` + `router.reload()` debounce 800ms. Konfig disuntik global `window.__BT_REALTIME__` dari `app.blade.php` (SyncProvider di LUAR konteks Inertia — `usePage` tak bisa dipakai di sana).
- **Deploy VPS (HTTPS + pm2)**:
  1. `.env`: `BROADCAST_CONNECTION=reverb` + `REVERB_APP_ID/KEY/SECRET` (generate ulang), `REVERB_HOST=<domain>, REVERB_PORT=443, REVERB_SCHEME=https`, `REVERB_SERVER_HOST=0.0.0.0`, `REVERB_SERVER_PORT=8080`.
  2. pm2: `pm2 start deploy/reverb.pm2.json` (proses `php artisan reverb:start`).
  3. **nginx wajib 2 hal**: (a) `location /app/` → proxy WebSocket ke `127.0.0.1:8080` (`proxy_http_version 1.1; proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection "upgrade";`), (b) lokasi `/build/sw.js` ditambah header **`Service-Worker-Allowed: /`** (tanpa ini registrasi SW ditolak browser karena scope default hanya `/build/`).
- **Test**: `RbacConfigurableTest` (8), `SyncEngineTest` (13), `HoursOfRestModuleTest` (7), `RealtimeBroadcastTest` (6) → total **102 test / 537 assertions**.

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
- Seeder voyage: transisi status berurutan + prasyarat (approval internal → checklist wajib → **bukti eksternal** sebelum Ready for Departure); **siapkan `note` override** utk transisi ke Ready for Departure (gate awak CrewCompliance menolak bila roster <100% tanpa alasan)
- Jangan typo `Gate: : authorize` (spasi) — pernah terjadi 2×
- **`CrewRank::fromLabel()` / `CrewOffReason::fromLabel()` mengembalikan STRING slug** — jangan `->value` (enum instance hanya via `::Case` / `::from()`)
- `AuditService::log()` param ke-6 = **`change_summary`** (bukan `description`) — query audit pakai kolom itu / `entity_type`
- Notifikasi **endorsement** sah utk dokumen permanen (A2 Surat Laut diendorse tahunan) — test "tanpa expiry tak dinotifikasi" harus filter tipe notif `dokumen_kedaluwarsa`/`dokumen_mendekati_kedaluwarsa`
- Excel klien: tanggal dalam banyak format (serial, `01 Jan 26`, `02-Des-70`, `22-06-2001`) — parser ekstraksi `xlDate` di `C:\Users\Shifted\AppData\Local\Temp\opencode\` (sekali pakai) sudah meng-handle; file `database/seeders/data/*.php` = **output ekstraksi, jangan diedit manual**
- **Serial Excel klien ada yang KORUP** (mis. `TB Syukur 30/B3 le=6704940 ne=6705305`, `BG Syukur 115/B2 exp=6708527` — sel G86 cached) → serialToDate menghasilkan **tahun 20257/20258** → **MySQL DATE menolak** (`Incorrect date value`) padahal SQLite lolos. Fix struktural: `serialToDate` di `DemoDataSeeder` **validasi tahun 1900–2100** (di luar itu → null) + setter `expiry_date`/`endorsement_*` **hanya bila hasil non-null** (null = biarkan kolom nullable / expiry seedDocuments). Jangan edit `tracker.php` — guard di kode yang menangani.
- **MySQL DATE menerima string datetime** (`2029-10-27 11:34:58` dari Carbon `now()->addMonths(3)` tanpa `->toDateString()`) dan **memotong waktunya** — terbukti lolos di VPS (`seedDocuments` sukses dulu, baru crash di serial korup). Model `Document` cast `date:Y-m-d` + `$dateFormat` default → aplikasi selalu baca rapi. Jangan "memperbaiki" ini kecuali memang mau; **yang menolak hanya nilai tanggal tak valid** (`'0'`, tahun 1000–9999 di luar range).
- `crews.birth_date` dulu `'0'` (fallback `?? rawVal` saat Excel selnya kosong) → **MySQL strict menolak `'0'`** — `asDate()` + regen data sudah membersihkan; pastikan semua tulisan tanggal seeder lewat `asDate()` (nullable → null, NOT NULL → `now()->toDateString()`).
- Kop PDF (`letterhead()` + `resources/views/pdf/layout.blade.php`) **baca Company** — jangan hardcode alamat di situ lagi
- **`@json` directive Blade TIDAK menangani argumen multi-baris** (regex-nya berhenti di `)` pertama → ParseError di semua halaman yang me-render view itu, sementara `view:cache` tetap "sukses" karena tidak memvalidasi sintaks PHP hasil kompilasi). Pola aman: hitung array di `@php ... @endphp`, lalu `@json($var)` satu baris (dipakai untuk `window.__BT_REALTIME__` di `app.blade.php`).
- **`LogBroadcaster::auth()` method KOSONG** (driver `log` melewati semua pengecekan channel & selalu 200 kosong) — test channel auth harus `config()->set('broadcasting.default','reverb')` + registrasi ulang `require base_path('routes/channels.php')` SETELAH ganti config (channels di-`require` saat boot ke driver yang aktif saat itu; di produksi env sudah reverb sejak awal sehingga otomatis benar).
- **PWA + Laravel**: Vite TIDAK memproses `app.blade.php` → injeksi otomatis plugin PWA (registrasi SW + `<link rel=manifest>`) TIDAK masuk. Wajib manual: registrasi `navigator.serviceWorker.register('/build/sw.js', {scope:'/'})` di `app.tsx` (guard `import.meta.env.PROD`) + link manifest di blade. Scope `/` menuntut header **`Service-Worker-Allowed: /`** pada respons `/build/sw.js` di server (nginx) — kalau lupa, registrasi ditolak browser (hanya warning console, aplikasi tetap jalan tapi tanpa offline).
- **Konteks Inertia tidak mencakup `SyncProvider`** (provider membungkus `<App>` di `app.tsx` setup) → `usePage()` TIDAK boleh dipakai di dalam `SyncProvider`; konfig realtime disuntik via `window.__BT_REALTIME__` dari blade. Komponen halaman (Topbar dkk.) tetap bisa `useSync()` karena berada DI BAWAH provider.
- **`router.reload()` di Inertia v2** tidak menerima `preserveState`/`preserveScroll` (sengaja dihapus dari `ReloadOptions` — reload SELALU preserve keduanya). Jangan coba mengirimnya (error TS2353).
- **Pintu broadcast: `RealtimeBus`** (`app/Services/Realtime/RealtimeBus.php`) dengan guard `config('broadcasting.default') !== 'reverb'` → NO-OP di lokal & test. Jangan panggil `event(new DataChanged(...))` langsung; dan event memakai **ShouldBroadcastNow** (tanpa queue worker) — berubah ke ShouldBroadcast berarti VPS wajib jalanin `queue:work`.
