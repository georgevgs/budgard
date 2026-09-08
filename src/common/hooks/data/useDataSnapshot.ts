import { useEffect, useRef } from 'react';
import { toSnapshot, type DataState } from '@/common/hooks/data/dataReducer';
import { saveDataSnapshot } from '@/constants/dataCache';

export const useDataSnapshot = (
  data: DataState,
  spaceKey: string | null,
): void => {
  const persistRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!data.isInitialized || !spaceKey) {
      persistRef.current = null;

      return;
    }
    const persist = () => saveDataSnapshot(spaceKey, toSnapshot(data));
    persistRef.current = persist;
    const timer = setTimeout(persist, 2000);

    return () => {
      clearTimeout(timer);
      persistRef.current = null;
    };
  }, [data, spaceKey]);

  useEffect(() => {
    // Flush the latest committed data before iOS freezes the page, including
    // mutations that have not reached the debounce deadline yet.
    const flushOnHide = () => {
      if (document.visibilityState === 'hidden') {
        persistRef.current?.();
      }
    };
    document.addEventListener('visibilitychange', flushOnHide);

    return () => document.removeEventListener('visibilitychange', flushOnHide);
  }, []);
};
