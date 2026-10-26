import {
    formatNumericEdit,
    formatNumericInput,
    parseNumericValue,
} from '@/lib/format';
import {
    ClipboardEvent,
    forwardRef,
    InputHTMLAttributes,
    useImperativeHandle,
    useLayoutEffect,
    useRef,
    useState,
} from 'react';

type NumericChangeEvent = {
    target: { name: string; value: string };
    currentTarget: { name: string; value: string };
};

export interface NumericInputProps
    extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange' | 'value' | 'defaultValue'> {
    value?: string | number | null;
    defaultValue?: string | number | null;
    decimalPlaces?: number;
    onChange?: (event: NumericChangeEvent) => void;
    onChangeRaw?: (rawNumeric: string) => void;
}

function rangeMessage(value: string, min?: number | string, max?: number | string): string {
    if (value === '') return '';
    const numeric = Number(value);
    if (min !== undefined && numeric < Number(min)) return `Nilai minimum adalah ${min}.`;
    if (max !== undefined && numeric > Number(max)) return `Nilai maksimum adalah ${max}.`;
    return '';
}

const NumericInput = forwardRef<HTMLInputElement, NumericInputProps>(function NumericInput(
    {
        value,
        defaultValue,
        name = '',
        decimalPlaces = 0,
        onChange,
        onChangeRaw,
        className = '',
        placeholder = '0',
        disabled = false,
        required = false,
        inputMode,
        min,
        max,
        onPaste,
        onDrop,
        ...props
    },
    ref,
) {
    const inputRef = useRef<HTMLInputElement>(null);
    const isControlled = value !== undefined;
    const rawValue = parseNumericValue(isControlled ? value : defaultValue, decimalPlaces);
    const [displayValue, setDisplayValue] = useState(() =>
        formatNumericInput(rawValue, decimalPlaces),
    );
    const [rawState, setRawState] = useState(rawValue);
    const rawRef = useRef(rawValue);
    const displayRef = useRef(displayValue);
    const pendingCaretRef = useRef<number | null>(null);
    const pastedRef = useRef(false);

    useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    useLayoutEffect(() => {
        if (isControlled && rawValue !== rawRef.current) {
            rawRef.current = rawValue;
            setRawState(rawValue);
            const formatted = formatNumericInput(rawValue, decimalPlaces);
            displayRef.current = formatted;
            setDisplayValue(formatted);
        }
        if (inputRef.current && pendingCaretRef.current !== null) {
            const caret = pendingCaretRef.current;
            inputRef.current.setSelectionRange(caret, caret);
            pendingCaretRef.current = null;
        }
        if (inputRef.current) {
            inputRef.current.setCustomValidity(rangeMessage(rawRef.current, min, max));
        }
    });

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const input = event.currentTarget;
        const inputType = pastedRef.current
            ? 'insertFromPaste'
            : (event.nativeEvent as InputEvent).inputType ?? '';
        pastedRef.current = false;

        const result = formatNumericEdit(
            displayRef.current,
            input.value,
            input.selectionStart ?? input.value.length,
            inputType,
            decimalPlaces,
        );
        rawRef.current = result.raw;
        setRawState(result.raw);
        displayRef.current = result.display;
        pendingCaretRef.current = result.caret;
        setDisplayValue(result.display);
        input.setCustomValidity(rangeMessage(result.raw, min, max));

        const changeEvent: NumericChangeEvent = {
            target: { name: name || '', value: result.raw },
            currentTarget: { name: name || '', value: result.raw },
        };
        onChange?.(changeEvent);
        onChangeRaw?.(result.raw);
    };

    const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
        pastedRef.current = true;
        onPaste?.(event);
    };

    const handleDrop = (event: React.DragEvent<HTMLInputElement>) => {
        pastedRef.current = true;
        onDrop?.(event);
    };

    return (
        <>
            {name && <input type="hidden" name={name} value={rawState} />}
            <input
                {...props}
                type="text"
                inputMode={inputMode ?? (decimalPlaces > 0 ? 'decimal' : 'numeric')}
                ref={inputRef}
                value={displayValue}
                onChange={handleChange}
                onPaste={handlePaste}
                onDrop={handleDrop}
                placeholder={placeholder}
                disabled={disabled}
                required={required}
                min={min}
                max={max}
                className={
                    'rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary ' +
                    className
                }
            />
        </>
    );
});

export default NumericInput;