import { useEffect, useRef, useState } from 'react';
import { captureException } from '@/config/sentry';
import { getReceiptUrl } from '@/common/api/receiptService';

// Loads a signed receipt URL when `isEnabled` is true. Keeps service access
// out of the view layer per the architecture rule.
export type UseReceiptUrlReturn = {
  url: string | null;
  isLoading: boolean;
  hasError: boolean;
};

export const useReceiptUrl = (
  receiptPath: string,
  isEnabled: boolean,
): UseReceiptUrlReturn => {
  const [loaded, setLoaded] = useState<LoadedReceipt | null>(null);
  // Keep the current URL out of the effect deps — re-running on every URL
  // change would tear down the very URL we just created.
  const urlRef = useRef<string | null>(null);

  const requestKey = receiptPath;

  // The object URL is revoked on disable, so the settled result is invalid
  // once the viewer closes — drop it or a reopen would render a dead URL.
  if (!isEnabled && loaded !== null) {
    setLoaded(null);
  }

  useEffect(() => {
    urlRef.current = loaded?.url ?? null;
  }, [loaded]);

  useEffect(() => {
    if (!isEnabled) {
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
        setLoaded({ key: receiptPath, url: next, hasError: false });
      })
      .catch((err) => {
        captureException(err, { tags: { operation: 'getReceiptUrl' } });
        if (cancelled) {
          return;
        }
        setLoaded({ key: receiptPath, url: null, hasError: true });
      });

    return () => {
      cancelled = true;
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
      }
    };
  }, [isEnabled, receiptPath]);

  const url = resolveUrl(isEnabled, loaded, requestKey);
  const hasError = resolveError(isEnabled, loaded, requestKey);
  const isLoading = isEnabled && (loaded === null || loaded.key !== requestKey);

  return { url, isLoading, hasError };
};

type LoadedReceipt = {
  key: string;
  url: string | null;
  hasError: boolean;
};

const resolveUrl = (
  isEnabled: boolean,
  loaded: LoadedReceipt | null,
  requestKey: string,
): string | null => {
  if (!isEnabled || loaded === null || loaded.key !== requestKey) {
    return null;
  }

  return loaded.url;
};

const resolveError = (
  isEnabled: boolean,
  loaded: LoadedReceipt | null,
  requestKey: string,
): boolean => {
  if (!isEnabled || loaded === null || loaded.key !== requestKey) {
    return false;
  }

  return loaded.hasError;
};
