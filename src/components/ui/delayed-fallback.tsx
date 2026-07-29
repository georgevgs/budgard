import { useEffect, useState, type ReactNode } from 'react';
import { DEFAULT_LOADING_DELAY_MS } from '@/hooks/useDelayedLoading';

type Props = {
  children: ReactNode;
  delayMs?: number;
};

// Suspense-fallback flavour of useDelayedLoading. React swaps a fallback out
// the instant the chunk resolves, so a minimum display time is not ours to
// enforce here — but the delay is, and that is the half that stops a
// pre-cached route from flashing a skeleton for two frames on tab switch.
const DelayedFallback = ({
  children,
  delayMs = DEFAULT_LOADING_DELAY_MS,
}: Props) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsVisible(true), delayMs);

    return () => window.clearTimeout(timer);
  }, [delayMs]);

  if (!isVisible) {
    return null;
  }

  return <>{children}</>;
};

export default DelayedFallback;
