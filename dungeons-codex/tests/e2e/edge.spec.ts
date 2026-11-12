import { expect, test, type Page } from '@playwright/test';
import { collectConsoleProblems, headerSearch } from './helpers';

// Prompt 13, task 9: every way a link or the browser can be unusual degrades gracefully: the page
// still renders and works, nothing throws, and a wrong link says so instead of showing a blank.

/** localStorage that throws on access, like a browser with site data blocked. */
async function blockStorage(page: Page) {
  await page.addInitScript(() => {
    for (const name of ['localStorage', 'sessionStorage']) {
      Object.defineProperty(window, name, {
        get() {
          throw new DOMException('blocked', 'SecurityError');
        },
      });
    }
  });
}

test.describe('malformed links', () => {
  for (const url of [
    '/d1/planner?b=%%%',
    '/d1/planner?b=r.AAAA',
    '/d1/planner?b=z' + 'x'.repeat(300),
    '/d2/planner?b=' + encodeURIComponent('{"v":1}'),
  ]) {
    test(`planner ${url.slice(0, 40)}`, async ({ page }) => {
      const problems = collectConsoleProblems(page);
      await page.goto(url);
      await expect(page.getByTestId('build-planner')).toBeVisible();
      await expect(page.getByRole('heading', { level: 1, name: 'Build Planner' })).toBeVisible();
      expect(problems).toEqual([]);
    });
  }

  test('compare ignores unknown items and a missing or wrong category', async ({ page }) => {
    const problems = collectConsoleProblems(page);
    for (const url of [
      '/d1/compare?c=weapons&items=nope,also-nope',
      '/d1/compare?c=not-a-category&items=claymore',
      '/d1/compare?items=,,,&diff=maybe',
      '/d1/compare?c=weapons&items=claymore,claymore,claymore,claymore,claymore,claymore',
    ]) {
      await page.goto(url);
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
      await expect(page.locator('main')).toBeVisible();
    }
    expect(problems).toEqual([]);
  });

  test('a detail page ignores a malformed forge link', async ({ page }) => {
    const problems = collectConsoleProblems(page);
    await page.goto('/d1/weapons/claymore?forge=%%%garbage');
    await expect(page.getByTestId('power-forge')).toBeVisible();
    await expect(page.getByLabel('Power level', { exact: true })).toHaveValue('100');
    expect(problems).toEqual([]);
  });

  test('category filters survive hostile values', async ({ page }) => {
    const problems = collectConsoleProblems(page);
    await page.goto(
      '/d2/armor?t=<script>&dmg=-5--9&p=%00&q=' + 'a'.repeat(500) + '&sort=;drop&view=table&u=2',
    );
    await expect(page.getByRole('heading', { level: 1, name: 'Armor' })).toBeVisible();
    expect(problems).toEqual([]);
  });
});

test.describe('unknown pages are a 404, not a crash', () => {
  for (const url of [
    '/d1/weapons/no-such-weapon',
    '/d1/no-such-category',
    '/d3',
    '/d2/talismans/ghost',
    '/d1/quests', // a Dungeons II category
    '/d2/dlcs', // a Dungeons I category
    '/d1/weapons/claymore/extra',
  ]) {
    test(url, async ({ page }) => {
      const response = await page.goto(url);
      expect(response?.status()).toBe(404);
      await expect(page.getByText('This chest is empty')).toBeVisible();
      await expect(
        page.getByRole('link', { name: 'Minecraft Dungeons', exact: true }).first(),
      ).toBeVisible();
    });
  }
});

test.describe('storage blocked', () => {
  test('theme, favorites, compare and the planner keep working for the page view', async ({
    page,
  }) => {
    await blockStorage(page);
    const problems = collectConsoleProblems(page);

    await page.goto('/d1/weapons');
    await expect(page.locator('html')).toHaveAttribute('data-theme', /dark|light/);
    await page.getByRole('button', { name: 'Favorite Claymore' }).click();
    await expect(page.getByRole('button', { name: 'Favorite Claymore' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await page.getByRole('button', { name: 'Compare Claymore' }).click();
    await expect(page.getByRole('button', { name: 'Compare Claymore' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await page.goto('/d1/planner');
    await expect(page.getByTestId('build-planner')).toBeVisible();
    await page.getByLabel('Build name').fill('No storage');
    await expect(page.getByLabel('Build name')).toHaveValue('No storage');

    await page.goto('/favorites');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(problems).toEqual([]);
  });

  test('search opens with no Recent list', async ({ page }) => {
    await blockStorage(page);
    await page.goto('/d1');
    await headerSearch(page).click();
    await expect(page.getByRole('dialog', { name: 'Search the Codex' })).toBeVisible();
    await page.getByRole('combobox', { name: 'Search the Codex' }).fill('clay');
    await expect(page.getByRole('option', { name: /Claymore/ }).first()).toBeVisible();
  });
});

test.describe('slow network', () => {
  test('a slow search index shows a loading state, then the results', async ({ page }) => {
    await page.route('**/search/d1.json', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2500));
      await route.continue();
    });
    await page.goto('/d1');
    await page.keyboard.press('Control+k');
    const dialog = page.getByRole('dialog', { name: 'Search the Codex' });
    await expect(dialog.getByText('Loading search…')).toBeAttached();
    await dialog.getByRole('combobox', { name: 'Search the Codex' }).fill('clay');
    await expect(dialog.getByRole('option', { name: /Claymore/ }).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test('a slow planner data file shows the skeleton, then the planner', async ({ page }) => {
    await page.route('**/planner/d1.json', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await route.continue();
    });
    await page.goto('/d1/planner');
    await expect(page.getByLabel('Loading the planner')).toBeVisible();
    await expect(page.getByTestId('build-planner')).toBeVisible({ timeout: 10_000 });
  });

  test('a failed planner data file offers a retry', async ({ page }) => {
    await page.route('**/planner/d1.json', (route) => route.abort());
    await page.goto('/d1/planner');
    await expect(page.getByText('Could not load the planner data')).toBeVisible();
    await page.unroute('**/planner/d1.json');
    await page.getByRole('button', { name: 'Try again' }).click();
    await expect(page.getByTestId('build-planner')).toBeVisible();
  });
});
