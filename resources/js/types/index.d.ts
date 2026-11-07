export interface User {
    id: number;
    name: string;
    email: string;
    email_verified_at?: string;
    roles: string[];
    is_developer?: boolean;
}

export interface WatermarkPayload {
    line1: string;
    line2: string;
    values: {
        ip: string;
        device: string;
        user: string;
        company: string;
        doc_no?: string;
    };
    server_time: string;
    opacity: number;
    speed: number;
    angle: number;
    font_size: number;
    color: string;
    show_login: boolean;
}

export interface ImpersonationInfo {
    name: string;
    current?: string | null;
}

export type PageProps<
    T extends Record<string, unknown> = Record<string, unknown>,
> = T & {
    auth: {
        user: User;
    };
    unreadNotifications?: number;
    notifCounts?: {
        total: number;
        unread: number;
        reminder: number;
        workflow: number;
    };
    flash?: {
        success?: string | null;
        error?: string | null;
    };
    demoLabel?: string | null;
    impersonating?: ImpersonationInfo | null;
    watermark?: WatermarkPayload | null;
    features?: Record<string, boolean>;
};
