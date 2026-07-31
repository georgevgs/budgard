import { useTranslation } from 'react-i18next';
import ScanText from 'lucide-react/dist/esm/icons/scan-text';
import X from 'lucide-react/dist/esm/icons/x';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { ReceiptScanApi } from '@/hooks/expenseForm/useReceiptScan';

type Props = {
  scan: ReceiptScanApi;
  visible: boolean;
};

const ReceiptScanButton = ({ scan, visible }: Props) => {
  const { t } = useTranslation();

  if (!visible) {
    return null;
  }

  if (scan.isScanning) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-border/50 p-3">
        <div className="flex-1 space-y-1.5">
          <p className="text-xs text-muted-foreground">
            {t('receipt.scanning')} {scan.progress}%
          </p>
          <Progress value={scan.progress} className="h-1.5" />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-10 w-10 shrink-0"
          onClick={scan.handleCancel}
          aria-label={t('receipt.cancelScan')}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="w-full"
      onClick={() => void scan.handleScan()}
    >
      <ScanText className="mr-2 h-4 w-4" />
      {t('receipt.scanReceipt')}
    </Button>
  );
};

export default ReceiptScanButton;
