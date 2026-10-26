import Badge from '@/Components/ui/Badge';
import NumericInput from '@/Components/NumericInput';
import SearchableSelect from '@/Components/SearchableSelect';
import { classNames, formatNumber } from '@/lib/format';
import { Link, useForm } from '@inertiajs/react';
import {
    AlertTriangle,
    Anchor,
    ArrowLeftRight,
    Boxes,
    CheckCircle2,
    Circle,
    Container,
    Droplets,
    Hash,
    Info,
    Loader2,
    MapPin,
    Ruler,
    Save,
    ShipWheel,
    UserRound,
    Waves,
    type LucideIcon,
} from 'lucide-react';
import { type FormEvent, type ReactNode } from 'react';

export interface VesselFormData {
    vessel_name: string;
    vessel_type: string;
    vessel_type_custom: string;
    navigation_type: string;
    registration_number: string;
    imo: string;
    mmsi: string;
    call_sign: string;
    year_built: string;
    length_m: string;
    beam_m: string;
    gt: string;
    dwt: string;
    capacity_value: string;
    capacity_unit: string;
    engine_spec: string;
    fuel_spec: string;
    fuel_baseline_lph: string;
    owner: string;
    operator: string;
    operational_status: string;
    base_location: string;
    notes: string;
}

// Nilai awal formulir tambah: jenis, navigasi, dan status sudah diberi
// pilihan paling umum supaya kapal bisa disimpan cepat; pemilik dan
// operator mengikuti nama badan usaha.
const EMPTY: VesselFormData = {
    vessel_name: '',
    vessel_type: 'tugboat',
    vessel_type_custom: '',
    navigation_type: 'laut',
    registration_number: '',
    imo: '',
    mmsi: '',
    call_sign: '',
    year_built: '',
    length_m: '',
    beam_m: '',
    gt: '',
    dwt: '',
    capacity_value: '',
    capacity_unit: '',
    engine_spec: '',
    fuel_spec: '',
    fuel_baseline_lph: '',
    owner: 'PT Bunga Teratai',
    operator: 'PT Bunga Teratai',
    operational_status: 'aktif',
    base_location: '',
    notes: '',
};

// Label map sama persis dengan registry armada dan detail kapal supaya
// pratinjau di rel kanan memakai kosakata yang identik.
const TYPE_LABELS: Record<string, string> = {
    tugboat: 'Tugboat',
    tongkang: 'Tongkang',
    kapal_penumpang: 'Kapal Penumpang',
    lainnya: 'Lainnya',
};

const NAV_LABELS: Record<string, string> = {
    laut: 'Laut',
    sungai_danau: 'Sungai / Danau',
    penyeberangan: 'Penyeberangan',
};

const STATUS_LABELS: Record<string, string> = {
    aktif: 'Aktif',
    dalam_perbaikan: 'Dalam Perbaikan',
    dock: 'Dock',
    mangkrak: 'Mangkrak',
};

// Nada lencana status pada kartu pratinjau, mengikuti bahasa warna
// registry armada: perbaikan kuning, dock dan mangkrak merah.
const STATUS_TONES: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
    aktif: 'success',
    dalam_perbaikan: 'warning',
    dock: 'danger',
    mangkrak: 'danger',
};

const UNIT_LABELS: Record<string, string> = {
    ton: 'Ton',
    penumpang: 'Penumpang',
};

// Kartu pilihan jenis kapal: teks penjelas singkat membuat pilihan
// menjelaskan dirinya sendiri tanpa perlu membuka kamus istilah.
const VESSEL_TYPES: Array<{
    value: string;
    label: string;
    desc: string;
    icon: LucideIcon;
}> = [
    {
        value: 'tugboat',
        label: 'Tugboat',
        desc: 'Kapal tunda untuk manuver dan pendampingan kapal besar.',
        icon: Anchor,
    },
    {
        value: 'tongkang',
        label: 'Tongkang',
        desc: 'Pengangkut kargo dan material tanpa penggerak sendiri.',
        icon: Container,
    },
    {
        value: 'kapal_penumpang',
        label: 'Kapal Penumpang',
        desc: 'Angkutan penumpang untuk rute reguler maupun charter.',
        icon: UserRound,
    },
    {
        value: 'lainnya',
        label: 'Lainnya',
        desc: 'Jenis kapal khusus di luar kategori utama.',
        icon: ShipWheel,
    },
];

