import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// robots.txt and sitemap.xml are the two files a crawler asks for by name.
// Neither is served by the app, and the SPA catch-all in netlify.toml rewrites
// anything it cannot find to index.html with a 200 — so a missing file does
// not 404, it silently answers with HTML where text/plain or XML was expected.
// That failure is invisible from inside the app, which is why it lived in
// production unnoticed; this test is the thing that would have caught it.
//
// It also classifies every route: a new public page must reach the sitemap,
// and a new authenticated route must reach robots.txt, or the build fails.

const ORIGIN = 'https://budgard.com';

const robots = readFileSync('public/robots.txt', 'utf8');
const sitemap = readFileSync('public/sitemap.xml', 'utf8');

describe('crawler files', () => {
  const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
    (match) => match[1],
  );
  const disallowed = [...robots.matchAll(/^Disallow:\s*(\S+)$/gm)].map(
    (match) => match[1],
  );

  it('points crawlers at the sitemap', () => {
    expect(robots).toContain(`Sitemap: ${ORIGIN}/sitemap.xml`);
  });

  it('lists the landing page', () => {
    expect(sitemapUrls).toContain(`${ORIGIN}/`);
  });

  it('uses the sitemaps.org namespace', () => {
    expect(sitemap).toContain(
      'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    );
  });

  it('gives every sitemap entry an absolute production URL', () => {
    const foreign = sitemapUrls.filter((url) => !url.startsWith(`${ORIGIN}/`));

    expect(foreign).toEqual([]);
  });

  // The real invariant: nothing falls between the two files.
  it('classifies every route as either public or crawler-blocked', () => {
    const unclassified = collectRoutes().filter((route) => {
      if (sitemapUrls.includes(`${ORIGIN}${route}`)) {
        return false;
      }

      return !disallowed.some((prefix) => route.startsWith(prefix));
    });

    expect(unclassified).toEqual([]);
  });

  it('never both lists and blocks the same route', () => {
    const contradictory = sitemapUrls
      .map((url) => url.slice(ORIGIN.length))
      .filter((route) => route !== '/')
      .filter((route) => disallowed.some((prefix) => route.startsWith(prefix)));

    expect(contradictory).toEqual([]);
  });
});

// --- Helpers ---

// Both route definitions keep literal paths in source, so they can be read
// without importing a second list that could drift from the router itself.
const collectRoutes = (): string[] => {
  const sources = [
    'src/App.tsx',
    'src/components/routing/AppRouteTree.tsx',
  ].map((path) => readFileSync(path, 'utf8'));

  const paths = new Set<string>();
  for (const source of sources) {
    for (const match of source.matchAll(
      /(?:path=|path:\s*)['"]([^'"]+)['"]/g,
    )) {
      const route = match[1];
      // `*` is the catch-all redirect, and `/` is the landing page, which is
      // asserted separately above.
      if (route === '*' || route === '/') {
        continue;
      }

      // `/t/:id` is only crawlable as its prefix — a crawler never sees an id.
      paths.add(route.replace(/\/:[^/]+/g, '/'));
    }
  }

  return [...paths];
};
