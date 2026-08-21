import type { Series } from '@/components/charts/chartTypes';

type Props = {
  series: Series[];
  show?: boolean;
};

// Only shown when a chart carries more than one series — a single-series chart
// with a legend is a label pretending to be a key.
const ChartLegend = ({ series, show }: Props) => {
  if (show === false) {
    return null;
  }
  if (series.length < 2) {
    return null;
  }

  return (
    <ul className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
      {series.map((item) => (
        <li
          key={item.key}
          className="flex items-center gap-1.5 text-xs text-muted-foreground"
        >
          <span
            aria-hidden="true"
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: `hsl(var(${item.color}))` }}
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
};

export default ChartLegend;
