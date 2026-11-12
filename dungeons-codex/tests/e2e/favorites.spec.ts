import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import {
  collectConsoleProblems,
  expectNoSeriousA11yViolations,
  hasHorizontalScroll,
  settleAnimations,
} from './helpers';

const star = (page: Page, name: string) =>
  page.getByRole('button', { name: `Favorite ${name}`, exact: true });
const stored = (page: Page) => page.evaluate(() => localStorage.getItem('dc:favorites:v1'));
const headerCount = (page: Page, n: number) =>
  page.getByRole('link', { name: `Favorites, ${n} saved` });

test.describe('Favorites: starring', () => {
  test('a card ★ toggles, updates the header count live, and survives a reload', async ({
    page,
  }) => {
    const problems = collectConsoleProblems(page);
    await page.goto('/d1/weapons');
    await expect(headerCount(page, 0)).toBeVisible();
    await star(page, 'Claymore').click();
    await expect(star(page, 'Claymore')).toHaveAttribute('aria-pressed', 'true');
    await expect(headerCount(page, 1)).toBeVisible();
    expect(JSON.parse((await stored(page)) ?? 'null')).toEqual(['d1:weapons:claymore']);

    await page.reload();
    await expect(star(page, 'Claymore')).toHaveAttribute('aria-pressed', 'true');
    await expect(headerCount(page, 1)).toBeVisible();

    await star(page, 'Claymore').click();
    await expect(headerCount(page, 0)).toBeVisible();
    expect(problems).toEqual([]);
  });

  test('the detail page Favorite button toggles and persists on reload', async ({ page }) => {
    const problems = collectConsoleProblems(page);
    await page.goto('/d1/weapons/claymore');
    const button = page.getByRole('button', { name: 'Favorite Claymore' });
    await expect(button).toHaveAttribute('aria-pressed', 'false');
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await page.reload();
    await expect(page.getByRole('button', { name: 'Favorite Claymore' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(problems).toEqual([]);
  });

  test('another tab follows a change', async ({ page, context }) => {
    await page.goto('/d1/weapons');
    const other = await context.newPage();
    await other.goto('/d1/weapons');
    await star(page, 'Claymore').click();
    await expect(star(other, 'Claymore')).toHaveAttribute('aria-pressed', 'true');
    await expect(headerCount(other, 1)).toBeVisible();
  });

  test('keeps working for this page view when storage is blocked', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        get() {
          throw new DOMException('blocked', 'SecurityError');
        },
      });
    });
    await page.goto('/d1/weapons');
    await star(page, 'Claymore').click();
    await expect(star(page, 'Claymore')).toHaveAttribute('aria-pressed', 'true');
    await expect(headerCount(page, 1)).toBeVisible();
  });
});

test.describe('Favorites page', () => {
  test('empty state, then grouped cards per game tab', async ({ page }) => {
    const problems = collectConsoleProblems(page);
    await page.goto('/favorites');
    await expect(page.getByText('No favorites yet')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Browse Dungeons II' })).toBeVisible();

    await page.goto('/d1/weapons');
    await star(page, 'Claymore').click();
    await page.goto('/d2/weapons');
    await star(page, "Hunter's Hatchet").click();
    await page.goto('/favorites');

    await expect(page.getByRole('tab', { name: /^Dungeons 1$/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    const weapons = page.getByRole('region', { name: 'Weapons' });
    await expect(weapons.getByRole('link', { name: 'Claymore' })).toBeVisible();
    await page.getByRole('tab', { name: /^Dungeons II 1$/ }).click();
    await expect(page.getByRole('link', { name: "Hunter's Hatchet" })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Claymore' })).toHaveCount(0);

    // Un-starring on the page removes the card.
    await star(page, "Hunter's Hatchet").click();
    await expect(page.getByText('No Dungeons II favorites')).toBeVisible();
    expect(problems).toEqual([]);
  });

  test('export downloads the file, import (replace, then merge) restores it', async ({ page }) => {
    await page.goto('/d1/weapons');
    await star(page, 'Claymore').click();
    await star(page, 'Katana').click();
    await page.goto('/favorites');
    await expect(headerCount(page, 2)).toBeVisible();

    await page.getByRole('button', { name: 'Backup' }).click();
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export JSON' }).click();
    const file = await download;
    expect(file.suggestedFilename()).toBe('dungeons-codex-favorites.json');
    const path = await file.path();
    expect(JSON.parse(readFileSync(path, 'utf8'))).toEqual({
      version: 1,
      favorites: ['d1:weapons:claymore', 'd1:weapons:katana'],
    });

    // Empty the list, then import the file back (Replace).
    await page.evaluate(() => localStorage.removeItem('dc:favorites:v1'));
    await page.reload();
    await expect(page.getByText('No favorites yet')).toBeVisible();
    await page.getByLabel('Import favorites file').setInputFiles(path);
    const dialog = page.getByRole('dialog', { name: 'Import favorites' });
    await expect(dialog).toContainText('2 items found');
    await dialog.getByRole('button', { name: 'Replace' }).click();
    await expect(page.getByRole('link', { name: 'Claymore' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Katana' })).toBeVisible();
    await expect(headerCount(page, 2)).toBeVisible();

    // Merge keeps what is there and adds the file's items.
    await page.getByRole('button', { name: 'Favorite Katana' }).click();
    await expect(headerCount(page, 1)).toBeVisible();
    await page.getByLabel('Import favorites file').setInputFiles(path);
    await page
      .getByRole('dialog', { name: 'Import favorites' })
      .getByRole('button', { name: 'Merge' })
      .click();
    await expect(headerCount(page, 2)).toBeVisible();
  });

  test('a file that is not a backup is rejected with a message', async ({ page }) => {
    await page.goto('/favorites');
    await page.getByLabel('Import favorites file').setInputFiles({
      name: 'nope.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{"hello":"world"}'),
    });
    await expect(
      page.locator('.dc-toast').getByText('That file is not a favorites backup'),
    ).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('is axe clean in both themes, empty and filled, with no sideways scroll', async ({
    page,
  }) => {
    await page.goto('/favorites');
    await expect(page.getByText('No favorites yet')).toBeVisible();
    await expectNoSeriousA11yViolations(page);
    await page.goto('/d1/weapons');
    await star(page, 'Claymore').click();
    await star(page, 'Katana').click();
    await page.goto('/favorites');
    await expect(page.getByRole('link', { name: 'Claymore' })).toBeVisible();
    await expectNoSeriousA11yViolations(page);
    await page.evaluate(() => (document.documentElement.dataset.theme = 'light'));
    await settleAnimations(page);
    await expectNoSeriousA11yViolations(page);
    expect(await hasHorizontalScroll(page)).toBe(false);
    await page.getByRole('button', { name: 'Backup' }).click();
    await expect(page.getByRole('button', { name: 'Export JSON' })).toBeVisible();
    await settleAnimations(page); // the popover fades in
    await expectNoSeriousA11yViolations(page);
  });
});
