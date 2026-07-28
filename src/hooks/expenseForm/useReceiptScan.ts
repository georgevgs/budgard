import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { isSameDay } from 'date-fns';
import type { UseFormReturn } from 'react-hook-form';
import { useIsPro } from '@/hooks/useIsPro';
import { useUpgradeDialog } from '@/contexts/UpgradeDialogContext';
import { useToast } from '@/hooks/useToast';
import { parseReceiptText } from '@/lib/receiptParse';
import { formatCurrencyInput } from '@/lib/utils';
import {
  resolveOcrLanguages,
  runReceiptOcr,
  type OcrRunHandle,
} from '@/services/ocrService';
import type { ExpenseFormData } from '@/lib/validations';

type UseReceiptScanArgs = {
  form: UseFormReturn<ExpenseFormData>;
  receiptFile: File | null;
};

export const useReceiptScan = ({ form, receiptFile }: UseReceiptScanArgs) => {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const isPro = useIsPro();
  const { openUpgrade } = useUpgradeDialog();
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const handleRef = useRef<OcrRunHandle | null>(null);

  // Closing the form dialog mid-scan unmounts the hook — stop the worker too.
  useEffect(() => {
    return () => {
      void handleRef.current?.cancel();
    };
  }, []);

  // Changing or removing the image invalidates an in-flight scan.
  useEffect(() => {
    void handleRef.current?.cancel();
  }, [receiptFile]);

  const handleScan = async () => {
    if (!isPro) {
      openUpgrade();

      return;
    }

    if (!receiptFile || isScanning) {
      return;
    }

    setIsScanning(true);
    setProgress(0);

    const handle = runReceiptOcr(
      receiptFile,
      resolveOcrLanguages(i18n.language),
      setProgress,
    );
    handleRef.current = handle;

    try {
      const text = await handle.promise;

      // null means cancelled — the user asked for the stop, so stay silent.
      if (text === null) {
        return;
      }

      const filledCount = prefillFields(form, text);

      if (filledCount === 0) {
        toast({ description: t('receipt.scanNoData') });

        return;
      }

      toast({ description: t('receipt.scanSuccess', { count: filledCount }) });
    } catch {
      toast({ variant: 'destructive', description: t('receipt.scanFailed') });
    } finally {
      if (handleRef.current === handle) {
        handleRef.current = null;
      }
      setIsScanning(false);
      setProgress(0);
    }
  };

  const handleCancel = () => {
    void handleRef.current?.cancel();
  };

  return {
    isScanning,
    progress,
    handleScan,
    handleCancel,
  };
};

export type ReceiptScanApi = ReturnType<typeof useReceiptScan>;

// --- Helpers ---

// Fills only fields the user hasn't provided: empty amount/description, and a
// date still sitting on the untouched new-expense default (today). Editing an
// existing expense marks nothing empty, so a scan never clobbers saved data.
const prefillFields = (
  form: UseFormReturn<ExpenseFormData>,
  text: string,
): number => {
  const parsed = parseReceiptText(text);
  let filled = 0;

  if (parsed.amount !== null && form.getValues('amount').trim() === '') {
    // toFixed keeps the cents a receipt always carries (12,50 — not 12,5).
    form.setValue(
      'amount',
      formatCurrencyInput(parsed.amount.toFixed(2).replace('.', ',')),
      { shouldValidate: true, shouldDirty: true },
    );
    filled += 1;
  }

  if (parsed.merchant !== null && form.getValues('description').trim() === '') {
    form.setValue('description', parsed.merchant, {
      shouldValidate: true,
      shouldDirty: true,
    });
    filled += 1;
  }

  if (parsed.date !== null && canFillDate(form, parsed.date)) {
    form.setValue('date', parsed.date, {
      shouldValidate: true,
      shouldDirty: true,
    });
    filled += 1;
  }

  return filled;
};

const canFillDate = (
  form: UseFormReturn<ExpenseFormData>,
  parsedDate: Date,
): boolean => {
  if (form.formState.dirtyFields.date) {
    return false;
  }

  const currentDate = form.getValues('date');

  // Only the untouched new-expense default (today) is considered "empty",
  // and a receipt dated today would be a visual no-op — skip it.
  return isSameDay(currentDate, new Date()) && !isSameDay(parsedDate, currentDate);
};
