import Modal from '@/Components/Modal';
import SecondaryButton from '@/Components/SecondaryButton';
import { useForm } from '@inertiajs/react';
import { FormEventHandler, useRef, useState } from 'react';
import { Button, Input } from 'antd';

const FormError = ({ message }: { message?: string }) =>
    message ? <div className="mt-1 text-xs text-[#C1121F]">{message}</div> : null;

export default function DeleteUserForm({
    className = '',
}: {
    className?: string;
}) {
    const [confirmingUserDeletion, setConfirmingUserDeletion] = useState(false);
    const passwordInput = useRef<HTMLInputElement>(null);

    const {
        data,
        setData,
        delete: destroy,
        processing,
        reset,
        errors,
        clearErrors,
    } = useForm({
        password: '',
    });

    const confirmUserDeletion = () => {
        setConfirmingUserDeletion(true);
    };

    const deleteUser: FormEventHandler = (e) => {
        e.preventDefault();

        destroy(route('profile.destroy'), {
            preserveScroll: true,
            onSuccess: () => closeModal(),
            onError: () => passwordInput.current?.focus(),
            onFinish: () => reset(),
        });
    };

    const closeModal = () => {
        setConfirmingUserDeletion(false);

        clearErrors();
        reset();
    };

    return (
        <section className={`space-y-6 ${className}`}>
            <header>
                <h2 className="text-lg font-medium text-[#1C1B1A]">
                    Delete Account
                </h2>

                <p className="mt-1 text-sm text-[#8A8580]">
                    Once your account is deleted, all of its resources and data
                    will be permanently deleted. Before deleting your account,
                    please download any data or information that you wish to
                    retain.
                </p>
            </header>

            <Button danger onClick={confirmUserDeletion}>
                Delete Account
            </Button>

            <Modal show={confirmingUserDeletion} onClose={closeModal}>
                <form onSubmit={deleteUser} className="p-6">
                    <h2 className="text-lg font-medium text-[#1C1B1A]">
                        Are you sure you want to delete your account?
                    </h2>

                    <p className="mt-1 text-sm text-[#8A8580]">
                        Once your account is deleted, all of its resources and
                        data will be permanently deleted. Please enter your
                        password to confirm you would like to permanently delete
                        your account.
                    </p>

                    <div className="mt-6">
                        <label className="sr-only">Password</label>
                        <Input.Password
                            value={data.password}
                            onChange={(e) =>
                                setData('password', e.target.value)
                            }
                            autoFocus
                            placeholder="Password"
                        />
                        <FormError message={errors.password} />
                    </div>

                    <div className="mt-6 flex justify-end">
                        <SecondaryButton onClick={closeModal}>
                            Cancel
                        </SecondaryButton>

                        <Button
                            danger
                            htmlType="submit"
                            disabled={processing}
                            className="ms-3"
                        >
                            Delete Account
                        </Button>
                    </div>
                </form>
            </Modal>
        </section>
    );
}
