/**
 * Template extraction and markup stripping for raw wikitext. A small custom scanner (no
 * dependency); see decision D-033 for why it was chosen over wikiparser-node.
 */

export type TemplateParams = Record<string, string>;

export interface TemplateCall {
  /** Normalized template name, e.g. `Infobox Dungeons item`. */
  name: string;
  /** Named params by name; positional params as `1`, `2`, … All values trimmed. */
  params: TemplateParams;
  /** Offsets of the call in the comment-free text. */
  start: number;
  end: number;
}

/** Removes `<!-- … -->` comments (an unterminated comment runs to the end, like MediaWiki). */
export function stripComments(wikitext: string): string {
  return wikitext.replace(/<!--[\s\S]*?(?:-->|$)/g, '');
}

/** `template:infobox_Dungeons  item` → `Infobox Dungeons item`. */
export function normalizeTemplateName(name: string): string {
  const clean = name
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^template:/i, '')
    .trim();
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

/** Index just past the `]]` that closes the `[[` at `i` (handles nested links in captions). */
function skipLink(s: string, i: number): number {
  let depth = 0;
  for (let j = i; j < s.length; j++) {
    if (s.startsWith('[[', j)) {
      depth++;
      j++;
    } else if (s.startsWith(']]', j)) {
      depth--;
      j++;
      if (depth === 0) return j + 1;
    } else if (s.startsWith('{{', j)) {
      j = skipBraces(s, j) - 1;
    }
  }
  return s.length;
}

/** Index just past the `}}`/`}}}` closing the `{{`/`{{{` at `i`. */
function skipBraces(s: string, i: number): number {
  const triple = s.startsWith('{{{', i) && !s.startsWith('{{{{', i);
  const close = triple ? '}}}' : '}}';
  let j = i + (triple ? 3 : 2);
  while (j < s.length) {
    if (s.startsWith(close, j)) return j + close.length;
    if (s.startsWith('{{', j)) j = skipBraces(s, j);
    else if (s.startsWith('[[', j)) j = skipLink(s, j);
    else j++;
  }
  return s.length;
}

/** Splits the inside of a template call at top-level `|`. */
function splitTopLevel(inner: string): string[] {
  const parts: string[] = [];
  let start = 0;
  let j = 0;
  while (j < inner.length) {
    if (inner.startsWith('{{', j)) j = skipBraces(inner, j);
    else if (inner.startsWith('[[', j)) j = skipLink(inner, j);
    else if (inner[j] === '|') {
      parts.push(inner.slice(start, j));
      start = ++j;
    } else j++;
  }
  parts.push(inner.slice(start));
  return parts;
}

/** Index of the first top-level `=` in a template argument, or -1. */
function topLevelEquals(part: string): number {
  let j = 0;
  while (j < part.length) {
    if (part.startsWith('{{', j)) j = skipBraces(part, j);
    else if (part.startsWith('[[', j)) j = skipLink(part, j);
    else if (part[j] === '=') return j;
    else if (part.startsWith('<', j)) {
      // `<span style="a:b">` holds an `=` that is not a separator.
      const close = part.indexOf('>', j);
      j = close === -1 ? part.length : close + 1;
    } else j++;
  }
  return -1;
}

function parseCall(text: string, start: number): TemplateCall | undefined {
  const end = skipBraces(text, start);
  if (!text.startsWith('}}', end - 2) || text.startsWith('{{{', start)) return undefined;
  const [rawName = '', ...args] = splitTopLevel(text.slice(start + 2, end - 2));
  if (!rawName.trim()) return undefined;
  const params: TemplateParams = {};
  let position = 0;
  for (const arg of args) {
    const eq = topLevelEquals(arg);
    if (eq === -1) params[String(++position)] = arg.trim();
    else params[arg.slice(0, eq).trim()] = arg.slice(eq + 1).trim();
  }
  return { name: normalizeTemplateName(rawName), params, start, end };
}

/** Every template call in `wikitext` (nested calls included), in document order. */
export function findTemplates(wikitext: string): TemplateCall[] {
  const text = stripComments(wikitext);
  const calls: TemplateCall[] = [];
  for (let i = 0; i < text.length; i++) {
    if (text.startsWith('{{{', i)) {
      i = skipBraces(text, i) - 1; // parameter reference, not a call
      continue;
    }
    if (!text.startsWith('{{', i)) continue;
    const call = parseCall(text, i);
    if (call) calls.push(call);
    i++; // keep scanning inside the call for nested templates
  }
  return calls;
}

/** Param maps of every call to template `name` (case of the first letter and `_` ignored). */
export function extractTemplates(wikitext: string, name: string): TemplateParams[] {
  const wanted = normalizeTemplateName(name);
  return findTemplates(wikitext)
    .filter((call) => call.name === wanted)
    .map((call) => call.params);
}

