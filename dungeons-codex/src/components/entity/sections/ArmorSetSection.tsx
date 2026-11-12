import { TileGrid } from '@/components/entity/EntityTile';
import { SectionBlock } from '@/components/entity/SectionBlock';
import type { EntityRef } from '@/lib/detail/refs';

/** D2 Set view: all pieces of the armor set with links; the current piece is marked. */
export function ArmorSetSection({
  setName,
  pieces,
  currentId,
}: {
  setName: string | undefined;
  pieces: readonly EntityRef[];
  currentId: string;
}) {
  if (pieces.length < 2) return null;
  return (
    <SectionBlock id="set" title={setName ? `Set: ${setName}` : 'Armor set'}>
      <TileGrid
        label={setName ?? 'Armor set'}
        items={pieces.map((entity) => ({ entity, current: entity.id === currentId }))}
        className="xl:grid-cols-2"
      />
    </SectionBlock>
  );
}
