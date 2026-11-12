/**
 * Responsive matrix (Prompt 13, task 4): every page template at 360, 390, 768, 1024, 1440 and
 * 1920 px in the dark theme, plus 390 and 1440 px in the light theme. Per shot it checks
 *   - horizontal scroll,
 *   - touch targets under 44 px (buttons, form controls, and links outside running text),
 *   - text clipped by its own box (an element with hidden overflow whose content is wider),
 * and writes a full-page screenshot. Findings print as one line each; exit code 1 if any.
 *
 *   npm run build && npm run start -- -p 3100        # in one terminal
 *   npx tsx scripts/dev/responsive.ts [baseUrl] [outDir]
 */
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { chromium, type Page } from '@playwright/test';

const base = process.argv[2] ?? 'http://localhost:3100';
const out = process.argv[3] ?? path.join(process.cwd(), 'test-results', 'responsive');

const TEMPLATES: [name: string, url: string][] = [
  ['picker', '/'],
  ['hub-d1', '/d1'],
  ['hub-d2', '/d2'],
  ['category-d1-weapons', '/d1/weapons'],
  ['category-d2-armor', '/d2/armor'],
  ['category-d1-dlcs', '/d1/dlcs'],
  ['detail-d1-weapon', '/d1/weapons/claymore'],
  ['detail-d1-enchantment', '/d1/enchantments/protection'],
  ['detail-d2-quest', '/d2/quests/breaking-camps'],
  ['detail-d2-talisman', '/d2/talismans/glowstone-flask'],
  ['compare', '/d1/compare?c=weapons&items=claymore,katana,daggers'],
  ['planner-d1', '/d1/planner'],
  ['planner-d2', '/d2/planner'],
  ['favorites', '/favorites'],
  ['about', '/about'],
  ['not-found', '/no-such-page'],
];

const SHOTS: { width: number; theme: 'dark' | 'light' }[] = [
  ...[360, 390, 768, 1024, 1440, 1920].map((width) => ({ width, theme: 'dark' as const })),
  ...[390, 1440].map((width) => ({ width, theme: 'light' as const })),
];

interface Finding {
  kind: 'scroll' | 'target' | 'clipped';
  detail: string;
}

async function inspect(page: Page, minTarget: number): Promise<Finding[]> {
  return page.evaluate((minTarget) => {
    const findings: { kind: 'scroll' | 'target' | 'clipped'; detail: string }[] = [];
    const root = document.documentElement;
    if (root.scrollWidth > root.clientWidth) {
      findings.push({
        kind: 'scroll',
        detail: `page is ${root.scrollWidth}px wide in a ${root.clientWidth}px viewport`,
      });
    }
    const visible = (el: Element) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
    };
    const describe = (el: Element) =>
      `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''} "${(
        el.getAttribute('aria-label') ??
        el.textContent ??
        ''
      )
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 40)}"`;

    // Touch targets: controls, and links that are not part of a sentence. The skip link is only
    // shown on focus, and sliders/range thumbs are sized by the Radix primitive (WCAG 2.5.8).
    const controls = document.querySelectorAll(
      'button, [role="button"], [role="tab"], [role="radio"], [role="checkbox"], [role="switch"], input:not([type="hidden"]), select, summary, a[href]',
    );
    for (const el of controls) {
      if (!visible(el)) continue;
      // Visually hidden (sr-only) text and the skip link, which only shows on focus.
      if (el.getBoundingClientRect().width <= 1 || el.matches('a[href="#main"]')) continue;
      if (el.closest('[role="slider"], [data-radix-collection-item][role="slider"]')) continue;
      const inSentence =
        el.tagName === 'A' &&
        el.closest('p, li, dd, td, figcaption') !== null &&
        getComputedStyle(el).display === 'inline';
      if (inSentence) continue;
      // A control with a visible label is operated through the label too: measure both.
      const label =
        el.closest('label') ??
        (el.id ? document.querySelector('label[for="' + el.id + '"]') : null);
      const own = el.getBoundingClientRect();
      const lab = label && label !== el ? label.getBoundingClientRect() : own;
      // The union of the control and its label: the area a tap on either operates it.
      const r = {
        width: Math.max(own.right, lab.right) - Math.min(own.left, lab.left),
        height: Math.max(own.bottom, lab.bottom) - Math.min(own.top, lab.top),
      };
      if (r.width < minTarget - 0.5 || r.height < minTarget - 0.5) {
        // A control inside a bigger link/button hit area (stretched card link) counts through it.
        findings.push({
          kind: 'target',
          detail: `${describe(el)} is ${Math.round(r.width)}x${Math.round(r.height)}px`,
        });
      }
    }

    // Clipped text: the element hides its overflow and its content is wider/taller than its box,
    // without being an intentional ellipsis or line clamp.
    for (const el of document.querySelectorAll('body *')) {
      if (!visible(el)) continue;
      const s = getComputedStyle(el);
      const hidesX = s.overflowX === 'hidden' || s.overflowX === 'clip';
      if (!hidesX) continue;
      // Visually hidden text (sr-only is a 1px clipped box) and the focus-only skip link.
      if (el.getBoundingClientRect().width <= 1 || el.matches('a[href="#main"]')) continue;
      if (s.textOverflow === 'ellipsis' || s.webkitLineClamp !== 'none') continue;
      if (el.scrollWidth > el.clientWidth + 1 && (el.textContent ?? '').trim().length > 0) {
        findings.push({
          kind: 'clipped',
          detail: `${describe(el)} content ${el.scrollWidth}px in a ${el.clientWidth}px box`,
        });
      }
    }
    return findings;
  }, minTarget);
}

async function main() {
  mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  let total = 0;
  for (const { width, theme } of SHOTS) {
    const context = await browser.newContext({
      viewport: { width, height: width < 768 ? 844 : 900 },
      colorScheme: theme,
      hasTouch: width < 1024,
      isMobile: width < 1024,
    });
    await context.addInitScript((t) => localStorage.setItem('dc:theme', t), theme);
    // tsx compiles with keepNames, which wraps named functions in `__name(...)`; the page
    // function below runs in the browser, where that helper does not exist.
    await context.addInitScript('window.__name = (fn) => fn;');
    const page = await context.newPage();
    for (const [name, url] of TEMPLATES) {
      await page.goto(base + url, { waitUntil: 'networkidle' });
      // Reveal-on-scroll content stays hidden until the viewer scrolls to it (IntersectionObserver),
      // so scroll the way a person does: wheel steps with a pause, then back to the top.
      const height = await page.evaluate(() => document.body.scrollHeight);
      for (let y = 0; y < height; y += 500) {
        await page.mouse.wheel(0, 500);
        await page.waitForTimeout(90);
      }
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(1200);
      const findings = await inspect(page, width < 1024 ? 44 : 24);
      await page.screenshot({
        path: path.join(out, `${name}__${theme}__${width}.png`),
        fullPage: true,
      });
      for (const f of findings) {
        total += 1;
        console.log(`${name} ${theme} ${width}px  [${f.kind}] ${f.detail}`);
      }
    }
    await context.close();
  }
  await browser.close();
  console.log(
    `\n${TEMPLATES.length * SHOTS.length} screenshots in ${out}; ${total} finding(s) ${total ? '' : '(none)'}`,
  );
  process.exit(total > 0 ? 1 : 0);
}

void main();
