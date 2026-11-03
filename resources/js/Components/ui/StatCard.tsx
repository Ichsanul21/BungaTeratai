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
        neutral: { color: '#111827', bg: '#F5F7FA' },
        success: { color: '#15803D', bg: '#15803D1A' },
        warning: { color: '#B45309', bg: '#B453091A' },
        danger: { color: '#BA0C2F', bg: '#BA0C2F1A' },
        info: { color: '#00205B', bg: '#00205B1A' },
    };

    const t = tones[tone];

    return (
        <Card
            onClick={onClick}
            className={onClick ? 'cursor-pointer transition hover:border-[#BA0C2F]/40 hover:shadow-md' : ''}
            styles={{
                body: { padding: '16px' },
            }}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                    <Statistic
                        title={
                            <span className="truncate text-xs font-medium uppercase tracking-wide text-[#5B6474]">
                                {label}
                            </span>
                        }
                        value={typeof value === 'number' ? value : undefined}
                        formatter={typeof value !== 'number' ? () => value : undefined}
                        valueStyle={{
                            fontSize: 24,
                            fontWeight: 600,
                            color: '#111827',
                            marginTop: 4,
                        }}
                    />
                    {sub && (
                        <p className="mt-1 text-xs text-[#5B6474]">{sub}</p>
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
