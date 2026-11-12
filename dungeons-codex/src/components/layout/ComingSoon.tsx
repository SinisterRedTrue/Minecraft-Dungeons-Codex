import type { ReactNode } from 'react';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Crumb } from '@/lib/seo';

/**
 * Temporary page body for routes that later prompts build (category browsers, Compare, Planner,
 * Favorites). It keeps every link in the shell alive instead of ending in a 404.
 */
export function ComingSoon({
  crumbs,
  title,
  intro,
  heading = 'Coming soon',
  text,
  action,
}: {
  crumbs: readonly Crumb[];
  title: string;
  intro?: ReactNode;
  heading?: string;
  text: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-site px-[var(--gutter)] py-10 sm:py-14">
      <Breadcrumbs items={crumbs} />
      <h1 className="mt-4 font-display text-h1 leading-tight font-black tracking-display text-text uppercase">
        {title}
      </h1>
      {intro && <p className="mt-2 max-w-prose text-lg text-muted">{intro}</p>}
      <EmptyState className="mt-8" title={heading} text={text} action={action} />
    </div>
  );
}
