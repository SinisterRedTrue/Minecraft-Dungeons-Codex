import { ArrowLeftRight, ClipboardList, Star } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { DlcStrip } from '@/components/hub/DlcStrip';
import { FeaturedScroller } from '@/components/hub/FeaturedScroller';
import { SectionTile } from '@/components/hub/SectionTile';
import { Button3D } from '@/components/ui/Button3D';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { GAMES, isValidGame, type CategorySlug, type GameId } from '@/config/games';
import { GAME_BLURB, getSection } from '@/config/sections';
import { getAll, getCounts, getSyncDate } from '@/lib/data';
import { getFeaturedUniques, getTileImage } from '@/lib/data/showcase';
import type { D1Dlc } from '@/lib/schemas';
import { pageMetadata } from '@/lib/seo';
import { formatNumber } from '@/lib/utils/format';

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ game: string }>;
}): Promise<Metadata> {
  const { game } = await params;
  if (!isValidGame(game)) return {};
  const total = Object.values(getCounts(game)).reduce((sum, n) => sum + n, 0);
  return pageMetadata({
    title: `${GAMES[game].name}: all sections`,
    description: `Explore ${formatNumber(total)} entries across ${GAMES[game].categories.length} sections of ${GAMES[game].name}: ${GAME_BLURB[game]}`,
    path: `/${game}`,
  });
}

const BAND = 'py-[var(--section-y-tight)]';

/** `/d1`, `/d2`: the Game Hub (Wireframes §2). */
export default async function GameHubPage({ params }: { params: Promise<{ game: string }> }) {
  const { game } = await params;
  if (!isValidGame(game)) notFound();
  return <GameHub game={game} />;
}

function GameHub({ game }: { game: GameId }) {
  const info = GAMES[game];
  const counts = getCounts(game) as Record<string, number>;
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
  const synced = getSyncDate(game);
  const featured = getFeaturedUniques(game, 8);
  const dlcs =
    game === 'd1'
      ? (getAll('d1', 'dlcs') as D1Dlc[]).slice().sort((a, b) => a.order - b.order)
      : [];

  return (
    <>
      <section
        aria-labelledby="hub-title"
        className="relative isolate overflow-hidden border-b border-line bg-bg-2 py-10 sm:py-14"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_55%_80%_at_10%_0%,var(--torch),transparent)]"
        />
        <div className="relative mx-auto flex max-w-site flex-col gap-4 px-[var(--gutter)]">
          <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: info.name }]} />
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-pixel text-micro tracking-pixel text-accent-text uppercase">
                {info.year}
              </p>
              <h1
                id="hub-title"
                className="font-display text-h1 leading-tight font-black tracking-display text-text uppercase"
              >
                {info.name}
              </h1>
              <p className="mt-2 max-w-prose text-lg text-muted">
                Explore {formatNumber(total)} entries across {info.categories.length} sections.{' '}
                {GAME_BLURB[game]}
              </p>
            </div>
            {synced && (
              <span className="inline-flex shrink-0 items-center self-start rounded-chip border border-line bg-surface-2 px-3 py-1 font-pixel text-micro tracking-pixel text-muted uppercase sm:self-auto">
                Synced {synced}
              </span>
            )}
          </div>
        </div>
      </section>

      <section aria-label="Sections" className={BAND}>
        <div className="mx-auto max-w-site px-[var(--gutter)]">
          <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-5">
            {(info.categories as readonly CategorySlug<GameId>[]).map((category) => {
              const section = getSection(game, category);
              const image = getTileImage(game, category);
              return (
                <li key={category}>
                  <SectionTile
                    href={`/${game}/${category}`}
                    label={section?.label ?? category}
                    count={counts[category] ?? 0}
                    description={section?.description ?? ''}
                    image={image ? { src: image.src, alt: image.alt } : undefined}
                  />
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {featured.length > 0 && (
        <section aria-labelledby="featured-title" className={`${BAND} bg-bg-2`}>
          <div className="mx-auto max-w-site px-[var(--gutter)]">
            <SectionHeading
              as="h2"
              align="left"
              eyebrow="Worth a look"
              title={<span id="featured-title">Featured uniques</span>}
              className="mb-6"
            />
            <FeaturedScroller items={featured} label={`Featured unique items in ${info.name}`} />
          </div>
        </section>
      )}

      {dlcs.length > 0 && (
        <section aria-labelledby="dlc-title" className={BAND}>
          <div className="mx-auto max-w-site px-[var(--gutter)]">
            <SectionHeading
              as="h2"
              align="left"
              eyebrow="In release order"
              title={<span id="dlc-title">DLC adventures</span>}
              className="mb-6"
            />
            <DlcStrip dlcs={dlcs} />
          </div>
        </section>
      )}

      <section aria-labelledby="tools-title" className={`${BAND} bg-bg-2`}>
        <div className="mx-auto max-w-site px-[var(--gutter)]">
          <SectionHeading
            as="h2"
            align="left"
            eyebrow="Tools"
            title={<span id="tools-title">Plan, compare, collect</span>}
            className="mb-6"
          />
          <div className="flex flex-wrap gap-4">
            <Button3D asChild size="lg" icon={<ArrowLeftRight size={20} aria-hidden="true" />}>
              <Link href={`/${game}/compare`}>Compare</Link>
            </Button3D>
            <Button3D asChild size="lg" icon={<ClipboardList size={20} aria-hidden="true" />}>
              <Link href={`/${game}/planner`}>Build Planner</Link>
            </Button3D>
            <Button3D
              asChild
              size="lg"
              variant="stone"
              icon={<Star size={20} aria-hidden="true" />}
            >
              <Link href="/favorites">Favorites</Link>
            </Button3D>
          </div>
        </div>
      </section>
    </>
  );
}
