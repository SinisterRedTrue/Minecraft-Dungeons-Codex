import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const devServer = process.env.E2E_DEV_SERVER === '1';

test.describe('production build', () => {
  test.skip(devServer, 'the showcase exists on the dev server only');

  test('/dev/ui is a 404 in production', async ({ page }) => {
    const res = await page.goto('/dev/ui');
    expect(res?.status()).toBe(404);
    await expect(page.getByRole('heading', { name: 'UI kit' })).toHaveCount(0);
  });
});

// Everything below needs `E2E_DEV_SERVER=1 npx playwright test ui-kit` (next dev on :3101).
test.describe('dev showcase', () => {
  test.skip(!devServer, 'run with E2E_DEV_SERVER=1');

  const theme = (page: Page, name: 'Light' | 'Dark') => page.getByRole('radio', { name }).click();
  const accent = (page: Page, name: 'D1 emerald' | 'D2 frost') =>
    page.getByRole('button', { name }).click();

  test('renders every kit section with a single h1', async ({ page }) => {
    await page.goto('/dev/ui');
    await expect(page.getByRole('heading', { level: 1, name: 'UI kit' })).toBeVisible();
    for (const name of [
      'Button3D · md',
      'RarityFrame · 192',
      'Badge',
      'StatBar',
      'Dialog · Sheet · Tooltip · Popover · Toast',
    ]) {
      await expect(page.getByRole('region', { name })).toBeAttached();
    }
  });

  test('the accent switch swaps emerald for frost on the wrapper and on <body> for portals', async ({
    page,
  }) => {
    await page.goto('/dev/ui');
    const wrapper = page.locator('[data-game]').first();
    expect(
      await wrapper.evaluate((el) => getComputedStyle(el).getPropertyValue('--accent').trim()),
    ).toBe('#3bd16f');
    await accent(page, 'D2 frost');
    await expect(wrapper).toHaveAttribute('data-game', 'd2');
    await expect(page.locator('body')).toHaveAttribute('data-game', 'd2');
    expect(
      await wrapper.evaluate((el) => getComputedStyle(el).getPropertyValue('--accent').trim()),
    ).toBe('#4fd8eb');
  });

  test('Button3D has the measured press physics', async ({ page }) => {
    await page.goto('/dev/ui');
    const btn = page.getByRole('button', { name: 'accent', exact: true }).first();
    const style = (p: 'boxShadow' | 'transform' | 'borderRadius' | 'transitionDuration') =>
      btn.evaluate((el, prop) => getComputedStyle(el)[prop as 'boxShadow'], p);
    expect(await style('borderRadius')).toBe('12px');
    expect(await style('transitionDuration')).toContain('0.12s');
    expect(await style('boxShadow')).toContain('0px 5px 0px'); // resting edge 5px
    await btn.hover();
    await expect.poll(() => style('transform')).toBe('matrix(1, 0, 0, 1, 0, -2)');
    expect(await style('boxShadow')).toContain('0px 7px 0px');
    await page.mouse.down();
    await expect.poll(() => style('transform')).toBe('matrix(1, 0, 0, 1, 0, 3)');
    expect(await style('boxShadow')).toContain('0px 2px 0px');
    await page.mouse.up();
  });

  test('dialog opens, traps focus and closes with Escape', async ({ page }) => {
    await page.goto('/dev/ui');
    const trigger = page.getByRole('button', { name: 'Open dialog' });
    await trigger.click();
    const dialog = page.getByRole('dialog', { name: 'Dialog title' });
    await expect(dialog).toBeVisible();
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press('Tab');
      expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);
    }
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test('the toast announces and dismisses', async ({ page }) => {
    await page.goto('/dev/ui');
    await page.getByRole('button', { name: 'Toast', exact: true }).click();
    await expect(page.getByText('Link copied', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Dismiss notification' }).click();
    await expect(page.getByText('Link copied', { exact: true })).toBeHidden();
  });

  for (const mode of ['Dark', 'Light'] as const) {
    for (const game of ['D1 emerald', 'D2 frost'] as const) {
      test(`axe: no serious or critical violations (${mode}, ${game})`, async ({ page }) => {
        await page.goto('/dev/ui');
        await theme(page, mode);
        await accent(page, game);
        // Let reveal animations finish so mid-fade colours are not measured.
        await page.waitForTimeout(800);
        const results = await new AxeBuilder({ page }).analyze();
        const bad = results.violations.filter(
          (v) => v.impact === 'serious' || v.impact === 'critical',
        );
        expect(
          bad.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`),
        ).toEqual([]);
      });
    }
  }
});

test.describe('motion', () => {
  test.skip(!devServer, 'run with E2E_DEV_SERVER=1');

  const probe = (page: Page) =>
    page.evaluate(() => {
      const reveal = document.querySelector<HTMLElement>('.reveal:not(.in)');
      const skeleton = document.querySelector<HTMLElement>('.skeleton');
      const unique = document.querySelector<HTMLElement>('.rarity-frame[data-rarity="unique"]');
      return {
        revealOpacity: reveal ? getComputedStyle(reveal).opacity : null,
        revealTransform: reveal ? getComputedStyle(reveal).transform : null,
        revealTransition: reveal ? getComputedStyle(reveal).transitionDuration : null,
        skeletonAnimation: skeleton ? getComputedStyle(skeleton).animationName : null,
        shimmerAnimation: unique ? getComputedStyle(unique, '::before').animationName : null,
      };
    });

  test('with normal motion, reveal starts hidden and the shimmer and skeleton animate', async ({
    page,
  }) => {
    await page.goto('/dev/ui');
    // The control for the reduced-motion test below: the same probe must see the animations.
    const m = await probe(page);
    expect(m.revealOpacity).toBe('0');
    expect(m.skeletonAnimation).toBe('sk-shimmer');
    expect(m.shimmerAnimation).toBe('rf-spin');

    const reveal = page.locator('.reveal').first();
    await reveal.scrollIntoViewIfNeeded();
    await expect(reveal).toHaveClass(/\bin\b/);
  });

  test.describe('reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });

    test('reveal, skeleton and shimmer animations are off', async ({ page }) => {
      await page.goto('/dev/ui');
      const m = await probe(page);
      expect(m.revealOpacity).toBe('1');
      expect(m.revealTransform).toBe('none');
      expect(m.revealTransition).toBe('0s');
      expect(m.skeletonAnimation).toBe('none');
      expect(m.shimmerAnimation).toBe('none');
    });
  });
});
