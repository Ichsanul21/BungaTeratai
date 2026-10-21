import EmptyState from '@/Components/ui/EmptyState';
import PageHeader from '@/Components/ui/PageHeader';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { type LucideIcon } from 'lucide-react';
import { PropsWithChildren } from 'react';

export default function ModulePlaceholder({
    title,
    description,
    icon,
    children,
}: PropsWithChildren<{
    title: string;
    description: string;
    icon?: LucideIcon;
}>) {
    return (
        <AuthenticatedLayout>
            <Head title={title} />
            <PageHeader title={title} description={description} />
            {children ?? (
                <EmptyState
                    icon={icon}
                    title="Modul sedang disiapkan"
                    description="Halaman ini akan menampilkan data demo pada tahap implementasi berikutnya."
                />
            )}
        </AuthenticatedLayout>
    );
}
