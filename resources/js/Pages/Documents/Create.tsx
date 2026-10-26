import Badge from '@/Components/ui/Badge';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { classNames } from '@/lib/format';
import { type PageProps } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowLeft,
    Building2,
    CalendarClock,
    CheckCircle2,
    ChevronDown,
    Circle,
    FileText,
    FileUp,
    HardDrive,
    Image as ImageIcon,
    Info,
    Link2,
    Loader2,
    Lock,
    Paperclip,
    Route,
    Ship,
    ShieldCheck,
    Sparkles,
    Stamp,
    Upload,
    X,
} from 'lucide-react';
import { DragEvent, FormEvent, ReactNode, useRef, useState } from 'react';

interface Requirement {
    code: string;
    name: string;
    group_code: string;
    applies_to: string;
    applicability: Record<string, string[]> | null;
    is_conditional: boolean;
}

// Batas unggah dan ekstensi yang diterima server; dipakai juga sebagai
// pemeriksaan awal di sisi klien supaya kesalahan format atau ukuran
// ketahuan sebelum formulir dikirim.
const EKSTENSI_BOLEH = ['pdf', 'jpg', 'jpeg', 'png'];
const MAX_BYTES = 10 * 1024 * 1024;

// Tekstur grain halus untuk panel hero, senada dengan login, sidebar,
// dashboard, halaman notifikasi, Document Center, dan halaman detail.
const GRAIN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E")`;

const EASE = 'cubic-bezier(0.22,1,0.36,1)';

// Kontrol formulir: bingkai hairline + fokus merah lembut, senada dengan
// panel saringan dan modal di Document Center serta halaman detail.
const INPUT_CLS =
    'mt-1 block w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm text-ink placeholder:text-muted/70 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20';
// Select memakai chevron custom (appearance-none) agar panah bawaan
// peramban tidak bertabrakan dengan bingkai hairline.
const SELECT_CLS =
    'block w-full cursor-pointer appearance-none rounded-lg border border-hairline bg-white ps-3 pe-8 py-2 text-sm text-ink transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20';

// Tombol batal dan tombol utama: satu sumber kelas supaya aksi di halaman
// ini terasa seperti satu keluarga. Menggantikan PrimaryButton dan
// SecondaryButton Breeze yang abu-abu, di luar palet aplikasi.
const BTN_BATAL =
    'inline-flex items-center justify-center rounded-lg border border-hairline bg-white px-4 py-2 text-sm font-medium text-ink transition-colors duration-200 hover:bg-appbg disabled:opacity-50';
const BTN_UTAMA =
    'inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-primary-hover disabled:opacity-50';

// Keping kaca kecil di hero: pil informasi format, ukuran, dan privasi.
const CHIP_KACA =
    'inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.07] px-3 py-1 text-[11px] font-medium text-cream/80';

// Format tanggal pendek gaya "12 Mar 2026" tanpa dependensi baru; tanggal
// kosong atau tidak valid dikembalikan apa adanya agar tidak pernah bohong.
const tglPendek = (iso?: string | null) => {
    if (!iso) return 'Tidak tersedia';
    const d = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
};

// Ukuran berkas dalam KB atau MB untuk kartu berkas, baris aksi, dan
// pratinjau di rel samping.
const formatUkuran = (byte: number) =>
    byte >= 1024 * 1024
        ? `${(byte / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.max(1, Math.round(byte / 1024))} KB`;

// Label isian ringkas dengan penanda wajib berwarna merah utama. Label
// selalu terhubung ke kontrol lewat htmlFor agar fokus dan pembaca layar
// tetap sampai ke isian.
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

// Pesan galat validasi per isian, menggantikan InputError Breeze supaya
// warnanya tetap pada palet (merah utama yang dipakai halaman detail).
function Galat({ pesan }: { pesan?: string }) {
    if (!pesan) return null;
    return <p className="mt-1.5 text-xs font-medium text-primary">{pesan}</p>;
}

// Saklar untuk isian boolean (masa berlaku, endorsement, nomor arsip
// otomatis). Nilai tetap dikelola useForm sehingga payload yang dikirim
// tidak berubah dari versi checkbox sebelumnya, hanya tampilannya yang
// lebih jelas arah aktifnya.
function Saklar({
    aktif,
    judul,
    deskripsi,
    onGanti,
}: {
    aktif: boolean;
    judul: string;
    deskripsi?: string;
    onGanti: (nilai: boolean) => void;
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={aktif}
            onClick={() => onGanti(!aktif)}
            className="flex w-full items-center gap-3.5 rounded-xl text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
            <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-ink">{judul}</span>
                {deskripsi && (
                    <span className="mt-0.5 block text-xs leading-relaxed text-muted">
                        {deskripsi}
                    </span>
                )}
            </span>
            <span
                aria-hidden="true"
                className={classNames(
                    'relative h-6 w-11 shrink-0 rounded-full transition-colors duration-300',
                    aktif ? 'bg-primary' : 'bg-ink/[0.18]',
                )}
            >
                <span
                    className={classNames(
                        'absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-300',
                        aktif && 'translate-x-5',
                    )}
                />
            </span>
        </button>
    );
}

