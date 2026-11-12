import { RefChips, Tag } from '@/components/entity/RefLinks';
import { SectionBlock } from '@/components/entity/SectionBlock';
import { toLink, type Refs } from '@/lib/detail/refs';
import { formatNumber } from '@/lib/utils/format';

export interface QuestReward {
  when: 'first' | 'subsequent' | 'always';
  xp?: number | undefined;
  items: readonly string[];
  randomFrom?: readonly { text: string; count: number; from: readonly string[] }[] | undefined;
}

const WHEN: Record<QuestReward['when'], string> = {
  first: 'First completion',
  subsequent: 'Subsequent completions',
  always: 'Every completion',
};
const ORDER: QuestReward['when'][] = ['first', 'subsequent', 'always'];

/** Quest rewards as a timeline: what the first run gives, what repeats give, and random pools. */
export function QuestRewardsSection({
  rewards,
  refs,
}: {
  rewards: readonly QuestReward[] | undefined;
  refs: Refs;
}) {
  const steps = [...(rewards ?? [])]
    .filter((r) => r.xp !== undefined || r.items.length > 0 || (r.randomFrom?.length ?? 0) > 0)
    .sort((a, b) => ORDER.indexOf(a.when) - ORDER.indexOf(b.when));
  if (steps.length === 0) return null;
  return (
    <SectionBlock id="rewards" title="Rewards">
      <ol className="relative grid gap-5 border-l-2 border-line pl-6">
        {steps.map((step) => (
          <li key={step.when} className="relative">
            <span
              aria-hidden="true"
              className="absolute top-1.5 -left-[1.95rem] size-3 rounded-full border-2 border-accent bg-bg"
            />
            <h3 className="font-bold text-text">{WHEN[step.when]}</h3>
            <div className="mt-2 grid gap-3">
              {step.xp !== undefined && (
                <p>
                  <Tag>
                    <span className="mr-2 font-pixel text-micro tracking-pixel text-accent-text">
                      {formatNumber(step.xp)}
                    </span>
                    XP
                  </Tag>
                </p>
              )}
              {step.items.length > 0 && (
                <RefChips
                  items={step.items.map((i) => toLink(i, refs))}
                  label={`${WHEN[step.when]}: items`}
                />
              )}
              {(step.randomFrom ?? []).map((pool) => (
                <details
                  key={pool.text}
                  className="rounded-card border border-line bg-surface-1 p-3"
                >
                  <summary className="cursor-pointer font-semibold text-text">
                    {pool.text}
                    {pool.from.length > 0 && (
                      <span className="ml-2 text-sm font-normal text-muted">
                        ({pool.count} of {pool.from.length})
                      </span>
                    )}
                  </summary>
                  {pool.from.length > 0 && (
                    <RefChips
                      items={pool.from.map((i) => toLink(i, refs))}
                      label={`${pool.text}: possible items`}
                      className="mt-3"
                    />
                  )}
                </details>
              ))}
            </div>
          </li>
        ))}
      </ol>
    </SectionBlock>
  );
}
