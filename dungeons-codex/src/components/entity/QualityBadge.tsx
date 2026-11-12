import { Badge } from '@/components/ui/Badge';

/**
 * "Partial" marker for entities whose wiki page lacked some recommended fields (03-CONTENT-MODEL
 * `quality`). Renders nothing for verified entities, so callers can drop it in unconditionally.
 */
export function QualityBadge({ quality }: { quality: unknown }) {
  if (quality !== 'partial') return null;
  return (
    <Badge variant="partial" title="Some fields are missing on the source wiki page">
      Partial
    </Badge>
  );
}
