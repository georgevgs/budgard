import { AveragePerMonthTile } from '@/pages/analytics/components/tiles/AveragePerMonthTile';
import { BiggestMonthTile } from '@/pages/analytics/components/tiles/BiggestMonthTile';
import { SpentThisMonthTile } from '@/pages/analytics/components/tiles/SpentThisMonthTile';
import type { MonthComparison } from '@/pages/analytics/hooks/useAnalyticsData';
import { BentoGrid } from '@/common/components/bento';

type MonthlyDatum = {
  month: string;
  fullMonth: string;
  amount: number;
};

type TrendsBentoProps = {
  monthComparison: MonthComparison;
  rhythmMonths: { month: string; amount: number }[];
  monthlyData: MonthlyDatum[];
  monthlyAverage: number;
  monthsElapsed: number;
  onMonthClick: (index: number) => void;
};

// The quick figures that explain the deeper analysis: this month, the usual
// month and the outlier. Composition stays in its full, scannable list below.
export const TrendsBento = (props: TrendsBentoProps) => {
  return (
    <BentoGrid className="mt-4">
      <SpentThisMonthTile
        monthComparison={props.monthComparison}
        rhythmMonths={props.rhythmMonths}
      />
      <AveragePerMonthTile
        monthlyAverage={props.monthlyAverage}
        monthsElapsed={props.monthsElapsed}
      />
      <BiggestMonthTile
        monthlyData={props.monthlyData}
        onMonthClick={props.onMonthClick}
      />
    </BentoGrid>
  );
};
