import PrimaryButton from '@/Components/PrimaryButton';
import { useForm } from '@inertiajs/react';
import { FormEventHandler, useRef } from 'react';
import { Input } from 'antd';

const FormLabel = ({ children }: { children: React.ReactNode }) => (
    <label className="mb-1 block text-sm font-medium text-[#1C1B1A]">{children}</label>
);

const FormError = ({ message }: { message?: string }) =>
    message ? <div className="mt-1 text-xs text-[#C1121F]">{message}</div> : null;

export default function UpdatePasswordForm({
    className = '',
}: {
    className?: string;
}) {
    const passwordInput = useRef<HTMLInputElement>(null);
    const currentPasswordInput = useRef<HTMLInputElement>(null);

    const {
        data,
        setData,
        errors,
        put,
        reset,
        processing,
        recentlySuccessful,
    } = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const updatePassword: FormEventHandler = (e) => {
        e.preventDefault();

        put(route('password.update'), {
            preserveScroll: true,
            onSuccess: () => reset(),
            onError: (errors) => {
                if (errors.password) {
                    reset('password', 'password_confirmation');
                    passwordInput.current?.focus();
                }

                if (errors.current_password) {
                    reset('current_password');
                    currentPasswordInput.current?.focus();
                }
            },
        });
    };

    return (
        <section className={className}>
            <header>
                <h2 className="text-lg font-medium text-[#1C1B1A]">
                    Update Password
                </h2>

                <p className="mt-1 text-sm text-[#8A8580]">
                    Ensure your account is using a long, random password to stay
                    secure.
                </p>
            </header>

            <form onSubmit={updatePassword} className="mt-6 space-y-6">
                <div>
                    <FormLabel>Current Password</FormLabel>
                    <Input.Password
                        value={data.current_password}
                        onChange={(e) =>
                            setData('current_password', e.target.value)
                        }
                        autoComplete="current-password"
                    />
                    <FormError message={errors.current_password} />
                </div>

                <div>
                    <FormLabel>New Password</FormLabel>
                    <Input.Password
                        value={data.password}
                        onChange={(e) => setData('password', e.target.value)}
                        autoComplete="new-password"
                    />
                    <FormError message={errors.password} />
                </div>

                <div>
                    <FormLabel>Confirm Password</FormLabel>
                    <Input.Password
                        value={data.password_confirmation}
                        onChange={(e) =>
                            setData('password_confirmation', e.target.value)
                        }
                        autoComplete="new-password"
                    />
                    <FormError message={errors.password_confirmation} />
                </div>

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
