import { SectionBlock } from '@/components/entity/SectionBlock';
import { Tag } from '@/components/entity/RefLinks';
import { formatEffectValue, nonEmpty } from '@/lib/detail/text';
import { sentenceCase } from '@/lib/filters/tokens';

export interface EffectValue {
  label: string;
  value: number;
  unit?: string;
}

/**
 * D2 weapon and armor effects: the wiki's sentence(s), an editor's note when there is one, and the
 * parsed numbers as value chips ("70% · Attacks have chance to grant the Strength status").
 */
export function EffectsSection({
  effect,
  effects,
  note,
  values,
}: {
  effect?: string | undefined;
  effects?: readonly unknown[] | undefined;
  note?: string | undefined;
  values?: readonly EffectValue[] | undefined;
}) {
  const lines = [...(effect ? [effect] : []), ...nonEmpty(effects)];
  const chips = values ?? [];
  if (lines.length === 0 && chips.length === 0) return null;
  return (
    <SectionBlock id="effects" title="Effects">
      {lines.length > 0 && (
        <ul className="grid list-disc gap-1.5 pl-5 marker:text-accent-text">
          {lines.map((line) => (
            <li key={line} className="text-text">
              {sentenceCase(line)}
            </li>
          ))}
        </ul>
      )}
      {chips.length > 0 && (
        <ul aria-label="Effect values" className="mt-3 flex flex-wrap gap-2">
          {chips.map((chip) => (
            <li key={`${chip.label}-${chip.value}`}>
              <Tag>
                <span className="mr-2 font-pixel text-micro tracking-pixel text-accent-text">
                  {formatEffectValue(chip.value, chip.unit)}
                </span>
                {sentenceCase(chip.label)}
              </Tag>
            </li>
          ))}
        </ul>
      )}
      {note && <p className="mt-3 text-sm text-muted">Wiki note: {note}</p>}
    </SectionBlock>
  );
}
