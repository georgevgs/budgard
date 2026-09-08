import type { DataAction, DataSetters } from '@/common/hooks/data/dataReducer';
import type { TranslateFunction } from '@/constants/translate';
import type { useToast } from '@/common/hooks/useToast';
import { hasDataSnapshot } from '@/constants/dataCache';

type DataFeedback = {
  t: TranslateFunction;
  toast: ReturnType<typeof useToast>['toast'];
};

// Each boot owns its request state. Disposing a session invalidates even
// responses from services that settle after their signal was aborted.
export type DataSession = {
  ownerId: string;
  spaceKey: string;
  setters: DataSetters;
  dispatch: (action: DataAction) => void;
  getFeedback: () => DataFeedback;
  isActive: boolean;
  controller: AbortController | null;
  isFetching: boolean;
  lastFetchAt: number;
  wasAborted: boolean;
  isHydratedFromCache: boolean;
  isHistoryLoaded: boolean;
  isHistoryRequested: boolean;
  historyController: AbortController | null;
  historyLoad: Promise<void> | null;
};

export const createDataSession = (
  ownerId: string,
  spaceKey: string,
  setters: DataSetters,
  dispatch: (action: DataAction) => void,
  getFeedback: () => DataFeedback,
): DataSession => ({
  ownerId,
  spaceKey,
  setters,
  dispatch,
  getFeedback,
  isActive: true,
  controller: null,
  isFetching: false,
  lastFetchAt: 0,
  wasAborted: false,
  isHydratedFromCache: hasDataSnapshot(spaceKey),
  isHistoryLoaded: false,
  isHistoryRequested: false,
  historyController: null,
  historyLoad: null,
});

export const abortDataSession = (session: DataSession): void => {
  if (session.isFetching) {
    session.wasAborted = true;
  }
  session.controller?.abort();
  session.historyController?.abort();
  session.historyLoad = null;
};

export const disposeDataSession = (session: DataSession): void => {
  session.isActive = false;
  abortDataSession(session);
};
