import EmptyState from '@/Components/ui/EmptyState';
import { classNames } from '@/lib/format';
import { ReactNode } from 'react';

export interface Column<T = any> {
    key: string;
    label: string;
    className?: string;
    headerClassName?: string;
    render?: (row: T) => ReactNode;
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
}) {
    if (rows.length === 0) {
        return (
            <EmptyState
                icon={emptyIcon}
                title={emptyTitle}
                description={emptyDescription}
                action={emptyAction}
            />
        );
    }

    return (
        <div
            className={classNames(
                'overflow-hidden rounded-xl border border-hairline bg-white shadow-sm',
                className,
            )}
        >
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-hairline text-sm">
                    <thead className="bg-appbg">
                        <tr>
                            {columns.map((col) => (
                                <th
                                    key={col.key}
                                    scope="col"
                                    className={classNames(
                                        'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted',
                                        col.headerClassName,
                                    )}
                                >
                                    {col.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-hairline">
                        {rows.map((row, idx) => (
                            <tr
                                key={row[rowKey] ?? idx}
                                onClick={onRowClick ? () => onRowClick(row) : undefined}
                                className={classNames(
                                    'transition',
                                    onRowClick && 'cursor-pointer hover:bg-appbg',
                                )}
                            >
                                {columns.map((col) => (
                                    <td
                                        key={col.key}
                                        className={classNames(
                                            'px-4 py-3 align-middle text-ink',
                                            col.className,
                                        )}
                                    >
                                        {col.render
                                            ? col.render(row)
                                            : (row[col.key] ?? '—')}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
