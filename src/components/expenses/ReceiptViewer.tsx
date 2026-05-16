import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useReceiptUrl } from '@/hooks/useReceiptUrl';

type ReceiptViewerProps = {
  receiptPath: string;
  open: boolean;
  onClose: () => void;
}

const ReceiptViewer = ({ receiptPath, open, onClose }: ReceiptViewerProps) => {
  const { t } = useTranslation();
  const { url, isLoading, error } = useReceiptUrl(receiptPath, open);
  const [imageFailed, setImageFailed] = useState(false);
  const hasError = error || imageFailed;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="sm:max-w-[600px] p-0 gap-0"
        onOpenChange={(v) => !v && onClose()}
      >
        {/* Mobile drag handle */}
        <div
          className="flex justify-center pt-3 pb-2 sm:hidden"
          data-drag-handle
        >
          <div className="w-12 h-1.5 bg-muted-foreground/20 rounded-full" />
        </div>

        <div className="px-6 pb-6 pt-2 sm:pt-6">
          <DialogHeader data-draggable-area>
            <DialogTitle>{t('receipt.viewReceipt')}</DialogTitle>
            <DialogDescription className="sr-only">
              {t('receipt.receiptImage')}
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-center min-h-[200px] mt-4">
            {renderLoadingState(isLoading)}
            {renderErrorState(hasError, t)}
            {renderReceiptImage(url, hasError, () => setImageFailed(true), t)}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReceiptViewer;

// ─── Helper render functions ──────────────────────────────────────────────────

type TranslateFunction = (key: string) => string;

const renderLoadingState = (loading: boolean) => {
  if (!loading) return null;

  return (
    <div className="animate-spin">
      <Loader2 className="h-8 w-8 text-muted-foreground" />
    </div>
  );
};

const renderErrorState = (error: boolean, t: TranslateFunction) => {
  if (!error) return null;

  return (
    <p className="text-sm text-destructive">{t('receipt.loadError')}</p>
  );
};

const renderReceiptImage = (
  url: string | null,
  error: boolean,
  onError: () => void,
  t: TranslateFunction,
) => {
  if (!url || error) return null;

  return (
    <img
      src={url}
      alt={t('receipt.receiptImage')}
      className="max-h-[70vh] w-full object-contain rounded"
      onError={onError}
    />
  );
};
