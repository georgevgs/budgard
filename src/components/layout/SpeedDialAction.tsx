import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Props = {
  isOpen: boolean;
  label: string;
  icon: ReactNode;
  onClick: () => void;
  labelDelayClass?: string;
};

const SpeedDialAction = ({
  isOpen,
  label,
  icon,
  onClick,
  labelDelayClass,
}: Props) => {
  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          'px-2 py-1 rounded-xl bg-card border border-border/40 shadow-sm',
          'opacity-0 -translate-x-4 transition-all duration-200',
          isOpen && cn('opacity-100 translate-x-0', labelDelayClass),
        )}
      >
        <span className="text-sm font-medium">{label}</span>
      </div>
      <Button
        size="icon"
        className="h-12 w-12 rounded-full shadow-lg"
        onClick={onClick}
        aria-label={label}
        tabIndex={getTabIndex(isOpen)}
      >
        {icon}
      </Button>
    </div>
  );
};

export default SpeedDialAction;

// --- Helpers ---

const getTabIndex = (isOpen: boolean): number => {
  if (isOpen) {
    return 0;
  }

  return -1;
};
