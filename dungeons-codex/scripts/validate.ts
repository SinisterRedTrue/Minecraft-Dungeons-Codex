// Stub: the real zod + cross-reference validator arrives in Prompt 03.
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

const root = path.join(process.cwd(), 'data', 'generated');

function hasJson(dir: string): boolean {
  if (!existsSync(dir)) return false;
  return readdirSync(dir, { withFileTypes: true }).some((entry) =>
    entry.isDirectory() ? hasJson(path.join(dir, entry.name)) : entry.name.endsWith('.json'),
  );
}

if (!hasJson(root)) {
  console.log('data:validate: data/generated is empty, nothing to validate.');
} else {
  console.log('data:validate: not implemented yet');
}
