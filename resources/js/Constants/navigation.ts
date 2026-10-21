import {
    Anchor,
    Bell,
    BookOpen,
    Boxes,
    ClipboardCheck,
    Cog,
    FileStack,
    Gauge,
    Landmark,
    LayoutDashboard,
    ScrollText,
    Ship,
    Users,
    type LucideIcon,
} from 'lucide-react';

export interface NavItem {
    href: string;
    label: string;
    icon: LucideIcon;
    roles: string[]; // kosong = semua role
    badge?: 'notifications';
}

export const NAV_ITEMS: NavItem[] = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: [] },
    {
        href: '/notifikasi',
        label: 'Notifikasi & Reminder',
        icon: Bell,
        roles: [],
        badge: 'notifications',
    },
    { href: '/dokumen', label: 'Document Center', icon: FileStack, roles: [] },
    { href: '/armada', label: 'Fleet Management', icon: Ship, roles: [] },
    { href: '/perjalanan', label: 'Voyage Management', icon: Anchor, roles: [] },
    { href: '/operasional', label: 'Operations', icon: Gauge, roles: [] },
    {
        href: '/persetujuan',
        label: 'Approvals',
        icon: ClipboardCheck,
        roles: ['super_admin', 'supervisor', 'management'],
    },
    {
        href: '/keuangan',
        label: 'Keuangan',
        icon: Landmark,
        roles: ['super_admin', 'finance', 'management', 'auditor'],
    },
    {
        href: '/inventory',
        label: 'Inventory',
        icon: Boxes,
        roles: ['super_admin', 'ship_ops', 'finance', 'management', 'auditor'],
    },
    {
        href: '/sdm',
        label: 'SDM & Karyawan',
        icon: Users,
        roles: ['super_admin', 'ship_ops', 'management', 'finance'],
    },
    { href: '/laporan', label: 'Laporan', icon: ScrollText, roles: [] },
    {
        href: '/audit',
        label: 'Audit Trail',
        icon: BookOpen,
        roles: ['super_admin', 'auditor', 'management'],
    },
    {
        href: '/pengaturan',
        label: 'Pengaturan',
        icon: Cog,
        roles: ['super_admin', 'doc_controller'],
    },
];

export const ROLE_LABELS: Record<string, string> = {
    super_admin: 'Super Admin',
    management: 'Management',
    ship_ops: 'Ship Operations',
    doc_controller: 'Document Controller',
    supervisor: 'Supervisor',
    finance: 'Finance',
    auditor: 'Auditor',
};

export function visibleNavItems(userRoles: string[]): NavItem[] {
    if (userRoles.includes('super_admin')) {
        return NAV_ITEMS;
    }
    return NAV_ITEMS.filter(
        (item) => item.roles.length === 0 || item.roles.some((r) => userRoles.includes(r)),
    );
}

export const DEMO_ACCOUNTS = [
    { role: 'Super Admin', email: 'admin@bungateratai.id' },
    { role: 'Management', email: 'management@bungateratai.id' },
    { role: 'Ship Operations', email: 'ops@bungateratai.id' },
    { role: 'Document Controller', email: 'dokumen@bungateratai.id' },
    { role: 'Supervisor', email: 'supervisor@bungateratai.id' },
    { role: 'Finance', email: 'finance@bungateratai.id' },
    { role: 'Auditor', email: 'auditor@bungateratai.id' },
];

// label status (pusat, dipakai seluruh UI)
export const VOYAGE_STATUS_LABELS: Record<string, string> = {
    draft: 'Draft',
    planned: 'Direncanakan',
    document_preparation: 'Persiapan Dokumen',
    internal_review: 'Pemeriksaan Internal',
    awaiting_external_approval: 'Menunggu Persetujuan Eksternal',
    ready_for_departure: 'Siap Berangkat',
    departed: 'Berangkat',
    in_transit: 'Dalam Pelayaran',
    arrived: 'Tiba',
    voyage_closure: 'Penutupan Perjalanan',
    completed: 'Selesai',
    delayed: 'Terlambat',
    cancelled: 'Dibatalkan',
};

export const VERIFICATION_STATUS_LABELS: Record<string, string> = {
    missing: 'Belum Ada',
    draft: 'Draft',
    uploaded: 'Terunggah',
    under_review: 'Dalam Tinjauan',
    revision_required: 'Perlu Revisi',
    verified: 'Terverifikasi',
    rejected: 'Ditolak',
    archived: 'Diarsipkan',
};

export const VALIDITY_LABELS: Record<string, string> = {
    normal: 'Normal',
    expiring_soon: 'Mendekati Kedaluwarsa',
    expired: 'Kedaluwarsa',
    no_expiry: 'Tanpa Masa Berlaku',
};
