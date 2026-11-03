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
                    {Icon && <Icon size={14} aria-hidden="true" />}
                    <span>
                        {tab.label}
                        {tab.count !== undefined && ` (${tab.count})`}
                    </span>
                </span>
            ),
        };
    });

    return (
        <Tabs
            activeKey={active}
            onChange={onChange}
            items={items}
            type="card"
            className="bt-tabs"
            tabBarStyle={{ marginBottom: 0 }}
        />
    );
}
