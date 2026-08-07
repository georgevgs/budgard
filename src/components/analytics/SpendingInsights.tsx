import { useTranslation } from 'react-i18next';
import type { Expense } from '@/types/Expense';
import type { Category } from '@/types/Category';
import { useSpendingInsights, type Insight } from '@/hooks/useSpendingInsights';

type SpendingInsightsProps = {
  expenses: Expense[];
  monthlyBudget: number | null;
  monthComparison: { thisMonthAmount: number; lastMonthAmount: number };
  categories: Category[];
  defaultCurrency: string;
};

const SpendingInsights = (props: SpendingInsightsProps) => {
  const { t } = useTranslation();
  const insights = useSpendingInsights(props);

  if (insights.length === 0) {
    return null;
  }

  // Lead with the most impactful insight as a hero card
  const [hero, ...rest] = insights;

  return (
    <div className="space-y-3">
      <h2 className="font-display text-xl font-semibold">
        {t('analytics.insights.sectionTitle')}
      </h2>
      {renderHeroCard(hero)}
      {renderSecondaryCards(rest)}
    </div>
  );
};

export default SpendingInsights;

// ─── Helper render functions ──────────────────────────────────────────────────

const renderHeroCard = (insight: Insight) => {
  const Icon = insight.icon;
  const bgClass = getHeroBgClass(insight.variant);
  const iconClass = getIconClass(insight.variant);

  return (
    <div
      data-insight="hero"
      className={`rounded-[1.6rem] p-4 flex items-start gap-3.5 ${bgClass}`}
    >
      <div
        className={`mt-0.5 flex items-center justify-center h-8 w-8 rounded-full shrink-0 ${getIconBgClass(insight.variant)}`}
      >
        <Icon className={`h-4 w-4 ${iconClass}`} />
      </div>
      <p className="text-sm font-medium leading-relaxed pt-1">
        {insight.text}
      </p>
    </div>
  );
};

const renderSecondaryCards = (insights: Insight[]) => {
  if (insights.length === 0) return null;

  return (
    <div className="grid gap-2">
      {insights.map((insight) => {
        const Icon = insight.icon;

        return (
          <div
            key={insight.id}
            data-insight="secondary"
            className="surface-card px-3.5 py-3 flex items-center gap-3"
          >
            <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{insight.text}</p>
          </div>
        );
      })}
    </div>
  );
};

const getIconClass = (variant: Insight['variant']): string => {
  if (variant === 'warning') return 'text-warning';
  if (variant === 'positive') return 'text-income';

  return 'text-primary';
};

const getHeroBgClass = (variant: Insight['variant']): string => {
  if (variant === 'warning')

    return 'bg-warning/10 border border-warning/20';
  if (variant === 'positive')

    return 'bg-income/10 border border-income/20';

  return 'bg-primary/10 border border-primary/20';
};

const getIconBgClass = (variant: Insight['variant']): string => {
  if (variant === 'warning') return 'bg-warning/15';
  if (variant === 'positive') return 'bg-income/15';

  return 'bg-primary/15';
};
