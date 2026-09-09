import { useEffect, useState } from 'react';
import { i18nReady } from '@/config/i18n';

// The translations arrive after the first render now (see src/config/i18n.ts),
// so the tree needs a way to know when text is safe to draw. One-way: once the
// bundle is in there is no path back to false.
export const useI18nReady = (): boolean => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isCurrent = true;
    void i18nReady.then(() => {
      if (isCurrent) {
        setIsReady(true);
      }
    });

    return () => {
      isCurrent = false;
    };
  }, []);

  return isReady;
};
