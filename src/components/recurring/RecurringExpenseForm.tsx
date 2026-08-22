import type { ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDialogDirty } from '@/hooks/useDialogDirty';
import { parseISO } from 'date-fns';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import {
  DialogTitle,
  DialogHeader,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import RecurringExpenseFields from '@/components/recurring/RecurringExpenseFields';
import RecurringScheduleFields from '@/components/recurring/RecurringScheduleFields';
import { useAuth } from '@/hooks/useAuth';
import { amountToInput } from '@/lib/utils';
import {
  recurringExpenseSchema,
  type RecurringExpenseFormData,
} from '@/lib/validations';
import type { RecurringExpense } from '@/types/RecurringExpense';
import type { Category } from '@/types/Category';
import type { Account } from '@/types/Account';
import { useTranslation } from 'react-i18next';

type RecurringExpenseFormProps = {
  expense?: RecurringExpense;
  categories: Category[];
  investmentAccounts?: Account[];
  type?: 'expense' | 'income';
  onSubmit: (values: RecurringExpenseFormData) => Promise<void>;
  onClose: () => void;
};

const RecurringExpenseForm = ({
  expense,
  categories,
  investmentAccounts = [],
  type = 'expense',
  onSubmit,
  onClose,
}: RecurringExpenseFormProps) => {
  const { session } = useAuth();
  const { t } = useTranslation();

  const form = useForm<RecurringExpenseFormData>({
    resolver: zodResolver(recurringExpenseSchema),
    mode: 'onTouched',
    defaultValues: {
      amount: resolveAmountDefault(expense),
      description: expense?.description ?? '',
      category_id: expense?.category_id ?? 'none',
      frequency: expense?.frequency ?? 'monthly',
      start_date: resolveStartDate(expense),
      end_date: resolveEndDate(expense),
      linked_account_id: expense?.linked_account_id ?? null,
    },
  });

  useDialogDirty(form.formState.isDirty);

  const isExpense = type === 'expense';
  const showLinkedAccount = isExpense && investmentAccounts.length > 0;

  const handleSubmit = async (values: RecurringExpenseFormData) => {
    if (!session?.user?.id) return;
    await onSubmit(values);
  };

  const isIncome = type === 'income';
  const titleSuffix = getTitleSuffix(isIncome, t);
  const formTitle = getFormTitle(Boolean(expense), titleSuffix, t);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex justify-center pt-3 pb-2 sm:hidden" data-drag-handle>
        <div className="w-12 h-1.5 bg-muted-foreground/20 rounded-full" />
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div
            className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6"
            style={{ touchAction: 'pan-y' }}
          >
            <DialogHeader className="pb-4" data-draggable-area>
              <DialogTitle className="text-xl">{formTitle}</DialogTitle>
              <DialogDescription>
                {t('recurring.formDescription')}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pb-4">
              <RecurringExpenseFields form={form} categories={categories} />

              <RecurringScheduleFields
                form={form}
                isEditing={Boolean(expense)}
                showLinkedAccount={showLinkedAccount}
                investmentAccounts={investmentAccounts}
              />
            </div>
          </div>

          {renderActions(
            form.formState.isSubmitting,
            form.formState.isValid,
            Boolean(expense),
            onClose,
            t,
          )}
        </form>
      </Form>
    </div>
  );
};

export default RecurringExpenseForm;

// ─── Helper render functions ──────────────────────────────────────────────────

type TranslateFunction = (
  key: string,
  options?: Record<string, unknown>,
) => string;

const renderActions = (
  isSubmitting: boolean,
  isValid: boolean,
  isEditing: boolean,
  onClose: () => void,
  t: TranslateFunction,
) => (
  <div className="flex shrink-0 justify-end gap-2 border-t border-border/50 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:pb-3">
    <Button type="button" variant="outline" onClick={onClose}>
      {t('common.cancel')}
    </Button>
    <Button type="submit" disabled={isSubmitting || !isValid}>
      {renderSubmitLabel(isSubmitting, isEditing, t)}
    </Button>
  </div>
);

const getTitleSuffix = (isIncome: boolean, t: TranslateFunction): string => {
  if (isIncome) {
    return t('recurring.income.suffix');
  }

  return t('recurring.expensesTitle');
};

const getFormTitle = (
  isEditing: boolean,
  titleSuffix: string,
  t: TranslateFunction,
): string => {
  if (isEditing) {
    return `${t('recurring.formEdit')} — ${titleSuffix}`;
  }

  return `${t('recurring.formAdd')} — ${titleSuffix}`;
};

const resolveAmountDefault = (
  expense: RecurringExpense | undefined,
): string => {
  if (expense) {
    return amountToInput(expense.amount);
  }

  return '';
};

const resolveStartDate = (expense: RecurringExpense | undefined): Date => {
  if (expense) {
    return parseISO(expense.start_date);
  }

  return new Date();
};

const resolveEndDate = (
  expense: RecurringExpense | undefined,
): Date | undefined => {
  if (expense?.end_date) {
    return parseISO(expense.end_date);
  }

  return undefined;
};

const renderSubmitLabel = (
  isSubmitting: boolean,
  isEditing: boolean,
  t: TranslateFunction,
): ReactNode => {
  if (isSubmitting) {
    return (
      <>
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        {t('common.saving')}
      </>
    );
  }

  if (isEditing) return t('recurring.update');

  return t('recurring.create');
};
