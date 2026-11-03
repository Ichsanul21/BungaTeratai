import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { Alert, Button, Form, Input } from 'antd';
import { Lock, Mail, User } from 'lucide-react';
import { FormEventHandler } from 'react';

export default function Register() {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('register'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <GuestLayout>
            <Head title="Daftar" />

            <form onSubmit={submit}>
                <Form.Item
                    label={<span className="text-sm font-medium">Nama</span>}
                    validateStatus={errors.name ? 'error' : undefined}
                    help={errors.name}
                >
                    <Input
                        prefix={<User size={16} className="text-[#5B6474]" />}
                        name="name"
                        value={data.name}
                        autoComplete="name"
                        autoFocus
                        onChange={(e) => setData('name', e.target.value)}
                        placeholder="Nama lengkap"
                        size="large"
                    />
                </Form.Item>

                <Form.Item
                    label={<span className="text-sm font-medium">Email</span>}
                    validateStatus={errors.email ? 'error' : undefined}
                    help={errors.email}
                >
                    <Input
                        prefix={<Mail size={16} className="text-[#5B6474]" />}
                        type="email"
                        name="email"
                        value={data.email}
                        autoComplete="username"
                        onChange={(e) => setData('email', e.target.value)}
                        placeholder="nama@bungateratai.co.id"
                        size="large"
                    />
                </Form.Item>

                <Form.Item
                    label={<span className="text-sm font-medium">Kata Sandi</span>}
                    validateStatus={errors.password ? 'error' : undefined}
                    help={errors.password}
                >
                    <Input.Password
                        prefix={<Lock size={16} className="text-[#5B6474]" />}
                        name="password"
                        value={data.password}
                        autoComplete="new-password"
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
                        prefix={<Lock size={16} className="text-[#5B6474]" />}
                        name="password_confirmation"
                        value={data.password_confirmation}
                        autoComplete="new-password"
                        onChange={(e) => setData('password_confirmation', e.target.value)}
                        placeholder="••••••••"
                        size="large"
                    />
                </Form.Item>

                <div className="mt-6 flex items-center justify-between gap-4">
                    <Link
                        href={route('login')}
                        className="text-sm text-[#111827]/70 underline hover:text-[#BA0C2F]"
                    >
                        Sudah punya akun?
                    </Link>

                    <Button type="primary" htmlType="submit" size="large" loading={processing}>
                        Daftar
                    </Button>
                </div>
            </form>
        </GuestLayout>
    );
}
