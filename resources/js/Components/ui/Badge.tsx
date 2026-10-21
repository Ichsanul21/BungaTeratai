import { classNames } from '@/lib/format';
import { ReactNode } from 'react';

export type BadgeTone =
    | 'success'
    | 'warning'
    | 'danger'
    | 'info'
    | 'neutral'
    | 'primary';

const TONES: Record<BadgeTone, string> = {
    success: 'bg-ok/10 text-ok ring-ok/30',
    warning: 'bg-warn/10 text-warn ring-warn/30',
    danger: 'bg-primary/10 text-primary ring-primary/30',
    info: 'bg-maritime/10 text-maritime ring-maritime/30',
    neutral: 'bg-appbg text-muted ring-hairline',
    primary: 'bg-primary text-white ring-primary',
};

const DOTS: Record<BadgeTone, string> = {
    success: 'bg-ok',
    warning: 'bg-warn',
    danger: 'bg-primary',
    info: 'bg-maritime',
    neutral: 'bg-muted',
    primary: 'bg-white',
};

export default function Badge({
    tone = 'neutral',
    children,
    dot = true,
    className,
}: {
    tone?: BadgeTone;
    children: ReactNode;
    dot?: boolean;
    className?: string;
}) {
    return (
        <span
            className={classNames(
                'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
                TONES[tone],
                className,
            )}
        >
            {dot && <span className={classNames('h-1.5 w-1.5 rounded-full', DOTS[tone])} />}
            {children}
        </span>
    );
}
