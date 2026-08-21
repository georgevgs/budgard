import { useCallback } from 'react';
import { useDataActions } from '@/contexts/DataContext';
import { useIsMobile } from '@/hooks/useIsMobile';
import {
  usePullToRefresh,
  type PullToRefreshState,
} from '@/hooks/usePullToRefresh';
import { haptics } from '@/lib/haptics';

// Wires the pull gesture to a real refetch. Kept separate from
// usePullToRefresh so that hook stays a pure gesture and can be pointed at
// anything — a page, a list, an account detail sheet.
//
// Mounted once in the app shell rather than per view, so exactly one set of
// document listeners exists no matter how many tabs are alive behind it.
export const usePageRefresh = (isEnabledRoute: boolean): PullToRefreshState => {
  const { refreshData } = useDataActions();
  // Pointer-driven layouts have no pull gesture, and enabling it there would
  // put a non-passive touchmove listener on every desktop session for nothing.
  const isMobile = useIsMobile();

  const onRefresh = useCallback(async () => {
    await refreshData();
    haptics.success();
  }, [refreshData]);

  return usePullToRefresh({ onRefresh, enabled: isMobile && isEnabledRoute });
};
