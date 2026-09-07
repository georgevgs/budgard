import type { HTMLAttributes } from 'react';
import { cn } from '@/constants/utils';

type SurfaceCardProps = HTMLAttributes<HTMLDivElement> & {
  /** Clips children to the radius — use for grouped lists and charts. */
  isFlush?: boolean;
};

// The app's panel. Deliberately not a wrapper around the shadcn Card: that
// primitive carries its own `rounded-2xl bg-card shadow-sm` utilities, which
// outrank anything the .surface-card component class can say, so the tint and
// radius would silently never apply.
export const SurfaceCard = ({ isFlush = false, className, ...props }: SurfaceCardProps) => {
  return <div className={cn(getSurfaceClass(isFlush), className)} {...props} />;
};

const getSurfaceClass = (isFlush: boolean): string => {
  if (isFlush) {
    return 'surface-card-flush';
  }

  return 'surface-card';
};
