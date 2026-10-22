<?php

namespace Tests\Feature;

use Database\Seeders\DemoDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class BungaTerataiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DemoDataSeeder::class);
    }

    private function loginUser(string $email)
    {
        $user = \App\Models\User::where('email', $email)->firstOrFail();

        return $this->actingAs($user);
    }

    public function test_all_menus_render_for_super_admin(): void
    {
        $this->loginUser('admin@bungateratai.id');

        foreach ([
            '/dashboard', '/notifikasi', '/dokumen', '/armada', '/perjalanan',
            '/operasional', '/persetujuan', '/keuangan', '/inventory', '/sdm',
            '/laporan', '/audit', '/pengaturan',
        ] as $uri) {
            $this->get($uri)->assertOk();
        }
    }

    public function test_rbac_blocks_finance_menu_for_ship_ops(): void
    {
        $this->loginUser('ops@bungateratai.id');
        $this->get('/keuangan')->assertForbidden();
        $this->get('/sdm')->assertOk();
    }

    public function test_rbac_blocks_approvals_for_doc_controller(): void
    {
        $this->loginUser('dokumen@bungateratai.id');
        $this->get('/persetujuan')->assertForbidden();
        $this->get('/dokumen')->assertOk();
    }

    public function test_guest_redirected_to_login(): void
    {
        $this->get('/dashboard')->assertRedirect('/login');
    }

    public function test_fleet_index_and_detail(): void
    {
        $this->loginUser('admin@bungateratai.id');

        $this->get('/armada')->assertOk();
        $vessel = \App\Models\Vessel::first();
        $this->get("/armada/{$vessel->id}")->assertOk();
    }

    public function test_cannot_create_vessel_as_auditor(): void
    {
        $this->loginUser('auditor@bungateratai.id');
        $this->get('/armada/create')->assertForbidden();
        $this->get('/armada')->assertOk();
    }

    public function test_ship_ops_can_create_vessel(): void
    {
        $this->loginUser('ops@bungateratai.id');

        $this->post('/armada', [
            'vessel_name' => 'TB Uji Coba 99',
            'vessel_type' => 'tugboat',
            'navigation_type' => 'laut',
            'operational_status' => 'aktif',
            'fuel_baseline_lph' => 100,
        ])->assertRedirect();

        $this->assertDatabaseHas('vessels', ['vessel_name' => 'TB Uji Coba 99']);
    }

    public function test_document_upload_submit_verify_flow(): void
    {
        Storage::fake('local');
        $this->loginUser('dokumen@bungateratai.id');

        $vessel = \App\Models\Vessel::first();
        $category = \App\Models\DocumentCategory::where('group_code', 'B')->first();

        $this->post('/dokumen', [
            'document_name' => 'STKB Uji Coba',
            'category_id' => $category->id,
            'owner_type' => 'vessel',
            'owner_id' => $vessel->id,
            'requirement_code' => 'B_STKB',
            'has_expiry' => true,
            'expiry_date' => now()->addYear()->toDateString(),
            'file' => UploadedFile::fake()->create('stkb.pdf', 512, 'application/pdf'),
        ])->assertRedirect();

        $doc = \App\Models\Document::where('document_name', 'STKB Uji Coba')->firstOrFail();
        $this->assertSame('uploaded', $doc->verification_status);

        // Dokumen tanpa masa berlaku tidak boleh punya tanggal kedaluwarsa
        $this->post('/dokumen', [
            'document_name' => 'Ship Particulars Uji',
            'category_id' => $category->id,
            'owner_type' => 'vessel',
            'owner_id' => $vessel->id,
            'requirement_code' => 'B_SHIP_PARTICULARS',
            'has_expiry' => false,
            'expiry_date' => now()->addYear()->toDateString(), // harus diabaikan
            'file' => UploadedFile::fake()->create('sp.pdf', 64, 'application/pdf'),
        ])->assertRedirect();
        $noExpiry = \App\Models\Document::where('document_name', 'Ship Particulars Uji')->firstOrFail();
        $this->assertFalse($noExpiry->has_expiry);
        $this->assertNull($noExpiry->expiry_date);

        // Submit oleh doc_controller
        $this->post("/dokumen/{$doc->id}/submit")->assertRedirect();
        $this->assertSame('under_review', $doc->fresh()->verification_status);

        // Supervisor menyetujui
        $this->loginUser('supervisor@bungateratai.id');
        $this->post("/dokumen/{$doc->id}/verify", ['comments' => 'Lengkap'])->assertRedirect();
        $this->assertSame('verified', $doc->fresh()->verification_status);

        $this->assertDatabaseHas('approvals', [
            'approvable_type' => 'document',
            'approvable_id' => $doc->id,
            'approval_status' => 'approved',
        ]);

        // Auditor tidak boleh verifikasi
        $this->loginUser('auditor@bungateratai.id');
        $this->post("/dokumen/{$doc->id}/revision", ['comments' => 'x'])->assertForbidden();
    }

    public function test_document_requires_comments_for_revision(): void
    {
        Storage::fake('local');
        $this->loginUser('dokumen@bungateratai.id');

        $vessel = \App\Models\Vessel::first();
        $category = \App\Models\DocumentCategory::where('group_code', 'B')->first();
        $this->post('/dokumen', [
            'document_name' => 'Dok Revisi Tes',
            'category_id' => $category->id,
            'owner_type' => 'vessel',
            'owner_id' => $vessel->id,
            'has_expiry' => false,
            'file' => UploadedFile::fake()->create('a.pdf', 32, 'application/pdf'),
        ])->assertRedirect();
        $doc = \App\Models\Document::where('document_name', 'Dok Revisi Tes')->firstOrFail();
        $this->post("/dokumen/{$doc->id}/submit");

        $this->loginUser('supervisor@bungateratai.id');
        $this->post("/dokumen/{$doc->id}/revision", [])->assertSessionHasErrors('comments');
        $this->post("/dokumen/{$doc->id}/revision", ['comments' => 'Nomor salah'])->assertRedirect();
        $this->assertSame('revision_required', $doc->fresh()->verification_status);
    }

    public function test_completeness_and_reminder_seed_targets(): void
    {
        // Target spek §7
        $this->assertSame(12, \App\Models\Vessel::count());

        $svc = app(\App\Services\DocumentCompletenessService::class);
        $ready = 0;
        $followUp = 0;
        foreach (\App\Models\Vessel::all() as $vessel) {
            $calc = $svc->forVessel($vessel);
            if ($calc['percent'] >= 90) {
                $ready++;
            } elseif ($calc['percent'] < 90) {
                $followUp++;
            }
        }
        $this->assertSame(9, $ready);   // 8 siap + 1 ditinjau (100%)
        $this->assertSame(3, $followUp);

        // 1 kapal berstatus under_review
        $this->assertSame(1, \App\Models\Document::where('verification_status', 'under_review')->count());

        // Ada dokumen expiring & expired & tanpa masa berlaku
        $reminder = app(\App\Services\ReminderService::class);
        $this->assertGreaterThan(0, \App\Models\Document::where('has_expiry', true)
            ->whereDate('expiry_date', '>=', now()->toDateString())
            ->whereDate('expiry_date', '<=', now()->addDays(30)->toDateString())
            ->count());
        $this->assertGreaterThan(0, \App\Models\Document::where('has_expiry', true)
            ->whereDate('expiry_date', '<', now()->toDateString())
            ->count());
        $this->assertGreaterThan(0, \App\Models\Document::where('has_expiry', false)->count());

        // Reminder menghasilkan notifikasi & tidak pernah untuk dokumen tanpa expiry
        $this->assertGreaterThan(0, \App\Models\Notification::count());
        $docIdsWithNoExpiry = \App\Models\Document::where('has_expiry', false)->pluck('id');
        $notifDocIds = \App\Models\Notification::where('reference_type', 'document')->pluck('reference_id');
        $this->assertCount(0, $notifDocIds->intersect($docIdsWithNoExpiry));
    }

    public function test_notifications_index_shows_unread(): void
    {
        $this->loginUser('admin@bungateratai.id');
        $this->get('/notifikasi')->assertOk();
        $this->assertGreaterThan(0, \App\Models\Notification::count());
    }

    public function test_journey_c_towing_voyage_workflow(): void
    {
        Storage::fake('local');
        $this->loginUser('ops@bungateratai.id');

        $tug = \App\Models\Vessel::where('vessel_name', 'TB Syukur 01')->first();
        $barge = \App\Models\Vessel::where('vessel_name', 'BG Syukur 03')->first();

        $this->post('/perjalanan', [
            'vessel_id' => $tug->id,
            'activity_type' => 'towing',
            'tugboat_id' => $tug->id,
            'barge_id' => $barge->id,
            'route_type' => 'kombinasi',
            'origin' => 'Samarinda',
            'destination' => 'Bontang',
            'planned_departure' => now()->addDay()->startOfHour()->toDateTimeString(),
            'person_in_charge' => 'Andi (Operator)',
            'commodity_type' => 'batu_bara',
            'weight_ton' => 1200,
        ])->assertRedirect();

        $voyage = \App\Models\Voyage::where('origin', 'Samarinda')->where('destination', 'Bontang')
            ->where('activity_type', 'towing')->latest('id')->firstOrFail();
        $this->assertSame('draft', $voyage->voyage_status);
        $this->assertSame('menunggu', $voyage->external_approval_status);

        // Checklist dibuat otomatis & muatan batu bara menambah syarat kondisional
        $this->assertGreaterThan(5, $voyage->checklists()->count());
        $this->assertTrue(
            $voyage->checklists()->whereHas('requirement', fn ($q) => $q->where('code', 'E_BUKTI_TIMBANG'))->exists()
        );
        $this->assertTrue(
            $voyage->checklists()->whereHas('requirement', fn ($q) => $q->where('code', 'E_UJI_MUTU'))->exists()
        );

        // Maju ke internal review
        $service = app(\App\Services\VoyageWorkflowService::class);
        $service->transition($voyage, 'planned');
        $service->transition($voyage, 'document_preparation');

        // Tandai semua checklist wajib terpenuhi
        foreach ($voyage->checklists()->where('applicability', 'wajib')->get() as $item) {
            $item->update(['completion_status' => 'terpenuhi']);
        }

        $service->transition($voyage, 'internal_review');

        // Maju ke awaiting external TANPA approval internal → gagal
        try {
            $service->transition($voyage, 'awaiting_external_approval');
            $this->fail('Seharusnya gagal tanpa approval internal.');
        } catch (\InvalidArgumentException $e) {
            $this->assertStringContainsString('Persetujuan internal', $e->getMessage());
        }

        // Supervisor menyetujui
        $this->loginUser('supervisor@bungateratai.id');
        $this->post("/perjalanan/{$voyage->id}/approve", [
            'decision' => 'approved',
            'comments' => 'Berkas lengkap',
        ])->assertRedirect();

        $service->transition($voyage->fresh(), 'awaiting_external_approval');
        $this->assertSame('awaiting_external_approval', $voyage->fresh()->voyage_status);

        // Ready for Departure ditolak selama eksternal belum dikonfirmasi
        try {
            $service->transition($voyage->fresh(), 'ready_for_departure');
            $this->fail('Seharusnya gagal tanpa bukti eksternal.');
        } catch (\InvalidArgumentException $e) {
            $this->assertStringContainsString('eksternal', mb_strtolower($e->getMessage()));
        }

        // Konfirmasi eksternal tanpa bukti → ditolak
        $this->loginUser('ops@bungateratai.id');
        try {
            $service->confirmExternalApproval($voyage->fresh(), null, 'tanpa bukti');
            $this->fail('Seharusnya gagal tanpa lampiran bukti.');
        } catch (\InvalidArgumentException $e) {
            $this->assertStringContainsString('bukti', mb_strtolower($e->getMessage()));
        }

        // Konfirmasi eksternal dengan bukti
        $service->confirmExternalApproval(
            $voyage->fresh(),
            UploadedFile::fake()->create('persetujuan.pdf', 128, 'application/pdf'),
            'Surat Persetujuan KSOP Samarinda No. 001/DEMO',
        );
        $voyage->refresh();
        $this->assertSame('terkonfirmasi', $voyage->external_approval_status);
        $this->assertNotEmpty($voyage->external_approval_evidence);

        $service->transition($voyage, 'ready_for_departure');
        $this->assertSame('ready_for_departure', $voyage->fresh()->voyage_status);

        $service->transition($voyage->fresh(), 'departed');
        $this->assertNotNull($voyage->fresh()->actual_departure);

        // Perjalanan tampil di halaman & timeline ada
        $this->loginUser('admin@bungateratai.id');
        $this->get("/perjalanan/{$voyage->id}")->assertOk();
        $this->assertGreaterThan(3, $voyage->events()->count());
    }

    public function test_journey_d_passenger_voyage(): void
    {
        $this->loginUser('ops@bungateratai.id');

        $ship = \App\Models\Vessel::where('vessel_name', 'KM Prince Soya')->first();

        $this->post('/perjalanan', [
            'vessel_id' => $ship->id,
            'activity_type' => 'penumpang',
            'route_type' => 'laut',
            'origin' => 'Samarinda',
            'destination' => 'Bontang',
            'planned_departure' => now()->addDays(2)->startOfHour()->toDateTimeString(),
            'person_in_charge' => 'Budi (Ops)',
            'capacity' => 1800,
            'tickets_sold' => 1450,
        ])->assertRedirect();

        $voyage = \App\Models\Voyage::where('activity_type', 'penumpang')->latest('id')->firstOrFail();

        // Kapal penumpang: persetujuan eksternal tidak diperlukan + checklist penumpang muncul
        $this->assertSame('tidak_diperlukan', $voyage->external_approval_status);
        $this->assertTrue(
            $voyage->checklists()->whereHas('requirement', fn ($q) => $q->where('code', 'E_MANIFEST_PENUMPANG'))->exists()
        );

        // Log penumpang
        $this->post("/perjalanan/{$voyage->id}/passenger-log", [
            'type' => 'keberangkatan',
            'count' => 1420,
        ])->assertRedirect();
        $this->assertSame(1420, $voyage->fresh()->boarded);

        $this->get("/perjalanan/{$voyage->id}")->assertOk();
    }

    public function test_voyages_index_and_approvals_page(): void
    {
        $this->loginUser('admin@bungateratai.id');
        $this->get('/perjalanan')->assertOk();
        $this->get('/perjalanan?group=aktif')->assertOk();
        $this->get('/persetujuan')->assertOk();
        $this->get('/persetujuan?tab=history')->assertOk();
    }

    public function test_ship_ops_cannot_approve_voyage(): void
    {
        $this->loginUser('ops@bungateratai.id');

        $voyage = \App\Models\Voyage::firstOrCreate(
            ['voyage_code' => 'VYG-TES-0001'],
            [
                'vessel_id' => \App\Models\Vessel::first()->id,
                'origin' => 'Samarinda',
                'destination' => 'Bontang',
                'voyage_status' => 'internal_review',
                'planned_departure' => now()->addDay(),
            ],
        );

        $this->post("/perjalanan/{$voyage->id}/approve", [
            'decision' => 'approved',
            'comments' => 'coba',
        ])->assertForbidden();
    }

    public function test_operations_fuel_analysis_rules(): void
    {
        $this->loginUser('ops@bungateratai.id');
        $vessel = \App\Models\Vessel::where('vessel_name', 'TB Syukur 01')->first();
        // baseline 95 L/jam

        // Normal: 95 L / 1 jam
        $this->post('/operasional/bbm', [
            'vessel_id' => $vessel->id,
            'trip_date' => now()->toDateString(),
            'route' => 'Samarinda → Bontang',
            'duration_hours' => 1,
            'liters' => 95,
            'cost' => 1200000,
        ])->assertSessionHas('success');
        $log = \App\Models\FuelLog::latest('id')->first();
        $this->assertSame('normal', $log->analysis_status);

        // Tidak normal (200 L/jam = +110%) tanpa penjelasan → ditolak
        $before = \App\Models\FuelLog::count();
        $this->from('/operasional?tab=bbm')->post('/operasional/bbm', [
            'vessel_id' => $vessel->id,
            'trip_date' => now()->toDateString(),
            'route' => 'Samarinda → Muara Berau',
            'duration_hours' => 1,
            'liters' => 200,
        ])->assertSessionHas('error');
        $this->assertSame($before, \App\Models\FuelLog::count());

        // Dengan penjelasan → diterima sebagai tidak_normal
        $this->post('/operasional/bbm', [
            'vessel_id' => $vessel->id,
            'trip_date' => now()->toDateString(),
            'route' => 'Samarinda → Muara Berau',
            'duration_hours' => 1,
            'liters' => 200,
            'explanation' => 'Arus deras + muatan penuh',
        ])->assertSessionHas('success');
        $log = \App\Models\FuelLog::latest('id')->first();
        $this->assertSame('tidak_normal', $log->analysis_status);

        // Auditor tidak boleh input
        $this->loginUser('auditor@bungateratai.id');
        $this->post('/operasional/bbm', [
            'vessel_id' => $vessel->id,
            'trip_date' => now()->toDateString(),
            'route' => 'x',
            'duration_hours' => 1,
            'liters' => 95,
        ])->assertForbidden();
    }

    public function test_service_selesai_cuts_inventory_stock(): void
    {
        $this->loginUser('super_admin@bungateratai.id' === 'x' ? 'admin@bungateratai.id' : 'admin@bungateratai.id');

        $item = \App\Models\InventoryItem::create([
            'sku' => 'SP-TEST-01',
            'name' => 'Oli Mesin 20L',
            'category' => 'habis_pakai',
            'unit' => 'pail',
            'unit_price' => 450000,
            'is_consumable' => true,
            'min_stock' => 2,
        ]);
        \App\Models\InventoryBalance::create([
            'item_id' => $item->id,
            'location_type' => 'kantor',
            'qty' => 10,
        ]);

        $vessel = \App\Models\Vessel::first();

        $this->post('/operasional/servis', [
            'vessel_id' => $vessel->id,
            'type' => 'rutin',
            'title' => 'Ganti oli mesin utama',
            'start_date' => now()->toDateString(),
            'status' => 'selesai',
            'cost' => 1500000,
            'items' => [['item_id' => $item->id, 'qty' => 3]],
        ])->assertSessionHas('success');

        $this->assertEquals(7, (float) \App\Models\InventoryBalance::where('item_id', $item->id)->sum('qty'));
        $this->assertDatabaseHas('inventory_movements', [
            'item_id' => $item->id,
            'type' => 'keluar',
            'qty' => 3,
            'ref_type' => 'service',
        ]);
    }

    public function test_operations_pages_render(): void
    {
        $this->loginUser('admin@bungateratai.id');
        foreach (['posisi', 'kondisi', 'servis', 'bbm', 'checklist', 'logs'] as $tab) {
            $this->get("/operasional?tab={$tab}")->assertOk();
        }
    }

    public function test_finance_invoice_flow_with_journals_and_cash(): void
    {
        $this->loginUser('finance@bungateratai.id');

        $customer = \App\Models\Customer::create(['name' => 'PT Kontraktor Batu Bara']);
        $cash = \App\Models\CashAccount::where('type', 'bank')->first();

        $this->post('/keuangan/invoice', [
            'customer_id' => $customer->id,
            'issue_date' => now()->toDateString(),
            'due_date' => now()->addDays(14)->toDateString(),
            'pph23' => true,
            'items' => [
                ['description' => 'Jasa Towing (Penarikan)', 'qty' => 1, 'price' => 20000000],
            ],
        ])->assertSessionHas('success');

        $invoice = \App\Models\Invoice::latest('id')->firstOrFail();
        // subtotal 20jt, PPN 11% = 2.2jt, PPh23 2% = 400rb, total net = 21.8jt
        $this->assertEquals(20000000, (float) $invoice->subtotal);
        $this->assertEquals(2200000, (float) $invoice->ppn_amount);
        $this->assertEquals(400000, (float) $invoice->pph23_amount);
        $this->assertEquals(21800000, (float) $invoice->total);
        $this->assertSame('unpaid', $invoice->status);

        // Jurnal invoice seimbang & akun benar
        $entry = \App\Models\JournalEntry::where('source_type', 'invoice')->where('source_id', $invoice->id)->firstOrFail();
        $this->assertEquals(
            (float) $entry->lines()->sum('debit'),
            (float) $entry->lines()->sum('credit'),
            0.01,
        );

        // Bayar sebagian
        $before = (float) $cash->fresh()->balance;
        $this->post("/keuangan/invoice/{$invoice->id}/pay", [
            'amount' => 10000000,
            'cash_account_id' => $cash->id,
            'date' => now()->toDateString(),
        ])->assertSessionHas('success');
        $this->assertSame('partial', $invoice->fresh()->status);
        $this->assertEquals($before + 10000000, (float) $cash->fresh()->balance, 0.01);

        // Bayar lunas
        $this->post("/keuangan/invoice/{$invoice->id}/pay", [
            'amount' => 11800000,
            'cash_account_id' => $cash->id,
            'date' => now()->toDateString(),
        ])->assertSessionHas('success');
        $this->assertSame('paid', $invoice->fresh()->status);

        // Auditor tidak boleh create invoice
        $this->loginUser('auditor@bungateratai.id');
        $this->post('/keuangan/invoice', [
            'customer_id' => $customer->id,
            'issue_date' => now()->toDateString(),
            'pph23' => false,
            'items' => [['description' => 'x', 'qty' => 1, 'price' => 1000]],
        ])->assertForbidden();
    }

    public function test_finance_bill_assist_flow(): void
    {
        $this->loginUser('finance@bungateratai.id');

        $supplier = \App\Models\Supplier::create(['name' => 'TB Mitra Pemandu', 'category' => 'operator_lain']);
        $cash = \App\Models\CashAccount::where('type', 'bank')->first();

        $response = $this->post('/keuangan/bill', [
            'supplier_id' => $supplier->id,
            'category' => 'assist',
            'issue_date' => now()->toDateString(),
            'due_date' => now()->addDays(7)->toDateString(),
            'items' => [['description' => 'Jasa Assist Kolong Jembatan Mahakam', 'amount' => 5000000]],
        ]);
        $response->assertSessionHasNoErrors();
        $response->assertSessionHas('success');

        $bill = \App\Models\Bill::latest('id')->firstOrFail();
        $this->assertSame('assist', $bill->category);
        // subtotal 5jt + PPN 11% = 5.55jt
        $this->assertEquals(5550000, (float) $bill->total);
        $this->assertSame('unpaid', $bill->status);

        // Masuk jadwal bayar
        $this->assertDatabaseHas('payment_schedules', ['ref_type' => 'bill', 'ref_id' => $bill->id, 'status' => 'menunggu']);

        // Bayar bill → kas turun + jurnal
        $before = (float) $cash->fresh()->balance;
        $this->post("/keuangan/bill/{$bill->id}/pay", [
            'amount' => 5550000,
            'cash_account_id' => $cash->id,
            'date' => now()->toDateString(),
        ])->assertSessionHas('success');
        $this->assertSame('paid', $bill->fresh()->status);
        $this->assertEquals($before - 5550000, (float) $cash->fresh()->balance, 0.01);
        $this->assertDatabaseHas('payment_schedules', ['ref_id' => $bill->id, 'status' => 'lunas']);
    }

    public function test_payroll_generate_and_post(): void
    {
        // ABK + karyawan demo sudah ada dari seed
        $this->loginUser('finance@bungateratai.id');

        $period = \App\Models\PayrollPeriod::create(['year_month' => now()->subMonths(9)->format('Y-m'), 'status' => 'draft']);

        $this->post("/keuangan/payroll/{$period->id}/generate")->assertSessionHas('success');
        $this->assertGreaterThan(5, $period->entries()->count());
        $this->assertGreaterThan(0, (float) $period->entries()->sum('pph21'));

        $this->post("/keuangan/payroll/{$period->id}/post")->assertSessionHas('success');
        $this->assertSame('posted', $period->fresh()->status);
        $this->assertDatabaseHas('journal_entries', ['source_type' => 'payroll', 'source_id' => $period->id]);
        $this->assertGreaterThan(0, \App\Models\WithholdingTax::where('type', 'pph21')->count());
    }

    public function test_finance_all_tabs_render(): void
    {
        $this->loginUser('admin@bungateratai.id');
        foreach ([
            'invoice', 'piutang', 'hutang', 'jadwal', 'kas', 'jurnal', 'bb',
            'lr', 'neraca', 'pl', 'pajak', 'payroll', 'aset', 'akun',
        ] as $tab) {
            $this->get("/keuangan?tab={$tab}")->assertOk();
        }
    }

    public function test_inventory_and_hr_pages_and_flows(): void
    {
        $this->loginUser('admin@bungateratai.id');
        $this->get('/inventory')->assertOk();
        $this->get('/inventory?tab=kapal')->assertOk();
        $this->get('/sdm')->assertOk();
        $this->get('/sdm?tab=karyawan')->assertOk();

        // Transfer stok kantor → kapal (reset saldo dulu agar deterministik)
        $item = \App\Models\InventoryItem::first();
        $vessel = \App\Models\Vessel::first();
        \App\Models\InventoryBalance::where('item_id', $item->id)->where('location_type', 'kantor')->delete();
        \App\Models\InventoryBalance::where('item_id', $item->id)->where('location_type', 'vessel')->where('vessel_id', $vessel->id)->delete();
        \App\Models\InventoryBalance::create(['item_id' => $item->id, 'location_type' => 'kantor', 'qty' => 5]);

        $this->post('/inventory/movements', [
            'item_id' => $item->id,
            'type' => 'transfer',
            'qty' => 2,
            'from_location' => 'kantor',
            'to_location' => 'kapal',
            'to_vessel_id' => $vessel->id,
        ])->assertSessionHas('success');

        $this->assertEquals(3, (float) \App\Models\InventoryBalance::where('item_id', $item->id)->where('location_type', 'kantor')->sum('qty'));
        $this->assertEquals(2, (float) \App\Models\InventoryBalance::where('item_id', $item->id)->where('location_type', 'vessel')->where('vessel_id', $vessel->id)->sum('qty'));
    }

    public function test_dashboard_renders_with_kpis(): void
    {
        $this->loginUser('admin@bungateratai.id');
        $this->get('/dashboard')->assertOk();
        $this->get('/dashboard?months=3&type=tugboat')->assertOk();
    }

    public function test_reports_all_tabs_render(): void
    {
        $this->loginUser('admin@bungateratai.id');
        foreach (['armada', 'dokumen', 'perjalanan', 'operasional'] as $tab) {
            $this->get("/laporan?tab={$tab}")->assertOk();
        }
    }

    public function test_audit_trail_page_and_filters(): void
    {
        $this->loginUser('admin@bungateratai.id');
        $this->get('/audit')->assertOk();
        $this->get('/audit?action=created')->assertOk();
        $this->get('/audit?entity=vessel')->assertOk();

        // Auditor boleh lihat audit; ship_ops tidak
        $this->loginUser('auditor@bungateratai.id');
        $this->get('/audit')->assertOk();
        $this->loginUser('ops@bungateratai.id');
        $this->get('/audit')->assertForbidden();
    }

    public function test_settings_pages_and_rules(): void
    {
        $this->loginUser('admin@bungateratai.id');
        foreach (['users', 'profil', 'reminder', 'workflow', 'kategori', 'master'] as $tab) {
            $this->get("/pengaturan?tab={$tab}")->assertOk();
        }

        // Edit aturan reminder
        $this->put('/pengaturan/reminder', ['reminder_days' => '45,21,7,0'])
            ->assertSessionHas('success');
        $this->assertSame('45,21,7,0', \App\Models\Setting::where('key', 'reminder_days')->value('value'));

        // Input tidak valid ditolak
        $this->put('/pengaturan/reminder', ['reminder_days' => 'abc'])
            ->assertSessionHasErrors('reminder_days');

        // Tambah user
        $this->post('/pengaturan/users', [
            'name' => 'Operator Baru',
            'email' => 'operator.baru@bungateratai.id',
            'password' => 'password123',
            'role' => 'ship_ops',
        ])->assertSessionHas('success');
        $this->assertDatabaseHas('users', ['email' => 'operator.baru@bungateratai.id']);

        // Bukan super_admin tidak boleh kelola user/reminder
        $this->loginUser('finance@bungateratai.id');
        $this->post('/pengaturan/users', [
            'name' => 'X', 'email' => 'x@x.id', 'password' => 'password123', 'role' => 'ship_ops',
        ])->assertForbidden();
        $this->put('/pengaturan/reminder', ['reminder_days' => '1,2'])
            ->assertForbidden();

        // Master data customer
        $this->loginUser('admin@bungateratai.id');
        $this->post('/pengaturan/customers', ['name' => 'PT Uji Master'])->assertSessionHas('success');
        $this->post('/pengaturan/suppliers', ['name' => 'Supplier Uji', 'category' => 'bengkel'])->assertSessionHas('success');
        $this->post('/pengaturan/katalog', ['name' => 'Jasa Uji', 'kind' => 'pendapatan', 'default_price' => 1000000])->assertSessionHas('success');
    }

    public function test_seed_meets_spec_targets(): void
    {
        // Spek §7: 12 kapal · 8 siap · 3 tindak lanjut · 1 ditinjau
        $this->assertSame(12, \App\Models\Vessel::count());

        $svc = app(\App\Services\DocumentCompletenessService::class);
        $ready = 0;
        $followUp = 0;
        $pendingDocs = \App\Models\Document::where('verification_status', 'under_review')
            ->where('owner_type', 'vessel')->pluck('owner_id');

        foreach (\App\Models\Vessel::all() as $vessel) {
            $calc = $svc->forVessel($vessel);
            $isPending = $pendingDocs->contains($vessel->id);
            if ($calc['percent'] >= 90 && ! $isPending) {
                $ready++;
            } elseif ($calc['percent'] < 90) {
                $followUp++;
            }
        }
        $this->assertSame(8, $ready);
        $this->assertSame(3, $followUp);

        // 4 perjalanan menunggu pemeriksaan internal (spek §7)
        $this->assertSame(4, \App\Models\Voyage::whereIn('voyage_status', [
            'document_preparation', 'internal_review', 'awaiting_external_approval',
        ])->count());

        // 5 dokumen mendekati kedaluwarsa (spek §7)
        $this->assertSame(5, \App\Models\Document::where('has_expiry', true)
            ->whereBetween('expiry_date', [now()->toDateString(), now()->addDays(30)->toDateString()])
            ->count());

        // Grafik pendapatan: minimal 6 bulan berisi data
        $monthsWithInvoices = \App\Models\Invoice::toBase()
            ->selectRaw("DISTINCT strftime('%Y-%m', issue_date) as ym")
            ->pluck('ym')
            ->filter()
            ->unique()
            ->count();
        $this->assertGreaterThanOrEqual(6, $monthsWithInvoices);
    }

    // ===== Fase B/C/D — BahanBT =====

    public function test_seed_client_fleet_and_spal104(): void
    {
        // Armada Syukur menggantikan fiktif
        $this->assertTrue(\App\Models\Vessel::where('vessel_name', 'TB Syukur 23')->exists());
        $this->assertTrue(\App\Models\Vessel::where('vessel_name', 'BG Syukur 03')->exists());
        $this->assertFalse(\App\Models\Vessel::where('vessel_name', 'TB Samudra 01')->exists());

        // SPAL 104 lengkap
        $spal = \App\Models\Voyage::where('spal_number', 'like', '104/%')->firstOrFail();
        $this->assertSame('completed', $spal->voyage_status);
        $this->assertSame('closing', $spal->charter_stage);
        $this->assertEquals(7500, (float) $spal->dsr_mt);
        $this->assertSame(125000.0, (float) $spal->freight_rate);
        $this->assertSame('PT Sinar Laut Maritim', $spal->customer?->name);

        // Invoice 197 DP & 211 pelunasan, PPh 1.2%
        $invoices = \App\Models\Invoice::where('voyage_id', $spal->id)->get();
        $this->assertSame(2, $invoices->count());
        foreach ($invoices as $inv) {
            $this->assertEquals(0.012, (float) $inv->pph_rate);
            $this->assertNotEmpty($inv->fp_number);
        }

        // 2 keagenan + dokumen perjalanan tertaut
        $this->assertSame(2, $spal->agencyAppointments()->count());
        $this->assertGreaterThanOrEqual(4, $spal->documents()->count());

        // Tracker: dokumen A2 Surat Laut + endorsement
        $this->assertTrue(\App\Models\Document::where('document_name', 'like', '%A2 | Surat Laut%')->exists());
        $this->assertGreaterThanOrEqual(10, \App\Models\Document::where('has_endorsement', true)->count());

        // Arsip SPT 6 bulan
        $this->assertSame(6, \App\Models\Document::where('document_name', 'like', '%SPT_Unifikasi%')->count());
    }

    public function test_po_seed_and_numbering(): void
    {
        $this->assertSame(8, \App\Models\PurchaseOrder::count());
        $this->assertGreaterThanOrEqual(3, \App\Models\Bill::whereNotNull('po_id')->count());
        $this->assertGreaterThanOrEqual(1, \App\Models\BillPayment::whereNotNull('cheque_number')->count());

        // Nomor PO baru lanjut dari counter (362 → 363)
        $this->loginUser('finance@bungateratai.id');
        $this->post('/keuangan/po', [
            'order_date' => now()->toDateString(),
            'supplier_id' => \App\Models\Supplier::first()->id,
            'dept' => 'ENGINE',
            'items' => [['item_name' => 'Oli Uji', 'qty' => 2, 'unit' => 'pcs', 'price' => 100000]],
        ])->assertSessionHas('success');

        $po = \App\Models\PurchaseOrder::latest('id')->firstOrFail();
        $this->assertMatchesRegularExpression('/^363\/PO-BT\/TB\/[IVXL]+\/\d{4}$/', $po->po_number);
        // PO ikut arsip terpadu
        $this->assertDatabaseHas('documents', ['document_number' => $po->po_number, 'source_type' => 'terbitan']);
    }

    public function test_numbering_service_patterns(): void
    {
        $svc = app(\App\Services\NumberingService::class);

        $spal = $svc->next('SPAL', ['{kode_penyewa}' => 'SLM', '{kode_kapal}' => '23']);
        $this->assertSame('105/SLM/FC/23/'.'X/2026', $spal['number']);
        $this->assertSame(105, $spal['template']->seq_last);

        $arsip = $svc->next('SURAT_UMUM', [], 'arsip');
        $this->assertStringStartsWith('ARS/SU/2026/', $arsip['number']);
    }

    public function test_issue_spal_pdf_and_void(): void
    {
        \Illuminate\Support\Facades\Storage::fake('local');
        $this->loginUser('supervisor@bungateratai.id');

        $spal = \App\Models\Voyage::where('spal_number', 'like', '104/%')->firstOrFail();
        $before = \App\Models\Document::where('source_type', 'terbitan')->count();

        $response = $this->get("/cetak/spal/{$spal->id}");
        $response->assertOk();

        $doc = \App\Models\Document::where('source_type', 'terbitan')->latest('id')->firstOrFail();
        $this->assertSame($before + 1, \App\Models\Document::where('source_type', 'terbitan')->count());
        $this->assertSame($spal->spal_number, $doc->document_number);
        $this->assertNotNull($doc->file_path);
        $this->assertTrue(\Illuminate\Support\Facades\Storage::disk('local')->exists($doc->file_path));
        $this->assertTrue($spal->documents()->where('documents.id', $doc->id)->exists());

        // Void dengan alasan → nomor tidak dapat dipakai ulang, file tetap
        $this->loginUser('admin@bungateratai.id');
        $this->post("/dokumen/{$doc->id}/void", ['reason' => 'Uji coba void'])->assertRedirect();
        $doc->refresh();
        $this->assertNotNull($doc->voided_at);
        $this->assertSame('Uji coba void', $doc->void_reason);

        // Void dokumen unggahan ditolak
        $unggahan = \App\Models\Document::where('source_type', 'unggahan')->firstOrFail();
        $this->post("/dokumen/{$unggahan->id}/void", ['reason' => 'x'])->assertSessionHas('error');
    }

    public function test_issue_generic_letter(): void
    {
        \Illuminate\Support\Facades\Storage::fake('local');
        $this->loginUser('admin@bungateratai.id');

        $before = \App\Models\Document::where('template_id', \App\Models\DocumentTemplate::where('code', 'SURAT_UMUM')->value('id'))->count();

        $this->post('/dokumen/surat-umum', [
            'to' => 'PT Uji Coba',
            'subject' => 'Surat Keterangan Operasional',
            'body' => "Dengan hormat,`n`nBersama ini kami menyatakan bahwa ...",
            'date' => now()->toDateString(),
        ])->assertRedirect();

        $this->assertSame($before + 1, \App\Models\Document::where('template_id', \App\Models\DocumentTemplate::where('code', 'SURAT_UMUM')->value('id'))->count());
        $letter = \App\Models\Document::latest('id')->firstOrFail();
        $this->assertSame('terbitan', $letter->source_type);
        $this->assertNotEmpty($letter->document_number);
        $this->assertTrue(\Illuminate\Support\Facades\Storage::disk('local')->exists($letter->file_path));
    }

    public function test_issue_agency_letter_generates_pdf(): void
    {
        \Illuminate\Support\Facades\Storage::fake('local');
        $this->loginUser('ops@bungateratai.id');

        $agency = \App\Models\AgencyAppointment::firstOrFail();
        $response = $this->get("/cetak/keagenan/{$agency->id}");
        $response->assertOk();
        $this->assertNotNull($agency->fresh()->file_path);
    }

    public function test_export_excel_endpoints(): void
    {
        $this->loginUser('admin@bungateratai.id');

        $this->get('/laporan/export/master-tracker')->assertOk();
        $this->get('/laporan/export/monthly?period='.now()->format('Y-m'))->assertOk();
        $this->get('/laporan/export/outstanding')->assertOk();
        $this->get('/laporan/export/rekap-nota?from='.now()->startOfYear()->toDateString().'&to='.now()->toDateString())->assertOk();
    }

    public function test_endorsement_reminder_terpisah(): void
    {
        // Dokumen endorsement jatuh tempo → notifikasi endorsement, bukan expiry
        $due = \App\Models\Document::where('has_endorsement', true)
            ->whereNotNull('endorsement_next_date')
            ->get()
            ->first(function ($d) {
                $days = (int) now()->startOfDay()->diffInDays($d->endorsement_next_date, false);

                return $days <= 30;
            });
        $this->assertNotNull($due, 'Seed harus punya endorsement <=30 hari');

        $svc = app(\App\Services\ReminderService::class);
        $items = $svc->dueEndorsements();
        $this->assertTrue($items->contains(fn ($i) => $i['refId'] === $due->id));

        $this->assertGreaterThan(0, \App\Models\Notification::where('notification_type', 'endorsement_jatuh_tempo')->count()
            + \App\Models\Notification::where('notification_type', 'endorsement_kedaluwarsa')->count());

        // Halaman notifikasi tab reminder menampilkan endorsement
        $this->loginUser('admin@bungateratai.id');
        $this->get('/notifikasi?filter=reminder')->assertOk();
    }

    public function test_update_charter_requires_dsr_for_pelunasan(): void
    {
        $this->loginUser('ops@bungateratai.id');
        $spal = \App\Models\Voyage::where('spal_number', 'like', '104/%')->firstOrFail();

        // Pelunasan tanpa DSR (voyage sudah punya dsr → pakai voyage tanpa dsr utk uji)
        $spal->update(['dsr_mt' => null]);
        $this->from("/perjalanan/{$spal->id}")
            ->post("/perjalanan/{$spal->id}/charter", ['charter_stage' => 'pelunasan'])
            ->assertSessionHas('error');

        // Dengan DSR → lolos
        $this->from("/perjalanan/{$spal->id}")
            ->post("/perjalanan/{$spal->id}/charter", ['charter_stage' => 'pelunasan', 'dsr_mt' => 7500, 'dsr_date' => now()->toDateString()])
            ->assertSessionHas('success');
        $this->assertSame('pelunasan', $spal->fresh()->charter_stage);
    }

    public function test_docs_page_and_fleet_show_after_client_seed(): void
    {
        $this->loginUser('admin@bungateratai.id');

        // Fleet tongkang kini menampilkan voyage via relasi
        $barge = \App\Models\Vessel::where('vessel_name', 'BG Syukur 03')->firstOrFail();
        $this->get("/armada/{$barge->id}")->assertOk();

        $spal = \App\Models\Voyage::where('spal_number', 'like', '104/%')->firstOrFail();
        $this->assertDatabaseHas('vessel_relationships', ['barge_id' => $barge->id, 'voyage_id' => $spal->id]);

        // Document Center sub-tab + detail dgn relasi/void/endorsement
        foreach (['arsip', 'terbitan', 'unggahan', 'expiring'] as $tab) {
            $this->get("/dokumen?tab={$tab}")->assertOk();
        }
        $doc = \App\Models\Document::where('source_type', 'terbitan')->firstOrFail();
        $this->get("/dokumen/{$doc->id}")->assertOk();

        // Pengaturan tab template
        $this->get('/pengaturan?tab=template')->assertOk();
    }
}
