import { readFileSync } from 'node:fs';
import path from 'node:path';

const DIR = path.join(process.cwd(), 'tests', 'fixtures', 'wiki');

/** Reads a saved wiki response from `tests/fixtures/wiki/`. */
export const fixture = (file: string) => readFileSync(path.join(DIR, file), 'utf8');

/** The saved page revision of a fixture (`tests/fixtures/wiki/index.json`). */
export function fixtureRevision(file: string): number {
  const index = JSON.parse(fixture('index.json')) as { file: string; revisionId: number }[];
  const entry = index.find((e) => e.file === file);
  if (!entry) throw new Error(`${file} is not in the fixture index`);
  return entry.revisionId;
}
