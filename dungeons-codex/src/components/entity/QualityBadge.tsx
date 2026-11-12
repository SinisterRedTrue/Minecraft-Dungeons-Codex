import { PartialDataPopover } from '@/components/entity/PartialDataPopover';
import { Badge } from '@/components/ui/Badge';

/**
 * "Partial" marker for entities whose wiki page lacked some recommended fields (03-CONTENT-MODEL
 * `quality`). Renders nothing for verified entities, so callers can drop it in unconditionally.
 *
 * With a `source` (detail pages) it reads "Partial data" and opens a popover that links to the
 * wiki page; without one (cards) it stays a plain label with a title.
 */
export function QualityBadge({
  quality,
  source,
}: {
  quality: unknown;
  source?: { title: string; url: string };
}) {
  if (quality !== 'partial') return null;
  if (source) return <PartialDataPopover source={source} />;
  return (
    <Badge variant="partial" title="Some fields are missing on the source wiki page">
      Partial
    </Badge>
  );
}
