/**
 * WCAG contrast check for every text/background token pair the UI kit uses.
 *   npx tsx scripts/contrast.ts
 * Reads src/styles/tokens.css, resolves each theme (dark, light) x game accent (d1, d2) the same
 * way the cascade does, and fails (exit 1) when a pair is under its threshold:
 *   4.5 for body text, 3.0 for large text and UI boundaries.
 * Also fails when src/styles/tokens.css drifts from the Design folder's copy.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type Rgba = { r: number; g: number; b: number; a: number };
type Env = Record<string, string>;
type Theme = 'dark' | 'light';
type Game = 'd1' | 'd2';

const TOKENS = resolve('src/styles/tokens.css');
const DESIGN_TOKENS = resolve('..', '[ RoadMap ]', '[ Design ]', 'Tokens', 'tokens.css');

function parseBlocks(css: string): Map<string, Env> {
  const blocks = new Map<string, Env>();
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const m of stripped.matchAll(/([^{}@]+?)\{([^{}]*)\}/g)) {
    const selector = (m[1] ?? '').replace(/\s+/g, ' ').trim();
    const env = blocks.get(selector) ?? {};
    for (const d of (m[2] ?? '').matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
      env[d[1] as string] = (d[2] as string).trim();
    }
    blocks.set(selector, env);
  }
  return blocks;
}

function block(blocks: Map<string, Env>, selector: string): Env {
  const env = blocks.get(selector);
  if (!env) throw new Error(`tokens.css has no rule for "${selector}"`);
  return env;
}

/** The custom properties in force for a theme and game accent, as the cascade would produce. */
function buildEnv(blocks: Map<string, Env>, theme: Theme, game: Game): Env {
  const env: Env = {
    ...block(blocks, ':root'),
    ...block(blocks, ':root, :root[data-theme="dark"]'),
    ...(theme === 'light' ? block(blocks, ':root[data-theme="light"]') : {}),
    ...block(blocks, ':root, [data-game="d1"]'),
    ...(game === 'd2' ? block(blocks, '[data-game="d2"]') : {}),
    ...block(blocks, 'body, [data-game]'),
  };
  if (theme === 'light') {
    Object.assign(
      env,
      block(blocks, ':root[data-theme="light"] body, :root[data-theme="light"] [data-game]'),
    );
  }
  return env;
}

function parseColor(value: string, env: Env, depth = 0): Rgba {
  if (depth > 12) throw new Error(`Token cycle while resolving "${value}"`);
  const v = value.trim();
  const ref = /^var\((--[\w-]+)\)$/.exec(v);
  if (ref) {
    const next = env[ref[1] as string];
    if (next === undefined) throw new Error(`Missing token ${ref[1]}`);
    return parseColor(next, env, depth + 1);
  }
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(v);
  if (hex) {
    let h = hex[1] as string;
    if (h.length === 3) h = [...h].map((c) => c + c).join('');
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
      a: 1,
    };
  }
  const rgba = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/.exec(
    v,
  );
  if (rgba) {
    return {
      r: +(rgba[1] as string),
      g: +(rgba[2] as string),
      b: +(rgba[3] as string),
      a: rgba[4] === undefined ? 1 : +rgba[4],
    };
  }
  throw new Error(`Cannot parse colour "${value}"`);
}

/** Alpha-composite `top` over an opaque `bottom`. */
function over(top: Rgba, bottom: Rgba): Rgba {
  const a = top.a;
  return {
    r: top.r * a + bottom.r * (1 - a),
    g: top.g * a + bottom.g * (1 - a),
    b: top.b * a + bottom.b * (1 - a),
    a: 1,
  };
}

