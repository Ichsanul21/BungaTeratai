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
}
