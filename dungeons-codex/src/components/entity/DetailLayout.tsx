import type { ReactNode } from 'react';
import { DetailHeader } from '@/components/entity/DetailHeader';
import { Infobox } from '@/components/entity/Infobox';
import { PrevNext } from '@/components/entity/PrevNext';
import { RelatedGrid } from '@/components/entity/RelatedGrid';
import { SourceCredit } from '@/components/entity/SourceCredit';
import { CompareButton } from '@/components/features/compare/CompareButton';
import { FavoriteButton } from '@/components/features/favorites/FavoriteButton';
import { DetailSection } from '@/components/entity/sections/DetailSection';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { ASIDE_SECTIONS } from '@/config/detail';
import { GAMES } from '@/config/games';
import type { DetailData } from '@/lib/detail/context';
import type { Crumb } from '@/lib/seo';

/**
 * The detail page (`[ Plans ]/05-ROUTES-AND-PAGES.md`, Wireframes §4): breadcrumbs with prev/next,
 * the header, a main column of sections and an aside with the infobox, then Related and the
 * source credit. The sections come from the category's `detailSections`, in that order.
 */
export function DetailLayout({
  data,
  sections,
}: {
  data: DetailData;
  /** `detailSections` of the category config. */
  sections: readonly string[];
}) {
  const { entity, game, category } = data;
  const crumbs: Crumb[] = [
    { label: 'Home', href: '/' },
    { label: GAMES[game].name, href: `/${game}` },
    { label: data.categoryLabel, href: `/${game}/${category}` },
    { label: entity.name },
  ];
  const intro =
    entity.description ?? (entity as unknown as { summary?: string }).summary ?? undefined;

  const render = (names: readonly string[]): ReactNode[] =>
    names.map((name) => <DetailSection key={name} name={name} data={data} />);
  const main = sections.filter((name) => !ASIDE_SECTIONS.includes(name));
  const aside = sections.filter((name) => ASIDE_SECTIONS.includes(name));

  return (
    <div className="mx-auto max-w-site px-[var(--gutter)] py-8 sm:py-12">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <Breadcrumbs items={crumbs} />
        <PrevNext prev={data.prev} next={data.next} categoryLabel={data.categoryLabel} />
      </div>

      <div className="mt-6">
        <DetailHeader
          name={entity.name}
          rarity={entity.rarity}
          imageSrc={entity.image?.src}
          chips={data.chips}
          badges={data.badges}
          quality={entity.quality}
          source={entity.source}
          actions={
            <>
              <FavoriteButton variant="detail" id={entity.id} name={entity.name} />
              <CompareButton
                variant="detail"
                item={{ game, category, slug: entity.slug, name: entity.name }}
              />
            </>
          }
        />
      </div>

      {/* Phones: infobox, main, extra. Desktop: main on the left, infobox + extra on the right. */}
      <div className="detail-grid mt-8">
        <div data-area="info">
          <Infobox rows={data.infobox} source={entity.source} />
        </div>
        <div data-area="main" className="grid min-w-0 content-start gap-8">
          {intro && <p className="max-w-prose text-lg text-muted">{intro}</p>}
          {render(main)}
        </div>
        <div data-area="extra" className="grid min-w-0 content-start gap-6">
          {render(aside)}
        </div>
      </div>

      <div className="mt-12 grid gap-8">
        <RelatedGrid cards={data.related} />
        <SourceCredit source={entity.source} />
      </div>
    </div>
  );
}