export default function DocumentsCreate({
    categories,
    requirements,
    vessels,
    voyagesList,
}: PageProps<{
    categories: Array<{ id: number; code: string; name: string; group_code: string }>;
    requirements: Requirement[];
    vessels: Array<{ id: number; vessel_name: string; vessel_type: string; navigation_type: string }>;
    voyagesList?: Array<{ id: number; voyage_code: string; vessel_id: number; voyage_status: string }>;
}>) {
    const fileRef = useRef<HTMLInputElement>(null);
    const [fileName, setFileName] = useState('');
    const [dragAktif, setDragAktif] = useState(false);
    const [peringatanBerkas, setPeringatanBerkas] = useState('');

    const { data, setData, post, processing, errors } = useForm({
        document_name: '',
        category_id: '' as string | number,
        owner_type: 'vessel',
        owner_id: '' as string | number,
        requirement_code: '',
        document_number: '',
        issue_date: '',
        has_expiry: true,
        expiry_date: '' as string,
        responsible_person: 'Staf Dokumen',
        archive_location: '',
        notes: '',
        file: null as File | null,
        voyage_id: '' as string | number,
        auto_archive_number: true,
        has_endorsement: false,
        endorsement_last_date: '',
        endorsement_next_date: '',
    });

    const selectedVessel = vessels.find((v) => String(v.id) === String(data.owner_id));

    const requirementChoices = requirements.filter((req) => {
        if (data.owner_type === 'company') {
            return req.group_code === 'A';
        }
        // pemilik kapal: kelompok B, C, D, saring sesuai tipe kapal terpilih
        if (!['B', 'C', 'D'].includes(req.group_code)) return false;
        if (!selectedVessel || !req.applicability) return true;
        const app = req.applicability;
        if (app.vessel_types?.length && !app.vessel_types.includes(selectedVessel.vessel_type)) {
            return false;
        }
        if (
            app.navigation_types?.length &&
            !app.navigation_types.includes(selectedVessel.navigation_type)
        ) {
            return false;
        }
        return true;
    });

    const categoryChoices = categories.filter((c) => {
        if (data.owner_type === 'company') return c.group_code === 'A';
        return ['B', 'C', 'D'].includes(c.group_code);
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post('/dokumen', { forceFormData: true });
    };

    const fillFromRequirement = (code: string) => {
        const req = requirements.find((r) => r.code === code);
        setData({
            ...data,
            requirement_code: code,
            category_id:
                categories.find((c) => c.group_code === req?.group_code)?.id ??
                data.category_id,
        });
    };

    // ===== Pengelolaan berkas =====
    // Satu pintu untuk pemilihan lewat dialog maupun jatuhnya seretan:
    // ekstensi diperiksa lebih dulu, berkas tidak dipasang bila formatnya
    // salah; ukuran lewat batas tetap dipasang namun memberi peringatan
    // dan mengunci tombol kirim sampai berkas diganti.
    const pasangBerkas = (berkas: File | null) => {
        setPeringatanBerkas('');
        if (!berkas) return;
        const ekst = berkas.name.split('.').pop()?.toLowerCase() ?? '';
        if (!EKSTENSI_BOLEH.includes(ekst)) {
            setPeringatanBerkas(
                ekst
                    ? `Format .${ekst} tidak didukung; gunakan PDF, JPG, atau PNG.`
                    : 'Format berkas tidak dikenali; gunakan PDF, JPG, atau PNG.',
            );
            return;
        }
        setFileName(berkas.name);
        setData('file', berkas);
        if (berkas.size > MAX_BYTES) {
            setPeringatanBerkas(
                'Ukuran berkas melebihi 10 MB; kompres atau pilih berkas lain sebelum mengirim.',
            );
        }
    };

    const buangBerkas = () => {
        setFileName('');
        setData('file', null);
        setPeringatanBerkas('');
        if (fileRef.current) fileRef.current.value = '';
    };

    const saatGeserMasuk = (e: DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        setDragAktif(true);
    };
    const saatGeserKeluar = (e: DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        setDragAktif(false);
    };
    const saatJatuh = (e: DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        setDragAktif(false);
        pasangBerkas(e.dataTransfer.files?.[0] ?? null);
    };

    // ===== Turunan tampilan =====
    const requirementTerpilih = requirements.find((r) => r.code === data.requirement_code);
    const kategoriTerpilih = categories.find((c) => String(c.id) === String(data.category_id));
    const kategoriOtomatis = Boolean(
        requirementTerpilih &&
            kategoriTerpilih &&
            kategoriTerpilih.group_code === requirementTerpilih.group_code,
    );
    const voyageTerpilih = (voyagesList ?? []).find(
        (v) => String(v.id) === String(data.voyage_id),
    );
    const berkasKelewatBesar = data.file != null && data.file.size > MAX_BYTES;
    const terkunci = processing || data.file == null || berkasKelewatBesar;

    // Ikon dan label jenis berkas mengikuti ekstensi yang dipasang.
    const ekstensiBerkas = data.file
        ? data.file.name.split('.').pop()?.toLowerCase() ?? ''
        : '';
    const IkonJenis =
        ekstensiBerkas === 'pdf'
            ? FileText
            : ['jpg', 'jpeg', 'png'].includes(ekstensiBerkas)
              ? ImageIcon
              : FileUp;
    const labelJenis =
        ekstensiBerkas === 'pdf'
            ? 'Dokumen PDF'
            : ekstensiBerkas === 'png'
              ? 'Gambar PNG'
              : ['jpg', 'jpeg'].includes(ekstensiBerkas)
                ? 'Gambar JPG'
                : 'Berkas';

    // Sisa hari menuju batas berlaku, dihitung dari tengah hari lokal
    // peramban (pengguna berada di zona WITA) khusus untuk umpan balik
    // isian; nilai final tetap dihitung ulang oleh server.
    const sisaHari = (() => {
        if (!data.has_expiry || !data.expiry_date) return null;
        const batas = new Date(`${data.expiry_date}T00:00:00`);
        if (Number.isNaN(batas.getTime())) return null;
        const kini = new Date();
        kini.setHours(0, 0, 0, 0);
        return Math.round((batas.getTime() - kini.getTime()) / 86400000);
    })();

    // Lencana masa berlaku pada pratinjau; pemetaan tonenya sama dengan
    // Badge di register sehingga bahasa warnanya tidak berubah.
    const badgeBerlaku: {
        tone: 'success' | 'warning' | 'danger' | 'neutral';
        isi: string;
    } = (() => {
        if (!data.has_expiry) return { tone: 'neutral', isi: 'Tanpa masa berlaku' };
        if (!data.expiry_date) return { tone: 'neutral', isi: 'Tanggal belum diisi' };
        if (sisaHari == null) return { tone: 'neutral', isi: tglPendek(data.expiry_date) };
        if (sisaHari < 0)
            return { tone: 'danger', isi: `Kedaluwarsa ${Math.abs(sisaHari)} hari lewat` };
        if (sisaHari <= 30)
            return {
                tone: 'warning',
                isi: sisaHari === 0 ? 'Berakhir hari ini' : `Segera berakhir · ${sisaHari} hari`,
            };
        return { tone: 'success', isi: `Berlaku · ${sisaHari} hari` };
    })();

    // Daftar kelengkapan isian pokok; baris bersyarat hanya muncul saat
    // saklar terkait aktif supaya daftar selalu jujur terhadap formulir.
    const kebutuhan: Array<{ label: string; siap: boolean }> = [
        {
            label: 'Pemilik dokumen',
            siap: data.owner_type === 'company' || String(data.owner_id) !== '',
        },
        { label: 'Nama dokumen', siap: data.document_name.trim() !== '' },
        { label: 'Kategori', siap: String(data.category_id) !== '' },
        ...(data.has_expiry
            ? [{ label: 'Tanggal berakhir', siap: Boolean(data.expiry_date) }]
            : []),
        ...(data.has_endorsement
            ? [
                  {
                      label: 'Endorsement berikutnya',
                      siap: Boolean(data.endorsement_next_date),
                  },
              ]
            : []),
        { label: 'Berkas terlampir', siap: data.file != null },
    ];
    const jumlahSiap = kebutuhan.filter((k) => k.siap).length;
    const siapSemua = jumlahSiap === kebutuhan.length;
    const pctSiap =
        kebutuhan.length > 0 ? Math.round((jumlahSiap / kebutuhan.length) * 100) : 0;

    return (
        <AuthenticatedLayout>
            <Head title="Unggah Dokumen" />

            <style>{`
                @keyframes bt-rise {
                    0% { opacity: 0; transform: translateY(16px) scale(0.995); }
                    100% { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes bt-drift-a {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    50% { transform: translate(5%, 6%) scale(1.1); }
                }
                @keyframes bt-drift-b {
                    0%, 100% { transform: translate(0, 0) scale(1.06); }
                    50% { transform: translate(-6%, -5%) scale(0.96); }
                }
                @media (prefers-reduced-motion: reduce) {
                    .bt-anim, .bt-anim * { animation: none !important; }
                }
            `}</style>

            {/* ===== 00 · Panel unggah =====
                Hero burgundy membawa identitas halaman login, sidebar,
                dashboard, dan register dokumen ke formulir unggah: aurora,
                grain, rim emas, dan watermark ikon berkas. Berkas menjadi
                bintang panggungnya: dropzone kaca di kanan berubah wujud
                menjadi kartu berkas begitu sesuatu dipasang. */}
            <section
                className="bt-anim relative mb-6 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-sidebar via-primary-hover to-primary shadow-[0_24px_60px_-24px_rgba(69,16,22,0.55)]"
                style={{ animation: `bt-rise 0.55s ${EASE} both` }}
            >
                {/* Kedalaman panel: cahaya merah kiri-atas, cahaya emas
                    kanan-bawah, grain kertas, dan watermark ikon unggah. */}
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 overflow-hidden"
                >
                    <div
                        className="bt-anim absolute -left-24 -top-32 h-80 w-80 rounded-full blur-3xl"
                        style={{
                            background:
                                'radial-gradient(circle at center, rgba(193,18,31,0.4), transparent 65%)',
                            animation: 'bt-drift-a 26s ease-in-out infinite',
                        }}
                    />
                    <div
                        className="bt-anim absolute -bottom-36 -right-28 h-96 w-96 rounded-full blur-3xl"
                        style={{
                            background:
                                'radial-gradient(circle at center, rgba(212,169,106,0.22), transparent 70%)',
                            animation: 'bt-drift-b 34s ease-in-out infinite',
                        }}
                    />
                    <div
                        className="absolute inset-0 opacity-[0.06] mix-blend-overlay"
                        style={{ backgroundImage: GRAIN }}
                    />
                    <FileUp
                        size={220}
                        strokeWidth={0.7}
                        className="absolute -right-10 -top-12 hidden select-none text-white/[0.05] xl:block"
                    />
                </div>
                {/* Rim emas tipis di tepi atas, tanda tangan antar halaman. */}
                <div
                    aria-hidden="true"
                    className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent"
                />

                <div className="relative grid gap-6 p-6 lg:p-7 xl:grid-cols-[minmax(0,1fr)_370px] xl:items-center">
                    {/* Kiri: identitas halaman dan aturan berkas. */}
                    <div className="min-w-0">
                        <Link
                            href="/dokumen"
                            className="inline-flex items-center gap-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-cream/60 transition-colors hover:text-cream"
                        >
                            <ArrowLeft size={13} aria-hidden="true" />
                            Register Dokumen
                        </Link>
                        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-cream sm:text-3xl">
                            Unggah Dokumen.
                        </h1>
                        <p className="mt-2 max-w-xl text-sm leading-relaxed text-cream/70">
                            Lampirkan berkas dan lengkapi metadatanya. Dokumen langsung
                            masuk ke register dengan pengingat masa berlaku otomatis.
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                            <span className={CHIP_KACA}>
                                <FileText size={12} aria-hidden="true" className="text-gold" />
                                PDF · JPG · PNG
                            </span>
                            <span className={CHIP_KACA}>
                                <HardDrive size={12} aria-hidden="true" className="text-gold" />
                                Maks 10 MB
                            </span>
                            <span className={CHIP_KACA}>
                                <Lock size={12} aria-hidden="true" className="text-gold" />
                                Tersimpan privat
                            </span>
                        </div>
                    </div>

                    {/* Kanan: dropzone berubah menjadi kartu berkas. */}
                    <div className="min-w-0">
                        {!data.file ? (
                            <label
                                onDragOver={saatGeserMasuk}
                                onDragLeave={saatGeserKeluar}
                                onDrop={saatJatuh}
                                className={classNames(
                                    'group flex cursor-pointer flex-col items-center rounded-xl border border-dashed px-6 py-7 text-center transition-colors duration-200 focus-within:border-gold/70 focus-within:ring-2 focus-within:ring-gold/30',
                                    dragAktif
                                        ? 'border-gold/80 bg-gold/[0.1]'
                                        : 'border-white/25 bg-white/[0.05] hover:border-gold/50 hover:bg-white/[0.09]',
                                )}
                            >
                                <span className="pointer-events-none flex flex-col items-center gap-2.5">
                                    <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-gold transition-transform duration-300 group-hover:scale-105">
                                        <FileUp size={20} aria-hidden="true" />
                                    </span>
                                    <span className="text-sm font-semibold text-cream">
                                        Seret berkas ke sini
                                    </span>
                                    <span className="text-xs text-cream/60">
                                        atau klik untuk memilih dari komputer
                                    </span>
                                </span>
                                <input
                                    ref={fileRef}
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    className="sr-only"
                                    onChange={(e) =>
                                        pasangBerkas(e.target.files?.[0] ?? null)
                                    }
                                />
                            </label>
                        ) : (
                            <div className="rounded-xl border border-white/15 bg-white/[0.07] p-4 backdrop-blur-sm">
                                <div className="flex items-center gap-3.5">
                                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold ring-1 ring-inset ring-gold/30">
                                        <IkonJenis size={20} aria-hidden="true" />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p
                                            className="truncate text-sm font-semibold text-cream"
                                            title={fileName}
                                        >
                                            {fileName}
                                        </p>
                                        <p className="mt-0.5 font-mono text-[11px] tabular-nums text-cream/60">
                                            {labelJenis} · {formatUkuran(data.file.size)}
                                        </p>
                                    </div>
                                    <CheckCircle2
                                        size={18}
                                        aria-hidden="true"
                                        className="shrink-0 text-ok"
                                    />
                                </div>
                                <div className="mt-3.5 flex items-center gap-2 border-t border-white/10 pt-3.5">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            // Nilai input direset lebih dulu supaya
                                            // memilih berkas yang sama tetap memicu
                                            // peristiwa change.
                                            if (fileRef.current) {
                                                fileRef.current.value = '';
                                                fileRef.current.click();
                                            }
                                        }}
                                        className="rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-cream transition-colors duration-200 hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/40"
                                    >
                                        Ganti berkas
                                    </button>
                                    <button
                                        type="button"
                                        onClick={buangBerkas}
                                        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-cream/60 transition-colors duration-200 hover:bg-white/10 hover:text-cream focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/40"
                                    >
                                        <X size={13} aria-hidden="true" />
                                        Buang
                                    </button>
                                </div>
                            </div>
                        )}

                        {peringatanBerkas && (
                            <div
                                role="alert"
                                className="mt-3 flex items-start gap-2 rounded-lg border border-warn/40 bg-warn/10 px-3 py-2 text-xs font-medium leading-relaxed text-warn"
                            >
                                <AlertTriangle
                                    size={13}
                                    aria-hidden="true"
                                    className="mt-0.5 shrink-0"
                                />
                                {peringatanBerkas}
                            </div>
                        )}
                        {errors.file && (
                            <div
                                role="alert"
                                className="mt-3 flex items-start gap-2 rounded-lg border border-white/20 bg-white/[0.08] px-3 py-2 text-xs leading-relaxed text-cream"
                            >
                                <AlertTriangle
                                    size={13}
                                    aria-hidden="true"
                                    className="mt-0.5 shrink-0 text-gold"
                                />
                                {errors.file}
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* ===== Formulir dan rel samping =====
                Kolom utama memuat tiga seksi bernomor; rel kanan menempel
                (sticky) memuat pratinjau kartu register yang mengikuti
                isian secara langsung dan ringkasan kelengkapan. */}
            <form
                onSubmit={submit}
                className="grid grid-cols-1 items-start gap-5 xl:grid-cols-3"
            >
                <div className="min-w-0 space-y-5 xl:col-span-2">
                    {/* ===== 01 · Kepemilikan & Tautan ===== */}
                    <section
                        className="bt-anim rounded-2xl border border-hairline bg-white shadow-sm"
                        style={{ animation: `bt-rise 0.45s ${EASE} 70ms both` }}
                    >
                        <header className="flex items-start gap-3.5 border-b border-hairline px-5 py-4 lg:px-6">
                            <span
                                aria-hidden="true"
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-tint font-mono text-xs font-semibold text-primary ring-1 ring-inset ring-primary-tintborder"
                            >
                                01
                            </span>
                            <div className="min-w-0">
                                <h2 className="text-sm font-semibold text-ink">
                                    Kepemilikan &amp; Tautan
                                </h2>
                                <p className="mt-0.5 text-xs leading-relaxed text-muted">
                                    Siapa pemilik dokumen dan perjalanan yang memakainya.
                                </p>
                            </div>
                        </header>
                        <div className="space-y-5 p-5 lg:p-6">
                            <div>
                                <LabelIsian wajib>Dokumen Milik</LabelIsian>
                                <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    {[
                                        {
                                            value: 'vessel',
                                            label: 'Vessel',
                                            desc: 'Dokumen milik armada (kelompok B, C, D)',
                                            icon: Ship,
                                        },
                                        {
                                            value: 'company',
                                            label: 'Perusahaan',
                                            desc: 'Legalitas dan izin usaha (kelompok A)',
                                            icon: Building2,
                                        },
                                    ].map(({ value, label, desc, icon: Ikon }) => {
                                        const aktif = data.owner_type === value;
                                        return (
                                            <button
                                                key={value}
                                                type="button"
                                                onClick={() =>
                                                    setData({
                                                        ...data,
                                                        owner_type: value,
                                                        owner_id:
                                                            value === 'company'
                                                                ? ''
                                                                : data.owner_id,
                                                        requirement_code: '',
                                                        category_id: '',
                                                    })
                                                }
                                                className={classNames(
                                                    'flex items-center gap-3 rounded-xl border p-3.5 text-left transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
                                                    aktif
                                                        ? 'border-primary/60 bg-primary-tint'
                                                        : 'border-hairline bg-white hover:border-primary/40',
                                                )}
                                            >
                                                <span
                                                    className={classNames(
                                                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors duration-200',
                                                        aktif
                                                            ? 'bg-primary text-white shadow-[0_8px_18px_-10px_rgba(193,18,31,0.5)]'
                                                            : 'bg-appbg text-muted',
                                                    )}
                                                >
                                                    <Ikon size={18} aria-hidden="true" />
                                                </span>
                                                <span className="min-w-0 flex-1">
                                                    <span className="block text-sm font-semibold text-ink">
                                                        {label}
                                                    </span>
                                                    <span className="mt-0.5 block text-[11px] leading-snug text-muted">
                                                        {desc}
                                                    </span>
                                                </span>
                                                {aktif && (
                                                    <CheckCircle2
                                                        size={16}
                                                        aria-hidden="true"
                                                        className="shrink-0 text-primary"
                                                    />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                                <Galat pesan={errors.owner_type} />
                            </div>

                            {data.owner_type === 'vessel' ? (
                                <div className="max-w-xl">
                                    <LabelIsian htmlFor="doc-vessel" wajib>
                                        Vessel
                                    </LabelIsian>
                                    <div className="relative mt-1">
                                        <select
                                            id="doc-vessel"
                                            value={data.owner_id}
                                            onChange={(e) =>
                                                setData((prev) => ({
                                                    ...prev,
                                                    owner_id: e.target.value,
                                                    requirement_code: '',
                                                }))
                                            }
                                            className={SELECT_CLS}
                                        >
                                            <option value="">Pilih vessel…</option>
                                            {vessels.map((v) => (
                                                <option key={v.id} value={v.id}>
                                                    {v.vessel_name}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown
                                            size={14}
                                            aria-hidden="true"
                                            className="pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2 text-muted"
                                        />
                                    </div>
                                    <Galat pesan={errors.owner_id} />
                                    {selectedVessel && (
                                        <div className="mt-2.5 flex flex-wrap items-center gap-2">
                                            <span className="rounded-full border border-hairline bg-appbg px-2.5 py-0.5 text-[11px] font-medium text-muted">
                                                {selectedVessel.vessel_type}
                                            </span>
                                            <span className="rounded-full border border-hairline bg-appbg px-2.5 py-0.5 text-[11px] font-medium text-muted">
                                                {selectedVessel.navigation_type}
                                            </span>
                                            <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                                                <ShieldCheck
                                                    size={13}
                                                    aria-hidden="true"
                                                    className="text-ok"
                                                />
                                                {requirementChoices.length} requirement cocok
                                                untuk kapal ini
                                            </span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex max-w-xl items-start gap-2.5 rounded-xl border border-hairline bg-appbg p-3.5">
                                    <Info
                                        size={15}
                                        aria-hidden="true"
                                        className="mt-0.5 shrink-0 text-maritime"
                                    />
                                    <p className="text-xs leading-relaxed text-muted">
                                        Dokumen perusahaan memakai requirement dan kategori
                                        kelompok A: akta, izin usaha, dan dokumen legalitas
                                        lainnya.
                                    </p>
                                </div>
                            )}

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div>
                                    <LabelIsian htmlFor="doc-voyage">
                                        Tertaut Perjalanan (opsional)
                                    </LabelIsian>
                                    <div className="relative mt-1">
                                        <select
                                            id="doc-voyage"
                                            value={data.voyage_id}
                                            onChange={(e) =>
                                                setData('voyage_id', e.target.value)
                                            }
                                            className={SELECT_CLS}
                                        >
                                            <option value="">Tidak tertaut</option>
                                            {(voyagesList ?? []).map((v) => (
                                                <option key={v.id} value={v.id}>
                                                    {v.voyage_code}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown
                                            size={14}
                                            aria-hidden="true"
                                            className="pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2 text-muted"
                                        />
                                    </div>
                                    <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-muted">
                                        <Info
                                            size={12}
                                            aria-hidden="true"
                                            className="mt-0.5 shrink-0"
                                        />
                                        Saat perjalanan dipilih, pemilik kapal ditetapkan
                                        otomatis dari perjalanan tersebut.
                                    </p>
                                </div>
                                <div className="rounded-xl border border-hairline bg-appbg p-3.5 md:mt-5">
                                    <Saklar
                                        aktif={data.auto_archive_number}
                                        judul="Nomor arsip otomatis"
                                        deskripsi="Format ARS/…/tahun/urut, diterbitkan sistem saat dokumen disimpan."
                                        onGanti={(nilai) =>
                                            setData('auto_archive_number', nilai)
                                        }
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* ===== 02 · Identitas & Keterangan ===== */}
                    <section
                        className="bt-anim rounded-2xl border border-hairline bg-white shadow-sm"
                        style={{ animation: `bt-rise 0.45s ${EASE} 110ms both` }}
                    >
                        <header className="flex items-start gap-3.5 border-b border-hairline px-5 py-4 lg:px-6">
                            <span
                                aria-hidden="true"
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-tint font-mono text-xs font-semibold text-primary ring-1 ring-inset ring-primary-tintborder"
                            >
                                02
                            </span>
                            <div className="min-w-0">
                                <h2 className="text-sm font-semibold text-ink">
                                    Identitas &amp; Keterangan
                                </h2>
                                <p className="mt-0.5 text-xs leading-relaxed text-muted">
                                    Metadata yang membuat dokumen mudah ditemukan kembali
                                    di register.
                                </p>
                            </div>
                        </header>
                        <div className="p-5 lg:p-6">
                            <div className="grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2">
                                <div className="md:col-span-2">
                                    <LabelIsian htmlFor="doc-name" wajib>
                                        Nama Dokumen
                                    </LabelIsian>
                                    <input
                                        id="doc-name"
                                        value={data.document_name}
                                        onChange={(e) =>
                                            setData('document_name', e.target.value)
                                        }
                                        placeholder="mis. Sertifikat Kelayakan Layar (SKL)"
                                        className={INPUT_CLS}
                                    />
                                    <Galat pesan={errors.document_name} />
                                </div>

                                <div>
                                    <LabelIsian htmlFor="doc-req">
                                        Dipenuhi Requirement (indikator kelengkapan)
                                    </LabelIsian>
                                    <div className="relative mt-1">
                                        <select
                                            id="doc-req"
                                            value={data.requirement_code}
                                            onChange={(e) =>
                                                fillFromRequirement(e.target.value)
                                            }
                                            className={SELECT_CLS}
                                        >
                                            <option value="">Tidak ditautkan</option>
                                            {requirementChoices.map((r) => (
                                                <option key={r.code} value={r.code}>
                                                    {r.group_code} · {r.name}
                                                    {r.is_conditional ? ' (kondisional)' : ''}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown
                                            size={14}
                                            aria-hidden="true"
                                            className="pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2 text-muted"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <LabelIsian htmlFor="doc-cat" wajib>
                                        Kategori
                                    </LabelIsian>
                                    <div className="relative mt-1">
                                        <select
                                            id="doc-cat"
                                            value={data.category_id}
                                            onChange={(e) =>
                                                setData('category_id', e.target.value)
                                            }
                                            className={SELECT_CLS}
                                        >
                                            <option value="">Pilih kategori…</option>
                                            {categoryChoices.map((c) => (
                                                <option key={c.id} value={c.id}>
                                                    {c.code} · {c.name}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown
                                            size={14}
                                            aria-hidden="true"
                                            className="pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2 text-muted"
                                        />
                                    </div>
                                    <Galat pesan={errors.category_id} />
                                    {kategoriOtomatis && (
                                        <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium text-muted">
                                            <Sparkles
                                                size={12}
                                                aria-hidden="true"
                                                className="text-gold"
                                            />
                                            Terisi otomatis dari requirement terpilih
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <LabelIsian htmlFor="doc-number">
                                        Nomor Dokumen
                                    </LabelIsian>
                                    <input
                                        id="doc-number"
                                        value={data.document_number}
                                        onChange={(e) =>
                                            setData('document_number', e.target.value)
                                        }
                                        className={INPUT_CLS}
                                    />
                                </div>
                                <div>
                                    <LabelIsian htmlFor="doc-issue">
                                        Tanggal Terbit
                                    </LabelIsian>
                                    <input
                                        type="date"
                                        id="doc-issue"
                                        value={data.issue_date}
                                        onChange={(e) =>
                                            setData('issue_date', e.target.value)
                                        }
                                        className={INPUT_CLS}
                                    />
                                </div>
                                <div>
                                    <LabelIsian htmlFor="doc-responsible">
                                        Penanggung Jawab
                                    </LabelIsian>
                                    <input
                                        id="doc-responsible"
                                        value={data.responsible_person}
                                        onChange={(e) =>
                                            setData('responsible_person', e.target.value)
                                        }
                                        className={INPUT_CLS}
                                    />
                                </div>
                                <div>
                                    <LabelIsian htmlFor="doc-location">
                                        Lokasi Arsip
                                    </LabelIsian>
                                    <input
                                        id="doc-location"
                                        value={data.archive_location}
                                        onChange={(e) =>
                                            setData('archive_location', e.target.value)
                                        }
                                        placeholder="mis. Lemari Arsip B, Folder Sertifikat"
                                        className={INPUT_CLS}
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <LabelIsian htmlFor="doc-notes">Catatan</LabelIsian>
                                    <textarea
                                        id="doc-notes"
                                        value={data.notes}
                                        onChange={(e) => setData('notes', e.target.value)}
                                        rows={3}
                                        placeholder="Konteks tambahan untuk arsip, mis. penerbit atau keperluan dokumen"
                                        className={INPUT_CLS}
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* ===== 03 · Masa Berlaku & Endorsement ===== */}
                    <section
                        className="bt-anim rounded-2xl border border-hairline bg-white shadow-sm"
                        style={{ animation: `bt-rise 0.45s ${EASE} 150ms both` }}
                    >
                        <header className="flex items-start gap-3.5 border-b border-hairline px-5 py-4 lg:px-6">
                            <span
                                aria-hidden="true"
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-tint font-mono text-xs font-semibold text-primary ring-1 ring-inset ring-primary-tintborder"
                            >
                                03
                            </span>
                            <div className="min-w-0">
                                <h2 className="text-sm font-semibold text-ink">
                                    Masa Berlaku &amp; Endorsement
                                </h2>
                                <p className="mt-0.5 text-xs leading-relaxed text-muted">
                                    Atur pengingat kedaluwarsa dan siklus perpanjangan
                                    endorsement.
                                </p>
                            </div>
                        </header>
                        <div className="space-y-4 p-5 lg:p-6">
                            <div className="rounded-xl border border-hairline bg-appbg p-4">
                                <Saklar
                                    aktif={data.has_expiry}
                                    judul="Dokumen ini punya masa berlaku"
                                    deskripsi="Tanpa masa berlaku, sistem tidak membuat pengingat kedaluwarsa."
                                    onGanti={(nilai) =>
                                        setData((prev) => ({
                                            ...prev,
                                            has_expiry: nilai,
                                            expiry_date: nilai ? prev.expiry_date : '',
                                        }))
                                    }
                                />
                                {data.has_expiry && (
                                    <div className="mt-4 max-w-xs">
                                        <LabelIsian htmlFor="doc-expiry" wajib>
                                            Berlaku s/d
                                        </LabelIsian>
                                        <input
                                            type="date"
                                            id="doc-expiry"
                                            value={data.expiry_date}
                                            onChange={(e) =>
                                                setData('expiry_date', e.target.value)
                                            }
                                            className={INPUT_CLS}
                                        />
                                        <Galat pesan={errors.expiry_date} />
                                        {sisaHari != null && (
                                            <p
                                                className={classNames(
                                                    'mt-2 flex items-center gap-1.5 text-xs font-medium',
                                                    sisaHari < 0
                                                        ? 'text-primary'
                                                        : sisaHari <= 30
                                                          ? 'text-warn'
                                                          : 'text-ok',
                                                )}
                                            >
                                                <CalendarClock
                                                    size={13}
                                                    aria-hidden="true"
                                                />
                                                {sisaHari < 0
                                                    ? `Sudah lewat ${Math.abs(sisaHari)} hari dari batas`
                                                    : sisaHari === 0
                                                      ? 'Berakhir hari ini'
                                                      : `Berakhir dalam ${sisaHari} hari`}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="rounded-xl border border-warn/30 bg-warn/5 p-4">
                                <Saklar
                                    aktif={data.has_endorsement}
                                    judul="Punya siklus endorsement"
                                    deskripsi="Untuk Surat Laut dan Sertifikat Klasifikasi yang diperpanjang berkala."
                                    onGanti={(nilai) =>
                                        setData('has_endorsement', nilai)
                                    }
                                />
                                {data.has_endorsement && (
                                    <div className="mt-4 grid max-w-xl grid-cols-1 gap-4 sm:grid-cols-2">
                                        <div>
                                            <LabelIsian htmlFor="doc-endorse-last">
                                                Endorsement Terakhir
                                            </LabelIsian>
                                            <input
                                                type="date"
                                                id="doc-endorse-last"
                                                value={data.endorsement_last_date}
                                                onChange={(e) =>
                                                    setData(
                                                        'endorsement_last_date',
                                                        e.target.value,
                                                    )
                                                }
                                                className={INPUT_CLS}
                                            />
                                        </div>
                                        <div>
                                            <LabelIsian htmlFor="doc-endorse-next" wajib>
                                                Endorsement Berikutnya
                                            </LabelIsian>
                                            <input
                                                type="date"
                                                id="doc-endorse-next"
                                                value={data.endorsement_next_date}
                                                onChange={(e) =>
                                                    setData(
                                                        'endorsement_next_date',
                                                        e.target.value,
                                                    )
                                                }
                                                className={INPUT_CLS}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* ===== Baris aksi =====
                        Status berkas dirangkum di kiri supaya alasan tombol
                        terkunci selalu terbaca tanpa perlu gulir ke hero. */}
                    <div
                        className="bt-anim flex flex-col gap-4 rounded-2xl border border-hairline bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                        style={{ animation: `bt-rise 0.45s ${EASE} 190ms both` }}
                    >
                        <div className="min-w-0">
                            {data.file ? (
                                <p className="flex items-center gap-2 text-xs text-muted">
                                    <CheckCircle2
                                        size={14}
                                        aria-hidden="true"
                                        className="shrink-0 text-ok"
                                    />
                                    <span className="truncate">
                                        Berkas terlampir · {fileName} ·{' '}
                                        {formatUkuran(data.file.size)}
                                    </span>
                                </p>
                            ) : (
                                <p className="flex items-center gap-2 text-xs text-muted">
                                    <Info size={14} aria-hidden="true" className="shrink-0" />
                                    Lampirkan berkas pada panel merah di atas untuk
                                    mengaktifkan tombol unggah.
                                </p>
                            )}
                            {berkasKelewatBesar && (
                                <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-warn">
                                    <AlertTriangle size={12} aria-hidden="true" />
                                    Ukuran melebihi 10 MB; tombol unggah terkunci sampai
                                    berkas diganti.
                                </p>
                            )}
                        </div>
                        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:shrink-0">
                            <Link href="/dokumen" className={BTN_BATAL}>
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
                                    <Upload size={16} aria-hidden="true" />
                                )}
                                {processing ? 'Mengirim…' : 'Unggah Dokumen'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* ===== Rel samping =====
                    Pratinjau register mengikuti isian secara langsung;
                    kelengkapan merangkum isian pokok yang belum terisi.
                    Menempel di bawah topbar pada layar xl ke atas. */}
                <div
                    className="bt-anim min-w-0 space-y-5 xl:sticky xl:top-24"
                    style={{ animation: `bt-rise 0.45s ${EASE} 130ms both` }}
                >
                    <section className="rounded-2xl border border-hairline bg-white shadow-sm">
                        <header className="flex items-center justify-between gap-3 border-b border-hairline px-5 py-4">
                            <h2 className="text-sm font-semibold text-ink">
                                Pratinjau Register
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
                                            {data.document_name.trim() || (
                                                <span className="text-muted">
                                                    Nama dokumen menyusul
                                                </span>
                                            )}
                                        </p>
                                        <p className="mt-1 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted">
                                            {kategoriTerpilih
                                                ? `${kategoriTerpilih.code} · ${kategoriTerpilih.name}`
                                                : 'Tanpa kategori'}
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-3.5 space-y-2.5 border-t border-hairline pt-3.5">
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="flex shrink-0 items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">
                                            {data.owner_type === 'company' ? (
                                                <Building2 size={12} aria-hidden="true" />
                                            ) : (
                                                <Ship size={12} aria-hidden="true" />
                                            )}
                                            Pemilik
                                        </span>
                                        <span className="min-w-0 truncate text-xs font-medium text-ink">
                                            {data.owner_type === 'company'
                                                ? 'Perusahaan'
                                                : selectedVessel?.vessel_name ??
                                                  'Vessel belum dipilih'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="flex shrink-0 items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">
                                            <Route size={12} aria-hidden="true" />
                                            Tertaut
                                        </span>
                                        <span className="min-w-0 truncate text-xs font-medium text-ink">
                                            {voyageTerpilih
                                                ? voyageTerpilih.voyage_code
                                                : 'Tidak tertaut'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="flex shrink-0 items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">
                                            <Link2 size={12} aria-hidden="true" />
                                            Requirement
                                        </span>
                                        <span className="min-w-0 truncate text-xs font-medium text-ink">
                                            {requirementTerpilih
                                                ? `${requirementTerpilih.group_code} · ${requirementTerpilih.name}`
                                                : 'Tidak ditautkan'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="flex shrink-0 items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">
                                            <CalendarClock size={12} aria-hidden="true" />
                                            Masa Berlaku
                                        </span>
                                        <span className="flex min-w-0 flex-col items-end gap-1">
                                            <Badge tone={badgeBerlaku.tone}>
                                                {badgeBerlaku.isi}
                                            </Badge>
                                            {data.has_expiry && data.expiry_date && (
                                                <span className="font-mono text-[10px] tabular-nums text-muted">
                                                    {tglPendek(data.expiry_date)}
                                                </span>
                                            )}
                                        </span>
                                    </div>
                                    {data.has_endorsement && (
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="flex shrink-0 items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">
                                                <Stamp size={12} aria-hidden="true" />
                                                Endorsement
                                            </span>
                                            <span className="min-w-0 truncate text-xs font-medium text-ink">
                                                {data.endorsement_next_date
                                                    ? `Berikutnya ${tglPendek(data.endorsement_next_date)}`
                                                    : 'Belum dijadwalkan'}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="flex shrink-0 items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">
                                            <Paperclip size={12} aria-hidden="true" />
                                            Berkas
                                        </span>
                                        <span className="min-w-0 truncate text-xs font-medium text-ink">
                                            {data.file
                                                ? `${fileName} · ${formatUkuran(data.file.size)}`
                                                : 'Belum ada'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <p className="mt-3 text-[11px] leading-relaxed text-muted">
                                Kartu ini mengikuti isian secara langsung. Status verifikasi
                                baru ditetapkan setelah dokumen diunggah.
                            </p>
                        </div>
                    </section>

                    <section className="rounded-2xl border border-hairline bg-white shadow-sm">
                        <header className="flex items-center justify-between gap-3 border-b border-hairline px-5 py-4">
                            <h2 className="text-sm font-semibold text-ink">
                                Kelengkapan Isian
                            </h2>
                            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                                {jumlahSiap} dari {kebutuhan.length}
                            </span>
                        </header>
                        <div className="p-5">
                            <div
                                role="progressbar"
                                aria-valuenow={pctSiap}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-label="Persentase kelengkapan isian"
                                className="h-1.5 overflow-hidden rounded-full bg-hairline"
                            >
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-primary to-gold transition-all duration-500"
                                    style={{ width: `${pctSiap}%` }}
                                />
                            </div>
                            <ul className="mt-4 space-y-2.5">
                                {kebutuhan.map((k) => (
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
                                        </span>
                                    </li>
                                ))}
                            </ul>
                            {berkasKelewatBesar ? (
                                <p className="mt-4 flex items-center gap-1.5 rounded-lg border border-warn/40 bg-warn/[0.08] px-3 py-2 text-xs font-semibold text-ink">
                                    <AlertTriangle
                                        size={14}
                                        aria-hidden="true"
                                        className="text-warn"
                                    />
                                    Berkas melebihi 10 MB, ganti sebelum mengirim.
                                </p>
                            ) : siapSemua ? (
                                <p className="mt-4 flex items-center gap-1.5 rounded-lg border border-gold/40 bg-gold/[0.08] px-3 py-2 text-xs font-semibold text-ink">
                                    <CheckCircle2
                                        size={14}
                                        aria-hidden="true"
                                        className="text-warn"
                                    />
                                    Semua isian pokok lengkap, siap diunggah.
                                </p>
                            ) : null}
                        </div>
                    </section>
                </div>
            </form>
        </AuthenticatedLayout>
    );
}
