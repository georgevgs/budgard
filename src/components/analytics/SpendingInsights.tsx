import { useTranslation } from 'react-i18next';
import type { Locale } from 'date-fns';
import type { Expense } from '@/types/Expense';
import type { Category } from '@/types/Category';
import {
  useSpendingInsights,
  type Insight,
} from '@/hooks/useSpendingInsights';

type SpendingInsightsProps = {
  expenses: Expense[];
  monthlyBudget: number | null;
  monthComparison: { thisMonthAmount: number; lastMonthAmount: number };
  monthlyData: { month: string; fullMonth: string; amount: number }[];
  categories: Category[];
  dateLocale: Locale;
};

const SpendingInsights = (props: SpendingInsightsProps) => {
  const { t } = useTranslation();
  const insights = useSpendingInsights(props);

  if (insights.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">
        {t('analytics.insights.sectionTitle')}
      </p>
      {insights.map((insight) => renderInsightCard(insight))}
    </div>
  );
};

export default SpendingInsights;

const renderInsightCard = (insight: Insight) => {
  const Icon = insight.icon;

  let iconClass = 'text-primary';
  if (insight.variant === 'warning') iconClass = 'text-amber-500';
  if (insight.variant === 'positive') iconClass = 'text-green-500';

  return (
    <div
      key={insight.id}
      className="rounded-lg border bg-card p-3 flex items-center gap-3"
    >
      <Icon className={`h-4 w-4 shrink-0 ${iconClass}`} />
      <p className="text-sm">{insight.text}</p>
    </div>
  );
};
