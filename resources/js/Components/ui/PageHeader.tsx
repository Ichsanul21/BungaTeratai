import { ReactNode } from 'react';

export interface PageHeaderMetric {
    label: string;
    value: ReactNode;
    sub?: string;
    tone?: 'neutral' | 'primary' | 'navy' | 'success' | 'warning' | 'danger';
}

const TONE: Record<string, string> = {
    neutral: '#111827',
    primary: '#BA0C2F',
    navy: '#00205B',
    success: '#15803D',
    warning: '#B45309',
    danger: '#BA0C2F',
};

export default function PageHeader({
    title,
    description,
    actions,
    eyebrow,
    metrics,
}: {
    title: string;
    description?: string;
    actions?: ReactNode;
    eyebrow?: string;
    metrics?: PageHeaderMetric[];
}) {
    return (
        <div className="mb-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0">
                    {eyebrow && (
                        <p className="mb-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-[#5B6474]">
                            {eyebrow}
                        </p>
                    )}
                    <h1 className="text-[26px] font-semibold leading-tight tracking-tight text-[#111827]">
                        {title}
                    </h1>
                    {description && (
                        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-[#5B6474]">{description}</p>
                    )}
                </div>
                {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
            </div>

            {metrics && metrics.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {metrics.map((m) => (
                        <div key={m.label} className="rounded-xl border border-[#E3E8F0] bg-white px-4 py-3">
                            <p className="truncate font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-[#5B6474]">
                                {m.label}
                            </p>
                            <p
                                className="mt-1 truncate text-xl font-semibold tabular-nums tracking-tight"
                                style={{ color: TONE[m.tone ?? 'neutral'] }}
                            >
                                {m.value}
                            </p>
                            {m.sub && <p className="mt-0.5 truncate text-[11px] text-[#5B6474]">{m.sub}</p>}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
