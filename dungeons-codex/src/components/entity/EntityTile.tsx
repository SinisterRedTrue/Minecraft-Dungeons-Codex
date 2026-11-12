import Link from 'next/link';
import { RarityFrame, type Rarity } from '@/components/ui/RarityFrame';
import type { EntityRef } from '@/lib/detail/refs';
import { cn } from '@/lib/utils/cn';

const RARITIES: readonly Rarity[] = ['common', 'rare', 'special', 'unique'];

/**
 * A compact linked entity: 48 px framed icon and name. Used where a page lists other entities
 * (set pieces, DLC contents, items found here, drops, built-in enchantments).
 */
export function EntityTile({
  entity,
  note,
  current,
  className,
}: {
  entity: EntityRef;
  /** A small line under the name, e.g. "Level II". */
  note?: string;
  /** The page being viewed (a set piece): shown, not linked. */
  current?: boolean;
  className?: string;
}) {
  const rarity = RARITIES.find((r) => r === entity.rarity);
  const body = (
    <>
      <RarityFrame size={48} rarity={rarity} src={entity.imageSrc} alt="" className="shrink-0" />
      <span className="min-w-0">
        <span className="block truncate text-sm leading-tight font-bold text-text">
          {entity.name}
        </span>
        {note && <span className="block truncate text-xs text-muted">{note}</span>}
      </span>
    </>
  );
  const base = 'flex min-h-14 items-center gap-3 rounded-card border-[1.5px] p-2 pr-3';
  if (current) {
    return (
      <div
        aria-current="page"
        className={cn(base, 'border-accent bg-accent/10', className)}
        title="This page"
      >
        {body}
      </div>
    );
  }
  return (
    <Link
      href={entity.href}
      className={cn(
        base,
        'border-line bg-surface-1 transition-transform duration-150 hover:-translate-y-0.5 hover:border-accent motion-reduce:transition-none motion-reduce:hover:translate-y-0',
        className,
      )}
    >
      {body}
    </Link>
  );
}

/** A responsive list of {@link EntityTile}s. */
export function TileGrid({
  items,
  label,
  className,
}: {
  items: readonly { entity: EntityRef; note?: string; current?: boolean }[];
  label?: string;
  className?: string;
}) {
  if (items.length === 0) return null;
  return (
    <ul
      aria-label={label}
      className={cn('grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3', className)}
    >
      {items.map(({ entity, note, current }) => (
        <li key={entity.id} className="min-w-0">
          <EntityTile
            entity={entity}
            {...(note ? { note } : {})}
            {...(current ? { current } : {})}
          />
        </li>
      ))}
    </ul>
  );
}
