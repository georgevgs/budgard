import { useTranslation } from 'react-i18next';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import { formatCurrency } from '@/lib/utils';

type Props = {
  count: number;
  expenseTotal: number;
  incomeTotal: number;
  currency: string;
};

// The transaction list's own heading. Spent and received ride along with the
// count instead of waiting behind a tap; only the net change — which needs
// both figures held against each other — stays behind the disclosure.
const ActivitySummary = ({
  count,
  expenseTotal,
  incomeTotal,
  currency,
}: Props) => {
  const { t } = useTranslation();
  const net = incomeTotal - expenseTotal;

  return (
    <details className="group">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
        <span className="type-heading">
          {t('activity.transactionCount', { count })}
        </span>
        <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold tabular-nums text-muted-foreground">
          <span>
            <span className="sr-only">{t('activity.spent')}: </span>
            {`−${formatCurrency(expenseTotal, currency)}`}
          </span>
          <span aria-hidden="true">·</span>
          <span className="text-income-ink">
            <span className="sr-only">{t('activity.received')}: </span>
            {`+${formatCurrency(incomeTotal, currency)}`}
          </span>
          <ChevronDown
            className="h-3.5 w-3.5 transition-transform group-open:rotate-180"
            aria-hidden="true"
          />
        </span>
      </summary>
      <p className="mt-1 text-right text-xs text-muted-foreground">
        {t('activity.netChange')}{' '}
        <span className={getNetTone(net)}>
          {getNetPrefix(net)}
          {formatCurrency(Math.abs(net), currency)}
        </span>
      </p>
    </details>
  );
};

export default ActivitySummary;

// --- Helpers ---

const getNetPrefix = (net: number): string => {
  if (net > 0) {
    return '+';
  }
  if (net < 0) {
    return '−';
  }

  return '';
};

const getNetTone = (net: number): string => {
  if (net < 0) {
    return 'font-semibold text-foreground';
  }

  return 'font-semibold text-income-ink';
};
