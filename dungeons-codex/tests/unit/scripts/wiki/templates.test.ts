// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  extractTemplate,
  extractTemplates,
  findTemplates,
  normalizeTemplateName,
  stripComments,
  stripWikiMarkup,
} from '../../../../scripts/wiki/templates';
import { fixture } from './fixtures';

describe('extractTemplate on real item pages', () => {
  it('reads every Claymore infobox param verbatim', () => {
    const ib = extractTemplate(fixture('d1-claymore.wiki'), 'Infobox Dungeons item')!;
    expect(ib).toMatchObject({
      title: 'Claymore',
      image: 'Claymore (MCD).png',
      type: 'Melee weapon',
      rarity: '* Common\n* Rare',
      stat: 'melee',
      stat1: '11.5',
      stat2: '1',
      stat3: '6.5',
      property: '{{DuMiscSprite|Regular Bullet}} Powerful pushback',
      damagetype: 'Melee',
      variant: 'Broadsword',
      variant4: 'Frost Slayer',
      runes: '{{DuRunes|T}}',
      levelid: 'Claymore',
    });
    expect(ib.description).toMatch(/^A massive sword .* just warrior's hands\.$/);
  });

  it('reads the ranged, armor and unique pages', () => {
    const bow = extractTemplate(fixture('d1-hunting-bow.wiki'), 'infobox_Dungeons_item')!;
    expect([bow.stat, bow.stat1, bow.stat2, bow.stat3]).toEqual(['ranged', '4.2', '3.7', '4.1']);
    expect(bow.property).toBe('{{DuMiscSprite|Regular Bullet}} Pets attack<br/>targeted mobs');

    const katana = extractTemplate(fixture('d1-katana.wiki'), 'Infobox Dungeons item')!;
    expect(katana.combo).toBe('3 hits');
    expect(katana.rarity).toBe('Common<br>Rare');

    const armor = extractTemplate(fixture('d1-champions-armor.wiki'), 'Infobox Dungeons item')!;
    expect(armor.type).toBe('Armor');
    expect(armor.stat).toBeUndefined();

    const unique = extractTemplate(fixture('d1-heartstealer.wiki'), 'Infobox Dungeons item')!;
    expect(unique.rarity).toBe('Unique');
  });

  it('finds the template call inside its own documentation <pre> block', () => {
    const doc = extractTemplate(
      fixture('template-infobox-dungeons-item-doc.wiki'),
      'Infobox Dungeons item',
    )!;
    expect(Object.keys(doc)).toContain('stat3');
  });

  it('skips {{{param}}} references in template source', () => {
    const calls = findTemplates(fixture('template-infobox-dungeons-item.wiki'));
    expect(calls.some((c) => c.name === 'Infobox row')).toBe(true);
    expect(calls.every((c) => !c.name.startsWith('{'))).toBe(true);
  });
});

describe('extractTemplates edge cases', () => {
  it('handles nested templates, piped links and multiline values', () => {
    const text = `{{Box
| a = [[Dungeons:Claymore|the claymore]] and {{DuItemLink|X|y}}
| b = line one
line two
| positional
| {{Inner|1=z}}
| c = <span style="color:red">red</span>
}}`;
    expect(extractTemplate(text, 'box')).toEqual({
      a: '[[Dungeons:Claymore|the claymore]] and {{DuItemLink|X|y}}',
      b: 'line one\nline two',
      1: 'positional',
      2: '{{Inner|1=z}}',
      c: '<span style="color:red">red</span>',
    });
    expect(extractTemplate(text, 'Inner')).toEqual({ 1: 'z' });
  });

  it('returns every call, ignores comments and file captions with links', () => {
    const text = `<!-- {{Item|hidden}} -->{{Item|a}} [[File:A.png|thumb|A [[link|x]] {{Item|b}}]] {{Item|c}}`;
    expect(extractTemplates(text, 'item')).toEqual([{ 1: 'a' }, { 1: 'b' }, { 1: 'c' }]);
    expect(extractTemplate(text, 'Missing')).toBeUndefined();
  });

  it('ignores unterminated and empty-name calls', () => {
    expect(findTemplates('{{Broken|a')).toEqual([]);
    expect(findTemplates('{{|x}}')).toEqual([]);
    expect(findTemplates('{{{1|default}}}')).toEqual([]);
  });

  it('records offsets', () => {
    const [call] = findTemplates('ab{{X}}cd');
    expect(call).toMatchObject({ name: 'X', start: 2, end: 7 });
  });
});

describe('normalizeTemplateName / stripComments', () => {
  it('normalizes prefix, underscores, spacing and first-letter case', () => {
    expect(normalizeTemplateName(' template:infobox_Dungeons  item ')).toBe(
      'Infobox Dungeons item',
    );
  });

  it('removes comments, including an unterminated one', () => {
    expect(stripComments('a<!-- x -->b<!-- open')).toBe('ab');
  });
});

describe('stripWikiMarkup', () => {
  it('renders link templates as their text', () => {
    expect(stripWikiMarkup('{{DuLevelLink|Obsidian Pinnacle}} (DLC)')).toBe(
      'Obsidian Pinnacle (DLC)',
    );
    expect(stripWikiMarkup('{{DuEntityLink|Village Merchant}}')).toBe('Village Merchant');
    expect(stripWikiMarkup('found within {{MCD|mission}}s')).toBe('found within missions');
    expect(stripWikiMarkup("the {{MCD|Master's Bow|master's bow}}")).toBe("the master's bow");
  });

  it('drops sprite and other templates, refs, files and categories', () => {
    expect(stripWikiMarkup('{{DuMiscSprite|Regular Bullet}} Powerful pushback')).toBe(
      'Powerful pushback',
    );
    expect(stripWikiMarkup('Text<ref name="a">note</ref> more<ref name="b" />')).toBe('Text more');
    expect(
      stripWikiMarkup('[[File:A.png|32px]] Added [[Category:X]] [[de:Dungeons:Claymore]]'),
    ).toBe('Added');
  });

  it('turns links into labels and strips namespaces of bare links', () => {
    expect(stripWikiMarkup('[[MCD:Rarity|Rarity]] and [[Dungeons:Tower]] and [[sword]]s')).toBe(
      'Rarity and Tower and swords',
    );
    expect(stripWikiMarkup('[https://example.org Example] [https://bare.org]')).toBe('Example');
  });

  it('handles quotes, <br>, tags, entities, lists and whitespace', () => {
    expect(stripWikiMarkup("''Does not'' accept<br/>'''bold''' &amp; &nbsp;x")).toBe(
      'Does not accept\nbold & x',
    );
    expect(stripWikiMarkup('* Common\n* Rare\n\n<small>tiny</small>')).toBe('Common\nRare\ntiny');
    expect(stripWikiMarkup('<nowiki>{{not}}</nowiki> &#39;ok&#39; &unknown;')).toBe(
      "{{not}} 'ok' &unknown;",
    );
  });

  it('renders template params with their defaults', () => {
    expect(stripWikiMarkup('{{{title|Claymore}}} / {{{x}}}')).toBe('Claymore /');
  });

  it('renders nested link templates from the inside out', () => {
    expect(stripWikiMarkup('{{Nowrap|{{DuItemLink|Frost Slayer}}}}')).toBe('Frost Slayer');
  });
});
