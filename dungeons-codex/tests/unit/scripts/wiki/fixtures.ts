import { readFileSync } from 'node:fs';
import path from 'node:path';

const DIR = path.join(process.cwd(), 'tests', 'fixtures', 'wiki');

/** Reads a saved wiki response from `tests/fixtures/wiki/`. */
export const fixture = (file: string) => readFileSync(path.join(DIR, file), 'utf8');
