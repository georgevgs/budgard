import { useTranslation } from 'react-i18next';
import type { UseFormReturn } from 'react-hook-form';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import { cn } from '@/lib/utils';
import ExpenseTagField from '@/components/expenses/ExpenseTagField';
import ReceiptUpload from '@/components/expenses/ReceiptUpload';
import {
  getDetailsRowsClass,
  renderDetailsToggleLabel,
} from '@/components/expenses/ExpensesForm.helpers';
import type { TagPickerApi } from '@/hooks/expenseForm/useTagPicker';
import { useReceiptScan } from '@/hooks/expenseForm/useReceiptScan';
import type { ExpenseFormData } from '@/lib/validations';

type Props = {
  form: UseFormReturn<ExpenseFormData>;
  tagPicker: TagPickerApi;
  showDetails: boolean;
  onToggleDetails: () => void;
  currentReceiptPath?: string | null;
  receiptFile: File | null;
  isRemovingReceipt: boolean;
  onReceiptSelect: (file: File | null) => void;
  onRemoveExistingReceipt: () => void;
};

const ExpenseFormDetails = ({
  form,
  tagPicker,
  showDetails,
  onToggleDetails,
  currentReceiptPath,
  receiptFile,
  isRemovingReceipt,
  onReceiptSelect,
  onRemoveExistingReceipt,
}: Props) => {
  const { t } = useTranslation();
  const scan = useReceiptScan({ form, receiptFile });

  return (
    <>
      <button
        type="button"
        onClick={onToggleDetails}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <ChevronDown
          className={cn(
            'h-4 w-4 transition-transform duration-200',
            showDetails && 'rotate-180',
          )}
        />
        {renderDetailsToggleLabel(showDetails, t)}
      </button>

      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-200',
          getDetailsRowsClass(showDetails),
        )}
      >
        <div className="overflow-hidden space-y-4">
          <ExpenseTagField form={form} tagPicker={tagPicker} />

          <ReceiptUpload
            currentReceiptPath={currentReceiptPath}
            selectedFile={receiptFile}
            isRemoving={isRemovingReceipt}
            onFileSelect={onReceiptSelect}
            onRemoveExisting={onRemoveExistingReceipt}
            scan={scan}
          />
        </div>
      </div>
    </>
  );
};

export default ExpenseFormDetails;
