import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent } from '@/common/ui/dialog';
import { IncomeForm } from '@/pages/income/components/IncomeForm';
import type { Expense } from '@/types/Expense';

export type IncomeFormDialogProps = {
  open: boolean;
  income: Expense | undefined;
  onClose: () => void;
};

export const IncomeFormDialog = ({ open, income, onClose }: IncomeFormDialogProps) => {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="gap-0 p-0 sm:max-w-[500px]"
        aria-describedby="income-form-description"
        onOpenChange={onClose}
        onFocusOutside={(e) => e.preventDefault()}
      >
        <div id="income-form-description" className="sr-only">
          {t('income.formDescription')}
        </div>
        <IncomeForm income={income} onClose={onClose} />
      </DialogContent>
    </Dialog>
  );
};
