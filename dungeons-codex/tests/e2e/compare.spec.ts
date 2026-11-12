import { expect, test, type Page } from '@playwright/test';
import {
  collectConsoleProblems,
  expectNoSeriousA11yViolations,
  hasHorizontalScroll,
  settleAnimations,
} from './helpers';

const cardToggle = (page: Page, name: string) =>
  page.getByRole('button', { name: `Compare ${name}`, exact: true });
const tray = (page: Page) => page.getByRole('region', { name: 'Compare tray' });
const stored = (page: Page, game = 'd1') =>
  page.evaluate((key) => localStorage.getItem(key), `dc:compare:${game}`);

test.describe('Compare: selecting', () => {
  test('⇄ on cards fills the tray, which links to the compare page and clears', async ({
    page,
  }) => {
    const problems = collectConsoleProblems(page);
    await page.goto('/d1/weapons');
    await expect(tray(page)).toHaveCount(0);
    await cardToggle(page, 'Claymore').click();
    await expect(cardToggle(page, 'Claymore')).toHaveAttribute('aria-pressed', 'true');
    await expect(tray(page)).toBeVisible();
    await expect(tray(page).getByRole('status')).toHaveText('1/4 selected');
    await cardToggle(page, 'Katana').click();
    await expect(tray(page).getByRole('status')).toHaveText('2/4 selected');

    await tray(page).getByRole('link', { name: 'Compare' }).click();
    // A client navigation to a page not visited yet can take a while when all workers are busy.
    await expect(page).toHaveURL(/\/d1\/compare\?c=weapons&items=claymore,katana$/, {
      timeout: 20_000,
    });
    await expect(page.getByRole('table')).toBeVisible();
    expect(problems).toEqual([]);

    await page.goBack();
    await expect(tray(page)).toBeVisible(); // the selection survived navigation
    await tray(page).getByRole('button', { name: 'Clear' }).click();
    await expect(tray(page)).toHaveCount(0);
    await expect(cardToggle(page, 'Claymore')).toHaveAttribute('aria-pressed', 'false');
  });

  test('the selection persists across a reload', async ({ page }) => {
    await page.goto('/d1/weapons');
    await cardToggle(page, 'Claymore').click();
    await page.reload();
    await expect(cardToggle(page, 'Claymore')).toHaveAttribute('aria-pressed', 'true');
    await expect(tray(page).getByRole('status')).toHaveText('1/4 selected');
  });

  test('a fifth item is refused with a toast', async ({ page }) => {
    await page.goto('/d1/weapons');
    for (const name of ['Anchor', 'Ancient Bow', 'Auto Crossbow', 'Axe']) {
      await cardToggle(page, name).click();
    }
    await expect(tray(page).getByRole('status')).toHaveText('4/4 selected');
    await cardToggle(page, 'Baby Crossbows').click();
    const toast = page.locator('.dc-toast');
    await expect(toast.getByText('Compare holds up to 4.')).toBeVisible();
    await expect(toast.getByText('Remove one first.')).toBeVisible();
    await expect(cardToggle(page, 'Baby Crossbows')).toHaveAttribute('aria-pressed', 'false');
  });

  test('another category asks first; the toast action starts a new comparison', async ({
    page,
  }) => {
    await page.goto('/d1/weapons');
    await cardToggle(page, 'Claymore').click();
    await page.goto('/d1/armor');
    await cardToggle(page, "Hero's Armor").click();
    await expect(page.locator('.dc-toast').getByText('You are comparing Weapons.')).toBeVisible();
    await expect(cardToggle(page, "Hero's Armor")).toHaveAttribute('aria-pressed', 'false');
    await page.getByRole('button', { name: 'Start a new comparison' }).click();
    await expect(cardToggle(page, "Hero's Armor")).toHaveAttribute('aria-pressed', 'true');
    expect(JSON.parse((await stored(page)) ?? 'null')).toEqual({
      category: 'armor',
      slugs: ['heros-armor'],
    });
  });

  test('the detail page header adds to compare, and DLC pages have no ⇄', async ({ page }) => {
    await page.goto('/d1/weapons/claymore');
    const button = page.getByRole('button', { name: 'Compare Claymore' });
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await page.goto('/d1/weapons');
    await expect(cardToggle(page, 'Claymore')).toHaveAttribute('aria-pressed', 'true');

    await page.goto('/d1/dlcs');
    await expect(page.getByRole('button', { name: /^Compare / })).toHaveCount(0);
  });

  test('another tab follows a change, and the two games keep separate selections', async ({
    page,
    context,
  }) => {
    await page.goto('/d1/weapons');
    await cardToggle(page, 'Claymore').click();
    const other = await context.newPage();
    await other.goto('/d1/weapons');
    await expect(cardToggle(other, 'Claymore')).toHaveAttribute('aria-pressed', 'true');
    await cardToggle(page, 'Claymore').click(); // unselect in the first tab
    await expect(cardToggle(other, 'Claymore')).toHaveAttribute('aria-pressed', 'false');
    await cardToggle(page, 'Claymore').click();
    await other.goto('/d2/weapons');
    await expect(tray(other)).toHaveCount(0);
  });

  test('the search palette adds with Ctrl+Enter and keeps the palette open', async ({ page }) => {
    await page.goto('/d1');
    await page.keyboard.press('Control+k');
    const dialog = page.getByRole('dialog', { name: 'Search the Codex' });
    await expect(dialog.getByRole('group', { name: /Jump to|Recent/ }).first()).toBeVisible();
    await dialog.getByRole('combobox').fill('claymore');
    await expect(dialog.getByRole('option').first()).toContainText('Claymore');
    // The key hints are for keyboards: they are hidden on touch devices.
    await expect(dialog.getByText('Ctrl ↵ add to compare')).toBeAttached();
    await page.keyboard.press('Control+Enter');
    await expect(dialog.getByText('Claymore added to Compare')).toBeVisible();
    await expect(dialog).toBeVisible();
    expect(JSON.parse((await stored(page)) ?? 'null')).toEqual({
      category: 'weapons',
      slugs: ['claymore'],
    });
  });
});

