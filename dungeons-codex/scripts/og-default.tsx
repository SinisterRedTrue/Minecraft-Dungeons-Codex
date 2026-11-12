/**
 * Renders public/brand/og-default.png (1200x630) with next/og (satori). Run once and commit the PNG:
 *   npx tsx scripts/og-default.tsx
 * Needs network access the first time to download Rubik Black from Google Fonts (cached in
 * data/raw-cache, which is gitignored). All artwork is original: the same emerald gem and open book
 * as public/brand/logo.svg, drawn with plain shapes.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { ImageResponse } from 'next/og';

const OUT = resolve('public/brand/og-default.png');
const FONT_CACHE = resolve('data/raw-cache/Rubik-Black.ttf');

async function rubikBlack(): Promise<ArrayBuffer> {
  if (existsSync(FONT_CACHE)) {
    const buf = await readFile(FONT_CACHE);
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  }
  // No browser User-Agent: Google then serves a TrueType URL, which satori can read (it cannot read WOFF2).
  const css = await (
    await fetch('https://fonts.googleapis.com/css2?family=Rubik:wght@900', {
      headers: { 'User-Agent': 'dungeons-codex-brand-script' },
    })
  ).text();
  const url = /src:\s*url\(([^)]+)\)/.exec(css)?.[1];
  if (!url) throw new Error('Could not find the Rubik font URL in the Google Fonts CSS');
  const data = await (await fetch(url)).arrayBuffer();
  await mkdir(dirname(FONT_CACHE), { recursive: true });
  await writeFile(FONT_CACHE, Buffer.from(data));
  return data;
}

function Gem() {
  // Facets mirror logo.svg; a 64x64 box scaled up.
  return (
    <svg width="320" height="320" viewBox="0 0 64 64">
      <path d="M3 43q14-5 29 2 15-7 29-2v12q-14-5-29 2-15-7-29-2Z" fill="#5c3a00" />
      <path d="M6 42q13-4 25 2v10q-12-5-25-2Zm52 0q-13-4-25 2v10q12-5 25-2Z" fill="#f4e7cb" />
      <path d="M31 44h2v12h-2Z" fill="#c77206" />
      <path d="M22 6h20l-6 11H28Z" fill="#6ee79a" />
      <path d="M14 17 22 6l6 11Z" fill="#3bd16f" />
      <path d="m50 17-8-11-6 11Z" fill="#22a653" />
      <path d="m14 17 14 0 4 21Z" fill="#22a653" />
      <path d="M28 17h8l-4 21Z" fill="#3bd16f" />
      <path d="m36 17 14 0-18 21Z" fill="#157a3a" />
      <path d="M25 9h4l-2 3Z" fill="#ffd056" />
    </svg>
  );
}

async function main() {
  const font = await rubikBlack();
  const image = new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 56,
        background: 'linear-gradient(160deg, #1a1206 0%, #0f0d0b 70%)',
        fontFamily: 'Rubik',
      }}
    >
      <Gem />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div
          style={{
            display: 'flex',
            fontSize: 104,
            color: '#f4ebdd',
            textShadow: '0 6px 0 #157a3a',
          }}
        >
          DUNGEONS
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 104,
            color: '#6ee79a',
            textShadow: '0 6px 0 #157a3a',
          }}
        >
          CODEX
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 30,
            color: '#b7a890',
            marginTop: 12,
            fontWeight: 400,
          }}
        >
          Unofficial fan wiki for Minecraft Dungeons I & II
        </div>
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      fonts: [{ name: 'Rubik', data: font, weight: 900, style: 'normal' }],
    },
  );
  await writeFile(OUT, Buffer.from(await image.arrayBuffer()));
  console.log(`wrote ${OUT}`);
}

void main();
