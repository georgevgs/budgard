import { useEffect, useRef, useState, type ReactNode } from 'react';
import { prefersReducedMotion } from '@/lib/motion';
import { cn } from '@/lib/utils';

type Props = {
  children: ReactNode;
  delay?: number;
  className?: string;
};

const Reveal = ({ children, delay = 0, className }: Props) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(() => prefersReducedMotion());

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (prefersReducedMotion()) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -60px 0px' },
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn(
        'transition-all duration-700 ease-out will-change-transform',
        visible && 'opacity-100 translate-y-0',
        !visible && 'opacity-0 translate-y-4',
        className,
      )}
    >
      {children}
    </div>
  );
};

export default Reveal;
