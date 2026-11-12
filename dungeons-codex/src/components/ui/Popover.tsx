'use client';

import * as PopoverPrimitive from '@radix-ui/react-popover';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils/cn';

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverClose = PopoverPrimitive.Close;

export function PopoverContent({
  className,
  sideOffset = 8,
  ...rest
}: ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        sideOffset={sideOffset}
        collisionPadding={12}
        {...rest}
        className={cn(
          'dc-pop z-[60] w-72 max-w-[calc(100vw-1.5rem)] rounded-card border-[1.5px] border-line-strong bg-surface-1 p-4 text-text shadow-card',
          className,
        )}
      />
    </PopoverPrimitive.Portal>
  );
}
