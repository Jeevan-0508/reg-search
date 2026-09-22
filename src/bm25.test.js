import { describe, expect, test } from 'bun:test';
import { tokenize, buildIndex, search } from './bm25.js';

var docs = [
  { id: 'a', text: 'Providers must ensure a sufficient level of AI literacy among staff.' },
  { id: 'b', text: 'Certain AI practices are prohibited outright including social scoring.' },
  { id: 'c', text: 'A system is high-risk if it is a safety component of a regulated product.' },
  { id: 'd', text: 'Deployers of high-risk systems must maintain human oversight at all times.' },
];

describe('tokenize', function () {
  test('lowercases and strips punctuation', function () {
    expect(tokenize('AI-literacy, Providers!')).toEqual(['ai', 'literacy', 'providers']);
  });

  test('drops stopwords and single characters', function () {
    expect(tokenize('the a of AI')).toEqual(['ai']);
  });

  test('empty or missing text yields an empty array', function () {
    expect(tokenize('')).toEqual([]);
    expect(tokenize(undefined)).toEqual([]);
  });
});

describe('buildIndex', function () {
  test('computes N and a positive average document length', function () {
    var idx = buildIndex(docs);
    expect(idx.N).toBe(4);
    expect(idx.avgDocLength).toBeGreaterThan(0);
  });

  test('idf is higher for a rare term than a term in every document', function () {
    var idx = buildIndex(docs);
    // "high-risk" appears in docs c and d only; "must" appears in a and d.
    // Add a term common to every doc to compare against a genuinely rare one.
    var shared = buildIndex([
      { id: '1', text: 'ai system ai' },
      { id: '2', text: 'ai literacy' },
      { id: '3', text: 'ai oversight' },
    ]);
    expect(shared.idf['ai']).toBeLessThan(shared.idf['literacy'] || 1);
  });
});

describe('search', function () {
  test('ranks the document containing every query term above one containing none', function () {
    var idx = buildIndex(docs);
    var results = search(idx, docs, 'high-risk safety product', { topN: 4 });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].doc.id).toBe('c');
  });

  test('a term appearing in zero documents scores nothing, never throws', function () {
    var idx = buildIndex(docs);
    var results = search(idx, docs, 'quantum entanglement');
    expect(results).toEqual([]);
  });

  test('an empty query returns no results rather than the whole corpus', function () {
    var idx = buildIndex(docs);
    expect(search(idx, docs, '')).toEqual([]);
    expect(search(idx, docs, '   ')).toEqual([]);
  });

  test('every result reports which query terms actually matched', function () {
    var idx = buildIndex(docs);
    var results = search(idx, docs, 'human oversight');
    expect(results[0].matched).toContain('oversight');
    expect(results[0].matched).toContain('human');
  });

  test('respects topN', function () {
    var idx = buildIndex(docs);
    var results = search(idx, docs, 'ai high risk must', { topN: 2 });
    expect(results.length).toBeLessThanOrEqual(2);
  });

  test('scoring is deterministic: same query, same corpus, same order every time', function () {
    var idx = buildIndex(docs);
    var first = search(idx, docs, 'high-risk oversight');
    var second = search(idx, docs, 'high-risk oversight');
    expect(first.map(function (r) { return r.doc.id; })).toEqual(second.map(function (r) { return r.doc.id; }));
  });
});
