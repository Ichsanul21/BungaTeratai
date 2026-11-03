import { Card as AntCard } from 'antd';
import { ReactNode } from 'react';

export default function Card({
    title,
    description,
    actions,
    children,
    className = '',
    noPadding = false,
}: {
    title?: string;
    description?: string;
    actions?: ReactNode;
    children: ReactNode;
    className?: string;
    noPadding?: boolean;
}) {
    return (
        <AntCard
            title={
                title ? (
                    <div>
                        <h2 className="text-sm font-semibold text-[#111827]">{title}</h2>
                        {description && (
                            <p className="mt-0.5 text-xs text-[#5B6474]">{description}</p>
                        )}
                    </div>
                ) : null
            }
            extra={actions}
            className={className}
            styles={{
                header: {
                    borderBottom: '1px solid #E3E8F0',
                    padding: '16px 20px',
                    minHeight: 'auto',
                },
                body: { padding: noPadding ? 0 : '20px' },
            }}
        >
            {children}
        </AntCard>
    );
}
