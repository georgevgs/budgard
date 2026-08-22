import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import IncomeForm from '@/components/income/IncomeForm';
import type { Expense } from '@/types/Expense';

type Props = {
  open: boolean;
  income: Expense | undefined;
  onClose: () => void;
};

const IncomeFormDialog = ({ open, income, onClose }: Props) => {
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

export default IncomeFormDialog;
