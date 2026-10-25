import Badge from '@/Components/ui/Badge';
import Modal from '@/Components/Modal';
import { VALIDITY_LABELS, VERIFICATION_STATUS_LABELS } from '@/Constants/navigation';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { classNames, formatDateTime, formatNumber } from '@/lib/format';
import { type PageProps } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    AlertTriangle,
    Archive,
    ArrowLeft,
    CheckCircle2,
    Download,
    FileText,
    MessageSquare,
    Pencil,
    ShieldX,
    Upload,
    X,
} from 'lucide-react';
import { FormEvent, useState } from 'react';

// Titik warna status pada keping kaca hero. Token tailwind yang sama dengan
// titik Badge di zona terang; dipetakan manual karena keping hero hidup di
// panel burgundy, bukan di kartu putih.
const DOT_VALIDITY: Record<string, string> = {
    normal: 'bg-ok',
    expiring_soon: 'bg-warn',
    expired: 'bg-danger',
    no_expiry: 'bg-cream/50',
};
const DOT_VERIF: Record<string, string> = {
    verified: 'bg-ok',
    under_review: 'bg-maritime',
    revision_required: 'bg-warn',
    rejected: 'bg-danger',
    uploaded: 'bg-maritime',
    draft: 'bg-muted',
    missing: 'bg-danger',
    archived: 'bg-muted',
};

// Warna isi jalur linimasa masa berlaku di hero, sesuai status dokumen.
const FILL_VALIDITY: Record<string, string> = {
    normal: 'bg-ok',
    expiring_soon: 'bg-warn',
    expired: 'bg-danger',
};

// Tekstur grain halus untuk panel hero, senada dengan login, sidebar,
// dashboard, halaman notifikasi, dan Document Center.
const GRAIN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E")`;

const EASE = 'cubic-bezier(0.22,1,0.36,1)';

// Kontrol formulir modal: bingkai hairline + fokus merah lembut, senada
// dengan panel saringan dan modal surat di Document Center.
const INPUT_CLS =
    'mt-1 block w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm text-ink placeholder:text-muted/70 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20';
const SELECT_CLS =
    'mt-1 block w-full cursor-pointer rounded-lg border border-hairline bg-white px-3 py-2 text-sm text-ink transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20';

// Tombol Batal dan tombol utama modal: satu sumber kelas agar kelima modal
// di halaman ini terasa seperti satu keluarga.
const BTN_BATAL =
    'inline-flex items-center justify-center rounded-lg border border-hairline bg-white px-4 py-2 text-sm font-medium text-ink transition-colors duration-200 hover:bg-appbg disabled:opacity-50';
const BTN_UTAMA =
    'inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-primary-hover disabled:opacity-50';

// Label seksi kecil: mono uppercase, versi gelap untuk hero, versi terang
// untuk panel putih.
const LABEL_GELAP =
    'font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-cream/60';
const LABEL_SEKSI =
    'font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-muted';

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

// Kepala modal bergaya dossier: strip gelap maroon ke kanan, rim emas tipis
// di tepi atas, eyebrow mono, judul cream, dan tombol tutup kaca. Dipakai
// oleh seluruh modal di halaman ini supaya pengalaman modal seragam.
function ModalKepala({
    eyebrow,
    judul,
    onClose,
}: {
    eyebrow: string;
    judul: string;
    onClose: () => void;
}) {
    return (
        <header className="relative overflow-hidden bg-gradient-to-r from-sidebar to-primary px-5 py-4">
            <div
                aria-hidden="true"
                className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent"
            />
            <div className="pe-12">
                <p className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-cream/60">
                    {eyebrow}
                </p>
                <h2 className="mt-1 text-base font-semibold text-cream">{judul}</h2>
            </div>
            <button
                type="button"
                onClick={onClose}
                aria-label="Tutup"
                className="absolute end-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-white/10 text-cream transition-colors hover:bg-white/20"
            >
                <X size={15} aria-hidden="true" />
            </button>
        </header>
    );
}

