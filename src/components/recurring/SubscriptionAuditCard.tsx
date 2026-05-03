import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import type { Locale } from 'date-fns';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import TrendingUp from 'lucide-react/dist/esm/icons/trending-up';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import Plus from 'lucide-react/dist/esm/icons/plus';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useDataConfig } from '@/contexts/DataContext';
import { useDateLocale } from '@/hooks/useDateLocale';
import { formatCurrency } from '@/lib/utils';
import { calculateNextOccurrence, getMonthlyAmount } from '@/lib/recurring';
import {
  detectPriceDrift,
  detectSubscriptions,
  type DetectedSubscription,
  type PriceDrift,
} from '@/lib/subscriptionDetector';
import type { Expense } from '@/types/Expense';
import type { RecurringExpense } from '@/types/RecurringExpense';

const SUBSCRIPTION_FREQUENCIES = new Set<RecurringExpense['frequency']>([
  'monthly',
  'quarterly',
  'yearly',
]);

const MIN_SUBS_TO_SHOW = 2;
const TOP_LIST_LIMIT = 3;

export type RecurringPrefill = {
  description: string;
  amount: number;
  frequency: RecurringExpense['frequency'];
  category_id: string | null;
};

type Props = {
  recurringExpenses: RecurringExpense[];
  expenses: Expense[];
  onToggle: (id: string, active: boolean) => void;
  onAddDetected: (prefill: RecurringPrefill) => void;
};

const SubscriptionAuditCard = ({
  recurringExpenses,
  expenses,
  onToggle,
  onAddDetected,
}: Props) => {
  const { t } = useTranslation();
  const { defaultCurrency } = useDataConfig();
  const dateLocale = useDateLocale();

  const audit = useMemo(() => {
    const subscriptionLike = recurringExpenses.filter((r) =>
      SUBSCRIPTION_FREQUENCIES.has(r.frequency),
    );

    const active = subscriptionLike.filter((r) => r.active);
    const monthlyTotal = active.reduce(
      (sum, r) => sum + getMonthlyAmount(r),
      0,
    );

    const ranked = [...active].sort(
      (a, b) => getMonthlyAmount(b) - getMonthlyAmount(a),
    );

    const drifts = new Map<string, PriceDrift>();
    for (const sub of active) {
      const drift = detectPriceDrift(sub, expenses);
      if (drift) {
        drifts.set(sub.id, drift);
      }
    }

    return {
      activeCount: active.length,
      monthlyTotal,
      yearlyTotal: monthlyTotal * 12,
      top: ranked.slice(0, TOP_LIST_LIMIT),
      largestMonthly: ranked.length > 0 ? getMonthlyAmount(ranked[0]) : 0,
      drifts,
    };
  }, [recurringExpenses, expenses]);

  const detected = useMemo(
    () => detectSubscriptions(expenses, recurringExpenses),
    [expenses, recurringExpenses],
  );

  const showSummary = audit.activeCount >= MIN_SUBS_TO_SHOW;
  const showDetected = detected.length > 0;

  if (!showSummary && !showDetected) {
    return null;
  }

  return (
    <Card className="border-border/50 rounded-2xl overflow-hidden">
      <CardContent className="p-4 sm:p-5">
        {renderHeader(t)}
        {renderSummary(showSummary, audit, t, defaultCurrency, dateLocale, onToggle)}
        {renderDetectedSection(detected, showDetected, onAddDetected, t, defaultCurrency)}
      </CardContent>
    </Card>
  );
};

export default SubscriptionAuditCard;

// ─── Helpers ─────────────────────────────────────────────────────────────────

type AuditStats = {
  activeCount: number;
  monthlyTotal: number;
  yearlyTotal: number;
  top: RecurringExpense[];
  largestMonthly: number;
  drifts: Map<string, PriceDrift>;
};

type TFunc = (key: string, options?: Record<string, unknown>) => string;

const renderHeader = (t: TFunc) => (
  <div className="flex items-center gap-2 mb-3">
    <Sparkles className="h-4 w-4 text-primary" />
    <h3 className="text-sm font-semibold tracking-tight">
      {t('recurring.audit.title')}
    </h3>
  </div>
);

const renderSummary = (
  show: boolean,
  audit: AuditStats,
  t: TFunc,
  currency: string,
  dateLocale: Locale,
  onToggle: (id: string, active: boolean) => void,
) => {
  if (!show) return null;

  return (
    <>
      {renderTotals(audit, t, currency)}
      {renderLargestCallout(audit, t)}
      {renderTopList(audit, onToggle, currency, dateLocale, t)}
    </>
  );
};

const renderTotals = (audit: AuditStats, t: TFunc, currency: string) => (
  <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
    <p className="text-2xl font-bold tabular-nums tracking-tight">
      {formatCurrency(audit.monthlyTotal, currency)}
      <span className="ml-1 text-xs font-normal text-muted-foreground">
        {t('recurring.audit.perMonth')}
      </span>
    </p>
    <p className="text-xs text-muted-foreground tabular-nums">
      {t('recurring.audit.perYear', {
        amount: formatCurrency(audit.yearlyTotal, currency),
      })}
    </p>
    <p className="text-xs text-muted-foreground">
      {t('recurring.audit.activeCount', { count: audit.activeCount })}
    </p>
  </div>
);

