'use client';

import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check, Minus } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

export type CheckboxProps = {
  checked?: boolean | 'indeterminate';
  onCheckedChange?: (checked: boolean) => void;
  label: ReactNode;
  /** Secondary line, e.g. a facet count. */
  hint?: ReactNode;
  disabled?: boolean;
  id?: string;
  className?: string;
};

export function Checkbox({
  checked,
  onCheckedChange,
  label,
  hint,
  disabled,
  id,
  className,
}: CheckboxProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className={cn('flex min-h-11 items-center gap-3', className)}>
      <CheckboxPrimitive.Root
        id={inputId}
        checked={checked}
        disabled={disabled}
        onCheckedChange={(v) => onCheckedChange?.(v === true)}
        className="grid size-6 shrink-0 cursor-pointer place-items-center rounded-xs border-2 border-control bg-surface-2 text-accent-ink transition-colors disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-accent-text data-[state=checked]:bg-accent data-[state=indeterminate]:border-accent-text data-[state=indeterminate]:bg-accent"
      >
        <CheckboxPrimitive.Indicator>
          {checked === 'indeterminate' ? (
            <Minus size={16} strokeWidth={3} aria-hidden="true" />
          ) : (
            <Check size={16} strokeWidth={3} aria-hidden="true" />
          )}
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      <label htmlFor={inputId} className="flex-1 cursor-pointer text-sm font-medium text-text">
        {label}
        {hint !== undefined && <span className="ml-2 text-xs text-muted">{hint}</span>}
      </label>
    </div>
  );
}
