/**
 * Polite, cached MediaWiki API client for minecraft.wiki (`[ Plans ]/04-DATA-PIPELINE.md`).
 *
 * - Every request goes through one sequential queue, at most one per `minIntervalMs` (1 s).
 * - Every request carries the bot User-Agent and `maxlag=5`.
 * - 429 / 5xx / network errors / `maxlag` back off 2, 4, 8, 16, 32 s, then fail.
 * - Successful responses are cached as `data/raw-cache/{sha1(url)}.json` = `{url, fetchedAt,
 *   revisionId?, body}`. `refresh` bypasses the cache; `offline` turns a cache miss into an error.
 */
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const API_URL = 'https://minecraft.wiki/api.php';
export const USER_AGENT = 'DungeonsCodexBot/1.0 (fan wiki data sync; non-commercial)';
export const DEFAULT_RETRY_DELAYS_MS = [2000, 4000, 8000, 16000, 32000] as const;
/** The API accepts at most 50 titles per query for normal clients. */
export const BATCH_SIZE = 50;

export type WikiParams = Record<string, string | number | boolean | undefined>;

export interface CacheEntry {
  url: string;
  fetchedAt: string;
  revisionId?: number;
  body: unknown;
}

export interface WikiResponse<T = unknown> {
  url: string;
  fetchedAt: string;
  revisionId?: number;
  body: T;
  fromCache: boolean;
}

export interface ClientOptions {
  cacheDir?: string;
  refresh?: boolean;
  offline?: boolean;
  minIntervalMs?: number;
  retryDelaysMs?: readonly number[];
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  log?: (message: string) => void;
}

export class WikiApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly url: string,
  ) {
    super(`${code}: ${message} (${url})`);
    this.name = 'WikiApiError';
  }
}

export class OfflineCacheMissError extends Error {
  constructor(readonly url: string) {
    super(`Offline mode: no cached response for ${url}`);
    this.name = 'OfflineCacheMissError';
  }
}

/** Builds the API URL with the fixed parameters; keys are sorted so cache keys are stable. */
export function buildUrl(params: WikiParams): string {
  const all: WikiParams = { ...params, format: 'json', formatversion: 2, maxlag: 5 };
  const search = new URLSearchParams();
  for (const key of Object.keys(all).sort()) {
    const value = all[key];
    if (value === undefined || value === false) continue;
    search.set(key, value === true ? '1' : String(value));
  }
  return `${API_URL}?${search.toString()}`;
}

export const cacheKey = (url: string) => createHash('sha1').update(url).digest('hex');

interface ApiErrorBody {
  error?: { code?: string; info?: string };
}

