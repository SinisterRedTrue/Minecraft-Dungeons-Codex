import { SectionBlock } from '@/components/entity/SectionBlock';
import { sentenceCase } from '@/lib/filters/tokens';
import { nonEmpty } from '@/lib/detail/text';

/** The wiki's property bullets ("Dual wield", "Spin attack"), as written. */
export function PropertiesSection({ properties }: { properties: readonly unknown[] | undefined }) {
  const items = nonEmpty(properties);
  if (items.length === 0) return null;
  return (
    <SectionBlock id="properties" title="Properties">
      <ul className="grid list-disc gap-1.5 pl-5 marker:text-accent-text">
        {items.map((text) => (
          <li key={text} className="text-text">
            {sentenceCase(text)}
          </li>
        ))}
      </ul>
    </SectionBlock>
  );
}
