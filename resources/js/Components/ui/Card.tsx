import { Card as AntCard, Typography } from 'antd';
import { ReactNode } from 'react';

const { Text } = Typography;

export default function Card({
    title,
    description,
    actions,
    children,
    className = '',
}: {
    title?: string;
    description?: string;
    actions?: ReactNode;
    children: ReactNode;
    className?: string;
}) {
    return (
        <AntCard
            title={
                title ? (
                    <div>
                        <h2 className="text-sm font-semibold text-[#1C1B1A]">{title}</h2>
                        {description && (
                            <p className="mt-0.5 text-xs text-[#8A8580]">{description}</p>
                        )}
                    </div>
                ) : null
            }
            extra={actions}
            className={className}
            styles={{
                header: {
                    borderBottom: '1px solid #E7E1D9',
                    padding: '16px 20px',
                    minHeight: 'auto',
                },
                body: { padding: '20px' },
            }}
        >
            {children}
        </AntCard>
    );
}
