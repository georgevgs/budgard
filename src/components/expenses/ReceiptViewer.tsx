import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { getReceiptUrl } from '@/services/receiptService';

interface ReceiptViewerProps {
  receiptPath: string;
  open: boolean;
  onClose: () => void;
}

const ReceiptViewer = ({ receiptPath, open, onClose }: ReceiptViewerProps) => {
  const { t } = useTranslation();
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      if (url) URL.revokeObjectURL(url);
      setUrl(null);
      setError(false);
      return;
    }

    setLoading(true);
    setError(false);

    getReceiptUrl(receiptPath)
      .then(setUrl)
      .catch(() => setError(true))
      .finally(() => setLoading(false));

    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [open, receiptPath]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{t('receipt.viewReceipt')}</DialogTitle>
          <DialogDescription className="sr-only">
            {t('receipt.receiptImage')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-center min-h-[200px]">
          {loading && <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />}
          {error && (
            <p className="text-sm text-destructive">{t('receipt.loadError')}</p>
          )}
          {url && !error && (
            <img
              src={url}
              alt={t('receipt.receiptImage')}
              className="max-h-[70vh] w-full object-contain rounded"
              onError={() => setError(true)}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReceiptViewer;
