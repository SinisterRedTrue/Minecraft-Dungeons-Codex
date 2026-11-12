import { expect, test, type Locator, type Page } from '@playwright/test';
import {
  collectConsoleProblems,
  expectNoSeriousA11yViolations,
  hasHorizontalScroll,
  settleAnimations,
} from './helpers';

const slot = (page: Page, key: string): Locator => page.getByTestId(`slot-${key}`);
const toast = (page: Page) => page.locator('.dc-toast');

/** Opens the picker of a slot, narrows it with the search box and chooses the item. */
async function choose(page: Page, label: string, search: string, name: string) {
  // An empty slot says "Choose", a filled one "Change".
  await page
    .getByRole('button', { name: new RegExp(`^(Choose ${label}$|Change ${label}:)`) })
    .click();
  const dialog = page.getByRole('dialog', { name: `Choose ${label}` });
  const box = dialog.getByRole('searchbox', { name: 'Search in results' });
  // On a phone the filters (and the search box) sit behind a "Filters" button.
  if (!(await box.isVisible())) await dialog.getByRole('button', { name: /^Filters/ }).click();
  await box.fill(search);
  await dialog.getByRole('button', { name, exact: true }).click();
  await expect(dialog).toHaveCount(0);
}

async function pickEnchantment(
  page: Page,
  slotKey: string,
  name: string,
  tier?: 'I' | 'II' | 'III',
) {
  await slot(page, slotKey)
    .getByRole('button', { name: /^Enchant / })
    .click();
  const dialog = page.getByRole('dialog', { name: /^Enchantments/ });
  await dialog.getByRole('button', { name: /^Slot 1/ }).click();
  await page.getByRole('option', { name: new RegExp(`^${name}`) }).click();
  if (tier)
    await dialog
      .getByRole('radio', { name: `Tier ${tier}`, exact: true })
      .first()
      .click();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
}

