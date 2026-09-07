import type { ReactNode } from 'react';
import { cn } from '@/constants/utils';

// The chrome around a chart tooltip is `.chart-tooltip` in index.css, with the
// other surfaces. This file is only what goes inside one.

type ChartTooltipRowProps = {
  label: ReactNode;
  value: ReactNode;
  labelClassName?: string;
  valueClassName?: string;
  isSeparated?: boolean;
};

// A single label/value line inside a tooltip. `separated` draws a divider above
// the row (used for emphasised "net"/total lines).
const ChartTooltipRow = ({
  label,
  value,
  labelClassName,
  valueClassName,
  isSeparated = false,
}: ChartTooltipRowProps) => {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3',
        isSeparated && 'border-t border-border/40 pt-1.5 mt-1.5',
      )}
    >
      <span className={labelClassName}>{label}</span>
      <span className={cn('tabular-nums', valueClassName)}>{value}</span>
    </div>
  );
};

export { ChartTooltipRow };
