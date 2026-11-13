import { IDS } from './helpers';
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { db, reseed } from '../src/models/store';
import { fallbackParse, validateGraniteLines } from '../src/services/parser';

const supplier = (id: string) => db.suppliers.find((s) => s.id === id)!;
const simple = (lines: { sku: string; qty: number }[]) => lines.map((l) => [l.sku, l.qty]);

describe('fallback parser', () => {
  beforeEach(() => reseed());

  const cases: [string, string, [string, number][]][] = [
    [IDS.detroit, '3 cases of 8 oz cups and 3 gallons of cleaner', [['CUPS8-CS', 3], ['CLEANER-GL', 3]]],
    [IDS.detroit, '2 cases Bounty + some napkins', [['PTOWEL-CS', 2], ['NAPKIN-CS', 1]]],
    [IDS.detroit, 'a dozen napkins, two towels', [['NAPKIN-CS', 12], ['PTOWEL-CS', 2]]],
    [IDS.detroit, '2 cups and 3 cups', [['CUPS8-CS', 5]]],
    [IDS.detroit, 'need 3 cases towels and 2 gallons cleaner', [['PTOWEL-CS', 3], ['CLEANER-GL', 2]]],
    [IDS.detroit, 'PAPER TOWELS x 4\nCleaner: 2', [['PTOWEL-CS', 4], ['CLEANER-GL', 2]]],
    [IDS.grLumber, '60 2x4s and 10 sheets of 3/4 plywood', [['STUD2X4-8', 60], ['PLY34-4X8', 10]]],
    [IDS.grLumber, '5 osb sheets', [['OSB716-4X8', 5]]],
    [IDS.grLumber, '3/4 plywood', [['PLY34-4X8', 1]]],
    [IDS.lansing, '20 bags corn feed, 5 fertilizer', [['FEED-CORN-50', 20], ['FERT-10-10-10', 5]]],
  ];
  for (const [sup, text, want] of cases) {
    it(`parses "${text.replace(/\n/g, ' / ')}"`, () => {
      assert.deepEqual(simple(fallbackParse(text, supplier(sup))), want);
    });
  }

  it('returns nothing for text with no catalog items', () => {
    assert.deepEqual(fallbackParse('hello world, how are you', supplier(IDS.detroit)), []);
  });

  it('does not match short aliases inside other words', () => {
    // "pt" is a paper-towel alias; it must not fire inside "receipt".
    assert.deepEqual(fallbackParse('2 receipts', supplier(IDS.detroit)), []);
  });

  it('prices each line at the tier its own quantity reaches', () => {
    const [line] = fallbackParse('6 cases paper towels', supplier(IDS.detroit));
    assert.equal(line.soloUnitPrice, 19.5);
    const [few] = fallbackParse('2 cases paper towels', supplier(IDS.detroit));
    assert.equal(few.soloUnitPrice, 22);
  });
});

describe('Granite line validation', () => {
  beforeEach(() => reseed());

  it('keeps only catalog SKUs with positive quantities and merges duplicates', () => {
    const lines = validateGraniteLines(
      [
        { sku: 'PTOWEL-CS', qty: 2 },
        { sku: 'PTOWEL-CS', qty: '1' },
        { sku: 'NOT-A-SKU', qty: 4 },
        { sku: 'NAPKIN-CS', qty: 0 },
        { sku: 'CUPS8-CS', qty: -3 },
        { sku: 'CLEANER-GL', qty: 'lots' },
        null,
        'junk',
      ],
      supplier(IDS.detroit),
    );
    assert.deepEqual(simple(lines), [['PTOWEL-CS', 3]]);
  });

  it('rejects non-array replies', () => {
    assert.deepEqual(validateGraniteLines({ sku: 'PTOWEL-CS', qty: 1 }, supplier(IDS.detroit)), []);
    assert.deepEqual(validateGraniteLines(null, supplier(IDS.detroit)), []);
  });
});
