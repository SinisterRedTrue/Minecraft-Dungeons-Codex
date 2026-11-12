/**
 * `npm run data:sync -- [--game d1|d2|all] [--category <slug>|a,b|all] [--images] [--refresh] [--offline]`
 *
 * Reads minecraft.wiki politely (1 request/second, cached in `data/raw-cache/`), rebuilds
 * `data/generated/{game}/*.json`, the vocab files, the Forge curves and the coverage report.
 * `--images` downloads missing or changed images; `--offline` uses only the cache.
 */
import { isValidGame, type GameId } from '@/config/games';
import { runSync } from './pipeline/run';

function flagValue(argv: readonly string[], name: string): string | undefined {
  const index = argv.indexOf(name);
  const eq = argv.find((a) => a.startsWith(`${name}=`));
  return eq ? eq.slice(name.length + 1) : index >= 0 ? argv[index + 1] : undefined;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const gameArg = flagValue(argv, '--game') ?? 'all';
  if (gameArg !== 'all' && !isValidGame(gameArg)) {
    console.error(`data:sync: --game must be d1, d2 or all (got "${gameArg}")`);
    process.exitCode = 1;
    return;
  }
  const categoryArg = flagValue(argv, '--category') ?? 'all';
  const refresh = argv.includes('--refresh');
  const offline = argv.includes('--offline');
  if (refresh && offline) {
    console.error('data:sync: --refresh and --offline exclude each other');
    process.exitCode = 1;
    return;
  }

  const outcome = await runSync({
    game: gameArg as GameId | 'all',
    categories: categoryArg === 'all' ? 'all' : categoryArg.split(',').map((c) => c.trim()),
    images: argv.includes('--images'),
    client: { refresh, offline },
    log: console.log,
  });

  console.log('');
  for (const line of outcome.summary) console.log(line);
  if (outcome.problems.length) {
    console.error('');
    for (const problem of outcome.problems) console.error(`✖ ${problem}`);
    process.exitCode = 1;
  } else {
    console.log('\ndata:sync: OK');
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
