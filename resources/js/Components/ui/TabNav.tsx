import { Tabs } from 'antd';
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
    const items = tabs.map((tab) => {
        const Icon = tab.icon;
        return {
            key: tab.key,
            label: (
                <span className="inline-flex items-center gap-2">
                    {Icon && <Icon size={16} />}
                    {tab.label}
                    {tab.count !== undefined && (
                        <span
                            className={`inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 py-0.5 text-xs ${
                                tab.key === active
                                    ? 'bg-[#C1121F]/10 text-[#C1121F]'
                                    : 'bg-[#FAF7F2] text-[#8A8580]'
                            }`}
                        >
                            {tab.count}
                        </span>
                    )}
                </span>
            ),
        };
    });

    return (
        <Tabs
            activeKey={active}
            onChange={onChange}
            items={items}
            className="mb-5"
        />
    );
}
