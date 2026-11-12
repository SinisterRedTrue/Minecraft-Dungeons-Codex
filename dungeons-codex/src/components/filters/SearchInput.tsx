'use client';

import { Search, X } from 'lucide-react';
import { useId } from 'react';
import { cn } from '@/lib/utils/cn';

/** Text field with a leading magnifier and a clear button; used by the panel's search and option lists. */
export function SearchInput({
  value,
  onChange,
  label,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  /** Accessible name. */
  label: string;
  placeholder?: string;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cn('relative', className)}>
      <Search
        size={16}
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"
      />
      <input
        id={id}
        type="search"
        value={value}
        aria-label={label}
        placeholder={placeholder ?? label}
        autoComplete="off"
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-sm border border-control bg-surface-2 pr-10 pl-9 text-sm text-text placeholder:text-muted [&::-webkit-search-cancel-button]:hidden"
      />
      {value !== '' && (
        <button
          type="button"
          aria-label={`Clear ${label.toLowerCase()}`}
          onClick={() => onChange('')}
          className="absolute top-1/2 right-1 grid size-9 -translate-y-1/2 cursor-pointer place-items-center rounded-chip text-muted hover:text-text"
        >
          <X size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
