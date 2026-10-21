import { type LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

export default function EmptyState({
    icon: Icon,
    title,
    description,
    action,
}: {
    icon?: LucideIcon;
    title: string;
    description?: string;
    action?: ReactNode;
}) {
    return (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-hairline bg-white px-6 py-12 text-center">
            {Icon && (
                <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-appbg text-muted">
                    <Icon size={20} />
                </span>
            )}
            <h3 className="text-sm font-semibold text-ink">{title}</h3>
            {description && (
                <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>
            )}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}
