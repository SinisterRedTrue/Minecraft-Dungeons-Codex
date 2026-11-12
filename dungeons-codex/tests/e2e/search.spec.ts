import { expect, test, type Page } from '@playwright/test';
import { expectNoSeriousA11yViolations, hasHorizontalScroll, headerSearch } from './helpers';

const palette = (page: Page) => page.getByRole('dialog', { name: 'Search the Codex' });
const box = (page: Page) => palette(page).getByRole('combobox', { name: 'Search the Codex' });

/** Opens the palette with Ctrl+K and waits for the index to be ready (the Jump to list appears). */
async function openPalette(page: Page) {
  await page.keyboard.press('Control+k');
  await expect(palette(page)).toBeVisible();
  await expect(
    palette(page)
      .getByRole('group', { name: /Jump to|Recent/ })
      .first(),
  ).toBeVisible();
}

test.describe('Codex Search', () => {
  test('Ctrl+K, type "clay", Enter opens the Claymore page', async ({ page }) => {
    await page.goto('/d1');
    await openPalette(page);
    await expect(box(page)).toBeFocused();
    await box(page).fill('clay');
    const first = palette(page).getByRole('option').first();
    await expect(first).toContainText('Claymore');
    await expect(first).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/d1\/weapons\/claymore$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Claymore' })).toBeVisible();
    await expect(palette(page)).toBeHidden();
  });

  test('from the picker it searches both games and lists each game with a badge', async ({
    page,
  }) => {
    await page.goto('/');
    await openPalette(page);
    await expect(palette(page).getByRole('group', { name: 'Search scope' })).toHaveCount(0);
    await box(page).fill('claymore');
    await expect(palette(page).getByRole('group', { name: 'Weapons · D1' })).toBeVisible();
    await expect(palette(page).getByRole('group', { name: 'Weapons · D2' })).toBeVisible();
    await expect(palette(page).getByLabel('Minecraft Dungeons II').first()).toBeVisible();
  });

  test('"/" opens it, except while typing in a field', async ({ page }) => {
    // The in-results search box lives in a sheet on phones.
    test.skip((page.viewportSize()?.width ?? 0) < 1024, 'needs the inline filter panel');
    await page.goto('/d1/weapons');
    await page.getByRole('searchbox', { name: 'Search in results' }).fill('a');
    await page.keyboard.press('/');
    await expect(palette(page)).toHaveCount(0);
    await expect(page.getByRole('searchbox', { name: 'Search in results' })).toHaveValue('a/');
    await page.getByRole('heading', { level: 1 }).click();
    await page.keyboard.press('/');
    await expect(palette(page)).toBeVisible();
    await expect(box(page)).toBeFocused();
    await expect(box(page)).toHaveValue('');
    await page.keyboard.press('Escape');
    await expect(palette(page)).toBeHidden();
  });

  test('every entry point opens it: header button, hero pill, Ctrl+K', async ({ page }) => {
    await page.goto('/');
    await headerSearch(page).click();
    await expect(palette(page)).toBeVisible();
    await page.keyboard.press('Escape');
    await page
      .getByRole('main')
      .getByRole('button', { name: /^Search the Codex/ })
      .click();
    await expect(palette(page)).toBeVisible();
    await page.keyboard.press('Escape');
    await page.keyboard.press('Control+k');
    await expect(palette(page)).toBeVisible();
  });

  test('the index is downloaded lazily, once per game, and not before it is needed', async ({
    page,
  }) => {
    const requested: string[] = [];
    page.on('request', (r) => {
      if (r.url().includes('/search/')) requested.push(new URL(r.url()).pathname);
    });
    await page.goto('/d2');
    await page.waitForLoadState('networkidle');
    expect(requested).toEqual([]);
    await openPalette(page);
    expect(requested).toEqual(['/search/d2.json']);
    await palette(page).getByRole('button', { name: 'Both games', exact: true }).click();
    await expect(palette(page).getByRole('group', { name: 'Jump to' })).toBeVisible();
    await expect.poll(() => requested.sort()).toEqual(['/search/d1.json', '/search/d2.json']);
    await page.keyboard.press('Escape');
    await openPalette(page);
    expect(requested).toHaveLength(2);
  });

  test('scope: "This game" stays in the game, "Both games" reaches the other', async ({ page }) => {
    await page.goto('/d2');
    await openPalette(page);
    const thisGame = palette(page).getByRole('button', { name: /^This game/ });
    await expect(thisGame).toHaveAttribute('aria-pressed', 'true');
    await box(page).fill('satchel of elements');
    await expect(palette(page).getByText('Nothing found')).toBeVisible();
    await palette(page).getByRole('button', { name: 'Both games', exact: true }).click();
    const hit = palette(page).getByRole('option', { name: /Satchel of Elements/ });
    await expect(hit).toBeVisible();
    await expect(hit).toContainText('D1');
    await hit.click();
    await expect(page).toHaveURL(/\/d1\/artifacts\/satchel-of-elements$/);
  });

  test('tolerates typos and finds abbreviations', async ({ page }) => {
    await page.goto('/d1');
    await openPalette(page);
    await box(page).fill('claymroe');
    await expect(palette(page).getByRole('option').first()).toContainText('Claymore');
    await box(page).fill('hunters');
    await expect(palette(page).getByRole('option').first()).toContainText("Hunter's");
    await box(page).fill('fw arrow');
    await expect(palette(page).getByRole('option').first()).toContainText('Fireworks Arrow');
  });

  test('empty query: Jump to lists the 8 sections, and arrow keys + Enter go there', async ({
    page,
  }) => {
    await page.goto('/d2');
    await openPalette(page);
    const jump = palette(page).getByRole('group', { name: 'Jump to' });
    await expect(jump.getByRole('option')).toHaveCount(8);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/d2\/enchantments$/);
  });

  test('remembers what was opened under Recent, newest first, at most 8', async ({ page }) => {
    await page.goto('/d1');
    for (const [typed, url] of [
      ['claymore', /claymore$/],
      ['hunters armor', /hunters-armor$/],
    ] as const) {
      await openPalette(page);
      await box(page).fill(typed);
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(url);
      await expect(palette(page)).toBeHidden(); // its exit animation must end before reopening
    }
    await openPalette(page);
    const recent = palette(page).getByRole('group', { name: 'Recent' });
    const options = recent.getByRole('option');
    await expect(options).toHaveCount(2);
    await expect(options.nth(0)).toContainText("Hunter's Armor");
    await expect(options.nth(1)).toContainText('Claymore');
    expect(await page.evaluate(() => localStorage.getItem('dc:recent'))).toContain('claymore');
  });

  test('says so when nothing matches, and recovers when the index cannot load', async ({
    page,
  }) => {
    await page.route('**/search/d1.json', (route) => route.abort());
    await page.goto('/d1');
    await page.keyboard.press('Control+k');
    await expect(palette(page).getByRole('alert')).toContainText('Search could not load');
    await page.unroute('**/search/d1.json');
    await palette(page).getByRole('button', { name: 'Try again' }).click();
    await expect(palette(page).getByRole('group', { name: 'Jump to' })).toBeVisible();
    await box(page).fill('qqzzxx');
    await expect(palette(page).getByText('Nothing found')).toBeVisible();
  });

  test('closes with Escape and returns focus to the page', async ({ page }) => {
    await page.goto('/d1');
    await headerSearch(page).click();
    await expect(palette(page)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(palette(page)).toBeHidden();
    await expect(headerSearch(page)).toBeFocused();
  });

  test('fits the screen: a full-screen sheet on phones, a centred panel on desktop', async ({
    page,
  }) => {
    await page.goto('/d1');
    await openPalette(page);
    await box(page).fill('a');
    await expect(palette(page).getByRole('option').first()).toBeVisible();
    const viewport = page.viewportSize()!;
    const rect = await palette(page).evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height };
    });
    if (viewport.width < 640) {
      expect(Math.round(rect.w)).toBe(viewport.width);
      expect(Math.round(rect.h)).toBe(viewport.height);
    } else {
      expect(rect.w).toBeLessThanOrEqual(672);
      expect(rect.h).toBeLessThanOrEqual(viewport.height * 0.8 + 1);
      expect(Math.abs(rect.x + rect.w / 2 - viewport.width / 2)).toBeLessThan(2);
    }
    expect(await hasHorizontalScroll(page)).toBe(false);
  });

  for (const theme of ['dark', 'light'] as const) {
    test(`has no serious accessibility violations with results open (${theme})`, async ({
      page,
    }) => {
      await page.addInitScript((t) => localStorage.setItem('dc:theme', t), theme);
      await page.goto('/d2');
      await openPalette(page);
      await expectNoSeriousA11yViolations(page);
      await box(page).fill('hunters');
      await expect(palette(page).getByRole('option').first()).toBeVisible();
      await expectNoSeriousA11yViolations(page);
      await box(page).fill('qqzzxx');
      await expect(palette(page).getByText('Nothing found')).toBeVisible();
      await expectNoSeriousA11yViolations(page);
    });
  }
});
