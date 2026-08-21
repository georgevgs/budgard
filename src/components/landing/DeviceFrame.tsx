import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  children: ReactNode;
  className?: string;
};

// The hero's frame used to sit in a blurred wash of --primary, on the idea
// that it read as the screen throwing light onto the page. Nothing else in the
// app throws coloured light any more, and on white it read as a stain under
// the phone. The frame's own shadow is the whole treatment now.
const DeviceFrame = ({ children, className }: Props) => (
  <div className={cn('relative', className)}>
    <div className="relative rounded-[28px] border border-border/70 bg-card shadow-2xl shadow-black/10 dark:shadow-black/50 overflow-hidden">
      <div className="px-3 pt-3 pb-1.5 flex items-center gap-1.5 border-b border-border/60 bg-muted/20">
        <span className="w-2 h-2 rounded-full bg-foreground/15" />
        <span className="w-2 h-2 rounded-full bg-foreground/15" />
        <span className="w-2 h-2 rounded-full bg-foreground/15" />
      </div>
      <div className="text-left">{children}</div>
    </div>
  </div>
);

export default DeviceFrame;
