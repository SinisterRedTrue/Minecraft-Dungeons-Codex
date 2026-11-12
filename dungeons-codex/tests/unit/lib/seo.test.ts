import { describe, expect, it } from 'vitest';
import { breadcrumbJsonLd, buildSitemap, jsonLdString, pageMetadata, truncate } from '@/lib/seo';

describe('truncate', () => {
  it('leaves short text alone and collapses whitespace', () => {
    expect(truncate('  a   b\n c ')).toBe('a b c');
  });

  it('cuts long text at a word boundary within the limit, with an ellipsis', () => {
    const out = truncate('word '.repeat(80), 155);
    expect(out.length).toBeLessThanOrEqual(155);
    expect(out.endsWith('…')).toBe(true);
    expect(out).not.toMatch(/wor…$/);
  });

  it('hard-cuts a single long word', () => {
    expect(truncate('x'.repeat(300), 50)).toHaveLength(50);
  });
});

describe('pageMetadata', () => {
  const meta = pageMetadata({
    title: 'Weapons · Minecraft Dungeons',
    description: 'D',
    path: '/d1/weapons',
  });

  it('sets canonical, Open Graph and Twitter card', () => {
    expect(meta.title).toBe('Weapons · Minecraft Dungeons');
    expect(meta.alternates?.canonical).toBe('/d1/weapons');
    expect(meta.openGraph).toMatchObject({
      url: '/d1/weapons',
      title: 'Weapons · Minecraft Dungeons | Dungeons Codex',
      siteName: 'Dungeons Codex',
    });
    expect(meta.twitter).toMatchObject({ card: 'summary_large_image' });
    expect(meta.robots).toBeUndefined();
  });

  it('can mark a page noindex and use its own image', () => {
    const m = pageMetadata({
      title: 'T',
      description: 'D',
      path: '/p',
      noindex: true,
      image: '/x.png',
    });
    expect(m.robots).toEqual({ index: false, follow: true });
    expect(m.twitter).toMatchObject({ images: ['/x.png'] });
  });
});

describe('breadcrumb JSON-LD', () => {
  it('lists absolute URLs and leaves the current page unlinked', () => {
    const ld = breadcrumbJsonLd(
      [
        { label: 'Home', href: '/' },
        { label: 'Minecraft Dungeons', href: '/d1' },
        { label: 'Weapons' },
      ],
      'https://x.test',
    );
    expect(ld['@type']).toBe('BreadcrumbList');
    expect(ld.itemListElement.map((i) => i.position)).toEqual([1, 2, 3]);
    expect(ld.itemListElement[1]).toMatchObject({
      name: 'Minecraft Dungeons',
      item: 'https://x.test/d1',
    });
    expect(ld.itemListElement[2]).not.toHaveProperty('item');
  });

  it('escapes "<" so data cannot close the script tag', () => {
    expect(jsonLdString({ a: '</script><b>' })).not.toContain('<');
  });
});

describe('buildSitemap', () => {
  const urls = buildSitemap({ d1: '2026-11-12', d2: '2026-11-10' }, 'https://x.test');
  const set = new Set(urls.map((u) => u.url));

  it('has the home page, both hubs, About and all 16 category pages (and nothing else yet)', () => {
    expect(urls).toHaveLength(1 + 2 + 1 + 16);
    for (const path of ['/', '/d1', '/d2', '/about', '/d1/weapons', '/d1/dlcs', '/d2/talismans']) {
      expect(set.has(`https://x.test${path}`)).toBe(true);
    }
    expect(set.size).toBe(urls.length);
  });

  it('uses the sync date as lastModified, the latest one for the home page', () => {
    const last = (path: string) =>
      urls.find((u) => u.url === `https://x.test${path}`)?.lastModified;
    expect(last('/')).toEqual(new Date('2026-11-12'));
    expect(last('/d2')).toEqual(new Date('2026-11-10'));
    expect(last('/about')).toBeUndefined();
  });

  it('works without any sync data', () => {
    expect(buildSitemap({}, 'https://x.test').every((u) => u.lastModified === undefined)).toBe(
      true,
    );
  });
});
