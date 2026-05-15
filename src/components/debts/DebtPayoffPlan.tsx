import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { CurrencyInput } from '@/components/ui/currency-input';
import { cn, formatCurrency, parseCurrencyInput } from '@/lib/utils';
import { useDebtPayoffPlan } from '@/hooks/useDebtPayoffPlan';
import type { Debt, PayoffStrategy } from '@/types/Debt';
import type { SimResult } from '@/lib/debtPayoff';
import TrendingDown from 'lucide-react/dist/esm/icons/trending-down';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';

type Props = {
  debts: Debt[];
  defaultCurrency: string;
}

const DebtPayoffPlan = ({ debts, defaultCurrency }: Props) => {
  const { t } = useTranslation();
  const [extraInput, setExtraInput] = useState('');
  const [strategy, setStrategy] = useState<PayoffStrategy>('avalanche');

  const monthlyExtra = useMemo(() => {
    if (!extraInput.trim()) return 0;

    return parseCurrencyInput(extraInput);
  }, [extraInput]);

  const { snowball, avalanche } = useDebtPayoffPlan(debts, monthlyExtra);
  const active = useMemo(
    () =>
      debts.filter(
        (d) => !d.is_archived && !d.is_completed && d.current_balance > 0,
      ),
    [debts],
  );

  const chosen = strategy === 'snowball' ? snowball : avalanche;

  if (active.length === 0) {
    return (
      <Card className="border-border/50 p-8 text-center">
        <p className="text-sm text-muted-foreground">
          {t('debts.payoff.empty')}
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-border/50">
        <CardContent className="p-4 space-y-3">
          <label className="text-sm font-medium">
            {t('debts.payoff.extraLabel')}
          </label>
          <p className="text-xs text-muted-foreground">
            {t('debts.payoff.extraHint')}
          </p>
          <CurrencyInput
            currency={defaultCurrency}
            value={extraInput}
            onChange={setExtraInput}
            placeholder={t('common.amountZero')}
            aria-label={t('debts.payoff.extraLabel')}
          />
        </CardContent>
      </Card>

      <div className="space-y-2">
        <div
          role="tablist"
          aria-label={t('debts.payoff.strategyAriaLabel')}
          className="bg-muted rounded-xl p-1 grid grid-cols-2 gap-1"
        >
          {renderStrategyTab('avalanche', strategy, setStrategy, t)}
          {renderStrategyTab('snowball', strategy, setStrategy, t)}
        </div>
        <p className="text-xs text-muted-foreground px-1">
          {pickStrategyHint(strategy, t)}
        </p>
      </div>

      {renderResultCard(chosen, defaultCurrency, strategy, t)}
      {renderComparison(snowball, avalanche, defaultCurrency, t)}
      {renderPayoffOrder(chosen, active, t)}
    </div>
  );
}

export default DebtPayoffPlan;

// --- Helpers ---

type TranslateFunction = (
  key: string,
  options?: Record<string, unknown>,
) => string;

const renderStrategyTab = (
  value: PayoffStrategy,
  current: PayoffStrategy,
  onChange: (next: PayoffStrategy) => void,
  t: TranslateFunction,
) => {
  const isActive = current === value;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={() => onChange(value)}
      className={cn(
        'rounded-lg py-2 px-3 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        pickStrategyTabClass(isActive),
      )}
    >
      {t(`debts.payoff.${value}`)}
    </button>
  );
};

const pickStrategyTabClass = (isActive: boolean) => {
  if (isActive) return 'bg-card text-foreground shadow-sm';

  return 'text-muted-foreground hover:text-foreground';
};

const pickStrategyHint = (
  strategy: PayoffStrategy,
  t: TranslateFunction,
) => {
  if (strategy === 'avalanche') return t('debts.payoff.avalancheHint');

  return t('debts.payoff.snowballHint');
};

const renderPayoffOrderRow = (
  entry: { debt: Debt; month: number },
  index: number,
  t: TranslateFunction,
) => {
  return (
    <li
      key={entry.debt.id}
      className="flex items-center gap-3 px-3 py-2 rounded-lg border border-border/40 bg-card/50"
    >
      <div
        className={cn(
          'h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
          pickRankClass(index),
        )}
      >
        {index + 1}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{entry.debt.name}</p>
        <p className="text-xs text-muted-foreground">
          {t('debts.aprSuffix', { apr: entry.debt.apr.toFixed(2) })}
        </p>
      </div>
      <p className="text-xs text-muted-foreground tabular-nums shrink-0">
        {t('debts.payoff.paidInMonth', { month: entry.month })}
      </p>
    </li>
  );
};

