import { useEffect, useRef, useState } from 'react';
import * as Sentry from '@/lib/sentry';
import { getReceiptUrl } from '@/services/receiptService';

// Loads a signed receipt URL when `enabled` is true. Keeps service access
// out of the view layer per the architecture rule.
export type UseReceiptUrlResult = {
  url: string | null;
  isLoading: boolean;
  error: boolean;
}

export const useReceiptUrl = (
  receiptPath: string,
  enabled: boolean,
): UseReceiptUrlResult => {
  const [loaded, setLoaded] = useState<LoadedReceipt | null>(null);
  // Keep the current URL out of the effect deps — re-running on every URL
  // change would tear down the very URL we just created.
  const urlRef = useRef<string | null>(null);

  const requestKey = receiptPath;

  // The object URL is revoked on disable, so the settled result is invalid
  // once the viewer closes — drop it or a reopen would render a dead URL.
  if (!enabled && loaded !== null) {
    setLoaded(null);
  }

  useEffect(() => {
    urlRef.current = loaded?.url ?? null;
  }, [loaded]);

  useEffect(() => {
    if (!enabled) {
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
      }

      return;
    }

    let cancelled = false;

    getReceiptUrl(receiptPath)
      .then((next) => {
        if (cancelled) {
          return;
        }
        setLoaded({ key: receiptPath, url: next, error: false });
      })
      .catch((err) => {
        Sentry.captureException(err, { tags: { operation: 'getReceiptUrl' } });
        if (cancelled) {
          return;
        }
        setLoaded({ key: receiptPath, url: null, error: true });
      });

    return () => {
      cancelled = true;
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
      }
    };
  }, [enabled, receiptPath]);

  const url = resolveUrl(enabled, loaded, requestKey);
  const error = resolveError(enabled, loaded, requestKey);
  const isLoading = enabled && (loaded === null || loaded.key !== requestKey);

  return { url, isLoading, error };
};

// --- Helpers ---

type LoadedReceipt = {
  key: string;
  url: string | null;
  error: boolean;
};

const resolveUrl = (
  enabled: boolean,
  loaded: LoadedReceipt | null,
  requestKey: string,
): string | null => {
  if (!enabled || loaded === null || loaded.key !== requestKey) {
    return null;
  }

  return loaded.url;
};

const resolveError = (
  enabled: boolean,
  loaded: LoadedReceipt | null,
  requestKey: string,
): boolean => {
  if (!enabled || loaded === null || loaded.key !== requestKey) {
    return false;
  }

  return loaded.error;
};
