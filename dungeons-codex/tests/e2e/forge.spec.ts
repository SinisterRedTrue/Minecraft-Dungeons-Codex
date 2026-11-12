import { expect, test, type Page } from '@playwright/test';
import { expectNoSeriousA11yViolations, hasHorizontalScroll } from './helpers';

const CLAYMORE = '/d1/weapons/claymore';

/** The Forge section, once its lazy chunk and the enchantment list have arrived. */
async function forge(page: Page, path = CLAYMORE) {
  await page.goto(path);
  const panel = page.getByTestId('power-forge');
  await expect(panel).toBeVisible();
  await expect(panel.getByRole('button', { name: /^Slot 1:/ })).toBeVisible();
  return panel;
}

async function pick(page: Page, slot: number, name: RegExp) {
  await page.getByRole('button', { name: new RegExp(`^Slot ${slot}:`) }).click();
  await page.getByRole('option', { name }).click();
}

const tier = (page: Page, slot: number, name: string) =>
  page
    .getByRole('radiogroup', { name: `Slot ${slot} tier` })
    .getByRole('radio', { name, exact: true });

/** Settled min and max of a result row (each ticker keeps its final value in `data-value`). */
async function values(page: Page, testId: string): Promise<number[]> {
  return page
    .getByTestId(testId)
    .locator('[data-value]')
    .evaluateAll((nodes) =>
      nodes.map((n) => Math.round(Number((n as HTMLElement).dataset.value) * 100) / 100),
    );
}

