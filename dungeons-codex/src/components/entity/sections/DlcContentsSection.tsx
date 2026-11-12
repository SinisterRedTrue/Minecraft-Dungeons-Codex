import { TileGrid } from '@/components/entity/EntityTile';
import { SectionBlock } from '@/components/entity/SectionBlock';
import type { DlcContentGroup } from '@/lib/detail/context';

/** What a D1 DLC adds: one grid per category of the entities whose `dlc` is this DLC. */
export function DlcContentsSection({ groups }: { groups: readonly DlcContentGroup[] }) {
  const filled = groups.filter((group) => group.items.length > 0);
  if (filled.length === 0) return null;
  return (
    <SectionBlock id="contents" title="Contents">
      <div className="grid gap-6">
        {filled.map((group) => (
          <SectionBlock
            key={group.category}
            id={`contents-${group.category}`}
            title={`${group.label} (${group.items.length})`}
            level={3}
          >
            <TileGrid items={group.items.map((entity) => ({ entity }))} label={group.label} />
          </SectionBlock>
        ))}
      </div>
    </SectionBlock>
  );
}
