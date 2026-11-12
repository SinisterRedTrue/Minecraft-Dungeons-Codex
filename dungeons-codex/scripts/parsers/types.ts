/**
 * Shapes shared by every parser and by the sync pipeline (`[ Plans ]/04-DATA-PIPELINE.md`).
 *
 * A parser returns *drafts*: entity objects that already have their final field names, plus two
 * internal keys that the pipeline strips before validation:
 *   `_image` the wiki file title of the entity's icon (`File:MCD Claymore.png`)
 *   `_refs`  raw names that the linking pass resolves to ids (locations, enchantments, …)
 */
import type { GameId } from '@/config/games';
import type { WikiClient } from '../wiki/client';

export type Draft = Record<string, unknown> & {
  name: string;
  _image?: string;
  _refs?: Record<string, unknown>;
};

export interface ParseContext {
  game: GameId;
  client: WikiClient;
  log: (message: string) => void;
}

export interface DroppedRecord {
  name: string;
  reason: string;
}

export interface ParseResult {
  category: string;
  drafts: Draft[];
  /** Records the parser had to leave out, with the reason (listed in the coverage report). */
  dropped: DroppedRecord[];
  /** What the source pages say there should be; the coverage gate compares valid/expected. */
  expected: { count: number; note: string };
  /** Free-form remarks for the coverage report (page revisions, skipped sections, …). */
  notes: string[];
}

export type Parser = (ctx: ParseContext) => Promise<ParseResult>;
