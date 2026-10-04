import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const UPSTREAM_URL = 'https://raw.githubusercontent.com/Jeevan-0508/ai-governance-control-room/main/data/frameworks.json';
const DATA_PATH = resolve(ROOT, 'src/data.js');
const PROVENANCE_PATH = resolve(ROOT, 'data/source-provenance.json');
const HISTORY_PATH = resolve(ROOT, 'data/source-history.jsonl');

function stableJson(value) {
  return JSON.stringify(value);
}

function readJson(path) {
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : null;
}

function toRequirement(framework, requirement) {
  const applies = requirement.applies || {};
  return {
    id: requirement.id,
    framework: framework.id,
    frameworkName: framework.name,
    frameworkUrl: framework.url,
    ref: requirement.ref,
    title: requirement.title,
    summary: requirement.summary,
    roles: applies.roles || [],
    tiers: applies.tiers || [],
    ...(applies.conditions ? { conditions: applies.conditions } : {}),
  };
}

async function fetchText(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(45_000), headers: { 'user-agent': 'reg-search-source-monitor/1.0' } });
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  return response.text();
}

const raw = await fetchText(UPSTREAM_URL);
const document = JSON.parse(raw);
if (!Array.isArray(document.frameworks) || document.frameworks.length === 0) {
  throw new Error('upstream frameworks.json has no frameworks array');
}

const requirements = document.frameworks.flatMap((framework) =>
  (framework.requirements || []).map((requirement) => toRequirement(framework, requirement)),
);
const ids = new Set(requirements.map((requirement) => requirement.id));
if (ids.size !== requirements.length) throw new Error('upstream contains duplicate requirement ids');
if (requirements.length === 0) throw new Error('upstream contains no requirements');

// Check every cited framework URL before replacing the local index. A source
// may deny unattended requests (ISO currently returns 403); that is recorded
// as a warning and never treated as permission to replace the cited records.
const officialChecks = new Map();
for (const url of [...new Set(document.frameworks.map((framework) => framework.url).filter(Boolean))]) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(45_000), headers: { 'user-agent': 'reg-search-source-monitor/1.0' } });
    const availability = response.ok ? 'OK' : `HTTP_${response.status}`;
    officialChecks.set(url, availability);
    if (!response.ok) console.warn(`OFFICIAL_SOURCE_WARNING: ${url} -> ${availability}`);
  } catch (error) {
    officialChecks.set(url, 'UNREACHABLE');
    console.warn(`OFFICIAL_SOURCE_WARNING: ${url} -> UNREACHABLE (${error.message})`);
  }
}

const canonicalUpstream = stableJson(document);
const contentHash = createHash('sha256').update(canonicalUpstream).digest('hex');
const previous = readJson(PROVENANCE_PATH);
const changed = previous?.content_hash !== contentHash;
const retrievedAt = changed ? new Date().toISOString() : (previous?.retrieved_at || new Date().toISOString());

const source = `window.REQUIREMENTS = ${JSON.stringify(requirements, null, 2)};\n`;
mkdirSync(dirname(DATA_PATH), { recursive: true });
writeFileSync(DATA_PATH, source, 'utf8');

const provenance = {
  schema_version: '1.0',
  upstream_repository: 'Jeevan-0508/ai-governance-control-room',
  upstream_url: UPSTREAM_URL,
  content_hash: contentHash,
  upstream_updated: document.updated || null,
  retrieved_at: retrievedAt,
  requirement_count: requirements.length,
  official_sources: document.frameworks.map((framework) => ({
    framework: framework.id,
    citation: framework.citation,
    url: framework.url,
    kind: framework.kind,
    availability: officialChecks.get(framework.url) || 'UNCHECKED',
  })),
  note: 'Plain-language records remain cited paraphrases. This sync never rewrites them with generated text.',
};

if (changed) {
  mkdirSync(dirname(PROVENANCE_PATH), { recursive: true });
  writeFileSync(PROVENANCE_PATH, `${JSON.stringify(provenance, null, 2)}\n`, 'utf8');
  appendFileSync(HISTORY_PATH, `${JSON.stringify({
    previous_hash: previous?.content_hash || null,
    current_hash: contentHash,
    retrieved_at: retrievedAt,
    official_sources: provenance.official_sources,
    review_status: 'REVIEW_REQUIRED',
  })}\n`, 'utf8');
  console.log(`SOURCE_CHANGED: synced ${requirements.length} cited requirements; REVIEW_REQUIRED recorded.`);
} else {
  console.log(`NO_CHANGE: ${requirements.length} cited requirements and source hash unchanged.`);
}
