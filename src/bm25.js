/**
 * A from-scratch BM25 ranking implementation over a small, fixed document set.
 * No embeddings, no external model, no network call: the search quality comes entirely from
 * term frequency, inverse document frequency and document-length normalisation, the same three
 * ideas underneath Lucene and Elasticsearch's default ranker.
 *
 * UMD-lite: `module.exports` for `bun test`, `window.BM25` for the browser <script> tag. No bundler.
 */
(function (global) {
  var STOPWORDS = new Set([
    'a','an','and','are','as','at','be','by','for','from','has','have','if','in','into','is','it',
    'its','of','on','or','that','the','their','this','to','was','were','will','with','under',
    'must','shall','may','not','which','who','whom','each','any','all','other','such'
  ]);

  function tokenize(text) {
    if (!text) return [];
    return String(text)
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(function (t) { return t.length > 1 && !STOPWORDS.has(t); });
  }

  /**
   * docs: array of { id, text }. `text` should already be the concatenation of every searchable field.
   * Returns an index BM25.search can query repeatedly without re-tokenizing the corpus.
   */
  function buildIndex(docs) {
    var N = docs.length;
    var docTokens = {};      // id -> string[]
    var termFreq = {};       // id -> { term: count }
    var docFreq = {};        // term -> number of docs containing it
    var totalLength = 0;

    docs.forEach(function (doc) {
      var tokens = tokenize(doc.text);
      docTokens[doc.id] = tokens;
      totalLength += tokens.length;

      var counts = {};
      tokens.forEach(function (t) { counts[t] = (counts[t] || 0) + 1; });
      termFreq[doc.id] = counts;

      Object.keys(counts).forEach(function (t) {
        docFreq[t] = (docFreq[t] || 0) + 1;
      });
    });

    var idf = {};
    Object.keys(docFreq).forEach(function (t) {
      // BM25's standard idf, floored at a small positive number so a term in every document
      // still contributes slightly rather than zeroing out the whole score.
      var raw = Math.log((N - docFreq[t] + 0.5) / (docFreq[t] + 0.5) + 1);
      idf[t] = raw;
    });

    return {
      N: N,
      docTokens: docTokens,
      termFreq: termFreq,
      idf: idf,
      avgDocLength: N ? totalLength / N : 0,
    };
  }

  /**
   * query: raw user string. docs: the same array passed to buildIndex (needed to return full records).
   * k1 controls term-frequency saturation, b controls length normalisation; 1.5 / 0.75 are the
   * values BM25's own literature and most production search engines default to.
   */
  function search(index, docs, query, options) {
    options = options || {};
    var topN = options.topN || 8;
    var k1 = options.k1 != null ? options.k1 : 1.5;
    var b = options.b != null ? options.b : 0.75;

    var queryTerms = tokenize(query);
    if (queryTerms.length === 0) return [];

    var scored = docs.map(function (doc) {
      var counts = index.termFreq[doc.id] || {};
      var docLength = (index.docTokens[doc.id] || []).length;
      var matched = [];
      var contributions = [];
      var score = 0;

      queryTerms.forEach(function (term) {
        var f = counts[term];
        if (!f) return;
        var termIdf = index.idf[term] || 0;
        var denom = f + k1 * (1 - b + b * (docLength / (index.avgDocLength || 1)));
        var termScore = termIdf * ((f * (k1 + 1)) / denom);
        score += termScore;
        matched.push(term);
        // Real per-term contribution, not a display estimate: this is the exact addend that
        // just went into `score` above, so contributions always sum back to it.
        contributions.push({ term: term, idf: termIdf, contribution: termScore });
      });

      contributions.sort(function (x, y) { return y.contribution - x.contribution; });
      return { doc: doc, score: score, matched: matched, contributions: contributions };
    });

    return scored
      .filter(function (r) { return r.score > 0; })
      .sort(function (a, b2) { return b2.score - a.score; })
      .slice(0, topN);
  }

  var BM25 = { tokenize: tokenize, buildIndex: buildIndex, search: search };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = BM25;
  } else {
    global.BM25 = BM25;
  }
})(typeof window !== 'undefined' ? window : globalThis);
