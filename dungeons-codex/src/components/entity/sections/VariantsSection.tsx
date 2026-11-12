import { EntityTile } from '@/components/entity/EntityTile';
import { SectionBlock } from '@/components/entity/SectionBlock';
import type { Refs } from '@/lib/detail/refs';

/** Base item ↔ unique variants. A unique links up to its base; a base lists its uniques. */
export function VariantsSection({
  baseItemId,
  variantIds,
  refs,
}: {
  baseItemId?: string | undefined;
  variantIds?: readonly string[] | undefined;
  refs: Refs;
}) {
  const base = baseItemId ? refs[baseItemId] : undefined;
  const variants = (variantIds ?? []).flatMap((id) => (refs[id] ? [refs[id]] : []));
  if (!base && variants.length === 0) return null;
  return (
    <SectionBlock id="variants" title={base ? 'Base item' : 'Unique variants'}>
      <ul className="grid gap-2">
        {base && (
          <li>
            <EntityTile entity={base} note="Base item" />
          </li>
        )}
        {variants.map((variant) => (
          <li key={variant.id}>
            <EntityTile entity={variant} note="Unique variant" />
          </li>
        ))}
      </ul>
    </SectionBlock>
  );
}
