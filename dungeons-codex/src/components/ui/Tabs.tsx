'use client';

import * as TabsPrimitive from '@radix-ui/react-tabs';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils/cn';

export const Tabs = TabsPrimitive.Root;

export function TabsList({ className, ...rest }: ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      {...rest}
      className={cn(
        'inline-flex items-center gap-1 rounded-chip border border-line bg-surface-2 p-1',
        className,
      )}
    />
  );
}

export function TabsTrigger({ className, ...rest }: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      {...rest}
      className={cn(
        'inline-flex h-9 cursor-pointer items-center justify-center rounded-chip px-4 text-sm font-bold whitespace-nowrap text-muted transition-colors duration-200 pointer-coarse:h-11',
        'hover:text-text data-[state=active]:bg-accent data-[state=active]:text-accent-ink data-[state=active]:shadow-[0_2px_0_var(--accent-edge)]',
        className,
      )}
    />
  );
}

export function TabsContent({ className, ...rest }: ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content {...rest} className={cn('mt-4', className)} />;
}
