import { Gem, TriangleAlert } from 'lucide-react';
import { ApproximateBadge } from '@/components/features/forge/ApproximateBadge';
import { Panel } from '@/components/ui/Panel';
import type { GameId } from '@/config/games';
import { formatEffectValue, type DamageLine, type Summary } from '@/lib/planner/summary';
import { formatNumber } from '@/lib/utils/format';

const range = (min: number, max: number) =>
  `${formatNumber(Math.round(min))}–${formatNumber(Math.round(max))}`;

function DamageRow({ line }: { line: DamageLine }) {
  const value = line.value;
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <dt className="text-muted">{line.label} damage per hit</dt>
      <dd className="m-0 flex flex-wrap items-center gap-2 font-pixel tracking-pixel text-text">
        {value && line.min !== undefined && line.max !== undefined ? (
          <>
            <span data-testid={`damage-${line.slotKey}`}>{range(line.min, line.max)}</span>
            {value.approximate && <ApproximateBadge value={value} />}
          </>
        ) : (
          <span className="font-sans text-sm text-muted">Not documented</span>
        )}
      </dd>
    </div>
  );
}

/** The live summary (Wireframes §6): points, damage at the build's power, effects and warnings. */
export function PlannerSummary({ game, summary }: { game: GameId; summary: Summary }) {
  const { filled, points, damage, effects, notes, warnings } = summary;
  return (
    <Panel padding="md" className="flex flex-col gap-5" data-testid="planner-summary">
      <h3 className="m-0 font-display text-h3 font-extrabold text-text uppercase">Summary</h3>
      {filled === 0 ? (
        <p className="m-0 text-muted">Choose items to see what your build adds up to.</p>
      ) : (
        <>
          <dl className="m-0 flex flex-col gap-3">
            {game === 'd1' && (
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <dt className="text-muted">Enchantment points</dt>
                <dd className="m-0 flex items-center gap-1.5 font-pixel tracking-pixel text-text">
                  <Gem size={16} aria-hidden="true" className="text-accent-text" />
                  <span data-testid="points">{points}</span>
                </dd>
              </div>
            )}
            {damage.map((line) => (
              <DamageRow key={line.slotKey} line={line} />
            ))}
          </dl>
          {game === 'd1' && damage.length > 0 && (
            <p className="m-0 text-xs text-muted">
              Damage at power {summary.power}, with the enchantments that always add damage.
            </p>
          )}

          <section aria-label="Effects" className="flex flex-col gap-2">
            <h4 className="m-0 text-sm font-bold text-text">Effects</h4>
            {effects.length === 0 && notes.length === 0 ? (
              <p className="m-0 text-sm text-muted">Nothing here adds an effect yet.</p>
            ) : (
              <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                {effects.map((effect) => (
                  <li key={`${effect.label}|${effect.unit ?? ''}`} className="text-sm">
                    <span className="font-pixel tracking-pixel text-accent-text">
                      {formatEffectValue(effect.value, effect.unit)}
                    </span>{' '}
                    <span className="text-text">{effect.label}</span>
                    <span className="block text-xs text-muted">
                      from {effect.sources.join(', ')}
                    </span>
                  </li>
                ))}
                {notes.map((note) => (
                  <li key={note} className="text-sm text-text">
                    {note}
                  </li>
                ))}
              </ul>
            )}
            <p className="m-0 text-xs text-muted">
              Simple sum: in-game stacking may differ.
              {game === 'd2' &&
                " Power-level scaling numbers aren't documented on the wiki yet, so only effect tiers are shown."}
            </p>
          </section>
        </>
      )}
      {warnings.length > 0 && (
        <ul aria-label="Warnings" className="m-0 flex list-none flex-col gap-2 p-0">
          {warnings.map((warning) => (
            <li
              key={warning.slug}
              className="flex items-start gap-2 rounded-card border border-rarity-unique/60 bg-surface-2 p-3 text-sm text-text"
            >
              <TriangleAlert
                size={18}
                aria-hidden="true"
                className="mt-0.5 shrink-0 text-rarity-unique"
              />
              <span>
                <span className="font-semibold">Duplicate artifact:</span> {warning.name} is in{' '}
                {warning.slots.join(' and ')}. The game does not allow the same artifact twice.
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
