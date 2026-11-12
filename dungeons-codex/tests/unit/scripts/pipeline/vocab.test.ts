// @vitest-environment node
import { mkdtempSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  applyPropertyTags,
  autoTag,
  collectProperties,
  syncEnums,
  syncPropertyVocab,
} from '../../../../scripts/pipeline/vocab';
import type { Ent, GameData } from '../../../../scripts/pipeline/types';

const item = (category: string, name: string, properties: string[], extra = {}): Ent =>
  ({
    id: `d1:${category}:${name}`,
    slug: name,
    category,
    game: 'd1',
    name,
    properties,
    tags: [],
    ...extra,
  }) as Ent;

const tmp = () => mkdtempSync(path.join(os.tmpdir(), 'codex-vocab-'));

describe('autoTag', () => {
  it('drops numbers and signs, so one tag covers every value of an effect', () => {
    expect(autoTag('-40% Artifact Cooldown')).toBe('artifact-cooldown');
    expect(autoTag('+25% melee attack speed')).toBe('melee-attack-speed');
    expect(autoTag('X artifact damage')).toBe('artifact-damage');
    expect(autoTag('Dual wield')).toBe('dual-wield');
    expect(autoTag('100%')).toBe('other');
  });
});

describe('property vocabulary', () => {
  const data = (): GameData => ({
    weapons: [item('weapons', 'daggers', ['Dual wield', 'Fast thrusts'])],
    armor: [item('armor', 'robe', ['-40% Artifact Cooldown', 'Dual wield'])],
    artifacts: [item('artifacts', 'tome', ['Varies'])],
    mobs: [item('mobs', 'creeper', [], { tags: ['undead'] })],
  });

  it('collects every distinct property of weapons, armor and artifacts', () => {
    expect(collectProperties(data())).toEqual([
      '-40% Artifact Cooldown',
      'Dual wield',
      'Fast thrusts',
      'Varies',
    ]);
  });

  it('generates the file the first time and reports nothing unmapped', () => {
    const dir = tmp();
    const result = syncPropertyVocab(dir, 'd1', data());
    expect(result.generated).toBe(true);
    expect(result.vocab['Dual wield']).toBe('dual-wield');
    expect(JSON.parse(readFileSync(path.join(dir, 'd1', 'properties.json'), 'utf8'))).toEqual(
      result.vocab,
    );
  });

  it('does not create an empty file when there is nothing to map', () => {
    const result = syncPropertyVocab(tmp(), 'd1', { weapons: [] });
    expect(result).toEqual({ generated: false, unmapped: [], vocab: {} });
  });

  it('lists properties the existing file does not map', () => {
    const dir = tmp();
    syncPropertyVocab(dir, 'd1', data());
    const more = data();
    more.weapons!.push(item('weapons', 'axe', ['Brand new property']));
    const result = syncPropertyVocab(dir, 'd1', more);
    expect(result.generated).toBe(false);
    expect(result.unmapped).toEqual(['Brand new property']);
  });

  it('applies tags, merges duplicates, and keeps tags a parser already set', () => {
    const vocab = { 'Dual wield': 'dual-wield', 'Fast thrusts': 'combo', Varies: 'other' };
    const d = data();
    d.weapons![0]!.tags = ['seasonal'];
    d.weapons!.push(item('weapons', 'twin', ['Dual wield', 'Dual wield']));
    applyPropertyTags(d, { ...vocab, '-40% Artifact Cooldown': 'artifact-cooldown' });
    expect(d.weapons![0]!.tags).toEqual(['combo', 'dual-wield', 'seasonal']);
    expect(d.weapons![1]!.tags).toEqual(['dual-wield']);
    expect(d.armor![0]!.tags).toEqual(['artifact-cooldown', 'dual-wield']);
    expect(d.artifacts![0]!.tags).toEqual([]); // "other" is not a tag
    expect(d.mobs![0]!.tags).toEqual(['undead']); // not a property-bearing category
  });
});

describe('enum vocabulary', () => {
  it('records the values found and keeps ones already listed', () => {
    const dir = tmp();
    const data: GameData = {
      weapons: [item('weapons', 'a', [], { weaponType: 'claymore' })],
      mobs: [item('mobs', 'b', [], { mobType: 'boss' })],
    };
    const first = syncEnums(dir, 'd1', data);
    expect(first.added.weaponType).toEqual(['claymore']);
    expect(first.enums.mobType).toEqual(['boss']);

    data.weapons!.push(item('weapons', 'c', [], { weaponType: 'katana' }));
    data.mobs = [];
    const second = syncEnums(dir, 'd1', data);
    expect(second.added).toEqual({ weaponType: ['katana'] });
    expect(second.enums.weaponType).toEqual(['claymore', 'katana']);
    expect(second.enums.mobType).toEqual(['boss']);
  });
});
