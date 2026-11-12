import { describe, expect, it } from 'vitest';
import { findRawColors } from '../../../scripts/lib/raw-colors';

describe('findRawColors', () => {
  it('finds 3, 4, 6 and 8 digit hex colours', () => {
    for (const hex of ['#fff', '#ffff', '#3bd16f', '#3bd16f80', '#ABCDEF']) {
      expect(findRawColors(`color: '${hex}';`), hex).toHaveLength(1);
    }
  });

  it('finds colour functions', () => {
    for (const fn of ['rgb(0 0 0)', 'rgba(0,0,0,.5)', 'hsl(10 20% 30%)', 'oklch(0.7 0.1 140)']) {
      expect(findRawColors(`background: ${fn}`), fn).toHaveLength(1);
    }
  });

  it('reports the line number and the trimmed line', () => {
    expect(findRawColors("const a = 1;\n  const b = '#fff';\n")).toEqual([
      { line: 2, text: "const b = '#fff';" },
    ]);
  });

  it('ignores token references, entities, issue-style references and non-colour hashes', () => {
    const clean = [
      'color: var(--accent)',
      'className="bg-surface-1 text-accent"',
      '&#x27; and &#39;',
      'see https://example.com/page#section',
      'item #12 of 40',
      "href={'#main'}",
      'const hash = id#abcde;',
    ];
    for (const line of clean) expect(findRawColors(line), line).toEqual([]);
  });
});
