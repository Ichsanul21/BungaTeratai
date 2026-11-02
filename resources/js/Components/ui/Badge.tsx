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
    success: { color: '#2F8F681A', border: '#2F8F684D', text: '#2F8F68', dot: '#2F8F68' },
    warning: { color: '#D99A2B1A', border: '#D99A2B4D', text: '#D99A2B', dot: '#D99A2B' },
    danger: { color: '#C1121F1A', border: '#C1121F4D', text: '#C1121F', dot: '#C1121F' },
    info: { color: '#1E46681A', border: '#1E46684D', text: '#1E4668', dot: '#1E4668' },
    neutral: { color: '#FAF7F2', border: '#E7E1D9', text: '#8A8580', dot: '#8A8580' },
    primary: { color: '#C1121F', border: '#C1121F', text: '#FFFFFF', dot: '#FFFFFF' },
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
