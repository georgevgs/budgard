#!/usr/bin/env node
// Fails the build when a bundle grows past its budget.
//
// The numbers below are the measured size at the time each budget was set,
// plus roughly 5-8% headroom — they are a ratchet, not an aspiration. When a
// change legitimately needs more room, move the number in the same commit so
// the growth is visible in review rather than discovered months later.
//
// The headroom is deliberate. A budget set flush against the current size
// fails on every addition, and a budget that fails constantly just teaches
// everyone to raise it — which is worse than not having one.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

const DIST = 'dist';

const BUDGETS = {
  // Everything the browser must have before the first authenticated paint:
  // the entry chunk plus every modulepreload the entry declares.
  criticalPathGzipKb: 190,
  // The signed-out first screen: the critical path plus the landing route and
  // the fallback locale. What a visitor arriving from a link pays.
  landingStartupGzipKb: 285,
  // The signed-in first screen: the critical path plus the authenticated
  // shell, the Today route and the fallback locale. This is the number that
  // actually describes a cold start — the critical path above stops at
  // index.html and so misses more than half of it.
  authenticatedStartupGzipKb: 430,
  // What the service worker downloads on install. Every user pays this on
  // every update, so it is the number that decides how heavy an update feels.
  precacheGzipKb: 545,
  // No single precached chunk should dominate an install.
  largestPrecachedChunkGzipKb: 80,
};

const main = () => {
  const entry = measureEntry();
  const landing = measureStartup(entry.urls, ['LandingPage-', 'locale-en-']);
  const authenticated = measureStartup(entry.urls, [
    'AuthenticatedApp-',
    'TodayView-',
    'locale-en-',
  ]);
  const precache = measurePrecache();
  const largest = precache.files[0];

  const results = [
    check('critical path', entry.kb, BUDGETS.criticalPathGzipKb, `${entry.urls.length} files`),
    check('landing startup', landing.kb, BUDGETS.landingStartupGzipKb, `${landing.count} files`),
    check('authenticated startup', authenticated.kb, BUDGETS.authenticatedStartupGzipKb, `${authenticated.count} files`),
    check('precache total', precache.kb, BUDGETS.precacheGzipKb, `${precache.files.length} files`),
    check('largest precached chunk', largest.kb, BUDGETS.largestPrecachedChunkGzipKb, largest.url),
  ];

  const failed = results.filter((result) => !result.ok);
  console.log('');
  if (failed.length > 0) {
    console.error(`✗ ${failed.length} budget(s) exceeded.\n`);
    process.exit(1);
  }
  console.log('✓ All bundle budgets met.\n');
};

// --- Helpers ---

const check = (label, actual, budget, detail) => {
  const ok = actual <= budget;
  const mark = ok ? '✓' : '✗';
  const pct = Math.round((actual / budget) * 100);
  const line = `${mark} ${label.padEnd(26)} ${String(actual.toFixed(1)).padStart(7)} kB / ${String(budget).padStart(4)} kB  (${String(pct).padStart(3)}%)  ${detail}`;
  if (ok) {
    console.log(line);
  } else {
    console.error(line);
  }

  return { ok };
};

const gzipKb = (path) => gzipSync(readFileSync(path)).length / 1024;

const sumGzipKb = (urls) =>
  [...urls].reduce((sum, url) => sum + gzipKb(join(DIST, url)), 0);

const measureEntry = () => {
  const html = readFileSync(join(DIST, 'index.html'), 'utf8');
  const urls = [
    ...html.matchAll(/(?:src|href)="\/(assets\/[^"]+\.(?:js|css))"/g),
  ].map((match) => match[1]);
  const unique = [...new Set(urls)];

  return { kb: sumGzipKb(unique), urls: unique };
};

// A startup budget is the entry plus the chunks the first screen actually
// pulls in — the route, the shell and the locale. index.html alone stops at
// the modulepreloads, which is why the critical-path number understates a
// cold start by more than half; these two make that part visible.
const measureStartup = (entryUrls, prefixes) => {
  const roots = prefixes.flatMap(findChunks);
  const graph = walkStaticImports([...entryUrls, ...roots]);

  return { kb: sumGzipKb(graph), count: graph.size };
};

// Chunk names carry a content hash, so a build-stable prefix is the only way
// to name one. A prefix that matches nothing means the chunk was renamed and
// the budget silently stopped measuring it — fail instead.
const findChunks = (prefix) => {
  const matches = readdirSync(join(DIST, 'assets'))
    .filter((name) => name.startsWith(prefix) && name.endsWith('.js'))
    .map((name) => `assets/${name}`);
  if (matches.length === 0) {
    console.error(`✗ no dist chunk starts with "${prefix}" — rename the budget root.`);
    process.exit(1);
  }

  return matches;
};

// Only static edges: `from"./x.js"` and a bare `import"./x.js"`. A dynamic
// `import("./x.js")` is a later download by definition and would fold every
// lazy route into every other route's budget.
const STATIC_IMPORT = /(?:from|import)\s*"(\.\/[^"]+\.js)"/g;

const walkStaticImports = (roots) => {
  const seen = new Set();
  const pending = [...roots];
  while (pending.length > 0) {
    const url = pending.pop();
    if (seen.has(url)) {
      continue;
    }
    seen.add(url);
    if (!url.endsWith('.js')) {
      continue;
    }
    const source = readFileSync(join(DIST, url), 'utf8');
    for (const match of source.matchAll(STATIC_IMPORT)) {
      pending.push(`assets/${match[1].slice('./'.length)}`);
    }
  }

  return seen;
};

// The generated service worker holds the precache manifest as a list of
// url/revision pairs. Reading it is more honest than re-deriving the glob,
// because globIgnores exclusions (pdfmake, sentry, the OCR runtime) are
// already applied by the time it is written.
const measurePrecache = () => {
  const sw = readFileSync(join(DIST, 'sw.js'), 'utf8');
  const urls = [...new Set([...sw.matchAll(/"(assets\/[^"]+?\.(?:js|css))"/g)].map((m) => m[1]))];
  const files = urls
    .filter((url) => exists(join(DIST, url)))
    .map((url) => ({ url, kb: gzipKb(join(DIST, url)) }))
    .sort((a, b) => b.kb - a.kb);
  const kb = files.reduce((sum, file) => sum + file.kb, 0);

  return { kb, files };
};

const exists = (path) => {
  try {
    statSync(path);

    return true;
  } catch {
    return false;
  }
};

main();
