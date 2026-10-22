import Checkbox from '@/Components/Checkbox';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { DEMO_ACCOUNTS } from '@/Constants/navigation';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export default function Login({
    status,
    canResetPassword,
}: {
    status?: string;
    canResetPassword: boolean;
}) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false as boolean,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    const fillDemo = (email: string) => {
        setData('email', email);
        setData('password', 'password');
    };

    return (
        <GuestLayout>
            <Head title="Masuk" />

            <div className="mb-6 text-center">
                <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-lg font-bold text-white">
                    P
                </div>
                <h1 className="text-lg font-semibold text-ink">
                    Bunga Teratai System
                </h1>
                <p className="mt-0.5 text-xs text-muted">
                    Maritime Document &amp; Operations Management
                </p>
                <span className="mt-2 inline-flex items-center rounded border border-primary/50 bg-primary/10 px-2 py-0.5 text-[10px] font-bold tracking-widest text-primary">
                    DEMO DATA
                </span>
            </div>

            {status && (
                <div className="mb-4 text-sm font-medium text-ok">{status}</div>
            )}

            <form onSubmit={submit}>
                <div>
                    <InputLabel htmlFor="email" value="Email" />

                    <TextInput
                        id="email"
                        type="email"
                        name="email"
                        value={data.email}
                        className="mt-1 block w-full"
                        autoComplete="username"
                        isFocused={true}
                        onChange={(e) => setData('email', e.target.value)}
                    />

                    <InputError message={errors.email} className="mt-2" />
                </div>

                <div className="mt-4">
                    <InputLabel htmlFor="password" value="Kata Sandi" />

                    <TextInput
                        id="password"
                        type="password"
                        name="password"
                        value={data.password}
                        className="mt-1 block w-full"
                        autoComplete="current-password"
                        onChange={(e) => setData('password', e.target.value)}
                    />

                    <InputError message={errors.password} className="mt-2" />
                </div>

                <div className="mt-4 block">
                    <label className="flex items-center">
                        <Checkbox
                            name="remember"
                            checked={data.remember}
                            onChange={(e) =>
                                setData(
                                    'remember',
                                    (e.target.checked || false) as false,
                                )
                            }
                        />
                        <span className="ms-2 text-sm text-muted">
                            Ingat saya
                        </span>
                    </label>
                </div>

                <div className="mt-4 flex items-center justify-between">
                    {canResetPassword && (
                        <Link
                            href={route('password.request')}
                            className="text-sm text-muted underline hover:text-ink"
                        >
                            Lupa kata sandi?
                        </Link>
                    )}

                    <PrimaryButton className="ms-4" disabled={processing}>
                        Masuk
                    </PrimaryButton>
                </div>
            </form>

            <div className="mt-6 rounded-xl border border-hairline bg-appbg p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                    Akun demo — klik untuk mengisi (sandi: password)
                </p>
                <div className="grid grid-cols-1 gap-1.5">
                    {DEMO_ACCOUNTS.map((acc) => (
                        <button
                            key={acc.email}
                            type="button"
                            onClick={() => fillDemo(acc.email)}
                            className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left text-xs transition ${
                                data.email === acc.email
                                    ? 'border-primary bg-white shadow-sm'
                                    : 'border-hairline bg-white hover:border-primary/50'
                            }`}
                        >
                            <span className="font-medium text-ink">{acc.role}</span>
                            <span className="text-muted">{acc.email}</span>
                        </button>
                    ))}
                </div>
            </div>
        </GuestLayout>
    );
}
