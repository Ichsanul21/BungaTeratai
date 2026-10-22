import PageHeader from '@/Components/ui/PageHeader';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import VoyageForm from '@/Pages/Voyages/VoyageForm';
import { type PageProps } from '@/types';
import { Head } from '@inertiajs/react';

export default function Edit({
    voyage,
    vessels,
    customers,
}: PageProps<{
    voyage: Record<string, any>;
    vessels: Array<{ id: number; vessel_name: string; vessel_type: string; navigation_type: string }>;
    customers: Array<{ id: number; name: string }>;
}>) {
    return (
        <AuthenticatedLayout>
            <Head title={`Edit — ${voyage.voyage_code}`} />
            <PageHeader
                title={`Edit Perjalanan: ${voyage.voyage_code}`}
                description={`Status saat ini: ${voyage.voyage_status}. Perubahan tercatat di audit trail.`}
            />
            <VoyageForm voyage={voyage} vessels={vessels} customers={customers} isEdit />
        </AuthenticatedLayout>
    );
}
