# Plan Perbaikan UI: Armada Create & Detail Perjalanan Overview

## Ringkasan Masalah

### 1. **Armada/Create - Jenis Kapal Cards**
- **Problem**: Button selected (type="primary") punya background maroon, tapi text color hardcoded hitam/abu-abu
- **Result**: Text tidak terlihat (kontras buruk)
- **Location**: `resources/js/Pages/Fleet/VesselForm.tsx` line 191-212

### 2. **Detail Perjalanan - Tab Overview Status**
- **Problem**: Ant Design `Steps` component menampilkan 11 status horizontal, terlihat crowded dan berantakan
- **Result**: UI/UX tidak optimal, alignment teks buruk
- **Location**: `resources/js/Pages/Voyages/Show.tsx` line 273-352

---

## Solusi Detail

### Fix 1: Vessel Type Selection Cards

**File**: `resources/js/Pages/Fleet/VesselForm.tsx`

**Changes**:
1. **Conditional styling** untuk selected vs unselected state
2. **Improved layout** dengan spacing yang lebih baik
3. **Better visual hierarchy** dengan icon, title, dan description

**Implementation Details**:

```tsx
// Line 191-212: Replace existing vessel type buttons
<Form.Item label="Jenis Kapal" name="vessel_type" required>
    <Row gutter={[12, 12]}>
        {VESSEL_TYPES.map((t) => {
            const isSelected = data.vessel_type === t.value;
            const Icon = t.icon;
            
            return (
                <Col xs={24} sm={12} key={t.value}>
                    <button
                        type="button"
                        onClick={() => {
                            setData('vessel_type', t.value);
                            if (t.value !== 'lainnya') setData('vessel_type_custom', '');
                        }}
                        className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
                            isSelected
                                ? 'border-[#C1121F] bg-[#C1121F]/5 shadow-sm'
                                : 'border-[#E7E1D9] bg-white hover:border-[#C1121F]/40 hover:shadow-sm'
                        }`}
                    >
                        <div className="flex items-start gap-3">
                            <div
                                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                                    isSelected ? 'bg-[#C1121F] text-white' : 'bg-[#FAF7F2] text-[#8A8580]'
                                }`}
                            >
                                <Icon size={20} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className={`text-sm font-semibold ${isSelected ? 'text-[#C1121F]' : 'text-[#1C1B1A]'}`}>
                                    {t.label}
                                </div>
                                <div className="mt-0.5 text-xs text-[#8A8580] leading-relaxed">
                                    {t.desc}
                                </div>
                            </div>
                            {isSelected && (
                                <CheckCircle2 size={18} className="shrink-0 text-[#C1121F]" />
                            )}
                        </div>
                    </button>
                </Col>
            );
        })}
    </Row>
</Form.Item>
```

**Key Improvements**:
- ✅ Custom button dengan full control over styling
- ✅ Selected state: maroon border + light maroon background + maroon text
- ✅ Unselected state: neutral border + white background
- ✅ Icon box dengan background yang berubah sesuai state
- ✅ Check icon di pojok kanan atas saat selected
- ✅ Better spacing dan visual hierarchy

---

### Fix 2: Navigation Type Selection (Bonus)

**File**: `resources/js/Pages/Fleet/VesselForm.tsx`

**Changes**: Apply same pattern untuk navigation type (line 225-244)

```tsx
// Line 225-244: Replace existing navigation type buttons
<Form.Item label="Tipe Navigasi" name="navigation_type" required>
    <Row gutter={[12, 12]}>
        {NAVIGATION_TYPES.map((n) => {
            const isSelected = data.navigation_type === n.value;
            const Icon = n.icon;
            
            return (
                <Col xs={24} sm={8} key={n.value}>
                    <button
                        type="button"
                        onClick={() => setData('navigation_type', n.value)}
                        className={`w-full rounded-xl border-2 p-3 text-left transition-all ${
                            isSelected
                                ? 'border-[#C1121F] bg-[#C1121F]/5 shadow-sm'
                                : 'border-[#E7E1D9] bg-white hover:border-[#C1121F]/40 hover:shadow-sm'
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <div
                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                                    isSelected ? 'bg-[#C1121F] text-white' : 'bg-[#FAF7F2] text-[#8A8580]'
                                }`}
                            >
                                <Icon size={18} />
                            </div>
                            <span className={`text-sm font-semibold ${isSelected ? 'text-[#C1121F]' : 'text-[#1C1B1A]'}`}>
                                {n.label}
                            </span>
                            {isSelected && (
                                <CheckCircle2 size={16} className="ms-auto shrink-0 text-[#C1121F]" />
                            )}
                        </div>
                    </button>
                </Col>
            );
        })}
    </Row>
    <div className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-[#8A8580]">
        <Info size={12} aria-hidden="true" className="mt-0.5 shrink-0" />
        Menentukan otoritas wilayah dan template dokumen wajib kapal.
    </div>
</Form.Item>
```

---

### Fix 3: Voyage Status Tracker

**File**: `resources/js/Pages/Voyages/Show.tsx`

