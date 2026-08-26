import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// The service worker precaches exactly ONE locale — the i18n fallback. Every
// other language is 20-30 kB gzip that most installs never read, and i18n
// already fetches only the detected language at runtime; without the
// globIgnores below, the worker downloads all of them anyway.
//
// This is a build-config invariant, not a runtime one: adding a third locale
// is the moment it silently regresses, because a new `translation.json` gets
// precached by default and the precache budget absorbs it until it doesn't.

const ROOT = path.resolve(import.meta.dirname, '../../..');

const read = (file: string): string =>
  readFileSync(path.join(ROOT, file), 'utf8');

const FALLBACK_LANG = 'en';

describe('locale precache policy', () => {
  it('gives every locale a stable chunk name', () => {
    // Hashed `translation-<hash>.js` names are indistinguishable, so
    // globIgnores could not target one without this.
    const config = read('vite.config.ts');

    expect(config).toContain('locale-${locale[1]}');
    expect(config).toMatch(/src\\\/locales\\\/\(\[a-z\]\{2\}\)/);
  });

  it('precaches only the fallback language', () => {
    const config = read('vite.config.ts');

    expect(config).toContain(`"**/assets/locale-!(${FALLBACK_LANG})-*.js"`);
  });

  it('keeps the deferred locales in a runtime cache so they still work offline', () => {
    // Excluded from precache is not the same as unavailable: the first load in
    // that language fetches it, and CacheFirst keeps it from then on.
    const config = read('vite.config.ts');
    const rule = config.slice(
      config.indexOf('cacheName: "deferred-chunks"') - 600,
      config.indexOf('cacheName: "deferred-chunks"') + 200,
    );

    expect(rule).toContain('locale');
    expect(rule).toContain('CacheFirst');
  });

  it('names the fallback language that i18n actually falls back to', () => {
    // If these two ever disagree, the precached locale is not the one a user
    // with no match gets, and the fallback path costs a network round trip.
    const i18n = read('src/lib/i18n.ts');

    expect(i18n).toContain(`fallbackLng: '${FALLBACK_LANG}'`);
  });

  it('has a locale directory for every supported language', () => {
    const i18n = read('src/lib/i18n.ts');
    const supported = [
      ...i18n.matchAll(/const SUPPORTED = \[([^\]]+)\]/g),
    ][0]?.[1];
    const langs = [...(supported ?? '').matchAll(/'([a-z]{2})'/g)].map(
      (m) => m[1],
    );
    const dirs = readdirSync(path.join(ROOT, 'src/locales'));

    expect(langs.length).toBeGreaterThan(0);
    expect(langs).toContain(FALLBACK_LANG);
    for (const lang of langs) {
      expect(dirs).toContain(lang);
    }
  });
});
