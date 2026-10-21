import PageHeader from '@/Components/ui/PageHeader';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import VesselForm from '@/Pages/Fleet/VesselForm';
import { Head } from '@inertiajs/react';

export default function FleetCreate() {
    return (
        <AuthenticatedLayout>
            <Head title="Tambah Kapal" />
            <PageHeader
                title="Tambah Kapal"
                description="Registrasi kapal baru ke dalam armada."
            />
            <VesselForm />
        </AuthenticatedLayout>
    );
}