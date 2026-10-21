import PageHeader from '@/Components/ui/PageHeader';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import VesselForm from '@/Pages/Fleet/VesselForm';
import { Head } from '@inertiajs/react';

export default function FleetEdit({ vessel }: { vessel: Record<string, any> }) {
    return (
        <AuthenticatedLayout>
            <Head title={`Edit — ${vessel.vessel_name}`} />
            <PageHeader
                title={`Edit: ${vessel.vessel_name}`}
                description="Perbarui data identitas, spesifikasi, dan status kapal."
            />
            <VesselForm vessel={vessel} isEdit />
        </AuthenticatedLayout>
    );
}