const NAVIGATION_TYPES: Array<{
    value: string;
    label: string;
    icon: LucideIcon;
}> = [
    { value: 'laut', label: 'Laut', icon: Waves },
    { value: 'sungai_danau', label: 'Sungai / Danau', icon: Droplets },
    { value: 'penyeberangan', label: 'Penyeberangan', icon: ArrowLeftRight },
];

const EASE = 'cubic-bezier(0.22,1,0.36,1)';

// Dasar kontrol formulir: bingkai hairline + fokus merah lembut, senada
// dengan panel saringan registry dan halaman unggah dokumen. Versi tanpa
// mt-1 dipakai saat kontrol dibungkus (satuan menempel, satuan di ujung).
const INPUT_DASAR =
    'block w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm text-ink placeholder:text-muted/70 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20';
const INPUT_CLS = `mt-1 ${INPUT_DASAR}`;

// Tombol batal dan tombol utama: satu sumber kelas supaya aksi di halaman
// ini terasa seperti satu keluarga dengan halaman unggah dokumen.
const BTN_BATAL =
    'inline-flex items-center justify-center rounded-lg border border-hairline bg-white px-4 py-2 text-sm font-medium text-ink transition-colors duration-200 hover:bg-appbg disabled:opacity-50';
const BTN_UTAMA =
    'inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-primary-hover disabled:opacity-50';

// Label isian ringkas dengan penanda wajib merah utama. Label selalu
// terhubung ke kontrol lewat htmlFor agar fokus dan pembaca layar sampai.
function LabelIsian({
    wajib = false,
    htmlFor,
    children,
}: {
    wajib?: boolean;
    htmlFor?: string;
    children: ReactNode;
}) {
    return (
        <label htmlFor={htmlFor} className="block text-xs font-medium text-muted">
            {children}
            {wajib && <span className="ms-0.5 text-primary">*</span>}
        </label>
    );
}

// Pesan galat validasi per isian, memakai merah utama agar tetap pada
// palet aplikasi.
function Galat({ pesan }: { pesan?: string }) {
    if (!pesan) return null;
    return <p className="mt-1.5 text-xs font-medium text-primary">{pesan}</p>;
}

// Kartu pilihan untuk jenis kapal dan tipe navigasi: pilihan yang
// menjelaskan dirinya, terpilih ditandai bingkai merah dan centang.
function KartuPilih({
    aktif,
    label,
    desc,
    icon: Ikon,
    onPilih,
}: {
    aktif: boolean;
    label: string;
    desc?: string;
    icon: LucideIcon;
    onPilih: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onPilih}
            className={classNames(
                'flex items-center gap-3 rounded-xl border p-3 text-left transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
                aktif
                    ? 'border-primary/60 bg-primary-tint'
                    : 'border-hairline bg-white hover:border-primary/40',
            )}
        >
            <span
                aria-hidden="true"
                className={classNames(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors duration-200',
                    aktif
                        ? 'bg-primary text-white shadow-[0_8px_18px_-10px_rgba(193,18,31,0.5)]'
                        : 'bg-appbg text-muted',
                )}
            >
                <Ikon size={16} aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-ink">{label}</span>
                {desc && (
                    <span className="mt-0.5 block text-[11px] leading-snug text-muted">
                        {desc}
                    </span>
                )}
            </span>
            {aktif && (
                <CheckCircle2 size={15} aria-hidden="true" className="shrink-0 text-primary" />
            )}
        </button>
    );
}

// Cangkang seksi bernomor: angka mono di atas warna tint merah, judul,
// dan satu baris deskripsi; bentuknya sama persis dengan halaman unggah
// dokumen supaya semua formulir aplikasi terasa satu keluarga.
function SeksiBernomor({
    nomor,
    judul,
    deskripsi,
    jeda,
    children,
}: {
    nomor: string;
    judul: string;
    deskripsi: string;
    jeda: number;
    children: ReactNode;
}) {
    return (
        <section
            className="bt-anim rounded-2xl border border-hairline bg-white shadow-sm"
            style={{ animation: `bt-rise 0.45s ${EASE} ${jeda}ms both` }}
        >
            <header className="flex items-start gap-3.5 border-b border-hairline px-5 py-4 lg:px-6">
                <span
                    aria-hidden="true"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-tint font-mono text-xs font-semibold text-primary ring-1 ring-inset ring-primary-tintborder"
                >
                    {nomor}
                </span>
                <div className="min-w-0">
                    <h2 className="text-sm font-semibold text-ink">{judul}</h2>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted">{deskripsi}</p>
                </div>
            </header>
            {children}
        </section>
    );
}

