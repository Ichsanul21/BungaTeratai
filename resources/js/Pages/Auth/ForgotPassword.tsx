import GuestLayout from '@/Layouts/GuestLayout';
import { Head, useForm } from '@inertiajs/react';
import { Alert, Button, Form, Input } from 'antd';
import { Mail } from 'lucide-react';
import { FormEventHandler } from 'react';

export default function ForgotPassword({ status }: { status?: string }) {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('password.email'));
    };

    return (
        <GuestLayout>
            <Head title="Lupa Kata Sandi" />

            <div className="mb-6 text-sm text-[#111827]/70">
                Lupa kata sandi? Tidak masalah. Masukkan email Anda dan kami akan mengirimkan
                tautan reset kata sandi.
            </div>

            {status && (
                <Alert type="success" message={status} showIcon className="mb-6" />
            )}

            {errors.email && (
                <Alert type="error" message={errors.email} showIcon className="mb-6" />
            )}

            <form onSubmit={submit}>
                <Form.Item
                    label={<span className="text-sm font-medium">Email</span>}
                    validateStatus={errors.email ? 'error' : undefined}
                >
                    <Input
                        prefix={<Mail size={16} className="text-[#5B6474]" />}
                        type="email"
                        name="email"
                        value={data.email}
                        autoFocus
                        autoComplete="username"
                        onChange={(e) => setData('email', e.target.value)}
                        placeholder="nama@bungateratai.co.id"
                        size="large"
                    />
                </Form.Item>

                <div className="mt-6 flex justify-end">
                    <Button type="primary" htmlType="submit" size="large" loading={processing}>
                        Kirim Tautan Reset
                    </Button>
                </div>
            </form>
        </GuestLayout>
    );
}
