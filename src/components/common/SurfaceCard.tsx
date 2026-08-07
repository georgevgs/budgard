import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type Props = HTMLAttributes<HTMLDivElement> & {
  /** Clips children to the radius — use for grouped lists and charts. */
  flush?: boolean;
};

// The app's panel. Deliberately not a wrapper around the shadcn Card: that
// primitive carries its own `rounded-2xl bg-card shadow-sm` utilities, which
// outrank anything the .surface-card component class can say, so the tint and
// radius would silently never apply.
const SurfaceCard = ({ flush = false, className, ...props }: Props) => {
  return <div className={cn(getSurfaceClass(flush), className)} {...props} />;
};

export default SurfaceCard;

// --- Helpers ---

const getSurfaceClass = (flush: boolean): string => {
  if (flush) {
    return 'surface-card-flush';
  }

  return 'surface-card';
};
