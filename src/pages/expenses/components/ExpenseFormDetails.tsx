import { useTranslation } from 'react-i18next';
import type { UseFormReturn } from 'react-hook-form';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import { cn } from '@/constants/utils';
import { ExpenseTagField } from '@/pages/expenses/components/ExpenseTagField';
import { ReceiptUpload } from '@/pages/expenses/components/ReceiptUpload';
import {
  getDetailsRowsClass,
  renderDetailsToggleLabel,
} from '@/pages/expenses/components/ExpensesForm.helpers';
import type { TagPickerApi } from '@/pages/expenses/hooks/useTagPicker';
import { useReceiptScan } from '@/pages/expenses/hooks/useReceiptScan';
import type { ExpenseFormData } from '@/pages/expenses/validations';

type ExpenseFormDetailsProps = {
  form: UseFormReturn<ExpenseFormData>;
  tagPicker: TagPickerApi;
  shouldShowDetails: boolean;
  onToggleDetails: () => void;
  currentReceiptPath?: string | null;
  receiptFile: File | null;
  isRemovingReceipt: boolean;
  onReceiptSelect: (file: File | null) => void;
  onRemoveExistingReceipt: () => void;
};

export const ExpenseFormDetails = ({
  form,
  tagPicker,
  shouldShowDetails,
  onToggleDetails,
  currentReceiptPath,
  receiptFile,
  isRemovingReceipt,
  onReceiptSelect,
  onRemoveExistingReceipt,
}: ExpenseFormDetailsProps) => {
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
            shouldShowDetails && 'rotate-180',
          )}
        />
        {renderDetailsToggleLabel(shouldShowDetails, t)}
      </button>

      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-200',
          getDetailsRowsClass(shouldShowDetails),
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
