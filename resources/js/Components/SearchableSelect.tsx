import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';

export type SearchableSelectOption = {
    value: string;
    label: string;
};

export default function SearchableSelect({
    value,
    options,
    onChange,
    placeholder = 'Cari atau pilih...',
    className = '',
    disabled = false,
    required = false,
    name,
    ariaLabel,
}: {
    value: string;
    options: SearchableSelectOption[];
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
    required?: boolean;
    name?: string;
    ariaLabel?: string;
}) {
    const selected = options.find((option) => option.value === value);
    const selectedLabel = value ? selected?.label ?? value : '';
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const filteredOptions = useMemo(() => {
        const normalizedQuery = query.trim().toLocaleLowerCase();
        return normalizedQuery
            ? options.filter((option) =>
                  option.label.toLocaleLowerCase().includes(normalizedQuery),
              )
            : options;
    }, [options, query]);

    useEffect(() => {
        if (!open) setQuery('');
    }, [selected?.label, value]);

    useEffect(() => {
        if (!open) return;
        const closeOnOutsideClick = (event: MouseEvent) => {
            if (!(event.target instanceof Element) || event.target.closest('[data-searchable-select]')) {
                return;
            }
            setOpen(false);
            setQuery('');
        };
        document.addEventListener('mousedown', closeOnOutsideClick);
        return () => document.removeEventListener('mousedown', closeOnOutsideClick);
    }, [open]);

    return (
        <div className="relative" data-searchable-select>
            {name && <input type="hidden" name={name} value={value} />}
            <button
                type="button"
                role="combobox"
                aria-expanded={open}
                aria-label={ariaLabel}
                aria-haspopup="listbox"
                aria-controls={open ? `select-options-${name ?? ariaLabel ?? 'field'}` : undefined}
                disabled={disabled}
                aria-required={required}
                onClick={() => {
                    setOpen((current) => !current);
                    setQuery('');
                }}
                onKeyDown={(event) => {
                    if (event.key === 'Escape') {
                        setOpen(false);
                    }
                }}
                className={`mt-1 flex w-full items-center justify-between gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-left text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary ${className}`}
            >
                <span className={selectedLabel ? 'truncate text-ink' : 'truncate text-muted'}>
                    {selectedLabel || placeholder}
                </span>
                <ChevronDown size={16} aria-hidden="true" className="shrink-0 text-muted" />
            </button>
            {open && (
                <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-md border border-hairline bg-white shadow-lg">
                    <div className="relative border-b border-hairline p-2">
                        <Search size={14} aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
                        <input
                            autoFocus
                            type="search"
                            role="searchbox"
                            aria-label={`Cari ${ariaLabel ?? 'opsi'}`}
                            value={query}
                            placeholder="Ketik untuk mencari..."
                            onChange={(event) => setQuery(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === 'Escape') {
                                    setOpen(false);
                                    setQuery('');
                                }
                                if (event.key === 'Enter' && filteredOptions.length === 1) {
                                    event.preventDefault();
                                    onChange(filteredOptions[0].value);
                                    setOpen(false);
                                    setQuery('');
                                }
                            }}
                            className="block w-full rounded-md border-gray-300 py-2 pl-8 pr-3 text-sm shadow-sm focus:border-primary focus:ring-primary"
                        />
                    </div>
                    <ul
                        id={`select-options-${name ?? ariaLabel ?? 'field'}`}
                        role="listbox"
                        className="max-h-56 overflow-auto py-1"
                    >
                        {filteredOptions.length === 0 ? (
                            <li className="px-3 py-2 text-sm text-muted">Tidak ada opsi yang cocok.</li>
                        ) : (
                            filteredOptions.map((option) => (
                                <li key={option.value} role="option" aria-selected={option.value === value}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            onChange(option.value);
                                            setOpen(false);
                                            setQuery('');
                                        }}
                                        className={`w-full px-3 py-2 text-left text-sm hover:bg-appbg ${
                                            option.value === value ? 'font-semibold text-primary' : 'text-ink'
                                        }`}
                                    >
                                        {option.label}
                                    </button>
                                </li>
                            ))
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
}
