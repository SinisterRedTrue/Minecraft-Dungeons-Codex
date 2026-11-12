# Lighthouse (mobile)

Lighthouse 12, default mobile emulation (simulated Slow 4G, 4× CPU slowdown), against `next start` of the production build, driven through Edge (Chromium). Run on 2026-11-12 at the end of Prompt 13.

| Page                                | Perf | A11y | Best practices | SEO | FCP   | LCP (simulated)        | TBT    | CLS |
| ----------------------------------- | ---- | ---- | -------------- | --- | ----- | ---------------------- | ------ | --- |
| Home (`/`)                          | 94   | 100  | 100            | 100 | 0.9 s | 3.1 s (0.4 s observed) | 33 ms  | 0   |
| Category, 155 cards (`/d1/weapons`) | 85   | 100  | 100            | 100 | 0.9 s | 4.0 s (0.4 s observed) | 173 ms | 0   |
| Detail (`/d1/weapons/claymore`)     | 87   | 100  | 100            | 100 | 0.9 s | 4.0 s (0.3 s observed) | 75 ms  | 0   |

## Reading the numbers

Accessibility, best practices and SEO are 100 on all three pages. Performance meets the 90 target on the home page; the category and detail pages sit at 85 and 87. The whole gap is LCP: the _observed_ LCP is 0.3 to 0.4 s, but Lighthouse's simulated LCP charges every script a page loads against the paint, and the Next 16 runtime (React DOM 70 kB + client runtime about 55 kB gzip) is already about 129 kB of the 175 to 232 kB each page loads (D-101, D-102). TBT (33 to 173 ms) and CLS (0) are good.

What moved the scores in this pass:

- Zod out of the shell (favorites, compare and recent-search stores, the forge codec), the planner store loaded on click: 233 → 197 kB on `/`.
- `NuqsAdapter` only on the three pages that read the query string.
- The mobile menu sheet and the Sections popover are downloaded on first use: 197 → 176 kB on `/`.
- `priority` on the detail page's one above-the-fold image (it was lazy-loaded and was the LCP element).
- `content-visibility: auto` on the card grid: TBT 940 → 173 ms on the category page.
- No prefetch of the Favorites bundle; hero images no longer squeezed out of their aspect ratio (best practices 96 → 100); infobox links 24 px tall (accessibility 97 → 100).

## Re-running (Windows, Edge)

```powershell
$env:CHROME_PATH = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
npx lighthouse http://localhost:3100/ --only-categories=performance,accessibility,best-practices,seo --chrome-flags="--headless=new --no-sandbox"
```

(The Chromium that Playwright installs cannot be launched by Lighthouse's launcher on this machine, so Edge is used.)
