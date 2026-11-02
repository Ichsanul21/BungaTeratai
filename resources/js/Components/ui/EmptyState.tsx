import { Empty as AntEmpty } from 'antd';
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
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#E7E1D9] bg-white px-6 py-12 text-center">
            {Icon && (
                <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[#FAF7F2] text-[#8A8580]">
                    <Icon size={20} />
                </span>
            )}
            <h3 className="text-sm font-semibold text-[#1C1B1A]">{title}</h3>
            {description && (
                <p className="mt-1 max-w-sm text-sm text-[#8A8580]">{description}</p>
            )}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}
