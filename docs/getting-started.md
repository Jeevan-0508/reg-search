# Getting started

`reg-search` is a small, static search instrument over 56 cited requirements from the EU AI Act, GDPR, ISO/IEC 42001 and NIST AI RMF. It uses a from-scratch BM25 index in the browser, so there is no API key, server or external model.

## Try it

Open the [live search tool](https://jeevan-0508.github.io/reg-search/). Enter a plain-language question, filter by framework, and open a result to inspect its source reference and per-term score contribution.

## Run the checks

The app is static. Serve it over HTTP for local development, then run the dependency-free Bun tests:

```bash
python3 -m http.server 4173
bun test
```

Open <http://localhost:4173/> in the browser.

## Source boundary

The requirement records are copied from the portfolio's governance model and retain citations. Search ranking helps discovery; it does not interpret law, determine compliance or replace reading the linked source text.
