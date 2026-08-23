import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  children: ReactNode;
  className?: string;
};

// Every module names itself in the same voice — letterspaced small caps, never
// a heading size. The module's number is the heading; this is the caption that
// says what the number is. The colour flips on its own inside a slab or an ink
// tile (see `.tile-label` in index.css).
const TileLabel = ({ children, className }: Props) => {
  return <p className={cn('tile-label', className)}>{children}</p>;
};

export default TileLabel;
