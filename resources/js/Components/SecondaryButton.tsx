import { Button, ButtonProps } from 'antd';
import { ReactNode } from 'react';

type HtmlButtonType = 'button' | 'submit' | 'reset';

export default function SecondaryButton({
    className = '',
    disabled,
    children,
    loading,
    icon,
    type: htmlType = 'button',
    onClick,
    ...props
}: Omit<ButtonProps, 'type'> & {
    children?: ReactNode;
    icon?: ReactNode;
    type?: HtmlButtonType;
    onClick?: (e: React.MouseEvent) => void;
}) {
    return (
        <Button
            htmlType={htmlType}
            disabled={disabled}
            loading={loading}
            icon={icon as any}
            className={className}
            onClick={onClick}
            {...props}
        >
            {children}
        </Button>
    );
}
