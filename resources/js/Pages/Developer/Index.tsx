import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    Activity,
    ArrowRightLeft,
    Database,
    Eraser,
    FileText,
    Flag,
    Gauge,
    HardDrive,
    KeyRound,
    ListOrdered,
    RefreshCw,
    ShieldCheck,
    Terminal,
    TriangleAlert,
    UserCog,
    Wifi,
} from 'lucide-react';
import { FormEvent, ReactNode, useState } from 'react';

interface SystemInfo {
    app: string;
    environment: string;
    debug: boolean;
    php: string;
    laravel: string;
    database: string;
    cache: string;
    queue: string;
    session: string;
    broadcast: string;
    timezone: string;
    server_time: string;
    url: string;
    storage_free: string | null;
    storage_used: string | null;
    dev_mode: boolean;
    tables: Array<{ name: string; count: number }>;
}

interface DevUser {
    id: number;
    name: string;
    email: string;
    roles: string[];
    is_developer: boolean;
    last_activity: string | null;
}

interface DevLog {
    id: number;
    actor: string;
    impersonated: string | null;
    action: string;
    entity_type: string | null;
    entity_id: string | null;
    summary: string | null;
    ip_address: string | null;
    device: string | null;
    timestamp: string | null;
}

interface DevDevice {
    id: number;
    name: string;
    platform: string | null;
    is_ship: boolean;
    user: string | null;
    vessel: string | null;
    last_seen_at: string | null;
    revoked: boolean;
}

interface DevConflict {
    id: number;
    entity_type: string;
    entity_id: number;
    field: string;
    ship_value: string | null;
    shore_value: string | null;
    device: string | null;
    status: string;
    ship_occurred_at: string | null;
    created_at: string | null;
}

interface FlagRow {
    key: string;
    label: string;
    description: string;
    enabled: boolean;
}

interface TemplateRow {
    id: number;
    code: string;
    name: string;
    pattern: string | null;
    archive_pattern: string | null;
    seq_last: number;
    archive_seq_last: number;
}

type WatermarkConfig = {
    enabled: boolean;
    line1: string;
    line2: string;
    opacity: number;
    speed: number;
    angle: number;
    font_size: number;
    color: string;
    show_login: boolean;
    pdf_enabled: boolean;
};

interface SqlResult {
    sql: string;
    columns: string[];
    rows: Array<Record<string, unknown>>;
    error: string | null;
    took_ms: number;
}

interface LogTail {
    path: string;
    lines: string[];
    size: number;
    level: string;
    lines_requested: number;
}

interface Props {
    tab: string;
    tabs: string[];
    system: SystemInfo;
    users: DevUser[];
    devLogs: DevLog[];
    devices: DevDevice[];
    conflicts: DevConflict[];
    flags: FlagRow[];
    templates: TemplateRow[];
    watermarkConfig: WatermarkConfig;
    logTail: LogTail | null;
    sqlResult: SqlResult | null;
}

const TAB_LABELS: Record<string, string> = {
    ringkasan: 'Ringkasan',
    akses: 'Masuk Sebagai',
    maintenance: 'Maintenance',
    data: 'Data',
    sinkronisasi: 'Sinkronisasi',
    log: 'Log',
    fitur: 'Fitur',
    sql: 'SQL',
    nomor: 'Nomor',
    watermark: 'Watermark',
};

const BTN =
    'inline-flex items-center justify-center gap-2 rounded-lg border border-transparent bg-[#BA0C2F] px-3.5 py-2 text-[12px] font-semibold text-white transition hover:bg-[#8E0924] disabled:cursor-not-allowed disabled:opacity-50';
const BTN_GHOST =
    'inline-flex items-center justify-center gap-2 rounded-lg border border-[#E3E8F0] bg-white px-3.5 py-2 text-[12px] font-semibold text-[#111827] transition hover:border-[#BA0C2F]/40 hover:text-[#BA0C2F] disabled:cursor-not-allowed disabled:opacity-50';
const INPUT =
    'w-full rounded-lg border border-[#E3E8F0] bg-white px-3 py-2 text-[12.5px] text-[#111827] outline-none transition focus:border-[#BA0C2F]/60 focus:ring-2 focus:ring-[#BA0C2F]/15';

function Card({
    title,
    description,
    icon,
    children,
    tone = 'default',
}: {
    title: string;
    description?: string;
    icon?: ReactNode;
    children: ReactNode;
    tone?: 'default' | 'danger';
}) {
    return (
        <section
            className={`rounded-2xl border bg-white p-5 shadow-[0_1px_2px_rgba(17,24,39,0.04)] ${
                tone === 'danger' ? 'border-[#F3D2D9]' : 'border-[#E3E8F0]'
            }`}
        >
            <header className="mb-4 flex items-start gap-2.5">
                {icon && <span className="mt-0.5 text-[#BA0C2F]">{icon}</span>}
                <div>
                    <h2 className="text-[13px] font-semibold tracking-tight text-[#111827]">{title}</h2>
                    {description && (
                        <p className="mt-1 text-[12px] leading-relaxed text-[#5B6474]">{description}</p>
                    )}
                </div>
            </header>
            {children}
        </section>
    );
}

