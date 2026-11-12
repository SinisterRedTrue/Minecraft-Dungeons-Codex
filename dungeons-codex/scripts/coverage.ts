/**
 * `npm run data:coverage`: prints the coverage table from `data/reports/coverage-{game}.json`
 * and exits 1 when a category is below the 98 % gate (`[ Plans ]/04-DATA-PIPELINE.md`).
 */
import { GAME_IDS } from '@/config/games';
import { defaultPaths } from './lib/data-files';
import { coverageRatio, loadReport, meetsGate } from './pipeline/report';

function main(): void {
  const { reports } = defaultPaths();
  let rows = 0;
  for (const game of GAME_IDS) {
    for (const c of Object.values(loadReport(reports, game).categories)) {
      rows++;
      const ok = meetsGate(c);
      console.log(
        `${ok ? '✔' : '✖'} ${game}/${c.category.padEnd(14)} ${String(c.valid).padStart(4)} / ${String(c.expected).padEnd(4)} ${(coverageRatio(c) * 100).toFixed(1)} %  partial ${c.partial.length}, dropped ${c.dropped.length}`,
      );
      if (!ok) process.exitCode = 1;
    }
  }
  if (rows === 0) console.log('data:coverage: no reports yet (run npm run data:sync).');
}

main();
