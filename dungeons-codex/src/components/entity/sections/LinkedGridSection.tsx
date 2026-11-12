import { TileGrid } from '@/components/entity/EntityTile';
import { RefChips } from '@/components/entity/RefLinks';
import { SectionBlock } from '@/components/entity/SectionBlock';
import { toLink, type Refs } from '@/lib/detail/refs';

/**
 * Entities listed by id as a tile grid (mobs of a location, items found here, drops, built-into),
 * with raw text values — names the data could not resolve — as plain pills below. Hides when empty.
 */
export function LinkedGridSection({
  id,
  title,
  values,
  refs,
}: {
  id: string;
  title: string;
  values: readonly unknown[] | undefined;
  refs: Refs;
}) {
  const links = (values ?? [])
    .filter((v) => v !== undefined && v !== '')
    .map((v) => toLink(v, refs));
  const tiles = links.flatMap((link) => (link.ref ? [{ entity: link.ref }] : []));
  const text = links.filter((link) => !link.ref);
  if (tiles.length === 0 && text.length === 0) return null;
  return (
    <SectionBlock id={id} title={title}>
      <TileGrid items={tiles} label={title} />
      {text.length > 0 && (
        <RefChips items={text} label={`${title} (not on the wiki as a page)`} className="mt-3" />
      )}
    </SectionBlock>
  );
}
