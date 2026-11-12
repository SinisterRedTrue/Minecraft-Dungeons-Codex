'use client';

import { ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/Popover';

/**
 * The "Partial data" badge of a detail page: a button that opens a short explanation and a link
 * to the wiki page the entry came from (a popover, not a hover tooltip, so keyboard and touch
 * users can open it and follow the link).
 */
export function PartialDataPopover({ source }: { source: { title: string; url: string } }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Partial data: show details"
          className="cursor-pointer rounded-xs"
        >
          <Badge variant="partial">Partial data</Badge>
        </button>
      </PopoverTrigger>
      <PopoverContent className="text-sm">
        <p>
          Some fields are missing on the source wiki page, so this entry is incomplete. Nothing was
          guessed to fill the gaps.
        </p>
        <a
          href={source.url}
          rel="noopener"
          className="mt-3 inline-flex min-h-9 items-center gap-1.5 font-semibold text-accent-text underline underline-offset-4"
        >
          Minecraft Wiki: {source.title}
          <ExternalLink size={14} aria-hidden="true" />
        </a>
      </PopoverContent>
    </Popover>
  );
}
