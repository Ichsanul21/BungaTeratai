import type { FormInstance } from 'antd';
import { useEffect } from 'react';

export function useSyncAntdErrors<T extends Record<string, any>>(
    form: FormInstance,
    errors: Partial<Record<keyof T, string>> | Record<string, string>,
) {
    useEffect(() => {
        const fields = Object.entries(errors || {})
            .filter(([, msg]) => !!msg)
            .map(([name, errors]) => ({
                name: [name],
                errors: [errors as string],
            }));

        if (fields.length > 0) {
            form.setFields(fields);
        }
    }, [errors, form]);
}
