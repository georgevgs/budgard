import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  children: ReactNode;
  className?: string;
};

// The two-column module grid Today and Trends are built from. Nothing but the
// grid: what a tile is, and how loud it gets to be, is BentoTile's business.
const BentoGrid = ({ children, className }: Props) => {
  return <div className={cn('bento', className)}>{children}</div>;
};

export default BentoGrid;
