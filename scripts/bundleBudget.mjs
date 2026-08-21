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
import { readFileSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

const DIST = 'dist';

const BUDGETS = {
  // Everything the browser must have before the first authenticated paint:
  // the entry chunk plus every modulepreload the entry declares.
  criticalPathGzipKb: 190,
  // What the service worker downloads on install. Every user pays this on
  // every update, so it is the number that decides how heavy an update feels.
  precacheGzipKb: 545,
  // No single precached chunk should dominate an install.
  largestPrecachedChunkGzipKb: 80,
};

const main = () => {
  const critical = measureCriticalPath();
  const precache = measurePrecache();
  const largest = precache.files[0];

  const results = [
    check('critical path', critical.kb, BUDGETS.criticalPathGzipKb, `${critical.count} files`),
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

const measureCriticalPath = () => {
  const html = readFileSync(join(DIST, 'index.html'), 'utf8');
  const urls = [
    ...html.matchAll(/(?:src|href)="(\/assets\/[^"]+\.(?:js|css))"/g),
  ].map((match) => match[1]);
  const unique = [...new Set(urls)];
  const kb = unique.reduce((sum, url) => sum + gzipKb(join(DIST, url)), 0);

  return { kb, count: unique.length };
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
