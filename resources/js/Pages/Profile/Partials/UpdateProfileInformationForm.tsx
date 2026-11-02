import PrimaryButton from '@/Components/PrimaryButton';
import { useForm, usePage, Link } from '@inertiajs/react';
import { FormEventHandler } from 'react';
import { Alert, Input } from 'antd';

const FormLabel = ({ children }: { children: React.ReactNode }) => (
    <label className="mb-1 block text-sm font-medium text-[#1C1B1A]">{children}</label>
);

const FormError = ({ message }: { message?: string }) =>
    message ? <div className="mt-1 text-xs text-[#C1121F]">{message}</div> : null;

export default function UpdateProfileInformation({
    mustVerifyEmail,
    status,
    className = '',
}: {
    mustVerifyEmail: boolean;
    status?: string;
    className?: string;
}) {
    const user = usePage().props.auth.user;

    const { data, setData, patch, errors, processing, recentlySuccessful } =
        useForm({
            name: user.name,
            email: user.email,
        });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        patch(route('profile.update'));
    };

    return (
        <section className={className}>
            <header>
                <h2 className="text-lg font-medium text-[#1C1B1A]">
                    Profile Information
                </h2>

                <p className="mt-1 text-sm text-[#8A8580]">
                    Update your account's profile information and email address.
                </p>
            </header>

            <form onSubmit={submit} className="mt-6 space-y-6">
                <div>
                    <FormLabel>Name</FormLabel>
                    <Input
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        required
                        autoFocus
                        autoComplete="name"
                    />
                    <FormError message={errors.name} />
                </div>

                <div>
                    <FormLabel>Email</FormLabel>
                    <Input
                        type="email"
                        value={data.email}
                        onChange={(e) => setData('email', e.target.value)}
                        required
                        autoComplete="username"
                    />
                    <FormError message={errors.email} />
                </div>

                {mustVerifyEmail && user.email_verified_at === null && (
                    <div>
                        <Alert
                            type="warning"
                            showIcon
                            message={
                                <span className="text-sm text-[#1C1B1A]">
                                    Your email address is unverified.{' '}
                                    <Link
                                        href={route('verification.send')}
                                        method="post"
                                        as="button"
                                        className="text-sm text-[#C1121F] underline hover:text-[#780000]"
                                    >
                                        Click here to re-send the verification email.
                                    </Link>
                                </span>
                            }
                        />

                        {status === 'verification-link-sent' && (
                            <Alert
                                type="success"
                                showIcon
                                message="A new verification link has been sent to your email address."
                                className="mt-2"
                            />
                        )}
                    </div>
                )}

                <div className="flex items-center gap-4">
                    <PrimaryButton disabled={processing}>Save</PrimaryButton>

                    {recentlySuccessful && (
                        <p className="text-sm text-[#8A8580]">Saved.</p>
                    )}
                </div>
            </form>
        </section>
    );
}
