import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogTitle } from '@/common/ui/dialog';
import { Button } from '@/common/ui/button';
import { AmountKeypad } from '@/pages/expenses/components/AmountKeypad';
import { QuickAddCategories } from '@/pages/expenses/components/QuickAddCategories';
import { QuickAddName } from '@/pages/expenses/components/QuickAddName';
import { QuickAddTemplates } from '@/pages/expenses/components/QuickAddTemplates';
import { QuickReceiptScanAction } from '@/pages/expenses/components/QuickReceiptScanAction';
import { useQuickAddDraft } from '@/pages/expenses/hooks/useQuickAddDraft';
import { useQuickReceiptScan } from '@/pages/expenses/hooks/useQuickReceiptScan';
import { cn, formatCurrency } from '@/constants/utils';
import type { ReceiptOptions } from '@/common/hooks/dataOps/useExpenseOps';
import type { ExpenseWritePayload } from '@/common/api/dataService';
import type { ExpenseTemplate } from '@/types/ExpenseTemplate';

type QuickAddSheetProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (
    data: ExpenseWritePayload,
    expenseId?: string,
    receiptOptions?: ReceiptOptions,
  ) => void;
  onOpenFullForm: (draft: ExpenseWritePayload, receiptFile?: File) => void;
  onUseTemplate: (template: ExpenseTemplate) => void;
};

// An amount, a name and a category. The full form is still there behind "More
// details" for the expense that needs a date, a tag or a receipt — but it is
// no longer the toll every coffee has to pay.
export const QuickAddSheet = ({
  open,
  onClose,
  onSubmit,
  onOpenFullForm,
  onUseTemplate,
}: QuickAddSheetProps) => {
  const { t } = useTranslation();
  const draft = useQuickAddDraft({ isOpen: open, onSubmit, onClose });
  const receiptScan = useQuickReceiptScan({
    isOpen: open,
    isAmountEmpty: draft.pad.isEmpty,
    date: draft.date,
    name: draft.name,
    setAmount: draft.pad.setAmount,
    setDate: draft.setDate,
    setName: draft.setName,
  });

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
          <div className="grid grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-center gap-x-2 py-5">
            <span aria-hidden="true" />
            <p
              data-draggable-area
              className={cn(
                'min-w-0 text-center type-figure-xl',
                amountTone(draft.pad.isEmpty),
              )}
              aria-live="polite"
            >
              {formatCurrency(draft.pad.amount, draft.currency)}
            </p>
            <QuickReceiptScanAction scan={receiptScan} />
          </div>

          {renderTemplates(open, onUseTemplate, onClose)}

          <QuickAddName
            value={draft.name}
            suggestions={draft.suggestions}
            errorKey={draft.nameErrorKey}
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

          {renderActions(
            draft,
            () =>
              openFullForm(
                draft.toFullForm(),
                receiptScan.receiptFile,
                onOpenFullForm,
              ),
            receiptScan.receiptOptions,
            t,
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

type Draft = ReturnType<typeof useQuickAddDraft>;

const renderTemplates = (
  isOpen: boolean,
  onUse: (template: ExpenseTemplate) => void,
  onClose: () => void,
) => {
  if (!isOpen) {
    return null;
  }

  return <QuickAddTemplates onUse={onUse} onClose={onClose} />;
};

const renderActions = (
  draft: Draft,
  onMoreDetails: () => void,
  receiptOptions: ReceiptOptions | undefined,
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
      onClick={() => draft.submit(receiptOptions)}
    >
      {t('common.save')}
    </Button>
  </div>
);

const openFullForm = (
  draft: ExpenseWritePayload,
  receiptFile: File | null,
  onOpen: (draft: ExpenseWritePayload, receiptFile?: File) => void,
) => {
  if (receiptFile) {
    onOpen(draft, receiptFile);

    return;
  }

  onOpen(draft);
};

// A zero sits back until there is a real number to show, so the sheet opens
// looking like an empty field rather than a €0.00 expense.
const amountTone = (isEmpty: boolean): string => {
  if (isEmpty) {
    return 'text-muted-foreground/40';
  }

  return 'text-foreground';
};
