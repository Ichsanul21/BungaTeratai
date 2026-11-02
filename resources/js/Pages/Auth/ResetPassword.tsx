import GuestLayout from '@/Layouts/GuestLayout';
import { Head, useForm } from '@inertiajs/react';
import { Button, Form, Input } from 'antd';
import { Lock, Mail } from 'lucide-react';
import { FormEventHandler } from 'react';

export default function ResetPassword({
    token,
    email,
}: {
    token: string;
    email: string;
}) {
    const { data, setData, post, processing, errors, reset } = useForm({
        token: token,
        email: email,
        password: '',
        password_confirmation: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('password.store'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <GuestLayout>
            <Head title="Reset Kata Sandi" />

            <form onSubmit={submit}>
                <Form.Item
                    label={<span className="text-sm font-medium">Email</span>}
                    validateStatus={errors.email ? 'error' : undefined}
                    help={errors.email}
                >
                    <Input
                        prefix={<Mail size={16} className="text-[#8A8580]" />}
                        type="email"
                        name="email"
                        value={data.email}
                        autoComplete="username"
                        onChange={(e) => setData('email', e.target.value)}
                        size="large"
                    />
                </Form.Item>

                <Form.Item
                    label={<span className="text-sm font-medium">Kata Sandi Baru</span>}
                    validateStatus={errors.password ? 'error' : undefined}
                    help={errors.password}
                >
                    <Input.Password
                        prefix={<Lock size={16} className="text-[#8A8580]" />}
                        name="password"
                        value={data.password}
                        autoComplete="new-password"
                        autoFocus
                        onChange={(e) => setData('password', e.target.value)}
                        placeholder="••••••••"
                        size="large"
                    />
                </Form.Item>

                <Form.Item
                    label={<span className="text-sm font-medium">Konfirmasi Kata Sandi</span>}
                    validateStatus={errors.password_confirmation ? 'error' : undefined}
                    help={errors.password_confirmation}
                >
                    <Input.Password
                        prefix={<Lock size={16} className="text-[#8A8580]" />}
                        name="password_confirmation"
                        value={data.password_confirmation}
                        autoComplete="new-password"
                        onChange={(e) => setData('password_confirmation', e.target.value)}
                        placeholder="••••••••"
                        size="large"
                    />
                </Form.Item>

                <div className="mt-6 flex justify-end">
                    <Button type="primary" htmlType="submit" size="large" loading={processing}>
                        Reset Kata Sandi
                    </Button>
                </div>
            </form>
        </GuestLayout>
    );
}
