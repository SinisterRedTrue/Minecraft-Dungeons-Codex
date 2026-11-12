import { readFileSync } from 'node:fs';
import path from 'node:path';
import { test } from '@playwright/test';
import { seededPick } from '../../src/lib/utils/seed';
import { expectNoSeriousA11yViolations, settleAnimations } from './helpers';

// The Plans 08 route list: 0 serious/critical axe violations on every page template, in both
// themes. The two Playwright projects (desktop, 390 px phone) make it the full
// templates × themes × viewports matrix. Overlays (search, picker, menus) are swept by the
// feature specs; this spec owns the page-level sweep.

const CATEGORIES = {
  d1: ['weapons', 'armor', 'enchantments', 'artifacts', 'dlcs', 'cosmetics', 'mobs', 'locations'],
  d2: ['weapons', 'armor', 'enchantments', 'artifacts', 'talismans', 'quests', 'mobs', 'locations'],
} as const;

function slugsOf(game: 'd1' | 'd2', category: string): string[] {
  const file = path.join(process.cwd(), 'data', 'generated', game, `${category}.json`);
  return (JSON.parse(readFileSync(file, 'utf8')) as { slug: string }[]).map((e) => e.slug);
}

// One detail page per category type, picked with a seed that differs from the detail sweep.
const details = (['d1', 'd2'] as const).flatMap((game) =>
  CATEGORIES[game].map((category) => {
    const slug = seededPick(slugsOf(game, category), 1, `a11y:${game}:${category}`)[0] as string;
    return `/${game}/${category}/${slug}`;
  }),
);

const ROUTES = [
  '/',
  '/d1',
  '/d2',
  '/d1/weapons',
  '/d2/armor',
  '/d1/dlcs',
  '/d2/quests',
  ...details,
  '/d1/compare?c=weapons&items=claymore,katana,daggers',
  '/d2/compare?c=armor&items=sorcerer-boots,alchemist-loafers',
  '/d1/planner',
  '/d2/planner',
  '/favorites',
  '/about',
  '/no-such-page',
];

for (const theme of ['dark', 'light'] as const) {
  test.describe(`axe sweep (${theme})`, () => {
    test.use({ colorScheme: theme });
    for (const url of ROUTES) {
      test(url, async ({ page }) => {
        await page.addInitScript((t) => localStorage.setItem('dc:theme', t), theme);
        await page.goto(url);
        await page.waitForLoadState('networkidle');
        await settleAnimations(page);
        await expectNoSeriousA11yViolations(page);
      });
    }
  });
}
