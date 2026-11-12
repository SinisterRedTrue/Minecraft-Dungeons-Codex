/**
 * Prints the live text around words on a wiki page (a fresh fetch, not the sync cache), to
 * judge the misses that `audit.ts` reports.
 *   npx tsx scripts/dev/peek.ts "Dungeons:Wolf Armor" "health" "200"
 */
import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as cheerio from 'cheerio';
import { WikiClient, parsePageHtml } from '../wiki/client';

async function main() {
  const [title, ...needles] = process.argv.slice(2);
  if (!title) throw new Error('usage: peek.ts <page title> [word...]');
  const client = new WikiClient({
    refresh: true,
    cacheDir: mkdtempSync(path.join(os.tmpdir(), 'dc-peek-')),
  });
  const page = await parsePageHtml(title, client);
  const $ = cheerio.load(page.html);
  $('style, script, .mw-editsection, sup.reference').remove();
  const text = $.root().text().replace(/\s+/g, ' ');
  console.log(`# ${page.title} (revision ${page.revisionId}), ${text.length} chars`);
  if (needles.length === 0) console.log(text.slice(0, 1500));
  for (const needle of needles) {
    const lower = text.toLowerCase();
    let from = 0;
    let shown = 0;
    for (;;) {
      const at = lower.indexOf(needle.toLowerCase(), from);
      if (at < 0 || shown >= 3) break;
      console.log(`[${needle}] …${text.slice(Math.max(0, at - 120), at + 160)}…`);
      from = at + needle.length;
      shown += 1;
    }
    if (shown === 0) console.log(`[${needle}] not found`);
  }
}

void main();
