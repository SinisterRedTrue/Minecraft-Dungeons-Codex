// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  fileTitleFromSrc,
  parseWikitables,
  parseWikitextTables,
} from '../../../../scripts/wiki/tables';
import { fixture } from './fixtures';

describe('parseWikitables on real pages', () => {
  it('reads the D1 weapon list with heading paths and every column', () => {
    const tables = parseWikitables(fixture('d1-weapon-list.html'));
    const first = tables[0]!;
    expect(first.headingPath).toEqual([
      'Melee weapons',
      'List of melee weapons',
      'Default (and above)',
    ]);
    expect(first.headers).toEqual([
      'Icon',
      'Name Level ID',
      'Group of',
      'Unique',
      'DLC exclusive',
      'Accepts soul enchantments',
      'Properties',
      'Built-in enchantment',
      'Combo length',
      'Obtainable location',
      'Ancient Hunt Runes',
    ]);
    expect(first.className).toContain('wikitable');

    const anchor = first.rows.find((r) => r.byHeader['Name Level ID']!.lines[0] === 'Anchor')!;
    expect(anchor.byHeader.Icon!.images).toEqual(['File:MCD Anchor.png']);
    expect(anchor.byHeader['Name Level ID']!.links).toEqual([
      { title: 'Dungeons:Anchor', text: 'Anchor' },
    ]);
    expect(anchor.byHeader['Group of']!.text).toBe('Anchor');
    expect(anchor.byHeader.Unique!.text).toBe('No');
    expect(anchor.byHeader['Accepts soul enchantments']!.text).toBe('✖');
    expect(anchor.byHeader.Properties!.lines).toEqual([
      'Slow but powerful',
      'Absorbs some knockback',
      'Pulls in enemies',
    ]);
    expect(anchor.byHeader['Built-in enchantment']!.links[0]).toEqual({
      title: 'Dungeons:Gravity',
      text: 'Gravity',
    });
    // Footnote markers in headers are dropped; sprite links merge with their text link.
    expect(anchor.byHeader['Obtainable location']!.links.map((l) => l.text)).toEqual([
      'Abyssal Monument',
      'Radiant Ravine',
      'Vengeful Mariner',
    ]);
    expect(anchor.byHeader['Ancient Hunt Runes']!.images).toEqual([
      'File:DungeonsMiscellaneousSprite rune-t.png',
    ]);
  });

  it('keeps the heading path through h2 > h3 > h4 and resets it at a new h2', () => {
    const paths = parseWikitables(fixture('d1-weapon-list.html')).map((t) =>
      t.headingPath.join(' > '),
    );
    expect(paths).toContain('Melee weapons > List of melee weapons > Unused');
    expect(paths).toContain('Ranged weapons > Bows > List of bows');
    expect(paths).toContain('Ranged weapons > Crossbows > List of crossbows');
    expect(paths.at(-1)).toBe('History');
  });

  it('reads the D2 weapon list (58 melee + 4 unobtainable + 12 bows + 10 crossbows)', () => {
    const tables = parseWikitables(fixture('d2-weapon-list.html'));
    expect(tables.map((t) => [t.headingPath.at(-1), t.rows.length])).toEqual([
      ['List of melee weapons', 58],
      ['Unobtainable', 4],
      ['List of bows', 12],
      ['List of crossbows', 10],
    ]);
    const battlestaff = tables[0]!.rows.find((r) => r.byHeader.Name!.text === 'Battlestaff')!;
    expect(battlestaff.byHeader.Rarity!.lines).toEqual(['COMMON', 'RARE', 'SPECIAL']);
    expect(battlestaff.byHeader['Combo length']!.text).toBe('3');
    expect(battlestaff.byHeader['Drop location']!.links[0]!.title).toBe(
      'Dungeons II:Howling Woods',
    );
  });

  it('reads the D2 talisman list including ✔ cells and list items', () => {
    const [list] = parseWikitables(fixture('d2-talisman-list.html'));
    expect(list!.headers).toEqual([
      'Icon',
      'Name',
      'Passive Bonus',
      'Secret',
      'Boost Type',
      'T1',
      'T2',
      'T3',
      'Location Found',
    ]);
    expect(list!.rows).toHaveLength(24);
    const lens = list!.rows[0]!.byHeader;
    expect(lens.Name!.text).toBe('Amethyst Lens');
    expect(lens.Secret!.text).toBe('✔');
    expect([lens.T1!.text, lens.T2!.text, lens.T3!.text]).toEqual(['10%', '15%', '25%']);
    expect(lens['Location Found']!.lines).toEqual([
      'Reward from The Prime Enchanter Revived',
      'Secret Chest in Howling Woods',
    ]);
  });

  it('finds the item infobox-free stats table on an item page', () => {
    const tables = parseWikitables(fixture('d1-claymore.html'));
    const power = tables.find((t) => t.headers[0] === 'Power')!;
    expect(power.headers).toEqual(['Power', 'Min damage', 'Max damage']);
    expect(power.rows[0]!.cells.map((c) => c.text)).toEqual(['1', '18-19', '32-34']);
  });
});

