import { useRef, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import Check from 'lucide-react/dist/esm/icons/check';
import ScanText from 'lucide-react/dist/esm/icons/scan-text';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { QuickReceiptScanApi } from '@/hooks/expenseForm/useQuickReceiptScan';
import { RECEIPT_ALLOWED_TYPES } from '@/lib/validations';

type Props = {
  scan: QuickReceiptScanApi;
};

const QuickReceiptScanAction = ({ scan }: Props) => {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="mt-3">
      <input
        ref={inputRef}
        type="file"
        accept={RECEIPT_ALLOWED_TYPES.join(',')}
        capture="environment"
        className="sr-only"
        onChange={scan.handleChange}
      />
      {renderControl(scan, inputRef, t)}
    </div>
  );
};

export default QuickReceiptScanAction;

// --- Helpers ---

type TFunc = (key: string) => string;
type InputRef = RefObject<HTMLInputElement | null>;

const renderControl = (
  scan: QuickReceiptScanApi,
  inputRef: InputRef,
  t: TFunc,
) => {
  if (scan.isScanning) {
    return (
      <div className="flex items-center gap-3" aria-live="polite">
        <Progress
          value={scan.progress}
          className="h-1.5 flex-1"
          aria-label={t('receipt.scanning')}
        />
        <Button type="button" variant="ghost" size="sm" onClick={scan.cancel}>
          {t('receipt.cancelScan')}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="rounded-full"
        onClick={() => scan.openPicker(inputRef.current)}
      >
        <ScanText className="mr-2 h-4 w-4" />
        {getButtonLabel(scan.receiptFile, t)}
      </Button>
      {renderAttached(scan.receiptFile, t)}
    </div>
  );
};

const getButtonLabel = (file: File | null, t: TFunc): string => {
  if (file) {
    return t('receipt.changeReceipt');
  }

  return t('receipt.scanReceipt');
};

const renderAttached = (file: File | null, t: TFunc) => {
  if (!file) {
    return null;
  }

  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground">
      <Check className="h-3.5 w-3.5" aria-hidden="true" />
      {t('receipt.attached')}
    </span>
  );
};
