import { useRef, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import Check from 'lucide-react/dist/esm/icons/check';
import ScanText from 'lucide-react/dist/esm/icons/scan-text';
import X from 'lucide-react/dist/esm/icons/x';
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
    <>
      <input
        ref={inputRef}
        type="file"
        accept={RECEIPT_ALLOWED_TYPES.join(',')}
        capture="environment"
        className="sr-only"
        aria-label={getButtonLabel(scan.receiptFile, t)}
        onChange={scan.handleChange}
      />
      {renderControl(scan, inputRef, t)}
    </>
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
      <>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="tile rounded-full text-muted-foreground hover:text-foreground"
          onClick={scan.cancel}
          aria-label={t('receipt.cancelScan')}
          title={t('receipt.cancelScan')}
        >
          <X className="h-4.5 w-4.5" aria-hidden="true" />
        </Button>
        <div
          className="col-span-3 mt-1 flex items-center gap-3"
          aria-live="polite"
        >
          <Progress
            value={scan.progress}
            className="h-1.5 flex-1"
            aria-label={t('receipt.scanning')}
          />
          <span className="w-8 text-right text-xs tabular-nums text-muted-foreground">
            {scan.progress}%
          </span>
        </div>
      </>
    );
  }

  const label = getButtonLabel(scan.receiptFile, t);

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="tile relative rounded-full text-muted-foreground hover:text-foreground"
      onClick={() => scan.openPicker(inputRef.current)}
      aria-label={label}
      title={label}
    >
      <ScanText className="h-4.5 w-4.5" aria-hidden="true" />
      {renderAttached(scan.receiptFile)}
    </Button>
  );
};

const getButtonLabel = (file: File | null, t: TFunc): string => {
  if (file) {
    return t('receipt.changeReceipt');
  }

  return t('receipt.scanReceipt');
};

const renderAttached = (file: File | null) => {
  if (!file) {
    return null;
  }

  return (
    <span
      className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-foreground text-background ring-2 ring-background"
      aria-hidden="true"
    >
      <Check className="h-2.5 w-2.5" />
    </span>
  );
};
