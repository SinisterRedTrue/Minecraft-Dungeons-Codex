/**
 * `npm run data:validate`: schema + cross-reference + image checks for `data/generated`.
 * Exits 1 with a readable list when anything is wrong.
 */
import { formatIssue, validateData } from './lib/validator';

function main(): void {
  const { issues, counts } = validateData();
  const files = Object.keys(counts);
  if (files.length === 0) {
    console.log('data:validate: data/generated is empty, nothing to validate.');
    return;
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (issues.length === 0) {
    console.log(`data:validate: OK — ${total} entities in ${files.length} files.`);
    return;
  }
  console.error(`data:validate: ${issues.length} issue(s) in ${total} entities:`);
  for (const issue of issues) console.error(`  ✖ ${formatIssue(issue)}`);
  process.exitCode = 1;
}

main();
