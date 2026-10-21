import { classNames } from '@/lib/format';
import { type LucideIcon } from 'lucide-react';

export interface Tab {
    key: string;
    label: string;
    icon?: LucideIcon;
    count?: number;
}

export default function TabNav({
    tabs,
    active,
    onChange,
}: {
    tabs: Tab[];
    active: string;
    onChange: (key: string) => void;
}) {
    return (
        <div className="mb-5 flex gap-1 overflow-x-auto border-b border-hairline">
            {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = tab.key === active;
                return (
                    <button
                        key={tab.key}
                        type="button"
                        onClick={() => onChange(tab.key)}
                        className={classNames(
                            'inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition',
                            isActive
                                ? 'border-primary text-primary'
                                : 'border-transparent text-muted hover:border-hairline hover:text-ink',
                        )}
                    >
                        {Icon && <Icon className="h-4 w-4" />}
                        {tab.label}
                        {tab.count !== undefined && (
                            <span
                                className={classNames(
                                    'rounded-full px-1.5 py-0.5 text-xs',
                                    isActive
                                        ? 'bg-primary/10 text-primary'
                                        : 'bg-appbg text-muted',
                                )}
                            >
                                {tab.count}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
