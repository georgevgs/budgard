type AnalyticsReadiness = {
  isInitialized: boolean;
  isHistoryLoaded: boolean;
  isSecondaryLoaded: boolean;
  isPro: boolean;
  requiresForecastData: boolean;
};

// Free analytics is deliberately bounded to the primary recent window. Pro
// charts promise full history, and the forecast additionally consumes the
// deferred schedules and account balances, so neither may render a partial
// answer while those stages are still arriving.
export const isAnalyticsReady = ({
  isInitialized,
  isHistoryLoaded,
  isSecondaryLoaded,
  isPro,
  requiresForecastData,
}: AnalyticsReadiness): boolean => {
  if (!isInitialized) {
    return false;
  }
  if (!isPro) {
    return true;
  }
  if (!isHistoryLoaded) {
    return false;
  }

  return !requiresForecastData || isSecondaryLoaded;
};