/** Pulls a revision id out of `action=parse` or `action=query&prop=revisions` bodies. */
export function extractRevisionId(body: unknown): number | undefined {
  const b = body as {
    parse?: { revid?: number };
    query?: { pages?: { revisions?: { revid?: number }[] }[] };
  };
  if (typeof b?.parse?.revid === 'number') return b.parse.revid;
  const pages = b?.query?.pages;
  if (pages?.length === 1) {
    const revid = pages[0]?.revisions?.[0]?.revid;
    if (typeof revid === 'number') return revid;
  }
  return undefined;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export class WikiClient {
  readonly cacheDir: string;
  readonly refresh: boolean;
  readonly offline: boolean;
  private readonly minIntervalMs: number;
  private readonly retryDelaysMs: readonly number[];
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly now: () => number;
  private readonly log: (message: string) => void;
  private queue: Promise<unknown> = Promise.resolve();
  private lastRequestAt = Number.NEGATIVE_INFINITY;
  /** Number of HTTP requests actually sent (cache hits excluded). */
  requestCount = 0;

  constructor(opts: ClientOptions = {}) {
    this.cacheDir = opts.cacheDir ?? path.join(process.cwd(), 'data', 'raw-cache');
    this.refresh = opts.refresh ?? false;
    this.offline = opts.offline ?? false;
    this.minIntervalMs = opts.minIntervalMs ?? 1000;
    this.retryDelaysMs = opts.retryDelaysMs ?? DEFAULT_RETRY_DELAYS_MS;
    this.timeoutMs = opts.timeoutMs ?? 30_000;
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.sleep = opts.sleep ?? defaultSleep;
    this.now = opts.now ?? Date.now;
    this.log = opts.log ?? (() => {});
    if (this.refresh && this.offline) throw new Error('--refresh and --offline exclude each other');
  }

  /** GET the API with `params`, from the cache when possible. */
  async get<T = unknown>(params: WikiParams): Promise<WikiResponse<T>> {
    const url = buildUrl(params);
    const file = path.join(this.cacheDir, `${cacheKey(url)}.json`);

    if (!this.refresh) {
      const cached = await readCache(file);
      if (cached) return { ...cached, body: cached.body as T, fromCache: true };
    }
    if (this.offline) throw new OfflineCacheMissError(url);

    const body = await this.enqueue(() => this.fetchWithRetry(url));
    const entry: CacheEntry = { url, fetchedAt: new Date(this.now()).toISOString(), body };
    const revisionId = extractRevisionId(body);
    if (revisionId !== undefined) entry.revisionId = revisionId;
    await mkdir(this.cacheDir, { recursive: true });
    await writeFile(file, JSON.stringify(entry), 'utf8');
    return { ...entry, body: body as T, fromCache: false };
  }

  /** Runs `task` after every earlier task, so requests never overlap. */
  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = this.queue.then(task, task);
    this.queue = run.catch(() => undefined);
    return run;
  }

  private async waitForSlot(): Promise<void> {
    const wait = this.lastRequestAt + this.minIntervalMs - this.now();
    if (wait > 0) await this.sleep(wait);
    this.lastRequestAt = this.now();
  }

  private async fetchWithRetry(url: string): Promise<unknown> {
    for (let attempt = 0; ; attempt++) {
      await this.waitForSlot();
      this.requestCount++;
      let retryReason: string;
      let retryAfterMs = 0;
      try {
        const res = await this.fetchImpl(url, {
          headers: { 'User-Agent': USER_AGENT, 'Api-User-Agent': USER_AGENT },
          signal: AbortSignal.timeout(this.timeoutMs),
        });
        retryAfterMs = parseRetryAfter(res.headers.get('retry-after'));
        if (res.status === 429 || res.status >= 500) {
          retryReason = `HTTP ${res.status}`;
        } else if (!res.ok) {
          throw new WikiApiError(`http-${res.status}`, res.statusText || 'request failed', url);
        } else {
          const body = (await res.json()) as ApiErrorBody;
          const code = body.error?.code;
          if (code === 'maxlag') {
            retryReason = 'maxlag';
          } else if (code) {
            throw new WikiApiError(code, body.error?.info ?? 'API error', url);
          } else {
            return body;
          }
        }
      } catch (error) {
        if (error instanceof WikiApiError) throw error;
        retryReason = error instanceof Error ? error.message : String(error);
      }

      const delay = this.retryDelaysMs[attempt];
      if (delay === undefined) {
        throw new WikiApiError(
          'retries-exhausted',
          `${retryReason} after ${attempt + 1} attempts`,
          url,
        );
      }
      const wait = Math.max(delay, retryAfterMs);
      this.log(`wiki: ${retryReason}, retrying in ${wait / 1000}s (${url})`);
      await this.sleep(wait);
    }
  }
}

function parseRetryAfter(header: string | null): number {
  const seconds = Number(header);
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 0;
}

async function readCache(file: string): Promise<CacheEntry | undefined> {
  try {
    return JSON.parse(await readFile(file, 'utf8')) as CacheEntry;
  } catch {
    return undefined;
  }
}

/* ------------------------------------------------------------------------------------------ */
/* Default client + helpers                                                                    */
/* ------------------------------------------------------------------------------------------ */

/** Reads `--refresh` / `--offline` from a CLI argument list. */
export function clientOptionsFromArgv(argv: readonly string[] = process.argv): ClientOptions {
  return { refresh: argv.includes('--refresh'), offline: argv.includes('--offline') };
}

let defaultClient: WikiClient | undefined;

/** The process-wide client, configured from the CLI flags on first use. */
export function getClient(): WikiClient {
  defaultClient ??= new WikiClient({ ...clientOptionsFromArgv(), log: console.log });
  return defaultClient;
}

export function setClient(client: WikiClient | undefined): void {
  defaultClient = client;
}

export function wikiGet<T = unknown>(params: WikiParams, client = getClient()) {
  return client.get<T>(params);
}

export const pageUrl = (title: string) =>
  `https://minecraft.wiki/w/${encodeURIComponent(title.replace(/ /g, '_')).replace(/%3A/g, ':').replace(/%2F/g, '/')}`;

export interface ParsedPage {
  title: string;
  revisionId: number;
  html: string;
  fetchedAt: string;
}

/** Rendered HTML of a page (follows redirects). */
export async function parsePageHtml(title: string, client = getClient()): Promise<ParsedPage> {
  const res = await client.get<{ parse: { title: string; revid: number; text: string } }>({
    action: 'parse',
    page: title,
    prop: 'text|revid',
    redirects: true,
  });
  return {
    title: res.body.parse.title,
    revisionId: res.body.parse.revid,
    html: res.body.parse.text,
    fetchedAt: res.fetchedAt,
  };
}

export interface WikitextPage {
  /** The title that was asked for. */
  requested: string;
  /** The final title after normalization and redirects. */
  title: string;
  missing: boolean;
  revisionId?: number;
  wikitext?: string;
  fetchedAt: string;
}

