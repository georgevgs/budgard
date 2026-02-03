import { useRef, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RECEIPT_ALLOWED_TYPES, RECEIPT_MAX_FILE_SIZE } from '@/lib/validations';
import { useToast } from '@/hooks/useToast';

interface ReceiptUploadProps {
  currentReceiptPath?: string | null;
  selectedFile: File | null;
  isRemoving: boolean;
  onFileSelect: (file: File | null) => void;
  onRemoveExisting: () => void;
}

const ReceiptUpload = ({
  currentReceiptPath,
  selectedFile,
  isRemoving,
  onFileSelect,
  onRemoveExisting,
}: ReceiptUploadProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const previewUrl = useMemo(() => {
    if (selectedFile) return URL.createObjectURL(selectedFile);
    return null;
  }, [selectedFile]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const hasReceipt = selectedFile || (currentReceiptPath && !isRemoving);

  const validateAndSelect = (file: File) => {
    if (!RECEIPT_ALLOWED_TYPES.includes(file.type)) {
      toast({
        variant: 'destructive',
        description: t('receipt.invalidType'),
      });
      return;
    }
    if (file.size > RECEIPT_MAX_FILE_SIZE) {
      toast({
        variant: 'destructive',
        description: t('receipt.fileTooLarge'),
      });
      return;
    }
    onFileSelect(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) validateAndSelect(file);
    // Reset input so re-selecting same file triggers change
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) validateAndSelect(file);
  };

  const handleClear = () => {
    if (selectedFile) {
      onFileSelect(null);
    } else if (currentReceiptPath) {
      onRemoveExisting();
    }
  };

  if (hasReceipt) {
    return (
      <div className="flex items-center gap-3 rounded-md border border-border p-3">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt={t('receipt.receiptImage')}
            className="h-12 w-12 rounded object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded bg-muted">
            <Camera className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {selectedFile ? selectedFile.name : t('receipt.receipt')}
          </p>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            {t('receipt.changeReceipt')}
          </button>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 flex-shrink-0"
          onClick={handleClear}
          aria-label={t('receipt.removeReceipt')}
        >
          <X className="h-4 w-4" />
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleChange}
          className="hidden"
        />
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
      }}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className="flex h-20 cursor-pointer items-center justify-center gap-2 rounded-md border-2 border-dashed border-muted-foreground/25 text-muted-foreground transition-colors hover:border-muted-foreground/50 hover:text-foreground"
    >
      <Camera className="h-5 w-5" />
      <span className="text-sm">{t('receipt.addReceipt')}</span>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleChange}
        className="hidden"
      />
    </div>
  );
};

export default ReceiptUpload;
