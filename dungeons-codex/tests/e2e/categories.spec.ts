import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { countOf, expectNoSeriousA11yViolations, hasHorizontalScroll } from './helpers';

// All 16 Category Browser pages (Prompt 07 task 9): they render, have results, the first type
// chip narrows (or keeps) the count, and axe finds nothing serious, in both themes.
const PAGES = [
  ...[
    'weapons',
    'armor',
    'enchantments',
    'artifacts',
    'dlcs',
    'cosmetics',
    'mobs',
    'locations',
  ].map((category) => ({ game: 'd1' as const, category })),
  ...[
    'weapons',
    'armor',
    'enchantments',
    'artifacts',
    'talismans',
    'quests',
    'mobs',
    'locations',
  ].map((category) => ({ game: 'd2' as const, category })),
];

/** What the default view lists: D2 weapons hide the 4 unobtainable ones until asked. */
function listedCount(game: 'd1' | 'd2', category: string): number {
  const total = countOf(game, category);
  if (game !== 'd2' || category !== 'weapons') return total;
  const file = path.join(process.cwd(), 'data', 'generated', game, `${category}.json`);
  const items = JSON.parse(readFileSync(file, 'utf8')) as { obtainable?: boolean }[];
  return total - items.filter((i) => i.obtainable === false).length;
}

async function resultCount(page: Page): Promise<number> {
  const status = page
    .getByRole('status')
    .filter({ hasText: /results?/ })
    .first();
  const text = (await status.textContent()) ?? '';
  return Number(/([\d,]+)\s+results?/.exec(text)?.[1]?.replace(/,/g, ''));
}

for (const { game, category } of PAGES) {
  test.describe(`/${game}/${category}`, () => {
    test('lists everything, and the first type chip keeps the count valid', async ({ page }) => {
      const total = listedCount(game, category);
      await page.goto(`/${game}/${category}`);
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
      await expect.poll(() => resultCount(page)).toBe(total);
      expect(total).toBeGreaterThan(0);
      await expect(page.getByRole('link', { name: /\S/ }).first()).toBeVisible();
      // One card per item.
      await expect(page.locator('main article')).toHaveCount(total);

      const all = page.getByRole('button', { name: /^All\b/ }).first();
      if (await all.count()) {
        const row = page.getByRole('group').filter({ has: all }).first();
        const chips = row.getByRole('button');
        const first = chips.nth(1);
        const wanted = Number(/(\d+)\s*$/.exec((await first.textContent()) ?? '')?.[1]);
        await first.click();
        await expect(first).toHaveAttribute('aria-pressed', 'true');
        await expect.poll(() => resultCount(page)).toBe(wanted);
        expect(wanted).toBeGreaterThan(0);
        expect(wanted).toBeLessThanOrEqual(total);
        expect(new URL(page.url()).searchParams.get('t')).not.toBeNull();
        // Back to All.
        await all.click();
        await expect.poll(() => resultCount(page)).toBe(total);
      }
    });

    test('has no horizontal scroll', async ({ page }) => {
      await page.goto(`/${game}/${category}`);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      expect(await hasHorizontalScroll(page)).toBe(false);
    });

    for (const theme of ['dark', 'light'] as const) {
      test(`axe finds nothing serious (${theme})`, async ({ page }) => {
        await page.addInitScript((t) => localStorage.setItem('dc:theme', t), theme);
        await page.goto(`/${game}/${category}`);
        await page
          .getByRole('status')
          .filter({ hasText: /results?/ })
          .first()
          .waitFor();
        await page.waitForLoadState('networkidle');
        await expectNoSeriousA11yViolations(page);
      });
    }
  });
}

test('every card link resolves to a real detail page', async ({ request }) => {
  // One page per category is enough to prove the route exists for each pair (Prompt 08 tests all).
  const responses = await Promise.all(
    PAGES.map(async ({ game, category }) => {
      const page = await request.get(`/${game}/${category}`);
      const html = await page.text();
      const href = new RegExp(`href="(/${game}/${category}/[a-z0-9-]+)"`).exec(html)?.[1];
      expect(href, `${game}/${category} has a card link`).toBeDefined();
      return request.get(href as string);
    }),
  );
  for (const response of responses) expect(response.status()).toBe(200);
});
