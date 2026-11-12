'use client';

import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/Badge';
import type { Value } from '@/lib/forge/damage';
import type { EnchantmentLine } from '@/lib/forge/enchantments';
import type { ForgeProps } from '@/lib/forge/types';
import { formatNumber } from '@/lib/utils/format';
import { roman } from '@/lib/detail/text';
import { ApproximateBadge } from './ApproximateBadge';
import { NumberTicker } from './NumberTicker';

const whole = (n: number) => formatNumber(Math.round(n), 0);

/** "1,490 – 2,759" with both ends counting up; one number when min and max round the same. */
function RangeTicker({ min, max, prefix = '' }: { min: number; max: number; prefix?: string }) {
  const format = (n: number) => `${prefix}${whole(n)}`;
  return (
    <span className="whitespace-nowrap">
      <NumberTicker value={min} format={format} />
      {Math.round(min) === Math.round(max) ? null : (
        <>
          {' – '}
          <NumberTicker value={max} format={format} />
        </>
      )}
    </span>
  );
}

function Row({
  label,
  children,
  badge,
}: {
  label: string;
  children: ReactNode;
  badge?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-muted">{label}</span>
        {badge}
      </div>
      <div className="m-0 font-pixel text-xl tracking-pixel text-text">{children}</div>
    </div>
  );
}

function effectText(value: number | undefined, unit: string | undefined, label: string): string {
  if (value === undefined) return label;
  const sign = value > 0 ? '+' : '';
  return `${label} ${sign}${formatNumber(value)}${unit === '%' ? '%' : ''}`;
}

/** Damage reduction has its own row, so it is not repeated in the effect list. */
const isReduction = (label: string) => /^damage reduction$/i.test(label);

export interface ForgeResultProps {
  props: ForgeProps;
  power: number;
  /** The item's value at this power: damage (weapons) or bonus health (armor). */
  base: Value | undefined;
  /** Damage after the folded enchantments (weapons). */
  boosted?: { min: number; max: number; multiplier: number } | undefined;
  lines: readonly EnchantmentLine[];
}

/** The right-hand side of the Forge: the numbers, their honesty badge and the effect lines. */
export function ForgeResult({ props, power, base, boosted, lines }: ForgeResultProps) {
  const isD1 = props.game === 'd1';
  const isWeapon = props.category === 'weapons';
  const changed = boosted !== undefined && boosted.multiplier !== 1;
  const armorEffects = (props.armor?.effects ?? []).filter((e) => !isReduction(e.label));
  return (
    <div
      aria-label="Result"
      role="group"
      className="flex flex-col gap-5"
      data-testid="forge-result"
    >
      {isD1 && isWeapon && (
        <div className="m-0 flex flex-col gap-4">
          <Row
            label={`Damage per hit at power ${power}`}
            badge={base?.approximate ? <ApproximateBadge value={base} /> : null}
          >
            {base ? (
              <span data-testid="damage-base">
                <RangeTicker min={base.min} max={base.max} />
              </span>
            ) : (
              <span className="text-base text-muted">Not enough data to estimate</span>
            )}
          </Row>
          {changed && boosted && (
            <Row label="With your enchantments">
              <span data-testid="damage-boosted">
                <RangeTicker min={boosted.min} max={boosted.max} />
              </span>{' '}
              <span className="text-base text-accent-text">
                +{formatNumber(Math.round((boosted.multiplier - 1) * 1000) / 10)}%
              </span>
            </Row>
          )}
          {props.speed !== undefined && (
            <Row label="Attack speed rating">{formatNumber(props.speed)}</Row>
          )}
        </div>
      )}

      {isD1 && !isWeapon && (
        <div className="m-0 flex flex-col gap-4">
          {props.armor?.damageReduction !== undefined && (
            <Row label="Damage reduction">
              {formatNumber(props.armor.damageReduction)}%
              <span className="ml-2 font-sans text-xs text-muted">does not change with power</span>
            </Row>
          )}
          <Row
            label={`Bonus health at power ${power}`}
            badge={base?.approximate ? <ApproximateBadge value={base} subject="health" /> : null}
          >
            {base ? (
              <span data-testid="health-base">
                <RangeTicker min={base.min} max={base.max} prefix="+" />
              </span>
            ) : (
              <span className="text-base text-muted">Not enough data to estimate</span>
            )}
          </Row>
          {props.armor?.baseHealth !== undefined && (
            <Row label="Base health">{formatNumber(props.armor.baseHealth)}</Row>
          )}
        </div>
      )}

      {isD1 && !isWeapon && armorEffects.length > 0 && (
        <div>
          <h4 className="mb-1.5 text-sm font-semibold text-muted">Armor effects</h4>
          <ul className="m-0 flex list-none flex-col gap-1 p-0 text-sm text-text">
            {armorEffects.map((effect) => (
              <li key={effect.label}>{effectText(effect.value, effect.unit, effect.label)}</li>
            ))}
          </ul>
        </div>
      )}

      {!isD1 && props.d2 && (props.d2.effects.length > 0 || props.d2.values.length > 0) && (
        <div>
          <h4 className="mb-1.5 text-sm font-semibold text-muted">Item effects</h4>
          <ul className="m-0 flex list-none flex-col gap-1 p-0 text-sm text-text">
            {props.d2.effects.map((effect) => (
              <li key={effect}>{effect}</li>
            ))}
            {props.d2.values.map((v) => (
              <li key={v.label}>{effectText(v.value, v.unit, v.label)}</li>
            ))}
          </ul>
          {props.d2.note && <p className="mt-1.5 text-xs text-muted">{props.d2.note}</p>}
        </div>
      )}

      <div>
        <h4 className="mb-1.5 text-sm font-semibold text-muted">Enchantment effects</h4>
        {lines.length === 0 ? (
          <p className="m-0 text-sm text-muted">No enchantments picked yet.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0" data-testid="forge-lines">
            {lines.map((line) => (
              <li
                key={line.slug}
                className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm text-text"
              >
                <span className="font-semibold">
                  {line.name} {roman(line.tier)}
                </span>
                <span className="text-muted">{line.text}</span>
                {line.applied && <Badge variant="dlc">In the number above</Badge>}
                {line.conditional && <Badge variant="partial">Situational</Badge>}
              </li>
            ))}
          </ul>
        )}
        {lines.some((l) => l.conditional) && (
          <p className="mt-2 mb-0 text-xs text-muted">
            Situational effects (against certain mobs, when wounded, on charged shots …) are never
            folded into the damage number.
          </p>
        )}
      </div>

      {!isD1 && (
        <p className="m-0 text-sm text-muted" data-testid="d2-note">
          Power-level scaling numbers aren&apos;t documented on the wiki yet, so only effect tiers
          are shown.
        </p>
      )}
    </div>
  );
}