describe('parseWikitables edge cases', () => {
  const table = (body: string, before = '') =>
    parseWikitables(`${before}<table class="wikitable"><tbody>${body}</tbody></table>`)[0]!;

  it('expands rowspan and colspan', () => {
    const t = table(`
      <tr><th>A</th><th>B</th><th>C</th></tr>
      <tr><td rowspan="2">a1</td><td colspan="2">bc1</td></tr>
      <tr><td>b2</td><td>c2</td></tr>`);
    expect(t.rows.map((r) => r.cells.map((c) => c.text))).toEqual([
      ['a1', 'bc1', 'bc1'],
      ['a1', 'b2', 'c2'],
    ]);
    expect(t.rows[1]!.byHeader.A!.text).toBe('a1');
  });

  it('joins multi-row headers and de-duplicates names', () => {
    const t = table(`
      <tr><th rowspan="2">Name</th><th colspan="2">Tier</th></tr>
      <tr><th>Tier</th><th>Value</th></tr>
      <tr><td>x</td><td>1</td><td>2</td></tr>`);
    expect(t.headers).toEqual(['Name', 'Tier', 'Tier / Value']);
    const dupes = table(
      '<tr><th>X</th><th>X</th><th></th></tr><tr><td>1</td><td>2</td><td>3</td></tr>',
    );
    expect(dupes.headers).toEqual(['X', 'X (2)', 'col3']);
  });

  it('turns <br> and <li> into lines and drops hidden text and footnotes', () => {
    const t = table(`
      <tr><th>T</th></tr>
      <tr><td>One<br>Two<ul><li>Three</li><li>Four <sup class="reference">[1]</sup></li></ul>
        <span style="display:none">hidden</span><span class="sortkey">zz</span></td></tr>`);
    expect(t.rows[0]!.cells[0]!.lines).toEqual(['One', 'Two', 'Three', 'Four']);
    expect(t.rows[0]!.cells[0]!.text).toBe('One\nTwo\nThree\nFour');
  });

  it('reads data-sort-value from the cell or an inner element', () => {
    const t = table(`
      <tr><th>A</th><th>B</th><th>C</th></tr>
      <tr><td data-sort-value="10">ten</td><td><span data-sort-value="2">two</span></td><td>x</td></tr>`);
    expect(t.rows[0]!.cells.map((c) => c.sortValue)).toEqual(['10', '2', undefined]);
  });

  it('treats full-width rows as section labels for the rows below', () => {
    const t = table(`
      <tr><th>A</th><th>B</th></tr>
      <tr><td>plain</td><td>1</td></tr>
      <tr><td colspan="2">Spooky Fall</td></tr>
      <tr><td>Sinister Sword</td><td>2</td></tr>
      <tr><td colspan="2">Chills &amp; Thrills</td></tr>
      <tr><td>Frost Slayer</td><td>3</td></tr>`);
    expect(t.rows.map((r) => [r.cells[0]!.text, r.section])).toEqual([
      ['plain', undefined],
      ['Sinister Sword', 'Spooky Fall'],
      ['Frost Slayer', 'Chills & Thrills'],
    ]);
  });

  it('keeps row-header <th> cells and pads short rows', () => {
    const t = table(
      '<tr><th>A</th><th>B</th></tr><tr><th>Hit 1</th><td>90</td></tr><tr><td>only</td></tr>',
    );
    expect(t.rows[0]!.cells[0]).toMatchObject({ text: 'Hit 1', header: true });
    expect(t.rows[1]!.cells.map((c) => c.text)).toEqual(['only', '']);
  });

  it('collects links (not files or anchors) and images from file links or src', () => {
    const t = table(`
      <tr><th>A</th></tr>
      <tr><td>
        <a href="/w/File:MCD_Anchor.png"><img src="/images/thumb/MCD_Anchor.png/50px-MCD_Anchor.png?1"></a>
        <span title="T"><img src="/images/DungeonsMiscellaneousSprite_rune-t.png?73252"></span>
        <a href="#cite_note-1">[1]</a>
        <a href="/w/Dungeons:Tower">Tower</a>
        <a href="/w/Dungeons:Hidden_Depths" title="Dungeons:Hidden Depths"><img src="/images/x.png"></a>
        <a href="/w/Dungeons:Hidden_Depths" title="Dungeons:Hidden Depths">Hidden Depths</a>
      </td></tr>`);
    const cell = t.rows[0]!.cells[0]!;
    expect(cell.links).toEqual([
      { title: 'Dungeons:Tower', text: 'Tower' },
      { title: 'Dungeons:Hidden Depths', text: 'Hidden Depths' },
    ]);
    expect(cell.images).toEqual([
      'File:MCD Anchor.png',
      'File:DungeonsMiscellaneousSprite rune-t.png',
      'File:X.png'.replace('X', 'x'),
    ]);
  });

  it('skips wikitables nested inside another wikitable', () => {
    const tables = parseWikitables(`
      <h2><span class="mw-headline">Outer</span><span class="mw-editsection">[edit]</span></h2>
      <table class="wikitable"><tr><th>A</th></tr><tr><td>
        <table class="wikitable"><tr><th>Inner</th></tr><tr><td>i</td></tr></table>
      </td></tr></table>`);
    expect(tables).toHaveLength(1);
    expect(tables[0]!.headingPath).toEqual(['Outer']);
  });

  it('handles a table with no rows', () => {
    expect(parseWikitables('<table class="wikitable"></table>')[0]).toMatchObject({
      headers: [],
      rows: [],
    });
  });
});

