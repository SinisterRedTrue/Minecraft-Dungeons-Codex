import { expect, test, type Page } from '@playwright/test';
import { countOf } from './helpers';

// The Category Browser (Prompt 07): type-first selection, filters, URL state, sorting, views.
// The sidebar is a desktop feature; the phone sheet is covered in `mobile.spec.ts`.
test.beforeEach(({ page }) => {
  test.skip((page.viewportSize()?.width ?? 0) < 1024, 'sidebar filters are a desktop layout');
});

/** The number in "42 results" (the live region next to the sort menu). */
async function resultCount(page: Page): Promise<number> {
  const status = page
    .getByRole('status')
    .filter({ hasText: /results?/ })
    .first();
  const text = (await status.textContent()) ?? '';
  return Number(/([\d,]+)\s+results?/.exec(text)?.[1]?.replace(/,/g, ''));
}

const countIs = (page: Page, n: number) => expect.poll(() => resultCount(page)).toBe(n);
const query = (page: Page) => new URL(page.url()).searchParams;

test.describe('/d1/weapons filters', () => {
  test('type, range and property filters narrow the results, update the URL and survive a reload', async ({
    page,
  }) => {
    const total = countOf('d1', 'weapons');
    await page.goto('/d1/weapons');
    await countIs(page, total);

    await page.getByRole('button', { name: /^Melee\b/ }).click();
    await expect.poll(() => query(page).get('t')).toBe('melee');
    const melee = await resultCount(page);
    expect(melee).toBeLessThan(total);

    // The simple bar has no sub-types; level 2 sits in the Advanced panel under the chosen level 1.
    await expect(page.getByRole('button', { name: /^Daggers\b/ })).toHaveCount(0);
    await page.getByRole('button', { name: /^Advanced filters/ }).click();
    await page.getByRole('button', { name: /^Daggers\b/ }).click();
    await expect.poll(() => query(page).get('wt')).toBe('daggers');
    await countIs(page, 4);

    await page.getByRole('spinbutton', { name: 'Minimum Damage' }).fill('3');
    await page.getByRole('spinbutton', { name: 'Minimum Damage' }).press('Enter');
    await page.getByRole('spinbutton', { name: 'Maximum Damage' }).fill('4');
    await page.getByRole('spinbutton', { name: 'Maximum Damage' }).press('Enter');
    await expect.poll(() => query(page).get('dmg')).toBe('3-4');
    await countIs(page, 4);

    await page.getByRole('checkbox', { name: /Crowd Control/ }).click();
    await expect.poll(() => query(page).get('p')).toBe('crowd-control');
    await countIs(page, 1);
    await expect(page.getByRole('link', { name: 'Fangs of Frost' })).toBeVisible();

    // Every active filter has a removable chip.
    const chips = page.getByRole('list', { name: 'Active filters' });
    await expect(chips.getByRole('button', { name: 'Remove filter: Daggers' })).toBeVisible();
    await expect(chips.getByRole('button', { name: 'Remove filter: Crowd Control' })).toBeVisible();

    // Reload: same URL, same state, same results.
    const url = page.url();
    await page.reload();
    await expect(page).toHaveURL(url);
    await countIs(page, 1);
    await expect(page.getByRole('button', { name: /^Daggers\b/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    // Back steps through the pushed changes (the range change replaced its entry).
    await page.goBack();
    await expect.poll(() => query(page).get('p')).toBeNull();
    expect(query(page).get('dmg')).toBe('3-4');
    await countIs(page, 4);
    await page.goBack();
    await expect.poll(() => query(page).get('wt')).toBeNull();
    expect(query(page).get('t')).toBe('melee');
    await countIs(page, melee);
  });

  test('Clear all resets every filter', async ({ page }) => {
    await page.goto('/d1/weapons?t=ranged&r=unique&u=1&sort=dmg-desc');
    await expect.poll(() => resultCount(page)).toBeLessThan(countOf('d1', 'weapons'));
    await page.getByRole('button', { name: 'Clear all' }).click();
    await countIs(page, countOf('d1', 'weapons'));
    expect(query(page).get('t')).toBeNull();
    expect(query(page).get('r')).toBeNull();
    expect(query(page).get('u')).toBeNull();
    expect(query(page).get('sort')).toBe('dmg-desc'); // sorting is not a filter
    await expect(page.getByRole('button', { name: 'Clear all' })).toBeHidden();
  });

  test('a shared link restores the state, and bad params are ignored quietly', async ({ page }) => {
    await page.goto('/d1/weapons?t=melee&wt=daggers&p=dual-wield');
    await countIs(page, 4);
    await page.goto('/d1/weapons?t=nonsense&wt=x&dmg=oops&p=,,&u=maybe&q=%20&sort=nope&view=cube');
    await countIs(page, countOf('d1', 'weapons'));
    await expect(page.getByRole('heading', { level: 1, name: 'Weapons' })).toBeVisible();
  });

  test('searching within the results filters by name and property', async ({ page }) => {
    await page.goto('/d1/weapons');
    await page.getByRole('searchbox', { name: 'Search in results' }).fill('claymore');
    await expect.poll(() => query(page).get('q')).toBe('claymore');
    await expect.poll(() => resultCount(page)).toBeLessThan(15);
    await expect(page.getByRole('link', { name: 'Claymore', exact: true })).toBeVisible();
  });

  test('facet counts mute options that would give nothing', async ({ page }) => {
    await page.goto('/d1/weapons?t=ranged');
    await page.getByRole('button', { name: /^Advanced filters/ }).click();
    // Combo length is a melee-only filter, so it disappears with Ranged.
    await expect(page.getByText('Combo length')).toBeHidden();
    await page.getByRole('button', { name: /^Melee\b/ }).click();
    await expect(page.getByText('Combo length', { exact: true }).first()).toBeVisible();
  });

  test('a card opens its detail page', async ({ page }) => {
    await page.goto('/d1/weapons');
    await page.getByRole('link', { name: 'Claymore', exact: true }).click();
    await expect(page).toHaveURL(/\/d1\/weapons\/claymore$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Claymore' })).toBeVisible();
    await expect(page.getByText(/Data and image from/)).toBeVisible();
  });
});

test.describe('views, sorting and special cases', () => {
  test('the table view sorts by its headers and shares the sort with the menu', async ({
    page,
  }) => {
    await page.goto('/d1/weapons?t=melee&view=table');
    const damage = page.getByRole('columnheader', { name: /Damage/ });
    await expect(damage).toHaveAttribute('aria-sort', 'none');
    await damage.getByRole('button').click();
    await expect(damage).toHaveAttribute('aria-sort', 'descending');
    await expect.poll(() => query(page).get('sort')).toBe('dmg-desc');
    await damage.getByRole('button').click();
    await expect(damage).toHaveAttribute('aria-sort', 'ascending');
    await expect(page.getByRole('combobox', { name: 'Sort by' })).toContainText('low to high');

    const first = page.locator('tbody tr').first();
    await expect(first).toBeVisible();
    await page.getByRole('button', { name: 'Grid view' }).click();
    await expect.poll(() => query(page).get('view')).toBeNull();
    await expect(page.getByRole('list', { name: 'Weapons' })).toBeVisible();
  });

  test('Dungeons II weapons hide the unobtainable ones until asked', async ({ page }) => {
    const all = countOf('d2', 'weapons');
    await page.goto('/d2/weapons');
    await countIs(page, all - 4);
    await page.getByRole('button', { name: /^Advanced filters/ }).click();
    await page.getByRole('checkbox', { name: 'Show unobtainable' }).click();
    await countIs(page, all);
    expect(query(page).get('uo')).toBe('1');
  });

  test('Dungeons II armor groups the four pieces of each set', async ({ page }) => {
    await page.goto('/d2/armor');
    await page.getByRole('button', { name: 'Group by set' }).click();
    await expect.poll(() => query(page).get('grp')).toBe('1');
    const set = page.getByRole('region', { name: 'Alchemist Armor' });
    await expect(set.getByRole('listitem')).toHaveCount(4);
    await expect(set.getByRole('heading', { level: 3 })).toHaveText([
      'Alchemist Top Hat',
      'Alchemist Overcoat',
      'Alchemist Trousers',
      'Alchemist Loafers',
    ]);
  });

  test('the long armor-set list is a searchable picker', async ({ page }) => {
    await page.goto('/d2/armor');
    await page.getByRole('button', { name: /^Advanced filters/ }).click();
    await page.getByRole('button', { name: /Armor set: All/ }).click();
    await page.getByRole('searchbox', { name: 'Search armor set' }).fill('beekeeper');
    await page.getByRole('button', { name: /^Beekeeper Armor/ }).click();
    await expect.poll(() => query(page).get('as')).toBe('beekeeper-armor');
    await countIs(page, 4);
  });

  test('DLCs are release-order cards with no filter panel', async ({ page }) => {
    await page.goto('/d1/dlcs');
    await countIs(page, countOf('d1', 'dlcs'));
    await expect(page.getByRole('complementary', { name: 'Advanced filters' })).toHaveCount(0);
    await expect(page.getByRole('searchbox')).toHaveCount(0);
    const names = await page
      .getByRole('list', { name: 'DLCs' })
      .getByRole('heading')
      .allTextContents();
    expect(names[0]).toBe('Jungle Awakens'); // the first DLC released
  });

  test('an empty combination offers a way out', async ({ page }) => {
    await page.goto('/d1/weapons?t=ranged&wt=bow&u=1&r=common');
    await expect(page.getByRole('heading', { name: 'No items match' })).toBeVisible();
    await page.getByRole('button', { name: 'Clear all filters' }).click();
    await countIs(page, countOf('d1', 'weapons'));
  });
});
