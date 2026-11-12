import { SectionBlock } from '@/components/entity/SectionBlock';
import { roman } from '@/lib/detail/text';

export interface TalismanTier {
  tier: number;
  text: string;
  value?: number | undefined;
  unit?: string | undefined;
}

const METAL: Record<number, { name: string; token: string }> = {
  1: { name: 'Bronze', token: 'var(--tier-bronze)' },
  2: { name: 'Silver', token: 'var(--tier-silver)' },
  3: { name: 'Gold', token: 'var(--tier-gold)' },
};

/** T1–T3 of a talisman in bronze, silver and gold frames; the tier and metal are also spelled out. */
export function TalismanTiers({ tiers }: { tiers: readonly TalismanTier[] | undefined }) {
  if (!tiers || tiers.length === 0) return null;
  return (
    <SectionBlock id="tiers" title="Tiers">
      <ol className="grid gap-3 sm:grid-cols-3">
        {tiers.map((tier) => {
          const metal = METAL[tier.tier];
          return (
            <li
              key={tier.tier}
              className="tier-chip flex flex-col gap-1 p-4"
              style={{ '--tier': metal?.token ?? 'var(--line)' } as React.CSSProperties}
            >
              <span className="font-pixel text-micro tracking-pixel text-muted uppercase">
                Tier {roman(tier.tier)}
                {metal ? ` · ${metal.name}` : ''}
              </span>
              <span className="text-lg font-bold text-text">{tier.text}</span>
            </li>
          );
        })}
      </ol>
    </SectionBlock>
  );
}
