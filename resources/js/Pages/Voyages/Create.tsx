import PageHeader from '@/Components/ui/PageHeader';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import VoyageForm from '@/Pages/Voyages/VoyageForm';
import { type PageProps } from '@/types';
import { Head } from '@inertiajs/react';

export default function Create({
    vessels,
    customers,
}: PageProps<{
    vessels: Array<{ id: number; vessel_name: string; vessel_type: string; navigation_type: string }>;
    customers: Array<{ id: number; name: string }>;
}>) {
    return (
        <AuthenticatedLayout>
            <Head title="Buat Perjalanan" />
            <PageHeader
                title="Buat Perjalanan"
                description="Checklist dokumen dibuat otomatis sesuai jenis kapal, tipe navigasi, dan muatan."
            />
            <VoyageForm vessels={vessels} customers={customers} />
        </AuthenticatedLayout>
    );
}
