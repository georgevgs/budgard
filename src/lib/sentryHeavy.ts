import {
  addIntegration,
  browserProfilingIntegration,
  replayIntegration,
} from '@sentry/react';

export const initHeavySentryIntegrations = () => {
  addIntegration(replayIntegration());
  addIntegration(browserProfilingIntegration());
};
