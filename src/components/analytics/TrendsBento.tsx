import BentoGrid from '@/components/bento/BentoGrid';
import AveragePerMonthTile from '@/components/analytics/tiles/AveragePerMonthTile';
import BiggestMonthTile from '@/components/analytics/tiles/BiggestMonthTile';
import SpentThisMonthTile from '@/components/analytics/tiles/SpentThisMonthTile';
import WhereItWentTile from '@/components/analytics/tiles/WhereItWentTile';
import type {
  CategoryRow,
  MonthComparison,
} from '@/hooks/analytics/useAnalyticsData';

type MonthlyDatum = {
  month: string;
  fullMonth: string;
  amount: number;
};

type Props = {
  monthComparison: MonthComparison;
  rhythmMonths: { month: string; amount: number }[];
  monthlyData: MonthlyDatum[];
  monthlyAverage: number;
  monthsElapsed: number;
  totalSpent: number;
  breakdown: CategoryRow[];
  onMonthClick: (index: number) => void;
  onCategoryClick: (category: CategoryRow) => void;
};

// The top of Trends: the five answers most people open the screen for, before
// any chart they have to read. Everything below this grid is the detail behind
// one of these tiles.
const TrendsBento = (props: Props) => {
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
      <WhereItWentTile
        breakdown={props.breakdown}
        totalSpent={props.totalSpent}
        onCategoryClick={props.onCategoryClick}
      />
    </BentoGrid>
  );
};

export default TrendsBento;
