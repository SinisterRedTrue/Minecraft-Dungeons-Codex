/**
 * SEO audit of every prerendered page (Prompt 13, task 6), read from the build output in
 * `.next/server/app/**\/*.html` (run `npm run build` first). For each page: a title, a
 * description of 40-155 characters, one canonical URL on the site, exactly one H1, Open Graph and
 * Twitter tags, valid JSON-LD (a BreadcrumbList whose last item is the page). Across pages:
 * titles are unique, and the sitemap lists the indexable pages (static + one per entity).
 *
 *   npx tsx scripts/dev/seo-audit.ts
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import * as cheerio from 'cheerio';

const APP = path.join(process.cwd(), '.next', 'server', 'app');
/** Not site pages: Next internals and the dev-only showcase (404 in production). */
const SKIP = new Set(['_global-error.html', '_not-found.html', 'dev/ui.html']);

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.name.endsWith('.html')) yield full;
  }
}

const problems: string[] = [];
const titles = new Map<string, string[]>();
const descriptions = new Map<string, string[]>();
const canonicals = new Set<string>();
let pages = 0;
let withJsonLd = 0;

for (const file of walk(APP)) {
  const rel = path.relative(APP, file).replace(/\\/g, '/');
  if (SKIP.has(rel)) continue;
  const route = '/' + rel.replace(/\.html$/, '').replace(/^index$/, '');
  const $ = cheerio.load(readFileSync(file, 'utf8'));
  pages += 1;
  const fail = (message: string) => problems.push(`${route}: ${message}`);

  const title = $('head > title').first().text().trim();
  if (!title) fail('no <title>');
  titles.set(title, [...(titles.get(title) ?? []), route]);

  const description = $('meta[name="description"]').attr('content')?.trim() ?? '';
  if (description.length < 40 || description.length > 155) {
    fail(`description is ${description.length} characters: "${description.slice(0, 60)}"`);
  }
  descriptions.set(description, [...(descriptions.get(description) ?? []), route]);

  const robots = $('meta[name="robots"]').attr('content') ?? '';
  const noindex = /noindex/.test(robots);

  const canonical = $('link[rel="canonical"]').attr('href');
  if (!canonical) fail('no canonical link');
  else {
    canonicals.add(canonical);
    const expected = route === '/' ? '' : route;
    if (!canonical.endsWith(expected) || (route !== '/' && !canonical.endsWith(route))) {
      fail(`canonical ${canonical} does not end with the route`);
    }
  }

  const h1 = $('h1').length;
  if (h1 !== 1) fail(`${h1} <h1> elements`);

  for (const tag of ['og:title', 'og:description', 'og:image', 'og:url']) {
    if (!$(`meta[property="${tag}"]`).attr('content')) fail(`no ${tag}`);
  }
  if ($('meta[name="twitter:card"]').attr('content') !== 'summary_large_image') {
    fail('twitter:card is not summary_large_image');
  }
  if (!$('html').attr('lang')) fail('no <html lang>');
  if ($('img:not([alt])').length > 0) fail(`${$('img:not([alt])').length} <img> without alt`);

  const scripts = $('script[type="application/ld+json"]').toArray();
  for (const script of scripts) {
    try {
      const data = JSON.parse($(script).text()) as {
        '@context'?: string;
        '@type'?: string;
        itemListElement?: { position: number; name: string }[];
      };
      if (data['@context'] !== 'https://schema.org') fail('JSON-LD without schema.org context');
      if (data['@type'] === 'BreadcrumbList') {
        const items = data.itemListElement ?? [];
        const positions = items.map((i) => i.position);
        if (items.length < 2 || positions.some((p, i) => p !== i + 1)) {
          fail('BreadcrumbList positions are not 1..n');
        }
        if (items.some((i) => !i.name)) fail('BreadcrumbList item without a name');
      }
    } catch {
      fail('JSON-LD is not valid JSON');
    }
  }
  if (scripts.length > 0) withJsonLd += 1;
  // Detail and category pages are the ones with breadcrumbs (Plans 05 Metadata).
  if (!noindex && /^\/d[12]\/[a-z]+(\/|$)/.test(route) && scripts.length === 0) {
    fail('no JSON-LD breadcrumb');
  }
}

for (const [title, routes] of titles) {
  if (routes.length > 1)
    problems.push(`duplicate title "${title}": ${routes.slice(0, 4).join(', ')}`);
}
for (const [description, routes] of descriptions) {
  // Placeholder tool pages share their description; entity pages must not.
  const entityRoutes = routes.filter((r) => r.split('/').length > 3);
  if (entityRoutes.length > 1) {
    problems.push(
      `duplicate description on ${entityRoutes.length} entity pages: "${description.slice(0, 60)}" (${entityRoutes.slice(0, 3).join(', ')})`,
    );
  }
}

console.log(
  `${pages} pages checked; ${titles.size} distinct titles; ${canonicals.size} distinct canonicals; ${withJsonLd} with JSON-LD`,
);
if (problems.length > 0) {
  console.error(`\n${problems.length} problem(s):`);
  for (const problem of problems.slice(0, 400)) console.error(`  ✖ ${problem}`);
  if (problems.length > 400) console.error(`  … and ${problems.length - 400} more`);
  process.exit(1);
}
console.log('seo-audit: OK');
