import { useEffect, useRef, useState } from 'react';

/**
 * Returns whether the user is currently online.
 *
 * Uses a debounce on the 'offline' event (3 s) to avoid false positives
 * from brief network blips (e.g. mobile switching towers, PWA background wake).
 * The 'online' event clears the flag immediately.
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const offlineTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function handleOnline() {
      if (offlineTimer.current !== null) {
        clearTimeout(offlineTimer.current);
        offlineTimer.current = null;
      }
      setIsOnline(true);
    }

    function handleOffline() {
      // Debounce: only mark offline if it persists for 3 seconds
      offlineTimer.current = setTimeout(() => {
        setIsOnline(false);
      }, 3000);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (offlineTimer.current !== null) {
        clearTimeout(offlineTimer.current);
      }
    };
  }, []);

  return isOnline;
}
