import {
  addIntegration,
  browserProfilingIntegration,
  replayIntegration,
} from '@sentry/react';

export const initHeavySentryIntegrations = () => {
  // These are the SDK defaults today. They are spelled out so a future default
  // change cannot start recording balances, amounts or receipt images.
  addIntegration(
    replayIntegration({
      maskAllText: true,
      maskAllInputs: true,
      blockAllMedia: true,
    }),
  );
  addIntegration(browserProfilingIntegration());
};
