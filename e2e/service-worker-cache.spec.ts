import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';

const LEGACY_PRIVATE_CACHE_NAME = 'supabase-cache';
const PROBE_URL = 'https://e2e.supabase.co/rest/v1/cache-probe?select=*';

test('never serves an authenticated Supabase response from Cache Storage', async ({
  page,
}) => {
  const generatedWorker = readFileSync(
    path.resolve(import.meta.dirname, '../dist/sw.js'),
    'utf8',
  );
  const routeStart = generatedWorker.indexOf('registerRoute(/^https:');
  const routeEnd = generatedWorker.indexOf(',"GET")', routeStart);
  const supabaseRoute = generatedWorker.slice(routeStart, routeEnd);

  expect(routeStart).toBeGreaterThan(-1);
  expect(routeEnd).toBeGreaterThan(routeStart);
  expect(supabaseRoute).toContain('.NetworkOnly');
  expect(generatedWorker).not.toContain(LEGACY_PRIVATE_CACHE_NAME);

  await seedLegacyPrivateCache(page);
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    )
    .toBe(true);

  const second = await requestProbe(page, 'user-b');
  expect(second.ok).toBe(false);

  const cacheNames = await page.evaluate(() => window.caches.keys());
  expect(cacheNames).not.toContain(LEGACY_PRIVATE_CACHE_NAME);
});

// --- Helpers ---

type ProbeResult = {
  ok: boolean;
};

const seedLegacyPrivateCache = async (
  page: import('@playwright/test').Page,
): Promise<void> => {
  await page.addInitScript(
    async ({ cacheName, url }) => {
      const seedKey = 'budgard-pwa-cache-probe-seeded';
      if (window.sessionStorage.getItem(seedKey)) {

        return;
      }
      window.sessionStorage.setItem(seedKey, 'true');

      const cache = await window.caches.open(cacheName);
      await cache.put(
        url,
        new Response(JSON.stringify({ owner: 'stale-user' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );
    },
    { cacheName: LEGACY_PRIVATE_CACHE_NAME, url: PROBE_URL },
  );
};

const requestProbe = async (
  page: import('@playwright/test').Page,
  userId: string,
): Promise<ProbeResult> =>
  page.evaluate(
    async ({ url, authorization }) => {
      try {
        const response = await fetch(url, {
          headers: { Authorization: authorization },
        });

        return { ok: response.ok };
      } catch {

        return { ok: false };
      }
    },
    { url: PROBE_URL, authorization: `Bearer ${userId}` },
  );