function luminance(c: Rgba): number {
  const lin = (u: number) => {
    const s = u / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
}

function ratio(fg: Rgba, bg: Rgba): number {
  const [hi, lo] = [luminance(over(fg, bg)), luminance(bg)].sort((x, y) => y - x) as [
    number,
    number,
  ];
  return (hi + 0.05) / (lo + 0.05);
}

/** `fraction` of `tint` mixed into `base`; how Badge and Chip tint a surface. */
function tinted(base: Rgba, tint: Rgba, fraction: number): Rgba {
  return over({ ...tint, a: fraction }, base);
}

type Check = { label: string; fg: string; bg: string; min: number; tint?: [string, number] };

const SURFACES = ['--bg', '--bg-2', '--surface-1', '--surface-2'];
const checks: Check[] = [];
const add = (label: string, fg: string, bgs: string[], min: number) => {
  for (const bg of bgs) checks.push({ label, fg, bg, min });
};

add('text', '--text', [...SURFACES, '--surface-3'], 4.5);
add('text-muted', '--text-muted', [...SURFACES, '--surface-3'], 4.5);
add('accent-text (links, ghost button, eyebrow)', '--accent-text', SURFACES, 4.5);
// Badges tint whatever they sit on (page, alternating band or card), so check all three.
const BADGE_BASES = ['--bg', '--bg-2', '--surface-1'];
const tintOver = (label: string, fg: string, tint: string) => {
  for (const bg of BADGE_BASES) {
    checks.push({ label: `${label} (12% tint)`, fg, bg, min: 4.5, tint: [tint, 0.12] });
  }
};
for (const r of ['common', 'rare', 'special', 'unique']) {
  add(`rarity-${r}`, `--rarity-${r}`, ['--bg', '--bg-2', '--surface-1'], 4.5);
  tintOver(`rarity-${r} badge`, `--rarity-${r}`, `--rarity-${r}`);
}
for (const t of ['soul', 'redstone']) {
  add(`${t}-text`, `--${t}-text`, ['--bg', '--bg-2', '--surface-1'], 4.5);
  tintOver(`${t}-text badge`, `--${t}-text`, `--${t === 'soul' ? 'soul' : 'redstone'}`);
}
tintOver('accent-text on dlc badge', '--accent-text', '--accent');
// Button ink on both ends of its gradient.
for (const [ink, stops] of [
  ['--accent-ink', ['--accent-hi', '--accent']],
  ['--gold-ink', ['--gold-hi', '--gold']],
  ['--redstone-ink', ['--redstone-hi', '--redstone']],
] as const) {
  for (const stop of stops)
    checks.push({ label: `button ink ${ink}`, fg: ink, bg: stop, min: 4.5 });
}
add('stone button label', '--text', ['--surface-2', '--surface-3'], 4.5);
// UI boundaries and focus (3:1).
add('focus ring colour', '--focus-color', SURFACES, 3);
add('control outline (text-faint)', '--text-faint', ['--bg', '--surface-1', '--surface-2'], 3);

function main(): void {
  let failed = 0;
  let total = 0;

  if (existsSync(DESIGN_TOKENS)) {
    const same =
      readFileSync(TOKENS, 'utf8').replace(/\r\n/g, '\n') ===
      readFileSync(DESIGN_TOKENS, 'utf8').replace(/\r\n/g, '\n');
    console.log(
      same
        ? 'tokens.css matches [ Design ]/Tokens/tokens.css'
        : 'FAIL tokens.css differs from [ Design ]/Tokens/tokens.css (adjust both)',
    );
    if (!same) failed++;
  }

  const blocks = parseBlocks(readFileSync(TOKENS, 'utf8'));
  for (const theme of ['dark', 'light'] as const) {
    for (const game of ['d1', 'd2'] as const) {
      const env = buildEnv(blocks, theme, game);
      const color = (token: string) => parseColor(`var(${token})`, env);
      const rows: string[] = [];
      for (const c of checks) {
        let bg = color(c.bg);
        if (c.tint) bg = tinted(bg, color(c.tint[0]), c.tint[1]);
        const value = ratio(color(c.fg), bg);
        total++;
        if (value < c.min) {
          failed++;
          rows.push(
            `  FAIL ${c.label}: ${c.fg} on ${c.bg}${c.tint ? ' (tinted)' : ''} = ${value.toFixed(2)} (needs ${c.min})`,
          );
        }
      }
      console.log(
        `${theme}/${game}: ${rows.length === 0 ? 'ok' : `${rows.length} failing`} (${checks.length} pairs)`,
      );
      for (const r of rows) console.log(r);
    }
  }
  console.log(`\n${total - failed}/${total} checks passed`);
  if (failed > 0) process.exit(1);
}

main();
