import { useCallback, useEffect, useRef, useState } from 'react';
import { dataService } from '@/common/api/dataService';
import { useFinancialSpace } from '@/common/contexts/FinancialSpaceContext';
import { mergeUniqueById } from '@/common/contexts/dataContextHelpers';
import type { Expense } from '@/types/Expense';

type QueueState = {
  ownerId: string;
  status: 'loading' | 'error' | 'ready' | 'loadingMore' | 'moreError';
  items: Expense[];
  count: number;
  nextCursor: Expense | null;
};

type QueueRequest = { ownerId: string; controller: AbortController | null };

const initialState = (ownerId: string): QueueState => ({
  ownerId,
  status: 'loading',
  items: [],
  count: 0,
  nextCursor: null,
});

export const useReviewQueue = () => {
  const { activeOwnerId } = useFinancialSpace();
  const [state, setState] = useState(() => initialState(activeOwnerId));
  const request = useRef<QueueRequest | null>(null);

  const loadPage = useCallback(
    (cursor: Expense | null) => {
      const scope = request.current;
      if (null !== scope && activeOwnerId === scope.ownerId) {
        abortRequest(scope);
        const controller = new AbortController();
        scope.controller = controller;

        return readQueue(activeOwnerId, cursor, controller.signal)
          .then((page) => {
            if (false === controller.signal.aborted) {
              setState((current) => applyPage(current, activeOwnerId, page));
            }
          })
          .catch(() => {
            if (false === controller.signal.aborted) {
              setState((current) => queueError(current, activeOwnerId, cursor));
            }
          });
      } else {
        return Promise.resolve();
      }
    },
    [activeOwnerId],
  );

  useEffect(() => {
    const scope: QueueRequest = { ownerId: activeOwnerId, controller: null };
    request.current = scope;
    void loadPage(null);

    return () => {
      abortRequest(scope);
      request.current = null;
    };
  }, [activeOwnerId, loadPage]);

  const refresh = useCallback(() => {
    const scope = request.current;
    if (null !== scope && activeOwnerId === scope.ownerId) {
      setState(initialState(activeOwnerId));

      return loadPage(null);
    } else {
      return Promise.resolve();
    }
  }, [activeOwnerId, loadPage]);

  const loadMore = () => {
    if (
      activeOwnerId === state.ownerId &&
      null !== state.nextCursor &&
      'loadingMore' !== state.status
    ) {
      setState({ ...state, status: 'loadingMore' });
      void loadPage(state.nextCursor);
    }
  };

  return { ...getActiveQueue(state, activeOwnerId), refresh, loadMore };
};

const getActiveQueue = (state: QueueState, ownerId: string): QueueState => {
  if (ownerId === state.ownerId) {
    return state;
  } else {
    return initialState(ownerId);
  }
};

const readQueue = async (
  ownerId: string,
  cursor: Expense | null,
  signal: AbortSignal,
) => {
  if (null === cursor) {
    const [page, count] = await Promise.all([
      dataService.getPendingReviewPage(ownerId, null, signal),
      dataService.getPendingReviewCount(ownerId, signal),
    ]);

    return { ...page, count };
  } else {
    const page = await dataService.getPendingReviewPage(
      ownerId,
      cursor,
      signal,
    );

    return { ...page, count: null };
  }
};

const applyPage = (
  state: QueueState,
  ownerId: string,
  page: Awaited<ReturnType<typeof readQueue>>,
): QueueState => {
  if (null !== page.count) {
    return { ...page, ownerId, status: 'ready', count: page.count };
  } else {
    return {
      ...state,
      status: 'ready',
      items: mergeUniqueById(state.items, page.items),
      nextCursor: page.nextCursor,
    };
  }
};

const abortRequest = ({ controller }: QueueRequest): void => {
  if (null !== controller) {
    controller.abort();
  }
};

const queueError = (
  state: QueueState,
  ownerId: string,
  cursor: Expense | null,
): QueueState => {
  if (null === cursor) {
    return { ...initialState(ownerId), status: 'error' };
  } else {
    return { ...state, status: 'moreError' };
  }
};
