import { defineConfig, devices } from '@playwright/test';

// The suite runs against a real production build in `--mode e2e`, which points
// the app at a placeholder Supabase host. Every request to that host is
// intercepted, so these tests are hermetic: no live project, no seeded account,
// no network. Preview rather than dev on purpose — the dev server transforms
// route chunks on first request, which under parallel workers is slow enough to
// look like a product bug, and preview exercises the bundle users actually get.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: Number(process.env.CI ? 1 : 0),
  workers: Number(process.env.CI ? 2 : 4),
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],
  timeout: 30_000,
  expect: { timeout: 7_000 },

  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // The service worker would serve one test's cached shell to the next.
    // Update behaviour is covered by the unit tests around usePwaUpdate.
    serviceWorkers: 'block',
    // The app is mobile-first and the bottom dock only exists at this size.
    ...devices['Pixel 7'],
  },

  projects: [{ name: 'chromium' }],

  webServer: {
    command:
      'bun run vite build --mode e2e && bun run vite preview --mode e2e --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
