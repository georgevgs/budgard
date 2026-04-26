import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  id?: string;
  tone?: 'default' | 'muted' | 'inverted';
  children: ReactNode;
  className?: string;
};

const SectionShell = ({
  id,
  tone = 'default',
  children,
  className,
}: Props) => {
  return (
    <section id={id} className={cn(toneClass(tone), className)}>
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
        {children}
      </div>
    </section>
  );
};

export default SectionShell;

const toneClass = (tone: 'default' | 'muted' | 'inverted') => {
  if (tone === 'muted') {
    return 'bg-muted/30';
  }

  if (tone === 'inverted') {
    return 'bg-foreground text-background';
  }

  return 'bg-background';
};
