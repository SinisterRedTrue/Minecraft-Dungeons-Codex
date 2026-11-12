/**
 * A WikiClient wired to saved pages instead of the network, so a parser's `parse(ctx)` can run
 * end to end on real fixtures. Requests it cannot answer behave like missing pages.
 */
import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { WikiClient } from '../../../../scripts/wiki/client';
import type { ParseContext } from '../../../../scripts/parsers/types';

export interface FakePage {
  /** Final title, e.g. `Dungeons:Claymore`. */
  title: string;
  revid?: number;
  html?: string;
  wikitext?: string;
  /** Other titles that redirect here (`Dungeons:DLC`). */
  aliases?: string[];
}

export interface FakeFile {
  /** `File:MCD Claymore.png` */
  title: string;
  /** The bytes served at `https://files.test/{name}`. */
  data: Buffer;
  sha1: string;
  width: number;
  height: number;
}

const norm = (title: string) => title.replace(/_/g, ' ').trim();

export function fakeClient(pages: FakePage[], files: FakeFile[] = []): WikiClient {
  const fileByTitle = new Map(files.map((f) => [norm(f.title), f]));
  const fileUrl = (f: FakeFile) => `https://files.test/${encodeURIComponent(f.title)}`;
  const byTitle = new Map<string, FakePage>();
  for (const page of pages) {
    byTitle.set(norm(page.title), page);
    for (const alias of page.aliases ?? []) byTitle.set(norm(alias), page);
  }
  const json = (body: unknown) =>
    Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));

  const fetchImpl = ((input: RequestInfo | URL) => {
    const url = new URL(String(input));
    const q = url.searchParams;
    if (url.hostname === 'files.test') {
      const file = files.find((f) => fileUrl(f) === url.href);
      return Promise.resolve(
        file
          ? new Response(new Uint8Array(file.data), { status: 200 })
          : new Response('nope', { status: 404, statusText: 'Not Found' }),
      );
    }
    if (q.get('prop') === 'imageinfo') {
      const titles = (q.get('titles') ?? '').split('|').filter(Boolean);
      return json({
        query: {
          pages: titles.map((t) => {
            const file = fileByTitle.get(norm(t));
            if (!file) return { title: norm(t), missing: true };
            return {
              title: file.title,
              imageinfo: [
                {
                  url: fileUrl(file),
                  width: file.width,
                  height: file.height,
                  mime: 'image/png',
                  sha1: file.sha1,
                },
              ],
            };
          }),
        },
      });
    }
    if (q.get('action') === 'parse') {
      const page = byTitle.get(norm(q.get('page') ?? ''));
      if (!page?.html) return json({ error: { code: 'missingtitle', info: 'no such page' } });
      return json({ parse: { title: page.title, revid: page.revid ?? 1, text: page.html } });
    }
    const titles = (q.get('titles') ?? '').split('|').filter(Boolean);
    return json({
      query: {
        redirects: titles
          .map((t) => ({ from: t, to: byTitle.get(norm(t))?.title }))
          .filter((r) => r.to && norm(r.to) !== norm(r.from)),
        pages: titles.map((t) => {
          const page = byTitle.get(norm(t));
          if (!page?.wikitext) return { title: norm(t), missing: true };
          return {
            title: page.title,
            revisions: [{ revid: page.revid ?? 1, slots: { main: { content: page.wikitext } } }],
          };
        }),
      },
    });
  }) as typeof fetch;

  return new WikiClient({
    cacheDir: mkdtempSync(path.join(os.tmpdir(), 'codex-fake-wiki-')),
    fetchImpl,
    minIntervalMs: 0,
    retryDelaysMs: [],
    sleep: () => Promise.resolve(),
  });
}

export function fakeContext(pages: FakePage[]): ParseContext {
  return { game: 'd1', client: fakeClient(pages), log: () => {} };
}
