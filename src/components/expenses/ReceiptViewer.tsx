import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
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
            {renderLoadingState(isLoading, t)}
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

// An image arriving is content loading, not a system operation, so it gets a
// placeholder in the receipt's own shape rather than a spinner. Portrait
// aspect, because that is what a photographed till receipt looks like.
const renderLoadingState = (loading: boolean, t: TranslateFunction) => {
  if (!loading) return null;

  return (
    <>
      <span role="status" className="sr-only">
        {t('receipt.receiptImage')}
      </span>
      <Skeleton className="h-[320px] w-full max-w-[240px] rounded-xl" />
    </>
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
      className="max-h-[70dvh] w-full object-contain rounded"
      onError={onError}
    />
  );
};
