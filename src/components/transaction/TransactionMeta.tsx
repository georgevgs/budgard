import { useTranslation } from 'react-i18next';
import EyeOff from 'lucide-react/dist/esm/icons/eye-off';
import { getColorTint } from '@/lib/categoryColor';
import type { Expense } from '@/types/Expense';
import type { EmbeddedTag } from '@/types/Tag';

type Props = {
  transaction: Expense;
  isExcluded: boolean;
};

// The chips under the amount: what it was filed as, and whether it counts.
const TransactionMeta = ({ transaction, isExcluded }: Props) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {renderCategory(transaction, t)}
      {collectTags(transaction).map((tag) => (
        <span
          key={tag.id}
          className="rounded-full px-3 py-1 text-xs font-medium"
          style={{ backgroundColor: getColorTint(tag.color) }}
        >
          {tag.name}
        </span>
      ))}
      {renderExcludedBadge(isExcluded, t)}
    </div>
  );
};

export default TransactionMeta;

// --- Helpers ---

type TFunc = (key: string, options?: Record<string, unknown>) => string;

// Primary tag first, then the Pro-only extras, matching the ordering rule in
// lib/expenseTags. Extras arrive flattened from the expense_tags join and can
// repeat the primary, so it is de-duped here rather than trusted.
const collectTags = (transaction: Expense): EmbeddedTag[] => {
  const tags: EmbeddedTag[] = [];
  if (transaction.tag) {
    tags.push(transaction.tag);
  }
  for (const tag of transaction.extra_tags ?? []) {
    if (!tags.some((existing) => existing.id === tag.id)) {
      tags.push(tag);
    }
  }

  return tags;
};

const renderCategory = (transaction: Expense, t: TFunc) => {
  const name = transaction.category?.name;
  if (!name) {
    return (
      <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
        {t('activity.uncategorized')}
      </span>
    );
  }

  return (
    <span
      className="rounded-full px-3 py-1 text-xs font-medium"
      style={{ backgroundColor: getColorTint(transaction.category?.color) }}
    >
      {name}
    </span>
  );
};

// The one piece of state on this screen that changes what every other screen
// reports, so it is stated on the transaction itself rather than only living
// as a switch further down the page.
const renderExcludedBadge = (isExcluded: boolean, t: TFunc) => {
  if (!isExcluded) {
    return null;
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/14 px-3 py-1 text-xs font-semibold text-warning-ink">
      <EyeOff className="h-3 w-3" aria-hidden="true" />
      {t('transaction.excludedBadge')}
    </span>
  );
};
