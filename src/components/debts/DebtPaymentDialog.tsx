import { Dialog, DialogContent } from '@/components/ui/dialog';
import DebtPaymentForm from '@/components/debts/DebtPaymentForm';
import type { Debt } from '@/types/Debt';

type Props = {
  open: boolean;
  debt: Debt;
  onClose: () => void;
};

const DebtPaymentDialog = ({ open, debt, onClose }: Props) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-[500px] p-0 gap-0 [&>button]:hidden"
        onOpenChange={onClose}
        onFocusOutside={(e) => e.preventDefault()}
      >
        <DebtPaymentForm debt={debt} onClose={onClose} />
      </DialogContent>
    </Dialog>
  );
};

export default DebtPaymentDialog;