test.describe('Build Planner · Dungeons', () => {
  test('builds a loadout: items, enchantments, points, damage and a duplicate warning', async ({
    page,
  }) => {
    const problems = collectConsoleProblems(page);
    await page.goto('/d1/planner');
    await expect(page.getByRole('heading', { level: 1, name: 'Build Planner' })).toBeVisible();
    await expect(page.getByText('Choose items to see what your build adds up to.')).toBeVisible();

    await choose(page, 'Melee', 'claymore', 'Claymore');
    await expect(slot(page, 'melee').getByText('Claymore')).toBeVisible();
    // The Claymore's own wiki table covers power 100, so the number is exact (no badge).
    await expect(page.getByTestId('damage-melee')).toHaveText(/\d[\d,]*–\d[\d,]*/);
    await expect(page.getByTestId('approximate-badge')).toHaveCount(0);
    const base = await page.getByTestId('damage-melee').textContent();

    await pickEnchantment(page, 'melee', 'Sharpness', 'III');
    await expect(slot(page, 'melee').getByText('Sharpness III')).toBeVisible();
    // Tier III costs 1 + 2 + 3 points, and Sharpness adds 33 % damage.
    await expect(page.getByTestId('points')).toHaveText('6');
    await expect(page.getByTestId('damage-melee')).not.toHaveText(base ?? '');
    await expect(
      page.getByRole('list', { name: 'Effects' }).or(page.getByText('+33%')),
    ).toBeVisible();

    await choose(page, 'Ranged', 'ancient', 'Ancient Bow');
    await expect(page.getByTestId('damage-ranged')).toBeVisible();
    await choose(page, 'Armor', 'battle', 'Battle Robe');
    await expect(page.getByText('Artifact Cooldown')).toBeVisible();

    await choose(page, 'Artifact 1', 'blast', 'Blast Fungus');
    await choose(page, 'Artifact 2', 'blast', 'Blast Fungus');
    await expect(page.getByRole('list', { name: 'Warnings' })).toContainText('Duplicate artifact');
    await choose(page, 'Artifact 2', 'buzzy', 'Buzzy Nest');
    await expect(page.getByRole('list', { name: 'Warnings' })).toHaveCount(0);

    // Power moves the damage, and over the documented table it turns Approximate.
    await page.getByLabel('Power').fill('263');
    await expect(page.getByTestId('approximate-badge').first()).toBeVisible();
    expect(problems).toEqual([]);
  });

  test('a build lives in the link: reload keeps it, a new visitor sees it', async ({
    page,
    browser,
  }) => {
    await page.goto('/d1/planner');
    // The address bar follows edits a moment after the page does, so the name (an edit that
    // starts the link) goes first and the longer steps after it give every update time to land.
    await page.getByLabel('Build name').fill('Axe of testing');
    await expect(page).toHaveURL(/\?b=/);
    await choose(page, 'Melee', 'axe', 'Axe');
    await pickEnchantment(page, 'melee', 'Sharpness', 'II');
    await expect(slot(page, 'melee').getByText('Sharpness II')).toBeVisible();
    const url = page.url();
    expect(url.length).toBeLessThan(2000);

    await page.reload();
    await expect(slot(page, 'melee').getByText('Axe', { exact: true })).toBeVisible();
    await expect(slot(page, 'melee').getByText('Sharpness II')).toBeVisible();
    await expect(page.getByLabel('Build name')).toHaveValue('Axe of testing');

    // A second browser context has no draft: only the link carries the build.
    const other = await browser.newContext({ viewport: page.viewportSize() });
    const guest = await other.newPage();
    await guest.goto(url);
    await expect(slot(guest, 'melee').getByText('Sharpness II')).toBeVisible();
    await expect(guest.getByLabel('Build name')).toHaveValue('Axe of testing');
    await other.close();
  });

  test('Copy link puts a working link on the clipboard', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/d1/planner');
    await choose(page, 'Melee', 'axe', 'Axe');
    await page.getByRole('button', { name: 'Copy link' }).click();
    await expect(toast(page).getByText('Link copied')).toBeVisible();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    const fresh = await context.newPage();
    await fresh.goto(copied);
    await expect(slot(fresh, 'melee').getByText('Axe', { exact: true })).toBeVisible();
  });

  test('an invalid link is explained in a toast and the planner still works', async ({ page }) => {
    await page.goto('/d1/planner?b=rthis-is-not-a-build');
    await expect(toast(page).getByText('That build link could not be read')).toBeVisible();
    await expect(page).not.toHaveURL(/\?b=/);
    await expect(page.getByRole('button', { name: 'Choose Melee' })).toBeVisible();
  });

  test('unknown items in a link are left out, with a toast', async ({ page }) => {
    const code = Buffer.from(
      JSON.stringify({ v: 1, g: 'd1', s: { melee: ['axe', []], armor: ['no-such-armor', []] } }),
    ).toString('base64url');
    await page.goto(`/d1/planner?b=r${code}`);
    await expect(toast(page).getByText('Some entries were left out')).toBeVisible();
    await expect(slot(page, 'melee').getByText('Axe', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Choose Armor' })).toBeVisible();
  });

  test('My builds: save, reload, rename, open, delete', async ({ page }) => {
    await page.goto('/d1/planner');
    await choose(page, 'Melee', 'axe', 'Axe');
    await page.getByLabel('Build name').fill('First plan');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    const mine = page.getByTestId('my-builds');
    await expect(mine.getByText('First plan')).toBeVisible();

    await page.reload();
    await expect(mine.getByText('First plan')).toBeVisible();

    await mine.getByRole('button', { name: 'Rename First plan' }).click();
    const rename = page.getByRole('dialog', { name: 'Rename build' });
    await rename.getByRole('textbox', { name: 'Name' }).fill('Second plan');
    await rename.getByRole('button', { name: 'Rename' }).click();
    await expect(mine.getByText('Second plan')).toBeVisible();

    await page.getByRole('button', { name: 'Clear', exact: true }).click();
    await page
      .getByRole('dialog', { name: 'Clear this build?' })
      .getByRole('button', { name: 'Clear build' })
      .click();
    await expect(page.getByRole('button', { name: 'Choose Melee' })).toBeVisible();
    await mine.getByRole('button', { name: 'Open Second plan' }).click();
    await expect(slot(page, 'melee').getByText('Axe', { exact: true })).toBeVisible();

    await mine.getByRole('button', { name: 'Delete Second plan' }).click();
    await page
      .getByRole('dialog', { name: 'Delete this build?' })
      .getByRole('button', { name: 'Delete build' })
      .click();
    await expect(mine.getByText(/Nothing saved yet/)).toBeVisible();
  });

  test('"Open in Planner" on a detail page fills the right slot', async ({ page }) => {
    await page.goto('/d1/weapons/ancient-bow');
    await page.getByRole('button', { name: /Open in Planner/ }).click();
    await expect(page).toHaveURL(/\/d1\/planner$/, { timeout: 20_000 });
    await expect(slot(page, 'ranged').getByText('Ancient Bow')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Choose Melee' })).toBeVisible();
    // Another item goes into its own slot of the same draft.
    await page.goto('/d1/armor/battle-robe');
    await page.getByRole('button', { name: /Open in Planner/ }).click();
    await expect(page).toHaveURL(/\/d1\/planner$/, { timeout: 20_000 });
    await expect(slot(page, 'armor').getByText('Battle Robe')).toBeVisible();
    await expect(slot(page, 'ranged').getByText('Ancient Bow')).toBeVisible();
  });

  test('the picker only offers items that fit, and filters stay out of the link', async ({
    page,
  }) => {
    await page.goto('/d1/planner');
    await page.getByRole('button', { name: 'Choose Ranged', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Choose Ranged' });
    await expect(dialog.getByRole('button', { name: 'Ancient Bow', exact: true })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Claymore', exact: true })).toHaveCount(0);
    const box = dialog.getByRole('searchbox', { name: 'Search in results' });
    if (!(await box.isVisible())) await dialog.getByRole('button', { name: /^Filters/ }).click();
    await box.fill('bow');
    expect(page.url()).not.toContain('q=');
  });

  test('no sideways scroll; axe clean with the picker and the enchantment dialog open', async ({
    page,
  }) => {
    await page.goto('/d1/planner');
    await choose(page, 'Melee', 'axe', 'Axe');
    await pickEnchantment(page, 'melee', 'Sharpness', 'I');
    await choose(page, 'Artifact 1', 'blast', 'Blast Fungus');
    await choose(page, 'Artifact 2', 'blast', 'Blast Fungus');
    expect(await hasHorizontalScroll(page)).toBe(false);
    await expectNoSeriousA11yViolations(page);

    await page.getByRole('button', { name: 'Choose Ranged', exact: true }).click();
    const picker = page.getByRole('dialog', { name: 'Choose Ranged' });
    await expect(picker.getByRole('button', { name: 'Ancient Bow', exact: true })).toBeVisible();
    await settleAnimations(page);
    await expectNoSeriousA11yViolations(page);
    await page.evaluate(() => (document.documentElement.dataset.theme = 'light'));
    await settleAnimations(page);
    await expectNoSeriousA11yViolations(page);
    await page.keyboard.press('Escape');

    await slot(page, 'melee')
      .getByRole('button', { name: /^Enchant / })
      .click();
    await settleAnimations(page);
    await expectNoSeriousA11yViolations(page);
  });
});

test.describe('Build Planner · Dungeons II', () => {
  test('fills weapon, armor, artifact and talisman slots; one enchantment per piece', async ({
    page,
  }) => {
    const problems = collectConsoleProblems(page);
    await page.goto('/d2/planner');
    for (const label of ['Helmet', 'Chestplate', 'Leggings', 'Boots', 'Talisman 1', 'Talisman 3']) {
      await expect(
        page.getByRole('button', { name: `Choose ${label}`, exact: true }),
      ).toBeVisible();
    }
    await expect(page.getByLabel('Power')).toHaveCount(0);

    // Armor slots are scoped: the Helmet picker has no boots.
    await page.getByRole('button', { name: 'Choose Helmet', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Choose Helmet' });
    await expect(
      dialog.getByRole('button', { name: 'Alchemist Top Hat', exact: true }),
    ).toBeVisible();
    await expect(
      dialog.getByRole('button', { name: 'Alchemist Loafers', exact: true }),
    ).toHaveCount(0);
    await dialog.getByRole('button', { name: 'Alchemist Top Hat', exact: true }).click();
    await expect(slot(page, 'helmet').getByText('Alchemist Top Hat')).toBeVisible();

    await choose(page, 'Boots', 'alchemist', 'Alchemist Loafers');
    await pickEnchantment(page, 'boots', 'Ancient Alchemy', 'II');
    await expect(slot(page, 'boots').getByText('Ancient Alchemy II')).toBeVisible();
    // One enchantment per gear piece.
    await slot(page, 'boots')
      .getByRole('button', { name: /^Enchant / })
      .click();
    await expect(
      page.getByRole('dialog', { name: /^Enchantments/ }).getByRole('button', { name: /^Slot \d/ }),
    ).toHaveCount(1);
    await page.keyboard.press('Escape');

    await choose(page, 'Talisman 1', 'amethyst', 'Amethyst Lens');
    await slot(page, 'talisman1').getByRole('radio', { name: 'Tier III' }).click();
    await expect(page.getByText('+25%')).toBeVisible();
    await expect(page.getByText('Ranged damage')).toBeVisible();
    await expect(page.getByText(/Power-level scaling numbers aren't documented/)).toBeVisible();
    await expect(page.getByTestId('points')).toHaveCount(0);

    // The draft survives navigation away and back, without the link.
    await page.goto('/d2/weapons');
    await page.goto('/d2/planner');
    await expect(slot(page, 'helmet').getByText('Alchemist Top Hat')).toBeVisible();
    await expect(slot(page, 'talisman1').getByRole('radio', { name: 'Tier III' })).toBeChecked();
    expect(problems).toEqual([]);
  });

  test('Open in Planner from a Dungeons II armor page uses its own slot', async ({ page }) => {
    await page.goto('/d2/armor/alchemist-top-hat');
    await page.getByRole('button', { name: /Open in Planner/ }).click();
    await expect(page).toHaveURL(/\/d2\/planner$/, { timeout: 20_000 });
    await expect(slot(page, 'helmet').getByText('Alchemist Top Hat')).toBeVisible();
  });

  test('a Dungeons link does not load in Dungeons II', async ({ page }) => {
    const code = Buffer.from(JSON.stringify({ v: 1, g: 'd1', s: {} })).toString('base64url');
    await page.goto(`/d2/planner?b=r${code}`);
    await expect(toast(page).getByText('That build link could not be read')).toBeVisible();
  });

  test('axe clean on the planner and the open picker, both themes', async ({ page }) => {
    await page.goto('/d2/planner');
    await choose(page, 'Talisman 1', 'amethyst', 'Amethyst Lens');
    await choose(page, 'Helmet', 'top hat', 'Alchemist Top Hat');
    expect(await hasHorizontalScroll(page)).toBe(false);
    await expectNoSeriousA11yViolations(page);
    await page.getByRole('button', { name: 'Choose Chestplate', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Choose Chestplate' })).toBeVisible();
    await settleAnimations(page);
    await expectNoSeriousA11yViolations(page);
    await page.evaluate(() => (document.documentElement.dataset.theme = 'light'));
    await settleAnimations(page);
    await expectNoSeriousA11yViolations(page);
  });
});
