import { useEffect } from 'react';
import { useDataActions, useDataConfig } from '@/contexts/DataContext';

// Full transaction history is intentionally absent from the boot path. A
// screen opts in only when its current state can reach beyond the recent
// window; the data layer deduplicates concurrent requests across consumers.
export const useOnDemandHistory = (required: boolean): void => {
  const { loadHistory } = useDataActions();
  const { isInitialized, isHistoryLoaded } = useDataConfig();

  useEffect(() => {
    if (!required || !isInitialized || isHistoryLoaded) {
      return;
    }

    void loadHistory();
  }, [required, isInitialized, isHistoryLoaded, loadHistory]);
};
