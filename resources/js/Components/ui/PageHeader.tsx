import { ReactNode } from 'react';

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
                <h1 className="text-2xl font-semibold tracking-tight text-ink">
                    {title}
                </h1>
                {description && (
                    <p className="mt-1 text-sm text-muted">{description}</p>
                )}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
    );
}
