import { useCallback, useEffect, useRef, useState } from 'react';
import { dataService } from '@/common/api/dataService';
import { useFinancialSpace } from '@/common/contexts/FinancialSpaceContext';
import { mergeUniqueById } from '@/common/contexts/dataContextHelpers';
import type { Expense } from '@/types/Expense';

type QueueState = {
  status: 'loading' | 'error' | 'ready' | 'loadingMore' | 'moreError';
  items: Expense[];
  count: number;
  nextCursor: Expense | null;
};

const INITIAL_STATE: QueueState = {
  status: 'loading',
  items: [],
  count: 0,
  nextCursor: null,
};

export const useReviewQueue = () => {
  const { activeOwnerId } = useFinancialSpace();
  const [state, setState] = useState(INITIAL_STATE);
  const request = useRef<AbortController | null>(null);

  const loadPage = useCallback(
    (cursor: Expense | null) => {
      const previous = request.current;
      if (null !== previous) {
        previous.abort();
      }
      const controller = new AbortController();
      request.current = controller;
      const { signal } = controller;

      return Promise.all([
        dataService.getPendingReviewPage(activeOwnerId, cursor, signal),
        getPageCountOrNull(activeOwnerId, cursor, signal),
      ])
        .then(([page, count]) => {
          if (false === signal.aborted) {
            setState((current) => {
              if (null !== count) {
                return { ...page, count, status: 'ready' };
              } else {
                return {
                  ...page,
                  count: current.count,
                  items: mergeUniqueById(current.items, page.items),
                  status: 'ready',
                };
              }
            });
          }
        })
        .catch(() => {
          if (false === signal.aborted) {
            setState((current) => {
              if (null === cursor) {
                return { ...INITIAL_STATE, status: 'error' };
              } else {
                return { ...current, status: 'moreError' };
              }
            });
          }
        });
    },
    [activeOwnerId],
  );
  const refresh = useCallback(async () => {
    if (null !== request.current) {
      setState(INITIAL_STATE);
      await loadPage(null);
    }
  }, [loadPage]);

  useEffect(() => {
    void loadPage(null);

    return () => {
      const controller = request.current;
      if (null !== controller) {
        controller.abort();
      }
      request.current = null;
    };
  }, [loadPage]);

  const loadMore = () => {
    if (null !== state.nextCursor && 'loadingMore' !== state.status) {
      setState((current) => ({ ...current, status: 'loadingMore' }));
      void loadPage(state.nextCursor);
    }
  };

  return { ...state, refresh, loadMore };
};

const getPageCountOrNull = async (
  ownerId: string,
  cursor: Expense | null,
  signal: AbortSignal,
): Promise<number | null> => {
  if (null === cursor) {
    return dataService.getPendingReviewCount(ownerId, signal);
  } else {
    return null;
  }
};
