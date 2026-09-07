import type { ReactNode } from 'react';
import { cn } from '@/constants/utils';

type BentoGridProps = {
  children: ReactNode;
  className?: string;
};

// The two-column module grid Today and Trends are built from. Nothing but the
// grid: what a tile is, and how loud it gets to be, is BentoTile's business.
export const BentoGrid = ({ children, className }: BentoGridProps) => {
  return <div className={cn('bento', className)}>{children}</div>;
};
