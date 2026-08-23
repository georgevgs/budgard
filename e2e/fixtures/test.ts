import { test as base, expect } from '@playwright/test';
import {
  backend,
  buildDataset,
  mockSupabase,
  seedSession,
  type Dataset,
} from './mockSupabase';

type Fixtures = {
  // The live mock dataset. Mutating it before the first navigation changes
  // what the app boots with; reading it after an action asserts on what the
  // app actually wrote.
  data: Dataset;
  // A page that is already signed in and pointed at the mock backend.
  app: import('@playwright/test').Page;
};

export const test = base.extend<Fixtures>({
  data: async ({}, use) => {
    await use(buildDataset());
  },

  app: async ({ page, data }, use) => {
    backend.reachable = true;
    await mockSupabase(page, data);
    await seedSession(page);
    await use(page);
    backend.reachable = true;
  },
});

// Simulates the server being unreachable — which is what the app's offline
// path actually keys off (isOfflineError), not just navigator.onLine.
export const setBackendReachable = (reachable: boolean): void => {
  backend.reachable = reachable;
};

export { expect };
export { E2E_USER_ID } from './mockSupabase';
