import type { HTMLAttributes } from 'react';
import { cn } from '@/constants/utils';

type SurfaceCardProps = HTMLAttributes<HTMLDivElement> & {
  /** Clips children to the radius — use for grouped lists and charts. */
  flush?: boolean;
};

// The app's panel. Deliberately not a wrapper around the shadcn Card: that
// primitive carries its own `rounded-2xl bg-card shadow-sm` utilities, which
// outrank anything the .surface-card component class can say, so the tint and
// radius would silently never apply.
export const SurfaceCard = ({ flush = false, className, ...props }: SurfaceCardProps) => {
  return <div className={cn(getSurfaceClass(flush), className)} {...props} />;
};
// --- Helpers ---

const getSurfaceClass = (flush: boolean): string => {
  if (flush) {
    return 'surface-card-flush';
  }

  return 'surface-card';
};
