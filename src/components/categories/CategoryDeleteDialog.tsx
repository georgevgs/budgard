import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format, type Locale } from 'date-fns';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { parseIsoDate } from '@/lib/dates';
import { useDateLocale } from '@/hooks/useDateLocale';
import type { Category } from '@/types/Category';
import type { CategoryImpact } from '@/lib/categoryDeleteImpact';

const NONE = 'none';

type Props = {
  open: boolean;
  category: Category | null;
  impact: CategoryImpact | null;
  mergeCandidates: Category[];
  currency: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: (destinationCategoryId: string | null) => void;
};

const CategoryDeleteDialog = ({
  open,
  category,
  impact,
  mergeCandidates,
  currency,
  onOpenChange,
  onConfirm,
}: Props) => {
  const { t } = useTranslation();
  const dateLocale = useDateLocale();
  const [destination, setDestination] = useState(NONE);
  // Reset the picker whenever the dialog is retargeted at a different
  // category, without an effect: React runs this during render, so the reset
  // lands before the stale value ever paints for the new category.
  const [lastCategoryId, setLastCategoryId] = useState(category?.id);
  if (category?.id !== lastCategoryId) {
    setLastCategoryId(category?.id);
    setDestination(NONE);
  }

  const handleConfirm = () => {
    if (destination === NONE) {
      onConfirm(null);

      return;
    }

    onConfirm(destination);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        className="sm:max-w-[425px]"
        onOpenChange={onOpenChange}
      >
        <AlertDialogHeader data-draggable-area>
          <AlertDialogTitle>{t('categories.deleteCategory')}</AlertDialogTitle>
          <AlertDialogDescription>
            {renderImpactSummary(category, impact, currency, dateLocale, t)}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-1">
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            {t('categories.moveTransactionsTo')}
          </label>
          <Select value={destination} onValueChange={setDestination}>
            <SelectTrigger className="h-10 w-full rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>{t('expenses.noCategory')}</SelectItem>
              {mergeCandidates.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
          <Button
            onClick={handleConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {getConfirmLabel(destination, t)}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default CategoryDeleteDialog;

// --- Helpers ---

type TFunc = (key: string, options?: Record<string, unknown>) => string;

const getConfirmLabel = (destination: string, t: TFunc): string => {
  if (destination === NONE) {
    return t('common.delete');
  }

  return t('categories.moveAndDelete');
};

const renderImpactSummary = (
  category: Category | null,
  impact: CategoryImpact | null,
  currency: string,
  dateLocale: Locale,
  t: TFunc,
) => {
  if (!impact || impact.count === 0 || !impact.earliestDate) {
    return t('categories.deleteConfirmation', { name: category?.name });
  }

  return t('categories.deleteImpactSummary', {
    count: impact.count,
    amount: formatCurrency(impact.total, currency),
    date: format(parseIsoDate(impact.earliestDate), 'PP', {
      locale: dateLocale,
    }),
  });
};
