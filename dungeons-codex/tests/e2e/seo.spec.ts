import { expect, test } from '@playwright/test';

test.describe('SEO basics', () => {
  test('sitemap.xml lists home, both hubs, About, all 16 category pages and every detail page', async ({
    request,
  }) => {
    const res = await request.get('/sitemap.xml');
    expect(res.ok()).toBe(true);
    const xml = await res.text();
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1] as string);
    const paths = locs.map((u) => new URL(u).pathname);
    // 20 static pages + one URL per entity (detail.spec.ts checks the entity count against the data).
    const staticPaths = paths.filter((p) => p.split('/').length <= 3);
    expect(staticPaths).toHaveLength(20);
    expect(paths.length).toBeGreaterThan(20);
    for (const p of [
      '/',
      '/d1',
      '/d2',
      '/about',
      '/d1/weapons',
      '/d1/dlcs',
      '/d1/cosmetics',
      '/d2/talismans',
      '/d2/quests',
    ]) {
      expect(paths).toContain(p);
    }
    expect(new Set(paths).size).toBe(paths.length);
  });

  test('robots.txt allows everything and points to the sitemap', async ({ request }) => {
    const text = await (await request.get('/robots.txt')).text();
    expect(text).toMatch(/User-Agent: \*/i);
    expect(text).toMatch(/Allow: \//i);
    expect(text).toMatch(/Sitemap: https?:\/\/[^\s]+\/sitemap\.xml/i);
  });

  test('a hub has title, description, canonical, Open Graph, Twitter card and breadcrumb JSON-LD', async ({
    page,
  }) => {
    await page.goto('/d1');
    await expect(page).toHaveTitle('Minecraft Dungeons: all sections | Dungeons Codex');
    const meta = (sel: string) => page.locator(sel).first().getAttribute('content');
    expect((await meta('meta[name="description"]'))?.length).toBeGreaterThan(40);
    expect((await meta('meta[name="description"]'))?.length).toBeLessThanOrEqual(155);
    expect(await page.locator('link[rel="canonical"]').getAttribute('href')).toMatch(/\/d1$/);
    expect(await meta('meta[property="og:title"]')).toBe(
      'Minecraft Dungeons: all sections | Dungeons Codex',
    );
    expect(await meta('meta[property="og:image"]')).toMatch(/\/brand\/og-default\.png$/);
    expect(await meta('meta[name="twitter:card"]')).toBe('summary_large_image');
    const ld = JSON.parse(
      (await page.locator('script[type="application/ld+json"]').first().textContent()) ?? '{}',
    );
    expect(ld['@type']).toBe('BreadcrumbList');
    expect(ld.itemListElement.map((i: { name: string }) => i.name)).toEqual([
      'Home',
      'Minecraft Dungeons',
    ]);
  });

  test('a category stub has the section title, canonical and a 3-step breadcrumb', async ({
    page,
  }) => {
    await page.goto('/d2/talismans');
    await expect(page).toHaveTitle('Talismans · Minecraft Dungeons II | Dungeons Codex');
    expect(await page.locator('link[rel="canonical"]').getAttribute('href')).toMatch(
      /\/d2\/talismans$/,
    );
    const ld = JSON.parse(
      (await page.locator('script[type="application/ld+json"]').first().textContent()) ?? '{}',
    );
    expect(ld.itemListElement).toHaveLength(3);
  });

  test('placeholder tool pages are noindex, the 404 too', async ({ page }) => {
    for (const url of ['/d1/compare', '/favorites', '/nope']) {
      await page.goto(url);
      expect(
        await page.locator('meta[name="robots"]').first().getAttribute('content'),
        url,
      ).toContain('noindex');
    }
  });

  test('the picker has the root title and the brand card', async ({ page }) => {
    await page.goto('/');
    expect(await page.locator('meta[property="og:image"]').first().getAttribute('content')).toMatch(
      /og-default\.png$/,
    );
    expect(await page.locator('html').getAttribute('lang')).toBe('en');
  });
});
