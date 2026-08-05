import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  children: ReactNode;
  className?: string;
  glow?: boolean;
};

const DeviceFrame = ({ children, className, glow = true }: Props) => (
  <div className={cn('relative', className)}>
    {renderGlow(glow)}
    <div className="glow-surface relative rounded-[28px] border border-primary/15 shadow-2xl shadow-primary/15 overflow-hidden">
      <div className="px-3 pt-3 pb-1.5 flex items-center gap-1.5 border-b border-border/30 bg-muted/20">
        <span className="w-2 h-2 rounded-full bg-foreground/15" />
        <span className="w-2 h-2 rounded-full bg-foreground/15" />
        <span className="w-2 h-2 rounded-full bg-foreground/15" />
      </div>
      <div className="text-left">{children}</div>
    </div>
  </div>
);

export default DeviceFrame;

const renderGlow = (enabled: boolean) => {
  if (!enabled) return null;

  return (
    <div
      aria-hidden
      className="absolute -inset-6 rounded-[36px] pointer-events-none"
      style={{
        background:
          'radial-gradient(55% 65% at 34% 40%, hsl(var(--primary) / 0.24), transparent 72%), radial-gradient(48% 58% at 70% 55%, hsl(var(--info) / 0.16), transparent 74%)',
        filter: 'blur(40px)',
      }}
    />
  );
};
