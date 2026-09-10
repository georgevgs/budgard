import { useCallback, useEffect, useState } from 'react';
import { useDataActions } from '@/common/contexts/DataContext';
import type { DataActions } from '@/common/contexts/DataContext.types';
import { isAbortError } from '@/common/contexts/dataContextHelpers';
import { captureException } from '@/config/sentry';
import type { OnDemandDomain } from '@/common/hooks/data/dataOptional';

type DataStatus = 'loading' | 'ready' | 'error';

export const useOnDemandData = (domain: OnDemandDomain) => {
  const { loadOptionalData } = useDataActions();
  const [status, setStatus] = useState<DataStatus>('loading');

  useEffect(
    () => watchOptionalData(domain, loadOptionalData, setStatus),
    [domain, loadOptionalData],
  );

  const retry = useCallback(() => {
    // An explicit retry bypasses the freshness window.
    setStatus('loading');
    void loadOptionalData(domain, true).then(
      () => setStatus('ready'),
      () => setStatus('error'),
    );
  }, [domain, loadOptionalData]);

  return { status, retry };
};

const watchOptionalData = (
  domain: OnDemandDomain,
  loadOptionalData: DataActions['loadOptionalData'],
  onStatusChange: (status: DataStatus) => void,
): (() => void) => {
  let isActive = true;
  const refresh = () => {
    if (document.visibilityState === 'hidden') {
      return;
    }
    void loadOptionalData(domain).then(
      () => {
        if (isActive) {
          onStatusChange('ready');
        }
      },
      (error: unknown) => {
        if (!isActive) {
          return;
        }
        if (isAbortError(error)) {
          refresh();

          return;
        }
        captureException(error, { tags: { context: `load ${domain}` } });
        onStatusChange('error');
      },
    );
  };
  refresh();
  document.addEventListener('visibilitychange', refresh);
  window.addEventListener('online', refresh);

  return () => {
    isActive = false;
    document.removeEventListener('visibilitychange', refresh);
    window.removeEventListener('online', refresh);
  };
};
