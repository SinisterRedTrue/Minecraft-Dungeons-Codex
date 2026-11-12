'use client';

import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

export type TooltipProps = {
  content: ReactNode;
  /** The trigger; must be a single focusable element so keyboard users get the tooltip too. */
  children: ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  className?: string;
};

export function Tooltip({ content, children, side = 'top', className }: TooltipProps) {
  return (
    <TooltipPrimitive.Provider delayDuration={200}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            sideOffset={8}
            className={cn(
              'dc-pop z-[60] max-w-xs rounded-sm border border-line-strong bg-surface-3 px-3 py-2 text-sm font-medium text-text shadow-soft',
              className,
            )}
          >
            {content}
            <TooltipPrimitive.Arrow className="fill-surface-3" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
