import Link from 'next/link';
import { SourceCredit } from '@/components/entity/SourceCredit';
import { Panel } from '@/components/ui/Panel';
import type { InfoRow } from '@/lib/detail/infobox';

/**
 * The key facts as a definition list, then a compact link to the source page. A row with several
 * values (variants, sub-areas) lists them one per line, linked where they resolved.
 */
export function Infobox({
  rows,
  source,
}: {
  rows: readonly InfoRow[];
  source: { title: string; url: string; revisionId: number };
}) {
  return (
    <Panel padding="sm" aria-labelledby="infobox-heading" role="region">
      <h2
        id="infobox-heading"
        className="mb-3 font-display text-h3 font-black tracking-display text-text uppercase"
      >
        Infobox
      </h2>
      {rows.length > 0 && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 text-sm">
          {rows.map((row) => (
            <div
              key={row.label}
              className="col-span-2 grid grid-cols-subgrid border-t border-line py-2"
            >
              <dt className="font-semibold text-muted">{row.label}</dt>
              <dd className="min-w-0 text-text">
                {row.values.map((value, index) => (
                  <span key={`${index}-${value.label}`} className="block">
                    {value.href ? (
                      <Link
                        href={value.href}
                        className="inline-flex min-h-6 items-center font-semibold text-accent-text underline underline-offset-4 hover:text-text pointer-coarse:min-h-11"
                      >
                        {value.label}
                      </Link>
                    ) : (
                      value.label
                    )}
                  </span>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      )}
      <div className="mt-2 border-t border-line pt-3">
        <SourceCredit source={source} compact />
      </div>
    </Panel>
  );
}
