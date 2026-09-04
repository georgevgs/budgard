import { useTranslation } from 'react-i18next';
import Camera from 'lucide-react/dist/esm/icons/camera';
import X from 'lucide-react/dist/esm/icons/x';
import { Button } from '@/components/ui/button';
import ReceiptScanButton from '@/components/expenses/ReceiptScanButton';
import { useReceiptUpload } from '@/hooks/expenseForm/useReceiptUpload';
import type { ReceiptScanApi } from '@/hooks/expenseForm/useReceiptScan';

type ReceiptUploadProps = {
  currentReceiptPath?: string | null;
  selectedFile: File | null;
  isRemoving: boolean;
  onFileSelect: (file: File | null) => void;
  onRemoveExisting: () => void;
  scan: ReceiptScanApi;
};

const ReceiptUpload = ({
  currentReceiptPath,
  selectedFile,
  isRemoving,
  onFileSelect,
  onRemoveExisting,
  scan,
}: ReceiptUploadProps) => {
  const { t } = useTranslation();
  const {
    previewUrl,
    hasReceipt,
    inputRef,
    handleChange,
    handleDrop,
    handleClear,
    openFilePicker,
  } = useReceiptUpload({
    currentReceiptPath,
    selectedFile,
    isRemoving,
    onFileSelect,
    onRemoveExisting,
  });

  if (hasReceipt) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-3 rounded-2xl border border-border/50 p-3">
          {renderThumbnail(previewUrl, t)}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {renderFileLabel(selectedFile, t)}
            </p>
            <button
              type="button"
              onClick={openFilePicker}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              {t('receipt.changeReceipt')}
            </button>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0"
            onClick={handleClear}
            aria-label={t('receipt.removeReceipt')}
          >
            <X className="h-4 w-4" />
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={handleChange}
            className="hidden"
          />
        </div>
        <ReceiptScanButton scan={scan} visible={Boolean(selectedFile)} />
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={openFilePicker}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') openFilePicker();
      }}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className="flex h-20 cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-muted-foreground/25 text-muted-foreground transition-colors hover:border-muted-foreground/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <Camera className="h-5 w-5" />
      <span className="text-sm">{t('receipt.addReceipt')}</span>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="hidden"
      />
    </div>
  );
};

export default ReceiptUpload;

// --- Helpers ---

type TranslateFunction = (key: string) => string;

const renderThumbnail = (previewUrl: string | null, t: TranslateFunction) => {
  if (previewUrl) {
    return (
      <img
        src={previewUrl}
        alt={t('receipt.receiptImage')}
        className="h-12 w-12 rounded object-cover"
      />
    );
  }

  return (
    <div className="flex h-12 w-12 items-center justify-center rounded bg-muted">
      <Camera className="h-5 w-5 text-muted-foreground" />
    </div>
  );
};

const renderFileLabel = (selectedFile: File | null, t: TranslateFunction) => {
  if (selectedFile) {
    return selectedFile.name;
  }

  return t('receipt.receipt');
};
