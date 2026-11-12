import { SectionBlock } from '@/components/entity/SectionBlock';
import { StatBar } from '@/components/ui/StatBar';
import type { StatItem } from '@/lib/detail/stats';

/** Stat bars, each scaled to the largest value in the category. Renders nothing without stats. */
export function StatsSection({ stats }: { stats: readonly StatItem[] }) {
  if (stats.length === 0) return null;
  return (
    <SectionBlock id="stats" title="Stats">
      <div className="grid max-w-xl gap-4">
        {stats.map((stat) => (
          <StatBar
            key={stat.label}
            label={stat.label}
            value={stat.value}
            max={stat.max}
            {...(stat.unit ? { unit: stat.unit } : {})}
          />
        ))}
      </div>
      <p className="mt-3 text-xs text-muted">
        Bars are scaled to the highest value in this category.
      </p>
    </SectionBlock>
  );
}
