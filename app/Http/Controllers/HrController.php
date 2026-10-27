<?php

namespace App\Http\Controllers;

use App\Enums\CrewMovementType;
use App\Enums\CrewOffReason;
use App\Enums\CrewRank;
use App\Models\Crew;
use App\Models\CrewAssignment;
use App\Models\CrewCertificate;
use App\Models\CrewMovement;
use App\Models\HoursOfRestLog;
use App\Models\OfficeEmployee;
use App\Models\SijilRequest;
use App\Services\AuditService;
use App\Services\CrewComplianceService;
use App\Services\Generators\DocumentGeneratorService;
use App\Services\HoursOfRestService;
use App\Services\NumberingService;
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

        if ($tab === 'register') {
            return Inertia::render('Hr/Index', [
                'tab' => $tab,
                'movements' => CrewMovement::with(['crew', 'vessel', 'replacementCrew'])
                    ->orderByDesc('movement_date')->orderByDesc('id')->limit(200)->get()
                    ->map(fn ($m) => [
                        'id' => $m->id,
                        'type' => $m->type,
                        'type_label' => CrewMovementType::tryFrom($m->type)?->label() ?? $m->type,
                        'crew_name' => $m->crew?->name ?? '—',
                        'vessel_name' => $m->vessel?->vessel_name ?? '—',
                        'role' => $m->role,
                        'movement_date' => $m->movement_date?->toDateString(),
                        'reason' => $m->reason,
                        'no_surat' => $m->no_surat,
                        'recommendation_by' => $m->recommendation_by,
                        'replacement_name' => $m->replacementCrew?->name,
                        'notes' => $m->notes,
                    ]),
                'sijilRequests' => SijilRequest::with('vessel')->orderByDesc('letter_date')->limit(50)->get()
                    ->map(fn ($s) => [
                        'id' => $s->id,
                        'no_surat' => $s->no_surat,
                        'letter_date' => $s->letter_date?->toDateString(),
                        'kind' => $s->kind,
                        'vessel_name' => $s->vessel?->vessel_name,
                        'crew_count' => count($s->crew_ids ?? []),
                        'signed_by' => $s->signed_by,
                        'status' => $s->status,
                        'document_id' => $s->document_id,
                    ]),
                'vessels' => \App\Models\Vessel::orderBy('vessel_name')->get(['id', 'vessel_name']),
                'reasonList' => array_map(fn ($r) => ['value' => $r->value, 'label' => $r->label()], CrewOffReason::cases()),
                'movementTypes' => array_map(fn ($t) => ['value' => $t->value, 'label' => $t->label()], CrewMovementType::cases()),
                'crews' => Crew::orderBy('name')->get(['id', 'name', 'rank', 'status']),
            ]);
        }

        if ($tab === 'kadet') {
            $kadets = Crew::with(['assignments.vessel', 'certificates'])
                ->where(fn ($q) => $q->where('rank', CrewRank::KadetDeck->value)
                    ->orWhere('rank', CrewRank::KadetMesin->value)
                    ->orWhere('rank', 'Kadet Deck')->orWhere('rank', 'Kadet Mesin')
                    ->orWhere('rank', 'kadet deck')->orWhere('rank', 'kadet mesin'))
                ->orderBy('name')->get()
                ->map(fn ($c) => $this->mapCrew($c));

            return Inertia::render('Hr/Index', [
                'tab' => $tab,
                'crews' => $kadets,
                'vessels' => \App\Models\Vessel::orderBy('vessel_name')->get(['id', 'vessel_name']),
                'rankList' => $this->rankOptions([CrewRank::KadetDeck, CrewRank::KadetMesin]),
            ]);
        }

        if ($tab === 'hor') {
            Gate::authorize('hor.view');

            $crewId = $request->integer('crew_id') ?: null;
            $monthInput = $request->string('month')->toString();
            $month = preg_match('/^\d{4}-\d{2}$/', $monthInput) ? $monthInput : now()->format('Y-m');
            $start = \Carbon\Carbon::parse($month.'-01');
            $end = $start->copy()->endOfMonth();

            $logs = HoursOfRestLog::with('crew')
                ->when($crewId, fn ($q) => $q->where('crew_id', $crewId))
                ->whereBetween('log_date', [$start->toDateString(), $end->toDateString()])
                ->orderBy('log_date')->orderBy('id')
                ->get()
                ->map(fn ($l) => [
                    'id' => $l->id,
                    'client_uuid' => $l->client_uuid,
                    'crew_id' => $l->crew_id,
                    'crew_name' => $l->crew?->name ?? '—',
                    'crew_rank' => $l->crew?->rank,
                    'voyage_id' => $l->voyage_id,
                    'log_date' => $l->log_date->toDateString(),
                    'rest_entries' => $l->rest_entries ?? [],
                    'total_rest_minutes' => $l->total_rest_minutes,
                    'total_work_minutes' => $l->total_work_minutes,
                    'is_compliant' => $l->is_compliant,
                    'violations' => $l->violations ?? [],
                    'notes' => $l->notes,
                    'synced_at' => $l->synced_at?->toIso8601String(),
                    'device_occurred_at' => $l->device_occurred_at?->toIso8601String(),
                ]);

            return Inertia::render('Hr/Index', [
                'tab' => $tab,
                'horLogs' => $logs,
                'horCrew' => Crew::where('status', 'aktif')->orderBy('name')->get(['id', 'name', 'rank']),
                'horMonth' => $month,
                'horCrewId' => $crewId,
                'horAccess' => Gate::allows('hor.view'),
                'canHorManage' => Gate::allows('hor.manage'),
            ]);
        }

        return Inertia::render('Hr/Index', [
            'tab' => $tab,
            'crews' => Crew::with(['certificates', 'assignments.vessel'])->orderBy('name')->get()->map(fn ($c) => $this->mapCrew($c)),
            'vessels' => \App\Models\Vessel::orderBy('vessel_name')->get(['id', 'vessel_name']),
            'rankList' => $this->rankOptions(CrewRank::cases()),
            'vesselReadiness' => \App\Models\Vessel::where('operational_status', '!=', 'dalam_perbaikan')
                ->orderBy('vessel_name')->get()->map(function ($v) {
                    $r = app(CrewComplianceService::class)->forVessel($v);

                    return [
                        'vessel_id' => $v->id,
                        'vessel_name' => $v->vessel_name,
                        'crew_count' => $r['crew_count'],
                        'percent' => $r['percent'],
                        'missing' => $r['missing'],
                    ];
                }),
        ]);
    }

    private function mapCrew(Crew $c): array
    {
        return [
            'id' => $c->id,
            'kode_nik' => $c->kode_nik,
            'name' => $c->name,
            'name_ktp' => $c->name_ktp,
            'nik' => $c->nik,
            'birth_place' => $c->birth_place,
            'birth_date' => $c->birth_date,
            'gender' => $c->gender,
            'religion' => $c->religion,
            'mother_name' => $c->mother_name,
            'bank_account' => $c->bank_account,
            'address' => $c->address,
            'phone' => $c->phone,
            'npwp' => $c->npwp,
            'seafarer_code' => $c->seafarer_code,
            'sccw' => $c->sccw,
            'stcw_reference' => $c->stcw_reference,
            'no_ijazah' => $c->no_ijazah,
            'no_pkl' => $c->no_pkl,
            'no_surat_mutasi' => $c->no_surat_mutasi,
            'school_origin' => $c->school_origin,
            'nit' => $c->nit,
            'joined_on' => $c->joined_on?->toDateString(),
            'is_blacklist' => (bool) $c->is_blacklist,
            'rank' => $c->rank,
            'rank_label' => CrewRank::tryFrom($c->rank)?->label() ?? $c->rank,
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
        ];
    }

    /** @return array<int, array{value:string,label:string}> */
    private function rankOptions(array $ranks): array
    {
        return array_map(fn ($r) => ['value' => $r->value, 'label' => $r->label()], $ranks);
    }

    public function storeCrew(Request $request)
    {
        Gate::authorize('menu.hr');

        $data = $request->validate([
            'kode_nik' => ['nullable', 'string', 'max:20', 'unique:crews,kode_nik'],
            'name' => ['required', 'string', 'max:120'],
            'name_ktp' => ['nullable', 'string', 'max:120'],
            'nik' => ['nullable', 'string', 'max:30'],
            'birth_place' => ['nullable', 'string', 'max:80'],
            'birth_date' => ['nullable', 'date'],
            'gender' => ['nullable', 'in:L,P'],
            'religion' => ['nullable', 'string', 'max:30'],
            'mother_name' => ['nullable', 'string', 'max:120'],
            'bank_account' => ['nullable', 'string', 'max:50'],
            'address' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30'],
            'npwp' => ['nullable', 'string', 'max:40'],
            'seafarer_code' => ['nullable', 'string', 'max:40'],
            'sccw' => ['nullable', 'string', 'max:60'],
            'stcw_reference' => ['nullable', 'string', 'max:120'],
            'no_ijazah' => ['nullable', 'string', 'max:60'],
            'no_pkl' => ['nullable', 'string', 'max:60'],
            'no_surat_mutasi' => ['nullable', 'string', 'max:60'],
            'school_origin' => ['nullable', 'string', 'max:120'],
            'nit' => ['nullable', 'string', 'max:40'],
            'joined_on' => ['nullable', 'date'],
            'is_blacklist' => ['nullable', 'boolean'],
            'rank' => ['required', 'in:'.implode(',', CrewRank::values())],
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
            'cert_type' => ['required', 'in:'.implode(',', array_keys(\App\Services\CrewComplianceService::CERT_LABELS))],
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
            'kode_nik' => ['nullable', 'string', 'max:20', 'unique:crews,kode_nik,'.$crew->id],
            'name' => ['required', 'string', 'max:120'],
            'name_ktp' => ['nullable', 'string', 'max:120'],
            'nik' => ['nullable', 'string', 'max:30'],
            'birth_place' => ['nullable', 'string', 'max:80'],
            'birth_date' => ['nullable', 'date'],
            'gender' => ['nullable', 'in:L,P'],
            'religion' => ['nullable', 'string', 'max:30'],
            'mother_name' => ['nullable', 'string', 'max:120'],
            'bank_account' => ['nullable', 'string', 'max:50'],
            'address' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30'],
            'npwp' => ['nullable', 'string', 'max:40'],
            'seafarer_code' => ['nullable', 'string', 'max:40'],
            'sccw' => ['nullable', 'string', 'max:60'],
            'stcw_reference' => ['nullable', 'string', 'max:120'],
            'no_ijazah' => ['nullable', 'string', 'max:60'],
            'no_pkl' => ['nullable', 'string', 'max:60'],
            'no_surat_mutasi' => ['nullable', 'string', 'max:60'],
            'school_origin' => ['nullable', 'string', 'max:120'],
            'nit' => ['nullable', 'string', 'max:40'],
            'joined_on' => ['nullable', 'date'],
            'is_blacklist' => ['nullable', 'boolean'],
            'rank' => ['required', 'in:'.implode(',', CrewRank::values())],
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
            'cert_type' => ['required', 'in:'.implode(',', array_keys(\App\Services\CrewComplianceService::CERT_LABELS))],
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

    // ===== Crewing (materi CREWING): Sign ON/OFF, Mutasi, Kadet, Sijil, Cetak =====

    /** Sign OFF: register gerakan + nomor surat BT-OFF + aturan perwira (pengganti + rekomendasi). */
    public function signOff(Request $request)
    {
        Gate::authorize('menu.hr');

        $data = $request->validate([
            'crew_id' => ['required', 'exists:crews,id'],
            'movement_date' => ['required', 'date'],
            'reason' => ['required', 'in:'.implode(',', CrewOffReason::values())],
            'vessel_id' => ['nullable', 'exists:vessels,id'],
            'recommendation_by' => ['nullable', 'in:nakhoda,kkm,management'],
            'replacement_crew_id' => ['nullable', 'exists:crews,id'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $crew = Crew::with('assignments')->findOrFail($data['crew_id']);
        $compliance = app(CrewComplianceService::class);

        $active = $crew->assignments()->where('status', 'aktif')->latest('id')->first();
        $rankSlug = CrewRank::fromLabel($active?->role ?? $crew->rank);
        $rankLabel = CrewRank::tryFrom($rankSlug)?->label() ?? ($active?->role ?? $crew->rank);

        if ($compliance->isOfficerRank($rankSlug)) {
            if (empty($data['replacement_crew_id'])) {
                return back()->withErrors(['replacement_crew_id' => 'Perwira wajib menyiapkan pengganti sebelum sign OFF (materi PROSEDUR ON: rekomendasi Nakhoda/KKM).']);
            }
            if (empty($data['recommendation_by'])) {
                return back()->withErrors(['recommendation_by' => 'Sign OFF perwira membutuhkan rekomendasi (Nakhoda / KKM / Management).']);
            }
        }

        $numbered = app(NumberingService::class)->next('OFF_CREW');
        $movementDate = \Carbon\Carbon::parse($data['movement_date']);
        $daysAhead = now()->startOfDay()->diffInDays($movementDate, false);
        $h7Note = ($daysAhead >= 0 && $daysAhead < 7)
            ? ' Catatan: efektif '.(int) $daysAhead.' hari lagi — di luar prosedur ajukan H-7.'
            : '';

        DB::transaction(function () use ($data, $crew, $rankLabel, $numbered, $movementDate) {
            $crew->assignments()->where('status', 'aktif')->get()->each(function ($a) use ($movementDate) {
                $a->update(['status' => 'berakhir', 'end_date' => $movementDate->toDateString()]);
            });

            $crew->update(['status' => $data['reason'] === CrewOffReason::Cuti->value ? 'cuti' : 'selesai']);

            CrewMovement::create([
                'crew_id' => $crew->id,
                'vessel_id' => $data['vessel_id'] ?? null,
                'type' => CrewMovementType::SignOff->value,
                'role' => $rankLabel,
                'movement_date' => $movementDate->toDateString(),
                'reason' => $data['reason'],
                'no_surat' => $numbered['number'],
                'recommendation_by' => $data['recommendation_by'] ?? null,
                'replacement_crew_id' => $data['replacement_crew_id'] ?? null,
                'notes' => $data['notes'] ?? null,
            ]);
        });

        AuditService::log('created', 'crew_movement', $crew->id, null, $data,
            "Sign OFF {$crew->name} — {$numbered['number']} (".CrewOffReason::from($data['reason'])->label().')');

        return back()->with('success', "Sign OFF {$crew->name} tercatat — surat {$numbered['number']}.{$h7Note}");
    }

    /** Sign ON: buka penempatan baru + warning kelengkapan sertifikat (bukan blokir). */
    public function signOn(Request $request)
    {
        Gate::authorize('menu.hr');

        $data = $request->validate([
            'crew_id' => ['required', 'exists:crews,id'],
            'vessel_id' => ['required', 'exists:vessels,id'],
            'role' => ['required', 'string', 'max:60'],
            'start_date' => ['required', 'date'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $crew = Crew::findOrFail($data['crew_id']);
        $compliance = app(CrewComplianceService::class);
        $slug = in_array($data['role'], CrewRank::values(), true)
            ? $data['role']
            : CrewRank::fromLabel($data['role']);
        $rankLabel = CrewRank::tryFrom($slug)?->label() ?? $data['role'];

        $gaps = $compliance->certificateGapsFor($crew, $slug);
        $book = $crew->certificates()->where('cert_type', 'buku_pelaut')->orderByDesc('expiry_date')->first();
        $bookOk = $book && $book->expiry_date && $book->expiry_date->isFuture();

        $warning = '';
        if ($gaps) {
            $warning .= ' PERINGATAN sertifikat belum lengkap: '.implode(', ', $gaps).'.';
        }
        if (! $bookOk) {
            $warning .= ' PERINGATAN buku pelaut belum tercatat / sudah kedaluwarsa.';
        }
        $warning .= $gaps || ! $bookOk ? ' Wajib dilengkapi sebelum kapal berangkat.' : '';

        DB::transaction(function () use ($data, $crew, $rankLabel) {
            $crew->assignments()->where('status', 'aktif')->get()->each(function ($a) use ($data) {
                $a->update(['status' => 'berakhir', 'end_date' => \Carbon\Carbon::parse($data['start_date'])->toDateString()]);
            });

            CrewAssignment::create([
                'crew_id' => $crew->id,
                'vessel_id' => $data['vessel_id'],
                'role' => $rankLabel,
                'start_date' => $data['start_date'],
                'status' => 'aktif',
            ]);

            $crew->update(['status' => 'aktif']);

            CrewMovement::create([
                'crew_id' => $crew->id,
                'vessel_id' => $data['vessel_id'],
                'type' => CrewMovementType::SignOn->value,
                'role' => $rankLabel,
                'movement_date' => $data['start_date'],
                'notes' => $data['notes'] ?? null,
            ]);
        });

        AuditService::log('created', 'crew_assignment', $crew->id, null, $data, "Sign ON {$crew->name}");

        return back()->with('success', "Sign ON {$crew->name} tercatat.{$warning}");
    }

    /** Mutasi kapal / jabatan: tutup penempatan lama + buka baru + surat BT-MI. */
    public function mutasiCrew(Request $request)
    {
        Gate::authorize('menu.hr');

        $data = $request->validate([
            'crew_id' => ['required', 'exists:crews,id'],
            'kind' => ['required', 'in:mutasi_kapal,mutasi_jabatan'],
            'vessel_id' => ['required_if:kind,mutasi_kapal', 'nullable', 'exists:vessels,id'],
            'role' => ['required', 'string', 'max:60'],
            'movement_date' => ['required', 'date'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        if ($data['kind'] === 'mutasi_kapal' && empty($data['vessel_id'])) {
            return back()->withErrors(['vessel_id' => 'Mutasi kapal membutuhkan kapal tujuan.']);
        }

        $crew = Crew::findOrFail($data['crew_id']);
        $slug = in_array($data['role'], CrewRank::values(), true)
            ? $data['role']
            : CrewRank::fromLabel($data['role']);
        $rankLabel = CrewRank::tryFrom($slug)?->label() ?? $data['role'];

        $current = $crew->assignments()->where('status', 'aktif')->latest('id')->first();
        $targetVesselId = $data['kind'] === 'mutasi_kapal'
            ? $data['vessel_id']
            : ($current?->vessel_id ?? $data['vessel_id'] ?? null);

        $numbered = app(NumberingService::class)->next('MUTASI_CREW');

        DB::transaction(function () use ($data, $crew, $rankLabel, $targetVesselId, $numbered, $slug) {
            $crew->assignments()->where('status', 'aktif')->get()->each(function ($a) use ($data) {
                $a->update(['status' => 'berakhir', 'end_date' => $data['movement_date']]);
            });

            if ($targetVesselId) {
                CrewAssignment::create([
                    'crew_id' => $crew->id,
                    'vessel_id' => $targetVesselId,
                    'role' => $rankLabel,
                    'start_date' => $data['movement_date'],
                    'status' => 'aktif',
                ]);
            }

            if ($data['kind'] === 'mutasi_jabatan') {
                $crew->update(['rank' => $slug, 'status' => 'aktif']);
            }

            CrewMovement::create([
                'crew_id' => $crew->id,
                'vessel_id' => $targetVesselId,
                'type' => $data['kind'],
                'role' => $rankLabel,
                'movement_date' => $data['movement_date'],
                'no_surat' => $numbered['number'],
                'notes' => $data['notes'] ?? null,
            ]);
        });

        AuditService::log('created', 'crew_movement', $crew->id, null, $data,
            ucfirst(str_replace('_', ' ', $data['kind']))." {$crew->name} — {$numbered['number']}");

        return back()->with('success', ($data['kind'] === 'mutasi_kapal' ? 'Mutasi kapal' : 'Mutasi jabatan')." {$crew->name} tercatat — surat {$numbered['number']}.");
    }

    /** Kadet ON (Prala) / OFF (selesai PK) + nomor surat. */
    public function kadetMovement(Request $request, string $kind)
    {
        Gate::authorize('menu.hr');

        abort_unless(in_array($kind, ['on', 'off'], true), 404);

        $data = $request->validate([
            'crew_id' => ['required', 'exists:crews,id'],
            'vessel_id' => [$kind === 'on' ? 'required' : 'nullable', 'nullable', 'exists:vessels,id'],
            'movement_date' => ['required', 'date'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $crew = Crew::findOrFail($data['crew_id']);
        $rankLabel = CrewRank::tryFrom($crew->rank)?->label() ?? $crew->rank;

        $current = $crew->assignments()->where('status', 'aktif')->latest('id')->first();
        $targetVesselId = $data['vessel_id'] ?? $current?->vessel_id ?? null;
        $numbered = app(NumberingService::class)->next($kind === 'on' ? 'KADET_ON' : 'KADET_OFF');

        DB::transaction(function () use ($data, $crew, $rankLabel, $targetVesselId, $numbered, $kind) {
            $crew->assignments()->where('status', 'aktif')->get()->each(function ($a) use ($data, $kind) {
                $a->update(['status' => 'berakhir', 'end_date' => $kind === 'off' ? $data['movement_date'] : $data['movement_date']]);
            });

            if ($kind === 'on' && $targetVesselId) {
                CrewAssignment::create([
                    'crew_id' => $crew->id,
                    'vessel_id' => $targetVesselId,
                    'role' => $rankLabel,
                    'start_date' => $data['movement_date'],
                    'status' => 'aktif',
                ]);
            }

            $crew->update(['status' => $kind === 'on' ? 'aktif' : 'selesai']);

            CrewMovement::create([
                'crew_id' => $crew->id,
                'vessel_id' => $targetVesselId,
                'type' => $kind === 'on' ? CrewMovementType::KadetOn->value : CrewMovementType::KadetOff->value,
                'role' => $rankLabel,
                'movement_date' => $data['movement_date'],
                'no_surat' => $numbered['number'],
                'notes' => $data['notes'] ?? null,
            ]);
        });

        $label = $kind === 'on' ? 'ON (Prala)' : 'OFF (selesai PK)';
        AuditService::log('created', 'crew_movement', $crew->id, null, $data,
            "Kadet {$label}: {$crew->name} — {$numbered['number']}");

        return back()->with('success', "Kadet {$label} {$crew->name} tercatat — surat {$numbered['number']}.");
    }

    /** Surat Permohonan Sijil ON/OFF multi-crew ke Kesyahbandaran Kelas I Samarinda. */
    public function storeSijil(Request $request)
    {
        Gate::authorize('menu.hr');

        $data = $request->validate([
            'vessel_id' => ['required', 'exists:vessels,id'],
            'kind' => ['required', 'in:on,off'],
            'crew_ids' => ['required', 'array', 'min:1'],
            'crew_ids.*' => ['exists:crews,id'],
            'letter_date' => ['required', 'date'],
            'signed_by' => ['nullable', 'string', 'max:120'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $numbered = app(NumberingService::class)->next('SIJIL_ON');

        $sijil = SijilRequest::create([
            'no_surat' => $numbered['number'],
            'letter_date' => $data['letter_date'],
            'kind' => $data['kind'],
            'vessel_id' => $data['vessel_id'],
            'crew_ids' => $data['crew_ids'],
            'signed_by' => $data['signed_by'] ?? 'Capt Azwar Saputra',
            'status' => 'draft',
            'notes' => $data['notes'] ?? null,
        ]);

        AuditService::log('created', 'sijil_request', $sijil->id, null, $data,
            'Permohonan sijil '.strtoupper($data['kind'])." {$numbered['number']} (".count($data['crew_ids']).' awak)');

        return back()->with('success', 'Permohonan sijil '.strtoupper($data['kind'])." {$numbered['number']} tercatat (".count($data['crew_ids']).' awak) — cetak suratnya dari tab Register.');
    }

    /** Cetak Crew List per kapal (format materi). */
    public function printCrewList(\App\Models\Vessel $vessel)
    {
        Gate::authorize('menu.hr');

        $result = app(DocumentGeneratorService::class)->generateCrewList($vessel);

        return \Illuminate\Support\Facades\Storage::disk('local')->download(
            $result['path'],
            preg_replace('/[^A-Za-z0-9._-]+/', '_', 'Crew List '.$vessel->vessel_name).'.pdf'
        );
    }

    // ------------------------------------------------------------------
    // Hours of Rest (MLC 2006 / SOLAS XI/1)
    // ------------------------------------------------------------------

    /** Catat/ubah jam istirahat awak. client_uuid = idempotensi outbox offline. */
    public function storeHor(Request $request)
    {
        Gate::authorize('hor.manage');

        $data = $request->validate([
            'crew_id' => ['required', 'exists:crews,id'],
            'voyage_id' => ['nullable', 'exists:voyages,id'],
            'log_date' => ['required', 'date'],
            'rest_entries' => ['required', 'array', 'min:1', 'max:6'],
            'rest_entries.*.start' => ['required', 'date_format:H:i'],
            'rest_entries.*.end' => ['required', 'date_format:H:i'],
            'notes' => ['nullable', 'string', 'max:500'],
            'client_uuid' => ['nullable', 'string', 'max:36'],
        ]);

        $evaluation = app(HoursOfRestService::class)->evaluateDay($data['rest_entries']);

        $existing = ! empty($data['client_uuid'])
            ? HoursOfRestLog::where('client_uuid', $data['client_uuid'])->first()
            : HoursOfRestLog::where('crew_id', $data['crew_id'])->where('log_date', $data['log_date'])->first();

        $log = $existing ?? new HoursOfRestLog(['client_uuid' => $data['client_uuid'] ?? null]);
        $log->forceFill([
            'crew_id' => $data['crew_id'],
            'voyage_id' => $data['voyage_id'] ?? null,
            'log_date' => $data['log_date'],
            'rest_entries' => $data['rest_entries'],
            'total_rest_minutes' => $evaluation['rest'],
            'total_work_minutes' => $evaluation['work'],
            'is_compliant' => $evaluation['compliant'],
            'violations' => $evaluation['violations'],
            'entered_by' => auth()->id(),
            'synced_at' => now(),
            'device_occurred_at' => $log->device_occurred_at ?? now(),
            'notes' => $data['notes'] ?? null,
        ])->save();

        AuditService::log(
            $existing ? 'updated' : 'created',
            'hours_of_rest',
            $log->id,
            null,
            ['crew_id' => $log->crew_id, 'log_date' => $log->log_date->toDateString(), 'rest_minutes' => $log->total_rest_minutes],
            'Jam istirahat awak '.($existing ? 'diperbarui' : 'dicatat').' — '.($evaluation['compliant'] ? 'patuh WLR' : 'LANGGAR: '.implode(', ', $evaluation['violations']))
        );

        return back()->with(
            'success',
            $evaluation['compliant']
                ? 'Jam istirahat tercatat — patuh WLR ('.round($evaluation['rest'] / 60, 1).' jam istirahat).'
                : 'Tercatat, tapi LANGGAR WLR: '.implode(', ', $evaluation['violations']).'.'
        );
    }

    public function updateHor(Request $request, HoursOfRestLog $log)
    {
        Gate::authorize('hor.manage');

        $data = $request->validate([
            'crew_id' => ['required', 'exists:crews,id'],
            'voyage_id' => ['nullable', 'exists:voyages,id'],
            'log_date' => ['required', 'date'],
            'rest_entries' => ['required', 'array', 'min:1', 'max:6'],
            'rest_entries.*.start' => ['required', 'date_format:H:i'],
            'rest_entries.*.end' => ['required', 'date_format:H:i'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $evaluation = app(HoursOfRestService::class)->evaluateDay($data['rest_entries']);
        $before = $log->only(['total_rest_minutes', 'is_compliant', 'violations']);

        $log->forceFill([
            'crew_id' => $data['crew_id'],
            'voyage_id' => $data['voyage_id'] ?? null,
            'log_date' => $data['log_date'],
            'rest_entries' => $data['rest_entries'],
            'total_rest_minutes' => $evaluation['rest'],
            'total_work_minutes' => $evaluation['work'],
            'is_compliant' => $evaluation['compliant'],
            'violations' => $evaluation['violations'],
            'notes' => $data['notes'] ?? null,
        ])->save();

        AuditService::log('updated', 'hours_of_rest', $log->id, $before,
            $log->only(['total_rest_minutes', 'is_compliant', 'violations']),
            'Jam istirahat diperbarui — '.($evaluation['compliant'] ? 'patuh WLR' : 'LANGGAR: '.implode(', ', $evaluation['violations'])));

        return back()->with('success', 'Jam istirahat '.($log->log_date->toDateString()).' diperbarui.');
    }

    public function deleteHor(HoursOfRestLog $log)
    {
        Gate::authorize('hor.manage');

        $log->delete();
        AuditService::log('deleted', 'hours_of_rest', $log->id, null, null,
            'Catatan jam istirahat dihapus (soft delete): '.$log->log_date->toDateString());

        return back()->with('success', 'Catatan jam istirahat dihapus.');
    }

    /** Register jam istirahat 1 bulan utk awak — cetak inspeksi PSC (laporan, tanpa nomor). */
    public function printHorRegister(Request $request, Crew $crew)
    {
        Gate::authorize('hor.view');

        $monthInput = $request->string('month')->toString();
        $month = preg_match('/^\d{4}-\d{2}$/', $monthInput) ? $monthInput : now()->format('Y-m');

        $result = app(DocumentGeneratorService::class)->generateHorRegister($crew, $month);

        return \Illuminate\Support\Facades\Storage::disk('local')->download(
            $result['path'],
            preg_replace('/[^A-Za-z0-9._-]+/', '_', 'Hours of Rest '.$crew->name.'-'.$month).'.pdf'
        );
    }
}
