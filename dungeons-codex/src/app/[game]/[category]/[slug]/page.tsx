import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SourceCredit } from '@/components/entity/SourceCredit';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { Panel } from '@/components/ui/Panel';
import { RarityFrame, type Rarity } from '@/components/ui/RarityFrame';
import { getSection } from '@/config/sections';
import { GAMES, allGameCategories, isValidCategory, isValidGame } from '@/config/games';
import { getAll, getBySlug } from '@/lib/data';
import type { Entity } from '@/lib/schemas';
import { pageMetadata, truncate } from '@/lib/seo';

export const dynamicParams = false;

/** Every entity of every category (Prompt 08 turns this into the full detail page). */
export function generateStaticParams() {
  return allGameCategories().flatMap(({ game, category }) =>
    (getAll(game, category as never) as unknown as Entity[]).map((entity) => ({
      game,
      category,
      slug: entity.slug,
    })),
  );
}

type Params = Promise<{ game: string; category: string; slug: string }>;

async function resolve(params: Params) {
  const { game, category, slug } = await params;
  if (!isValidGame(game) || !isValidCategory(game, category)) return undefined;
  const entity = getBySlug(game, category as never, slug) as unknown as Entity | undefined;
  const section = getSection(game, category);
  return entity && section ? { game, category, entity, section } : undefined;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const found = await resolve(params);
  if (!found) return {};
  const { game, category, entity, section } = found;
  return pageMetadata({
    title: `${entity.name} · ${section.label} · ${GAMES[game].name}`,
    description: truncate(entity.description ?? section.description),
    path: `/${game}/${category}/${entity.slug}`,
  });
}

const RARITIES: readonly Rarity[] = ['common', 'rare', 'special', 'unique'];

/**
 * Minimal detail page so no card link 404s: name, icon, description, a plain infobox and the
 * source credit. Prompt 08 replaces the body with the full layout.
 */
export default async function DetailPage({ params }: { params: Params }) {
  const found = await resolve(params);
  if (!found) notFound();
  const { game, category, entity, section } = found;
  const rarity = RARITIES.find((r) => r === entity.rarity);

  return (
    <div className="mx-auto max-w-site px-[var(--gutter)] py-8 sm:py-12">
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: GAMES[game].name, href: `/${game}` },
          { label: section.label, href: `/${game}/${category}` },
          { label: entity.name },
        ]}
      />
      <div className="mt-6 flex items-center gap-5">
        <RarityFrame size={72} rarity={rarity} src={entity.image?.src} alt="" />
        <h1 className="font-display text-h1 leading-tight font-black tracking-display text-text uppercase">
          {entity.name}
        </h1>
      </div>
      {entity.description && (
        <p className="mt-4 max-w-prose text-lg text-muted">{entity.description}</p>
      )}
      <Panel className="mt-8 max-w-md p-5">
        <h2 className="font-display text-h3 font-extrabold text-text uppercase">Infobox</h2>
        <p className="mt-2 text-muted">The full infobox and stats arrive with the detail pages.</p>
      </Panel>
      <div className="mt-8">
        <SourceCredit source={entity.source} />
      </div>
    </div>
  );
}
