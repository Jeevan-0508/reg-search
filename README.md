<p align="center"><img src="assets/jk-brand-banner.png" alt="Jeevan Siddhabhaktula — Risk. Governance. AI." width="220"></p>

<div align="center">

# reg-search

**Natural-language search over 56 real, cited requirements across the EU AI Act, GDPR, ISO/IEC 42001
and NIST AI RMF — ranked with a BM25 implementation written from scratch.**
No embeddings. No external model. No API key. No server.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-jeevan--0508.github.io-38bdf8?style=for-the-badge)](https://jeevan-0508.github.io/reg-search/)
[![License](https://img.shields.io/badge/License-MIT-22c55e?style=for-the-badge)](LICENSE)
[![Tests](https://img.shields.io/badge/Tests-14_passing-22c55e?style=for-the-badge)](src/bm25.test.js)
[![Stack](https://img.shields.io/badge/Stack-Vanilla%20JS%20%7C%20Zero%20Deps-818cf8?style=for-the-badge)](#whats-real)

</div>

## How it works

```mermaid
flowchart LR
    subgraph SOURCE["Source of truth"]
        F["ai-governance-control-room
frameworks.json
56 requirements, 4 frameworks"]
    end

    subgraph INDEX["Build once, on page load"]
        D["src/data.js
window.REQUIREMENTS"]
        B1["BM25.buildIndex
tokenize -> term freq -> idf
per requirement's title + summary"]
    end

    subgraph QUERY["Every keystroke"]
        Q["Search box input"]
        T["tokenize query"]
        S["BM25.search
k1=1.5, b=0.75
per-doc score + per-term contribution"]
        R["Ranked results
sorted, filtered by active framework chips"]
        H["Render: badge, ref, title/summary
with matched terms highlighted
and a real per-term score breakdown"]
    end

    F --> D --> B1
    Q --> T --> S
    B1 --> S
    S --> R --> H
```

Everything above the fold runs in one page load: 56 requirements are tokenized and indexed once,
then every keystroke re-scores the same index against the new query. There is nothing to deploy,
nothing to call, and nothing to key in — the honest lexical-search version of the same data model
behind [AI Risk Control Room](https://jeevan-0508.github.io/ai-governance-control-room/).

## Why BM25 and not an embedding model

Every other search-shaped tool on this profile that touches AI reasoning is upfront about calling out
to a model with a key you provide. This one deliberately isn't one of those: it's the search algorithm
underneath Lucene and Elasticsearch's default ranker, built here to understand it rather than call it.
Term frequency, inverse document frequency, and length normalisation are enough to make "human oversight
high-risk systems" surface Article 14 over a GDPR breach-notification clause, and the page shows exactly
which query terms actually matched, not just a bare score.

The honest limit that comes with that choice: it is lexical, not semantic. It will not know that
"automated decision-making" and "algorithmic profiling" are related unless both phrases appear in the
requirement text. A future version could layer a small BYOK embedding call on top for that, the same
pattern already live in [risk-swarm](https://github.com/Jeevan-0508/risk-swarm) and
[shadow-network](https://github.com/Jeevan-0508/shadow-network) — not built here on purpose, so this stays
a clean example of the lexical half on its own.

## What's real

- **56 requirements**, copied from [ai-governance-control-room](https://github.com/Jeevan-0508/ai-governance-control-room)'s
  `data/frameworks.json` — that repo is the source of truth; this one's copy is kept in sync by hand.
- **`src/bm25.js`** — tokenizer, inverted-index-free BM25 scorer (`k1=1.5`, `b=0.75`, the field's own
  standard defaults), 14 tests covering tokenization, idf weighting, ranking order, per-term
  contribution, zero-match queries and determinism.
- **`src/app.js`** — wires the search box, the per-framework filter chips, and result rendering to the
  index, including a real per-term score breakdown next to each result (not an estimate — the exact
  addend that went into that result's BM25 score). No framework, no build step.

## Run it

Open `index.html` directly, no server needed — `data.js` and `bm25.js` are plain scripts, not ES
modules or `fetch()` calls, so this works double-clicked from disk exactly like it does on GitHub Pages.

```
bun test        # 14 tests
```

## Not yet done

- BYOK semantic layer as an optional second ranking pass alongside BM25, so a query with no literal
  term overlap could still surface a conceptually related requirement.
