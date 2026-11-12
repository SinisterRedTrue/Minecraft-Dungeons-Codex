// @vitest-environment node
import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadUnresolvedReferences } from '../../../../scripts/lib/data-files';
import {
  coverageRatio,
  loadReport,
  meetsGate,
  renderMarkdown,
  saveReport,
  type CategoryReport,
  type GameReport,
} from '../../../../scripts/pipeline/report';
import { parseWikiDate } from '../../../../scripts/wiki/dates';

const category = (name: string, extra: Partial<CategoryReport> = {}): CategoryReport => ({
  category: name,
  expected: 100,
  expectedNote: 'page intro: 100',
  parsed: 100,
  valid: 100,
  dropped: [],
  partial: [],
  missingImages: [],
  slugCollisions: [],
  overridesApplied: [],
  overridesUnmatched: [],
  unresolved: [],
  droppedRefs: [],
  notes: [],
  ...extra,
});

describe('coverage gate', () => {
  it('passes at 98 % and fails below', () => {
    expect(coverageRatio({ expected: 50, valid: 49 })).toBe(0.98);
    expect(meetsGate({ expected: 50, valid: 49 })).toBe(true);
    expect(meetsGate({ expected: 100, valid: 97 })).toBe(false);
    expect(meetsGate({ expected: 0, valid: 0 })).toBe(true);
  });
});

describe('coverage report', () => {
  const report: GameReport = {
    game: 'd1',
    categories: {
      locations: category('locations'),
      weapons: category('weapons', {
        valid: 97,
        dropped: [{ name: 'Broken Blade', reason: 'invalid: weaponType: required' }],
        partial: [{ id: 'd1:weapons:katana', missing: ['description'] }],
        unresolved: [
          { value: 'Gift Wrapper', usedBy: ['d1:weapons:claymore'] },
          { value: 'Mystery Place', usedBy: ['d1:weapons:claymore', 'd1:weapons:katana'] },
        ],
      }),
      mobs: category('mobs', {
        unresolved: [{ value: 'Mystery Place', usedBy: ['d1:mobs:creeper'] }],
      }),
    },
  };

  it('renders a table, the gate result and the dropped records', () => {
    const md = renderMarkdown(report);
    expect(md).toContain('| weapons | 100 | 100 | 97 | 97.0 % | ❌ | 1 | 1 |');
    expect(md).toContain('| locations | 100 | 100 | 100 | 100.0 % | ✅ | 0 | 0 |');
    expect(md).toContain('- Broken Blade: invalid: weaponType: required');
    expect(md.endsWith('\n')).toBe(true);
  });

  it('lists unresolved references in the exact format data:validate reads (D-037)', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'codex-report-'));
    saveReport(dir, report);
    expect([...loadUnresolvedReferences(dir, 'd1')].sort()).toEqual([
      'Gift Wrapper',
      'Mystery Place',
    ]);
    const md = renderMarkdown(report);
    // A value used by several categories is one bullet with all its users.
    expect(md).toContain(
      '- `Mystery Place` — used by d1:mobs:creeper, d1:weapons:claymore, d1:weapons:katana',
    );
  });

  it('keeps other categories when one is saved again, in display order', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'codex-report-'));
    saveReport(dir, report);
    const loaded = loadReport(dir, 'd1');
    loaded.categories.armor = category('armor');
    saveReport(dir, loaded);
    expect(Object.keys(loadReport(dir, 'd1').categories)).toEqual([
      'weapons',
      'armor',
      'mobs',
      'locations',
    ]);
    expect(loadReport(mkdtempSync(path.join(os.tmpdir(), 'codex-empty-')), 'd2')).toEqual({
      game: 'd2',
      categories: {},
    });
  });

  it('says so when nothing is unresolved', () => {
    const md = renderMarkdown({ game: 'd1', categories: { weapons: category('weapons') } });
    expect(md).toMatch(/## Unresolved references\n\nNone\./);
  });
});

describe('parseWikiDate', () => {
  it('reads the formats the wiki uses', () => {
    expect(parseWikiDate('July 1, 2020')).toBe('2020-07-01');
    expect(parseWikiDate('December 14th 2021')).toBe('2021-12-14');
    expect(parseWikiDate('1 July 2020')).toBe('2020-07-01');
    expect(parseWikiDate('N/A')).toBeUndefined();
    expect(parseWikiDate('Smarch 4, 2020')).toBeUndefined();
    expect(parseWikiDate('June 40, 2020')).toBeUndefined();
  });
});
