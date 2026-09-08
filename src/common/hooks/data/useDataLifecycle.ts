import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/common/hooks/useToast';
import type { DataAction, DataSetters } from '@/common/hooks/data/dataReducer';
import {
  createDataSession,
  abortDataSession,
  disposeDataSession,
  type DataSession,
} from '@/common/hooks/data/dataSession';
import { fetchData } from '@/common/hooks/data/dataFetch';
import { loadHistory } from '@/common/hooks/data/dataHistory';
import {
  refreshTransactions,
  refreshAccounts,
  refreshDebts,
} from '@/common/hooks/data/dataRefresh';
import { clearDataSnapshot } from '@/constants/dataCache';

// The mutable session stays in this hook. Helpers receive it only from
// effects or action callbacks; no ref is read or passed to a helper in render.
export const useDataLifecycle = (
  ownerId: string,
  spaceKey: string | null,
  isAuthLoading: boolean,
  setters: DataSetters,
  dispatch: (action: DataAction) => void,
) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const feedbackRef = useRef({ t, toast });
  const sessionRef = useRef<DataSession | null>(null);

  useEffect(() => {
    feedbackRef.current = { t, toast };
  });

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }
    if (!spaceKey) {
      clearDataSnapshot();

      return;
    }
    const session = createDataSession(
      ownerId,
      spaceKey,
      setters,
      dispatch,
      () => feedbackRef.current,
    );
    sessionRef.current = session;
    void fetchData(session);

    return () => {
      disposeDataSession(session);
      sessionRef.current = null;
    };
  }, [isAuthLoading, ownerId, spaceKey, setters, dispatch]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (sessionRef.current) {
        handleVisibilityChange(sessionRef.current);
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () =>
      document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  return useMemo(
    () => ({
      refreshData: () => runForSpace(sessionRef, spaceKey, fetchData),
      loadHistory: () => runForSpace(sessionRef, spaceKey, loadHistory),
      refreshExpenses: () =>
        runForSpace(sessionRef, spaceKey, (session) =>
          refreshTransactions(session, 'expenses'),
        ),
      refreshIncomes: () =>
        runForSpace(sessionRef, spaceKey, (session) =>
          refreshTransactions(session, 'incomes'),
        ),
      refreshAccounts: () => runForSpace(sessionRef, spaceKey, refreshAccounts),
      refreshDebts: () => runForSpace(sessionRef, spaceKey, refreshDebts),
    }),
    [spaceKey],
  );
};

const runForSpace = async (
  sessionRef: { current: DataSession | null },
  spaceKey: string | null,
  run: (session: DataSession) => Promise<void>,
): Promise<void> => {
  // Cached screens can request history in a child effect before the parent's
  // boot effect. Let that commit finish before looking up its session.
  await Promise.resolve();
  const session = sessionRef.current;
  if (session && session.spaceKey === spaceKey) {
    await run(session);
  }
};

const handleVisibilityChange = (session: DataSession): void => {
  if (document.visibilityState === 'hidden') {
    // Own the cancellation before iOS freezes the PWA's network requests.
    abortDataSession(session);

    return;
  }
  if (session.wasAborted || Date.now() - session.lastFetchAt >= 30_000) {
    void fetchData(session);
  }
  if (session.isHistoryRequested && !session.isHistoryLoaded) {
    void loadHistory(session);
  }
};
