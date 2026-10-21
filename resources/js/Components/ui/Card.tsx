import { ReactNode } from 'react';

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
        <section
            className={`rounded-xl border border-hairline bg-white shadow-sm ${className}`}
        >
            {(title || actions) && (
                <header className="flex items-start justify-between gap-3 border-b border-hairline px-5 py-4">
                    <div>
                        {title && (
                            <h2 className="text-sm font-semibold text-ink">{title}</h2>
                        )}
                        {description && (
                            <p className="mt-0.5 text-xs text-muted">{description}</p>
                        )}
                    </div>
                    {actions && <div className="flex items-center gap-2">{actions}</div>}
                </header>
            )}
            <div className="p-5">{children}</div>
        </section>
    );
}
