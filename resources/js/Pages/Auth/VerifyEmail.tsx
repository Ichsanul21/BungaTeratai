import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { Alert, Button } from 'antd';
import { Mail } from 'lucide-react';
import { FormEventHandler } from 'react';

export default function VerifyEmail({ status }: { status?: string }) {
    const { post, processing } = useForm({});

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('verification.send'));
    };

    return (
        <GuestLayout>
            <Head title="Verifikasi Email" />

            <div className="mb-6 text-sm text-[#1C1B1A]/70">
                Terima kasih telah mendaftar! Sebelum memulai, harap verifikasi alamat email Anda
                dengan mengklik tautan yang baru saja kami kirim. Jika tidak menerima email, kami
                akan dengan senang hati mengirimkan ulang.
            </div>

            {status === 'verification-link-sent' && (
                <Alert
                    type="success"
                    message="Tautan verifikasi baru telah dikirim ke email Anda."
                    showIcon
                    className="mb-6"
                />
            )}

            <form onSubmit={submit}>
                <div className="mt-6 flex items-center justify-between gap-4">
                    <Button
                        type="primary"
                        htmlType="submit"
                        size="large"
                        loading={processing}
                        icon={<Mail size={16} />}
                    >
                        Kirim Ulang Email Verifikasi
                    </Button>

                    <Link
                        href={route('logout')}
                        method="post"
                        as="button"
                        className="text-sm text-[#1C1B1A]/70 underline hover:text-[#C1121F]"
                    >
                        Keluar
                    </Link>
                </div>
            </form>
        </GuestLayout>
    );
}
