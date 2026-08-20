import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Plus from 'lucide-react/dist/esm/icons/plus';
import X from 'lucide-react/dist/esm/icons/x';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CurrencyInput } from '@/components/ui/currency-input';
import { useCategoriesData, useDataConfig } from '@/contexts/DataContext';
import { useExpenseOps } from '@/hooks/dataOps/useExpenseOps';
import { cn, formatCurrency, parseCurrencyInput } from '@/lib/utils';
import type { Category } from '@/types/Category';
import type { Expense } from '@/types/Expense';

const MAX_PARTS = 6;

type Part = {
  amount: string;
  category_id: string;
};

type Props = {
  expense: Expense;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const SplitExpenseDialog = ({ expense, open, onOpenChange }: Props) => {
  const { t } = useTranslation();
  const { defaultCurrency } = useDataConfig();
  const { expenseCategories } = useCategoriesData();
  const { handleExpenseSplit } = useExpenseOps();
  const [parts, setParts] = useState<Part[]>(() => buildInitialParts(expense));
  const [isSaving, setIsSaving] = useState(false);

  const [prevInputs, setPrevInputs] = useState({ open, expense });
  const inputsChanged =
    prevInputs.open !== open || prevInputs.expense !== expense;
  if (inputsChanged) {
    setPrevInputs({ open, expense });
    if (open) setParts(buildInitialParts(expense));
  }

  const remaining = expense.amount - sumParts(parts);
  const partsValid = parts.every((part) => parseCurrencyInput(part.amount) > 0);
  const canConfirm = partsValid && Math.abs(remaining) < 0.005 && !isSaving;

  const updatePart = (index: number, patch: Partial<Part>) => {
    setParts((prev) =>
      prev.map((part, i) => {
        if (i !== index) return part;

        return { ...part, ...patch };
      }),
    );
  };

  const handleConfirm = async () => {
    setIsSaving(true);
    try {
      await handleExpenseSplit(
        expense,
        parts.map((part) => ({
          amount: parseCurrencyInput(part.amount),
          category_id: normalizeCategoryId(part.category_id),
        })),
      );
      onOpenChange(false);
    } catch {
      // error toast handled by useExpenseOps
    }
    setIsSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[440px]"
        onOpenChange={onOpenChange}
      >
        <DialogHeader data-draggable-area className="pt-2">
          <DialogTitle>{t('expenses.split.title')}</DialogTitle>
          <DialogDescription>
            {t('expenses.split.description', {
              description: expense.description,
              amount: formatCurrency(expense.amount, defaultCurrency),
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 overflow-y-auto px-1">
          {parts.map((part, index) =>
            renderPartRow(
              part,
              index,
              parts.length,
              expenseCategories,
              defaultCurrency,
              t,
              updatePart,
              (i) => setParts((prev) => prev.filter((_, j) => j !== i)),
            ),
          )}

          {renderAddPartButton(parts.length, t, () =>
            setParts((prev) => [...prev, { amount: '', category_id: 'none' }]),
          )}

          {renderRemaining(remaining, defaultCurrency, t)}
        </div>

        <div className="flex gap-3 justify-end pb-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            {t('common.cancel')}
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={!canConfirm}>
            {t('expenses.split.confirm')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SplitExpenseDialog;

// ─── Helpers ─────────────────────────────────────────────────────────────────

type TFunc = (key: string, options?: Record<string, unknown>) => string;

const buildInitialParts = (expense: Expense): Part[] => {
  return [
    { amount: '', category_id: expense.category_id ?? 'none' },
    { amount: '', category_id: 'none' },
  ];
};

const sumParts = (parts: Part[]): number => {
  return parts.reduce((sum, part) => sum + parseCurrencyInput(part.amount), 0);
};

const normalizeCategoryId = (value: string): string | null => {
  if (value === 'none') {
    return null;
  }

  return value;
};

const renderPartRow = (
  part: Part,
  index: number,
  partCount: number,
  categories: Category[],
  currency: string,
  t: TFunc,
  onUpdate: (index: number, patch: Partial<Part>) => void,
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
  t: TFunc,
  onRemove: (index: number) => void,
) => {
  if (partCount <= 2) return null;

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
  t: TFunc,
  onAdd: () => void,
) => {
  if (partCount >= MAX_PARTS) return null;

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

const renderRemaining = (remaining: number, currency: string, t: TFunc) => {
  const settled = Math.abs(remaining) < 0.005;

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
