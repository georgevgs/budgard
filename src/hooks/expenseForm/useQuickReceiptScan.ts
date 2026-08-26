import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useProGate } from '@/hooks/pro/useProGate';
import { useToast } from '@/hooks/useToast';
import type { ReceiptOptions } from '@/hooks/dataOps/useExpenseOps';
import { toIsoDate, todayIso } from '@/lib/dates';
import { parseReceiptText } from '@/lib/receiptParse';
import {
  RECEIPT_ALLOWED_TYPES,
  RECEIPT_MAX_FILE_SIZE,
} from '@/lib/validations';
import {
  resolveOcrLanguages,
  runReceiptOcr,
  type OcrRunHandle,
} from '@/services/ocrService';

type Params = {
  isOpen: boolean;
  amountIsEmpty: boolean;
  date: string;
  name: string;
  setAmount: (amount: number) => void;
  setDate: (date: string) => void;
  setName: (name: string) => void;
};

export const useQuickReceiptScan = ({
  isOpen,
  amountIsEmpty,
  date,
  name,
  setAmount,
  setDate,
  setName,
}: Params) => {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const { allow } = useProGate();
  const handleRef = useRef<OcrRunHandle | null>(null);
  const targetRef = useRef<PrefillTarget>({
    amountIsEmpty,
    date,
    name,
    setAmount,
    setDate,
    setName,
  });
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (wasOpen !== isOpen) {
    setWasOpen(isOpen);
    if (!isOpen) {
      setReceiptFile(null);
      setIsScanning(false);
      setProgress(0);
    }
  }

  useEffect(() => {
    targetRef.current = {
      amountIsEmpty,
      date,
      name,
      setAmount,
      setDate,
      setName,
    };
  }, [amountIsEmpty, date, name, setAmount, setDate, setName]);

  useEffect(() => {
    if (!isOpen) {
      void handleRef.current?.cancel();
      handleRef.current = null;
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      void handleRef.current?.cancel();
    };
  }, []);

  const openPicker = (input?: HTMLInputElement | null) => {
    if (!allow('receiptScan')) {

      return;
    }

    input?.click();
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !validate(file, toast, t)) {
      return;
    }

    setReceiptFile(file);
    void scan(file);
  };

  const scan = async (file: File) => {
    void handleRef.current?.cancel();
    setIsScanning(true);
    setProgress(0);
    const handle = runReceiptOcr(
      file,
      resolveOcrLanguages(i18n.language),
      setProgress,
    );
    handleRef.current = handle;

    try {
      const text = await handle.promise;
      if (text === null) {
        return;
      }

      const count = prefill(text, targetRef.current);
      if (count === 0) {
        toast({ description: t('receipt.scanNoData') });

        return;
      }

      toast({ description: t('receipt.scanSuccess', { count }) });
    } catch {
      toast({ variant: 'destructive', description: t('receipt.scanFailed') });
    } finally {
      if (handleRef.current === handle) {
        handleRef.current = null;
        setIsScanning(false);
        setProgress(0);
      }
    }
  };

  const cancel = () => {
    void handleRef.current?.cancel();
  };

  return {
    receiptFile,
    isScanning,
    progress,
    receiptOptions: buildReceiptOptions(receiptFile),
    openPicker,
    handleChange,
    cancel,
  };
};

export type QuickReceiptScanApi = ReturnType<typeof useQuickReceiptScan>;

// --- Helpers ---

type PrefillTarget = Omit<Params, 'isOpen'>;
type Toast = ReturnType<typeof useToast>['toast'];
type TFunc = (key: string, options?: Record<string, unknown>) => string;

const validate = (file: File, toast: Toast, t: TFunc): boolean => {
  if (!RECEIPT_ALLOWED_TYPES.includes(file.type)) {
    toast({ variant: 'destructive', description: t('receipt.invalidType') });

    return false;
  }
  if (file.size > RECEIPT_MAX_FILE_SIZE) {
    toast({
      variant: 'destructive',
      description: t('receipt.fileTooLarge'),
    });

    return false;
  }

  return true;
};

const prefill = (text: string, target: PrefillTarget): number => {
  const parsed = parseReceiptText(text);
  let count = 0;

  if (parsed.amount !== null && target.amountIsEmpty) {
    target.setAmount(parsed.amount);
    count += 1;
  }
  if (parsed.merchant !== null && target.name.trim() === '') {
    target.setName(parsed.merchant);
    count += 1;
  }
  if (parsed.date !== null && target.date === todayIso()) {
    const parsedDate = toIsoDate(parsed.date);
    if (parsedDate !== target.date) {
      target.setDate(parsedDate);
      count += 1;
    }
  }

  return count;
};

const buildReceiptOptions = (
  receiptFile: File | null,
): ReceiptOptions | undefined => {
  if (!receiptFile) {
    return undefined;
  }

  return {
    receiptFile,
    removeExistingReceipt: false,
    existingReceiptPath: null,
  };
};
