import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import AmountKeypad from '@/components/expenses/AmountKeypad';
import QuickAddCategories from '@/components/expenses/QuickAddCategories';
import QuickAddName from '@/components/expenses/QuickAddName';
import { useQuickAddDraft } from '@/hooks/expenseForm/useQuickAddDraft';
import { cn, formatCurrency } from '@/lib/utils';
import type { ExpenseWritePayload } from '@/services/dataService';

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ExpenseWritePayload) => void;
  onOpenFullForm: (draft: ExpenseWritePayload) => void;
};

// An amount, a name and a category. The full form is still there behind "More
// details" for the expense that needs a date, a tag or a receipt — but it is
// no longer the toll every coffee has to pay.
const QuickAddSheet = ({ open, onClose, onSubmit, onOpenFullForm }: Props) => {
  const { t } = useTranslation();
  const draft = useQuickAddDraft({ isOpen: open, onSubmit, onClose });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="gap-0 p-0 sm:max-w-[420px]"
        onOpenChange={onClose}
        onFocusOutside={(event) => event.preventDefault()}
      >
        <div className="flex justify-center pt-3 pb-1" data-drag-handle>
          <div className="h-1.5 w-12 rounded-full bg-muted-foreground/20" />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
          <DialogTitle className="sr-only">
            {t('expenses.addExpense')}
          </DialogTitle>

          {/* Only the amount drags the sheet. The strip and the keypad below
              are controls, and arming a dismissal on them is what made the
              category swipe feel like it was fighting back. */}
          <p
            data-draggable-area
            className={cn(
              'px-10 py-5 text-center type-figure-xl',
              amountTone(draft.pad.isEmpty),
            )}
            aria-live="polite"
          >
            {formatCurrency(draft.pad.amount, draft.currency)}
          </p>

          <QuickAddName
            value={draft.name}
            suggestions={draft.suggestions}
            onChange={draft.setName}
            onSelect={draft.applySuggestion}
          />

          <div className="mt-3">
            <QuickAddCategories
              categories={draft.categories}
              selectedId={draft.categoryId}
              onSelect={draft.selectCategory}
            />
          </div>

          <div className="mt-4">
            <AmountKeypad pad={draft.pad} />
          </div>

          {renderActions(draft, () => onOpenFullForm(draft.toFullForm()), t)}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuickAddSheet;

// --- Helpers ---

type Draft = ReturnType<typeof useQuickAddDraft>;

const renderActions = (
  draft: Draft,
  onMoreDetails: () => void,
  t: (key: string) => string,
) => (
  <div className="mt-4 flex items-center gap-3">
    <Button
      type="button"
      variant="ghost"
      className="shrink-0 text-muted-foreground"
      onClick={onMoreDetails}
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
);

// A zero sits back until there is a real number to show, so the sheet opens
// looking like an empty field rather than a €0.00 expense.
const amountTone = (isEmpty: boolean): string => {
  if (isEmpty) {
    return 'text-muted-foreground/40';
  }

  return 'text-foreground';
};