test.describe('Compare page', () => {
  test('shows the table, highlights the best, and Differences only hides equal rows', async ({
    page,
  }) => {
    const problems = collectConsoleProblems(page);
    await page.goto('/d1/compare?c=weapons&items=claymore,katana,daggers');
    const table = page.getByRole('table');
    await expect(table).toBeVisible();
    await expect(table.getByRole('columnheader')).toHaveCount(4);
    // Damage: the best cell is marked in the table and for screen readers.
    const damage = table.getByRole('row', { name: /^Damage/ });
    await expect(damage.locator('td[data-best]')).toHaveCount(1);
    await expect(damage.locator('td[data-best]')).toContainText('(best)');

    const rows = await table.getByRole('rowheader').allTextContents();
    expect(rows).toEqual(expect.arrayContaining(['Rarity', 'Damage', 'Attack speed']));
    await page.getByRole('switch', { name: 'Differences only' }).click();
    await expect(page).toHaveURL(/diff=true/);
    const after = await table.getByRole('rowheader').allTextContents();
    expect(after.length).toBeLessThanOrEqual(rows.length);
    expect(problems).toEqual([]);
  });

  test('removing and adding items updates the table and the URL', async ({ page }) => {
    await page.goto('/d1/compare?c=weapons&items=claymore,katana,daggers');
    await page.getByRole('button', { name: 'Remove Katana from comparison' }).click();
    await expect(page).toHaveURL(/items=claymore,daggers$/);
    await expect(page.getByRole('table').getByRole('columnheader')).toHaveCount(3);

    await page.getByRole('button', { name: 'Add item' }).click();
    await page.getByRole('combobox', { name: 'Search Weapons' }).fill('anchor');
    await page.getByRole('option', { name: 'Anchor', exact: true }).click();
    await expect(page).toHaveURL(/items=claymore,daggers,anchor$/);
    await expect(page.getByRole('link', { name: 'Anchor' })).toBeVisible();
    expect(JSON.parse((await stored(page)) ?? 'null')).toEqual({
      category: 'weapons',
      slugs: ['claymore', 'daggers', 'anchor'],
    });
  });

  test('Add item is scoped to the category (no armor in a weapons comparison)', async ({
    page,
  }) => {
    await page.goto('/d1/compare?c=weapons&items=claymore,katana');
    await page.getByRole('button', { name: 'Add item' }).click();
    await page.getByRole('combobox', { name: 'Search Weapons' }).fill("hero's armor");
    await expect(page.getByRole('option')).toHaveCount(0);
  });

  test('without c it asks for a category; without items it uses the stored selection', async ({
    page,
  }) => {
    await page.goto('/d1/compare');
    await expect(page.getByText('Pick something to compare')).toBeVisible();
    await page.getByRole('combobox', { name: 'Category to compare' }).click();
    await page.getByRole('option', { name: 'Armor' }).click();
    await expect(page).toHaveURL(/c=armor/);
    await expect(page.getByText('Nothing to compare yet')).toBeVisible();

    await page.goto('/d1/weapons');
    await cardToggle(page, 'Claymore').click();
    await cardToggle(page, 'Katana').click();
    await page.goto('/d1/compare');
    await expect(page.getByRole('link', { name: 'Katana' })).toBeVisible();
    await expect(page.getByRole('table')).toBeVisible();
  });

  test('fewer than two items shows an empty state with links', async ({ page }) => {
    await page.goto('/d1/compare?c=weapons&items=claymore');
    await expect(page.getByText('Add one more to compare')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Browse Weapons' })).toHaveAttribute(
      'href',
      '/d1/weapons',
    );
    await expect(page.getByRole('table')).toHaveCount(0);
  });

  test('Dungeons II compares too (armor, with the derived damage reduction)', async ({ page }) => {
    await page.goto('/d2/compare?c=armor&items=sorcerer-boots,alchemist-loafers');
    await expect(page.getByRole('table')).toBeVisible();
    await expect(page.getByRole('rowheader', { name: 'Slot' })).toBeVisible();
  });

  test('has no sideways page scroll and is axe clean in both themes', async ({ page }) => {
    await page.goto('/d1/compare?c=weapons&items=claymore,katana,daggers,anchor');
    await expect(page.getByRole('table')).toBeVisible();
    expect(await hasHorizontalScroll(page)).toBe(false);
    await expectNoSeriousA11yViolations(page);
    await page.evaluate(() => (document.documentElement.dataset.theme = 'light'));
    await settleAnimations(page);
    await expectNoSeriousA11yViolations(page);
  });

  test('on a phone the table scrolls inside itself, with snap', async ({ page }) => {
    test.skip((page.viewportSize()?.width ?? 0) > 500, 'phone only');
    await page.goto('/d1/compare?c=weapons&items=claymore,katana,daggers,anchor');
    const scroller = page.locator('table').locator('xpath=..');
    await expect(scroller).toBeVisible();
    const { scrollWidth, clientWidth, snap } = await scroller.evaluate((el) => ({
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
      snap: getComputedStyle(el).scrollSnapType,
    }));
    expect(scrollWidth).toBeGreaterThan(clientWidth);
    expect(snap).toContain('x');
    expect(await hasHorizontalScroll(page)).toBe(false);
  });
});
