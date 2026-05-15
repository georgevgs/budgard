import { useTranslation } from 'react-i18next';
import { format, parseISO } from 'date-fns';
import type { Locale } from 'date-fns';
import Sunrise from 'lucide-react/dist/esm/icons/sunrise';
import X from 'lucide-react/dist/esm/icons/x';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useDataConfig } from '@/contexts/DataContext';
import { useDateLocale } from '@/hooks/useDateLocale';
import { useDailyRecap } from '@/hooks/useDailyRecap';
import { formatCurrency } from '@/lib/utils';
import type { RecapCategoryLine } from '@/lib/dailyRecap';

type TFunc = (key: string, options?: Record<string, unknown>) => string;

const DailyRecapCard = () => {
  const { t } = useTranslation();
  const { defaultCurrency } = useDataConfig();
  const dateLocale = useDateLocale();
  const { recap, isDismissed, dismiss } = useDailyRecap();

  if (isDismissed) return null;
  if (!recap) return null;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 sm:p-5">
        {renderHeader(recap.yesterdayDate, dismiss, dateLocale, t)}
        <p className="text-2xl font-bold tabular-nums tracking-tight">
          {formatCurrency(recap.expenseTotal, defaultCurrency)}
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            {t('recap.acrossN', { count: recap.expenseCount })}
          </span>
        </p>
        {renderCategoryLines(recap.categoryLines, defaultCurrency, t)}
      </CardContent>
    </Card>
  );
};

export default DailyRecapCard;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const renderHeader = (
  dateStr: string,
  onDismiss: () => void,
  dateLocale: Locale,
  t: TFunc,
) => {
  const formatted = format(parseISO(dateStr), 'EEEE, d LLL', {
    locale: dateLocale,
  });

  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <Sunrise className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold tracking-tight">
          {t('recap.title')}
        </h3>
        <span className="text-xs text-muted-foreground">{formatted}</span>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={onDismiss}
        className="h-7 w-7 -mr-1.5"
        aria-label={t('recap.dismissAria')}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};

const renderCategoryLines = (
  lines: RecapCategoryLine[],
  currency: string,
  t: TFunc,
) => {
  if (lines.length === 0) return null;

  return (
    <div className="mt-3 space-y-1.5">
      {lines.map((line) => renderCategoryLine(line, currency, t))}
    </div>
  );
};

const renderCategoryLine = (
  line: RecapCategoryLine,
  currency: string,
  t: TFunc,
) => (
  <div
    key={line.categoryId ?? '__uncat'}
    className="flex items-center gap-2 text-sm"
  >
    {renderSwatch(line.color)}
    <span className="flex-1 min-w-0 truncate">
      {renderCategoryName(line, t)}
    </span>
    <span className="tabular-nums">{formatCurrency(line.amount, currency)}</span>
  </div>
);

const renderSwatch = (color: string | null) => {
  if (!color) {
    return (
      <span className="h-2 w-2 rounded-full bg-muted-foreground/40 shrink-0" />
    );
  }

  return (
    <span
      className="h-2 w-2 rounded-full shrink-0"
      style={{ backgroundColor: color }}
    />
  );
};

const renderCategoryName = (line: RecapCategoryLine, t: TFunc): string => {
  if (line.categoryId === null) return t('recap.uncategorised');

  return line.categoryName;
};
