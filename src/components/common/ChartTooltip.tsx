import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type ShellProps = {
  title: ReactNode;
  children?: ReactNode;
};

// Shared chrome for every chart tooltip so all charts read as one system:
// same radius, surface, border, shadow and padding. Content stays per-chart.
const ChartTooltipShell = ({ title, children }: ShellProps) => (
  <div className="rounded-xl bg-popover border border-border/40 shadow-md p-3 text-xs space-y-1.5">
    <p className="font-medium text-foreground">{title}</p>
    {children}
  </div>
);

type RowProps = {
  label: ReactNode;
  value: ReactNode;
  labelClassName?: string;
  valueClassName?: string;
  separated?: boolean;
};

// A single label/value line inside a tooltip. `separated` draws a divider above
// the row (used for emphasised "net"/total lines).
const ChartTooltipRow = ({
  label,
  value,
  labelClassName,
  valueClassName,
  separated = false,
}: RowProps) => (
  <div
    className={cn(
      'flex items-center justify-between gap-3',
      separated && 'border-t border-border/40 pt-1.5 mt-1.5',
    )}
  >
    <span className={labelClassName}>{label}</span>
    <span className={cn('tabular-nums', valueClassName)}>{value}</span>
  </div>
);

export { ChartTooltipShell, ChartTooltipRow };
