export interface LaravelPagination<T> {
    data: T[];
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
    from?: number | null;
    to?: number | null;
}

export interface AntdPagination {
    current: number;
    pageSize: number;
    total: number;
}

export function toAntdPagination(p: LaravelPagination<any>): AntdPagination {
    return {
        current: p.current_page ?? 1,
        pageSize: p.per_page ?? 15,
        total: p.total ?? 0,
    };
}

export function laravelPageParams(pagination: {
    current: number;
    pageSize: number;
}): { page: string } {
    return { page: String(pagination.current) };
}
