/**
 * Fails when a raw colour literal appears in `src/` outside `src/styles/` (Plans 08: no hex
 * colours outside the token files). Part of `npm run verify`.
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { findRawColors } from './lib/raw-colors';

const SRC = path.join(process.cwd(), 'src');
const STYLES = path.join(SRC, 'styles');
const EXTENSIONS = new Set(['.ts', '.tsx', '.css', '.mdx']);

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (full !== STYLES) yield* walk(full);
    } else if (EXTENSIONS.has(path.extname(entry.name))) {
      yield full;
    }
  }
}

let problems = 0;
let files = 0;
for (const file of walk(SRC)) {
  files += 1;
  for (const { line, text } of findRawColors(readFileSync(file, 'utf8'))) {
    problems += 1;
    console.error(`${path.relative(process.cwd(), file)}:${line}  ${text}`);
  }
}

if (problems > 0) {
  console.error(
    `\n${problems} raw colour literal(s) outside src/styles/. Use a design token (a CSS variable or a Tailwind token utility).`,
  );
  process.exit(1);
}
console.log(`no-hex: OK (${files} files in src/ outside src/styles/ have no raw colours)`);