function KeyValue({ label, value }: { label: string; value: ReactNode }) {
    return (
        <div className="flex items-start justify-between gap-4 border-b border-dashed border-[#E3E8F0] py-2 last:border-0">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-[#5B6474]">{label}</span>
            <span className="text-right font-mono text-[11.5px] font-medium text-[#111827]">{value}</span>
        </div>
    );
}

export default function DeveloperIndex({
    tab,
    tabs,
    system,
    users,
    devLogs,
    devices,
    conflicts,
    flags,
    templates,
    watermarkConfig,
    logTail,
    sqlResult,
}: Props) {
    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#111827] text-white">
                                <Terminal size={16} />
                            </span>
                            <h1 className="text-lg font-semibold tracking-tight text-[#111827]">
                                Developer Console
                            </h1>
                            <span className="rounded-full bg-[#BA0C2F]/10 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-[#BA0C2F]">
                                Alenkosa
                            </span>
                        </div>
                        <p className="mt-1 text-[12px] text-[#5B6474]">
                            Akses penuh. Aktivitas di sini masuk ke <code>dev_activity_logs</code>, bukan
                            Jejak Audit klien.
                        </p>
                    </div>
                    <div className="rounded-lg border border-[#E3E8F0] bg-[#F5F7FA] px-3 py-2 text-right">
                        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#5B6474]">
                            DEV_MODE
                        </p>
                        <p
                            className={`font-mono text-[12px] font-semibold ${
                                system.dev_mode ? 'text-[#2F8F68]' : 'text-[#C94C4C]'
                            }`}
                        >
                            {system.dev_mode ? 'AKTIF' : 'NONAKTIF'}
                        </p>
                    </div>
                </div>
            }
        >
            <Head title="Developer" />

            <div className="grid gap-4 lg:grid-cols-[190px_minmax(0,1fr)]">
                <nav className="flex flex-wrap gap-1.5 lg:flex-col">
                    {tabs.map((key) => (
                        <Link
                            key={key}
                            href={`/developer?tab=${key}`}
                            preserveScroll
                            className={`rounded-lg px-3 py-2 text-[12px] font-medium transition ${
                                tab === key
                                    ? 'bg-[#BA0C2F] text-white shadow-[0_6px_16px_-10px_rgba(186,12,47,0.9)]'
                                    : 'border border-transparent text-[#111827]/75 hover:border-[#E3E8F0] hover:bg-white'
                            }`}
                        >
                            {TAB_LABELS[key] ?? key}
                        </Link>
                    ))}
                </nav>

                <div className="min-w-0 space-y-4">
                    {tab === 'ringkasan' && <OverviewTab system={system} devLogs={devLogs} />}
                    {tab === 'akses' && <AccessTab users={users} />}
                    {tab === 'maintenance' && <MaintenanceTab />}
                    {tab === 'data' && <DataTab />}
                    {tab === 'sinkronisasi' && <SyncTab devices={devices} conflicts={conflicts} />}
                    {tab === 'log' && <LogTab logTail={logTail} devLogs={devLogs} />}
                    {tab === 'fitur' && <FeatureTab flags={flags} />}
                    {tab === 'sql' && <SqlTab result={sqlResult} />}
                    {tab === 'nomor' && <NumberingTab templates={templates} />}
                    {tab === 'watermark' && <WatermarkTab config={watermarkConfig} />}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}

/* ------------------------------------------------------------------ */
/* Ringkasan                                                          */
/* ------------------------------------------------------------------ */

