import { Typography } from 'antd';
import { ReactNode } from 'react';

const { Title, Text } = Typography;

export default function PageHeader({
    title,
    description,
    actions,
}: {
    title: string;
    description?: string;
    actions?: ReactNode;
}) {
    return (
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
                <Title level={3} style={{ margin: 0, fontWeight: 600, letterSpacing: '-0.01em' }}>
                    {title}
                </Title>
                {description && (
                    <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>
                        {description}
                    </Text>
                )}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
    );
}
