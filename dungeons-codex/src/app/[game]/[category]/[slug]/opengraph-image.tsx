import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';
import sharp from 'sharp';
import { getCategoryConfig } from '@/config/categories';
import { GAMES, allGameCategories, isValidCategory, isValidGame } from '@/config/games';
import { getAll, getBySlug } from '@/lib/data';
import { humanize } from '@/lib/filters/tokens';
import type { Entity } from '@/lib/schemas';

export const dynamicParams = false;

/** Same params as the page, so every card is rendered once at build time (static, not on demand). */
export function generateStaticParams() {
  return allGameCategories().flatMap(({ game, category }) =>
    (getAll(game, category as never) as unknown as Entity[]).map((entity) => ({
      game,
      category,
      slug: entity.slug,
    })),
  );
}

export const alt = 'Dungeons Codex entry';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** Frame colours: the rarity tokens of `styles/tokens.css` (dark theme; satori cannot read CSS variables). */
const RARITY: Record<string, string> = {
  common: '#b8b8b8',
  rare: '#45b5ff',
  special: '#c07bff',
  unique: '#ff9f1c',
};

/** The icon as a PNG data URI, scaled up without smoothing (satori cannot read WebP). */
async function iconDataUri(src: string | undefined): Promise<string | undefined> {
  if (!src) return undefined;
  try {
    const file = path.join(process.cwd(), 'public', src);
    const png = await sharp(await readFile(file))
      .resize(300, 300, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
        kernel: 'nearest',
      })
      .png()
      .toBuffer();
    return `data:image/png;base64,${png.toString('base64')}`;
  } catch {
    return undefined; // a missing icon leaves an empty frame, never a failed build
  }
}

export default async function Image({
  params,
}: {
  params: Promise<{ game: string; category: string; slug: string }>;
}) {
  const { game, category, slug } = await params;
  const entity =
    isValidGame(game) && isValidCategory(game, category)
      ? (getBySlug(game, category as never, slug) as unknown as Entity | undefined)
      : undefined;
  const label = isValidGame(game) ? getCategoryConfig(game, category)?.label : undefined;
  const gameName = isValidGame(game) ? GAMES[game].name : 'Dungeons Codex';
  const name = entity?.name ?? 'Dungeons Codex';
  const color = RARITY[entity?.rarity ?? 'common'] ?? '#b8b8b8';
  const icon = await iconDataUri(entity?.image?.src);

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 64,
        padding: '0 80px',
        background: 'linear-gradient(160deg, #1a1206 0%, #0f0d0b 70%)',
        color: '#f4ebdd',
      }}
    >
      <div
        style={{
          width: 380,
          height: 380,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: `8px solid ${color}`,
          borderRadius: 36,
          background: '#17120d',
          boxShadow: `0 0 80px ${color}55`,
          flexShrink: 0,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- satori (next/og) renders plain <img>; next/image does not apply */}
        {icon && <img src={icon} width={300} height={300} alt="" />}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
        <div style={{ display: 'flex', fontSize: 28, color: '#cdbfa6' }}>
          {`${label ?? ''}${label ? ' · ' : ''}${gameName}`}
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: name.length > 22 ? 64 : 84,
            fontWeight: 900,
            lineHeight: 1.05,
          }}
        >
          {name}
        </div>
        {entity?.rarity && (
          <div style={{ display: 'flex', fontSize: 30, color }}>{humanize(entity.rarity)}</div>
        )}
        <div
          style={{
            display: 'flex',
            marginTop: 24,
            fontSize: 30,
            fontWeight: 900,
            color: '#3bd16f',
          }}
        >
          DUNGEONS CODEX
        </div>
      </div>
    </div>,
    { ...size },
  );
}
