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

## Second look after v1.0.0 (2026-11-12)

Re-measured the production build on the two pages that were under 90 (Lighthouse 13.6, simulated mobile, Edge):

| Page                            | Perf (this run) | LCP (simulated) | Observed FCP = LCP | Notes                                                                                                     |
| ------------------------------- | --------------- | --------------- | ------------------ | --------------------------------------------------------------------------------------------------------- |
| Category (`/d1/weapons`)        | 96 (earlier 85) | 0.9 s           | 0.57 s             | Score swings 85–96 between runs on this machine; the LCP is text, so it equals FCP when the run is quiet. |
| Detail (`/d1/weapons/claymore`) | 83–86 (4 runs)  | 4.0–4.1 s       | 0.49 s             | Stable. The LCP element is the 87 px item icon.                                                           |

What the detail page shows: the icon is already preloaded (`priority`), loads in 33 ms and is painted together with the first paint; the only render-blocking resource is the 16 kB stylesheet (156 ms simulated). The simulated 4.0 s therefore comes from how Lighthouse's simulator estimates an _image_ LCP (it averages an optimistic and a pessimistic graph, and the pessimistic one includes the 15 shell scripts, about 190 kB gzip, that finish before the paint), not from anything the visitor waits for. Tried and rejected: `decoding="sync"` on the priority image (83–84, no gain, reverted). Not tried on purpose: enlarging the heading so a text block becomes the LCP element, which would change the design only to move a lab score.

What would move it for real is less script in the shell: the framework is about 129 kB of the 190 kB, so even removing every app-level dependency of the shell (providers, Radix toast and tooltip, header) would not reach the 3.0 s that a score of 90 needs. Recorded in D-102; nothing in the product changed.
