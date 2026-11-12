'use client';

import { Gem } from 'lucide-react';
import { useState, type CSSProperties } from 'react';
import { SectionBlock } from '@/components/entity/SectionBlock';
import { ToggleGroup } from '@/components/ui/ToggleGroup';
import { formatEffectValue, roman } from '@/lib/detail/text';
import type { Tier } from '@/lib/forge/enchantments';
import { cumulativeCost } from '@/lib/forge/points';
import type { TierProps } from '@/lib/forge/types';

const METAL: Record<Tier, { name: string; token: string }> = {
  1: { name: 'Bronze', token: 'var(--tier-bronze)' },
  2: { name: 'Silver', token: 'var(--tier-silver)' },
  3: { name: 'Gold', token: 'var(--tier-gold)' },
};

/**
 * Flip between tiers I, II and III of an enchantment or talisman and read the effect, its value
 * and (D1 enchantments) what the tier costs in enchantment points. Server-rendered with tier I
 * showing, so the page works without JavaScript.
 */
export function TierViewer({ kind, name, tiers, pointCost }: TierProps) {
  const [selected, setSelected] = useState<Tier>(tiers[0]?.tier ?? 1);
  const current = tiers.find((t) => t.tier === selected) ?? tiers[0];
  if (!current) return null;
  const metal = METAL[current.tier];
  const step = pointCost?.[current.tier - 1];
  const total = cumulativeCost(pointCost, current.tier);
  const isTalisman = kind === 'talisman';
  const options = tiers.map((t) => ({
    value: String(t.tier),
    label: roman(t.tier),
    ariaLabel: isTalisman
      ? `Tier ${roman(t.tier)}, ${METAL[t.tier].name}`
      : `Tier ${roman(t.tier)}`,
  }));

  return (
    <SectionBlock id="tier-viewer" title="Tier viewer">
      <div className="flex flex-col gap-4">
        <ToggleGroup
          aria-label={`${name} tier`}
          value={String(selected)}
          onValueChange={(value) => setSelected(Number(value) as Tier)}
          options={options}
          className="self-start"
        />
        <div
          aria-live="polite"
          data-testid="tier-panel"
          className={
            isTalisman
              ? 'tier-chip flex flex-col gap-2 p-4 sm:p-5'
              : 'flex flex-col gap-2 rounded-card border-[1.5px] border-line bg-surface-2 p-4 sm:p-5'
          }
          style={isTalisman ? ({ '--tier': metal.token } as CSSProperties) : undefined}
        >
          <span className="font-pixel text-micro tracking-pixel text-muted uppercase">
            Tier {roman(current.tier)}
            {isTalisman ? ` · ${metal.name}` : ''}
          </span>
          <span className="text-lg font-bold text-text" data-testid="tier-text">
            {current.text}
          </span>
          {current.value !== undefined && (
            <span className="text-sm text-muted">
              Value:{' '}
              <span className="font-pixel tracking-pixel text-text">
                {formatEffectValue(current.value, current.unit)}
              </span>
            </span>
          )}
          {step !== undefined && total !== undefined && (
            <span
              className="mt-1 inline-flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted"
              data-testid="tier-cost"
            >
              <span className="inline-flex items-center gap-1.5">
                <Gem size={15} className="text-soul-text" aria-hidden="true" />
                This tier costs <span className="font-pixel tracking-pixel text-text">
                  {step}
                </span>{' '}
                points
              </span>
              <span>
                Reaching it from scratch costs{' '}
                <span className="font-pixel tracking-pixel text-text">{total}</span>
              </span>
            </span>
          )}
        </div>
      </div>
    </SectionBlock>
  );
}
