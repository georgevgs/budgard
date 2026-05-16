import { useEffect, useRef, useState } from 'react';
import * as Sentry from '@sentry/react';
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
  const [url, setUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);
  // Keep the current URL out of the effect deps — re-running on every URL
  // change would tear down the very URL we just created.
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    urlRef.current = url;
  }, [url]);

  useEffect(() => {
    if (!enabled) {
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
      }
      setUrl(null);
      setError(false);

      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(false);

    getReceiptUrl(receiptPath)
      .then((next) => {
        if (cancelled) {
          return;
        }
        setUrl(next);
      })
      .catch((err) => {
        Sentry.captureException(err, { tags: { operation: 'getReceiptUrl' } });
        if (cancelled) {
          return;
        }
        setError(true);
      })
      .finally(() => {
        if (cancelled) {
          return;
        }
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
      }
    };
  }, [enabled, receiptPath]);

  return { url, isLoading, error };
};
