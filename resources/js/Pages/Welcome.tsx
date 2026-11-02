import { PageProps } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { Button, Card, Row, Col, Typography } from 'antd';
import { Ship } from 'lucide-react';

const { Title, Text } = Typography;

export default function Welcome({
    auth,
    laravelVersion,
    phpVersion,
}: PageProps<{ laravelVersion: string; phpVersion: string }>) {
    return (
        <>
            <Head title="Welcome" />
            <div style={{ background: '#FAF7F2', minHeight: '100vh' }}>
                <div className="relative flex min-h-screen flex-col items-center justify-center">
                    <div className="relative w-full max-w-7xl px-6">
                        <header className="grid grid-cols-2 items-center gap-2 py-10 lg:grid-cols-3">
                            <div className="flex lg:col-start-2 lg:justify-center">
                                <Ship size={48} style={{ color: '#C1121F' }} />
                            </div>
                            <nav className="-mx-3 flex flex-1 justify-end">
                                {auth.user ? (
                                    <Link href={route('dashboard')}>
                                        <Button type="link">Dashboard</Button>
                                    </Link>
                                ) : (
                                    <>
                                        <Link href={route('login')}>
                                            <Button type="link">Log in</Button>
                                        </Link>
                                        <Link href={route('register')}>
                                            <Button type="link">Register</Button>
                                        </Link>
                                    </>
                                )}
                            </nav>
                        </header>

                        <main className="mt-6">
                            <div className="mb-12 text-center">
                                <Title level={1} style={{ color: '#1C1B1A', fontWeight: 700 }}>
                                    Bunga Teratai
                                </Title>
                                <Text style={{ fontSize: 18, color: '#8A8580' }}>
                                    Sistem ERP Manajemen Dokumen & Operasi Pelayaran
                                </Text>
                            </div>

                            <Row gutter={[24, 24]}>
                                <Col xs={24} md={12} lg={8}>
                                    <Card
                                        style={{ height: '100%', borderRadius: 12, border: '1px solid #E7E1D9' }}
                                        styles={{ body: { padding: 24 } }}
                                    >
                                        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full" style={{ background: '#C1121F1A' }}>
                                            <Ship size={24} style={{ color: '#C1121F' }} />
                                        </div>
                                        <Title level={4} style={{ color: '#1C1B1A', margin: 0 }}>
                                            Manajemen Armada
                                        </Title>
                                        <Text style={{ color: '#8A8580', display: 'block', marginTop: 12 }}>
                                            Kelola data kapal, dokumen, dan operasional armada dengan sistem terpadu.
                                        </Text>
                                    </Card>
                                </Col>

                                <Col xs={24} md={12} lg={8}>
                                    <Card
                                        style={{ height: '100%', borderRadius: 12, border: '1px solid #E7E1D9' }}
                                        styles={{ body: { padding: 24 } }}
                                    >
                                        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full" style={{ background: '#1E46681A' }}>
                                            <Ship size={24} style={{ color: '#1E4668' }} />
                                        </div>
                                        <Title level={4} style={{ color: '#1C1B1A', margin: 0 }}>
                                            Perjalanan & Voyage
                                        </Title>
                                        <Text style={{ color: '#8A8580', display: 'block', marginTop: 12 }}>
                                            Pantau perjalanan kapal, status, dan dokumen perjalanan secara real-time.
                                        </Text>
                                    </Card>
                                </Col>

                                <Col xs={24} md={12} lg={8}>
                                    <Card
                                        style={{ height: '100%', borderRadius: 12, border: '1px solid #E7E1D9' }}
                                        styles={{ body: { padding: 24 } }}
                                    >
                                        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full" style={{ background: '#2F8F681A' }}>
                                            <Ship size={24} style={{ color: '#2F8F68' }} />
                                        </div>
                                        <Title level={4} style={{ color: '#1C1B1A', margin: 0 }}>
                                            Keuangan & Invoice
                                        </Title>
                                        <Text style={{ color: '#8A8580', display: 'block', marginTop: 12 }}>
                                            Kelola invoice, pembayaran, dan laporan keuangan dengan mudah.
                                        </Text>
                                    </Card>
                                </Col>
                            </Row>

                            {!auth.user && (
                                <div className="mt-12 text-center">
                                    <Link href={route('login')}>
                                        <Button type="primary" size="large" style={{ background: '#C1121F', borderColor: '#C1121F' }}>
                                            Masuk ke Sistem
                                        </Button>
                                    </Link>
                                </div>
                            )}
                        </main>

                        <footer className="py-16 text-center">
                            <Text style={{ color: '#8A8580' }}>
                                Laravel v{laravelVersion} (PHP v{phpVersion})
                            </Text>
                        </footer>
                    </div>
                </div>
            </div>
        </>
    );
}
