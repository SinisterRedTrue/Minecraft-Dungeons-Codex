import { RefChips } from '@/components/entity/RefLinks';
import { SectionBlock } from '@/components/entity/SectionBlock';
import { toLink, type Refs } from '@/lib/detail/refs';

/**
 * How to get something. D1 cosmetics: where it comes from, the season and the wiki's free text.
 * D2 enchantments: the quests / places that give it (linked when they resolved).
 */
export function ObtainingSection({
  obtainedFrom,
  season,
  howToObtain,
  obtaining,
  refs,
}: {
  /** Already spelled out ("Seasonal Adventure"). */
  obtainedFrom?: string | undefined;
  season?: string | undefined;
  howToObtain?: string | undefined;
  obtaining?: readonly unknown[] | undefined;
  refs: Refs;
}) {
  const sources = (obtaining ?? []).map((v) => toLink(v, refs));
  const lead = obtainedFrom ? `${obtainedFrom}${season ? ` · ${season}` : ''}` : season;
  if (!lead && !howToObtain && sources.length === 0) return null;
  return (
    <SectionBlock id="obtaining" title="How to obtain">
      {lead && <p className="text-lg font-semibold text-text">{lead}</p>}
      {howToObtain && <p className="mt-2 max-w-prose text-text">{howToObtain}</p>}
      {sources.length > 0 && (
        <RefChips items={sources} label="Sources" className={lead ? 'mt-3' : ''} />
      )}
    </SectionBlock>
  );
}
