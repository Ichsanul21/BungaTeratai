import { Card, Statistic } from 'antd';
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
    const tones: Record<string, { color: string; bg: string }> = {
        neutral: { color: '#1C1B1A', bg: '#FAF7F2' },
        success: { color: '#2F8F68', bg: '#2F8F681A' },
        warning: { color: '#D99A2B', bg: '#D99A2B1A' },
        danger: { color: '#C1121F', bg: '#C1121F1A' },
        info: { color: '#1E4668', bg: '#1E46681A' },
    };

    const t = tones[tone];

    return (
        <Card
            onClick={onClick}
            className={onClick ? 'cursor-pointer transition hover:border-[#C1121F]/40 hover:shadow-md' : ''}
            styles={{
                body: { padding: '16px' },
            }}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                    <Statistic
                        title={
                            <span className="truncate text-xs font-medium uppercase tracking-wide text-[#8A8580]">
                                {label}
                            </span>
                        }
                        value={typeof value === 'number' ? value : undefined}
                        formatter={typeof value !== 'number' ? () => value : undefined}
                        valueStyle={{
                            fontSize: 24,
                            fontWeight: 600,
                            color: '#1C1B1A',
                            marginTop: 4,
                        }}
                    />
                    {sub && (
                        <p className="mt-1 text-xs text-[#8A8580]">{sub}</p>
                    )}
                </div>
                {Icon && (
                    <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                        style={{ color: t.color, background: t.bg }}
                    >
                        <Icon size={18} />
                    </span>
                )}
            </div>
        </Card>
    );
}
