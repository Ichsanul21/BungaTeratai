// import { LabelHTMLAttributes } from 'react';

// export default function InputLabel({
//     value,
//     className = '',
//     children,
//     ...props
// }: LabelHTMLAttributes<HTMLLabelElement> & { value?: string }) {
//     return (
//         <label
//             {...props}
//             className={
//                 `block text-sm font-medium text-gray-700 ` +
//                 className
//             }
//         >
//             {value ? value : children}
//         </label>
//     );
// }


import { type LabelHTMLAttributes } from 'react';
import { classNames } from '@/lib/format';

type InputLabelProps = LabelHTMLAttributes<HTMLLabelElement> & {
    value?: string;
};

export function InputLabel({ value, className = '', ...props }: InputLabelProps) {
    return (
        <label
            {...props}
            className={classNames('block text-sm font-medium text-ink', className)}
        >
            {value ?? props.children}
        </label>
    );
}

export default InputLabel;
