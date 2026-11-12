'use client';

import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

type SelectOption = { value: string; label: string; disabled?: boolean };

export type SelectProps = {
  value?: string;
  onValueChange?: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  'aria-label': string;
  id?: string;
  disabled?: boolean;
  className?: string;
};

export function Select({
  value,
  onValueChange,
  options,
  placeholder = 'Select…',
  'aria-label': ariaLabel,
  id,
  disabled,
  className,
}: SelectProps) {
  return (
    <SelectPrimitive.Root value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectPrimitive.Trigger
        id={id}
        aria-label={ariaLabel}
        className={cn(
          'inline-flex h-11 w-full min-w-40 cursor-pointer items-center justify-between gap-2 rounded-sm border border-control bg-surface-2 px-3 text-sm font-semibold text-text',
          'disabled:cursor-not-allowed disabled:opacity-50 data-[placeholder]:text-muted',
          className,
        )}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon>
          <ChevronDown size={18} aria-hidden="true" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          collisionPadding={12}
          className="dc-pop z-[60] max-h-72 w-(--radix-select-trigger-width) min-w-40 overflow-hidden rounded-card border-[1.5px] border-line-strong bg-surface-1 shadow-card"
        >
          <SelectPrimitive.Viewport className="p-1.5">
            {options.map((o) => (
              <SelectPrimitive.Item
                key={o.value}
                value={o.value}
                disabled={o.disabled}
                className="relative flex min-h-11 cursor-pointer items-center rounded-sm py-2 pr-3 pl-8 text-sm font-medium text-text outline-none select-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 data-[highlighted]:bg-accent/20"
              >
                <SelectPrimitive.ItemIndicator className="absolute left-2 grid place-items-center">
                  <Check size={16} aria-hidden="true" />
                </SelectPrimitive.ItemIndicator>
                <SelectPrimitive.ItemText>{o.label}</SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