export default function VesselForm({
    vessel,
    isEdit = false,
}: {
    vessel?: Record<string, any>;
    isEdit?: boolean;
}) {
    // Data awal: kosongan untuk tambah, gabungan nilai kapal untuk edit.
    // Nilai null dari server dikembalikan ke string kosong agar aman
    // dipakai kontrol terkendali.
    const awal: VesselFormData = { ...EMPTY };
    if (vessel) {
        (Object.keys(EMPTY) as Array<keyof VesselFormData>).forEach((kunci) => {
            awal[kunci] = vessel[kunci] == null ? EMPTY[kunci] : String(vessel[kunci]);
        });
    }

    const { data, setData, post, put, processing, errors } =
        useForm<VesselFormData>(awal);

    const submit = (e: FormEvent) => {
        e.preventDefault();
        if (isEdit && vessel) {
            put(`/armada/${vessel.id}`);
        } else {
            post('/armada');
        }
    };

    // ===== Turunan tampilan =====
    const terisi = (v: string) => v.trim() !== '';
    const namaSiap = terisi(data.vessel_name);

    // Kelompok data untuk kartu kelengkapan. Hanya nama yang wajib;
    // kelompok lain jujur diperlihatkan sebagai penguat profil kapal,
    // bukan syarat menyimpan.
    const kelompok: Array<{ label: string; wajib?: boolean; siap: boolean }> = [
        { label: 'Nama kapal', wajib: true, siap: namaSiap },
        { label: 'No. registrasi', siap: terisi(data.registration_number) },
        {
            label: 'Identifikasi radio',
            siap: terisi(data.imo) || terisi(data.mmsi) || terisi(data.call_sign),
        },
        {
            label: 'Dimensi & tonase',
            siap:
                terisi(data.length_m) ||
                terisi(data.beam_m) ||
                terisi(data.gt) ||
                terisi(data.dwt),
        },
        { label: 'Kapasitas angkut', siap: terisi(data.capacity_value) },
        {
            label: 'Mesin & BBM',
            siap:
                terisi(data.engine_spec) ||
                terisi(data.fuel_spec) ||
                terisi(data.fuel_baseline_lph),
        },
        { label: 'Pangkalan', siap: terisi(data.base_location) },
    ];
    const jumlahSiap = kelompok.filter((k) => k.siap).length;
    const pctSiap = Math.round((jumlahSiap / kelompok.length) * 100);
    const jumlahGalat = Object.keys(errors).length;
    const terkunci = processing || !namaSiap;
    const legacyTypeWithoutCustom =
        isEdit && vessel?.vessel_type === 'lainnya' && !vessel?.vessel_type_custom;

    // Isian untuk kartu pratinjau; teks kosong diberi kalimat pengganti
    // supaya kartu tidak pernah tampak setengah jadi.
    const IkonJenis =
        VESSEL_TYPES.find((t) => t.value === data.vessel_type)?.icon ?? Anchor;
    const labelJenis =
        data.vessel_type === 'lainnya' && data.vessel_type_custom
            ? data.vessel_type_custom
            : TYPE_LABELS[data.vessel_type] ?? data.vessel_type;
    const teksDimensi = [data.length_m, data.beam_m]
        .filter(terisi)
        .map((value) => formatNumber(Number(value), 2))
        .join(' × ');
    const teksTonase = [
        terisi(data.gt) ? `${formatNumber(Number(data.gt))} GT` : '',
        terisi(data.dwt) ? `${formatNumber(Number(data.dwt), 2)} DWT` : '',
    ]
        .filter(Boolean)
        .join(' · ');
    const teksKapasitas = terisi(data.capacity_value)
        ? [formatNumber(Number(data.capacity_value), 2), UNIT_LABELS[data.capacity_unit] ?? '']
              .filter(Boolean)
              .join(' ')
        : '';
    const urlBatal = isEdit && vessel ? `/armada/${vessel.id}` : '/armada';

    return (
        <form
            onSubmit={submit}
            className="grid grid-cols-1 items-start gap-5 xl:grid-cols-3"
        >
            {/* ===== Kolom utama: tiga seksi bernomor + baris aksi ===== */}
            <div className="min-w-0 space-y-5 xl:col-span-2">
                {/* ===== 01 · Identitas Kapal ===== */}
                <SeksiBernomor
                    nomor="01"
                    judul="Identitas Kapal"
                    deskripsi="Nama, jenis, wilayah operasi, dan status operasional kapal."
                    jeda={70}
                >
                    <div className="space-y-5 p-5 lg:p-6">
                        <div>
                            <LabelIsian htmlFor="vessel-name" wajib>
                                Nama Kapal
                            </LabelIsian>
                            <input
                                id="vessel-name"
                                value={data.vessel_name}
                                onChange={(e) => setData('vessel_name', e.target.value)}
                                placeholder="mis. TB Bunga Teratai 07"
                                className={INPUT_CLS}
                            />
                            <Galat pesan={errors.vessel_name} />
                        </div>

                        <div>
                            <LabelIsian wajib>Jenis Kapal</LabelIsian>
                            <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                {VESSEL_TYPES.map((t) => (
                                    <KartuPilih
                                        key={t.value}
                                        aktif={data.vessel_type === t.value}
                                        label={t.label}
                                        desc={t.desc}
                                        icon={t.icon}
                                        onPilih={() => {
                                            setData('vessel_type', t.value);
                                            if (t.value !== 'lainnya') setData('vessel_type_custom', '');
                                        }}
                                    />
                                ))}
                            </div>
                            <Galat pesan={errors.vessel_type} />
                            {data.vessel_type === 'lainnya' && (
                                <div className="mt-3">
                                    <LabelIsian
                                        htmlFor="vessel-type-custom"
                                        wajib={!legacyTypeWithoutCustom}
                                    >
                                        Sebutkan Jenis Kapal
                                    </LabelIsian>
                                    <input
                                        id="vessel-type-custom"
                                        value={data.vessel_type_custom}
                                        onChange={(e) => setData('vessel_type_custom', e.target.value)}
                                        placeholder="mis. Kapal Keruk"
                                        maxLength={60}
                                        required={!legacyTypeWithoutCustom}
                                        className={INPUT_CLS}
                                    />
                                    <Galat pesan={errors.vessel_type_custom} />
                                </div>
                            )}
                        </div>

                        <div>
                            <LabelIsian wajib>Tipe Navigasi</LabelIsian>
                            <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
                                {NAVIGATION_TYPES.map((n) => (
                                    <KartuPilih
                                        key={n.value}
                                        aktif={data.navigation_type === n.value}
                                        label={n.label}
                                        icon={n.icon}
                                        onPilih={() => setData('navigation_type', n.value)}
                                    />
                                ))}
                            </div>
                            <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-muted">
                                <Info
                                    size={12}
                                    aria-hidden="true"
                                    className="mt-0.5 shrink-0"
                                />
                                Menentukan otoritas wilayah dan template dokumen wajib
                                kapal.
                            </p>
                            <Galat pesan={errors.navigation_type} />
                        </div>

                        <div className="grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2">
                            <div>
                                <LabelIsian htmlFor="vessel-registration">
                                    No. Registrasi
                                </LabelIsian>
                                <input
                                    id="vessel-registration"
                                    value={data.registration_number}
                                    onChange={(e) =>
                                        setData('registration_number', e.target.value)
                                    }
                                    className={INPUT_CLS}
                                />
                                <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-muted">
                                    <Info
                                        size={12}
                                        aria-hidden="true"
                                        className="mt-0.5 shrink-0"
                                    />
                                    Nomor pada surat registrasi kapal bila sudah terbit.
                                </p>
                                <Galat pesan={errors.registration_number} />
                            </div>

                            <div>
                                <LabelIsian htmlFor="vessel-year">Tahun Pembuatan</LabelIsian>
                                <input
                                    id="vessel-year"
                                    value={data.year_built}
                                    onChange={(e) => setData('year_built', e.target.value)}
                                    placeholder="mis. 2015"
                                    inputMode="numeric"
                                    maxLength={4}
                                    className={INPUT_CLS}
                                />
                                <Galat pesan={errors.year_built} />
                            </div>

                            <div>
                                <LabelIsian htmlFor="vessel-imo">IMO</LabelIsian>
                                <input
                                    id="vessel-imo"
                                    value={data.imo}
                                    onChange={(e) => setData('imo', e.target.value)}
                                    placeholder="mis. 9123456"
                                    inputMode="numeric"
                                    className={INPUT_CLS}
                                />
                                <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-muted">
                                    <Info
                                        size={12}
                                        aria-hidden="true"
                                        className="mt-0.5 shrink-0"
                                    />
                                    7 digit, untuk kapal yang berlayar internasional.
                                </p>
                                <Galat pesan={errors.imo} />
                            </div>

                            <div>
                                <LabelIsian htmlFor="vessel-mmsi">MMSI</LabelIsian>
                                <input
                                    id="vessel-mmsi"
                                    value={data.mmsi}
                                    onChange={(e) => setData('mmsi', e.target.value)}
                                    placeholder="mis. 525012345"
                                    inputMode="numeric"
                                    className={INPUT_CLS}
                                />
                                <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-muted">
                                    <Info
                                        size={12}
                                        aria-hidden="true"
                                        className="mt-0.5 shrink-0"
                                    />
                                    9 digit identitas panggilan digital radio maritim.
                                </p>
                                <Galat pesan={errors.mmsi} />
                            </div>

                            <div>
                                <LabelIsian htmlFor="vessel-callsign">Call Sign</LabelIsian>
                                <input
                                    id="vessel-callsign"
                                    value={data.call_sign}
                                    onChange={(e) => setData('call_sign', e.target.value)}
                                    placeholder="mis. YB2AB"
                                    className={INPUT_CLS}
                                />
                                <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-muted">
                                    <Info
                                        size={12}
                                        aria-hidden="true"
                                        className="mt-0.5 shrink-0"
                                    />
                                    Nama panggilan radio untuk komunikasi pelayaran.
                                </p>
                                <Galat pesan={errors.call_sign} />
                            </div>

                            <div>
                                <LabelIsian htmlFor="vessel-status" wajib>
                                    Status Operasional
                                </LabelIsian>
                                <SearchableSelect
                                    value={data.operational_status}
                                    options={Object.entries(STATUS_LABELS).map(([value, label]) => ({
                                        value,
                                        label,
                                    }))}
                                    onChange={(value) => setData('operational_status', value)}
                                    required
                                />
                                <Galat pesan={errors.operational_status} />
                            </div>
                        </div>
                    </div>
                </SeksiBernomor>

                {/* ===== 02 · Spesifikasi & Kapasitas ===== */}
                <SeksiBernomor
                    nomor="02"
                    judul="Spesifikasi & Kapasitas"
                    deskripsi="Dimensi, tonase, kapasitas angkut, dan data mesin."
                    jeda={110}
                >
                    <div className="p-5 lg:p-6">
                        <div className="grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2 xl:grid-cols-4">
                            <div>
                                <LabelIsian htmlFor="vessel-length">Panjang (LOA)</LabelIsian>
                                <div className="relative mt-1">
                                    <NumericInput
                                        id="vessel-length"
                                        decimalPlaces={2}
                                        value={data.length_m}
                                        onChange={(e) => setData('length_m', e.target.value)}
                                        placeholder="mis. 32.5"
                                        className={`${INPUT_DASAR} pe-9`}
                                    />
                                    <span
                                        aria-hidden="true"
                                        className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-[11px] font-medium text-muted"
                                    >
                                        m
                                    </span>
                                </div>
                                <Galat pesan={errors.length_m} />
                            </div>

                            <div>
                                <LabelIsian htmlFor="vessel-beam">Lebar (Beam)</LabelIsian>
                                <div className="relative mt-1">
                                    <NumericInput
                                        id="vessel-beam"
                                        decimalPlaces={2}
                                        value={data.beam_m}
                                        onChange={(e) => setData('beam_m', e.target.value)}
                                        placeholder="mis. 9.8"
                                        className={`${INPUT_DASAR} pe-9`}
                                    />
                                    <span
                                        aria-hidden="true"
                                        className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-[11px] font-medium text-muted"
                                    >
                                        m
                                    </span>
                                </div>
                                <Galat pesan={errors.beam_m} />
                            </div>

                            <div>
                                <LabelIsian htmlFor="vessel-gt">
                                    GT (Gross Tonnage)
                                </LabelIsian>
                                <NumericInput
                                    id="vessel-gt"
                                    decimalPlaces={2}
                                    value={data.gt}
                                    onChange={(e) => setData('gt', e.target.value)}
                                    placeholder="mis. 148"
                                    className={INPUT_CLS}
                                />
                                <Galat pesan={errors.gt} />
                            </div>

                            <div>
                                <LabelIsian htmlFor="vessel-dwt">
                                    DWT (Deadweight)
                                </LabelIsian>
                                <div className="relative mt-1">
                                    <NumericInput
                                        id="vessel-dwt"
                                        decimalPlaces={2}
                                        value={data.dwt}
                                        onChange={(e) => setData('dwt', e.target.value)}
                                        placeholder="mis. 220"
                                        className={`${INPUT_DASAR} pe-11`}
                                    />
                                    <span
                                        aria-hidden="true"
                                        className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-[11px] font-medium text-muted"
                                    >
                                        ton
                                    </span>
                                </div>
                                <Galat pesan={errors.dwt} />
                            </div>

                            <div>
                                <LabelIsian htmlFor="vessel-capacity">
                                    Kapasitas Angkut
                                </LabelIsian>
                                <div className="mt-1 flex gap-2">
                                    <NumericInput
                                        id="vessel-capacity"
                                        decimalPlaces={2}
                                        value={data.capacity_value}
                                        onChange={(e) =>
                                            setData('capacity_value', e.target.value)
                                        }
                                        placeholder="mis. 120"
                                        className={`${INPUT_DASAR} min-w-0 flex-1`}
                                    />
                                    <div className="w-32 shrink-0">
                                        <SearchableSelect
                                            value={data.capacity_unit}
                                            options={[
                                                { value: '', label: 'Satuan…' },
                                                { value: 'ton', label: 'Ton' },
                                                { value: 'penumpang', label: 'Penumpang' },
                                            ]}
                                            onChange={(value) => setData('capacity_unit', value)}
                                            placeholder="Satuan…"
                                            ariaLabel="Satuan kapasitas"
                                        />
                                    </div>
                                </div>
                                <Galat pesan={errors.capacity_value ?? errors.capacity_unit} />
                            </div>

                            <div>
                                <LabelIsian htmlFor="vessel-engine">Mesin</LabelIsian>
                                <input
                                    id="vessel-engine"
                                    value={data.engine_spec}
                                    onChange={(e) => setData('engine_spec', e.target.value)}
                                    placeholder="mis. Caterpillar 3512, 1.200 HP"
                                    className={INPUT_CLS}
                                />
                                <Galat pesan={errors.engine_spec} />
                            </div>

                            <div>
                                <LabelIsian htmlFor="vessel-fuel">Jenis BBM</LabelIsian>
                                <input
                                    id="vessel-fuel"
                                    value={data.fuel_spec}
                                    onChange={(e) => setData('fuel_spec', e.target.value)}
                                    placeholder="mis. Marine Gas Oil (MGO)"
                                    className={INPUT_CLS}
                                />
                                <Galat pesan={errors.fuel_spec} />
                            </div>

                            <div>
                                <LabelIsian htmlFor="vessel-baseline">Baseline BBM</LabelIsian>
                                <div className="relative mt-1">
                                    <NumericInput
                                        id="vessel-baseline"
                                        decimalPlaces={2}
                                        value={data.fuel_baseline_lph}
                                        onChange={(e) =>
                                            setData('fuel_baseline_lph', e.target.value)
                                        }
                                        placeholder="mis. 85"
                                        className={`${INPUT_DASAR} pe-14`}
                                    />
                                    <span
                                        aria-hidden="true"
                                        className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-[11px] font-medium text-muted"
                                    >
                                        L/jam
                                    </span>
                                </div>
                                <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-muted">
                                    <Info
                                        size={12}
                                        aria-hidden="true"
                                        className="mt-0.5 shrink-0"
                                    />
                                    Acuan analisis konsumsi BBM normal atau tidak pada
                                    setiap perjalanan.
                                </p>
                                <Galat pesan={errors.fuel_baseline_lph} />
                            </div>
                        </div>
                    </div>
                </SeksiBernomor>

                {/* ===== 03 · Kepemilikan & Pangkalan ===== */}
                <SeksiBernomor
                    nomor="03"
                    judul="Kepemilikan & Pangkalan"
                    deskripsi="Pemilik, pengelola harian, dan pelabuhan pangkalan kapal."
                    jeda={150}
                >
                    <div className="p-5 lg:p-6">
                        <div className="grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2">
                            <div>
                                <LabelIsian htmlFor="vessel-owner">Pemilik</LabelIsian>
                                <input
                                    id="vessel-owner"
                                    value={data.owner}
                                    onChange={(e) => setData('owner', e.target.value)}
                                    className={INPUT_CLS}
                                />
                                <Galat pesan={errors.owner} />
                            </div>

                            <div>
                                <LabelIsian htmlFor="vessel-operator">Operator</LabelIsian>
                                <input
                                    id="vessel-operator"
                                    value={data.operator}
                                    onChange={(e) => setData('operator', e.target.value)}
                                    className={INPUT_CLS}
                                />
                                <Galat pesan={errors.operator} />
                            </div>

                            <div className="md:col-span-2">
                                <LabelIsian htmlFor="vessel-base">
                                    Pelabuhan / Pangkalan
                                </LabelIsian>
                                <input
                                    id="vessel-base"
                                    value={data.base_location}
                                    onChange={(e) => setData('base_location', e.target.value)}
                                    placeholder="mis. Pelabuhan Tanjung Perak, Surabaya"
                                    className={INPUT_CLS}
                                />
                                <Galat pesan={errors.base_location} />
                            </div>

                            <div className="md:col-span-2">
                                <LabelIsian htmlFor="vessel-notes">Catatan</LabelIsian>
                                <textarea
                                    id="vessel-notes"
                                    value={data.notes}
                                    onChange={(e) => setData('notes', e.target.value)}
                                    rows={3}
                                    placeholder="mis. Jadwal docking berikutnya atau catatan kondisi khusus kapal."
                                    className={INPUT_CLS}
                                />
                                <Galat pesan={errors.notes} />
                            </div>
                        </div>
                    </div>
                </SeksiBernomor>

                {/* ===== Baris aksi =====
                    Status isian dirangkum di kiri supaya alasan tombol
                    terkunci selalu terbaca tanpa perlu gulir ke atas. */}
                <div
                    className="bt-anim flex flex-col gap-4 rounded-2xl border border-hairline bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                    style={{ animation: `bt-rise 0.45s ${EASE} 190ms both` }}
                >
                    <div className="min-w-0">
                        {jumlahGalat > 0 ? (
                            <p className="flex items-center gap-2 text-xs font-medium text-primary">
                                <AlertTriangle
                                    size={14}
                                    aria-hidden="true"
                                    className="shrink-0"
                                />
                                {jumlahGalat} isian perlu diperbaiki sebelum menyimpan.
                            </p>
                        ) : !namaSiap ? (
                            <p className="flex items-center gap-2 text-xs text-muted">
                                <Info size={14} aria-hidden="true" className="shrink-0" />
                                Isi nama kapal pada seksi identitas untuk mengaktifkan
                                tombol simpan.
                            </p>
                        ) : (
                            <p className="flex items-center gap-2 text-xs text-muted">
                                <CheckCircle2
                                    size={14}
                                    aria-hidden="true"
                                    className="shrink-0 text-ok"
                                />
                                <span className="truncate">
                                    Siap disimpan sebagai {data.vessel_name}.
                                </span>
                            </p>
                        )}
                    </div>
                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:shrink-0">
                        <Link href={urlBatal} className={BTN_BATAL}>
                            Batal
                        </Link>
                        <button type="submit" disabled={terkunci} className={BTN_UTAMA}>
                            {processing ? (
                                <Loader2
                                    size={16}
                                    aria-hidden="true"
                                    className="animate-spin"
                                />
                            ) : (
                                <Save size={16} aria-hidden="true" />
                            )}
                            {processing
                                ? 'Menyimpan…'
                                : isEdit
                                  ? 'Simpan Perubahan'
                                  : 'Simpan Kapal'}
                        </button>
                    </div>
                </div>
            </div>

            {/* ===== Rel kanan =====
                Pratinjau kartu kapal mengikuti isian secara langsung;
                kelengkapan merangkum kelompok data yang sudah terisi.
                Menempel di bawah topbar pada layar xl ke atas. */}
            <div
                className="bt-anim min-w-0 space-y-5 xl:sticky xl:top-24"
                style={{ animation: `bt-rise 0.45s ${EASE} 130ms both` }}
            >
                <section className="rounded-2xl border border-hairline bg-white shadow-sm">
                    <header className="flex items-center justify-between gap-3 border-b border-hairline px-5 py-4">
                        <h2 className="text-sm font-semibold text-ink">
                            Pratinjau Kartu Kapal
                        </h2>
                        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                            Langsung
                        </span>
                    </header>
                    <div className="p-5">
                        <div className="rounded-xl border border-hairline bg-appbg p-4">
                            <div className="flex items-start gap-3">
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-white shadow-[0_10px_22px_-12px_rgba(193,18,31,0.55)]">
                                    <IkonJenis size={18} aria-hidden="true" />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="break-words text-sm font-semibold text-ink">
                                        {data.vessel_name.trim() || (
                                            <span className="text-muted">
                                                Nama kapal menyusul
                                            </span>
                                        )}
                                    </p>
                                    <p className="mt-1 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted">
                                        {labelJenis +
                                            ' · ' +
                                            (NAV_LABELS[data.navigation_type] ??
                                                data.navigation_type)}
                                    </p>
                                </div>
                            </div>
                            <div className="mt-3.5 space-y-2.5 border-t border-hairline pt-3.5">
                                <div className="flex items-center justify-between gap-3">
                                    <span className="flex shrink-0 items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">
                                        <Anchor size={12} aria-hidden="true" />
                                        Status
                                    </span>
                                    <Badge tone={STATUS_TONES[data.operational_status] ?? 'neutral'}>
                                        {STATUS_LABELS[data.operational_status] ??
                                            data.operational_status}
                                    </Badge>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                    <span className="flex shrink-0 items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">
                                        <Ruler size={12} aria-hidden="true" />
                                        Dimensi
                                    </span>
                                    <span className="min-w-0 truncate text-xs font-medium text-ink">
                                        {terisi(teksDimensi) ? `${teksDimensi} m` : 'Belum diisi'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                    <span className="flex shrink-0 items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">
                                        <Hash size={12} aria-hidden="true" />
                                        GT / DWT
                                    </span>
                                    <span className="min-w-0 truncate text-xs font-medium text-ink">
                                        {teksTonase || 'Belum diisi'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                    <span className="flex shrink-0 items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">
                                        <Boxes size={12} aria-hidden="true" />
                                        Kapasitas
                                    </span>
                                    <span className="min-w-0 truncate text-xs font-medium text-ink">
                                        {teksKapasitas || 'Belum diisi'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                    <span className="flex shrink-0 items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">
                                        <MapPin size={12} aria-hidden="true" />
                                        Pangkalan
                                    </span>
                                    <span className="min-w-0 truncate text-xs font-medium text-ink">
                                        {data.base_location.trim() || 'Belum diatur'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <p className="mt-3 text-[11px] leading-relaxed text-muted">
                            Kartu ini mengikuti isian secara langsung. Kelengkapan
                            dokumen baru terhitung setelah kapal tersimpan dan
                            sertifikatnya diunggah.
                        </p>
                    </div>
                </section>

                <section className="rounded-2xl border border-hairline bg-white shadow-sm">
                    <header className="flex items-center justify-between gap-3 border-b border-hairline px-5 py-4">
                        <h2 className="text-sm font-semibold text-ink">Kelengkapan Data</h2>
                        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                            {jumlahSiap} dari {kelompok.length}
                        </span>
                    </header>
                    <div className="p-5">
                        <div
                            role="progressbar"
                            aria-valuenow={pctSiap}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label="Persentase kelengkapan data"
                            className="h-1.5 overflow-hidden rounded-full bg-hairline"
                        >
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-primary to-gold transition-all duration-500"
                                style={{ width: `${pctSiap}%` }}
                            />
                        </div>
                        <ul className="mt-4 space-y-2.5">
                            {kelompok.map((k) => (
                                <li key={k.label} className="flex items-center gap-2.5">
                                    {k.siap ? (
                                        <CheckCircle2
                                            size={15}
                                            aria-hidden="true"
                                            className="shrink-0 text-ok"
                                        />
                                    ) : (
                                        <Circle
                                            size={15}
                                            aria-hidden="true"
                                            className="shrink-0 text-muted/50"
                                        />
                                    )}
                                    <span
                                        className={classNames(
                                            'text-sm',
                                            k.siap ? 'text-ink' : 'text-muted',
                                        )}
                                    >
                                        {k.label}
                                        {k.wajib && <span className="ms-0.5 text-primary">*</span>}
                                    </span>
                                </li>
                            ))}
                        </ul>
                        {!namaSiap ? (
                            <p className="mt-4 flex items-center gap-1.5 rounded-lg border border-warn/40 bg-warn/[0.08] px-3 py-2 text-xs font-semibold text-ink">
                                <AlertTriangle
                                    size={14}
                                    aria-hidden="true"
                                    className="text-warn"
                                />
                                Nama kapal wajib; kelompok lain bisa menyusul setelah
                                kapal tersimpan.
                            </p>
                        ) : (
                            <p className="mt-4 flex items-center gap-1.5 rounded-lg border border-gold/40 bg-gold/[0.08] px-3 py-2 text-xs font-semibold text-ink">
                                <CheckCircle2
                                    size={14}
                                    aria-hidden="true"
                                    className="text-warn"
                                />
                                Isian wajib lengkap, kapal siap disimpan.
                            </p>
                        )}
                    </div>
                </section>
            </div>
        </form>
    );
}
