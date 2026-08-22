import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDialogDirty } from '@/hooks/useDialogDirty';
import { budgetSchema, type BudgetFormData } from '@/lib/validations';
import {
  amountToInput,
  formatCurrencyInput,
  parseCurrencyInput,
} from '@/lib/utils';

type Params = {
  isOpen: boolean;
  currentBudget: number | null;
  onSubmit: (amount: number) => Promise<void>;
  onClose: () => void;
};

// The dialog is reused across opens, so react-hook-form keeps whatever was
// typed last time unless it is reset — hence the effect on `isOpen`.
export const useBudgetForm = ({
  isOpen,
  currentBudget,
  onSubmit,
  onClose,
}: Params) => {
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting, isDirty, isValid },
  } = useForm<BudgetFormData>({
    resolver: zodResolver(budgetSchema),
    mode: 'onTouched',
    defaultValues: { amount: getInitialAmount(currentBudget) },
  });

  useDialogDirty(isDirty);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    reset({ amount: getInitialAmount(currentBudget) });
  }, [isOpen, currentBudget, reset]);

  const submit = handleSubmit(async (data: BudgetFormData) => {
    await onSubmit(parseCurrencyInput(data.amount));
    onClose();
  });

  // Formatting on every keystroke keeps the grouping separators correct as the
  // number grows, which a blur-time format cannot do.
  const handleAmountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setValue('amount', formatCurrencyInput(event.target.value), {
      shouldValidate: true,
    });
  };

  return {
    register,
    submit,
    handleAmountChange,
    errorMessage: errors.amount?.message,
    isSubmitting,
    isValid,
  };
};

// --- Helpers ---

const getInitialAmount = (currentBudget: number | null): string => {
  if (!currentBudget) {
    return '';
  }

  return amountToInput(currentBudget);
};