**Problem**: 11 steps horizontal = terlalu crowded

**Solution**: Ganti dengan vertical timeline yang lebih clean

**Implementation Details**:

```tsx
// Line 273-352: Replace "Status Perjalanan" card content
{tab === 'overview' && (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card title="Status Perjalanan" className="xl:col-span-2">
            {/* Current Status Badge - Large & Prominent */}
            <div className="mb-6 rounded-xl border-2 border-[#C1121F]/20 bg-gradient-to-br from-[#C1121F]/5 to-transparent p-5">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                        <Text type="secondary" className="text-xs uppercase tracking-wide">
                            Status Saat Ini
                        </Text>
                        <div className="mt-2 flex items-center gap-3">
                            <Badge tone={STATUS_TONES[voyage.voyage_status] ?? 'neutral'}>
                                <span className="text-base font-semibold">
                                    {VOYAGE_STATUS_LABELS[voyage.voyage_status] ?? voyage.voyage_status}
                                </span>
                            </Badge>
                        </div>
                    </div>
                    {actions.can_update && voyage.allowed_transitions.length > 0 && (
                        <Select
                            value={voyage.voyage_status}
                            onChange={(target) => {
                                if (target && target !== voyage.voyage_status) {
                                    setNextStatus(target);
                                    statusForm.setData({ to: target, note: '' });
                                    setModal('status');
                                }
                            }}
                            style={{ width: 200 }}
                            size="small"
                            options={[
                                { value: voyage.voyage_status, label: `${VOYAGE_STATUS_LABELS[voyage.voyage_status]} (Saat Ini)` },
                                ...(voyage.allowed_transitions ?? []).map((s: string) => ({
                                    value: s,
                                    label: `${isBackwardTransition(voyage.voyage_status, s) ? '← Mundur: ' : '→ '}${VOYAGE_STATUS_LABELS[s] ?? s}`,
                                })),
                            ]}
                        />
                    )}
                </div>
            </div>

            {/* Simplified Steps - Only Show Key Milestones */}
            <div className="mb-6">
                <Text type="secondary" className="mb-3 block text-xs font-semibold uppercase tracking-wide">
                    Progress Perjalanan
                </Text>
                <div className="relative">
                    {/* Progress Line */}
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-[#E7E1D9]" />
                    
                    {/* Steps */}
                    <div className="space-y-4">
                        {[
                            { status: 'planned', label: 'Direncanakan', icon: '📋' },
                            { status: 'document_preparation', label: 'Persiapan Dokumen', icon: '📄' },
                            { status: 'ready_for_departure', label: 'Siap Berangkat', icon: '✅' },
                            { status: 'departed', label: 'Berangkat', icon: '🚢' },
                            { status: 'in_transit', label: 'Dalam Pelayaran', icon: '🌊' },
                            { status: 'arrived', label: 'Tiba', icon: '⚓' },
                            { status: 'completed', label: 'Selesai', icon: '✓' },
                        ].map((step, idx) => {
                            const stepOrder = WORKFLOW_ORDER[step.status] ?? 0;
                            const currentOrder = WORKFLOW_ORDER[voyage.voyage_status] ?? 0;
                            const isCompleted = stepOrder <= currentOrder && currentOrder < 90;
                            const isCurrent = step.status === voyage.voyage_status;
                            
                            return (
                                <div key={step.status} className="relative flex items-start gap-4">
                                    {/* Dot */}
                                    <div
                                        className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${
                                            isCurrent
                                                ? 'border-[#C1121F] bg-[#C1121F] text-white'
                                                : isCompleted
                                                ? 'border-[#2F8F68] bg-[#2F8F68] text-white'
                                                : 'border-[#E7E1D9] bg-white text-[#8A8580]'
                                        }`}
                                    >
                                        <span className="text-sm">{step.icon}</span>
                                    </div>
                                    
                                    {/* Content */}
                                    <div className="flex-1 pt-1">
                                        <div
                                            className={`text-sm font-semibold ${
                                                isCurrent
                                                    ? 'text-[#C1121F]'
                                                    : isCompleted
                                                    ? 'text-[#1C1B1A]'
                                                    : 'text-[#8A8580]'
                                            }`}
                                        >
                                            {step.label}
                                        </div>
                                        {isCurrent && (
                                            <div className="mt-1 text-xs text-[#8A8580]">
                                                ← Status saat ini
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Schedule Info */}
            <Descriptions
                column={{ xs: 1, sm: 2, md: 4 }}
                size="small"
                className="mb-5"
                items={[
                    { key: 'planned_dep', label: 'Jadwal Berangkat', children: formatDateTime(voyage.planned_departure) },
                    { key: 'actual_dep', label: 'Berangkat Aktual', children: formatDateTime(voyage.actual_departure) },
                    { key: 'est_arr', label: 'Perkiraan Tiba', children: formatDateTime(voyage.estimated_arrival) },
                    { key: 'actual_arr', label: 'Tiba Aktual', children: formatDateTime(voyage.actual_arrival) },
                ]}
            />

            {/* Checklist Progress */}
            <div className="mb-4">
                <Text type="secondary" className="text-xs uppercase tracking-wide">Progres Checklist Wajib</Text>
                <div className="mt-1.5 flex items-center gap-3">
                    <Progress
                        percent={checklistPct}
                        size="small"
                        strokeColor={checklistTerpenuhi.length === checklistWajib.length && checklistWajib.length > 0 ? '#2F8F68' : '#D99A2B'}
                        className="flex-1"
                    />
                    <Text strong className="text-sm tabular-nums text-[#1C1B1A]">
                        {checklistTerpenuhi.length}/{checklistWajib.length}
                    </Text>
                </div>
            </div>

            {/* Disclaimer */}
            <div className="rounded-lg bg-[#1E4668]/5 p-2.5">
                <Text type="secondary" className="text-[11px]">
                    Status kesiapan adalah <strong>indikator internal sistem</strong> - bukan
                    pengganti penilaian nakhoda atau persetujuan otoritas pelayaran.
                </Text>
            </div>
        </Card>
        
        {/* Identitas Perjalanan Card - Keep as is */}
        <Card title="Identitas Perjalanan">
            <Descriptions
                column={1}
                size="small"
                items={[
                    { key: 'activity', label: 'Kegiatan', children: <span className="capitalize">{voyage.activity_type?.replace('_', ' ')}</span> },
                    { key: 'pic', label: 'PIC', children: voyage.person_in_charge },
                    { key: 'customer', label: 'Customer', children: voyage.customer_name ?? '-' },
                    { key: 'contract', label: 'No. Kontrak', children: voyage.contract_no ?? '-' },
                    { key: 'route', label: 'Tipe Rute', children: voyage.route_type },
                ]}
            />
        </Card>

        {/* Rest of overview content stays the same */}
    </div>
)}
```

**Key Improvements**:
- ✅ **Current status badge** - Large, prominent, di bagian atas
- ✅ **Simplified vertical timeline** - Hanya 7 milestone penting (bukan 11)
- ✅ **Visual progress indicator** - Dot dengan warna yang jelas (maroon = current, hijau = completed, abu-abu = pending)
- ✅ **Better spacing** - Lebih breathable dan tidak crowded
- ✅ **Clear hierarchy** - Status saat ini paling menonjol
- ✅ **Emoji icons** - Lebih visual dan mudah dikenali

---

## Testing Checklist

### Armada/Create
- [ ] Test di desktop (1920x1080)
- [ ] Test di tablet (768x1024)
- [ ] Test di mobile (375x667)
- [ ] Verify selected state (maroon border + light background)
- [ ] Verify unselected state (neutral border + white background)
- [ ] Verify text visibility di semua state
- [ ] Verify icon box color change
- [ ] Verify check icon muncul saat selected

### Detail Perjalanan Overview
- [ ] Test vertical timeline rendering
- [ ] Verify current status highlighted dengan maroon
- [ ] Verify completed steps dengan hijau
- [ ] Verify pending steps dengan abu-abu
- [ ] Verify status badge prominent di atas
- [ ] Verify dropdown untuk change status masih berfungsi
- [ ] Verify schedule info masih tampil
- [ ] Verify checklist progress bar masih berfungsi
- [ ] Test responsive di mobile

---

## Files yang Akan Dimodifikasi

1. `resources/js/Pages/Fleet/VesselForm.tsx` (Line 191-244)
   - Replace vessel type buttons
   - Replace navigation type buttons

2. `resources/js/Pages/Voyages/Show.tsx` (Line 273-352)
   - Replace Steps component dengan custom vertical timeline
   - Improve current status display

---

## Visual Design Principles

### Color Palette
- **Primary (Maroon)**: `#C1121F` - Selected state, current status
- **Success (Green)**: `#2F8F68` - Completed steps
- **Neutral**: `#E7E1D9` - Borders, pending state
- **Background**: `#FAF7F2` - Card backgrounds, icon boxes
- **Text**: `#1C1B1A` - Primary text, `#8A8580` - Secondary text

### Typography
- **Labels**: 12px, uppercase, tracking-wide, `#8A8580`
- **Titles**: 14px, semibold, `#1C1B1A`
- **Descriptions**: 12px, regular, `#8A8580`

### Spacing
- **Card padding**: 20px
- **Button padding**: 12-16px
- **Gap between items**: 12px
- **Section spacing**: 20-24px

---

## Expected Results

### Armada/Create
- ✅ Text terlihat jelas di semua state (selected/unselected)
- ✅ Visual hierarchy jelas dengan icon box dan check icon
- ✅ Consistent design dengan navigation type
- ✅ Better UX dengan clear feedback saat selection

### Detail Perjalanan Overview
- ✅ Status saat ini sangat prominent
- ✅ Progress timeline mudah dipahami
- ✅ Tidak crowded (7 steps vs 11 steps)
- ✅ Better visual hierarchy
- ✅ More intuitive UX

---

## Notes

- Tidak ada breaking changes
- Semua fungsi existing tetap intact
- Hanya perubahan visual/UI
- Responsive di semua device sizes
- Accessible (proper contrast ratios)
