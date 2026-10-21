<?php

use App\Http\Controllers\ApprovalsController;
use App\Http\Controllers\AuditTrailController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DocumentController;
use App\Http\Controllers\FleetController;
use App\Http\Controllers\FinanceController;
use App\Http\Controllers\HrController;
use App\Http\Controllers\InventoryController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\OperationsController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ReportsController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\VoyageController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return auth()->check()
        ? redirect('/dashboard')
        : redirect('/login');
});

Route::middleware(['auth'])->group(function () {
    Route::get('/dashboard', DashboardController::class)->name('dashboard');

    Route::get('/notifikasi', [NotificationController::class, 'index'])->name('notifications.index');
    Route::post('/notifikasi/{notification}/read', [NotificationController::class, 'markRead'])->name('notifications.read');
    Route::post('/notifikasi/read-all', [NotificationController::class, 'markAllReadResponse'])->name('notifications.read-all');

    // Document Center
    Route::get('/dokumen', [DocumentController::class, 'index'])->name('documents.index');
    Route::get('/dokumen/create', [DocumentController::class, 'create'])->name('documents.create');
    Route::post('/dokumen', [DocumentController::class, 'store'])->name('documents.store');
    Route::get('/dokumen/{document}', [DocumentController::class, 'show'])->name('documents.show');
    Route::put('/dokumen/{document}', [DocumentController::class, 'update'])->name('documents.update');
    Route::post('/dokumen/{document}/submit', [DocumentController::class, 'submit'])->name('documents.submit');
    Route::post('/dokumen/{document}/verify', [DocumentController::class, 'verify'])->name('documents.verify');
    Route::post('/dokumen/{document}/revision', [DocumentController::class, 'requestRevision'])->name('documents.revision');
    Route::post('/dokumen/{document}/reject', [DocumentController::class, 'reject'])->name('documents.reject');
    Route::post('/dokumen/{document}/versions', [DocumentController::class, 'storeVersion'])->name('documents.versions');
    Route::get('/dokumen/{document}/download/{version?}', [DocumentController::class, 'download'])->name('documents.download');

    // Fleet Management
    Route::get('/armada', [FleetController::class, 'index'])->name('fleet.index');
    Route::get('/armada/create', [FleetController::class, 'create'])->name('fleet.create');
    Route::post('/armada', [FleetController::class, 'store'])->name('fleet.store');
    Route::get('/armada/{vessel}', [FleetController::class, 'show'])->name('fleet.show');
    Route::get('/armada/{vessel}/edit', [FleetController::class, 'edit'])->name('fleet.edit');
    Route::put('/armada/{vessel}', [FleetController::class, 'update'])->name('fleet.update');

    // Voyage Management
    Route::get('/perjalanan', [VoyageController::class, 'index'])->name('voyages.index');
    Route::get('/perjalanan/create', [VoyageController::class, 'create'])->name('voyages.create');
    Route::post('/perjalanan', [VoyageController::class, 'store'])->name('voyages.store');
    Route::get('/perjalanan/{voyage}', [VoyageController::class, 'show'])->name('voyages.show');
    Route::post('/perjalanan/{voyage}/status', [VoyageController::class, 'updateStatus'])->name('voyages.status');
    Route::post('/perjalanan/{voyage}/approve', [VoyageController::class, 'approve'])->name('voyages.approve');
    Route::post('/perjalanan/{voyage}/confirm-external', [VoyageController::class, 'confirmExternal'])->name('voyages.confirm-external');
    Route::post('/perjalanan/{voyage}/checklist/{item}', [VoyageController::class, 'updateChecklistItem'])->name('voyages.checklist');
    Route::post('/perjalanan/{voyage}/link-document', [VoyageController::class, 'linkDocument'])->name('voyages.link-document');
    Route::post('/perjalanan/{voyage}/passenger-log', [VoyageController::class, 'addPassengerLog'])->name('voyages.passenger-log');

    // Approvals
    Route::get('/persetujuan', [ApprovalsController::class, 'index'])
        ->middleware('can:menu.approvals')->name('approvals.index');

    Route::get('/operasional', [OperationsController::class, 'index'])->name('operations.index');
    Route::post('/operasional/kondisi', [OperationsController::class, 'storeCondition'])->name('operations.condition');
    Route::post('/operasional/servis', [OperationsController::class, 'storeService'])->name('operations.service');
    Route::post('/operasional/bbm', [OperationsController::class, 'storeFuel'])->name('operations.fuel');

    // Keuangan (14 tab)
    Route::get('/keuangan', [FinanceController::class, 'index'])
        ->middleware('can:menu.finance')->name('finance.index');
    Route::post('/keuangan/invoice', [FinanceController::class, 'storeInvoice'])->name('finance.invoice');
    Route::post('/keuangan/invoice/{invoice}/pay', [FinanceController::class, 'payInvoice'])->name('finance.invoice.pay');
    Route::post('/keuangan/bill', [FinanceController::class, 'storeBill'])->name('finance.bill');
    Route::post('/keuangan/bill/{bill}/pay', [FinanceController::class, 'payBill'])->name('finance.bill.pay');
    Route::post('/keuangan/cash', [FinanceController::class, 'storeCash'])->name('finance.cash');
    Route::post('/keuangan/jurnal', [FinanceController::class, 'storeJournal'])->name('finance.jurnal');
    Route::post('/keuangan/payroll/{period}/generate', [FinanceController::class, 'generatePayroll'])->name('finance.payroll.generate');
    Route::post('/keuangan/payroll/{period}/post', [FinanceController::class, 'postPayroll'])->name('finance.payroll.post');
    Route::post('/keuangan/depreciation', [FinanceController::class, 'runDepreciation'])->name('finance.depreciation');
    Route::post('/keuangan/pajak/{tax}/setor', [FinanceController::class, 'setorPajak'])->name('finance.pajak.setor');

    // Inventory
    Route::get('/inventory', [InventoryController::class, 'index'])
        ->middleware('can:menu.inventory')->name('inventory.index');
    Route::post('/inventory/items', [InventoryController::class, 'storeItem'])->name('inventory.items');
    Route::post('/inventory/movements', [InventoryController::class, 'storeMovement'])->name('inventory.movements');

    // SDM & Karyawan
    Route::get('/sdm', [HrController::class, 'index'])
        ->middleware('can:menu.hr')->name('hr.index');
    Route::post('/sdm/abk', [HrController::class, 'storeCrew'])->name('hr.crew');
    Route::post('/sdm/abk/{crew}/sertifikat', [HrController::class, 'storeCertificate'])->name('hr.crew.certificate');
    Route::post('/sdm/karyawan', [HrController::class, 'storeEmployee'])->name('hr.employee');

    Route::get('/laporan', [ReportsController::class, 'index'])
        ->name('reports.index');

    Route::get('/audit', [AuditTrailController::class, 'index'])
        ->middleware('can:menu.audit')->name('audit.index');

    Route::get('/pengaturan', [SettingsController::class, 'index'])
        ->middleware('can:menu.settings')->name('settings.index');
    Route::post('/pengaturan/users', [SettingsController::class, 'storeUser'])->name('settings.users');
    Route::put('/pengaturan/profil', [SettingsController::class, 'updateCompany'])->name('settings.profil');
    Route::put('/pengaturan/reminder', [SettingsController::class, 'updateReminderRules'])->name('settings.reminder');
    Route::post('/pengaturan/customers', [SettingsController::class, 'storeCustomer'])->name('settings.customers');
    Route::post('/pengaturan/suppliers', [SettingsController::class, 'storeSupplier'])->name('settings.suppliers');
    Route::post('/pengaturan/katalog', [SettingsController::class, 'storeCatalog'])->name('settings.katalog');

    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';