describe('fileTitleFromSrc', () => {
  it('handles thumbs, originals, hashed paths and junk', () => {
    expect(fileTitleFromSrc('/images/thumb/MCD_Anchor.png/50px-MCD_Anchor.png?398b1')).toBe(
      'File:MCD Anchor.png',
    );
    expect(fileTitleFromSrc('/images/DungeonsLevelSprite_Hidden_Depths.png?61855')).toBe(
      'File:DungeonsLevelSprite Hidden Depths.png',
    );
    expect(fileTitleFromSrc('/images/a/ab/Hunter%27s_Promise.png')).toBe(
      "File:Hunter's Promise.png",
    );
    expect(fileTitleFromSrc('/static/logo.svg')).toBeUndefined();
  });
});

describe('parseWikitextTables', () => {
  it('reads both stats tables of the Claymore page', () => {
    const [hits, power] = parseWikitextTables(fixture('d1-claymore.wiki'));
    expect(hits!.attrs).toBe('class="wikitable sortable"');
    expect(hits!.headers).toEqual([
      'Hit number',
      'Base damage',
      'Attack duration',
      'Area',
      'Splash damage drop off',
      'Knockback',
      'Hitstun',
    ]);
    expect(hits!.rows[2]).toEqual(['Hit 3', '160', '0.8s', '180° infront', '40%', '3', '1']);
    expect(power!.headers).toEqual(['Power', 'Min damage', 'Max damage']);
    expect(power!.rows).toHaveLength(23);
    expect(power!.rows[0]).toEqual(['1', '18-19', '32-34']);
  });

  it('handles inline cells, attributes, pipes in links/templates, captions and continuations', () => {
    const [t] = parseWikitextTables(`text before
{| class="wikitable"
|+ Caption
! A !! B !! style="x" | C
|-
| [[Dungeons:Claymore|Claymore]] || {{DuItemLink|A|b}} || style="text-align:center" | 3
|-
| multi
line cell
| 5 || 6
|}
after`);
    expect(t!.headers).toEqual(['A', 'B', 'C']);
    expect(t!.rows).toEqual([
      ['[[Dungeons:Claymore|Claymore]]', '{{DuItemLink|A|b}}', '3'],
      ['multi\nline cell', '5', '6'],
    ]);
  });

  it('treats header cells after the first row as row headers', () => {
    const [t] = parseWikitextTables('{|\n!H1\n!H2\n|-\n!Row\n|1\n|}');
    expect(t!.rows).toEqual([['Row', '1']]);
  });

  it('ignores an unterminated table', () => {
    expect(parseWikitextTables('{|\n!A\n|-\n|1')).toEqual([]);
  });
});
