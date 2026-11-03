import EmptyState from '@/Components/ui/EmptyState';
import { Table, TableProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { classNames } from '@/lib/format';
import { ReactNode } from 'react';

export interface Column<T = any> {
    key: string;
    label: string;
    className?: string;
    headerClassName?: string;
    render?: (row: T) => ReactNode;
    width?: number | string;
    sorter?: boolean | ((a: T, b: T) => number);
}

export default function DataTable<T extends Record<string, any>>({
    columns,
    rows,
    rowKey = 'id',
    emptyTitle = 'Belum ada data',
    emptyDescription,
    emptyIcon,
    emptyAction,
    onRowClick,
    className = '',
    loading,
    pagination,
    scroll,
}: {
    columns: Column<T>[];
    rows: T[];
    rowKey?: string;
    emptyTitle?: string;
    emptyDescription?: string;
    emptyIcon?: any;
    emptyAction?: ReactNode;
    onRowClick?: (row: T) => void;
    className?: string;
    loading?: boolean;
    pagination?: TableProps['pagination'];
    scroll?: TableProps['scroll'];
}) {
    if (rows.length === 0 && !loading) {
        return (
            <EmptyState
                icon={emptyIcon}
                title={emptyTitle}
                description={emptyDescription}
                action={emptyAction}
            />
        );
    }

    const antColumns: ColumnsType<T> = columns.map((col) => ({
        title: col.label,
        dataIndex: col.key,
        key: col.key,
        width: col.width,
        sorter: col.sorter,
        className: col.className,
        render: col.render
            ? (_: any, record: T) => col.render!(record)
            : (value: any) => value ?? '—',
    }));

    return (
        <Table<T>
            columns={antColumns}
            dataSource={rows}
            rowKey={rowKey}
            loading={loading}
            pagination={pagination ?? false}
            scroll={scroll ?? { x: true }}
            className={classNames('rounded-xl border border-[#E3E8F0] bg-white shadow-sm', className)}
            onRow={(record) => ({
                onClick: onRowClick ? () => onRowClick(record) : undefined,
                style: onRowClick ? { cursor: 'pointer' } : undefined,
            })}
            size="middle"
        />
    );
}
