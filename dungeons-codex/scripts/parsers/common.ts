/** Helpers every D1 parser uses. */
import { pageUrl } from '../wiki/client';
import type { Cell, ParsedRow } from '../wiki/tables';
import { normalizeName, toBool } from '../wiki/text';
import { stripWikiMarkup } from '../wiki/templates';

export interface Source {
  title: string;
  url: string;
  revisionId: number;
  fetchedAt: string;
}

export function makeSource(
  title: string,
  revisionId: number | undefined,
  fetchedAt: string,
): Source {
  return { title, url: pageUrl(title), revisionId: revisionId ?? 0, fetchedAt };
}

/** Index of the first header matching `pattern`, or -1. */
export function col(headers: readonly string[], pattern: RegExp): number {
  return headers.findIndex((h) => pattern.test(h));
}

/** Cell `index` of a row (empty when out of range). */
export function cellAt(row: ParsedRow, index: number): Cell | undefined {
  return index >= 0 ? row.cells[index] : undefined;
}

/** Plain lines of a cell with footnote markers removed; empties dropped. */
export function lines(cell: Cell | undefined): string[] {
  return (cell?.lines ?? []).map(normalizeName).filter(Boolean);
}

/** First line of a cell. */
export function firstLine(cell: Cell | undefined): string {
  return lines(cell)[0] ?? '';
}

/** `✔` → true, `✖`/empty → false; anything else (a name, "Unobtainable") → undefined. */
export function flag(cell: Cell | undefined): boolean | undefined {
  const text = normalizeName(cell?.text.replace(/\[verify\]/gi, '') ?? '');
  return toBool(text);
}

/** The first image file title in a cell. */
export function firstImage(cell: Cell | undefined): string | undefined {
  return cell?.images[0];
}

const WORDS_TO_DROP = /^(?:none|unknown|n\/a|—|-|\?+)$/i;

/** Property-like lines: real text only (no "None"/"Unknown" placeholders). */
export function realLines(cell: Cell | undefined): string[] {
  return lines(cell).filter((l) => !WORDS_TO_DROP.test(l));
}

/**
 * Joins a sentence that the wiki's HTML broke across lines (a stray `<p>` in the middle of a
 * table cell, as in the Soul Healer row): a line that starts in lower case continues the line
 * before it, unless that one already ended a sentence or a value.
 */
export function joinWrappedLines(items: readonly string[]): string[] {
  const out: string[] = [];
  for (const line of items) {
    const previous = out.at(-1);
    if (previous !== undefined && /^[a-z]/.test(line) && !/[.!?:%)]$/.test(previous)) {
      out[out.length - 1] = `${previous} ${line}`;
    } else {
      out.push(line);
    }
  }
  return out;
}

/**
 * Entity names in a cell: the cell's page links (bare titles) when it has any, otherwise its
 * lines split at commas. Cells that run names together ("Void Strike" + "Fuse Shot") need the links.
 */
export function namesOf(cell: Cell | undefined): string[] {
  const links = (cell?.links ?? [])
    .filter((l) => /^Dungeons:/i.test(l.title))
    .map((l) => bareTitle(l.title));
  if (links.length) return [...new Set(links)];
  return realLines(cell)
    .flatMap((line) => line.split(/\s*,\s*/))
    .filter(Boolean);
}

/** Page title for an entity: its first link, else `Dungeons:{name}`. */
export function pageTitleOf(cell: Cell | undefined, fallbackName: string): string {
  const link = cell?.links.find((l) => /^Dungeons:/i.test(l.title));
  return link?.title ?? `Dungeons:${fallbackName}`;
}

/** Strips wiki markup and the `Dungeons:` prefix from a title. */
export function bareTitle(title: string): string {
  return title.replace(/^Dungeons:/i, '').trim();
}

/**
 * The first real paragraph of a page, as plain text. Block templates (the infobox, hatnotes)
 * are skipped; inline link templates such as `{{MCD|DLC}}` stay and render as their text.
 */
export function leadParagraph(wikitext: string): string | undefined {
  for (const block of removeBlockTemplates(wikitext).split(/\n{2,}/)) {
    // A paragraph often starts with the page's lead image on its own line.
    const trimmed = block
      .split('\n')
      .filter((line) => !/^\s*\[\[(?:File|Image|Category):.*\]\]\s*$/i.test(line))
      .join('\n')
      .trim();
    if (!trimmed || /^(?:==|\{\||\*|#|:)/.test(trimmed)) continue;
    const text = stripWikiMarkup(trimmed);
    if (text.length > 40) return text;
  }
  return undefined;
}

/** Removes templates that start a line and span several lines, or are infobox/hatnote-like. */
function removeBlockTemplates(wikitext: string): string {
  let out = '';
  let i = 0;
  while (i < wikitext.length) {
    const atLineStart = i === 0 || wikitext[i - 1] === '\n';
    if (atLineStart && wikitext.startsWith('{{', i)) {
      let depth = 0;
      let j = i;
      for (; j < wikitext.length; j++) {
        if (wikitext.startsWith('{{', j)) {
          depth++;
          j++;
        } else if (wikitext.startsWith('}}', j)) {
          depth--;
          j++;
          if (depth === 0) break;
        }
      }
      const block = wikitext.slice(i, j + 1);
      const name = /^\{\{\s*([^|}\n]*)/.exec(block)?.[1]?.trim() ?? '';
      if (
        block.includes('\n') ||
        /^(?:infobox|about|for|main|see also|quote|stub|mcd switch|short description)/i.test(name)
      ) {
        i = j + 1;
        continue;
      }
    }
    out += wikitext[i];
    i++;
  }
  return out;
}

/** Splits wikitext into `{ heading, level, body }` sections (the lead has an empty heading). */
export function wikiSections(wikitext: string): { heading: string; level: number; body: string }[] {
  const out: { heading: string; level: number; body: string }[] = [];
  let heading = '';
  let level = 0;
  let body: string[] = [];
  const flush = () => out.push({ heading, level, body: body.join('\n') });
  for (const line of wikitext.split(/\r?\n/)) {
    const match = /^(={2,6})\s*(.+?)\s*\1\s*$/.exec(line);
    if (match) {
      flush();
      level = (match[1] ?? '').length;
      heading = stripWikiMarkup(match[2] ?? '');
      body = [];
    } else {
      body.push(line);
    }
  }
  flush();
  return out;
}
