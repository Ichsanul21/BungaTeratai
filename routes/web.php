<?php

use App\Http\Controllers\ApprovalsController;
use App\Http\Controllers\AuditTrailController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DocumentController;
use App\Http\Controllers\FleetController;
use App\Http\Controllers\FinanceController;
use App\Http\Controllers\HrController;
use App\Http\Controllers\IssueController;
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
    Route::delete('/notifikasi/{notification}', [NotificationController::class, 'destroy'])->name('notifications.destroy');
    Route::post('/notifikasi/delete-read', [NotificationController::class, 'deleteRead'])->name('notifications.delete-read');

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
    Route::post('/dokumen/{document}/archive', [DocumentController::class, 'archive'])->name('documents.archive');
    Route::post('/dokumen/{document}/void', [DocumentController::class, 'void'])->name('documents.void');

    // Fleet Management
    Route::get('/armada', [FleetController::class, 'index'])->name('fleet.index');
    Route::get('/armada/create', [FleetController::class, 'create'])->name('fleet.create');
    Route::post('/armada', [FleetController::class, 'store'])->name('fleet.store');
    Route::get('/armada/{vessel}', [FleetController::class, 'show'])->name('fleet.show');
    Route::get('/armada/{vessel}/edit', [FleetController::class, 'edit'])->name('fleet.edit');
    Route::put('/armada/{vessel}', [FleetController::class, 'update'])->name('fleet.update');
    Route::post('/armada/{vessel}/archive', [FleetController::class, 'archive'])->name('fleet.archive');

    // Voyage Management
    Route::get('/perjalanan', [VoyageController::class, 'index'])->name('voyages.index');
    Route::get('/perjalanan/create', [VoyageController::class, 'create'])->name('voyages.create');
    Route::post('/perjalanan', [VoyageController::class, 'store'])->name('voyages.store');
    Route::get('/perjalanan/{voyage}', [VoyageController::class, 'show'])->name('voyages.show');
    Route::get('/perjalanan/{voyage}/edit', [VoyageController::class, 'edit'])->name('voyages.edit');
    Route::put('/perjalanan/{voyage}', [VoyageController::class, 'update'])->name('voyages.update');
    Route::post('/perjalanan/{voyage}/status', [VoyageController::class, 'updateStatus'])->name('voyages.status');
    Route::post('/perjalanan/{voyage}/approve', [VoyageController::class, 'approve'])->name('voyages.approve');
    Route::post('/perjalanan/{voyage}/confirm-external', [VoyageController::class, 'confirmExternal'])->name('voyages.confirm-external');
    Route::post('/perjalanan/{voyage}/checklist/{item}', [VoyageController::class, 'updateChecklistItem'])->name('voyages.checklist');
    Route::post('/perjalanan/{voyage}/link-document', [VoyageController::class, 'linkDocument'])->name('voyages.link-document');
    Route::post('/perjalanan/{voyage}/passenger-log', [VoyageController::class, 'addPassengerLog'])->name('voyages.passenger-log');
    // Charter SPAL (B3)
    Route::post('/perjalanan/{voyage}/charter', [VoyageController::class, 'updateCharter'])->name('voyages.charter');
    Route::post('/perjalanan/{voyage}/keagenan', [VoyageController::class, 'storeAgency'])->name('voyages.agency');
    Route::delete('/perjalanan/{voyage}/keagenan/{agency}', [VoyageController::class, 'deleteAgency'])->name('voyages.agency.delete');

    // Approvals
    Route::get('/persetujuan', [ApprovalsController::class, 'index'])
        ->middleware('can:menu.approvals')->name('approvals.index');

    Route::get('/operasional', [OperationsController::class, 'index'])->name('operations.index');
    Route::post('/operasional/kondisi', [OperationsController::class, 'storeCondition'])->name('operations.condition');
    Route::post('/operasional/servis', [OperationsController::class, 'storeService'])->name('operations.service');
    Route::post('/operasional/bbm', [OperationsController::class, 'storeFuel'])->name('operations.fuel');
    Route::put('/operasional/kondisi/{condition}', [OperationsController::class, 'updateCondition'])->name('operations.condition.update');
    Route::delete('/operasional/kondisi/{condition}', [OperationsController::class, 'deleteCondition'])->name('operations.condition.delete');
    Route::put('/operasional/servis/{service}', [OperationsController::class, 'updateService'])->name('operations.service.update');
    Route::delete('/operasional/servis/{service}', [OperationsController::class, 'deleteService'])->name('operations.service.delete');
    Route::put('/operasional/bbm/{fuel}', [OperationsController::class, 'updateFuel'])->name('operations.fuel.update');
    Route::delete('/operasional/bbm/{fuel}', [OperationsController::class, 'deleteFuel'])->name('operations.fuel.delete');

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
    // CRUD tambahan (Fase A)
    Route::put('/keuangan/invoice/{invoice}', [FinanceController::class, 'updateInvoice'])->name('finance.invoice.update');
    Route::delete('/keuangan/invoice/{invoice}', [FinanceController::class, 'deleteInvoice'])->name('finance.invoice.delete');
    Route::delete('/keuangan/payment/{payment}', [FinanceController::class, 'deletePayment'])->name('finance.payment.delete');
    Route::put('/keuangan/bill/{bill}', [FinanceController::class, 'updateBill'])->name('finance.bill.update');
    Route::delete('/keuangan/bill/{bill}', [FinanceController::class, 'deleteBill'])->name('finance.bill.delete');
    Route::delete('/keuangan/bill-payment/{payment}', [FinanceController::class, 'deleteBillPayment'])->name('finance.bill-payment.delete');
    Route::put('/keuangan/cash/{cash}', [FinanceController::class, 'updateCash'])->name('finance.cash.update');
    Route::delete('/keuangan/cash/{cash}', [FinanceController::class, 'deleteCash'])->name('finance.cash.delete');
    Route::put('/keuangan/jurnal/{entry}', [FinanceController::class, 'updateJournal'])->name('finance.jurnal.update');
    Route::delete('/keuangan/jurnal/{entry}', [FinanceController::class, 'deleteJournal'])->name('finance.jurnal.delete');
    Route::post('/keuangan/aset', [FinanceController::class, 'storeAsset'])->name('finance.aset');
    Route::put('/keuangan/aset/{asset}', [FinanceController::class, 'updateAsset'])->name('finance.aset.update');
    Route::delete('/keuangan/aset/{asset}', [FinanceController::class, 'deleteAsset'])->name('finance.aset.delete');
    Route::post('/keuangan/jadwal', [FinanceController::class, 'storeSchedule'])->name('finance.jadwal');
    Route::put('/keuangan/jadwal/{schedule}', [FinanceController::class, 'updateSchedule'])->name('finance.jadwal.update');
    Route::delete('/keuangan/jadwal/{schedule}', [FinanceController::class, 'deleteSchedule'])->name('finance.jadwal.delete');
    Route::post('/keuangan/akun', [FinanceController::class, 'storeAccount'])->name('finance.akun');
    Route::put('/keuangan/akun/{account}', [FinanceController::class, 'updateAccount'])->name('finance.akun.update');
    Route::delete('/keuangan/akun/{account}', [FinanceController::class, 'deleteAccount'])->name('finance.akun.delete');
    Route::put('/keuangan/payroll-entries/{entry}', [FinanceController::class, 'updatePayrollEntry'])->name('finance.payroll-entry.update');
    Route::delete('/keuangan/payroll-entries/{entry}', [FinanceController::class, 'deletePayrollEntry'])->name('finance.payroll-entry.delete');
    // B4: Purchase Order
    Route::post('/keuangan/po', [FinanceController::class, 'storePo'])->name('finance.po');
    Route::post('/keuangan/po/{po}/receive', [FinanceController::class, 'receivePo'])->name('finance.po.receive');
    Route::post('/keuangan/po/{po}/make-bill', [FinanceController::class, 'makeBillFromPo'])->name('finance.po.bill');
    Route::delete('/keuangan/po/{po}', [FinanceController::class, 'deletePo'])->name('finance.po.delete');

    // Inventory
    Route::get('/inventory', [InventoryController::class, 'index'])
        ->middleware('can:menu.inventory')->name('inventory.index');
    Route::post('/inventory/items', [InventoryController::class, 'storeItem'])->name('inventory.items');
    Route::post('/inventory/movements', [InventoryController::class, 'storeMovement'])->name('inventory.movements');
    Route::put('/inventory/items/{item}', [InventoryController::class, 'updateItem'])->name('inventory.items.update');
    Route::delete('/inventory/items/{item}', [InventoryController::class, 'deleteItem'])->name('inventory.items.delete');
    Route::put('/inventory/movements/{movement}', [InventoryController::class, 'updateMovement'])->name('inventory.movements.update');
    Route::delete('/inventory/movements/{movement}', [InventoryController::class, 'deleteMovement'])->name('inventory.movements.delete');
    Route::post('/inventory/batches', [InventoryController::class, 'storeBatch'])->name('inventory.batches');
    Route::put('/inventory/batches/{batch}', [InventoryController::class, 'updateBatch'])->name('inventory.batches.update');
    Route::delete('/inventory/batches/{batch}', [InventoryController::class, 'deleteBatch'])->name('inventory.batches.delete');

    // SDM & Karyawan
    Route::get('/sdm', [HrController::class, 'index'])
        ->middleware('can:menu.hr')->name('hr.index');
    Route::post('/sdm/abk', [HrController::class, 'storeCrew'])->name('hr.crew');
    Route::post('/sdm/abk/{crew}/sertifikat', [HrController::class, 'storeCertificate'])->name('hr.crew.certificate');
    Route::post('/sdm/karyawan', [HrController::class, 'storeEmployee'])->name('hr.employee');
    // CRUD tambahan (Fase A)
    Route::put('/sdm/abk/{crew}', [HrController::class, 'updateCrew'])->name('hr.crew.update');
    Route::delete('/sdm/abk/{crew}', [HrController::class, 'deleteCrew'])->name('hr.crew.delete');
    Route::put('/sdm/abk/{crew}/sertifikat/{certificate}', [HrController::class, 'updateCertificate'])->name('hr.crew.certificate.update');
    Route::delete('/sdm/abk/{crew}/sertifikat/{certificate}', [HrController::class, 'deleteCertificate'])->name('hr.crew.certificate.delete');
    Route::post('/sdm/penempatan', [HrController::class, 'storeAssignment'])->name('hr.assignment');
    Route::put('/sdm/penempatan/{assignment}', [HrController::class, 'updateAssignment'])->name('hr.assignment.update');
    Route::delete('/sdm/penempatan/{assignment}', [HrController::class, 'deleteAssignment'])->name('hr.assignment.delete');
    Route::put('/sdm/karyawan/{employee}', [HrController::class, 'updateEmployee'])->name('hr.employee.update');
    Route::delete('/sdm/karyawan/{employee}', [HrController::class, 'deleteEmployee'])->name('hr.employee.delete');

    Route::get('/laporan', [ReportsController::class, 'index'])
        ->name('reports.index');

    // Fase C — Penerbitan & Export Dokumen
    Route::get('/cetak/spal/{voyage}', [IssueController::class, 'spal'])->name('issue.spal');
    Route::get('/cetak/keagenan/{agency}', [IssueController::class, 'agency'])->name('issue.agency');
    Route::get('/cetak/po/{po}', [IssueController::class, 'po'])->name('issue.po');
    Route::get('/cetak/invoice-charter/{invoice}', [IssueController::class, 'charterInvoice'])->name('issue.invoice.charter');
    Route::get('/cetak/invoice/{invoice}', [IssueController::class, 'financeInvoice'])->name('issue.invoice');
    Route::post('/dokumen/surat-umum', [IssueController::class, 'storeGenericLetter'])->name('issue.letter');
    Route::get('/laporan/export/master-tracker', [IssueController::class, 'exportMasterTracker'])->name('export.tracker');
    Route::get('/laporan/export/monthly', [IssueController::class, 'exportMonthly'])->name('export.monthly');
    Route::get('/laporan/export/rekap-nota', [IssueController::class, 'exportRekapNota'])->name('export.rekap');
    Route::get('/laporan/export/outstanding', [IssueController::class, 'exportOutstanding'])->name('export.outstanding');

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
    // CRUD tambahan (Fase A)
    Route::put('/pengaturan/users/{user}', [SettingsController::class, 'updateUser'])->name('settings.users.update');
    Route::delete('/pengaturan/users/{user}', [SettingsController::class, 'deleteUser'])->name('settings.users.delete');
    Route::put('/pengaturan/customers/{customer}', [SettingsController::class, 'updateCustomer'])->name('settings.customers.update');
    Route::delete('/pengaturan/customers/{customer}', [SettingsController::class, 'deleteCustomer'])->name('settings.customers.delete');
    Route::put('/pengaturan/suppliers/{supplier}', [SettingsController::class, 'updateSupplier'])->name('settings.suppliers.update');
    Route::delete('/pengaturan/suppliers/{supplier}', [SettingsController::class, 'deleteSupplier'])->name('settings.suppliers.delete');
    Route::put('/pengaturan/katalog/{catalog}', [SettingsController::class, 'updateCatalog'])->name('settings.katalog.update');
    Route::delete('/pengaturan/katalog/{catalog}', [SettingsController::class, 'deleteCatalog'])->name('settings.katalog.delete');
    Route::post('/pengaturan/kategori', [SettingsController::class, 'storeCategory'])->name('settings.kategori');
    Route::put('/pengaturan/kategori/{category}', [SettingsController::class, 'updateCategory'])->name('settings.kategori.update');
    Route::delete('/pengaturan/kategori/{category}', [SettingsController::class, 'deleteCategory'])->name('settings.kategori.delete');
    // B5: Master template & nomor surat
    Route::put('/pengaturan/templates/{template}', [SettingsController::class, 'updateTemplate'])->name('settings.templates.update');
    Route::post('/pengaturan/templates/{template}/reset-counter', [SettingsController::class, 'resetTemplateCounter'])->name('settings.templates.reset');

    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';
