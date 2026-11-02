import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps } from '@/types';
import { Head } from '@inertiajs/react';
import DeleteUserForm from './Partials/DeleteUserForm';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';
import PageHeader from '@/Components/ui/PageHeader';

export default function Edit({
    mustVerifyEmail,
    status,
}: PageProps<{ mustVerifyEmail: boolean; status?: string }>) {
    return (
        <AuthenticatedLayout>
            <Head title="Profile" />

            <PageHeader title="Profile" />

            <div className="mx-auto max-w-7xl space-y-6">
                <div className="rounded-xl border border-[#E7E1D9] bg-white p-6 shadow-sm">
                    <UpdateProfileInformationForm
                        mustVerifyEmail={mustVerifyEmail}
                        status={status}
                        className="max-w-xl"
                    />
                </div>

                <div className="rounded-xl border border-[#E7E1D9] bg-white p-6 shadow-sm">
                    <UpdatePasswordForm className="max-w-xl" />
                </div>

                <div className="rounded-xl border border-[#E7E1D9] bg-white p-6 shadow-sm">
                    <DeleteUserForm className="max-w-xl" />
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
