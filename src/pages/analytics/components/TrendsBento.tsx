import { AveragePerMonthTile } from '@/pages/analytics/components/tiles/AveragePerMonthTile';
import { BiggestMonthTile } from '@/pages/analytics/components/tiles/BiggestMonthTile';
import { SpentThisMonthTile } from '@/pages/analytics/components/tiles/SpentThisMonthTile';
import type { MonthComparison } from '@/pages/analytics/hooks/useAnalyticsData';
import { BentoGrid } from '@/common/components/bento';

type MonthlyDatum = {
  month: string;
  fullMonth: string;
  monthIndex: number;
  amount: number;
};

type TrendsBentoProps = {
  monthComparison: MonthComparison;
  rhythmMonths: { month: string; amount: number }[];
  monthlyData: MonthlyDatum[];
  monthlyAverage: number;
  monthsElapsed: number;
  averagedMonths: number;
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
      <TrendsBenchmarks
        isVisible={1 < props.monthsElapsed}
        monthlyData={props.monthlyData}
        monthlyAverage={props.monthlyAverage}
        averagedMonths={props.averagedMonths}
        onMonthClick={props.onMonthClick}
      />
    </BentoGrid>
  );
};

// An average and a biggest month need a second month to mean anything, with
// one month both repeat the figure above.
const TrendsBenchmarks = ({
  isVisible,
  monthlyData,
  monthlyAverage,
  averagedMonths,
  onMonthClick,
}: {
  isVisible: boolean;
  monthlyData: MonthlyDatum[];
  monthlyAverage: number;
  averagedMonths: number;
  onMonthClick: (index: number) => void;
}) => {
  if (isVisible) {
    return (
      <>
        <AveragePerMonthTile
          monthlyAverage={monthlyAverage}
          averagedMonths={averagedMonths}
        />
        <BiggestMonthTile
          monthlyData={monthlyData}
          onMonthClick={onMonthClick}
        />
      </>
    );
  } else {
    return null;
  }
};
