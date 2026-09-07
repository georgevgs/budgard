import type { ReactNode } from 'react';
import DelayedFallback from '@/common/ui/delayed-fallback';

type RouteFallbackProps = {
  children: ReactNode;
};

export const RouteFallback = ({ children }: RouteFallbackProps) => {
  return <DelayedFallback>{children}</DelayedFallback>;
};
