import type { Metadata, MetadataRoute } from 'next';
import { GAME_IDS, allGameCategories, type GameId } from '@/config/games';
import { SITE_NAME, SITE_URL, absoluteUrl } from './site';

const DEFAULT_OG_IMAGE = '/brand/og-default.png';

export interface PageMeta {
  /** Without the site suffix; the root layout's title template appends " | Dungeons Codex". */
  title: string;
  /** Keep ≤ 155 characters. */
  description: string;
  /** Path starting with `/`; becomes the canonical URL and `og:url`. */
  path: string;
  /** Absolute-path image (relative to the site root); defaults to the brand card. `null` adds none (the segment has an opengraph-image file). */
  image?: string | null;
  noindex?: boolean;
}

/** Trims to a limit on a word boundary and adds an ellipsis. */
export function truncate(text: string, max = 155): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,.;:-]+$/, '')}…`;
}

/** Canonical URL, Open Graph and Twitter card for a page (Plans §05 "Metadata"). */
export function pageMetadata({ title, description, path, image, noindex }: PageMeta): Metadata {
  const desc = truncate(description);
  const images =
    image === null
      ? undefined
      : [{ url: image ?? DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: SITE_NAME }];
  return {
    title,
    description: desc,
    alternates: { canonical: path },
    openGraph: {
      title: `${title} | ${SITE_NAME}`,
      description: desc,
      url: path,
      siteName: SITE_NAME,
      type: 'website',
      locale: 'en_US',
      ...(images ? { images } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | ${SITE_NAME}`,
      description: desc,
      ...(images ? { images: images.map((i) => i.url) } : {}),
    },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  };
}

export interface Crumb {
  label: string;
  /** Omitted for the current page. */
  href?: string;
}

/** schema.org BreadcrumbList; URLs are absolute, the last item has no link when `href` is absent. */
export function breadcrumbJsonLd(crumbs: readonly Crumb[], base: string = SITE_URL) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.label,
      ...(crumb.href ? { item: absoluteUrl(crumb.href, base) } : {}),
    })),
  };
}

/** JSON for an inline `<script type="application/ld+json">`; `<` is escaped so data cannot close the tag. */
export function jsonLdString(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

export interface DetailEntry {
  game: GameId;
  category: string;
  slug: string;
}

/** Every sitemap entry: the static pages plus one URL per entity (`details`). */
export function buildSitemap(
  syncDates: Partial<Record<GameId, string>>,
  base: string = SITE_URL,
  details: readonly DetailEntry[] = [],
): MetadataRoute.Sitemap {
  const lastOf = (...dates: (string | undefined)[]): Date | undefined => {
    const latest = dates
      .filter((d): d is string => Boolean(d))
      .sort()
      .at(-1);
    return latest ? new Date(latest) : undefined;
  };
  const entry = (
    path: string,
    changeFrequency: 'weekly' | 'monthly',
    priority: number,
    lastModified?: Date,
  ): MetadataRoute.Sitemap[number] => ({
    url: absoluteUrl(path, base),
    changeFrequency,
    priority,
    ...(lastModified ? { lastModified } : {}),
  });

  return [
    entry('/', 'weekly', 1, lastOf(...GAME_IDS.map((g) => syncDates[g]))),
    ...GAME_IDS.map((game) => entry(`/${game}`, 'weekly', 0.9, lastOf(syncDates[game]))),
    entry('/about', 'monthly', 0.4),
    ...allGameCategories().map(({ game, category }) =>
      entry(`/${game}/${category}`, 'weekly', 0.8, lastOf(syncDates[game])),
    ),
    ...details.map(({ game, category, slug }) =>
      entry(`/${game}/${category}/${slug}`, 'monthly', 0.6, lastOf(syncDates[game])),
    ),
  ];
}
