import GuestLayout from '@/Layouts/GuestLayout';
import { Head, useForm } from '@inertiajs/react';
import { Button, Form, Input } from 'antd';
import { Lock } from 'lucide-react';
import { FormEventHandler } from 'react';

export default function ConfirmPassword() {
    const { data, setData, post, processing, errors, reset } = useForm({
        password: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('password.confirm'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <GuestLayout>
            <Head title="Konfirmasi Kata Sandi" />

            <div className="mb-6 text-sm text-[#1C1B1A]/70">
                Ini adalah area aman aplikasi. Harap konfirmasi kata sandi Anda sebelum melanjutkan.
            </div>

            <form onSubmit={submit}>
                <Form.Item
                    label={<span className="text-sm font-medium">Kata Sandi</span>}
                    validateStatus={errors.password ? 'error' : undefined}
                    help={errors.password}
                >
                    <Input.Password
                        prefix={<Lock size={16} className="text-[#8A8580]" />}
                        name="password"
                        value={data.password}
                        autoComplete="current-password"
                        autoFocus
                        onChange={(e) => setData('password', e.target.value)}
                        placeholder="••••••••"
                        size="large"
                    />
                </Form.Item>

                <div className="mt-6 flex justify-end">
                    <Button type="primary" htmlType="submit" size="large" loading={processing}>
                        Konfirmasi
                    </Button>
                </div>
            </form>
        </GuestLayout>
    );
}
