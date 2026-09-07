import { useTranslation } from 'react-i18next';
import Plus from 'lucide-react/dist/esm/icons/plus';
import X from 'lucide-react/dist/esm/icons/x';
import { Button } from '@/common/ui/button';
import type { TranslateFunction } from '@/constants/translate';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/common/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/common/ui/select';
import { CurrencyInput } from '@/common/ui/currency-input';
import { useCategoriesData, useDataConfig } from '@/common/contexts/DataContext';
import {
  isSettled,
  useExpenseSplit,
  MAX_SPLIT_PARTS,
  type SplitPart,
} from '@/pages/expenses/hooks/useExpenseSplit';
import { cn, formatCurrency } from '@/constants/utils';
import type { Category } from '@/types/Category';
import type { Expense } from '@/types/Expense';

type SplitExpenseDialogProps = {
  expense: Expense;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export const SplitExpenseDialog = ({ expense, open, onOpenChange }: SplitExpenseDialogProps) => {
  const { t } = useTranslation();
  const { defaultCurrency } = useDataConfig();
  const { expenseCategories } = useCategoriesData();
  const split = useExpenseSplit(expense, open, () => onOpenChange(false));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]" onOpenChange={onOpenChange}>
        <DialogHeader data-draggable-area className="pr-10 pt-2">
          <DialogTitle>{t('expenses.split.title')}</DialogTitle>
          <DialogDescription>
            {t('expenses.split.description', {
              description: expense.description,
              amount: formatCurrency(expense.amount, defaultCurrency),
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-1">
          {split.parts.map((part, index) =>
            renderPartRow(
              part,
              index,
              split.parts.length,
              expenseCategories,
              defaultCurrency,
              t,
              split.updatePart,
              split.removePart,
            ),
          )}

          {renderAddPartButton(split.parts.length, t, split.addPart)}

          {renderRemaining(split.remaining, defaultCurrency, t)}
        </div>

        <div className="flex shrink-0 justify-end gap-3 border-t border-border/50 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={split.isSaving}
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            onClick={split.confirm}
            disabled={!split.canConfirm}
          >
            {t('expenses.split.confirm')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
const renderPartRow = (
  part: SplitPart,
  index: number,
  partCount: number,
  categories: Category[],
  currency: string,
  t: TranslateFunction,
  onUpdate: (index: number, patch: Partial<SplitPart>) => void,
  onRemove: (index: number) => void,
) => {
  return (
    <div key={index} className="flex items-center gap-2">
      <CurrencyInput
        currency={currency}
        value={part.amount}
        onChange={(formatted) => onUpdate(index, { amount: formatted })}
        placeholder="0,00"
        wrapperClassName="w-28 shrink-0"
        aria-label={t('expenses.split.partAmount', { index: index + 1 })}
      />
      <Select
        value={part.category_id}
        onValueChange={(value) => onUpdate(index, { category_id: value })}
      >
        <SelectTrigger
          aria-label={t('expenses.split.partCategory', { index: index + 1 })}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">{t('expenses.noCategory')}</SelectItem>
          {categories.map((category) => (
            <SelectItem key={category.id} value={category.id}>
              {category.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {renderRemoveButton(index, partCount, t, onRemove)}
    </div>
  );
};

const renderRemoveButton = (
  index: number,
  partCount: number,
  t: TranslateFunction,
  onRemove: (index: number) => void,
) => {
  if (partCount <= 2) {
    return null;
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-10 w-10 shrink-0 text-muted-foreground"
      onClick={() => onRemove(index)}
      aria-label={t('expenses.split.removePart')}
    >
      <X className="h-4 w-4" />
    </Button>
  );
};

const renderAddPartButton = (
  partCount: number,
  t: TranslateFunction,
  onAdd: () => void,
) => {
  if (partCount >= MAX_SPLIT_PARTS) {
    return null;
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="text-muted-foreground"
      onClick={onAdd}
    >
      <Plus className="h-4 w-4 mr-1.5" />
      {t('expenses.split.addPart')}
    </Button>
  );
};

const renderRemaining = (remaining: number, currency: string, t: TranslateFunction) => {
  const settled = isSettled(remaining);

  return (
    <p
      className={cn(
        'text-sm tabular-nums',
        settled && 'text-muted-foreground',
        !settled && 'text-destructive-ink',
      )}
    >
      {t('expenses.split.remaining', {
        amount: formatCurrency(remaining, currency),
      })}
    </p>
  );
};
