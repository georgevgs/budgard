import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import AmountKeypad from '@/components/expenses/AmountKeypad';
import QuickAddCategories from '@/components/expenses/QuickAddCategories';
import { useQuickAddDraft } from '@/hooks/expenseForm/useQuickAddDraft';
import { cn, formatCurrency } from '@/lib/utils';
import type { ExpenseWritePayload } from '@/services/dataService';

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ExpenseWritePayload) => void;
  onOpenFullForm: (draft: ExpenseWritePayload) => void;
};

// Two taps and a number for the common case. The full form is still there
// behind "More details" for the expense that needs a date, a tag or a
// receipt — but it is no longer the toll every coffee has to pay.
const QuickAddSheet = ({ open, onClose, onSubmit, onOpenFullForm }: Props) => {
  const { t } = useTranslation();
  const draft = useQuickAddDraft({ isOpen: open, onSubmit, onClose });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-[420px] p-0 gap-0 [&>button]:hidden"
        onOpenChange={onClose}
      >
        <div className="flex justify-center pt-3 pb-1" data-drag-handle>
          <div className="h-1.5 w-12 rounded-full bg-muted-foreground/20" />
        </div>

        <div className="px-5 pb-5" data-draggable-area>
          <DialogTitle className="sr-only">
            {t('expenses.addExpense')}
          </DialogTitle>

          <p
            className={cn(
              'py-5 text-center font-display text-[2.75rem] font-semibold leading-none tabular-nums',
              amountTone(draft.pad.isEmpty),
            )}
            aria-live="polite"
          >
            {formatCurrency(draft.pad.amount, draft.currency)}
          </p>

          <QuickAddCategories
            categories={draft.categories}
            selectedId={draft.categoryId}
            onSelect={draft.selectCategory}
          />

          <div className="mt-4">
            <AmountKeypad pad={draft.pad} />
          </div>

          <div className="mt-4 flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              className="shrink-0 text-muted-foreground"
              onClick={() => onOpenFullForm(draft.toFullForm())}
            >
              {t('expenses.quickAdd.moreDetails')}
            </Button>
            <Button
              type="button"
              className="flex-1 rounded-full"
              disabled={!draft.canSave}
              onClick={draft.submit}
            >
              {t('common.save')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuickAddSheet;

// --- Helpers ---

// A zero sits back until there is a real number to show, so the sheet opens
// looking like an empty field rather than a €0.00 expense.
const amountTone = (isEmpty: boolean): string => {
  if (isEmpty) {
    return 'text-muted-foreground/40';
  }

  return 'text-foreground';
};
