// @vitest-environment node
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  API_URL,
  OfflineCacheMissError,
  USER_AGENT,
  WikiApiError,
  WikiClient,
  buildUrl,
  cacheKey,
  clientOptionsFromArgv,
  extractRevisionId,
  getClient,
  getImageInfo,
  getWikitextBatch,
  pageUrl,
  parsePageHtml,
  resolveRedirects,
  searchTitle,
  setClient,
  wikiGet,
  type ClientOptions,
} from '../../../../scripts/wiki/client';

type Reply = { status?: number; body?: unknown; headers?: Record<string, string> } | Error;

/** A fake clock + fetch that records the time and headers of every call. */
function harness(replies: Reply[], opts: ClientOptions = {}) {
  let now = 1_000_000;
  const sleeps: number[] = [];
  const calls: { url: string; at: number; headers: Record<string, string> }[] = [];
  const queue = [...replies];
  const fetchImpl = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({
      url: String(input),
      at: now,
      headers: { ...(init?.headers as Record<string, string>) },
    });
    const reply = queue.shift() ?? { body: {} };
    if (reply instanceof Error) throw reply;
    return new Response(JSON.stringify(reply.body ?? {}), {
      status: reply.status ?? 200,
      headers: reply.headers,
    });
  });
  const client = new WikiClient({
    cacheDir: opts.cacheDir ?? '',
    fetchImpl: fetchImpl as unknown as typeof fetch,
    now: () => now,
    sleep: async (ms) => {
      sleeps.push(ms);
      now += ms;
    },
    ...opts,
  });
  return { client, calls, sleeps, fetchImpl, advance: (ms: number) => (now += ms) };
}

let cacheDir: string;
beforeEach(() => {
  cacheDir = mkdtempSync(path.join(tmpdir(), 'codex-cache-'));
});
afterEach(() => {
  rmSync(cacheDir, { recursive: true, force: true });
  setClient(undefined);
});

describe('buildUrl', () => {
  it('adds the fixed params, sorts keys and drops undefined/false', () => {
    const url = buildUrl({
      titles: 'A|B',
      action: 'query',
      redirects: true,
      skip: undefined,
      no: false,
    });
    expect(url).toBe(
      `${API_URL}?action=query&format=json&formatversion=2&maxlag=5&redirects=1&titles=A%7CB`,
    );
  });

  it('gives the same cache key regardless of param order', () => {
    expect(cacheKey(buildUrl({ a: 1, b: 2 }))).toBe(cacheKey(buildUrl({ b: 2, a: 1 })));
    expect(cacheKey('x')).toMatch(/^[0-9a-f]{40}$/);
  });
});

