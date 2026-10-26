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

function trimDecimals(value: string, decimalPlaces: number): string {
    const [integerPart = '', decimalPart] = value.split('.');
    if (decimalPart === undefined) return value;
    if (decimalPlaces <= 0) return integerPart;
    const decimals = decimalPart.slice(0, Math.max(0, decimalPlaces));
    return `${integerPart}.${decimals}`;
}

/** Parses a localized edit/paste value into the canonical dot-decimal string. */
export function parseNumericInput(
    value: string | number | null | undefined,
    decimalPlaces = 0,
    groupedEdit = false,
): string {
    if (value === null || value === undefined) return '';
    const text = String(value).trim();
    if (!text) return '';

    let clean = text.replace(/[^\d.,-]/g, '');
    const negative = clean.startsWith('-');
    clean = clean.replace(/-/g, '');

    if (clean.includes(',')) {
        const comma = clean.lastIndexOf(',');
        clean = clean.slice(0, comma).replace(/[.,]/g, '') + '.' + clean.slice(comma + 1).replace(/\D/g, '');
    } else if (groupedEdit) {
        clean = clean.replace(/\./g, '');
    } else if ((clean.match(/\./g) ?? []).length > 1) {
        const decimalIndex = clean.lastIndexOf('.');
        const decimalPart = clean.slice(decimalIndex + 1);
        const integerPart = clean.slice(0, decimalIndex).replace(/\./g, '');
        clean = decimalPlaces > 0 && decimalPart.length <= decimalPlaces
            ? `${integerPart}.${decimalPart}`
            : integerPart + decimalPart;
    } else if (clean.includes('.')) {
        const [integerPart, decimalPart = ''] = clean.split('.');
        const grouped = /^\d{1,3}$/.test(integerPart) && decimalPart.length === 3;
        if (grouped) {
            clean = integerPart + decimalPart;
        }
    }

    clean = clean.replace(/[^\d.]/g, '');
    const decimalIndex = clean.indexOf('.');
    if (decimalIndex >= 0) {
        clean = clean.slice(0, decimalIndex + 1) + clean.slice(decimalIndex + 1).replace(/\./g, '');
        clean = trimDecimals(clean, decimalPlaces);
    }

    return `${negative ? '-' : ''}${clean}`;
}

/** Normalizes an API/form value, where a single period is always a decimal separator. */
export function parseNumericValue(
    value: string | number | null | undefined,
    decimalPlaces = 0,
): string {
    if (value === null || value === undefined || value === '') return '';
    const text = String(value).trim();
    if (!text) return '';
    if (text.includes(',')) return parseNumericInput(text, decimalPlaces);

    let clean = text.replace(/[^\d.,-]/g, '');
    const negative = clean.startsWith('-');
    clean = clean.replace(/-/g, '');
    if ((clean.match(/\./g) ?? []).length > 1) clean = clean.replace(/\./g, '');
    clean = clean.replace(/[^\d.]/g, '');
    const point = clean.indexOf('.');
    if (point >= 0) {
        clean = clean.slice(0, point + 1) + clean.slice(point + 1).replace(/\./g, '');
        clean = trimDecimals(clean, decimalPlaces);
    }
    return `${negative ? '-' : ''}${clean}`;
}

/** Formats a canonical numeric string for Indonesian UI input. */
export function formatNumericInput(
    value: string | number | null | undefined,
    decimalPlaces = 0,
): string {
    const raw = parseNumericValue(value, decimalPlaces);
    if (!raw) return '';

    const negative = raw.startsWith('-');
    const unsigned = negative ? raw.slice(1) : raw;
    const [integerPart, decimalPart] = unsigned.split('.');
    const groupedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const formatted = `${negative ? '-' : ''}${groupedInteger}`;
    if (decimalPart === undefined) return formatted;
    return `${formatted},${decimalPart}`;
}

export function formatNumericEdit(
    previousDisplay: string,
    inputValue: string,
    selectionStart: number,
    inputType: string,
    decimalPlaces = 0,
): { raw: string; display: string; caret: number } {
    const pasted = inputType === 'insertFromPaste' || inputType === 'insertFromDrop';
    const previousDotCount = (previousDisplay.match(/\./g) ?? []).length;
    const inputDotCount = (inputValue.match(/\./g) ?? []).length;
    const dotAdded = inputType === 'insertText' && inputDotCount > previousDotCount;
    const groupedEdit = previousDisplay.includes('.') && !inputValue.includes(',') && !pasted && !dotAdded;

    if (inputType === 'deleteContentBackward' || inputType === 'deleteContentForward') {
        const previousDigits = previousDisplay.replace(/\D/g, '');
        const nextDigits = inputValue.replace(/\D/g, '');
        const separatorIndex = inputType === 'deleteContentBackward'
            ? selectionStart - 1
            : selectionStart;
        if (
            previousDigits === nextDigits &&
            (previousDisplay[separatorIndex] === '.' || previousDisplay[separatorIndex] === ',')
        ) {
            const caret = separatorIndex + (inputType === 'deleteContentForward' ? 1 : 0);
            return {
                raw: parseNumericInput(previousDisplay, decimalPlaces),
                display: previousDisplay,
                caret,
            };
        }
    }

    const raw = parseNumericInput(inputValue, decimalPlaces, groupedEdit);
    const display = formatNumericInput(raw, decimalPlaces);
    const prefix = inputValue.slice(0, selectionStart);
    const digitsBeforeCaret = (prefix.match(/\d/g) ?? []).length;
    const decimalBeforeCaret = prefix.includes(',');

    let caret = 0;
    let digitsSeen = 0;
    while (caret < display.length && digitsSeen < digitsBeforeCaret) {
        if (/\d/.test(display[caret])) digitsSeen += 1;
        caret += 1;
    }
    if (decimalBeforeCaret || (dotAdded && inputValue.endsWith('.'))) {
        const decimalIndex = display.indexOf(',');
        if (decimalIndex >= 0) caret = Math.max(caret, decimalIndex + 1);
    }

    return { raw, display, caret };
}

export function formatPriceInput(value: string | number | null | undefined): string {
    return formatNumericInput(value, 2);
}

export function parsePriceInput(value: string | number | null | undefined): string {
    return parseNumericInput(value, 2);
}
