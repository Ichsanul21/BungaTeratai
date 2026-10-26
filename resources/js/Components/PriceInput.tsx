import NumericInput, { type NumericInputProps } from '@/Components/NumericInput';
import { forwardRef } from 'react';

export type PriceInputProps = NumericInputProps;

export default forwardRef<HTMLInputElement, PriceInputProps>(function PriceInput(props, ref) {
    return <NumericInput decimalPlaces={2} {...props} ref={ref} />;
});
