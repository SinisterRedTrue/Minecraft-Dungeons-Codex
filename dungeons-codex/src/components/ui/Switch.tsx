'use client';

import * as SwitchPrimitive from '@radix-ui/react-switch';
import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

export type SwitchProps = {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  label: ReactNode;
  disabled?: boolean;
  id?: string;
  className?: string;
};

export function Switch({ checked, onCheckedChange, label, disabled, id, className }: SwitchProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className={cn('flex min-h-11 items-center gap-3', className)}>
      <SwitchPrimitive.Root
        id={inputId}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
        className="relative h-7 w-12 shrink-0 cursor-pointer rounded-chip border-2 border-control bg-surface-3 transition-colors disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-accent-text data-[state=checked]:bg-accent"
      >
        <SwitchPrimitive.Thumb className="block size-5 translate-x-0.5 rounded-full bg-control transition-transform duration-200 data-[state=checked]:translate-x-[22px] data-[state=checked]:bg-accent-ink motion-reduce:transition-none" />
      </SwitchPrimitive.Root>
      <label htmlFor={inputId} className="flex-1 cursor-pointer text-sm font-medium text-text">
        {label}
      </label>
    </div>
  );
}
