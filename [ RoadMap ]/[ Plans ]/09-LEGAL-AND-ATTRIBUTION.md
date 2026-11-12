# 09: Legal & Attribution

> This isn't legal advice. It's the project's compliance plan, based on the license stated on minecraft.wiki (checked 2026-11-12).

## Source license
minecraft.wiki says: *"Content on this site is licensed under CC BY-NC-SA 3.0 unless otherwise noted."* So:
| Obligation | How we meet it |
|---|---|
| **BY**: attribution | A `SourceCredit` on every detail page linking the exact wiki page and revision. A Credits section on `/about`. A footer line on every page |
| **NC**: non-commercial | No ads, donations, store, sponsorships, affiliate links or paywalls. Ever. |
| **SA**: share-alike | The scraped data in `data/generated/` and our text content are released under **CC BY-NC-SA 3.0**. Say so in the footer, on `/about`, and in `dungeons-codex/data/LICENSE.md` |
| Indicate changes | `/about` says: "Data has been reformatted, normalized and combined from the Minecraft Wiki. Some values are computed (marked Approximate)." |

Our **source code** is a separate work and is licensed **MIT** (`dungeons-codex/LICENSE`), except `data/` and `public/images/`, as stated in the README.

## Game assets & trademarks
- Item and mob icons and game imagery are © Mojang Studios / Microsoft. The wiki hosts them as game-asset images; we show them for identification only, in a non-commercial fan context.
- Don't use the official Minecraft or Minecraft Dungeons logos, logotype fonts or key art. Dungeons Codex has its **own** wordmark (CSS/SVG text in our display font).
- Footer disclaimer (exact text):
  > Dungeons Codex is an unofficial fan site. NOT AN OFFICIAL MINECRAFT PRODUCT. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT. Game data and images from the Minecraft Wiki (minecraft.wiki), licensed CC BY-NC-SA 3.0.

## Footer line (every page)
`Data © Minecraft Wiki contributors · CC BY-NC-SA 3.0 · Last synced {date}`

## Privacy
- No analytics, cookies or trackers in v1. localStorage is used only for theme, favorites, compare, recent searches and saved builds. `/about` says this in one short "Privacy" paragraph.
- Because there are no non-essential cookies, no cookie banner is needed.

## Scraping etiquette
Follow `04-DATA-PIPELINE.md`: 1 request per second, a descriptive User-Agent with no personal info, `maxlag`, caching, and no runtime hotlinking.