test.describe('Power Forge: Dungeons weapon', () => {
  test('shows the documented Claymore numbers and updates with the power box', async ({ page }) => {
    const panel = await forge(page);
    await expect(panel.getByLabel('Power level', { exact: true })).toHaveValue('100');
    expect(await values(page, 'damage-base')).toEqual([1490, 2759]);
    await expect(page.getByTestId('approximate-badge')).toHaveCount(0);

    await panel.getByLabel('Power level', { exact: true }).fill('50');
    expect(await values(page, 'damage-base')).toEqual([188, 349]);

    // Past the wiki table (it ends at 108) the number is approximate and says why.
    await panel.getByLabel('Power level', { exact: true }).fill('250');
    await page.getByTestId('approximate-badge').click();
    await expect(page.getByText(/outside the item's documented table/)).toBeVisible();
  });

  test('keyboard moves the slider; Home and End reach 1 and 263', async ({ page }) => {
    const panel = await forge(page);
    const thumb = panel.getByRole('slider', { name: 'Power level slider' });
    await thumb.focus();
    await page.keyboard.press('Home');
    await expect(panel.getByLabel('Power level', { exact: true })).toHaveValue('1');
    expect(await values(page, 'damage-base')).toEqual([18, 34]);
    await page.keyboard.press('End');
    await expect(panel.getByLabel('Power level', { exact: true })).toHaveValue('263');
  });

  test('Sharpness III adds 33%; a conditional enchantment does not move the number', async ({
    page,
  }) => {
    await forge(page);
    await pick(page, 1, /^Sharpness/);
    await tier(page, 1, 'Tier III').click();
    await expect.poll(() => values(page, 'damage-boosted')).toEqual([1981.7, 3669.47]);
    await expect(page.getByTestId('forge-points')).toContainText('6');

    await pick(page, 2, /^Smiting/);
    await expect(page.getByTestId('forge-lines')).toContainText('Situational');
    // Still only Sharpness in the boosted number.
    await expect.poll(() => values(page, 'damage-boosted')).toEqual([1981.7, 3669.47]);
  });

  test('built-in enchantments are locked', async ({ page }) => {
    const panel = await forge(page, '/d1/weapons/anchor');
    const builtIn = panel.getByRole('list', { name: 'Built-in enchantments' });
    await expect(builtIn.getByRole('link', { name: 'Gravity' })).toBeVisible();
    await expect(builtIn.getByRole('button')).toHaveCount(0);
  });

  test('a weapon without a table is estimated and badged Approximate', async ({ page }) => {
    await forge(page, '/d1/weapons/obsidian-claymore');
    await page.getByTestId('approximate-badge').click();
    await expect(page.getByText(/damage rating/)).toBeVisible();
  });

  test('Share copies a link that restores the setup; Reset clears it', async ({
    page,
    context,
    browser,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    const panel = await forge(page);
    await pick(page, 1, /^Sharpness/);
    await tier(page, 1, 'Tier II').click();
    await panel.getByLabel('Power level', { exact: true }).fill('77');
    await panel.getByRole('button', { name: 'Share' }).click();
    await expect(page.getByText('Link copied', { exact: true }).first()).toBeVisible();
    const link = await page.evaluate(() => navigator.clipboard.readText());
    expect(new URL(link).searchParams.get('forge')).toBeTruthy();

    const other = await browser.newContext({ baseURL: new URL(page.url()).origin });
    const second = await other.newPage();
    await second.goto(link);
    const restored = second.getByTestId('power-forge');
    await expect(restored.getByRole('button', { name: 'Slot 1: Sharpness' })).toBeVisible();
    await expect(restored.getByLabel('Power level', { exact: true })).toHaveValue('77');
    await expect(
      second
        .getByRole('radiogroup', { name: 'Slot 1 tier' })
        .getByRole('radio', { name: 'Tier II', exact: true }),
    ).toBeChecked();
    await other.close();

    await panel.getByRole('button', { name: 'Reset' }).click();
    await expect(panel.getByRole('button', { name: /^Slot 1: Add/ })).toBeVisible();
    await expect(panel.getByLabel('Power level', { exact: true })).toHaveValue('100');
    expect(new URL(page.url()).searchParams.has('forge')).toBe(false);
  });
});

test.describe('Power Forge: armor and Dungeons II', () => {
  test('D1 armor shows damage reduction and bonus health', async ({ page }) => {
    const panel = await forge(page, '/d1/armor/champions-armor');
    await expect(panel.getByText('Damage reduction')).toBeVisible();
    const [min, max] = await values(page, 'health-base');
    expect(min).toBeGreaterThan(0);
    expect(max).toBeGreaterThan(min ?? Infinity);
  });

  test('D2 gear has one slot, no power slider and the honest note', async ({ page }) => {
    const panel = await forge(page, '/d2/weapons/twilight-dagger');
    await expect(panel.getByRole('slider')).toHaveCount(0);
    await expect(panel.getByRole('button', { name: /^Slot 2:/ })).toHaveCount(0);
    await expect(page.getByTestId('d2-note')).toHaveText(
      "Power-level scaling numbers aren't documented on the wiki yet, so only effect tiers are shown.",
    );
    await pick(page, 1, /^Fire Aspect/);
    await expect(page.getByTestId('forge-lines')).toContainText('Fire Aspect');
  });
});

test.describe('Tier viewer', () => {
  test('enchantments switch tiers and show the point costs', async ({ page }) => {
    await page.goto('/d1/enchantments/sharpness');
    const viewer = page.getByRole('region', { name: 'Tier viewer' });
    await expect(viewer.getByTestId('tier-text')).toHaveText('+10% damage');
    await viewer.getByRole('radio', { name: 'Tier III' }).click();
    await expect(viewer.getByTestId('tier-text')).toHaveText('+33% damage');
    await expect(viewer.getByTestId('tier-cost')).toContainText('costs 6');
    // The static tier table is still there for readers without the viewer.
    await expect(
      page.getByRole('table', { name: /Effect of each enchantment tier/ }),
    ).toBeVisible();
  });

  test('talismans show bronze, silver and gold tiers', async ({ page }) => {
    await page.goto('/d2/talismans/amethyst-lens');
    const viewer = page.getByRole('region', { name: 'Tier viewer' });
    await viewer.getByRole('radio', { name: 'Tier II, Silver' }).click();
    await expect(viewer.getByTestId('tier-panel')).toContainText('Tier II · Silver');
  });
});

test.describe('Power Forge: loading and speed', () => {
  test('the Forge ships lazily: not on list pages, and only the detail page fetches its list', async ({
    page,
    request,
  }) => {
    const fetched: string[] = [];
    page.on('request', (req) => {
      if (req.url().includes('/forge/')) fetched.push(new URL(req.url()).pathname);
    });
    await page.goto('/d1/weapons');
    await page.waitForLoadState('networkidle');
    expect(fetched).toEqual([]);

    const html = await (await request.get(CLAYMORE)).text();
    expect(html).toContain('Loading the Power Forge'); // the skeleton is in the static page …
    expect(html).not.toContain('Enchantment slots'); // … the Forge itself is not

    await forge(page);
    expect(fetched).toEqual(['/forge/d1.json']);
  });

  test('a slider step re-renders the result in under 16 ms', async ({ page }) => {
    const panel = await forge(page);
    const thumb = panel.getByRole('slider', { name: 'Power level slider' });
    await thumb.focus();
    const median = await thumb.evaluate((el) => {
      const times: number[] = [];
      for (let i = 0; i < 30; i += 1) {
        const started = performance.now();
        // A discrete event: React commits the update before dispatchEvent returns.
        el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
        times.push(performance.now() - started);
      }
      times.sort((a, b) => a - b);
      return times[Math.floor(times.length / 2)] ?? Infinity;
    });
    expect(median).toBeLessThan(16);
  });
});

test.describe('Power Forge: layout and accessibility', () => {
  test('fits the viewport without sideways scrolling', async ({ page }) => {
    await forge(page);
    await pick(page, 1, /^Sharpness/);
    expect(await hasHorizontalScroll(page)).toBe(false);
  });

  for (const theme of ['dark', 'light'] as const) {
    test(`axe finds nothing serious on a Forge page (${theme}), with a pick and the picker open`, async ({
      page,
    }) => {
      await page.addInitScript((t) => window.localStorage.setItem('dc:theme', t), theme);
      await forge(page);
      await pick(page, 1, /^Sharpness/);
      await expectNoSeriousA11yViolations(page);
      await page.getByRole('button', { name: /^Slot 2:/ }).click();
      await expect(page.getByRole('option', { name: /^Smiting/ })).toBeVisible();
      // The popover fades in; axe must not sample it half transparent.
      await page.evaluate(async () => {
        const popover = document.querySelector('[cmdk-root]')?.closest('.dc-pop');
        const running = popover?.getAnimations({ subtree: true }) ?? [];
        await Promise.all(
          running
            .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
            .map((a) => a.finished),
        );
      });
      await expectNoSeriousA11yViolations(page);
    });
  }

  test('axe finds nothing serious on the tier viewer pages', async ({ page }) => {
    await page.goto('/d1/enchantments/sharpness');
    await expectNoSeriousA11yViolations(page);
    await page.goto('/d2/talismans/amethyst-lens');
    await expectNoSeriousA11yViolations(page);
  });
});
