import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useCategoriesData, useTagsData } from '@/common/contexts/DataContext';
import { useProGate } from '@/common/hooks/useProGate';
import { useToast } from '@/common/hooks/useToast';
import { buildTransactionsCsv, downloadCsv } from '@/constants/csvExport';
import type { Expense } from '@/types/Expense';

export const useActivityCsvExport = (
  transactions: Expense[],
  exportScope: string,
) => {
  const { t } = useTranslation();
  const { categories } = useCategoriesData();
  const tags = useTagsData();
  const { isPro, allow } = useProGate();
  const { toast } = useToast();

  const handleExport = useCallback(() => {
    if (!allow('csvExport')) {
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
  }, [categories, allow, exportScope, t, tags, toast, transactions]);

  return {
    handleExport,
    isExportDisabled: transactions.length === 0,
    isPro,
  };
};
