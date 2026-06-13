import { useEffect, useState } from 'react';
import { offlineQueue, OFFLINE_QUEUE_CHANGED_EVENT } from '@/lib/offlineQueue';

// Reactive count of mutations still waiting to sync. Re-reads on queue changes
// and connectivity transitions — no polling.
export const useOfflineQueueCount = (): number => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let active = true;

    const refresh = (): void => {
      offlineQueue
        .count()
        .then((n) => {
          if (active) {
            setCount(n);
          }
        })
        .catch(() => {
          // IndexedDB unavailable (e.g. private mode) — treat as nothing pending.
          if (active) {
            setCount(0);
          }
        });
    };

    refresh();
    window.addEventListener(OFFLINE_QUEUE_CHANGED_EVENT, refresh);
    window.addEventListener('online', refresh);
    window.addEventListener('offline', refresh);

    return () => {
      active = false;
      window.removeEventListener(OFFLINE_QUEUE_CHANGED_EVENT, refresh);
      window.removeEventListener('online', refresh);
      window.removeEventListener('offline', refresh);
    };
  }, []);

  return count;
};
