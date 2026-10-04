import { useEffect, useRef } from 'react';
import { useAuth } from '@/common/contexts/AuthContext';
import { useFinancialSpace } from '@/common/contexts/FinancialSpaceContext';
import { trackProductEvent } from '@/common/api/productEventService';
import { hasDataSnapshot } from '@/constants/dataCache';

export const useProductMetrics = (
  pathname: string,
  isInitialized: boolean,
): void => {
  const { session } = useAuth();
  const { activeOwnerId } = useFinancialSpace();
  const hasTrackedOpen = useRef(false);
  const hasTrackedToday = useRef(false);
  const initialPath = useRef(pathname);
  const hadSnapshot = useRef(
    hasDataSnapshot(`${session?.user.id ?? ''}:${activeOwnerId}`),
  );

  useEffect(() => {
    if (!session?.user.id || hasTrackedOpen.current) {
      return;
    }

    hasTrackedOpen.current = true;
    trackProductEvent({ name: 'app_opened' });
  }, [session?.user.id]);

  useEffect(() => {
    if (!isInitialized || hasTrackedToday.current) {
      return;
    }
    if (!isTodayPath(initialPath.current)) {
      return;
    }

    hasTrackedToday.current = true;
    trackProductEvent({
      name: 'today_ready',
      durationMs: performance.now(),
      loadKind: resolveLoadKind(hadSnapshot.current),
    });
  }, [isInitialized]);
};

const isTodayPath = (pathname: string): boolean =>
  pathname === '/' || pathname === '/today' || pathname === '/expenses';

const resolveLoadKind = (hasSnapshot: boolean): 'cold' | 'cached' => {
  if (hasSnapshot) {
    return 'cached';
  }

  return 'cold';
};
