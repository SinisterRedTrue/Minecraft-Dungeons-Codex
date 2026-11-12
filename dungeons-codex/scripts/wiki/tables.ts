/**
 * Wikitable parsing for rendered MediaWiki HTML (`action=parse&prop=text`) and for raw
 * wikitext tables (`{| … |}`).
 */
import * as cheerio from 'cheerio';
import type { AnyNode, Element } from 'domhandler';

interface CellLink {
  /** Target page title, e.g. `Dungeons:Claymore`. */
  title: string;
  /** Visible link text (may be empty for icon-only links). */
  text: string;
}

export interface Cell {
  /** Visible text; `<br>` and list items become new lines; footnotes and hidden spans dropped. */
  text: string;
  /** `text` split into its non-empty lines. */
  lines: string[];
  links: CellLink[];
  /** File titles of every image in the cell, e.g. `File:MCD Anchor.png`. */
  images: string[];
  /** `data-sort-value` of the cell (or of an element inside it), when present. */
  sortValue?: string;
  /** True for `<th>` cells (row headers). */
  header: boolean;
}

export interface ParsedRow {
  cells: Cell[];
  /** Cells keyed by column header (duplicate headers get ` (2)`, ` (3)` …). */
  byHeader: Record<string, Cell>;
  /** Label of the latest full-width divider row above this row, if any. */
  section?: string;
}

export interface ParsedTable {
  /** Nearest preceding headings, outermost first (h2 > h3 > h4). */
  headingPath: string[];
  headers: string[];
  rows: ParsedRow[];
  /** Classes of the `<table>`, e.g. `wikitable sortable`. */
  className: string;
}

const HIDDEN_SELECTOR = [
  'sup.reference',
  '.reference',
  '.sortkey',
  '.mw-editsection',
  '.hidden',
  '[style*="display:none"]',
  '[style*="display: none"]',
  'style',
  'script',
].join(',');

const BLOCK_TAGS = new Set(['li', 'p', 'div', 'tr', 'dd', 'dt', 'ul', 'ol']);

/** Normalizes whitespace inside one line. */
const squash = (s: string) => s.replace(/[\s ]+/g, ' ').trim();

/** Turns a node into text with `\n` at `<br>` and block boundaries. */
function nodeText($: cheerio.CheerioAPI, node: AnyNode): string {
  if (node.type === 'text') return (node as unknown as { data: string }).data;
  if (node.type !== 'tag') return '';
  const el = node as Element;
  if ($(el).is(HIDDEN_SELECTOR)) return '';
  if (el.tagName === 'br') return '\n';
  const inner = el.children.map((child) => nodeText($, child)).join('');
  return BLOCK_TAGS.has(el.tagName) ? `\n${inner}\n` : inner;
}

/** `/images/thumb/A_b.png/50px-A_b.png?x` or `/images/A_b.png?x` → `File:A b.png`. */
export function fileTitleFromSrc(src: string): string | undefined {
  const clean = src.split('?')[0] ?? '';
  const match =
    /\/images\/thumb\/(?:[0-9a-f]\/[0-9a-f]{2}\/)?([^/]+)\/[^/]+$/.exec(clean) ??
    /\/images\/(?:[0-9a-f]\/[0-9a-f]{2}\/)?([^/]+)$/.exec(clean);
  if (!match?.[1]) return undefined;
  return `File:${decodeURIComponent(match[1]).replace(/_/g, ' ')}`;
}

