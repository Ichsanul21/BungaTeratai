export function formatRupiah(value: number | null | undefined): string {
    if (value === null || value === undefined) return 'Rp 0';
    return 'Rp ' + new Intl.NumberFormat('id-ID').format(Math.round(value));
}

export function formatNumber(
    value: number | null | undefined,
    digits = 0,
): string {
    if (value === null || value === undefined) return '0';
    return new Intl.NumberFormat('id-ID', {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
    }).format(value);
}

export function formatDate(value: string | null | undefined): string {
    if (!value) return '—';
    const d = new Date(value.replace(' ', 'T'));
    if (isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(d);
}

export function formatDateTime(value: string | null | undefined): string {
    if (!value) return '—';
    const d = new Date(value.replace(' ', 'T'));
    if (isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(d);
}

/** Sisa hari sampai tanggal (negatif = lewat). */
export function daysUntil(value: string | null | undefined): number | null {
    if (!value) return null;
    const target = new Date(value.replace(' ', 'T'));
    if (isNaN(target.getTime())) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export function validityOf(
    hasExpiry: boolean,
    expiryDate: string | null | undefined,
    thresholdDays = 30,
): 'normal' | 'expiring_soon' | 'expired' | 'no_expiry' {
    if (!hasExpiry || !expiryDate) return 'no_expiry';
    const days = daysUntil(expiryDate);
    if (days === null) return 'no_expiry';
    if (days < 0) return 'expired';
    if (days <= thresholdDays) return 'expiring_soon';
    return 'normal';
}

export function classNames(...parts: Array<string | false | null | undefined>): string {
    return parts.filter(Boolean).join(' ');
}