const renderLargestCallout = (audit: AuditStats, t: TFunc) => {
  if (audit.top.length === 0) return null;

  const largest = audit.top[0];
  const share =
    audit.monthlyTotal > 0
      ? Math.round((audit.largestMonthly / audit.monthlyTotal) * 100)
      : 0;

  if (share < 30) return null;

  return (
    <div className="mt-3 flex items-start gap-2 rounded-xl bg-muted/40 px-3 py-2">
      <TrendingUp className="h-3.5 w-3.5 mt-0.5 text-amber-500 shrink-0" />
      <p className="text-xs text-muted-foreground leading-snug">
        {t('recurring.audit.largestHint', {
          name: largest.description,
          percent: share,
        })}
      </p>
    </div>
  );
};

const renderTopList = (
  audit: AuditStats,
  onToggle: (id: string, active: boolean) => void,
  currency: string,
  dateLocale: Locale,
  t: TFunc,
) => {
  if (audit.top.length === 0) return null;

  return (
    <div className="mt-4 space-y-1">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1.5">
        {t('recurring.audit.topLabel')}
      </p>
      {audit.top.map((sub) =>
        renderRow(sub, audit.drifts.get(sub.id), onToggle, currency, dateLocale, t),
      )}
    </div>
  );
};

const renderRow = (
  sub: RecurringExpense,
  drift: PriceDrift | undefined,
  onToggle: (id: string, active: boolean) => void,
  currency: string,
  dateLocale: Locale,
  t: TFunc,
) => {
  const next = calculateNextOccurrence(sub);

  return (
    <div
      key={sub.id}
      className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-accent/40 transition-colors"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium truncate">{sub.description}</p>
          {renderDriftBadge(drift, t)}
        </div>
        <p className="text-xs text-muted-foreground tabular-nums">
          {formatCurrency(getMonthlyAmount(sub), currency)}{' '}
          {t('recurring.audit.perMonth')}
          {renderNextChargeSuffix(next, dateLocale, t)}
        </p>
      </div>
      <Switch
        checked={sub.active}
        onCheckedChange={(checked) => onToggle(sub.id, checked)}
        aria-label={t('recurring.toggleLabel', { description: sub.description })}
      />
    </div>
  );
};

const renderDriftBadge = (drift: PriceDrift | undefined, t: TFunc) => {
  if (!drift) return null;

  const isUp = drift.deltaPct > 0;
  const colorClass = isUp ? 'text-amber-500' : 'text-income';
  const labelKey = isUp ? 'recurring.audit.driftUp' : 'recurring.audit.driftDown';

  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${colorClass}`}
      title={t(labelKey, { percent: Math.abs(drift.deltaPct).toFixed(0) })}
    >
      <AlertTriangle className="h-3 w-3" />
      {Math.abs(drift.deltaPct).toFixed(0)}%
    </span>
  );
};

const renderNextChargeSuffix = (
  next: Date | null,
  dateLocale: Locale,
  t: TFunc,
) => {
  if (!next) return null;

  return (
    <>
      <span className="mx-1.5 opacity-50">·</span>
      <span>
        {t('recurring.audit.nextOn', {
          date: format(next, 'd LLL', { locale: dateLocale }),
        })}
      </span>
    </>
  );
};

const renderDetectedSection = (
  detected: DetectedSubscription[],
  show: boolean,
  onAddDetected: (prefill: RecurringPrefill) => void,
  t: TFunc,
  currency: string,
) => {
  if (!show) return null;

  return (
    <div className="mt-5 pt-4 border-t border-border/50">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1">
        {t('recurring.audit.detectedTitle')}
      </p>
      <p className="text-xs text-muted-foreground mb-3">
        {t('recurring.audit.detectedSubtitle', { count: detected.length })}
      </p>
      <div className="space-y-1.5">
        {detected.map((d) => renderDetectedRow(d, onAddDetected, currency, t))}
      </div>
    </div>
  );
};

const renderDetectedRow = (
  detection: DetectedSubscription,
  onAddDetected: (prefill: RecurringPrefill) => void,
  currency: string,
  t: TFunc,
) => (
  <div
    key={detection.normalizedDescription}
    className="flex items-center gap-3 px-2 py-2 rounded-lg bg-muted/30"
  >
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium truncate">{detection.description}</p>
      <p className="text-xs text-muted-foreground tabular-nums">
        {formatCurrency(detection.amount, currency)}{' '}
        {t(`recurring.frequencies.${detection.frequency}`).toLowerCase()}
        <span className="mx-1.5 opacity-50">·</span>
        {t('recurring.audit.detectedOccurrences', {
          count: detection.occurrences,
        })}
      </p>
    </div>
    <Button
      variant="outline"
      size="sm"
      className="h-8 shrink-0"
      aria-label={t('recurring.audit.addAsRecurring')}
      onClick={() =>
        onAddDetected({
          description: detection.description,
          amount: detection.amount,
          frequency: detection.frequency,
          category_id: detection.category_id,
        })
      }
    >
      <Plus className="h-3.5 w-3.5 sm:mr-1" />
      <span className="hidden sm:inline">
        {t('recurring.audit.addAsRecurring')}
      </span>
    </Button>
  </div>
);