describe('WikiClient', () => {
  it('sends the bot User-Agent on every request', async () => {
    const h = harness([{ body: { ok: 1 } }, { body: { ok: 2 } }], { cacheDir });
    await h.client.get({ action: 'parse', page: 'A' });
    await h.client.get({ action: 'parse', page: 'B' });
    expect(h.calls).toHaveLength(2);
    for (const call of h.calls) {
      expect(call.headers['User-Agent']).toBe(USER_AGENT);
      expect(call.url).toContain('maxlag=5');
    }
    expect(USER_AGENT).toBe('DungeonsCodexBot/1.0 (fan wiki data sync; non-commercial)');
  });

  it('spaces requests at least 1 s apart, even when fired concurrently', async () => {
    const h = harness([{ body: 1 }, { body: 2 }, { body: 3 }], { cacheDir });
    await Promise.all([
      h.client.get({ page: 'A' }),
      h.client.get({ page: 'B' }),
      h.client.get({ page: 'C' }),
    ]);
    const times = h.calls.map((c) => c.at);
    expect(times[1]! - times[0]!).toBeGreaterThanOrEqual(1000);
    expect(times[2]! - times[1]!).toBeGreaterThanOrEqual(1000);
    expect(h.client.requestCount).toBe(3);
  });

  it('does not wait when the previous request was long enough ago', async () => {
    const h = harness([{ body: 1 }, { body: 2 }], { cacheDir });
    await h.client.get({ page: 'A' });
    h.advance(5000);
    await h.client.get({ page: 'B' });
    expect(h.sleeps).toEqual([]);
  });

  it('writes the cache and serves the next call from it without fetching', async () => {
    const body = { parse: { revid: 42, title: 'A', text: '<p/>' } };
    const h = harness([{ body }], { cacheDir });
    const first = await h.client.get({ action: 'parse', page: 'A' });
    expect(first.fromCache).toBe(false);
    expect(first.revisionId).toBe(42);

    const files = readdirSync(cacheDir);
    expect(files).toHaveLength(1);
    const entry = JSON.parse(readFileSync(path.join(cacheDir, files[0]!), 'utf8'));
    expect(entry).toMatchObject({ url: first.url, revisionId: 42, body });
    expect(entry.fetchedAt).toBe(new Date(1_000_000).toISOString());

    const second = await h.client.get({ action: 'parse', page: 'A' });
    expect(second).toMatchObject({ fromCache: true, body, fetchedAt: entry.fetchedAt });
    expect(h.fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('refresh bypasses the cache and rewrites it', async () => {
    const seed = harness([{ body: { v: 1 } }], { cacheDir });
    await seed.client.get({ page: 'A' });
    const h = harness([{ body: { v: 2 } }], { cacheDir, refresh: true });
    const res = await h.client.get({ page: 'A' });
    expect(res).toMatchObject({ fromCache: false, body: { v: 2 } });
    const again = harness([], { cacheDir });
    expect((await again.client.get({ page: 'A' })).body).toEqual({ v: 2 });
  });

  it('offline mode errors on a cache miss and serves hits', async () => {
    const seed = harness([{ body: { v: 1 } }], { cacheDir });
    await seed.client.get({ page: 'A' });
    const h = harness([], { cacheDir, offline: true });
    expect((await h.client.get({ page: 'A' })).body).toEqual({ v: 1 });
    await expect(h.client.get({ page: 'B' })).rejects.toBeInstanceOf(OfflineCacheMissError);
    expect(h.fetchImpl).not.toHaveBeenCalled();
  });

  it('rejects --refresh together with --offline', () => {
    expect(() => new WikiClient({ refresh: true, offline: true })).toThrow(/exclude/);
  });

  it('ignores an unreadable cache file and refetches', async () => {
    const url = buildUrl({ page: 'A' });
    writeFileSync(path.join(cacheDir, `${cacheKey(url)}.json`), '{not json');
    const h = harness([{ body: { v: 1 } }], { cacheDir });
    expect((await h.client.get({ page: 'A' })).fromCache).toBe(false);
  });

  it('backs off 2/4/8 s on 429 and 503 and then succeeds', async () => {
    const h = harness([{ status: 429 }, { status: 503 }, { status: 502 }, { body: { ok: true } }], {
      cacheDir,
    });
    const res = await h.client.get({ page: 'A' });
    expect(res.body).toEqual({ ok: true });
    // Back-off sleeps (the 1 s spacing is already covered by the back-off).
    expect(h.sleeps).toEqual([2000, 4000, 8000]);
    expect(h.calls).toHaveLength(4);
  });

  it('honours a longer Retry-After header', async () => {
    const h = harness([{ status: 503, headers: { 'Retry-After': '10' } }, { body: 1 }], {
      cacheDir,
    });
    await h.client.get({ page: 'A' });
    expect(h.sleeps).toEqual([10_000]);
  });

  it('retries on a maxlag API error', async () => {
    const h = harness(
      [
        { body: { error: { code: 'maxlag', info: 'Waiting for db: 6 seconds lagged' } } },
        { body: { ok: 1 } },
      ],
      { cacheDir },
    );
    expect((await h.client.get({ page: 'A' })).body).toEqual({ ok: 1 });
    expect(h.sleeps).toEqual([2000]);
  });

  it('retries network errors', async () => {
    const h = harness([new TypeError('fetch failed'), { body: { ok: 1 } }], { cacheDir });
    expect((await h.client.get({ page: 'A' })).body).toEqual({ ok: 1 });
  });

  it('fails after the last back-off (2, 4, 8, 16, 32 s) and does not cache', async () => {
    const log = vi.fn();
    const h = harness(
      Array.from({ length: 6 }, () => ({ status: 500 })),
      { cacheDir, log },
    );
    const error = await h.client.get({ page: 'A' }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(WikiApiError);
    expect((error as WikiApiError).code).toBe('retries-exhausted');
    expect(h.sleeps).toEqual([2000, 4000, 8000, 16000, 32000]);
    expect(h.calls).toHaveLength(6);
    expect(log).toHaveBeenCalledTimes(5);
    expect(readdirSync(cacheDir)).toEqual([]);
  });

  it('throws API errors other than maxlag without retrying', async () => {
    const h = harness(
      [{ body: { error: { code: 'missingtitle', info: "The page doesn't exist." } } }],
      {
        cacheDir,
      },
    );
    await expect(h.client.get({ page: 'Nope' })).rejects.toMatchObject({ code: 'missingtitle' });
    expect(h.calls).toHaveLength(1);
  });

  it('throws on other HTTP errors without retrying', async () => {
    const h = harness([{ status: 404 }], { cacheDir });
    await expect(h.client.get({ page: 'A' })).rejects.toMatchObject({ code: 'http-404' });
  });

  it('keeps the queue alive after a failed request', async () => {
    const h = harness([{ status: 404 }, { body: { ok: 1 } }], { cacheDir });
    await expect(h.client.get({ page: 'A' })).rejects.toThrow();
    expect((await h.client.get({ page: 'B' })).body).toEqual({ ok: 1 });
  });

  it('uses defaults for the real environment', () => {
    const client = new WikiClient();
    expect(client.cacheDir).toBe(path.join(process.cwd(), 'data', 'raw-cache'));
    expect(client.refresh).toBe(false);
    expect(client.offline).toBe(false);
  });

  it('waits with the real timer by default', async () => {
    vi.useFakeTimers();
    try {
      const fetchImpl = vi.fn(async () => new Response('{}'));
      const client = new WikiClient({ cacheDir, fetchImpl: fetchImpl as unknown as typeof fetch });
      await client.get({ page: 'A' });
      const pending = client.get({ page: 'B' });
      await vi.advanceTimersByTimeAsync(1000);
      await pending;
      expect(fetchImpl).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('extractRevisionId', () => {
  it('reads parse and single-page query bodies', () => {
    expect(extractRevisionId({ parse: { revid: 7 } })).toBe(7);
    expect(extractRevisionId({ query: { pages: [{ revisions: [{ revid: 9 }] }] } })).toBe(9);
    expect(extractRevisionId({ query: { pages: [{}, {}] } })).toBeUndefined();
    expect(extractRevisionId({ query: { pages: [{ revisions: [] }] } })).toBeUndefined();
    expect(extractRevisionId(null)).toBeUndefined();
  });
});

describe('CLI flags and the default client', () => {
  it('reads --refresh and --offline', () => {
    expect(clientOptionsFromArgv(['node', 'sync', '--refresh'])).toEqual({
      refresh: true,
      offline: false,
    });
    expect(clientOptionsFromArgv(['node', 'sync', '--offline'])).toEqual({
      refresh: false,
      offline: true,
    });
    expect(clientOptionsFromArgv()).toEqual({ refresh: false, offline: false });
  });

  it('creates one shared client and lets tests replace it', async () => {
    const first = getClient();
    expect(getClient()).toBe(first);
    const h = harness([{ body: { ok: 1 } }], { cacheDir });
    setClient(h.client);
    expect(getClient()).toBe(h.client);
    expect((await wikiGet({ page: 'A' })).body).toEqual({ ok: 1 });
  });

  it('builds wiki page URLs', () => {
    expect(pageUrl("Dungeons:Hunter's Promise")).toBe(
      "https://minecraft.wiki/w/Dungeons:Hunter's_Promise",
    );
    expect(pageUrl('Template:Infobox Dungeons item/doc')).toBe(
      'https://minecraft.wiki/w/Template:Infobox_Dungeons_item/doc',
    );
  });
});

describe('API helpers', () => {
  it('parsePageHtml returns title, revision, html and fetch time', async () => {
    const h = harness(
      [{ body: { parse: { title: 'Dungeons:Claymore', revid: 5, text: '<p>x</p>' } } }],
      {
        cacheDir,
      },
    );
    const page = await parsePageHtml('Dungeons:Claymore', h.client);
    expect(page).toEqual({
      title: 'Dungeons:Claymore',
      revisionId: 5,
      html: '<p>x</p>',
      fetchedAt: new Date(1_000_000).toISOString(),
    });
    expect(h.calls[0]!.url).toContain('action=parse');
    expect(h.calls[0]!.url).toContain('prop=text%7Crevid');
    expect(h.calls[0]!.url).toContain('redirects=1');
  });

  it('getWikitextBatch follows normalization, redirects and continuation', async () => {
    const h = harness(
      [
        {
          body: {
            continue: { rvcontinue: '123', continue: '||' },
            query: {
              normalized: [{ from: 'Dungeons:hunting bow', to: 'Dungeons:Hunting bow' }],
              redirects: [{ from: 'Dungeons:Hunting bow', to: 'Dungeons:Hunting Bow' }],
              pages: [
                {
                  title: 'Dungeons:Hunting Bow',
                  revisions: [{ revid: 11, slots: { main: { content: 'bow' } } }],
                },
                { title: 'Dungeons:Claymore' },
              ],
            },
          },
        },
        {
          body: {
            query: {
              pages: [
                {
                  title: 'Dungeons:Claymore',
                  revisions: [{ revid: 12, slots: { main: { content: 'clay' } } }],
                },
                { title: 'Dungeons:Nope', missing: true },
              ],
            },
          },
        },
      ],
      { cacheDir },
    );
    const pages = await getWikitextBatch(
      ['Dungeons:hunting bow', 'Dungeons:Claymore', 'Dungeons:Nope'],
      h.client,
    );
    expect(pages.get('Dungeons:hunting bow')).toMatchObject({
      title: 'Dungeons:Hunting Bow',
      revisionId: 11,
      wikitext: 'bow',
      missing: false,
    });
    expect(pages.get('Dungeons:Claymore')).toMatchObject({ revisionId: 12, wikitext: 'clay' });
    expect(pages.get('Dungeons:Nope')).toMatchObject({ missing: true, wikitext: undefined });
    expect(h.calls[1]!.url).toContain('rvcontinue=123');
  });

  it('getWikitextBatch splits more than 50 titles into several requests', async () => {
    const titles = Array.from({ length: 51 }, (_, i) => `P${i}`);
    const h = harness([{ body: { query: { pages: [] } } }, { body: { query: { pages: [] } } }], {
      cacheDir,
    });
    const pages = await getWikitextBatch(titles, h.client);
    expect(h.calls).toHaveLength(2);
    expect(decodeURIComponent(h.calls[0]!.url).split('titles=')[1]!.split('|')).toHaveLength(50);
    expect(pages.size).toBe(51);
  });

  it('survives a redirect loop', async () => {
    const h = harness(
      [
        {
          body: {
            query: {
              redirects: [
                { from: 'A', to: 'B' },
                { from: 'B', to: 'A' },
              ],
              pages: [],
            },
          },
        },
      ],
      { cacheDir },
    );
    expect((await resolveRedirects(['A'], h.client)).get('A')).toBe('A');
  });

  it('getImageInfo returns url, size, mime and sha1', async () => {
    const h = harness(
      [
        {
          body: {
            query: {
              pages: [
                {
                  title: 'File:MCD Anchor.png',
                  imageinfo: [
                    {
                      url: 'https://minecraft.wiki/images/MCD_Anchor.png',
                      width: 256,
                      height: 256,
                      mime: 'image/png',
                      sha1: 'abc',
                    },
                  ],
                },
                { title: 'File:Missing.png', missing: true },
              ],
            },
          },
        },
      ],
      { cacheDir },
    );
    const info = await getImageInfo(['File:MCD Anchor.png', 'File:Missing.png'], h.client);
    expect(info.get('File:MCD Anchor.png')).toMatchObject({
      width: 256,
      sha1: 'abc',
      missing: false,
    });
    expect(info.get('File:Missing.png')).toMatchObject({ missing: true, url: undefined });
    expect(h.calls[0]!.url).toContain('iiprop=url%7Csize%7Cmime%7Csha1');
  });

  it('searchTitle lists matching titles across namespaces', async () => {
    const h = harness(
      [{ body: { query: { search: [{ title: 'Dungeons:DLC' }, { title: 'Dungeons:Wiki' }] } } }],
      {
        cacheDir,
      },
    );
    expect(await searchTitle('Dungeons DLC', h.client)).toEqual(['Dungeons:DLC', 'Dungeons:Wiki']);
    expect(h.calls[0]!.url).toContain('srnamespace=*');
    const empty = harness([{ body: {} }], { cacheDir: mkdtempSync(path.join(tmpdir(), 'codex-')) });
    expect(await searchTitle('x', empty.client)).toEqual([]);
  });

  it('resolveRedirects maps each title to its target', async () => {
    const h = harness(
      [
        {
          body: {
            query: {
              redirects: [{ from: 'Dungeons:Bow', to: 'Dungeons:Bow (disambiguation)' }],
              pages: [],
            },
          },
        },
      ],
      { cacheDir },
    );
    const map = await resolveRedirects(['Dungeons:Bow', 'Dungeons:Axe'], h.client);
    expect(map.get('Dungeons:Bow')).toBe('Dungeons:Bow (disambiguation)');
    expect(map.get('Dungeons:Axe')).toBe('Dungeons:Axe');
  });
});
