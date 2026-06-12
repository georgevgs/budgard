import { useRef, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  RECEIPT_ALLOWED_TYPES,
  RECEIPT_MAX_FILE_SIZE,
} from '@/lib/validations';
import { useToast } from '@/hooks/useToast';

type UseReceiptUploadArgs = {
  currentReceiptPath?: string | null;
  selectedFile: File | null;
  isRemoving: boolean;
  onFileSelect: (file: File | null) => void;
  onRemoveExisting: () => void;
};

export const useReceiptUpload = ({
  currentReceiptPath,
  selectedFile,
  isRemoving,
  onFileSelect,
  onRemoveExisting,
}: UseReceiptUploadArgs) => {
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

  const hasReceipt = Boolean(
    selectedFile || (currentReceiptPath && !isRemoving),
  );

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

  const openFilePicker = () => inputRef.current?.click();

  return {
    previewUrl,
    hasReceipt,
    inputRef,
    handleChange,
    handleDrop,
    handleClear,
    openFilePicker,
  };
};