export default function DocumentsShow({
    document,
    versions,
    approvals,
    voyages,
    categories,
    requirements,
    relations,
    actions,
}: PageProps<{
    document: Record<string, any>;
    versions: Array<Record<string, any>>;
    approvals: Array<Record<string, any>>;
    voyages: Array<Record<string, any>>;
    categories: Array<Record<string, any>>;
    requirements: Array<Record<string, any>>;
    relations?: Array<Record<string, any>>;
    actions: {
        can_submit: boolean;
        can_verify: boolean;
        can_edit: boolean;
        can_upload_version: boolean;
    };
}>) {
    const [modal, setModal] = useState<
        null | 'revision' | 'reject' | 'version' | 'edit' | 'archive' | 'void'
    >(null);
    const [busy, setBusy] = useState(false);
    const [voidReason, setVoidReason] = useState('');

    const { data, setData, post, processing, errors, reset } = useForm({
        comments: '',
        file: null as File | null,
        revision_notes: '',
    });

    const editForm = useForm({
        document_name: document.document_name ?? '',
        category_id: document.category?.id ?? '',
        requirement_code: document.requirement_code ?? '',
        document_number: document.document_number ?? '',
        issue_date: document.issue_date ?? '',
        has_expiry: Boolean(document.has_expiry),
        expiry_date: document.expiry_date ?? '',
        responsible_person: document.responsible_person ?? '',
        archive_location: document.archive_location ?? '',
        notes: document.notes ?? '',
        has_endorsement: Boolean(document.has_endorsement),
        endorsement_last_date: document.endorsement_last_date ?? '',
        endorsement_next_date: document.endorsement_next_date ?? '',
    });

    const submitEdit = (e: FormEvent) => {
        e.preventDefault();
        router.put(`/dokumen/${document.id}`, editForm.data, {
            preserveScroll: true,
            onSuccess: () => setModal(null),
        });
    };

    const action = (path: string) => (e: FormEvent) => {
        e.preventDefault();
        post(`/dokumen/${document.id}/${path}`, {
            preserveScroll: true,
            onFinish: () => {
                setModal(null);
                reset();
            },
        });
    };

    const uploadVersion = (e: FormEvent) => {
        e.preventDefault();
        const formData = new FormData();
        if (data.file) formData.append('file', data.file);
        formData.append('revision_notes', data.revision_notes);
        router.post(`/dokumen/${document.id}/versions`, formData, {
            preserveScroll: true,
            onFinish: () => {
                setModal(null);
                reset();
            },
        });
    };

    const dLeft = document.days_left;

    // Turunan tampilan hero: pemilik dan kategori selalu terisi agar baris
    // subjudul tidak pernah menampilkan placeholder kosong.
    const pemilik =
        document.owner_type === 'company'
            ? 'PT Bunga Teratai'
            : document.owner_name ?? 'Tidak tersedia';
    const kategori = document.category?.name ?? 'Tanpa kategori';

    // Sisa hari hanya relevan untuk status normal dan segera berakhir.
    const sisaHari =
        dLeft != null &&
        document.validity !== 'no_expiry' &&
        document.validity !== 'expired';

    // Linimasa masa berlaku: hanya digambar bila kedua tanggal ada dan
    // rentangnya valid, sehingga proporsi isi tidak pernah mengada-ada.
    const dIssue = document.issue_date
        ? new Date(`${document.issue_date}T00:00:00`)
        : null;
    const dExpiry = document.expiry_date
        ? new Date(`${document.expiry_date}T00:00:00`)
        : null;
    const hariIni = new Date();
    hariIni.setHours(0, 0, 0, 0);
    const punyaLinimasa = Boolean(
        dIssue && dExpiry && dExpiry.getTime() > dIssue.getTime(),
    );
    let pctLinimasa = 0;
    if (punyaLinimasa && dIssue && dExpiry) {
        const rentang = dExpiry.getTime() - dIssue.getTime();
        const lewat = (hariIni.getTime() - dIssue.getTime()) / rentang;
        pctLinimasa = Math.round(Math.min(1, Math.max(0, lewat)) * 100);
    }

    // Statistik utama hero: angka besar dengan warna sesuai kondisi.
    const statUtama = (() => {
        if (document.validity === 'no_expiry')
            return { nilai: 'Tanpa batas', unit: '', tone: 'text-cream/80', kecil: true };
        if (dLeft == null)
            return { nilai: 'Tidak tersedia', unit: '', tone: 'text-cream/70', kecil: true };
        if (document.validity === 'expired')
            return {
                nilai: formatNumber(Math.abs(dLeft)),
                unit: 'hari lewat',
                tone: 'text-danger',
                kecil: false,
            };
        return {
            nilai: formatNumber(dLeft),
            unit: 'hari lagi',
            tone: document.validity === 'expiring_soon' ? 'text-warn' : 'text-gold',
            kecil: false,
        };
    })();

    // Daftar metadata per seksi, dibangun dari data yang sama dengan versi
    // lama agar tidak ada informasi yang hilang.
    const identitasItems: Array<[string, string]> = [
        ['Nomor Dokumen', document.document_number ?? 'Tidak tersedia'],
        ['Requirement', document.requirement_code ?? 'Tidak ditautkan'],
        ['Tanggal Terbit', document.issue_date ? tglPendek(document.issue_date) : 'Tidak tersedia'],
        [
            'Masa Berlaku',
            document.has_expiry
                ? document.expiry_date
                    ? tglPendek(document.expiry_date)
                    : 'Tidak tersedia'
                : 'Tanpa masa berlaku',
        ],
        [
            'Status Verifikasi',
            VERIFICATION_STATUS_LABELS[document.verification_status] ??
                document.verification_status,
        ],
        ['Penanggung Jawab', document.responsible_person ?? 'Tidak tersedia'],
    ];
    const arsipItems: Array<[string, string]> = [
        ['Sumber', document.source_type === 'terbitan' ? 'Terbitan sistem' : 'Unggahan scan'],
        ['Nomor Arsip', document.archive_number ?? 'Tidak tersedia'],
        ['Periode Arsip', document.period ?? 'Tidak tersedia'],
        ['Lokasi Arsip', document.archive_location ?? 'Tidak tersedia'],
        ['Diunggah oleh', document.uploaded_by_name ?? 'Tidak tersedia'],
        ['Terakhir diubah', formatDateTime(document.updated_at)],
    ];
    const endorsementItems: Array<[string, string]> = [
        [
            'Endorsement Terakhir',
            document.endorsement_last_date ? tglPendek(document.endorsement_last_date) : 'Tidak tercatat',
        ],
        [
            'Endorsement Berikutnya',
            document.endorsement_next_date ? tglPendek(document.endorsement_next_date) : 'Belum dijadwalkan',
        ],
    ];

    return (
        <AuthenticatedLayout>
            <Head title={`Dokumen · ${document.document_name}`} />

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
                @keyframes bt-pulse-dot {
                    0%, 100% { opacity: 0.55; }
                    50% { opacity: 1; }
                }
                @media (prefers-reduced-motion: reduce) {
                    .bt-anim, .bt-anim * { animation: none !important; }
                }
            `}</style>

            {/* ===== 00 · Dossier dokumen =====
                Panel gelap burgundy-merah yang membawa identitas halaman
                login, sidebar, dashboard, notifikasi, dan register dokumen
                ke halaman detail: aurora, grain, rim emas, watermark ikon
                berkas, identitas dokumen, linimasa masa berlaku, statistik
                ringkas, dan aksi berkas. */}
            <section
                id={`record-doc-${document.id}`}
                className="bt-anim relative mb-6 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-sidebar via-primary-hover to-primary shadow-[0_24px_60px_-24px_rgba(69,16,22,0.55)]"
                style={{ animation: `bt-rise 0.55s ${EASE} both` }}
            >
                {/* Kedalaman panel: cahaya merah kiri-atas, cahaya emas
                    kanan-bawah, grain kertas, dan watermark ikon berkas. */}
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
                    <FileText
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

                {/* Identitas dokumen dan aksi berkas. */}
                <div className="relative flex flex-col gap-6 p-6 lg:p-7 xl:flex-row xl:items-end xl:justify-between">
                    <div className="min-w-0 max-w-2xl">
                        <Link
                            href="/dokumen"
                            className="inline-flex items-center gap-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-cream/60 transition-colors hover:text-cream"
                        >
                            <ArrowLeft size={13} aria-hidden="true" />
                            Register Dokumen
                        </Link>
                        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-cream sm:text-3xl">
                            {document.document_name}
                        </h1>
                        <p className="mt-2 text-sm text-cream/70">
                            {kategori} · {pemilik}
                        </p>
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.08] px-3 py-1 text-xs font-medium text-cream/80 backdrop-blur-sm">
                                <span
                                    aria-hidden="true"
                                    className={classNames(
                                        'h-1.5 w-1.5 shrink-0 rounded-full',
                                        DOT_VALIDITY[document.validity] ?? 'bg-cream/50',
                                    )}
                                />
                                {VALIDITY_LABELS[document.validity] ?? document.validity}
                                {sisaHari && ` · ${formatNumber(dLeft)} hari lagi`}
                            </span>
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.08] px-3 py-1 text-xs font-medium text-cream/80 backdrop-blur-sm">
                                <span
                                    aria-hidden="true"
                                    className={classNames(
                                        'h-1.5 w-1.5 shrink-0 rounded-full',
                                        DOT_VERIF[document.verification_status] ?? 'bg-muted',
                                    )}
                                />
                                {VERIFICATION_STATUS_LABELS[document.verification_status] ??
                                    document.verification_status}
                            </span>
                            {document.voided_at && (
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-danger/40 bg-danger/10 px-3 py-1 text-xs font-medium text-cream/80 backdrop-blur-sm">
                                    <span
                                        aria-hidden="true"
                                        className="h-1.5 w-1.5 shrink-0 rounded-full bg-danger"
                                    />
                                    VOID · Dibatalkan
                                </span>
                            )}
                            {document.document_number && (
                                <span className="font-mono text-[11px] tracking-wide text-cream/50">
                                    No. {document.document_number}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row xl:shrink-0">
                        <a
                            href={`/dokumen/${document.id}/download`}
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-cream px-3.5 py-2 text-sm font-semibold text-sidebar transition-colors duration-200 hover:bg-cream/90"
                        >
                            <Download size={15} aria-hidden="true" />
                            Unduh File
                        </a>
                        {actions.can_upload_version && (
                            <button
                                type="button"
                                onClick={() => setModal('version')}
                                className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3.5 py-2 text-sm font-semibold text-cream backdrop-blur-sm transition-colors duration-200 hover:border-white/35 hover:bg-white/[0.15]"
                            >
                                <Upload size={15} aria-hidden="true" />
                                Unggah Versi Baru
                            </button>
                        )}
                        {actions.can_edit && (
                            <button
                                type="button"
                                onClick={() => setModal('edit')}
                                className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3.5 py-2 text-sm font-semibold text-cream backdrop-blur-sm transition-colors duration-200 hover:border-white/35 hover:bg-white/[0.15]"
                            >
                                <Pencil size={15} aria-hidden="true" />
                                Edit Metadata
                            </button>
                        )}
                    </div>
                </div>

                {/* Masa berlaku: linimasa proporsional dari tanggal terbit
                    menuju tanggal kedaluwarsa dengan penanda hari ini,
                    ditutup statistik ringkas. */}
                <div className="relative border-t border-white/[0.08] p-6 pt-5 lg:p-7 lg:pt-6">
                    <p className={LABEL_GELAP}>Masa Berlaku</p>
                    {punyaLinimasa ? (
                        <div className="mt-4">
                            {/* Baris label penanda hari ini, disembunyikan saat
                                penanda terlalu mepet tepi agar tidak terpotong. */}
                            <div className="relative h-4">
                                {pctLinimasa >= 8 && pctLinimasa <= 92 && (
                                    <span
                                        className="absolute bottom-0 -translate-x-1/2 whitespace-nowrap font-mono text-[9px] uppercase tracking-[0.14em] text-cream/60"
                                        style={{ left: `${pctLinimasa}%` }}
                                    >
                                        Hari ini
                                    </span>
                                )}
                            </div>
                            <div className="relative h-1.5 rounded-full bg-white/10">
                                <div
                                    className={classNames(
                                        'absolute inset-y-0 left-0 rounded-full',
                                        FILL_VALIDITY[document.validity] ?? 'bg-ok',
                                    )}
                                    style={{ width: `${pctLinimasa}%` }}
                                />
                                <span
                                    aria-hidden="true"
                                    className="absolute -top-[7px] h-[18px] w-[2px] -translate-x-1/2 rounded-full bg-cream"
                                    style={{ left: `${pctLinimasa}%` }}
                                />
                            </div>
                            <div className="mt-2.5 flex items-center justify-between font-mono text-[10px] tabular-nums text-cream/60">
                                <span>{tglPendek(document.issue_date)}</span>
                                <span>{tglPendek(document.expiry_date)}</span>
                            </div>
                        </div>
                    ) : document.has_expiry ? (
                        <p className="mt-3 text-sm text-cream/70">
                            Berlaku s/d{' '}
                            <span className="font-semibold tabular-nums text-cream">
                                {tglPendek(document.expiry_date)}
                            </span>
                        </p>
                    ) : (
                        <div className="mt-4">
                            <div
                                aria-hidden="true"
                                className="h-1.5 rounded-full border border-dashed border-white/20"
                            />
                            <p className="mt-2.5 text-xs text-cream/60">
                                Berlaku tanpa batas waktu; tidak ada tanggal kedaluwarsa pada
                                dokumen ini.
                            </p>
                        </div>
                    )}
                    <dl className="mt-6 flex flex-wrap items-center gap-x-10 gap-y-5 border-t border-white/[0.08] pt-5">
                        <div className="min-w-0">
                            <dt className="font-mono text-[9px] font-medium uppercase tracking-[0.16em] text-cream/50">
                                {document.validity === 'no_expiry'
                                    ? 'Masa Berlaku'
                                    : document.validity === 'expired'
                                      ? 'Masa Terlewat'
                                      : 'Sisa Masa Berlaku'}
                            </dt>
                            <dd className="mt-1 flex items-baseline gap-1.5">
                                {statUtama.kecil ? (
                                    <span
                                        className={classNames(
                                            'text-sm font-semibold',
                                            statUtama.tone,
                                        )}
                                    >
                                        {statUtama.nilai}
                                    </span>
                                ) : (
                                    <span
                                        className={classNames(
                                            'text-2xl font-semibold tabular-nums tracking-tight',
                                            statUtama.tone,
                                        )}
                                    >
                                        {statUtama.nilai}
                                    </span>
                                )}
                                {statUtama.unit && (
                                    <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-cream/50">
                                        {statUtama.unit}
                                    </span>
                                )}
                            </dd>
                        </div>
                        <div className="min-w-0">
                            <dt className="font-mono text-[9px] font-medium uppercase tracking-[0.16em] text-cream/50">
                                Tanggal Terbit
                            </dt>
                            <dd className="mt-1 text-sm font-semibold tabular-nums text-cream">
                                {document.issue_date
                                    ? tglPendek(document.issue_date)
                                    : 'Tidak tersedia'}
                            </dd>
                        </div>
                        <div className="min-w-0">
                            <dt className="font-mono text-[9px] font-medium uppercase tracking-[0.16em] text-cream/50">
                                Berlaku s/d
                            </dt>
                            <dd className="mt-1 text-sm font-semibold tabular-nums text-cream">
                                {document.has_expiry
                                    ? document.expiry_date
                                        ? tglPendek(document.expiry_date)
                                        : 'Tidak tersedia'
                                    : 'Tanpa masa berlaku'}
                            </dd>
                        </div>
                    </dl>
                </div>

                {/* Pita verdict untuk dokumen bermasalah: tetap satu panel
                    dengan hero agar terbaca sebagai bagian dari dossier. */}
                {(document.validity === 'expired' ||
                    document.validity === 'expiring_soon') && (
                    <div
                        className={classNames(
                            'relative flex items-start gap-3 border-t p-4 lg:px-7',
                            document.validity === 'expired'
                                ? 'border-danger/25 bg-danger/10'
                                : 'border-warn/25 bg-warn/10',
                        )}
                    >
                        <AlertTriangle
                            size={18}
                            aria-hidden="true"
                            className={classNames(
                                'mt-0.5 shrink-0',
                                document.validity === 'expired'
                                    ? 'text-danger'
                                    : 'text-warn',
                            )}
                        />
                        <div className="text-sm">
                            <p className="font-semibold text-cream">
                                {document.validity === 'expired'
                                    ? 'Dokumen sudah kedaluwarsa'
                                    : 'Mendekati kedaluwarsa'}
                            </p>
                            <p className="mt-0.5 text-cream/75">
                                {document.validity === 'expired'
                                    ? `Berlaku s/d ${tglPendek(document.expiry_date)}${
                                          dLeft != null
                                              ? ` (lewat ${formatNumber(Math.abs(dLeft))} hari)`
                                              : ''
                                      }. Perbarui dokumen dan unggah versi baru.`
                                    : `Berlaku s/d ${tglPendek(document.expiry_date)}${
                                          dLeft != null
                                              ? `, tersisa ${formatNumber(dLeft)} hari`
                                              : ''
                                      }. Siapkan dokumen pengganti sebelum batas waktu.`}
                            </p>
                        </div>
                    </div>
                )}
            </section>

            {/* ===== 01 · Alur dokumen =====
                Panel kondisional yang menghimpun seluruh tindakan alur kerja
                (pengajuan, keputusan supervisor, tindakan lanjutan) dalam
                grup berlabel, agar fungsi tiap tombol jelas dan tidak
                tercampur dengan aksi berkas di hero. */}
            {(actions.can_submit ||
                actions.can_verify ||
                actions.can_edit ||
                document.can_void) && (
                <section
                    className="bt-anim mb-6 rounded-2xl border border-hairline bg-white shadow-sm"
                    style={{ animation: `bt-rise 0.45s ${EASE} 70ms both` }}
                >
                    <div className="p-5 lg:p-6">
                        <header>
                            <p className={LABEL_SEKSI}>Alur Dokumen</p>
                            <h2 className="mt-1 text-sm font-semibold text-ink">
                                Verifikasi & Tindakan
                            </h2>
                        </header>

                        {actions.can_submit && (
                            <div className="mt-5">
                                <p className={LABEL_SEKSI}>Pengajuan</p>
                                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
                                    Dokumen belum diajukan. Ajukan agar supervisor dapat memeriksa
                                    kelengkapan dan menetapkan keputusan.
                                </p>
                                <form onSubmit={action('submit')} className="mt-3">
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-primary-hover disabled:opacity-50"
                                    >
                                        Ajukan ke Supervisor
                                    </button>
                                </form>
                            </div>
                        )}

                        {actions.can_verify && (
                            <div
                                className={classNames(
                                    'mt-5',
                                    actions.can_submit && 'border-t border-hairline pt-5',
                                )}
                            >
                                <p className={LABEL_SEKSI}>Keputusan Supervisor</p>
                                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
                                    Tetapkan keputusan atas dokumen ini. Keputusan beserta
                                    komentarnya tercatat permanen pada Histori Persetujuan.
                                </p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    <form onSubmit={action('verify')}>
                                        <button
                                            type="submit"
                                            disabled={processing}
                                            className="inline-flex items-center gap-2 rounded-lg bg-ok px-3.5 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                                        >
                                            <CheckCircle2 size={16} aria-hidden="true" />
                                            Setujui (Verifikasi)
                                        </button>
                                    </form>
                                    <button
                                        type="button"
                                        onClick={() => setModal('revision')}
                                        className="inline-flex items-center gap-2 rounded-lg border border-warn/40 bg-warn/10 px-3.5 py-2 text-sm font-semibold text-warn transition-colors hover:bg-warn/20"
                                    >
                                        <MessageSquare size={16} aria-hidden="true" />
                                        Minta Revisi
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setModal('reject')}
                                        className="inline-flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3.5 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/20"
                                    >
                                        <ShieldX size={16} aria-hidden="true" />
                                        Tolak
                                    </button>
                                </div>
                            </div>
                        )}

                        {(actions.can_edit || document.can_void) && (
                            <div
                                className={classNames(
                                    'mt-5',
                                    (actions.can_submit || actions.can_verify) &&
                                        'border-t border-hairline pt-5',
                                )}
                            >
                                <p className={LABEL_SEKSI}>Tindakan Lanjutan</p>
                                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
                                    Pengarsipan menyembunyikan dokumen dari register, sedangkan
                                    void menandai terbitan batal. Keduanya tidak menghapus berkas
                                    dari penyimpanan.
                                </p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {actions.can_edit && (
                                        <button
                                            type="button"
                                            onClick={() => setModal('archive')}
                                            className="inline-flex items-center gap-2 rounded-lg border border-hairline bg-white px-3.5 py-2 text-sm font-medium text-ink transition-colors hover:border-warn/50 hover:text-warn"
                                        >
                                            <Archive size={16} aria-hidden="true" />
                                            Arsipkan
                                        </button>
                                    )}
                                    {document.can_void && (
                                        <button
                                            type="button"
                                            onClick={() => setModal('void')}
                                            className="inline-flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3.5 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/20"
                                        >
                                            <ShieldX size={16} aria-hidden="true" />
                                            Void (Batalkan Terbitan)
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            )}

            {/* ===== 02 · Register & histori =====
                Register dokumen memuat metadata lengkap dalam seksi
                berlabel, disertai keterkaitan perjalanan dan relasi. Kolom
                samping memuat riwayat versi dan histori persetujuan sebagai
                timeline vertikal. */}
            <div
                className="bt-anim grid grid-cols-1 gap-5 xl:grid-cols-3"
                style={{ animation: `bt-rise 0.45s ${EASE} 110ms both` }}
            >
                <section className="min-w-0 rounded-2xl border border-hairline bg-white shadow-sm xl:col-span-2">
                    <header className="flex items-center justify-between gap-3 border-b border-hairline px-5 py-4 lg:px-6">
                        <h2 className="text-sm font-semibold text-ink">Register Dokumen</h2>
                        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                            {formatNumber(versions.length)} versi ·{' '}
                            {formatNumber((relations ?? []).length)} relasi
                        </span>
                    </header>
                    <div className="p-5 lg:p-6">
                        <p className={LABEL_SEKSI}>Identitas</p>
                        <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-3">
                            {identitasItems.map(([label, value]) => (
                                <div key={label} className="min-w-0">
                                    <dt className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted">
                                        {label}
                                    </dt>
                                    <dd className="mt-1 text-sm font-medium text-ink">
                                        {value}
                                    </dd>
                                </div>
                            ))}
                        </dl>

                        <div className="mt-6 border-t border-hairline pt-5">
                            <p className={LABEL_SEKSI}>Arsip & Sumber</p>
                            <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-3">
                                {arsipItems.map(([label, value]) => (
                                    <div key={label} className="min-w-0">
                                        <dt className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted">
                                            {label}
                                        </dt>
                                        <dd className="mt-1 text-sm font-medium text-ink">
                                            {value}
                                        </dd>
                                    </div>
                                ))}
                            </dl>
                        </div>

                        <div className="mt-6 border-t border-hairline pt-5">
                            <p className={LABEL_SEKSI}>Endorsement</p>
                            {document.has_endorsement ? (
                                <>
                                    <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-3">
                                        {endorsementItems.map(([label, value]) => (
                                            <div key={label} className="min-w-0">
                                                <dt className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted">
                                                    {label}
                                                </dt>
                                                <dd className="mt-1 text-sm font-medium text-ink">
                                                    {value}
                                                    {label === 'Endorsement Berikutnya' &&
                                                        document.endorsement_days_left != null && (
                                                            <span className="ms-1.5 text-xs font-normal text-muted">
                                                                (
                                                                {formatNumber(
                                                                    document.endorsement_days_left,
                                                                )}{' '}
                                                                hari lagi)
                                                            </span>
                                                        )}
                                                </dd>
                                            </div>
                                        ))}
                                    </dl>
                                    <p className="mt-3 text-xs leading-relaxed text-muted">
                                        Siklus endorsement berlaku untuk dokumen seperti Surat Laut
                                        dan Sertifikat Klasifikasi.
                                    </p>
                                </>
                            ) : (
                                <p className="mt-3 text-sm leading-relaxed text-muted">
                                    Dokumen ini tidak mengikuti siklus endorsement.
                                </p>
                            )}
                        </div>

                        {document.voided_at && (
                            <div className="mt-6 flex items-start gap-3 rounded-xl border border-primary/30 bg-primary-tint p-4">
                                <ShieldX
                                    size={18}
                                    aria-hidden="true"
                                    className="mt-0.5 shrink-0 text-primary"
                                />
                                <div className="text-sm">
                                    <p className="font-semibold text-primary">
                                        Terbitan dibatalkan (VOID)
                                    </p>
                                    <p className="mt-0.5 text-ink">
                                        Dibatalkan {formatDateTime(document.voided_at)}
                                        {document.void_reason
                                            ? ` · Alasan: ${document.void_reason}`
                                            : ''}
                                    </p>
                                </div>
                            </div>
                        )}

                        {document.notes && (
                            <div className="mt-6 rounded-xl border border-hairline bg-appbg p-4">
                                <p className={LABEL_SEKSI}>Catatan</p>
                                <p className="mt-2 text-sm leading-relaxed text-ink">
                                    {document.notes}
                                </p>
                            </div>
                        )}

                        <div className="mt-6 border-t border-hairline pt-5">
                            <p className={LABEL_SEKSI}>
                                Tertaut ke Perjalanan · {formatNumber(voyages.length)}
                            </p>
                            {voyages.length === 0 ? (
                                <p className="mt-3 text-sm leading-relaxed text-muted">
                                    Belum ditautkan ke perjalanan mana pun. Dokumen dapat dipakai
                                    ulang pada perjalanan berikutnya tanpa perlu unggah ulang.
                                </p>
                            ) : (
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {voyages.map((v) => (
                                        <Link
                                            key={v.id}
                                            href={`/perjalanan/${v.id}`}
                                            className="inline-flex items-center rounded-lg border border-hairline px-2.5 py-1.5 font-mono text-[11px] font-medium text-ink transition-colors hover:border-primary/40 hover:text-primary"
                                        >
                                            {v.voyage_code}
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="mt-6 border-t border-hairline pt-5">
                            <p className={LABEL_SEKSI}>
                                Dokumen Terkait · {formatNumber((relations ?? []).length)}
                            </p>
                            {(relations ?? []).length === 0 ? (
                                <p className="mt-3 text-sm leading-relaxed text-muted">
                                    Belum ada relasi dengan dokumen lain. Relasi dibuat otomatis
                                    oleh sistem, misalnya saat invoice terbit dari SPAL, FP
                                    melampiri invoice, atau bukti bayar terkait bill.
                                </p>
                            ) : (
                                <ul className="mt-3 space-y-2">
                                    {(relations ?? []).map((r: any) => (
                                        <li
                                            key={r.id}
                                            className="flex items-center justify-between gap-3 rounded-lg border border-hairline px-3 py-2.5 transition-colors hover:border-primary/40"
                                        >
                                            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                                                <Badge tone="neutral">{r.relation_type}</Badge>
                                                <span className="text-[11px] uppercase tracking-wide text-muted">
                                                    {r.direction}
                                                </span>
                                                {r.related?.id ? (
                                                    <Link
                                                        href={`/dokumen/${r.related.id}`}
                                                        className="truncate text-sm font-medium text-primary hover:underline"
                                                    >
                                                        {r.related.document_name}
                                                    </Link>
                                                ) : (
                                                    <span className="text-sm text-muted">
                                                        (terhapus)
                                                    </span>
                                                )}
                                            </div>
                                            <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted">
                                                {r.related?.document_number ?? ''}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </section>

                <div className="min-w-0 space-y-5">
                    <section className="min-w-0 rounded-2xl border border-hairline bg-white shadow-sm">
                        <header className="flex items-center justify-between gap-3 border-b border-hairline px-5 py-4">
                            <h2 className="text-sm font-semibold text-ink">Riwayat Versi</h2>
                            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                                {formatNumber(versions.length)} tersimpan
                            </span>
                        </header>
                        <div className="p-5">
                            <ol className="relative">
                                <span
                                    aria-hidden="true"
                                    className="absolute bottom-3 left-[5px] top-3 w-px bg-hairline"
                                />
                                {versions.map((v) => (
                                    <li key={v.id} className="relative pb-5 ps-6 last:pb-0">
                                        <span
                                            aria-hidden="true"
                                            className={classNames(
                                                'absolute left-0 top-4 h-2.5 w-2.5 rounded-full',
                                                v.is_current
                                                    ? 'bg-gold'
                                                    : 'border-2 border-hairline bg-white',
                                            )}
                                        />
                                        <div
                                            className={classNames(
                                                'rounded-xl border p-3.5',
                                                v.is_current
                                                    ? 'border-gold/50 bg-gold/[0.06]'
                                                    : 'border-hairline',
                                            )}
                                        >
                                            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                                                <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                                                    v{v.version_number}
                                                    {v.is_current && (
                                                        <span className="rounded bg-gold px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-ink">
                                                            Aktif
                                                        </span>
                                                    )}
                                                </p>
                                                <p className="font-mono text-[10px] tabular-nums text-muted">
                                                    {formatDateTime(v.uploaded_at)}
                                                </p>
                                            </div>
                                            <p className="mt-1.5 text-xs leading-relaxed text-muted">
                                                {v.revision_notes || 'Tanpa catatan revisi'} ·{' '}
                                                {v.uploaded_by ?? 'Tidak diketahui'}
                                                {v.file_size
                                                    ? ` · ${(v.file_size / 1024).toFixed(1)} KB`
                                                    : ''}
                                            </p>
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        </div>
                    </section>

                    <section className="min-w-0 rounded-2xl border border-hairline bg-white shadow-sm">
                        <header className="flex items-center justify-between gap-3 border-b border-hairline px-5 py-4">
                            <h2 className="text-sm font-semibold text-ink">
                                Histori Persetujuan
                            </h2>
                            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                                Keputusan supervisor
                            </span>
                        </header>
                        <div className="p-5">
                            {approvals.length === 0 ? (
                                <p className="text-sm leading-relaxed text-muted">
                                    Belum ada keputusan supervisor.
                                </p>
                            ) : (
                                <ol className="relative">
                                    <span
                                        aria-hidden="true"
                                        className="absolute bottom-3 left-[5px] top-3 w-px bg-hairline"
                                    />
                                    {approvals.map((a) => {
                                        const disetujui = a.approval_status === 'approved';
                                        const ditolak = a.approval_status === 'rejected';
                                        return (
                                            <li
                                                key={a.id}
                                                className="relative pb-5 ps-6 last:pb-0"
                                            >
                                                <span
                                                    aria-hidden="true"
                                                    className={classNames(
                                                        'absolute left-0 top-4 h-2.5 w-2.5 rounded-full',
                                                        disetujui
                                                            ? 'bg-ok'
                                                            : ditolak
                                                              ? 'bg-primary'
                                                              : 'bg-warn',
                                                    )}
                                                />
                                                <div className="rounded-xl border border-hairline p-3.5">
                                                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                                                        <Badge
                                                            tone={
                                                                disetujui
                                                                    ? 'success'
                                                                    : ditolak
                                                                      ? 'danger'
                                                                      : 'warning'
                                                            }
                                                        >
                                                            {disetujui
                                                                ? 'Disetujui'
                                                                : ditolak
                                                                  ? 'Ditolak'
                                                                  : 'Perlu Revisi'}
                                                        </Badge>
                                                        <p className="font-mono text-[10px] tabular-nums text-muted">
                                                            {formatDateTime(a.decision_timestamp)}
                                                        </p>
                                                    </div>
                                                    <p className="mt-1.5 text-xs text-muted">
                                                        {a.approver_name} · persetujuan internal
                                                    </p>
                                                    {a.comments && (
                                                        <p className="mt-2 border-s-2 border-hairline ps-3 text-sm italic leading-relaxed text-ink">
                                                            “{a.comments}”
                                                        </p>
                                                    )}
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ol>
                            )}
                            <p className="mt-4 rounded-lg bg-appbg p-3 text-[11px] leading-relaxed text-muted">
                                Persetujuan di sistem ini adalah{' '}
                                <strong className="font-semibold text-ink">
                                    verifikasi internal
                                </strong>
                                , bukan persetujuan resmi dari otoritas pelayaran.
                            </p>
                        </div>
                    </section>
                </div>
            </div>

            {/* Modal: Minta Revisi / Tolak. Satu modal dua suasana, logika
                dan endpoint sama dengan versi sebelumnya. */}
            <Modal
                show={modal === 'revision' || modal === 'reject'}
                onClose={() => setModal(null)}
                maxWidth="md"
            >
                <form onSubmit={action(modal === 'reject' ? 'reject' : 'revision')}>
                    <ModalKepala
                        eyebrow="Keputusan Supervisor"
                        judul={modal === 'reject' ? 'Tolak Dokumen' : 'Minta Revisi Dokumen'}
                        onClose={() => setModal(null)}
                    />
                    <div className="p-5">
                        <p className="text-sm leading-relaxed text-muted">
                            Alasan {modal === 'reject' ? 'penolakan' : 'revisi'} wajib diisi dan
                            akan tersimpan pada histori persetujuan.
                        </p>
                        <label
                            htmlFor="doc-comments"
                            className="mt-4 block text-xs font-medium text-muted"
                        >
                            Alasan / Komentar *
                        </label>
                        <textarea
                            id="doc-comments"
                            value={data.comments}
                            onChange={(e) => setData('comments', e.target.value)}
                            rows={4}
                            placeholder={
                                modal === 'reject'
                                    ? 'Tuliskan alasan penolakan…'
                                    : 'Tuliskan bagian yang perlu diperbaiki…'
                            }
                            className={INPUT_CLS}
                        />
                        {errors.comments && (
                            <p className="mt-1 text-xs text-primary">{errors.comments}</p>
                        )}
                        <div className="mt-5 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setModal(null)}
                                className={BTN_BATAL}
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                disabled={processing || !data.comments.trim()}
                                className={classNames(
                                    'inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 disabled:opacity-50',
                                    modal === 'reject'
                                        ? 'bg-primary hover:bg-primary-hover'
                                        : 'bg-warn hover:opacity-90',
                                )}
                            >
                                {modal === 'reject' ? 'Tolak Dokumen' : 'Kirim Revisi'}
                            </button>
                        </div>
                    </div>
                </form>
            </Modal>

            {/* Modal: Unggah versi baru. */}
            <Modal show={modal === 'version'} onClose={() => setModal(null)} maxWidth="md">
                <form onSubmit={uploadVersion}>
                    <ModalKepala
                        eyebrow="Kontrol Versi"
                        judul="Unggah Versi Baru"
                        onClose={() => setModal(null)}
                    />
                    <div className="p-5">
                        <p className="text-sm leading-relaxed text-muted">
                            Versi lama tetap tersimpan sebagai jejak audit. Setelah versi baru
                            diunggah, status dokumen kembali ke Terunggah.
                        </p>
                        <label
                            htmlFor="doc-file"
                            className="mt-4 block text-xs font-medium text-muted"
                        >
                            Berkas *
                        </label>
                        <input
                            type="file"
                            id="doc-file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => setData('file', e.target.files?.[0] ?? null)}
                            className="mt-1 block w-full text-sm text-muted file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-appbg file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-ink hover:file:bg-hairline"
                        />
                        {errors.file && (
                            <p className="mt-1 text-xs text-primary">{errors.file}</p>
                        )}
                        <label
                            htmlFor="doc-revision-notes"
                            className="mt-4 block text-xs font-medium text-muted"
                        >
                            Catatan Revisi
                        </label>
                        <input
                            id="doc-revision-notes"
                            value={data.revision_notes}
                            onChange={(e) => setData('revision_notes', e.target.value)}
                            placeholder="mis. Perbaikan nomor dokumen"
                            className={INPUT_CLS}
                        />
                        <div className="mt-5 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setModal(null)}
                                className={BTN_BATAL}
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                disabled={processing || !data.file}
                                className={BTN_UTAMA}
                            >
                                Simpan Versi
                            </button>
                        </div>
                    </div>
                </form>
            </Modal>

            {/* Modal: Edit metadata. Seluruh field, handler, dan endpoint
                identik dengan versi sebelumnya. */}
            <Modal show={modal === 'edit'} onClose={() => setModal(null)} maxWidth="lg">
                <form onSubmit={submitEdit}>
                    <ModalKepala
                        eyebrow="Metadata"
                        judul="Edit Metadata Dokumen"
                        onClose={() => setModal(null)}
                    />
                    <div className="p-5">
                        <p className="text-xs leading-relaxed text-muted">
                            Perubahan tercatat pada audit trail dan berkas tidak ikut berubah.
                            Gunakan Unggah Versi Baru bila berkasnya perlu diganti.
                        </p>
                        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="md:col-span-2">
                                <label
                                    htmlFor="doc-name"
                                    className="block text-xs font-medium text-muted"
                                >
                                    Nama Dokumen *
                                </label>
                                <input
                                    id="doc-name"
                                    value={editForm.data.document_name}
                                    onChange={(e) =>
                                        editForm.setData('document_name', e.target.value)
                                    }
                                    className={INPUT_CLS}
                                />
                                {editForm.errors.document_name && (
                                    <p className="mt-1 text-xs text-primary">
                                        {editForm.errors.document_name}
                                    </p>
                                )}
                            </div>
                            <div>
                                <label
                                    htmlFor="doc-category"
                                    className="block text-xs font-medium text-muted"
                                >
                                    Kategori *
                                </label>
                                <select
                                    id="doc-category"
                                    value={editForm.data.category_id}
                                    onChange={(e) =>
                                        editForm.setData('category_id', Number(e.target.value))
                                    }
                                    className={SELECT_CLS}
                                >
                                    {(categories ?? []).map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.code} · {c.name}
                                        </option>
                                    ))}
                                </select>
                                {editForm.errors.category_id && (
                                    <p className="mt-1 text-xs text-primary">
                                        {editForm.errors.category_id}
                                    </p>
                                )}
                            </div>
                            <div>
                                <label
                                    htmlFor="doc-requirement"
                                    className="block text-xs font-medium text-muted"
                                >
                                    Requirement (kelengkapan)
                                </label>
                                <select
                                    id="doc-requirement"
                                    value={editForm.data.requirement_code}
                                    onChange={(e) =>
                                        editForm.setData('requirement_code', e.target.value)
                                    }
                                    className={SELECT_CLS}
                                >
                                    <option value="">Tidak ditautkan</option>
                                    {(requirements ?? []).map((r) => (
                                        <option key={r.code} value={r.code}>
                                            {r.group_code} · {r.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label
                                    htmlFor="doc-number"
                                    className="block text-xs font-medium text-muted"
                                >
                                    Nomor Dokumen
                                </label>
                                <input
                                    id="doc-number"
                                    value={editForm.data.document_number}
                                    onChange={(e) =>
                                        editForm.setData('document_number', e.target.value)
                                    }
                                    className={INPUT_CLS}
                                />
                            </div>
                            <div>
                                <label
                                    htmlFor="doc-issue"
                                    className="block text-xs font-medium text-muted"
                                >
                                    Tanggal Terbit
                                </label>
                                <input
                                    type="date"
                                    id="doc-issue"
                                    value={editForm.data.issue_date}
                                    onChange={(e) =>
                                        editForm.setData('issue_date', e.target.value)
                                    }
                                    className={INPUT_CLS}
                                />
                            </div>
                            <div className="rounded-xl border border-hairline bg-appbg p-4 md:col-span-2">
                                <label className="flex items-start gap-2.5 text-sm text-ink">
                                    <input
                                        type="checkbox"
                                        checked={editForm.data.has_expiry}
                                        onChange={(e) =>
                                            editForm.setData('has_expiry', e.target.checked)
                                        }
                                        className="mt-0.5 h-4 w-4 rounded border-ink/25 text-primary focus:ring-primary/30"
                                    />
                                    Punya masa berlaku
                                </label>
                                {editForm.data.has_expiry && (
                                    <div className="mt-3 max-w-xs">
                                        <label
                                            htmlFor="doc-expiry"
                                            className="block text-xs font-medium text-muted"
                                        >
                                            Berlaku s/d *
                                        </label>
                                        <input
                                            type="date"
                                            id="doc-expiry"
                                            value={editForm.data.expiry_date}
                                            onChange={(e) =>
                                                editForm.setData('expiry_date', e.target.value)
                                            }
                                            className={INPUT_CLS}
                                        />
                                        {editForm.errors.expiry_date && (
                                            <p className="mt-1 text-xs text-primary">
                                                {editForm.errors.expiry_date}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="rounded-xl border border-warn/30 bg-warn/5 p-4 md:col-span-2">
                                <label className="flex items-start gap-2.5 text-sm text-ink">
                                    <input
                                        type="checkbox"
                                        checked={editForm.data.has_endorsement}
                                        onChange={(e) =>
                                            editForm.setData(
                                                'has_endorsement',
                                                e.target.checked,
                                            )
                                        }
                                        className="mt-0.5 h-4 w-4 rounded border-ink/25 text-primary focus:ring-primary/30"
                                    />
                                    Punya siklus <strong>endorsement</strong> (Surat Laut &
                                    Sertifikat Klasifikasi)
                                </label>
                                {editForm.data.has_endorsement && (
                                    <div className="mt-3 grid max-w-md grid-cols-1 gap-3 sm:grid-cols-2">
                                        <div>
                                            <label
                                                htmlFor="doc-endorse-last"
                                                className="block text-xs font-medium text-muted"
                                            >
                                                Endorsement Terakhir
                                            </label>
                                            <input
                                                type="date"
                                                id="doc-endorse-last"
                                                value={editForm.data.endorsement_last_date}
                                                onChange={(e) =>
                                                    editForm.setData(
                                                        'endorsement_last_date',
                                                        e.target.value,
                                                    )
                                                }
                                                className={INPUT_CLS}
                                            />
                                        </div>
                                        <div>
                                            <label
                                                htmlFor="doc-endorse-next"
                                                className="block text-xs font-medium text-muted"
                                            >
                                                Endorsement Berikutnya *
                                            </label>
                                            <input
                                                type="date"
                                                id="doc-endorse-next"
                                                value={editForm.data.endorsement_next_date}
                                                onChange={(e) =>
                                                    editForm.setData(
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
                            <div>
                                <label
                                    htmlFor="doc-responsible"
                                    className="block text-xs font-medium text-muted"
                                >
                                    Penanggung Jawab
                                </label>
                                <input
                                    id="doc-responsible"
                                    value={editForm.data.responsible_person}
                                    onChange={(e) =>
                                        editForm.setData('responsible_person', e.target.value)
                                    }
                                    className={INPUT_CLS}
                                />
                            </div>
                            <div>
                                <label
                                    htmlFor="doc-location"
                                    className="block text-xs font-medium text-muted"
                                >
                                    Lokasi Arsip
                                </label>
                                <input
                                    id="doc-location"
                                    value={editForm.data.archive_location}
                                    onChange={(e) =>
                                        editForm.setData('archive_location', e.target.value)
                                    }
                                    className={INPUT_CLS}
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label
                                    htmlFor="doc-notes"
                                    className="block text-xs font-medium text-muted"
                                >
                                    Catatan
                                </label>
                                <textarea
                                    id="doc-notes"
                                    value={editForm.data.notes}
                                    onChange={(e) => editForm.setData('notes', e.target.value)}
                                    rows={3}
                                    className={INPUT_CLS}
                                />
                            </div>
                        </div>
                        <div className="mt-5 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setModal(null)}
                                className={BTN_BATAL}
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                disabled={editForm.processing}
                                className={BTN_UTAMA}
                            >
                                Simpan Perubahan
                            </button>
                        </div>
                    </div>
                </form>
            </Modal>

            {/* Modal: konfirmasi pengarsipan. Menggantikan ConfirmModal agar
                kepala modal seragam dengan modal lain di halaman ini;
                endpoint dan perilaku tombol tidak berubah. */}
            <Modal show={modal === 'archive'} onClose={() => setModal(null)} maxWidth="md">
                <div>
                    <ModalKepala
                        eyebrow="Pengarsipan"
                        judul="Arsipkan dokumen ini?"
                        onClose={() => setModal(null)}
                    />
                    <div className="p-5">
                        <div className="flex items-start gap-3">
                            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-warn/10 text-warn">
                                <AlertTriangle size={18} aria-hidden="true" />
                            </span>
                            <p className="text-sm leading-relaxed text-ink">
                                Dokumen{' '}
                                <strong className="font-semibold">
                                    {document.document_name}
                                </strong>{' '}
                                akan disembunyikan dari register (soft delete). Berkas tetap
                                tersimpan di penyimpanan privat.
                            </p>
                        </div>
                        <div className="mt-5 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setModal(null)}
                                disabled={busy}
                                className={BTN_BATAL}
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setBusy(true);
                                    router.post(
                                        `/dokumen/${document.id}/archive`,
                                        {},
                                        {
                                            onFinish: () => {
                                                setBusy(false);
                                                setModal(null);
                                            },
                                        },
                                    );
                                }}
                                disabled={busy}
                                className="inline-flex items-center justify-center rounded-lg bg-warn px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:opacity-90 disabled:opacity-50"
                            >
                                {busy ? 'Memproses…' : 'Arsipkan'}
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Modal: Void dokumen terbitan. */}
            <Modal show={modal === 'void'} onClose={() => setModal(null)} maxWidth="md">
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        setBusy(true);
                        router.post(
                            `/dokumen/${document.id}/void`,
                            { reason: voidReason },
                            {
                                preserveScroll: true,
                                onFinish: () => {
                                    setBusy(false);
                                    setModal(null);
                                    setVoidReason('');
                                },
                            },
                        );
                    }}
                >
                    <ModalKepala
                        eyebrow="Pembatalan Terbitan"
                        judul="Void Dokumen Terbitan?"
                        onClose={() => setModal(null)}
                    />
                    <div className="p-5">
                        <p className="text-sm leading-relaxed text-muted">
                            <strong className="font-semibold text-ink">
                                {document.document_number || document.document_name}
                            </strong>{' '}
                            akan ditandai sebagai dibatalkan. Nomor tidak dipakai ulang dan berkas
                            tetap tersimpan sebagai arsip.
                        </p>
                        <label
                            htmlFor="doc-void-reason"
                            className="mt-4 block text-xs font-medium text-muted"
                        >
                            Alasan void *
                        </label>
                        <textarea
                            id="doc-void-reason"
                            rows={3}
                            value={voidReason}
                            onChange={(e) => setVoidReason(e.target.value)}
                            placeholder="mis. Salah ketik nomor surat"
                            className={INPUT_CLS}
                        />
                        <div className="mt-5 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setModal(null)}
                                className={BTN_BATAL}
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                disabled={busy || !voidReason.trim()}
                                className={BTN_UTAMA}
                            >
                                {busy ? 'Memproses…' : 'Ya, Void'}
                            </button>
                        </div>
                    </div>
                </form>
            </Modal>
        </AuthenticatedLayout>
    );
}
