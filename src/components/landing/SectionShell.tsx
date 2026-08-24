import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  id?: string;
  tone?: 'default' | 'muted' | 'inverted';
  children: ReactNode;
  className?: string;
};

const SectionShell = ({ id, tone = 'default', children, className }: Props) => {
  return (
    <section id={id} className={cn(toneClass(tone), className)}>
      <div className="landing-gutter mx-auto max-w-6xl py-20 sm:py-28">
        {children}
      </div>
    </section>
  );
};

export default SectionShell;

const toneClass = (tone: 'default' | 'muted' | 'inverted') => {
  // The app's rule is its separation. A full-width grey band made the landing
  // page alternate surfaces even though the product deliberately keeps page
  // and card the same colour. Paired rules preserve the reading rhythm without
  // introducing an ambient fill.
  if (tone === 'muted') {
    return 'border-y border-border/40 bg-background';
  }

  if (tone === 'inverted') {
    return 'bg-foreground text-background';
  }

  return 'bg-background';
};
