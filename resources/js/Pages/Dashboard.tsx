import StatCard from '@/Components/ui/StatCard';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import {
    Anchor,
    BellRing,
    FileWarning,
    Fuel,
    Ship,
    Wallet,
} from 'lucide-react';

export default function Dashboard() {
    return (
        <AuthenticatedLayout>
            <Head title="Dashboard" />

            <div className="mb-6">
                <h1 className="text-2xl font-semibold tracking-tight text-ink">
                    Executive Dashboard
                </h1>
                <p className="mt-1 text-sm text-muted">
                    Gambaran kesiapan armada, dokumen, perjalanan, dan keuangan.
                    Indikator kesiapan bersifat internal — bukan persetujuan otoritas.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                <StatCard label="Total Armada" value="—" icon={Ship} sub="terdaftar" />
                <StatCard
                    label="Siap Administratif"
                    value="—"
                    icon={Anchor}
                    tone="success"
                    sub="dokumen lengkap"
                />
                <StatCard
                    label="Perlu Tindak Lanjut"
                    value="—"
                    icon={FileWarning}
                    tone="warning"
                    sub="dokumen bermasalah"
                />
                <StatCard
                    label="Perjalanan Aktif"
                    value="—"
                    icon={Anchor}
                    tone="info"
                    sub="berjalan"
                />
                <StatCard
                    label="Dokumen Expiring"
                    value="—"
                    icon={BellRing}
                    tone="danger"
                    sub="≤ 30 hari"
                />
                <StatCard
                    label="Anomali BBM"
                    value="—"
                    icon={Fuel}
                    tone="danger"
                    sub="trip tidak normal"
                />
                <StatCard label="Piutang Outstanding" value="—" icon={Wallet} sub="AR" />
                <StatCard label="Kas & Bank" value="—" icon={Wallet} tone="success" sub="saldo" />
            </div>

            <div className="mt-6 rounded-xl border border-dashed border-hairline bg-white p-8 text-center text-sm text-muted">
                Grafik, daftar tindak lanjut, dan aktivitas terbaru akan tampil di sini
                setelah data demo dimuat (Phase 7).
            </div>
        </AuthenticatedLayout>
    );
}
