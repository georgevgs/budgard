import { useTranslation } from 'react-i18next';
import type { Locale } from 'date-fns';
import type { Expense } from '@/types/Expense';
import type { Category } from '@/types/Category';
import { useSpendingInsights, type Insight } from '@/hooks/useSpendingInsights';

type SpendingInsightsProps = {
  expenses: Expense[];
  monthlyBudget: number | null;
  monthComparison: { thisMonthAmount: number; lastMonthAmount: number };
  categories: Category[];
  dateLocale: Locale;
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
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">
        {t('analytics.insights.sectionTitle')}
      </p>
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
      className={`rounded-2xl p-4 shadow-sm flex items-start gap-3.5 ${bgClass}`}
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
        const iconClass = getIconClass(insight.variant);

        return (
          <div
            key={insight.id}
            className="rounded-2xl border border-border/40 bg-card px-3.5 py-3 shadow-sm flex items-center gap-3"
          >
            <Icon className={`h-4 w-4 shrink-0 ${iconClass}`} />
            <p className="text-sm text-muted-foreground">{insight.text}</p>
          </div>
        );
      })}
    </div>
  );
};

const getIconClass = (variant: Insight['variant']): string => {
  if (variant === 'warning') return 'text-amber-500';
  if (variant === 'positive') return 'text-green-500';

  return 'text-primary';
};

const getHeroBgClass = (variant: Insight['variant']): string => {
  if (variant === 'warning')
    return 'bg-amber-500/10 border border-amber-500/20';
  if (variant === 'positive')
    return 'bg-green-500/10 border border-green-500/20';

  return 'bg-primary/10 border border-primary/20';
};

const getIconBgClass = (variant: Insight['variant']): string => {
  if (variant === 'warning') return 'bg-amber-500/15';
  if (variant === 'positive') return 'bg-green-500/15';

  return 'bg-primary/15';
};
