import { Tag } from 'antd';
import { ReactNode } from 'react';

export type BadgeTone =
    | 'success'
    | 'warning'
    | 'danger'
    | 'info'
    | 'neutral'
    | 'primary';

const TONES: Record<BadgeTone, { color: string; border: string; text: string; dot: string }> = {
    success: { color: '#15803D1A', border: '#15803D4D', text: '#15803D', dot: '#15803D' },
    warning: { color: '#B453091A', border: '#B453094D', text: '#B45309', dot: '#B45309' },
    danger: { color: '#BA0C2F1A', border: '#BA0C2F4D', text: '#BA0C2F', dot: '#BA0C2F' },
    info: { color: '#00205B1A', border: '#00205B4D', text: '#00205B', dot: '#00205B' },
    neutral: { color: '#F5F7FA', border: '#E3E8F0', text: '#5B6474', dot: '#5B6474' },
    primary: { color: '#BA0C2F', border: '#BA0C2F', text: '#FFFFFF', dot: '#FFFFFF' },
};

export default function Badge({
    tone = 'neutral',
    children,
    dot = true,
    className,
}: {
    tone?: BadgeTone;
    children: ReactNode;
    dot?: boolean;
    className?: string;
}) {
    const t = TONES[tone];
    return (
        <Tag
            className={className}
            style={{
                background: t.color,
                borderColor: t.border,
                color: t.text,
                borderRadius: 9999,
                paddingInline: 10,
                paddingBlock: 2,
                fontSize: 12,
                fontWeight: 500,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                lineHeight: 1.5,
            }}
            bordered={true}
        >
            {dot && (
                <span
                    style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: t.dot,
                        flexShrink: 0,
                    }}
                />
            )}
            {children}
        </Tag>
    );
}
