import type { ReactNode } from 'react';
import DelayedFallback from '@/common/ui/delayed-fallback';

interface Props {
  children: ReactNode;
}

const RouteFallback = ({ children }: Props) => (
  <DelayedFallback>{children}</DelayedFallback>
);

export default RouteFallback;
