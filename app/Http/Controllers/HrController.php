<?php

namespace App\Http\Controllers;

use App\Models\Crew;
use App\Models\CrewAssignment;
use App\Models\CrewCertificate;
use App\Models\OfficeEmployee;
use App\Services\AuditService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class HrController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('menu.hr');

        $tab = $request->string('tab')->toString() ?: 'abk';

        if ($tab === 'karyawan') {
            return Inertia::render('Hr/Index', [
                'tab' => $tab,
                'employees' => OfficeEmployee::orderBy('name')->get()->map(fn ($e) => [
                    'id' => $e->id,
                    'name' => $e->name,
                    'nik' => $e->nik,
                    'npwp' => $e->npwp,
                    'position' => $e->position,
                    'department' => $e->department,
                    'join_date' => $e->join_date,
                    'status' => $e->status,
                    'base_salary' => $e->base_salary,
                    'allowances' => $e->allowances,
                ]),
            ]);
        }

        return Inertia::render('Hr/Index', [
            'tab' => $tab,
            'crews' => Crew::with(['certificates', 'assignments.vessel'])->orderBy('name')->get()->map(fn ($c) => [
                'id' => $c->id,
                'name' => $c->name,
                'nik' => $c->nik,
                'birth_place' => $c->birth_place,
                'birth_date' => $c->birth_date,
                'gender' => $c->gender,
                'phone' => $c->phone,
                'npwp' => $c->npwp,
                'rank' => $c->rank,
                'base_salary' => $c->base_salary,
                'status' => $c->status,
                'certificates' => $c->certificates->map(fn ($cert) => [
                    'id' => $cert->id,
                    'cert_type' => $cert->cert_type,
                    'number' => $cert->number,
                    'has_expiry' => $cert->has_expiry,
                    'expiry_date' => $cert->expiry_date,
                    'days_left' => $cert->has_expiry && $cert->expiry_date
                        ? (int) now()->startOfDay()->diffInDays($cert->expiry_date, false)
                        : null,
                ]),
                'assignments' => $c->assignments->map(fn ($a) => [
                    'id' => $a->id,
                    'vessel_name' => $a->vessel?->vessel_name,
                    'role' => $a->role,
                    'start_date' => $a->start_date,
                    'end_date' => $a->end_date,
                    'status' => $a->status,
                ]),
            ]),
            'vessels' => \App\Models\Vessel::orderBy('vessel_name')->get(['id', 'vessel_name']),
        ]);
    }

    public function storeCrew(Request $request)
    {
        Gate::authorize('menu.hr');

        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'nik' => ['nullable', 'string', 'max:30'],
            'birth_place' => ['nullable', 'string', 'max:80'],
            'birth_date' => ['nullable', 'date'],
            'gender' => ['nullable', 'in:L,P'],
            'phone' => ['nullable', 'string', 'max:30'],
            'npwp' => ['nullable', 'string', 'max:40'],
            'rank' => ['required', 'in:nakhoda,chief_engineer,mualim,mualim_2,juru_mudi,kelasi,oiler,juru_masak,abk'],
            'base_salary' => ['required', 'numeric', 'min:0'],
            'status' => ['required', 'in:aktif,cuti,selesai'],
            'vessel_id' => ['nullable', 'exists:vessels,id'],
            'assignment_role' => ['nullable', 'string', 'max:60'],
        ]);

        $crew = DB::transaction(function () use ($data) {
            $crew = Crew::create(collect($data)->except(['vessel_id', 'assignment_role'])->all());

            if (! empty($data['vessel_id'])) {
                CrewAssignment::create([
                    'crew_id' => $crew->id,
                    'vessel_id' => $data['vessel_id'],
                    'role' => $data['assignment_role'] ?? $crew->rank,
                    'start_date' => now()->toDateString(),
                    'status' => 'aktif',
                ]);
            }

            return $crew;
        });

        AuditService::log('created', 'crew', $crew->id, null, $data, "ABK baru: {$crew->name}");

        return back()->with('success', "ABK {$crew->name} terdaftar.");
    }

    public function storeCertificate(Request $request, Crew $crew)
    {
        Gate::authorize('menu.hr');

        $data = $request->validate([
            'cert_type' => ['required', 'in:SKK,medical_fitness,BST,ROC,CDC,passport,lainnya'],
            'number' => ['nullable', 'string', 'max:80'],
            'issued_at' => ['nullable', 'date'],
            'has_expiry' => ['required', 'boolean'],
            'expiry_date' => ['nullable', 'date'],
        ]);

        if ($data['has_expiry'] && empty($data['expiry_date'])) {
            return back()->withErrors(['expiry_date' => 'Tanggal berlaku s/d wajib diisi.']);
        }
        if (! $data['has_expiry']) {
            $data['expiry_date'] = null;
        }

        CrewCertificate::create([...$data, 'crew_id' => $crew->id]);

        return back()->with('success', 'Sertifikat ABK tersimpan & masuk Reminder.');
    }

    public function storeEmployee(Request $request)
    {
        Gate::authorize('menu.hr');

        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'nik' => ['nullable', 'string', 'max:30'],
            'npwp' => ['nullable', 'string', 'max:40'],
            'position' => ['required', 'string', 'max:80'],
            'department' => ['nullable', 'string', 'max:80'],
            'join_date' => ['nullable', 'date'],
            'status' => ['required', 'in:aktif,keluar'],
            'base_salary' => ['required', 'numeric', 'min:0'],
            'allowances' => ['nullable', 'numeric', 'min:0'],
        ]);

        $employee = OfficeEmployee::create($data);

        AuditService::log('created', 'office_employee', $employee->id, null, $data, "Karyawan: {$employee->name}");

        return back()->with('success', "Karyawan {$employee->name} terdaftar.");
    }

    // ===== CRUD tambahan (Fase A) =====

    public function updateCrew(Request $request, Crew $crew)
    {
        Gate::authorize('menu.hr');

        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'nik' => ['nullable', 'string', 'max:30'],
            'birth_place' => ['nullable', 'string', 'max:80'],
            'birth_date' => ['nullable', 'date'],
            'gender' => ['nullable', 'in:L,P'],
            'phone' => ['nullable', 'string', 'max:30'],
            'npwp' => ['nullable', 'string', 'max:40'],
            'rank' => ['required', 'in:nakhoda,chief_engineer,mualim,mualim_2,juru_mudi,kelasi,oiler,juru_masak,abk'],
            'base_salary' => ['required', 'numeric', 'min:0'],
            'status' => ['required', 'in:aktif,cuti,selesai'],
        ]);

        $before = $crew->only(['name', 'rank', 'base_salary', 'status']);
        $crew->update($data);

        AuditService::log('updated', 'crew', $crew->id, $before, $data, "Data ABK diperbarui: {$crew->name}");

        return back()->with('success', "Data ABK {$crew->name} diperbarui.");
    }

    public function deleteCrew(Crew $crew)
    {
        Gate::authorize('menu.hr');

        // Akhiri penempatan aktif agar data konsisten
        CrewAssignment::where('crew_id', $crew->id)->where('status', 'aktif')
            ->update(['status' => 'berakhir', 'end_date' => now()->toDateString()]);

        AuditService::log('deleted', 'crew', $crew->id, $crew->toArray(), null, "ABK dihapus (soft): {$crew->name}");
        $crew->delete();

        return back()->with('success', "ABK {$crew->name} dihapus dari roster (riwayat penempatan tetap tersimpan).");
    }

    public function updateCertificate(Request $request, Crew $crew, CrewCertificate $certificate)
    {
        Gate::authorize('menu.hr');
        abort_unless($certificate->crew_id === $crew->id, 404);

        $data = $request->validate([
            'cert_type' => ['required', 'in:SKK,medical_fitness,BST,ROC,CDC,passport,lainnya'],
            'number' => ['nullable', 'string', 'max:80'],
            'issued_at' => ['nullable', 'date'],
            'has_expiry' => ['required', 'boolean'],
            'expiry_date' => ['nullable', 'date'],
        ]);

        if ($data['has_expiry'] && empty($data['expiry_date'])) {
            return back()->withErrors(['expiry_date' => 'Tanggal berlaku s/d wajib diisi.']);
        }
        if (! $data['has_expiry']) {
            $data['expiry_date'] = null;
        }

        $before = $certificate->only(['cert_type', 'number', 'expiry_date']);
        $certificate->update($data);

        AuditService::log('updated', 'crew_certificate', $certificate->id, $before, $data, 'Sertifikat ABK diperbarui');

        return back()->with('success', 'Sertifikat ABK diperbarui.');
    }

    public function deleteCertificate(Crew $crew, CrewCertificate $certificate)
    {
        Gate::authorize('menu.hr');
        abort_unless($certificate->crew_id === $crew->id, 404);

        AuditService::log('deleted', 'crew_certificate', $certificate->id, $certificate->toArray(), null, 'Sertifikat ABK dihapus');
        $certificate->delete();

        return back()->with('success', 'Sertifikat dihapus.');
    }

    public function storeAssignment(Request $request)
    {
        Gate::authorize('menu.hr');

        $data = $request->validate([
            'crew_id' => ['required', 'exists:crews,id'],
            'vessel_id' => ['required', 'exists:vessels,id'],
            'role' => ['required', 'string', 'max:60'],
            'start_date' => ['required', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
        ]);

        // Tutup penempatan aktif sebelumnya pada kapal manapun
        CrewAssignment::where('crew_id', $data['crew_id'])
            ->where('status', 'aktif')
            ->update(['status' => 'berakhir', 'end_date' => now()->toDateString()]);

        $assignment = CrewAssignment::create([...$data, 'status' => 'aktif']);

        AuditService::log('created', 'crew_assignment', $assignment->id, null, $data, 'Penempatan ABK baru');

        return back()->with('success', 'Penempatan ABK tersimpan.');
    }

    public function updateAssignment(Request $request, CrewAssignment $assignment)
    {
        Gate::authorize('menu.hr');

        $data = $request->validate([
            'vessel_id' => ['required', 'exists:vessels,id'],
            'role' => ['required', 'string', 'max:60'],
            'start_date' => ['required', 'date'],
            'end_date' => ['nullable', 'date'],
            'status' => ['required', 'in:aktif,cuti,berakhir'],
        ]);

        $before = $assignment->only(['vessel_id', 'role', 'status', 'end_date']);
        $assignment->update($data);

        AuditService::log('updated', 'crew_assignment', $assignment->id, $before, $data, 'Penempatan ABK diperbarui');

        return back()->with('success', 'Penempatan ABK diperbarui.');
    }

    public function deleteAssignment(CrewAssignment $assignment)
    {
        Gate::authorize('menu.hr');

        AuditService::log('deleted', 'crew_assignment', $assignment->id, $assignment->toArray(), null, 'Penempatan ABK dihapus');
        $assignment->delete();

        return back()->with('success', 'Penempatan ABK dihapus.');
    }

    public function updateEmployee(Request $request, OfficeEmployee $employee)
    {
        Gate::authorize('menu.hr');

        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'nik' => ['nullable', 'string', 'max:30'],
            'npwp' => ['nullable', 'string', 'max:40'],
            'position' => ['required', 'string', 'max:80'],
            'department' => ['nullable', 'string', 'max:80'],
            'join_date' => ['nullable', 'date'],
            'status' => ['required', 'in:aktif,keluar'],
            'base_salary' => ['required', 'numeric', 'min:0'],
            'allowances' => ['nullable', 'numeric', 'min:0'],
        ]);

        $before = $employee->only(['name', 'position', 'department', 'status', 'base_salary']);
        $employee->update($data);

        AuditService::log('updated', 'office_employee', $employee->id, $before, $data, "Karyawan diperbarui: {$employee->name}");

        return back()->with('success', "Data karyawan {$employee->name} diperbarui.");
    }

    public function deleteEmployee(OfficeEmployee $employee)
    {
        Gate::authorize('menu.hr');

        AuditService::log('deleted', 'office_employee', $employee->id, $employee->toArray(), null, "Karyawan dihapus (soft): {$employee->name}");
        $employee->delete();

        return back()->with('success', "Karyawan {$employee->name} dihapus.");
    }
}
