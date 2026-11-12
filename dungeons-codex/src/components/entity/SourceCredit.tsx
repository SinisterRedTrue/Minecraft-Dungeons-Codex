import { ExternalLink } from 'lucide-react';
import { LICENSE_URL } from '@/lib/site';

/**
 * "Data and image from Minecraft Wiki: {page} (revision #). CC BY-NC-SA 3.0" — required on every
 * detail page (`[ Plans ]/09-LEGAL-AND-ATTRIBUTION.md`). The `compact` form is the one-line
 * "Source" link inside the infobox; the full text sits at the foot of the page.
 */
export function SourceCredit({
  source,
  compact = false,
}: {
  source: { title: string; url: string; revisionId: number };
  compact?: boolean;
}) {
  if (compact) {
    return (
      <p className="text-sm text-muted">
        Source:{' '}
        <a
          href={source.url}
          rel="noopener"
          className="inline-flex min-h-6 items-center gap-1 underline underline-offset-4 hover:text-text"
        >
          Minecraft Wiki
          <ExternalLink size={13} aria-hidden="true" />
          <span className="sr-only">: {source.title}</span>
        </a>
      </p>
    );
  }
  return (
    <p className="text-sm text-muted">
      Data and image from{' '}
      <a href={source.url} rel="noopener" className="underline underline-offset-4 hover:text-text">
        Minecraft Wiki: {source.title}
      </a>{' '}
      (revision {source.revisionId}).{' '}
      <a
        href={LICENSE_URL}
        rel="license noopener"
        className="underline underline-offset-4 hover:text-text"
      >
        CC BY-NC-SA 3.0
      </a>
    </p>
  );
}
