import { useTranslation } from 'react-i18next';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import type { RecurringSuggestion } from '@/types/RecurringSuggestion';

type Props = {
  suggestions: RecurringSuggestion[];
  currency: string;
  onAccept: (suggestion: RecurringSuggestion) => Promise<void>;
  onDismiss: (suggestion: RecurringSuggestion) => Promise<void>;
};

const RecurringSuggestions = ({
  suggestions,
  currency,
  onAccept,
  onDismiss,
}: Props) => {
  const { t } = useTranslation();
  if (suggestions.length === 0) {
    return null;
  }

  return (
    <section className="tile space-y-3 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Sparkles className="h-4 w-4" />
        </span>
        <div>
          <p className="text-sm font-semibold">
            {t('recurring.suggestions.title')}
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {t('recurring.suggestions.description')}
          </p>
        </div>
      </div>
      <div className="divide-y divide-border/40 border-t border-border/40">
        {suggestions.map((suggestion) =>
          renderSuggestion(suggestion, currency, onAccept, onDismiss, t),
        )}
      </div>
    </section>
  );
};

export default RecurringSuggestions;

// --- Helpers ---

type TFunc = ReturnType<typeof useTranslation>['t'];

const renderSuggestion = (
  suggestion: RecurringSuggestion,
  currency: string,
  onAccept: Props['onAccept'],
  onDismiss: Props['onDismiss'],
  t: TFunc,
) => (
  <div key={suggestion.fingerprint} className="py-3 first:pt-3 last:pb-0">
    <div className="flex items-baseline justify-between gap-3">
      <p className="truncate text-sm font-semibold">{suggestion.description}</p>
      <p className="shrink-0 text-sm font-semibold">
        {formatCurrency(suggestion.amount, currency)}
      </p>
    </div>
    <p className="mt-0.5 text-xs text-muted-foreground">
      {t('recurring.suggestions.pattern', {
        frequency: t(`recurring.frequencies.${suggestion.frequency}`),
        count: suggestion.occurrences,
        date: suggestion.nextDate,
      })}
    </p>
    <div className="mt-2 flex justify-end gap-2">
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => void onDismiss(suggestion)}
      >
        {t('recurring.suggestions.notRecurring')}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => void onAccept(suggestion)}
      >
        {t('recurring.suggestions.accept')}
      </Button>
    </div>
  </div>
);
