import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { breadcrumbJsonLd, jsonLdString, type Crumb } from '@/lib/seo';
import { cn } from '@/lib/utils/cn';

/**
 * Visible breadcrumb trail plus its schema.org BreadcrumbList. The last crumb is the current
 * page (no link, `aria-current="page"`).
 */
export function Breadcrumbs({ items, className }: { items: readonly Crumb[]; className?: string }) {
  return (
    <>
      <nav aria-label="Breadcrumb" className={cn('text-sm text-muted', className)}>
        <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
          {items.map((crumb, index) => {
            const last = index === items.length - 1;
            return (
              <li key={`${index}-${crumb.label}`} className="flex items-center gap-1.5">
                {crumb.href && !last ? (
                  <Link
                    href={crumb.href}
                    className="inline-flex min-h-6 items-center underline-offset-4 hover:text-text hover:underline"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span
                    aria-current={last ? 'page' : undefined}
                    className={last ? 'text-text' : undefined}
                  >
                    {crumb.label}
                  </span>
                )}
                {!last && <ChevronRight size={14} aria-hidden="true" />}
              </li>
            );
          })}
        </ol>
      </nav>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(breadcrumbJsonLd(items)) }}
      />
    </>
  );
}