/** The first call to `name`, or `undefined`. */
export function extractTemplate(wikitext: string, name: string): TemplateParams | undefined {
  return extractTemplates(wikitext, name)[0];
}

/* ------------------------------------------------------------------------------------------ */
/* Markup stripping                                                                            */
/* ------------------------------------------------------------------------------------------ */

/** Link-like templates render their display text: `{{DuLevelLink|X}}` → `X`. */
const LINK_TEMPLATE = /link$|^(?:MCD|MCD2|MCDII|Dungeons link|Nowrap|W|Item|EntityLink)$/i;
/** Templates that render the last positional param (`{{MCD|mission|missions}}` → `missions`). */
const LAST_PARAM_TEMPLATES = /^(?:MCD|MCD2|MCDII|Dungeons link|W)$/i;

const ENTITIES: Record<string, string> = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&ndash;': '–',
  '&mdash;': '—',
  '&minus;': '−',
};

function renderTemplate(call: TemplateCall): string {
  if (!LINK_TEMPLATE.test(call.name)) return '';
  const positional = Object.keys(call.params)
    .filter((k) => /^\d+$/.test(k))
    .sort((a, b) => Number(a) - Number(b))
    .map((k) => call.params[k] ?? '');
  const pick = LAST_PARAM_TEMPLATES.test(call.name) ? positional.at(-1) : positional[0];
  return pick ?? '';
}

/** Replaces outermost template calls, innermost-first, until none are left. */
function replaceTemplates(text: string): string {
  let out = text;
  for (let guard = 0; guard < 50; guard++) {
    let changed = false;
    let result = '';
    let i = 0;
    while (i < out.length) {
      if (out.startsWith('{{{', i)) {
        const end = skipBraces(out, i);
        result += out.slice(i, end).replace(/^\{\{\{([^|}]*)\|?([\s\S]*)\}\}\}$/, '$2');
        i = end;
        changed = true;
        continue;
      }
      if (out.startsWith('{{', i)) {
        const call = parseCall(out, i);
        if (call) {
          result += renderTemplate(call);
          i = call.end;
          changed = true;
          continue;
        }
      }
      result += out[i];
      i++;
    }
    out = result;
    if (!changed) break;
  }
  return out;
}

function replaceLinks(text: string): string {
  let out = '';
  let i = 0;
  while (i < text.length) {
    if (text.startsWith('[[', i)) {
      const end = skipLink(text, i);
      const inner = text.slice(i + 2, end - 2);
      const [target = '', ...rest] = splitTopLevel(inner);
      // Interlanguage prefixes are lower-case (`de:`, `zh:`); `MCD:` is a real namespace alias.
      if (
        /^\s*(?:File|Image|Category):/i.test(target) ||
        /^\s*[a-z]{2,3}(?:-[a-z]+)?:/.test(target)
      ) {
        // Images, categories and interlanguage links render nothing inline.
      } else if (rest.length) {
        out += rest.join('|');
      } else {
        out += target.replace(/^\s*:?(?:MCD|Dungeons II|Dungeons|MCD2):/i, '');
      }
      i = end;
      continue;
    }
    out += text[i];
    i++;
  }
  return out;
}

/**
 * Plain text from wikitext: templates rendered (link templates → their text, others dropped),
 * links → their label, refs/comments/files/categories removed, bold/italic quotes removed,
 * `<br>` → newline, other tags dropped, list markers removed, whitespace collapsed per line.
 */
export function stripWikiMarkup(input: string): string {
  let s = stripComments(input);
  s = s.replace(/<ref\b[^>]*\/>/gi, '').replace(/<ref\b[^>]*>[\s\S]*?<\/ref>/gi, '');
  // <nowiki> content is literal: park it behind placeholders until the end.
  const literals: string[] = [];
  s = s.replace(/<nowiki>([\s\S]*?)<\/nowiki>/gi, (_, inner: string) => {
    literals.push(inner);
    return `\u0000${literals.length - 1}\u0000`;
  });
  s = replaceTemplates(s);
  s = replaceLinks(s);
  s = s
    .replace(/\[(?:https?:)?\/\/[^\s\]]+\s+([^\]]+)\]/g, '$1')
    .replace(/\[(?:https?:)?\/\/[^\]]+\]/g, '');
  s = s.replace(/'''''|'''|''/g, '');
  s = s.replace(/<br\s*\/?>/gi, '\n').replace(/<\/?[a-z][^>]*>/gi, '');
  s = s.replace(/&[a-z]+;|&#\d+;/gi, (e) => ENTITIES[e.toLowerCase()] ?? e);
  s = s.replace(/\u0000(\d+)\u0000/g, (_, i: string) => literals[Number(i)] ?? '');
  return s
    .split('\n')
    .map((line) =>
      line
        .replace(/^[*#:;]+\s*/, '')
        .replace(/[\s ]+/g, ' ')
        .trim(),
    )
    .filter(Boolean)
    .join('\n');
}