const pickRankClass = (index: number) => {
  if (index === 0) return 'bg-primary text-primary-foreground';

  return 'bg-muted text-muted-foreground';
};

const renderResultCard = (
  result: SimResult,
  currency: string,
  strategy: PayoffStrategy,
  t: TranslateFunction,
) => {
  if (result.unpayable) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-destructive">
              {t('debts.payoff.unpayableTitle')}
            </p>
            <p className="text-destructive/80 mt-1">
              {t('debts.payoff.unpayableDescription')}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-0">
          <Sparkles className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">
            {t('debts.payoff.usingStrategy', {
              strategy: t(`debts.payoff.${strategy}`),
            })}
          </span>
        </div>
        <p className="text-xl sm:text-2xl font-bold tabular-nums leading-tight break-words">
          {t('debts.payoff.debtFreeIn')}{' '}
          <span className="text-primary">
            {t('debts.monthsCount', { count: result.monthsToPayoff })}
          </span>
        </p>
        <div className="space-y-1.5 pt-1">
          {renderResultRow(
            t('debts.payoff.payoffDate'),
            result.payoffDate,
          )}
          {renderResultRow(
            t('debts.payoff.totalInterest'),
            formatCurrency(result.totalInterestPaid, currency),
          )}
          {renderResultRow(
            t('debts.payoff.totalPaid'),
            formatCurrency(result.totalPaid, currency),
          )}
        </div>
      </CardContent>
    </Card>
  );
}

const renderResultRow = (label: string, value: string) => {
  return (
    <div className="flex items-baseline justify-between gap-3 text-xs">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-medium tabular-nums text-right break-all">
        {value}
      </span>
    </div>
  );
};

const renderComparison = (
  snowball: SimResult,
  avalanche: SimResult,
  currency: string,
  t: TranslateFunction,
) => {
  if (snowball.unpayable || avalanche.unpayable) return null;

  const interestSavings = snowball.totalInterestPaid - avalanche.totalInterestPaid;
  const monthsDiff = snowball.monthsToPayoff - avalanche.monthsToPayoff;

  return (
    <Card className="border-border/50 rounded-2xl">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <TrendingDown className="h-3.5 w-3.5" />
          {t('debts.payoff.comparisonTitle')}
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="space-y-1.5 min-w-0">
            <p className="font-semibold text-sm truncate">
              {t('debts.payoff.avalanche')}
            </p>
            <p className="text-muted-foreground truncate">
              {t('debts.monthsCount', { count: avalanche.monthsToPayoff })}
            </p>
            <p className="tabular-nums break-all">
              {formatCurrency(avalanche.totalInterestPaid, currency)}
            </p>
          </div>
          <div className="space-y-1.5 min-w-0">
            <p className="font-semibold text-sm truncate">
              {t('debts.payoff.snowball')}
            </p>
            <p className="text-muted-foreground truncate">
              {t('debts.monthsCount', { count: snowball.monthsToPayoff })}
            </p>
            <p className="tabular-nums break-all">
              {formatCurrency(snowball.totalInterestPaid, currency)}
            </p>
          </div>
        </div>

        {renderSavingsHint(interestSavings, monthsDiff, currency, t)}
      </CardContent>
    </Card>
  );
}

const renderSavingsHint = (
  interestSavings: number,
  monthsDiff: number,
  currency: string,
  t: TranslateFunction,
) => {
  if (interestSavings <= 0 && monthsDiff <= 0) return null;

  return (
    <p className="text-xs pt-2 border-t border-border/40 text-foreground">
      {t('debts.payoff.savingsHint', {
        amount: formatCurrency(Math.max(interestSavings, 0), currency),
      })}
    </p>
  );
}

const renderPayoffOrder = (
  result: SimResult,
  debts: Debt[],
  t: TranslateFunction,
) => {
  if (result.unpayable) return null;

  const debtById = new Map<string, Debt>();
  for (const d of debts) debtById.set(d.id, d);

  const ordered = Object.entries(result.perDebtPayoffMonth)
    .sort(([, a], [, b]) => a - b)
    .map(([id, month]) => ({ debt: debtById.get(id), month }))
    .filter((entry): entry is { debt: Debt; month: number } => Boolean(entry.debt));

  if (ordered.length === 0) return null;

  return (
    <Card className="border-border/50 rounded-2xl">
      <CardContent className="p-4 space-y-3">
        <p className="text-xs font-medium text-muted-foreground">
          {t('debts.payoff.orderTitle')}
        </p>
        <ol className="space-y-2">
          {ordered.map((entry, index) =>
            renderPayoffOrderRow(entry, index, t),
          )}
        </ol>
      </CardContent>
    </Card>
  );
}
