import { classNames, formatNumber } from '@/lib/format';
import { type LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

export default function StatCard({
    label,
    value,
    sub,
    icon: Icon,
    tone = 'neutral',
    onClick,
}: {
    label: string;
    value: ReactNode;
    sub?: string;
    icon?: LucideIcon;
    tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
    onClick?: () => void;
}) {
    const tones: Record<string, string> = {
        neutral: 'text-ink bg-appbg',
        success: 'text-ok bg-ok/10',
        warning: 'text-warn bg-warn/10',
        danger: 'text-primary bg-primary/10',
        info: 'text-maritime bg-maritime/10',
    };

    return (
        <div
            onClick={onClick}
            className={classNames(
                'rounded-xl border border-hairline bg-white p-4 shadow-sm',
                onClick && 'cursor-pointer transition hover:border-primary/40 hover:shadow',
            )}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="truncate text-xs font-medium uppercase tracking-wide text-muted">
                        {label}
                    </p>
                    <p className="mt-1.5 text-2xl font-semibold tabular-nums text-ink">
                        {typeof value === 'number' ? formatNumber(value) : value}
                    </p>
                    {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
                </div>
                {Icon && (
                    <span
                        className={classNames(
                            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                            tones[tone],
                        )}
                    >
                        <Icon className="h-4.5 w-4.5" size={18} />
                    </span>
                )}
            </div>
        </div>
    );
}
