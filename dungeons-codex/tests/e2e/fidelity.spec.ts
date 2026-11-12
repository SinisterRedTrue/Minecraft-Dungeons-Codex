import { expect, test, type Locator } from '@playwright/test';

// Prompt 13, task 5: the measured values of DESIGN-SYSTEM §2 and §4, checked on the production
// build (ui-kit.spec.ts checks the primitives in the dev-only showcase; this is the real pages).

const style = (locator: Locator, prop: string) =>
  locator.evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), prop);

test.describe('buttons (civ b3d)', () => {
  test('radius, weight, case, tracking, edge and press physics', async ({ page, isMobile }) => {
    test.skip(isMobile, 'hover physics need a mouse');
    await page.goto('/');
    const button = page.locator('.b3d', { hasText: /^Enter Dungeons$/ });
    expect(await style(button, 'border-radius')).toBe('12px');
    expect(await style(button, 'font-weight')).toBe('800');
    expect(await style(button, 'text-transform')).toBe('uppercase');
    const size = parseFloat(await style(button, 'font-size'));
    const tracking = parseFloat(await style(button, 'letter-spacing'));
    expect(tracking / size).toBeCloseTo(0.04, 2);
    expect(await style(button, 'transition-duration')).toContain('0.12s');
    expect(await style(button, 'box-shadow')).toContain('0px 5px 0px');

    await button.hover();
    await expect.poll(() => style(button, 'transform')).toBe('matrix(1, 0, 0, 1, 0, -2)');
    expect(await style(button, 'box-shadow')).toContain('0px 7px 0px');
    await page.mouse.down();
    await expect.poll(() => style(button, 'transform')).toBe('matrix(1, 0, 0, 1, 0, 3)');
    expect(await style(button, 'box-shadow')).toContain('0px 2px 0px');
    await page.mouse.up();
  });
});

test.describe('cards and panels', () => {
  test('an entity card: 20px radius, 1.5px border, solid edge, lifts 4px on hover', async ({
    page,
  }) => {
    await page.goto('/d1/weapons');
    // The static card list is swapped for the interactive one on hydration: measure the final DOM.
    await page.waitForLoadState('networkidle');
    const card = page.locator('ul[aria-label] > li > article').first();
    await expect(card).toBeVisible();
    expect(await style(card, 'border-top-left-radius')).toBe('20px');
    // 1.5px in the CSS; Chromium snaps a border to whole device pixels, so 1px at a scale of 1.
    expect(['1px', '1.5px']).toContain(await style(card, 'border-top-width'));
    expect(await style(card, 'box-shadow')).toContain('0px 6px 0px');
    if ((page.viewportSize()?.width ?? 0) >= 700) {
      await card.hover();
      // Tailwind 4 lifts with the `translate` property, not `transform`.
      await expect.poll(() => style(card, 'translate')).toBe('0px -4px');
    }
  });

  test('the detail infobox is a 24px panel', async ({ page }) => {
    await page.goto('/d1/weapons/claymore');
    const infobox = page.getByRole('region', { name: 'Infobox' });
    expect(await style(infobox, 'border-radius')).toBe('24px');
  });
});

test.describe('navigation and typography', () => {
  test('the sticky nav is translucent, blurred, rounded below, and shrinks 68 → 56 px', async ({
    page,
  }) => {
    await page.goto('/d1/weapons');
    const bar = page.locator('header > div').first();
    expect(await style(bar, 'border-radius')).toBe('0px 0px 24px 24px');
    expect(await style(bar, 'backdrop-filter')).toContain('blur(12px)');
    expect(await style(bar, 'background-color')).toMatch(/^rgba\(.*,\s*0?\.\d+\)$/);
    await expect.poll(async () => (await bar.boundingBox())?.height).toBe(68);
    await page.evaluate(() => window.scrollTo(0, 400));
    await expect.poll(async () => (await bar.boundingBox())?.height).toBe(56);
  });

  test('headings are Rubik 900 uppercase, body is Rubik with a 1.6 line height', async ({
    page,
  }) => {
    await page.goto('/d1/weapons');
    const h1 = page.getByRole('heading', { level: 1 });
    expect(await style(h1, 'font-weight')).toBe('900');
    expect(await style(h1, 'text-transform')).toBe('uppercase');
    expect(await style(h1, 'font-family')).toMatch(/rubik/i);
    const body = page.locator('body');
    expect(await style(body, 'font-family')).toMatch(/rubik/i);
    const fontSize = parseFloat(await style(body, 'font-size'));
    expect(parseFloat(await style(body, 'line-height')) / fontSize).toBeCloseTo(1.6, 1);
  });

  test('the pixel font is Silkscreen, on stat numbers and badges', async ({ page }) => {
    await page.goto('/d1/weapons/claymore');
    const badge = page.locator('[class*="font-pixel"]').first();
    expect(await style(badge, 'font-family')).toMatch(/silkscreen/i);
  });
});

test.describe('reveal on scroll', () => {
  test('600ms, the civ easing, and a 26px rise; content arrives once it is scrolled to', async ({
    page,
  }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // Tag the first section that is still waiting to be revealed, so it can be followed after its class changes.
    await page
      .locator('.reveal:not(.in)')
      .first()
      .evaluate((el) => el.setAttribute('data-probe', 'reveal'));
    const hidden = page.locator('[data-probe="reveal"]');
    await expect(hidden).toBeAttached();
    expect(await style(hidden, 'opacity')).toBe('0');
    expect(await style(hidden, 'transform')).toBe('matrix(1, 0, 0, 1, 0, 26)');
    expect(await style(hidden, 'transition-duration')).toContain('0.6s');
    // One value per transitioned property (opacity, transform).
    const timing = await style(hidden, 'transition-timing-function');
    expect(timing.replaceAll('cubic-bezier(0.2, 0.7, 0.2, 1)', '').replace(/[,\s]/g, '')).toBe('');
    expect(timing).toContain('cubic-bezier(0.2, 0.7, 0.2, 1)');
    await hidden.scrollIntoViewIfNeeded();
    await expect(hidden).toHaveClass(/\bin\b/);
    await expect.poll(() => style(hidden, 'opacity')).toBe('1');
  });
});
