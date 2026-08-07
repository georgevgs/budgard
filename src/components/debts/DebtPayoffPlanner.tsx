import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format, parseISO } from 'date-fns';
import SurfaceCard from '@/components/common/SurfaceCard';
import { Input } from '@/components/ui/input';
import ProUpsellCard from '@/components/pro/ProUpsellCard';
import { useDataConfig } from '@/contexts/DataContext';
import { useDateLocale } from '@/hooks/useDateLocale';
import { useDebtPayoffPlan } from '@/hooks/useDebtPayoffPlan';
import { useIsPro } from '@/hooks/useIsPro';
import { cn, formatCurrency } from '@/lib/utils';
import type { Locale } from 'date-fns';
import type { SimResult } from '@/lib/debtPayoff';
import type { Debt, PayoffStrategy } from '@/types/Debt';

type Props = {
  debts: Debt[];
};

const DebtPayoffPlanner = ({ debts }: Props) => {
  const { t } = useTranslation();
  const isPro = useIsPro();
  const { defaultCurrency } = useDataConfig();
  const dateLocale = useDateLocale();
  const [strategy, setStrategy] = useState<PayoffStrategy>('snowball');
  const [extraInput, setExtraInput] = useState('0');
  const plan = useDebtPayoffPlan(debts, parseExtra(extraInput));

  const hasActiveDebt = debts.some(isActiveDebt);

  if (!hasActiveDebt) {
    return null;
  }

  if (!isPro) {
    return (
      <ProUpsellCard
        title={t('pro.gate.debtPlanTitle')}
        description={t('pro.gate.debtPlanBody')}
      />
    );
  }

  return (
    <SurfaceCard>
      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">{t('debts.planner.title')}</h3>
          {renderStrategyTabs(strategy, setStrategy, t)}
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="debt-planner-extra"
            className="text-xs font-medium text-muted-foreground"
          >
            {t('debts.planner.monthlyExtraLabel')}
          </label>
          <Input
            id="debt-planner-extra"
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            value={extraInput}
            onChange={(e) => setExtraInput(e.target.value)}
          />
        </div>

        {renderResults(plan, strategy, defaultCurrency, dateLocale, t)}
      </div>
    </SurfaceCard>
  );
};

export default DebtPayoffPlanner;

// --- Helpers ---

type TranslateFunction = (
  key: string,
  options?: Record<string, unknown>,
) => string;

type PlanComparison = {
  snowball: SimResult;
  avalanche: SimResult;
};

const STRATEGY_TABS: ReadonlyArray<{
  key: PayoffStrategy;
  labelKey: string;
}> = [
  { key: 'snowball', labelKey: 'debts.planner.snowball' },
  { key: 'avalanche', labelKey: 'debts.planner.avalanche' },
];

const isActiveDebt = (debt: Debt): boolean =>
  !debt.is_archived && !debt.is_completed && debt.current_balance > 0;

const parseExtra = (raw: string): number => {
  const parsed = Number(raw);
  if (Number.isNaN(parsed) || parsed < 0) {
    return 0;
  }

  return parsed;
};

const formatPayoffDate = (isoDate: string, locale: Locale): string =>
  format(parseISO(isoDate), 'MMMM yyyy', { locale });

const renderStrategyTabs = (
  active: PayoffStrategy,
  onChange: (key: PayoffStrategy) => void,
  t: TranslateFunction,
) => (
  <div className="flex gap-1">
    {STRATEGY_TABS.map((s) => (
      <button
        key={s.key}
        type="button"
        onClick={() => onChange(s.key)}
        className={cn(
          'text-xs font-medium px-2 py-1 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
          getStrategyTabClass(s.key === active),
        )}
      >
        {t(s.labelKey)}
      </button>
    ))}
  </div>
);

const getStrategyTabClass = (isActive: boolean): string => {
  if (isActive) {
    return 'bg-primary/10 text-primary';
  }

  return 'text-muted-foreground hover:bg-muted/60';
};

const renderResults = (
  plan: PlanComparison,
  strategy: PayoffStrategy,
  currency: string,
  locale: Locale,
  t: TranslateFunction,
) => {
  const selected = plan[strategy];

  if (selected.unpayable) {
    return (
      <p className="text-xs text-destructive pt-3 border-t border-border/40">
        {t('debts.planner.unpayable')}
      </p>
    );
  }

  return (
    <div className="space-y-2 pt-3 border-t border-border/40">
      <div className="flex items-center justify-between gap-4">
        <span className="text-xs text-muted-foreground">
          {t('debts.planner.debtFreeIn')}
        </span>
        <div className="text-right">
          <p className="text-sm font-semibold tabular-nums">
            {t('debts.planner.monthsCount', { count: selected.monthsToPayoff })}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatPayoffDate(selected.payoffDate, locale)}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <span className="text-xs text-muted-foreground">
          {t('debts.planner.totalInterest')}
        </span>
        <span className="text-sm font-semibold tabular-nums">
          {formatCurrency(selected.totalInterestPaid, currency)}
        </span>
      </div>

      {renderComparison(plan, currency, t)}
    </div>
  );
};

const renderComparison = (
  plan: PlanComparison,
  currency: string,
  t: TranslateFunction,
) => {
  if (plan.snowball.unpayable || plan.avalanche.unpayable) {
    return null;
  }

  const diffCents = Math.round(
    (plan.snowball.totalInterestPaid - plan.avalanche.totalInterestPaid) * 100,
  );

  if (diffCents === 0) {
    return null;
  }

  let winnerKey = 'debts.planner.avalanche';
  let loserKey = 'debts.planner.snowball';
  if (diffCents < 0) {
    winnerKey = 'debts.planner.snowball';
    loserKey = 'debts.planner.avalanche';
  }

  return (
    <p className="text-xs text-muted-foreground">
      {t('debts.planner.comparison', {
        winner: t(winnerKey),
        loser: t(loserKey),
        amount: formatCurrency(Math.abs(diffCents) / 100, currency),
      })}
    </p>
  );
};
