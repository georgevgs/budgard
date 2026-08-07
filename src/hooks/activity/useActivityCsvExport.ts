import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useCategoriesData,
  useTagsData,
} from '@/contexts/DataContext';
import { useUpgradeDialog } from '@/contexts/UpgradeDialogContext';
import { useIsPro } from '@/hooks/useIsPro';
import { useToast } from '@/hooks/useToast';
import { buildTransactionsCsv, downloadCsv } from '@/lib/csvExport';
import type { Expense } from '@/types/Expense';

export const useActivityCsvExport = (
  transactions: Expense[],
  exportScope: string,
) => {
  const { t } = useTranslation();
  const { categories } = useCategoriesData();
  const tags = useTagsData();
  const isPro = useIsPro();
  const { openUpgrade } = useUpgradeDialog();
  const { toast } = useToast();

  const handleExport = useCallback(() => {
    if (!isPro) {
      openUpgrade();

      return;
    }
    if (transactions.length === 0) {
      return;
    }

    const csv = buildTransactionsCsv(transactions, categories, tags, t);
    downloadCsv(`budgard-${exportScope}-activity.csv`, csv);
    toast({
      variant: 'success',
      title: t('activity.exportedTitle'),
      description: t('activity.exportedDescription', {
        count: transactions.length,
      }),
    });
  }, [
    categories,
    isPro,
    openUpgrade,
    exportScope,
    t,
    tags,
    toast,
    transactions,
  ]);

  return {
    handleExport,
    isExportDisabled: transactions.length === 0,
    isPro,
  };
};