function OverviewTab({ system, devLogs }: { system: SystemInfo; devLogs: DevLog[] }) {
    return (
        <div className="grid gap-4 xl:grid-cols-2">
            <Card title="Sistem" description="Versi & driver yang sedang dipakai." icon={<Gauge size={15} />}>
                <KeyValue label="Aplikasi" value={system.app} />
                <KeyValue label="Environment" value={system.environment} />
                <KeyValue label="Debug" value={system.debug ? 'ON' : 'OFF'} />
                <KeyValue label="PHP" value={system.php} />
                <KeyValue label="Laravel" value={system.laravel} />
                <KeyValue label="Database" value={system.database} />
                <KeyValue label="Cache" value={system.cache} />
                <KeyValue label="Queue" value={system.queue} />
                <KeyValue label="Session" value={system.session} />
                <KeyValue label="Broadcast" value={system.broadcast} />
                <KeyValue label="Timezone" value={system.timezone} />
                <KeyValue label="Waktu server" value={system.server_time} />
            </Card>

            <div className="space-y-4">
                <Card title="Penyimpanan" description="Kapasitas disk & berkas dokumen." icon={<HardDrive size={15} />}>
                    <KeyValue label="Sisa disk" value={system.storage_free ?? '-'} />
                    <KeyValue label="Ukuran storage/app" value={system.storage_used ?? '-'} />
                    <KeyValue label="URL" value={system.url} />
                </Card>

                <Card title="Jumlah baris tabel" description="Cuplikan tabel penting — bukan seluruh skema." icon={<Database size={15} />}>
                    <div className="grid grid-cols-2 gap-x-4">
                        {system.tables.map((table) => (
                            <div
                                key={table.name}
                                className="flex items-center justify-between gap-2 border-b border-dashed border-[#E3E8F0] py-1.5"
                            >
                                <span className="truncate font-mono text-[11px] text-[#5B6474]">
                                    {table.name}
                                </span>
                                <span className="font-mono text-[11px] font-semibold tabular-nums text-[#111827]">
                                    {table.count.toLocaleString('id-ID')}
                                </span>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>

            <div className="xl:col-span-2">
                <Card
                    title="Aktivitas developer terakhir"
                    description="Lima aksi terakhir, termasuk saat memakai fitur Masuk Sebagai."
                    icon={<Activity size={15} />}
                >
                    <DevLogTable rows={devLogs.slice(0, 5)} />
                </Card>
            </div>
        </div>
    );
}

function DevLogTable({ rows }: { rows: DevLog[] }) {
    if (rows.length === 0) {
        return <p className="text-[12px] text-[#5B6474]">Belum ada aktivitas developer.</p>;
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left">
                <thead>
                    <tr className="border-b border-[#E3E8F0] font-mono text-[10px] uppercase tracking-[0.12em] text-[#5B6474]">
                        <th className="py-1.5 pr-3">Waktu</th>
                        <th className="py-1.5 pr-3">Aktor</th>
                        <th className="py-1.5 pr-3">Aksi</th>
                        <th className="py-1.5 pr-3">Ringkasan</th>
                        <th className="py-1.5">IP</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row) => (
                        <tr key={row.id} className="border-b border-[#F1F4F8] text-[11.5px] text-[#111827]">
                            <td className="py-2 pr-3 font-mono text-[10.5px] text-[#5B6474]">
                                {row.timestamp ? new Date(row.timestamp).toLocaleString('id-ID') : '-'}
                            </td>
                            <td className="py-2 pr-3 whitespace-nowrap">
                                {row.actor}
                                {row.impersonated && (
                                    <span className="ml-1 text-[#BA0C2F]">→ {row.impersonated}</span>
                                )}
                            </td>
                            <td className="py-2 pr-3 font-mono text-[10.5px]">{row.action}</td>
                            <td className="py-2 pr-3">{row.summary ?? '-'}</td>
                            <td className="py-2 font-mono text-[10.5px] text-[#5B6474]">{row.ip_address ?? '-'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Masuk sebagai                                                      */
/* ------------------------------------------------------------------ */

function AccessTab({ users }: { users: DevUser[] }) {
    return (
        <Card
            title="Masuk sebagai pengguna"
            description="Melihat aplikasi dari sudut pandang pengguna tanpa mengetahui sandinya. Aksi selama mode ini tercatat atas nama developer."
            icon={<UserCog size={15} />}
        >
            <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-left">
                    <thead>
                        <tr className="border-b border-[#E3E8F0] font-mono text-[10px] uppercase tracking-[0.12em] text-[#5B6474]">
                            <th className="py-2 pr-3">Pengguna</th>
                            <th className="py-2 pr-3">Role</th>
                            <th className="py-2 pr-3">Terakhir aktif</th>
                            <th className="py-2 text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((user) => (
                            <tr key={user.id} className="border-b border-[#F1F4F8]">
                                <td className="py-2.5 pr-3">
                                    <p className="text-[12.5px] font-medium text-[#111827]">{user.name}</p>
                                    <p className="font-mono text-[10.5px] text-[#5B6474]">{user.email}</p>
                                </td>
                                <td className="py-2.5 pr-3 font-mono text-[10.5px] uppercase tracking-wider text-[#5B6474]">
                                    {user.roles.join(', ') || '-'}
                                </td>
                                <td className="py-2.5 pr-3 text-[11px] text-[#5B6474]">
                                    {user.last_activity ?? '-'}
                                </td>
                                <td className="py-2.5 text-right">
                                    <button
                                        type="button"
                                        disabled={user.is_developer}
                                        onClick={() => router.post(`/developer/masuk-sebagai/${user.id}`)}
                                        className={user.is_developer ? BTN_GHOST : BTN}
                                    >
                                        <ArrowRightLeft size={13} /> Masuk
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    );
}

/* ------------------------------------------------------------------ */
/* Maintenance                                                        */
/* ------------------------------------------------------------------ */

const MAINTENANCE_ACTIONS: Array<{ action: string; label: string; detail: string }> = [
    { action: 'optimize', label: 'Optimize clear', detail: 'Bersihkan cache config, route, view, dan event.' },
    { action: 'view_cache', label: 'View cache', detail: 'Kompilasi seluruh template Blade.' },
    { action: 'config_cache', label: 'Config cache', detail: 'Simpan konfigurasi ke cache produksi.' },
    { action: 'route_cache', label: 'Route cache', detail: 'Simpan tabel route (tidak cocok untuk closure).' },
    { action: 'storage_link', label: 'Storage link', detail: 'Buat symlink public/storage → storage/app/public.' },
];

function MaintenanceTab() {
    const [busy, setBusy] = useState<string | null>(null);

    const run = (action: string) => {
        setBusy(action);
        router.post(
            '/developer/maintenance',
            { action },
            { preserveScroll: true, onFinish: () => setBusy(null) },
        );
    };

    return (
        <Card
            title="Perintah maintenance"
            description="Daftar putih perintah artisan yang aman dijalankan dari panel."
            icon={<Eraser size={15} />}
        >
            <div className="grid gap-2 sm:grid-cols-2">
                {MAINTENANCE_ACTIONS.map((item) => (
                    <div key={item.action} className="rounded-xl border border-[#E3E8F0] p-3">
                        <p className="text-[12.5px] font-semibold text-[#111827]">{item.label}</p>
                        <p className="mt-0.5 text-[11.5px] leading-relaxed text-[#5B6474]">{item.detail}</p>
                        <button
                            type="button"
                            onClick={() => run(item.action)}
                            disabled={busy !== null}
                            className={`${BTN_GHOST} mt-2.5 w-full`}
                        >
                            {busy === item.action ? (
                                <RefreshCw size={13} className="animate-spin" />
                            ) : (
                                <Terminal size={13} />
                            )}
                            Jalankan
                        </button>
                    </div>
                ))}
            </div>
        </Card>
    );
}

/* ------------------------------------------------------------------ */
/* Data                                                               */
/* ------------------------------------------------------------------ */

function DataTab() {
    const [confirm, setConfirm] = useState('');
    const [busy, setBusy] = useState<string | null>(null);

    const run = (action: string) => {
        setBusy(action);
        router.post(
            '/developer/data',
            { action, confirm },
            { preserveScroll: true, onFinish: () => setBusy(null) },
        );
    };

    return (
        <div className="space-y-4">
            <Card
                title="Sinkronisasi reminder"
                description="Hitung ulang pengingat dokumen, endorsement, invoice, dan bill yang jatuh tempo."
                icon={<RefreshCw size={15} />}
            >
                <button type="button" onClick={() => run('reminder_sync')} disabled={busy !== null} className={BTN}>
                    <RefreshCw size={13} className={busy === 'reminder_sync' ? 'animate-spin' : ''} />
                    Jalankan sekarang
                </button>
            </Card>

            <Card
                title="Seed ulang data demo"
                description="Menjalankan DemoDataSeeder (idempoten). Data transaksi bisa bertambah bila seeder tidak idempoten untuk tabel tertentu."
                icon={<TriangleAlert size={15} />}
                tone="danger"
            >
                <label className="block text-[11.5px] font-medium text-[#5B6474]">
                    Ketik <code className="font-mono text-[#BA0C2F]">RESEED</code> untuk mengaktifkan tombol.
                </label>
                <div className="mt-2 flex flex-wrap gap-2">
                    <input
                        value={confirm}
                        onChange={(event) => setConfirm(event.target.value)}
                        placeholder="RESEED"
                        className={`${INPUT} max-w-[200px] font-mono uppercase`}
                    />
                    <button
                        type="button"
                        disabled={confirm !== 'RESEED' || busy !== null}
                        onClick={() => run('reseed_demo')}
                        className={BTN}
                    >
                        <Database size={13} /> Seed demo
                    </button>
                </div>
                <p className="mt-2 text-[11px] text-[#5B6474]">
                    Butuh ±45 detik. Jangan tutup tab sampai selesai.
                </p>
            </Card>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Sinkronisasi                                                       */
/* ------------------------------------------------------------------ */

function SyncTab({ devices, conflicts }: { devices: DevDevice[]; conflicts: DevConflict[] }) {
    return (
        <div className="space-y-4">
            <Card
                title="Perangkat tersinkron"
                description="Perangkat kapal (store-and-forward) dan kantor yang pernah mendaftar."
                icon={<Wifi size={15} />}
            >
                {devices.length === 0 ? (
                    <p className="text-[12px] text-[#5B6474]">Belum ada perangkat terdaftar.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[620px] text-left">
                            <thead>
                                <tr className="border-b border-[#E3E8F0] font-mono text-[10px] uppercase tracking-[0.12em] text-[#5B6474]">
                                    <th className="py-2 pr-3">Perangkat</th>
                                    <th className="py-2 pr-3">Platform</th>
                                    <th className="py-2 pr-3">Pengguna</th>
                                    <th className="py-2 pr-3">Kapal</th>
                                    <th className="py-2 pr-3">Terakhir</th>
                                    <th className="py-2">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {devices.map((device) => (
                                    <tr key={device.id} className="border-b border-[#F1F4F8] text-[11.5px]">
                                        <td className="py-2 pr-3 font-medium text-[#111827]">{device.name}</td>
                                        <td className="py-2 pr-3 font-mono text-[10.5px] text-[#5B6474]">
                                            {device.platform ?? '-'}
                                        </td>
                                        <td className="py-2 pr-3">{device.user ?? '-'}</td>
                                        <td className="py-2 pr-3">{device.vessel ?? '-'}</td>
                                        <td className="py-2 pr-3 font-mono text-[10.5px] text-[#5B6474]">
                                            {device.last_seen_at
                                                ? new Date(device.last_seen_at).toLocaleString('id-ID')
                                                : '-'}
                                        </td>
                                        <td className="py-2">
                                            <span
                                                className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold ${
                                                    device.revoked
                                                        ? 'bg-[#FBE9E9] text-[#C94C4C]'
                                                        : 'bg-[#E9F5EF] text-[#2F8F68]'
                                                }`}
                                            >
                                                {device.revoked ? 'DICABUT' : 'AKTIF'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <Card
                title="Konflik kapal vs kantor"
                description="Tidak ada penimpaan otomatis. Pilih kebijakan lalu tandai selesai (tercatat di jejak developer)."
                icon={<ArrowRightLeft size={15} />}
            >
                {conflicts.length === 0 ? (
                    <p className="text-[12px] text-[#5B6474]">Tidak ada konflik.</p>
                ) : (
                    <div className="space-y-2">
                        {conflicts.map((conflict) => (
                            <ConflictRow key={conflict.id} conflict={conflict} />
                        ))}
                    </div>
                )}
            </Card>
        </div>
    );
}

function ConflictRow({ conflict }: { conflict: DevConflict }) {
    const { data, setData, post, processing } = useForm({
        choice: 'ship' as 'ship' | 'shore',
        note: '',
    });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        post(`/developer/konflik/${conflict.id}`, { preserveScroll: true });
    };

    return (
        <form onSubmit={submit} className="rounded-xl border border-[#E3E8F0] p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                    <p className="font-mono text-[10.5px] uppercase tracking-wider text-[#5B6474]">
                        #{conflict.id} · {conflict.entity_type}#{conflict.entity_id} · {conflict.field}
                    </p>
                    <p className="mt-1 text-[11.5px] text-[#111827]">
                        <span className="font-semibold">Kapal:</span> {conflict.ship_value ?? '—'}
                        <span className="mx-2 text-[#5B6474]">|</span>
                        <span className="font-semibold">Kantor:</span> {conflict.shore_value ?? '—'}
                    </p>
                </div>
                <span
                    className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold ${
                        conflict.status === 'open'
                            ? 'bg-[#FDF1F3] text-[#BA0C2F]'
                            : 'bg-[#E9F5EF] text-[#2F8F68]'
                    }`}
                >
                    {conflict.status.toUpperCase()}
                </span>
            </div>

            {conflict.status === 'open' && (
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <select
                        value={data.choice}
                        onChange={(event) => setData('choice', event.target.value as 'ship' | 'shore')}
                        className={`${INPUT} max-w-[210px]`}
                    >
                        <option value="ship">Pakai laporan kapal</option>
                        <option value="shore">Pertahankan kantor</option>
                    </select>
                    <input
                        value={data.note}
                        onChange={(event) => setData('note', event.target.value)}
                        placeholder="Catatan (opsional)"
                        className={`${INPUT} max-w-[240px]`}
                    />
                    <button type="submit" disabled={processing} className={BTN}>
                        Tandai selesai
                    </button>
                </div>
            )}
        </form>
    );
}

/* ------------------------------------------------------------------ */
/* Log                                                                */
/* ------------------------------------------------------------------ */

function LogTab({ logTail, devLogs }: { logTail: LogTail | null; devLogs: DevLog[] }) {
    return (
        <div className="space-y-4">
            <Card
                title="laravel.log"
                description="Tail berkas log aplikasi. Filter level memakai pencocokan teks (mis. ERROR)."
                icon={<FileText size={15} />}
            >
                <form method="get" action="/developer" className="mb-3 flex flex-wrap items-end gap-2">
                    <input type="hidden" name="tab" value="log" />
                    <label className="text-[11px] font-medium text-[#5B6474]">
                        Baris
                        <input
                            type="number"
                            name="lines"
                            min={50}
                            max={2000}
                            defaultValue={logTail?.lines_requested ?? 400}
                            className={`${INPUT} mt-1 w-[110px] font-mono`}
                        />
                    </label>
                    <label className="text-[11px] font-medium text-[#5B6474]">
                        Level
                        <input
                            name="level"
                            defaultValue={logTail?.level ?? ''}
                            placeholder="error"
                            className={`${INPUT} mt-1 w-[130px] font-mono`}
                        />
                    </label>
                    <button type="submit" className={BTN_GHOST}>
                        <RefreshCw size={13} /> Muat
                    </button>
                    <span className="ml-auto font-mono text-[10.5px] text-[#5B6474]">
                        {(logTail?.size ?? 0).toLocaleString('id-ID')} byte
                    </span>
                </form>

                <pre className="max-h-[420px] overflow-auto rounded-xl bg-[#111827] p-3 font-mono text-[10.5px] leading-relaxed text-[#E5E7EB]">
{logTail && logTail.lines.length > 0
    ? logTail.lines.join('\n')
    : 'Tidak ada baris log.'}
                </pre>
            </Card>

            <Card
                title="Jejak developer"
                description="Aktivitas akun developer, terpisah dari Jejak Audit klien."
                icon={<ShieldCheck size={15} />}
            >
                <DevLogTable rows={devLogs} />
            </Card>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Fitur                                                              */
/* ------------------------------------------------------------------ */

function FeatureTab({ flags }: { flags: FlagRow[] }) {
    const { data, setData, post, processing } = useForm<{ flags: Record<string, boolean> }>({
        flags: Object.fromEntries(flags.map((flag) => [flag.key, flag.enabled])),
    });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        post('/developer/fitur', { preserveScroll: true });
    };

    return (
        <Card
            title="Feature flag"
            description="Mematikan fitur tanpa deploy ulang. Perubahan langsung dipakai request berikutnya."
            icon={<Flag size={15} />}
        >
            <form onSubmit={submit} className="space-y-2">
                {flags.map((flag) => (
                    <label
                        key={flag.key}
                        className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#E3E8F0] p-3"
                    >
                        <input
                            type="checkbox"
                            checked={Boolean(data.flags[flag.key])}
                            onChange={(event) =>
                                setData('flags', { ...data.flags, [flag.key]: event.target.checked })
                            }
                            className="mt-0.5 h-4 w-4 accent-[#BA0C2F]"
                        />
                        <span>
                            <span className="block text-[12.5px] font-semibold text-[#111827]">
                                {flag.label}
                                <code className="ml-2 font-mono text-[10px] font-normal text-[#5B6474]">
                                    {flag.key}
                                </code>
                            </span>
                            <span className="mt-0.5 block text-[11.5px] leading-relaxed text-[#5B6474]">
                                {flag.description}
                            </span>
                        </span>
                    </label>
                ))}

                <button type="submit" disabled={processing} className={BTN}>
                    <Flag size={13} /> Simpan
                </button>
            </form>
        </Card>
    );
}

/* ------------------------------------------------------------------ */
/* SQL                                                                */
/* ------------------------------------------------------------------ */

function SqlTab({ result }: { result: SqlResult | null }) {
    const { data, setData, post, processing } = useForm({
        sql: 'select id, name, email from users order by id limit 20',
    });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        post('/developer/sql', { preserveScroll: true });
    };

    return (
        <div className="space-y-4">
            <Card
                title="Konsol SQL read-only"
                description="Hanya SELECT/WITH, satu statement, otomatis LIMIT 200. Kata kunci tulis ditolak."
                icon={<KeyRound size={15} />}
            >
                <form onSubmit={submit}>
                    <textarea
                        value={data.sql}
                        onChange={(event) => setData('sql', event.target.value)}
                        rows={6}
                        spellCheck={false}
                        className={`${INPUT} font-mono text-[11.5px]`}
                    />
                    <div className="mt-2 flex items-center gap-2">
                        <button type="submit" disabled={processing} className={BTN}>
                            <Terminal size={13} /> Jalankan
                        </button>
                        <span className="font-mono text-[10.5px] text-[#5B6474]">
                            {processing ? 'Menjalankan...' : 'Hasil maksimal 200 baris'}
                        </span>
                    </div>
                </form>
            </Card>

            {result && (
                <Card
                    title="Hasil"
                    description={`${result.rows.length} baris · ${result.took_ms} ms`}
                    icon={<Database size={15} />}
                    tone={result.error ? 'danger' : 'default'}
                >
                    <pre className="mb-2 overflow-x-auto rounded-lg bg-[#F5F7FA] p-2 font-mono text-[10.5px] text-[#5B6474]">
                        {result.sql}
                    </pre>

                    {result.error ? (
                        <p className="rounded-lg bg-[#FBE9E9] px-3 py-2 text-[12px] text-[#C94C4C]">
                            {result.error}
                        </p>
                    ) : (
                        <div className="max-h-[360px] overflow-auto">
                            <table className="w-full min-w-[520px] text-left">
                                <thead className="sticky top-0 bg-white">
                                    <tr className="border-b border-[#E3E8F0] font-mono text-[10px] uppercase tracking-[0.1em] text-[#5B6474]">
                                        {result.columns.map((column) => (
                                            <th key={column} className="py-2 pr-3">
                                                {column}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {result.rows.map((row, index) => (
                                        <tr key={index} className="border-b border-[#F1F4F8]">
                                            {result.columns.map((column) => (
                                                <td
                                                    key={column}
                                                    className="max-w-[280px] truncate py-1.5 pr-3 font-mono text-[10.5px] text-[#111827]"
                                                >
                                                    {row[column] === null ? (
                                                        <span className="text-[#5B6474]">NULL</span>
                                                    ) : (
                                                        String(row[column])
                                                    )}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>
            )}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Nomor                                                              */
/* ------------------------------------------------------------------ */

function NumberingTab({ templates }: { templates: TemplateRow[] }) {
    return (
        <Card
            title="Counter nomor surat"
            description="Nomor yang sudah terbit tidak dipakai ulang. Sesuaikan hanya bila terjadi migrasi data."
            icon={<ListOrdered size={15} />}
        >
            <div className="space-y-2">
                {templates.map((template) => (
                    <CounterRow key={template.id} template={template} />
                ))}
            </div>
        </Card>
    );
}

function CounterRow({ template }: { template: TemplateRow }) {
    const { data, setData, post, processing } = useForm({
        seq_last: template.seq_last,
        archive_seq_last: template.archive_seq_last,
    });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        post(`/developer/nomor/${template.id}`, { preserveScroll: true });
    };

    return (
        <form
            onSubmit={submit}
            className="flex flex-wrap items-end gap-3 rounded-xl border border-[#E3E8F0] p-3"
        >
            <div className="min-w-[180px] flex-1">
                <p className="font-mono text-[11.5px] font-semibold text-[#111827]">{template.code}</p>
                <p className="text-[11px] text-[#5B6474]">{template.name}</p>
                <p className="mt-0.5 truncate font-mono text-[10px] text-[#5B6474]">
                    {template.pattern ?? '-'}
                </p>
            </div>

            <label className="text-[10.5px] font-medium text-[#5B6474]">
                Terbit
                <input
                    type="number"
                    min={0}
                    value={data.seq_last}
                    onChange={(event) => setData('seq_last', Number(event.target.value))}
                    className={`${INPUT} mt-1 w-[100px] font-mono tabular-nums`}
                />
            </label>

            <label className="text-[10.5px] font-medium text-[#5B6474]">
                Arsip
                <input
                    type="number"
                    min={0}
                    value={data.archive_seq_last}
                    onChange={(event) => setData('archive_seq_last', Number(event.target.value))}
                    className={`${INPUT} mt-1 w-[100px] font-mono tabular-nums`}
                />
            </label>

            <button type="submit" disabled={processing} className={BTN_GHOST}>
                Simpan
            </button>
        </form>
    );
}

/* ------------------------------------------------------------------ */
/* Watermark                                                          */
/* ------------------------------------------------------------------ */

function RangeField({
    label,
    value,
    min,
    max,
    step,
    suffix,
    onChange,
}: {
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    suffix?: string;
    onChange: (value: number) => void;
}) {
    return (
        <div>
            <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-[10.5px] font-medium text-[#5B6474]">{label}</span>
                <span className="flex items-center gap-1">
                    <input
                        type="number"
                        value={value}
                        min={min}
                        max={max}
                        step={step}
                        onChange={(event) => {
                            const next = Number(event.target.value);
                            if (Number.isFinite(next)) {
                                onChange(Math.max(min, Math.min(max, next)));
                            }
                        }}
                        className="w-[76px] rounded-md border border-[#E3E8F0] bg-white px-2 py-1 text-right font-mono text-[11.5px] tabular-nums text-[#111827] outline-none focus:border-[#BA0C2F]/60"
                    />
                    {suffix && (
                        <span className="font-mono text-[10.5px] text-[#5B6474]">{suffix}</span>
                    )}
                </span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(event) => onChange(Number(event.target.value))}
                className="w-full accent-[#BA0C2F]"
            />
        </div>
    );
}

function WatermarkTab({ config }: { config: WatermarkConfig }) {
    const { data, setData, put, post, processing, errors } = useForm<WatermarkConfig>(config);

    const save = (event: FormEvent) => {
        event.preventDefault();
        put('/developer/watermark', { preserveScroll: true });
    };

    const preview = (template: string) =>
        template
            .replaceAll('{ip}', '103.27.206.14')
            .replaceAll('{device}', 'Windows · Chrome · Desktop')
            .replaceAll('{timestamp}', '03 Nov 2026 14:32:11 WITA')
            .replaceAll('{user}', 'Admin Sistem')
            .replaceAll('{company}', 'PT Bunga Teratai')
            .replaceAll('{doc_no}', '-');

    return (
        <div className="space-y-4">
            <Card
                title="Watermark keamanan"
                description="Pita diagonal berjalan di seluruh halaman dan PDF. Baris kedua memuat identitas pengunjung."
                icon={<ShieldCheck size={15} />}
            >
                <form onSubmit={save} className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                        <label className="flex items-center gap-2 rounded-xl border border-[#E3E8F0] p-3">
                            <input
                                type="checkbox"
                                checked={data.enabled}
                                onChange={(event) => setData('enabled', event.target.checked)}
                                className="h-4 w-4 accent-[#BA0C2F]"
                            />
                            <span className="text-[12.5px] font-semibold text-[#111827]">
                                Aktifkan watermark
                            </span>
                        </label>

                        <label className="flex items-center gap-2 rounded-xl border border-[#E3E8F0] p-3">
                            <input
                                type="checkbox"
                                checked={data.show_login}
                                onChange={(event) => setData('show_login', event.target.checked)}
                                className="h-4 w-4 accent-[#BA0C2F]"
                            />
                            <span className="text-[12.5px] font-semibold text-[#111827]">
                                Tampil di halaman login
                            </span>
                        </label>
                    </div>

                    <label className="block">
                        <span className="mb-1 block font-mono text-[10.5px] uppercase tracking-[0.12em] text-[#5B6474]">
                            Baris 1
                        </span>
                        <input
                            value={data.line1}
                            onChange={(event) => setData('line1', event.target.value)}
                            maxLength={140}
                            className={INPUT}
                        />
                    </label>

                    <label className="block">
                        <span className="mb-1 block font-mono text-[10.5px] uppercase tracking-[0.12em] text-[#5B6474]">
                            Baris 2
                        </span>
                        <input
                            value={data.line2}
                            onChange={(event) => setData('line2', event.target.value)}
                            maxLength={140}
                            className={`${INPUT} font-mono`}
                        />
                        <span className="mt-1 block text-[11px] text-[#5B6474]">
                            Token: {'{ip}'} {'{device}'} {'{timestamp}'} {'{user}'} {'{company}'} {'{doc_no}'}
                        </span>
                    </label>

                    <div className="rounded-xl border border-[#E3E8F0] bg-[#F9FAFC] p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-[#5B6474]">
                                Preset tampilan
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                                {[
                                    { label: 'Halus', opacity: 0.04, speed: 70, font_size: 10 },
                                    { label: 'Standar', opacity: 0.07, speed: 40, font_size: 11 },
                                    { label: 'Tegas', opacity: 0.12, speed: 24, font_size: 12 },
                                ].map((preset) => (
                                    <button
                                        key={preset.label}
                                        type="button"
                                        onClick={() =>
                                            setData({
                                                ...data,
                                                opacity: preset.opacity,
                                                speed: preset.speed,
                                                font_size: preset.font_size,
                                            })
                                        }
                                        className="rounded-lg border border-[#E3E8F0] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#111827] transition hover:border-[#BA0C2F]/50 hover:text-[#BA0C2F]"
                                    >
                                        {preset.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <p className="mt-1 text-[11px] text-[#5B6474]">
                            Preset mengubah opacity, kecepatan, dan ukuran font sekaligus.
                        </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <RangeField
                            label="Opacity"
                            value={Math.round(data.opacity * 100)}
                            min={1}
                            max={35}
                            step={1}
                            suffix="%"
                            onChange={(value) => setData('opacity', value / 100)}
                        />
                        <RangeField
                            label="Kecepatan"
                            value={data.speed}
                            min={10}
                            max={240}
                            step={5}
                            suffix="detik"
                            onChange={(value) => setData('speed', value)}
                        />
                        <RangeField
                            label="Sudut"
                            value={data.angle}
                            min={-60}
                            max={60}
                            step={1}
                            suffix="°"
                            onChange={(value) => setData('angle', value)}
                        />
                        <RangeField
                            label="Ukuran font"
                            value={data.font_size}
                            min={8}
                            max={24}
                            step={1}
                            suffix="px"
                            onChange={(value) => setData('font_size', value)}
                        />
                    </div>

                    <div className="flex flex-wrap items-end gap-3">
                        <div>
                            <span className="mb-1 block text-[10.5px] font-medium text-[#5B6474]">
                                Warna watermark
                            </span>
                            <div className="flex items-center gap-2">
                                <input
                                    type="color"
                                    value={data.color}
                                    onChange={(event) => setData('color', event.target.value.toUpperCase())}
                                    className="h-9 w-12 cursor-pointer rounded-lg border border-[#E3E8F0] bg-white p-1"
                                    aria-label="Pilih warna watermark"
                                />
                                <input
                                    value={data.color}
                                    maxLength={7}
                                    onChange={(event) => setData('color', event.target.value)}
                                    className="w-[100px] rounded-lg border border-[#E3E8F0] bg-white px-2 py-2 font-mono text-[11.5px] uppercase text-[#111827] outline-none focus:border-[#BA0C2F]/60"
                                    aria-label="Kode warna hex"
                                />
                            </div>
                        </div>

                        <label className="flex items-center gap-2 rounded-xl border border-[#E3E8F0] px-3 py-2">
                            <input
                                type="checkbox"
                                checked={data.pdf_enabled}
                                onChange={(event) => setData('pdf_enabled', event.target.checked)}
                                className="h-4 w-4 accent-[#BA0C2F]"
                            />
                            <span className="text-[12px] font-medium text-[#111827]">
                                Watermark di PDF
                            </span>
                        </label>
                    </div>

                    <div className="relative overflow-hidden rounded-xl border border-[#E3E8F0] bg-[#F5F7FA]">
                        <style>{`
                            @keyframes bt-wm-preview-slide {
                                from { transform: translateX(0); }
                                to { transform: translateX(-50%); }
                            }
                            .bt-wm-preview-track {
                                display: flex; width: max-content;
                                animation-name: bt-wm-preview-slide;
                                animation-timing-function: linear;
                                animation-iteration-count: infinite;
                            }
                            .bt-wm-preview-half { display: flex; flex: none; }
                            .bt-wm-preview-item {
                                display: inline-flex; flex-direction: column; gap: 1px;
                                margin-right: 44px; white-space: nowrap;
                            }
                        `}</style>

                        <div className="relative h-[168px] overflow-hidden">
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div
                                    className="bt-wm-preview-track"
                                    style={{
                                        color: data.color,
                                        opacity: data.opacity,
                                        fontSize: `${data.font_size}px`,
                                        animationDuration: `${data.speed}s`,
                                        transform: `rotate(${data.angle}deg)`,
                                    }}
                                >
                                    {[0, 1].map((half) => (
                                        <div key={half} className="bt-wm-preview-half">
                                            {[0, 1, 2, 3].map((tile) => (
                                                <span key={tile} className="bt-wm-preview-item">
                                                    <span className="font-semibold uppercase tracking-wider">
                                                        {preview(data.line1)}
                                                    </span>
                                                    <span className="font-mono text-[0.88em]">
                                                        {preview(data.line2)}
                                                    </span>
                                                </span>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <span className="absolute left-3 top-3 rounded bg-white/85 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-[#5B6474]">
                            Pratinjau · opacity {Math.round(data.opacity * 100)}% · {data.speed}s
                        </span>
                    </div>

                    {Object.keys(errors).length > 0 && (
                        <ul className="list-inside list-disc rounded-lg bg-[#FBE9E9] px-3 py-2 text-[11.5px] text-[#C94C4C]">
                            {Object.values(errors).map((message, index) => (
                                <li key={index}>{message}</li>
                            ))}
                        </ul>
                    )}

                    <div className="flex flex-wrap gap-2">
                        <button type="submit" disabled={processing} className={BTN}>
                            <ShieldCheck size={13} /> Simpan
                        </button>
                        <button
                            type="button"
                            disabled={processing}
                            onClick={() => {
                                post('/developer/watermark/reset', { preserveScroll: true });
                            }}
                            className={BTN_GHOST}
                        >
                            Reset default
                        </button>
                    </div>
                </form>
            </Card>
        </div>
    );
}
