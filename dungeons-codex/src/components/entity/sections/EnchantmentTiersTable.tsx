import { Tag } from '@/components/entity/RefLinks';
import { SectionBlock } from '@/components/entity/SectionBlock';
import { roman } from '@/lib/detail/text';
import { cn } from '@/lib/utils/cn';

export interface EnchantmentLevel {
  level: number;
  text: string;
  value?: number | undefined;
  unit?: string | undefined;
}

/**
 * Tier I–III of an enchantment: the effect text per level and, when the wiki gives them (D1), the
 * point cost per tier, the Gilded effect and the stackable / mob badges.
 */
export function EnchantmentTiersTable({
  levels,
  pointCost,
  gildedDescription,
  stackable,
  mobObtainable,
}: {
  levels: readonly EnchantmentLevel[] | undefined;
  pointCost?: readonly number[] | undefined;
  gildedDescription?: string | undefined;
  stackable?: boolean | undefined;
  mobObtainable?: boolean | undefined;
}) {
  if (!levels || levels.length === 0) return null;
  const hasCost = pointCost !== undefined && pointCost.length > 0;
  return (
    <SectionBlock id="tiers" title="Tiers">
      <div className="overflow-x-auto rounded-card border-[1.5px] border-line">
        <table className="w-full min-w-[20rem] border-collapse text-left text-sm">
          <caption className="sr-only">Effect of each enchantment tier</caption>
          <thead className="bg-surface-2 text-muted">
            <tr>
              <th scope="col" className="px-4 py-2.5 font-semibold">
                Tier
              </th>
              <th scope="col" className="px-4 py-2.5 font-semibold">
                Effect
              </th>
              {hasCost && (
                <th scope="col" className="px-4 py-2.5 text-right font-semibold">
                  Point cost
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {levels.map((level, index) => (
              <tr
                key={level.level}
                className={cn('border-t border-line', index % 2 === 1 && 'bg-bg-2')}
              >
                <th
                  scope="row"
                  className="px-4 py-3 font-pixel text-base tracking-pixel text-accent-text"
                >
                  {roman(level.level)}
                </th>
                <td className="px-4 py-3 text-text">{level.text}</td>
                {hasCost && (
                  <td className="px-4 py-3 text-right font-pixel tracking-pixel text-text">
                    {pointCost[level.level - 1] ?? '–'}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {gildedDescription && (
        <p className="mt-3 text-sm text-text">
          <span className="mr-2 font-pixel text-micro tracking-pixel text-rarity-unique uppercase">
            Gilded
          </span>
          {gildedDescription}
        </p>
      )}
      {(stackable !== undefined || mobObtainable !== undefined) && (
        <ul aria-label="Enchantment traits" className="mt-3 flex flex-wrap gap-2">
          {stackable !== undefined && (
            <li>
              <Tag>{stackable ? 'Stackable on one item' : 'One per item'}</Tag>
            </li>
          )}
          {mobObtainable !== undefined && (
            <li>
              <Tag>{mobObtainable ? 'Mobs can have it' : 'Not found on mobs'}</Tag>
            </li>
          )}
        </ul>
      )}
    </SectionBlock>
  );
}
