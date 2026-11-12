import { LICENSE_URL } from '@/lib/site';

/**
 * "Data and image from Minecraft Wiki: {page} (revision #). CC BY-NC-SA 3.0" — required on every
 * detail page (`[ Plans ]/09-LEGAL-AND-ATTRIBUTION.md`).
 */
export function SourceCredit({
  source,
}: {
  source: { title: string; url: string; revisionId: number };
}) {
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