interface QueryBody<P> {
  query?: {
    normalized?: { from: string; to: string }[];
    redirects?: { from: string; to: string }[];
    pages?: P[];
  };
  continue?: Record<string, string>;
}

interface RevisionPage {
  title: string;
  missing?: boolean;
  invalid?: boolean;
  revisions?: { revid: number; slots: { main: { content: string } } }[];
}

const chunk = <T>(items: readonly T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
};

/** Follows a title through `normalized` then `redirects` maps. */
function finalTitle(
  title: string,
  normalized: Map<string, string>,
  redirects: Map<string, string>,
): string {
  let t = normalized.get(title) ?? title;
  const seen = new Set<string>();
  while (redirects.has(t) && !seen.has(t)) {
    seen.add(t);
    t = redirects.get(t) ?? t;
  }
  return t;
}

/** Runs a `titles=` query in chunks of 50, following `continue`, and maps requested → page. */
async function queryTitles<P extends { title: string }>(
  titles: readonly string[],
  params: WikiParams,
  client: WikiClient,
): Promise<Map<string, { page: P | undefined; title: string; fetchedAt: string }>> {
  const out = new Map<string, { page: P | undefined; title: string; fetchedAt: string }>();
  for (const group of chunk([...new Set(titles)], BATCH_SIZE)) {
    const normalized = new Map<string, string>();
    const redirects = new Map<string, string>();
    const pages = new Map<string, P>();
    let cont: Record<string, string> | undefined;
    let fetchedAt = '';
    do {
      const res = await client.get<QueryBody<P>>({
        action: 'query',
        titles: group.join('|'),
        redirects: true,
        ...params,
        ...cont,
      });
      fetchedAt ||= res.fetchedAt;
      for (const n of res.body.query?.normalized ?? []) normalized.set(n.from, n.to);
      for (const r of res.body.query?.redirects ?? []) redirects.set(r.from, r.to);
      for (const p of res.body.query?.pages ?? []) {
        // A continued response repeats the page without the parts already sent.
        pages.set(p.title, { ...pages.get(p.title), ...p });
      }
      cont = res.body.continue;
    } while (cont);
    for (const requested of group) {
      const title = finalTitle(requested, normalized, redirects);
      out.set(requested, { page: pages.get(title), title, fetchedAt });
    }
  }
  return out;
}

/** Wikitext + revision id for many pages, 50 titles per request. */
export async function getWikitextBatch(
  titles: readonly string[],
  client = getClient(),
): Promise<Map<string, WikitextPage>> {
  const raw = await queryTitles<RevisionPage>(
    titles,
    { prop: 'revisions', rvprop: 'content|ids', rvslots: 'main' },
    client,
  );
  const out = new Map<string, WikitextPage>();
  for (const [requested, { page, title, fetchedAt }] of raw) {
    const revision = page?.revisions?.[0];
    out.set(requested, {
      requested,
      title,
      missing: !revision,
      revisionId: revision?.revid,
      wikitext: revision?.slots.main.content,
      fetchedAt,
    });
  }
  return out;
}

export interface ImageInfo {
  requested: string;
  title: string;
  missing: boolean;
  url?: string;
  width?: number;
  height?: number;
  mime?: string;
  sha1?: string;
}

interface ImagePage {
  title: string;
  missing?: boolean;
  imageinfo?: { url: string; width: number; height: number; mime: string; sha1: string }[];
}

/** URL, size, MIME type and sha1 of file pages (`File:X.png`), 50 per request. */
export async function getImageInfo(
  fileTitles: readonly string[],
  client = getClient(),
): Promise<Map<string, ImageInfo>> {
  const raw = await queryTitles<ImagePage>(
    fileTitles,
    { prop: 'imageinfo', iiprop: 'url|size|mime|sha1' },
    client,
  );
  const out = new Map<string, ImageInfo>();
  for (const [requested, { page, title }] of raw) {
    const info = page?.imageinfo?.[0];
    out.set(requested, {
      requested,
      title,
      missing: !info,
      url: info?.url,
      width: info?.width,
      height: info?.height,
      mime: info?.mime,
      sha1: info?.sha1,
    });
  }
  return out;
}

/** Full-text title search across all namespaces (used when a list page 404s). */
export async function searchTitle(term: string, client = getClient()): Promise<string[]> {
  const res = await client.get<{ query?: { search?: { title: string }[] } }>({
    action: 'query',
    list: 'search',
    srsearch: term,
    srnamespace: '*',
    srlimit: 10,
  });
  return (res.body.query?.search ?? []).map((hit) => hit.title);
}

/** Maps each title to its redirect target (or to itself / its normalized form). */
export async function resolveRedirects(
  titles: readonly string[],
  client = getClient(),
): Promise<Map<string, string>> {
  const raw = await queryTitles<{ title: string }>(titles, {}, client);
  return new Map([...raw].map(([requested, { title }]) => [requested, title]));
}
