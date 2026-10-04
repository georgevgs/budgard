import { useEffect, useRef } from 'react';
import { useAuth } from '@/common/contexts/AuthContext';
import { useFinancialSpace } from '@/common/contexts/FinancialSpaceContext';
import { trackProductEvent } from '@/common/api/productEventService';
import type { ProductEventName } from '@/common/api/productEventService';
import { hasDataSnapshot } from '@/constants/dataCache';

export const useProductMetrics = (
  pathname: string,
  isInitialized: boolean,
): void => {
  const { session } = useAuth();
  const { activeOwnerId } = useFinancialSpace();
  const hasTrackedOpen = useRef(false);
  const hasTrackedToday = useRef(false);
  const lastVisit = useRef<string | null>(null);
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
    if (!session?.user.id || !isInitialized || lastVisit.current === pathname) {
      return;
    }
    lastVisit.current = pathname;
    const name = FEATURE_EVENTS[pathname];
    if (name) {
      trackProductEvent({ name });
    }
  }, [pathname, isInitialized, session?.user.id]);

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

const FEATURE_EVENTS: Partial<Record<string, ProductEventName>> = {
  '/activity': 'activity_opened',
  '/trends': 'trends_opened',
  '/plan': 'plan_opened',
  '/networth': 'accounts_opened',
  '/goals': 'goals_opened',
  '/debts': 'debts_opened',
  '/review': 'review_opened',
  '/settings': 'settings_opened',
  '/settings/account': 'settings_opened',
  '/settings/household': 'settings_opened',
  '/settings/imports': 'settings_opened',
  '/settings/connections': 'settings_opened',
  '/settings/preferences': 'settings_opened',
  '/settings/notifications': 'settings_opened',
  '/settings/data': 'settings_opened',
};

const isTodayPath = (pathname: string): boolean =>
  pathname === '/' || pathname === '/today' || pathname === '/expenses';

const resolveLoadKind = (hasSnapshot: boolean): 'cold' | 'cached' => {
  if (hasSnapshot) {
    return 'cached';
  }

  return 'cold';
};
