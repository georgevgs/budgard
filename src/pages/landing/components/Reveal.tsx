import { useEffect, useRef, useState, type ReactNode } from 'react';
import { prefersReducedMotion } from '@/constants/motion';
import { cn } from '@/constants/utils';

type RevealProps = {
  children: ReactNode;
  delay?: number;
  className?: string;
};

export const Reveal = ({ children, delay = 0, className }: RevealProps) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [isVisible, setVisible] = useState(() => prefersReducedMotion());

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
        'transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]',
        getVisibilityClass(isVisible),
        className,
      )}
    >
      {children}
    </div>
  );
};

const getVisibilityClass = (isVisible: boolean): string => {
  if (isVisible) return 'opacity-100 translate-y-0';

  return 'opacity-0 translate-y-3';
};
