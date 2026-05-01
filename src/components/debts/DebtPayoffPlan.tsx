import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn, formatCurrency, formatCurrencyInput, parseCurrencyInput } from '@/lib/utils';
import { getCurrencySymbol } from '@/lib/currencies';
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
      <Card className="border-border/50 rounded-2xl p-8 text-center">
        <p className="text-sm text-muted-foreground">
          {t('debts.payoff.empty')}
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-border/50 rounded-2xl">
        <CardContent className="p-4 space-y-3">
          <label className="text-sm font-medium">
            {t('debts.payoff.extraLabel')}
          </label>
          <p className="text-xs text-muted-foreground">
            {t('debts.payoff.extraHint')}
          </p>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {getCurrencySymbol(defaultCurrency)}
            </span>
            <Input
              type="text"
              inputMode="decimal"
              pattern="[0-9,.]*"
              placeholder="0"
              value={extraInput}
              onChange={(e) => setExtraInput(formatCurrencyInput(e.target.value))}
              className="pl-7"
              aria-label={t('debts.payoff.extraLabel')}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant={strategy === 'avalanche' ? 'default' : 'outline'}
          onClick={() => setStrategy('avalanche')}
          className="h-auto py-3 flex-col items-start gap-1"
        >
          <span className="font-semibold">
            {t('debts.payoff.avalanche')}
          </span>
          <span className="text-[11px] font-normal opacity-80 text-left">
            {t('debts.payoff.avalancheHint')}
          </span>
        </Button>
        <Button
          type="button"
          variant={strategy === 'snowball' ? 'default' : 'outline'}
          onClick={() => setStrategy('snowball')}
          className="h-auto py-3 flex-col items-start gap-1"
        >
          <span className="font-semibold">
            {t('debts.payoff.snowball')}
          </span>
          <span className="text-[11px] font-normal opacity-80 text-left">
            {t('debts.payoff.snowballHint')}
          </span>
        </Button>
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

const renderResultCard = (
  result: SimResult,
  currency: string,
  strategy: PayoffStrategy,
  t: TranslateFunction,
) => {
  if (result.unpayable) {
    return (
      <Card className="border-destructive/30 rounded-2xl bg-destructive/5">
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
    <Card className="border-primary/30 rounded-2xl bg-primary/5">
      <CardContent className="p-5 space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5" />
          <span>
            {t('debts.payoff.usingStrategy', {
              strategy: t(`debts.payoff.${strategy}`),
            })}
          </span>
        </div>
        <p className="text-2xl font-bold tabular-nums">
          {t('debts.payoff.debtFreeIn')}{' '}
          <span className="text-primary">
            {t('debts.monthsCount', { count: result.monthsToPayoff })}
          </span>
        </p>
        <div className="flex items-center justify-between text-xs pt-1">
          <span className="text-muted-foreground">
            {t('debts.payoff.payoffDate')}
          </span>
          <span className="font-medium tabular-nums">{result.payoffDate}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {t('debts.payoff.totalInterest')}
          </span>
          <span className="font-medium tabular-nums">
            {formatCurrency(result.totalInterestPaid, currency)}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {t('debts.payoff.totalPaid')}
          </span>
          <span className="font-medium tabular-nums">
            {formatCurrency(result.totalPaid, currency)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

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
          <div className="space-y-1.5">
            <p className="font-semibold text-sm">{t('debts.payoff.avalanche')}</p>
            <p className="text-muted-foreground">
              {t('debts.monthsCount', { count: avalanche.monthsToPayoff })}
            </p>
            <p className="tabular-nums">
              {formatCurrency(avalanche.totalInterestPaid, currency)}
            </p>
          </div>
          <div className="space-y-1.5">
            <p className="font-semibold text-sm">{t('debts.payoff.snowball')}</p>
            <p className="text-muted-foreground">
              {t('debts.monthsCount', { count: snowball.monthsToPayoff })}
            </p>
            <p className="tabular-nums">
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
          {ordered.map((entry, index) => (
            <li
              key={entry.debt.id}
              className="flex items-center gap-3 px-3 py-2 rounded-lg border border-border/40 bg-card/50"
            >
              <div
                className={cn(
                  'h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                  index === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                )}
              >
                {index + 1}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{entry.debt.name}</p>
                <p className="text-xs text-muted-foreground">
                  {entry.debt.apr.toFixed(2)}% APR
                </p>
              </div>
              <p className="text-xs text-muted-foreground tabular-nums shrink-0">
                {t('debts.payoff.paidInMonth', { month: entry.month })}
              </p>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
