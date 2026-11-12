'use client';

import { ChevronLeft, ChevronRight, Keyboard } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Tooltip } from '@/components/ui/Tooltip';
import type { EntityRef } from '@/lib/detail/refs';
import { cn } from '@/lib/utils/cn';

/** True when the key press belongs to something the user is typing into. */
function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
}

const LINK =
  'inline-flex min-h-9 min-w-0 flex-1 items-center sm:flex-none gap-1 rounded-chip border border-line bg-surface-2 px-3 text-sm font-semibold text-text hover:border-accent pointer-coarse:min-h-11 sm:max-w-[14rem]';

/**
 * Previous / next entity of the category (alphabetical). `[` and `]` jump there too; a keyboard
 * button explains the shortcuts. The shortcuts are ignored while typing and with modifier keys.
 */
export function PrevNext({
  prev,
  next,
  categoryLabel,
  className,
}: {
  prev?: EntityRef | undefined;
  next?: EntityRef | undefined;
  categoryLabel: string;
  className?: string;
}) {
  const router = useRouter();
  const prevHref = prev?.href;
  const nextHref = next?.href;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
      if (isTyping(event.target)) return;
      if (event.key === '[' && prevHref) router.push(prevHref);
      else if (event.key === ']' && nextHref) router.push(nextHref);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [router, prevHref, nextHref]);

  if (!prev && !next) return null;
  return (
    <nav
      aria-label={`Previous and next ${categoryLabel.toLowerCase()}`}
      className={cn('flex w-full items-center gap-2 sm:w-auto', className)}
    >
      {prev && (
        <Link href={prev.href} rel="prev" aria-keyshortcuts="[" className={LINK}>
          <ChevronLeft size={16} aria-hidden="true" className="shrink-0" />
          <span className="sr-only">Previous:</span> <span className="truncate">{prev.name}</span>
        </Link>
      )}
      {next && (
        <Link href={next.href} rel="next" aria-keyshortcuts="]" className={LINK}>
          <span className="sr-only">Next:</span> <span className="truncate">{next.name}</span>
          <ChevronRight size={16} aria-hidden="true" className="shrink-0" />
        </Link>
      )}
      <Tooltip
        content={
          <span>
            Keyboard: <kbd className="font-pixel">[</kbd> previous ·{' '}
            <kbd className="font-pixel">]</kbd> next
          </span>
        }
      >
        <button
          type="button"
          aria-label="Keyboard shortcuts: [ for previous, ] for next"
          className="inline-flex size-9 cursor-pointer items-center justify-center rounded-chip border border-line text-muted hover:text-text pointer-coarse:size-11"
        >
          <Keyboard size={16} aria-hidden="true" />
        </button>
      </Tooltip>
    </nav>
  );
}
