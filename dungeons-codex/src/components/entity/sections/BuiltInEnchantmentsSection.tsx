import { EntityTile } from '@/components/entity/EntityTile';
import { SectionBlock } from '@/components/entity/SectionBlock';
import type { Refs } from '@/lib/detail/refs';
import { roman } from '@/lib/detail/text';

export interface BuiltInEnchantment {
  enchantmentId: string;
  level?: number | undefined;
}

/** Enchantments an item comes with, as linked tiles with their level. */
export function BuiltInEnchantmentsSection({
  builtIn,
  refs,
}: {
  builtIn: readonly BuiltInEnchantment[] | undefined;
  refs: Refs;
}) {
  const tiles = (builtIn ?? []).flatMap((entry) => {
    const ref = refs[entry.enchantmentId];
    return ref ? [{ ref, level: entry.level }] : [];
  });
  if (tiles.length === 0) return null;
  return (
    <SectionBlock id="built-in-enchantments" title="Built-in enchantments">
      <ul className="grid gap-2">
        {tiles.map(({ ref, level }) => (
          <li key={ref.id}>
            <EntityTile entity={ref} {...(level ? { note: `Level ${roman(level)}` } : {})} />
          </li>
        ))}
      </ul>
    </SectionBlock>
  );
}