/** `/w/Dungeons:Hidden_Depths` → `Dungeons:Hidden Depths`. */
function titleFromHref(href: string): string | undefined {
  const match = /^(?:https?:\/\/minecraft\.wiki)?\/w\/([^?#]+)/.exec(href);
  if (!match?.[1]) return undefined;
  return decodeURIComponent(match[1]).replace(/_/g, ' ');
}

function parseCell($: cheerio.CheerioAPI, el: Element): Cell {
  const raw = el.children.map((child) => nodeText($, child)).join('');
  const lines = raw.split('\n').map(squash).filter(Boolean);

  const links: CellLink[] = [];
  const images: string[] = [];
  $(el)
    .find('a[href]')
    .each((_, a) => {
      if ($(a).closest(HIDDEN_SELECTOR).length) return;
      const href = $(a).attr('href') ?? '';
      const title = $(a).attr('title') ?? titleFromHref(href);
      if (!title || href.startsWith('#') || /^(?:File|Image):/i.test(title)) return;
      if (/\/w\/(?:File|Image):/i.test(href)) return;
      const text = squash($(a).text());
      const existing = links.find((l) => l.title === title);
      if (!existing) links.push({ title, text });
      else if (!existing.text && text) existing.text = text;
    });
  $(el)
    .find('img')
    .each((_, img) => {
      const fileLink = $(img).closest('a[href*="/w/File:"]').attr('href');
      const title =
        (fileLink && titleFromHref(fileLink)) ?? fileTitleFromSrc($(img).attr('src') ?? '');
      if (title && !images.includes(title)) images.push(title);
    });

  const sortValue =
    $(el).attr('data-sort-value') ??
    $(el).find('[data-sort-value]').first().attr('data-sort-value');

  const cell: Cell = { text: lines.join('\n'), lines, links, images, header: el.tagName === 'th' };
  if (sortValue !== undefined) cell.sortValue = sortValue;
  return cell;
}

interface GridCell {
  cell: Cell;
  /** The source element, so spanned copies can be recognized. */
  source: Element;
}

/** Expands rowspan/colspan into a rectangular grid of cells. */
function buildGrid($: cheerio.CheerioAPI, rows: Element[]): GridCell[][] {
  const grid: GridCell[][] = rows.map(() => []);
  rows.forEach((tr, r) => {
    const line = grid[r] ?? [];
    let c = 0;
    for (const el of $(tr).children('th, td').toArray() as Element[]) {
      while (line[c]) c++;
      const rowspan = Math.max(1, Number($(el).attr('rowspan')) || 1);
      const colspan = Math.max(1, Number($(el).attr('colspan')) || 1);
      const entry: GridCell = { cell: parseCell($, el), source: el };
      for (const target of grid.slice(r, r + rowspan)) {
        for (let dc = 0; dc < colspan; dc++) target[c + dc] = entry;
      }
      c += colspan;
    }
  });
  return grid;
}

function uniqueHeaders(names: string[]): string[] {
  const seen = new Map<string, number>();
  return names.map((name, i) => {
    const base = name || `col${i + 1}`;
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return n === 1 ? base : `${base} (${n})`;
  });
}

/** Parses one `<table>` element. */
function parseTableElement(
  $: cheerio.CheerioAPI,
  table: Element,
  headingPath: string[] = [],
): ParsedTable {
  const rows = $(table)
    .find('> tr, > tbody > tr, > thead > tr, > tfoot > tr')
    .toArray() as Element[];
  const grid = buildGrid($, rows);
  const width = Math.max(0, ...grid.map((r) => r.length));

  // Leading rows made only of <th> are header rows; later ones can be group headers.
  let headerRowCount = 0;
  while (grid[headerRowCount]?.every((g) => g?.cell.header)) headerRowCount++;
  const headerRows = grid.slice(0, headerRowCount);
  const headerNames: string[] = [];
  for (let c = 0; c < width; c++) {
    const parts: string[] = [];
    for (const headerRow of headerRows) {
      const text = squash(headerRow[c]?.cell.lines.join(' ') ?? '');
      if (text && parts.at(-1) !== text) parts.push(text);
    }
    headerNames.push(parts.join(' / '));
  }
  const headers = uniqueHeaders(headerNames);

  const out: ParsedRow[] = [];
  let section: string | undefined;
  grid.forEach((row, r) => {
    if (r < headerRowCount || row.length === 0) return;
    const sources = new Set(row.filter(Boolean).map((g) => g.source));
    const [only] = row;
    // A row that is one cell across the whole table is a divider ("Spooky Fall"), not data.
    if (only && width > 1 && sources.size === 1 && row.length === width && row.every(Boolean)) {
      const tr = rows[r];
      const startsHere = tr && $(tr).children('th, td').toArray().includes(only.source);
      if (startsHere) section = only.cell.text || undefined;
      return;
    }
    const cells = Array.from({ length: width }, (_, c) => row[c]?.cell ?? emptyCell());
    const byHeader: Record<string, Cell> = {};
    cells.forEach((cell, c) => (byHeader[headers[c] ?? `col${c + 1}`] = cell));
    const parsed: ParsedRow = { cells, byHeader };
    if (section) parsed.section = section;
    out.push(parsed);
  });

  return { headingPath, headers, rows: out, className: $(table).attr('class') ?? '' };
}

const emptyCell = (): Cell => ({ text: '', lines: [], links: [], images: [], header: false });

function headingText($: cheerio.CheerioAPI, el: Element): string {
  const headline = $(el).find('.mw-headline');
  const source = headline.length ? headline : $(el).clone();
  source.find('.mw-editsection').remove();
  return squash(source.text());
}

/**
 * Every `table.wikitable` in rendered page HTML, with the heading path above it.
 * Tables nested inside another wikitable are skipped (their content stays in the outer cell).
 */
export function parseWikitables(html: string): ParsedTable[] {
  const $ = cheerio.load(html);
  const path: string[] = [];
  const tables: ParsedTable[] = [];
  $('h2, h3, h4, table.wikitable').each((_, el) => {
    if (el.tagName === 'table') {
      if ($(el).parents('table.wikitable').length) return;
      tables.push(parseTableElement($, el, path.filter(Boolean)));
      return;
    }
    const level = Number(el.tagName[1]) - 2; // h2 → 0, h3 → 1, h4 → 2
    path.length = level;
    path[level] = headingText($, el);
  });
  return tables;
}

/* ------------------------------------------------------------------------------------------ */
/* Wikitext tables                                                                             */
/* ------------------------------------------------------------------------------------------ */

export interface WikitextTable {
  attrs: string;
  headers: string[];
  rows: string[][];
}

/** Drops a leading `attr="…" |` from a wikitext cell, keeping the content. */
function cellContent(raw: string): string {
  // `[[a|b]]` and `{{x|y}}` contain pipes that are not attribute separators.
  let depth = 0;
  for (let i = 0; i < raw.length; i++) {
    const two = raw.slice(i, i + 2);
    if (two === '[[' || two === '{{') {
      depth++;
      i++;
    } else if (two === ']]' || two === '}}') {
      depth--;
      i++;
    } else if (raw[i] === '|' && depth === 0) {
      const attrs = raw.slice(0, i);
      return /=/.test(attrs) || attrs.trim() === '' ? raw.slice(i + 1).trim() : raw.trim();
    }
  }
  return raw.trim();
}

/** Splits `a || b || c` (or `!!`) at top level. */
function splitInline(line: string, sep: '||' | '!!'): string[] {
  const out: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < line.length; i++) {
    const two = line.slice(i, i + 2);
    if (two === '[[' || two === '{{') {
      depth++;
      i++;
    } else if (two === ']]' || two === '}}') {
      depth--;
      i++;
    } else if (two === sep && depth === 0) {
      out.push(line.slice(start, i));
      start = i + 2;
      i++;
    }
  }
  out.push(line.slice(start));
  return out;
}

/**
 * Parses the simple wikitext tables (`{| … |}`) of a page: header cells (`!`) and data rows
 * (`|-` separated, `|` / `||` cells). Nested tables are not supported (not used by item pages).
 */
export function parseWikitextTables(wikitext: string): WikitextTable[] {
  const tables: WikitextTable[] = [];
  const lines = wikitext.split(/\r?\n/);
  let current: WikitextTable | undefined;
  let row: string[] | undefined;
  let rowIsAllHeaders = true;
  let lastCellIsHeader = false;

  // The first row made only of `!` cells is the header; any later `!` cell is a row header.
  const endRow = () => {
    if (current && row && row.length) {
      if (rowIsAllHeaders && current.headers.length === 0 && current.rows.length === 0) {
        current.headers = row;
      } else {
        current.rows.push(row);
      }
    }
    row = undefined;
    rowIsAllHeaders = true;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.startsWith('{|')) {
      current = { attrs: line.slice(2).trim(), headers: [], rows: [] };
      row = undefined;
      rowIsAllHeaders = true;
      continue;
    }
    if (!current) continue;
    if (line.startsWith('|}')) {
      endRow();
      tables.push(current);
      current = undefined;
      continue;
    }
    if (line.startsWith('|-')) {
      endRow();
      continue;
    }
    if (line.startsWith('|+')) continue;
    if (line.startsWith('!')) {
      (row ??= []).push(...splitInline(line.slice(1), '!!').map(cellContent));
      lastCellIsHeader = true;
      continue;
    }
    if (line.startsWith('|')) {
      (row ??= []).push(...splitInline(line.slice(1), '||').map(cellContent));
      rowIsAllHeaders = false;
      lastCellIsHeader = false;
      continue;
    }
    // A continuation line belongs to the previous data cell.
    if (line && row && row.length && !lastCellIsHeader) {
      row[row.length - 1] = `${row[row.length - 1]}\n${line}`.trim();
    }
  }
  return tables;
}
