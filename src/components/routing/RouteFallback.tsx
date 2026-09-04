import type { ReactNode } from 'react';
import DelayedFallback from '@/components/ui/delayed-fallback';

type Props = {
  children: ReactNode;
};

const RouteFallback = ({ children }: Props) => (
  <DelayedFallback>{children}</DelayedFallback>
);

export default RouteFallback;
