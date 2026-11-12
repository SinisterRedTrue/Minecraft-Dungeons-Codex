import { RefChips } from '@/components/entity/RefLinks';
import { SectionBlock } from '@/components/entity/SectionBlock';
import { toLink, type Refs } from '@/lib/detail/refs';

/**
 * Locations as chips: a link when the location resolved, plain text when it is a raw wiki name or
 * a quest ("Reward from …"). `title` adapts to what is listed ("Where to find", "Found in").
 */
export function WhereToFindSection({
  values,
  refs,
  title = 'Where to find',
}: {
  values: readonly unknown[] | undefined;
  refs: Refs;
  title?: string;
}) {
  const items = (values ?? [])
    .filter((v) => v !== undefined && v !== '')
    .map((v) => toLink(v, refs));
  if (items.length === 0) return null;
  return (
    <SectionBlock id="where-to-find" title={title}>
      <RefChips items={items} label={title} />
    </SectionBlock>
  );
}
