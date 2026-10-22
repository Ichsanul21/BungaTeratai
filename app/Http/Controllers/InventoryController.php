<?php

namespace App\Http\Controllers;

use App\Models\InventoryBalance;
use App\Models\InventoryBatch;
use App\Models\InventoryItem;
use App\Models\InventoryMovement;
use App\Services\AuditService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class InventoryController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('menu.inventory');

        $tab = $request->string('tab')->toString() ?: 'kantor';
        $vesselId = $request->integer('vessel_id');

        $items = InventoryItem::orderBy('name')->get()->map(function (InventoryItem $item) use ($tab, $vesselId) {
            $balance = InventoryBalance::where('item_id', $item->id)
                ->when($tab === 'kantor', fn ($q) => $q->where('location_type', 'kantor'))
                ->when($tab === 'kapal' && $vesselId, fn ($q) => $q->where('location_type', 'vessel')->where('vessel_id', $vesselId))
                ->sum('qty');

            return [
                'id' => $item->id,
                'sku' => $item->sku,
                'name' => $item->name,
                'category' => $item->category,
                'unit' => $item->unit,
                'unit_price' => $item->unit_price,
                'is_consumable' => $item->is_consumable,
                'is_perishable' => $item->is_perishable,
                'min_stock' => $item->min_stock,
                'qty' => (float) $balance,
                'stok_kantor' => (float) InventoryBalance::where('item_id', $item->id)->where('location_type', 'kantor')->sum('qty'),
                'nilai' => (float) $balance * (float) $item->unit_price,
            ];
        });

        $expiringBatches = InventoryBatch::with('item')
            ->whereNotNull('expires_at')
            ->whereDate('expires_at', '<=', now()->addDays(60)->toDateString())
            ->where('qty', '>', 0)
            ->orderBy('expires_at')
            ->get()
            ->map(fn ($b) => [
                'id' => $b->id,
                'item_name' => $b->item?->name,
                'batch_no' => $b->batch_no,
                'location' => $b->location_type === 'vessel' ? ($b->vessel?->vessel_name ?? 'Kapal') : 'Kantor',
                'qty' => $b->qty,
                'expires_at' => $b->expires_at,
                'is_expired' => $b->expires_at->isPast(),
            ]);

        $lowStock = $items->filter(fn ($i) => $i['qty'] > 0 && $i['qty'] < $i['min_stock'])
            ->values();

        return Inertia::render('Inventory/Index', [
            'tab' => $tab,
            'vesselId' => $vesselId,
            'items' => $items,
            'vessels' => \App\Models\Vessel::orderBy('vessel_name')->get(['id', 'vessel_name']),
            'expiringBatches' => $expiringBatches,
            'lowStock' => $lowStock,
            'movements' => InventoryMovement::with(['item', 'user'])
                ->orderByDesc('movement_date')->orderByDesc('id')->limit(40)->get()
                ->map(fn ($m) => [
                    'id' => $m->id,
                    'item_name' => $m->item?->name,
                    'type' => $m->type,
                    'qty' => $m->qty,
                    'from_location' => $m->from_location,
                    'to_location' => $m->to_location,
                    'ref_type' => $m->ref_type,
                    'movement_date' => $m->movement_date,
                    'user_name' => $m->user?->name,
                    'notes' => $m->notes,
                ]),
            'canManage' => auth()->user()?->can('operations.manage') ?? false,
        ]);
    }

    public function storeItem(Request $request)
    {
        Gate::authorize('operations.manage');

        $data = $request->validate([
            'sku' => ['required', 'string', 'max:40', 'unique:inventory_items,sku'],
            'name' => ['required', 'string', 'max:120'],
            'category' => ['required', 'in:sparepart,habis_pakai,konsumsi,ppe'],
            'unit' => ['required', 'string', 'max:20'],
            'unit_price' => ['nullable', 'numeric', 'min:0'],
            'is_consumable' => ['nullable', 'boolean'],
            'is_perishable' => ['nullable', 'boolean'],
            'min_stock' => ['nullable', 'numeric', 'min:0'],
            'stok_awal' => ['nullable', 'numeric', 'min:0'],
        ]);

        $item = InventoryItem::create($data);

        if (($data['stok_awal'] ?? 0) > 0) {
            InventoryBalance::create([
                'item_id' => $item->id,
                'location_type' => 'kantor',
                'qty' => $data['stok_awal'],
            ]);
            InventoryMovement::create([
                'item_id' => $item->id,
                'type' => 'masuk',
                'qty' => $data['stok_awal'],
                'to_location' => 'kantor',
                'ref_type' => 'manual',
                'movement_date' => now()->toDateString(),
                'user_id' => auth()->id(),
                'notes' => 'Stok awal',
            ]);
        }

        AuditService::log('created', 'inventory_item', $item->id, null, $data, "Item baru: {$item->name}");

        return back()->with('success', "Item {$item->sku} ditambahkan.");
    }

    public function storeMovement(Request $request)
    {
        Gate::authorize('operations.manage');

        $data = $request->validate([
            'item_id' => ['required', 'exists:inventory_items,id'],
            'type' => ['required', 'in:masuk,keluar,transfer,penyesuaian'],
            'qty' => ['required', 'numeric', 'min:0.01'],
            'from_location' => ['nullable', 'string', 'max:80'],
            'to_location' => ['nullable', 'string', 'max:80'],
            'from_vessel_id' => ['nullable', 'exists:vessels,id'],
            'to_vessel_id' => ['nullable', 'exists:vessels,id'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        DB::transaction(function () use ($data) {
            $fromLoc = $this->resolveLocation($data['from_location'] ?? null, isset($data['from_vessel_id']) ? (int) $data['from_vessel_id'] : null);
            $toLoc = $this->resolveLocation($data['to_location'] ?? null, isset($data['to_vessel_id']) ? (int) $data['to_vessel_id'] : null);

            if ($data['type'] === 'keluar' || $data['type'] === 'transfer') {
                abort_unless($fromLoc, 422, 'Lokasi asal wajib.');
                $balance = InventoryBalance::where('item_id', $data['item_id'])
                    ->where('location_type', $fromLoc['location_type'])
                    ->when($fromLoc['vessel_id'], fn ($q) => $q->where('vessel_id', $fromLoc['vessel_id']))
                    ->when(! $fromLoc['vessel_id'], fn ($q) => $q->whereNull('vessel_id'))
                    ->lockForUpdate()
                    ->first();
                abort_unless($balance && (float) $balance->qty >= (float) $data['qty'], 422, 'Stok tidak mencukupi.');
                $balance->decrement('qty', $data['qty']);
            }

            if ($data['type'] === 'masuk' || $data['type'] === 'transfer') {
                abort_unless($toLoc, 422, 'Lokasi tujuan wajib.');
                $balance = InventoryBalance::where('item_id', $data['item_id'])
                    ->where('location_type', $toLoc['location_type'])
                    ->when($toLoc['vessel_id'], fn ($q) => $q->where('vessel_id', $toLoc['vessel_id']))
                    ->when(! $toLoc['vessel_id'], fn ($q) => $q->whereNull('vessel_id'))
                    ->first();
                if (! $balance) {
                    $balance = InventoryBalance::create([
                        'item_id' => $data['item_id'],
                        'location_type' => $toLoc['location_type'],
                        'vessel_id' => $toLoc['vessel_id'],
                        'qty' => 0,
                    ]);
                }
                $balance->increment('qty', $data['qty']);
            }

            InventoryMovement::create([
                'item_id' => $data['item_id'],
                'type' => $data['type'],
                'qty' => $data['qty'],
                'from_location' => $fromLoc ? ($fromLoc['location_type'] === 'kantor' ? 'kantor' : 'kapal:'.$fromLoc['vessel_id']) : null,
                'to_location' => $toLoc ? ($toLoc['location_type'] === 'kantor' ? 'kantor' : 'kapal:'.$toLoc['vessel_id']) : null,
                'ref_type' => 'manual',
                'movement_date' => now()->toDateString(),
                'user_id' => auth()->id(),
                'notes' => $data['notes'] ?? null,
            ]);
        });

        return back()->with('success', 'Mutasi stok tercatat.');
    }

    private function resolveLocation(?string $loc, ?int $vesselId): ?array
    {
        if ($loc === 'kantor') {
            return ['location_type' => 'kantor', 'vessel_id' => null];
        }
        if ($loc === 'kapal' && $vesselId) {
            return ['location_type' => 'vessel', 'vessel_id' => $vesselId];
        }

        return null;
    }

    private function balanceWhere(array $loc): array
    {
        return [
            'location_type' => $loc['location_type'],
            'vessel_id' => $loc['vessel_id'],
        ];
    }

    // ===== CRUD tambahan (Fase A) =====

    public function updateItem(Request $request, InventoryItem $item)
    {
        Gate::authorize('operations.manage');

        $data = $request->validate([
            'sku' => ['required', 'string', 'max:40', Rule::unique('inventory_items', 'sku')->ignore($item->id)],
            'name' => ['required', 'string', 'max:120'],
            'category' => ['required', 'in:sparepart,habis_pakai,konsumsi,ppe'],
            'unit' => ['required', 'string', 'max:20'],
            'unit_price' => ['nullable', 'numeric', 'min:0'],
            'is_consumable' => ['nullable', 'boolean'],
            'is_perishable' => ['nullable', 'boolean'],
            'min_stock' => ['nullable', 'numeric', 'min:0'],
        ]);

        $before = $item->only(['sku', 'name', 'category', 'unit', 'unit_price', 'min_stock']);
        $item->update($data);

        AuditService::log('updated', 'inventory_item', $item->id, $before, $data, "Item diperbarui: {$item->sku}");

        return back()->with('success', "Item {$item->sku} diperbarui.");
    }

    public function deleteItem(InventoryItem $item)
    {
        Gate::authorize('operations.manage');

        $hasStock = InventoryBalance::where('item_id', $item->id)->sum('qty');
        if ($hasStock > 0) {
            return back()->with('error', 'Item masih memiliki stok ('.number_format($hasStock, 0).' unit). Kosongkan stok via mutasi sebelum menghapus.');
        }

        AuditService::log('deleted', 'inventory_item', $item->id, $item->toArray(), null, "Item dihapus (soft): {$item->sku}");
        $item->delete();

        return back()->with('success', "Item {$item->sku} dihapus.");
    }

    /** Edit manual movement: efek lama dibalik, efek baru diterapkan. */
    public function updateMovement(Request $request, InventoryMovement $movement)
    {
        Gate::authorize('operations.manage');

        abort_unless($movement->ref_type === 'manual', 403, 'Mutasi referensi sistem tidak dapat diedit.');

        $data = $request->validate([
            'type' => ['required', 'in:masuk,keluar,transfer,penyesuaian'],
            'qty' => ['required', 'numeric', 'min:0.01'],
            'from_location' => ['nullable', 'string', 'max:80'],
            'to_location' => ['nullable', 'string', 'max:80'],
            'from_vessel_id' => ['nullable', 'integer'],
            'to_vessel_id' => ['nullable', 'integer'],
            'notes' => ['nullable', 'string', 'max:500'],
            'movement_date' => ['required', 'date'],
        ]);

        $fromLoc = $this->resolveLocation($data['from_location'] ?? null, isset($data['from_vessel_id']) ? (int) $data['from_vessel_id'] : null);
        $toLoc = $this->resolveLocation($data['to_location'] ?? null, isset($data['to_vessel_id']) ? (int) $data['to_vessel_id'] : null);

        DB::transaction(function () use ($movement, $data, $fromLoc, $toLoc) {
            // 1. Balikkan efek lama
            $this->reverseMovementEffect($movement);

            // 2. Validasi stok utk efek baru
            if (in_array($data['type'], ['keluar', 'transfer'], true)) {
                abort_unless($fromLoc, 422, 'Lokasi asal wajib.');
                $bal = $this->findBalance($movement->item_id, $fromLoc);
                abort_unless($bal && (float) $bal->qty >= (float) $data['qty'], 422, 'Stok tidak mencukupi untuk nilai baru.');
            }
            if (in_array($data['type'], ['masuk', 'transfer'], true)) {
                abort_unless($toLoc, 422, 'Lokasi tujuan wajib.');
            }

            // 3. Simpan nilai baru + terapkan efek
            $movement->update([
                'type' => $data['type'],
                'qty' => $data['qty'],
                'from_location' => $fromLoc ? ($fromLoc['location_type'] === 'kantor' ? 'kantor' : 'kapal:'.$fromLoc['vessel_id']) : null,
                'to_location' => $toLoc ? ($toLoc['location_type'] === 'kantor' ? 'kantor' : 'kapal:'.$toLoc['vessel_id']) : null,
                'notes' => $data['notes'] ?? null,
                'movement_date' => $data['movement_date'],
            ]);
            $this->applyMovementEffect($movement, $fromLoc, $toLoc);
        });

        AuditService::log('movement_updated', 'inventory_item', $movement->item_id, null, $data, 'Mutasi stok diedit (efek disesuaikan)');

        return back()->with('success', 'Mutasi stok diperbarui & saldo disesuaikan.');
    }

    public function deleteMovement(InventoryMovement $movement)
    {
        Gate::authorize('operations.manage');

        abort_unless($movement->ref_type === 'manual', 403, 'Mutasi referensi sistem tidak dapat dihapus (jejak transaksi).');

        DB::transaction(function () use ($movement) {
            $this->reverseMovementEffect($movement);
            $movement->delete();
        });

        AuditService::log('movement_deleted', 'inventory_item', $movement->item_id, null, null, 'Mutasi manual dihapus (saldo dibalikkan)');

        return back()->with('success', 'Mutasi dihapus & saldo dibalikkan.');
    }

    public function storeBatch(Request $request)
    {
        Gate::authorize('operations.manage');

        $data = $request->validate([
            'item_id' => ['required', 'exists:inventory_items,id'],
            'location_type' => ['required', 'in:kantor,vessel'],
            'vessel_id' => ['nullable', 'exists:vessels,id'],
            'batch_no' => ['required', 'string', 'max:60'],
            'qty' => ['required', 'numeric', 'min:0.01'],
            'expires_at' => ['nullable', 'date'],
        ]);

        if ($data['location_type'] === 'vessel' && empty($data['vessel_id'])) {
            return back()->withErrors(['vessel_id' => 'Kapal wajib dipilih untuk batch di kapal.']);
        }

        InventoryBatch::create([...$data, 'vessel_id' => $data['vessel_id'] ?? null]);

        return back()->with('success', 'Batch stok tersimpan.');
    }

    public function updateBatch(Request $request, InventoryBatch $batch)
    {
        Gate::authorize('operations.manage');

        $data = $request->validate([
            'batch_no' => ['required', 'string', 'max:60'],
            'qty' => ['required', 'numeric', 'min:0'],
            'expires_at' => ['nullable', 'date'],
        ]);

        $before = $batch->only(['batch_no', 'qty', 'expires_at']);
        $batch->update($data);

        AuditService::log('updated', 'inventory_batch', $batch->id, $before, $data, 'Batch stok diperbarui');

        return back()->with('success', 'Batch diperbarui.');
    }

    public function deleteBatch(InventoryBatch $batch)
    {
        Gate::authorize('operations.manage');

        AuditService::log('deleted', 'inventory_batch', $batch->id, $batch->toArray(), null, 'Batch dihapus');
        $batch->delete();

        return back()->with('success', 'Batch dihapus.');
    }

    private function findBalance(int $itemId, array $loc): ?InventoryBalance
    {
        return InventoryBalance::where('item_id', $itemId)
            ->where('location_type', $loc['location_type'])
            ->when($loc['vessel_id'], fn ($q) => $q->where('vessel_id', $loc['vessel_id']))
            ->when(! $loc['vessel_id'], fn ($q) => $q->whereNull('vessel_id'))
            ->lockForUpdate()
            ->first();
    }

    /** Balikkan efek sebuah mutasi terhadap saldo. */
    private function reverseMovementEffect(InventoryMovement $m): void
    {
        $from = $this->parseLocation($m->from_location);
        $to = $this->parseLocation($m->to_location);
        if ($from) {
            $this->adjustBalance($m->item_id, $from, $m->qty);   // tambah kembali ke asal
        }
        if ($to) {
            $this->adjustBalance($m->item_id, $to, -$m->qty);    // kurangi dari tujuan
        }
    }

    /** Terapkan efek sebuah mutasi terhadap saldo. */
    private function applyMovementEffect(InventoryMovement $m, ?array $fromLoc, ?array $toLoc): void
    {
        if ($fromLoc) {
            $this->adjustBalance($m->item_id, $fromLoc, -$m->qty);
        }
        if ($toLoc) {
            $this->adjustBalance($m->item_id, $toLoc, $m->qty);
        }
    }

    private function parseLocation(?string $raw): ?array
    {
        if (! $raw) {
            return null;
        }
        if ($raw === 'kantor') {
            return ['location_type' => 'kantor', 'vessel_id' => null];
        }
        if (str_starts_with($raw, 'kapal:')) {
            return ['location_type' => 'vessel', 'vessel_id' => (int) substr($raw, 6)];
        }
        if ($raw === 'kapal') {
            return null;
        }
        // Lokasi lama ("kantor"/teks bebas) → anggap kantor
        return ['location_type' => 'kantor', 'vessel_id' => null];
    }

    private function adjustBalance(int $itemId, array $loc, float $delta): void
    {
        $balance = InventoryBalance::where('item_id', $itemId)
            ->where('location_type', $loc['location_type'])
            ->when($loc['vessel_id'], fn ($q) => $q->where('vessel_id', $loc['vessel_id']))
            ->when(! $loc['vessel_id'], fn ($q) => $q->whereNull('vessel_id'))
            ->first();

        if (! $balance) {
            $balance = InventoryBalance::create([
                'item_id' => $itemId,
                'location_type' => $loc['location_type'],
                'vessel_id' => $loc['vessel_id'],
                'qty' => 0,
            ]);
        }

        $newQty = (float) $balance->qty + $delta;
        if ($newQty < -0.0001) {
            abort(422, 'Saldo menjadi negatif — periksa mutasi stok.');
        }
        $balance->update(['qty' => max(0, $newQty)]);
    }
}
