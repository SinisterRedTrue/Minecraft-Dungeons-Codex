import { SectionBlock } from '@/components/entity/SectionBlock';
import { nonEmpty } from '@/lib/detail/text';
import { sentenceCase } from '@/lib/filters/tokens';

/** A mob's attack names, as the wiki lists them. */
export function MobAttacksSection({ attacks }: { attacks: readonly unknown[] | undefined }) {
  const items = nonEmpty(attacks);
  if (items.length === 0) return null;
  return (
    <SectionBlock id="attacks" title="Attacks">
      <ul className="grid list-disc gap-1.5 pl-5 marker:text-accent-text">
        {items.map((attack) => (
          <li key={attack} className="text-text">
            {sentenceCase(attack)}
          </li>
        ))}
      </ul>
    </SectionBlock>
  );
}
