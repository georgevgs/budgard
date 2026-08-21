import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  children: ReactNode;
  className?: string;
  glow?: boolean;
};

const DeviceFrame = ({ children, className, glow = false }: Props) => (
  <div className={cn('relative', className)}>
    {renderGlow(glow)}
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

// Drawn from --primary rather than --foreground: a neutral haze behind a
// phone reads as a printing artefact, while the brand hue reads as the screen
// itself throwing light onto the page.
const renderGlow = (enabled: boolean) => {
  if (!enabled) return null;

  return (
    <div
      aria-hidden
      className="absolute -inset-10 rounded-[44px] pointer-events-none"
      style={{
        background:
          'radial-gradient(58% 58% at 50% 42%, hsl(var(--primary) / 0.4), transparent 70%)',
        filter: 'blur(52px)',
      }}
    />
  );
};
