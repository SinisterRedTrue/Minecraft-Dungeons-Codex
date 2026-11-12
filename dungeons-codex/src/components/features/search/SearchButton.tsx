'use client';

import { Search } from 'lucide-react';
import type { ComponentProps } from 'react';
import { Button3D } from '@/components/ui/Button3D';
import { cn } from '@/lib/utils/cn';
import { useSearch } from './SearchProvider';

/**
 * The header's Search control: icon-only on phones (the word stays for assistive tech), a labelled
 * pill from md up, with the ⌘K hint from lg up. The hint is a pseudo-element so the accessible
 * name is just "Search" and matches the visible label (WCAG 2.5.3).
 */
export function HeaderSearchButton({ className }: { className?: string }) {
  const { open, preload } = useSearch();
  return (
    <button
      type="button"
      onClick={open}
      onPointerEnter={preload}
      onFocus={preload}
      aria-keyshortcuts="Control+K Meta+K"
      className={cn(
        "inline-flex h-11 cursor-pointer items-center gap-2 rounded-chip border border-line bg-surface-2 px-3 text-sm font-semibold text-text transition-colors hover:border-accent md:h-10 md:px-4 lg:after:rounded-xs lg:after:bg-surface-3 lg:after:px-1.5 lg:after:font-pixel lg:after:text-micro lg:after:text-muted lg:after:content-['⌘K'] pointer-coarse:h-11",
        className,
      )}
    >
      <Search size={20} aria-hidden="true" />
      <span className="sr-only md:not-sr-only">Search</span>
    </button>
  );
}

/** A plain Button3D that opens the search dialog (404 page, empty states). */
export function SearchButton({
  children = 'Search the Codex',
  ...rest
}: Omit<ComponentProps<typeof Button3D>, 'onClick' | 'icon'>) {
  const { open, preload } = useSearch();
  return (
    <Button3D
      icon={<Search size={18} aria-hidden="true" />}
      onClick={open}
      onPointerEnter={preload}
      onFocus={preload}
      {...rest}
    >
      {children}
    </Button3D>
  );
}

/**
 * The hero's search pill, drawn like civilization.gg's: one big button that reads as a field.
 * It is a single control (the "Search" chip is decoration), so assistive tech hears one button.
 */
export function SearchPill({ className }: { className?: string }) {
  const { open, preload } = useSearch();
  return (
    <button
      type="button"
      onClick={open}
      onPointerEnter={preload}
      onFocus={preload}
      aria-keyshortcuts="Control+K Meta+K"
      className={cn(
        'flex h-16 w-full max-w-xl cursor-pointer items-center gap-3 rounded-chip border-2 border-line-strong bg-surface-2 py-2 pr-2 pl-5 text-left text-muted shadow-soft transition-colors hover:border-accent',
        className,
      )}
    >
      <Search size={22} aria-hidden="true" className="shrink-0" />
      <span className="flex-1 truncate">Search the Codex…</span>
      <span aria-hidden="true" className="b3d h-12 px-5 text-sm max-sm:hidden">
        Search
      </span>
    </button>
  );
}
