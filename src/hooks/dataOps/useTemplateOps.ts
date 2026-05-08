import { useCallback, useMemo } from 'react';
import * as Sentry from '@sentry/react';
import { useToast } from '@/hooks/useToast';
import { useDataActions, useDataConfig } from '@/contexts/DataContext';
import { dataService } from '@/services/dataService';
import { haptics } from '@/lib/haptics';
import type { ExpenseTemplate } from '@/types/ExpenseTemplate';
import { replaceById } from './helpers';
import { useShowErrorToast } from './useShowErrorToast';

export const useTemplateOps = () => {
  const { isInitialized } = useDataConfig();
  const { setTemplates } = useDataActions();
  const { toast } = useToast();
  const showErrorToast = useShowErrorToast();

  const handleTemplateCreate = useCallback(
    async (templateData: Partial<ExpenseTemplate>) => {
      if (!isInitialized) return;

      const optimisticTemplate = {
        ...templateData,
        id: `temp-${Date.now()}`,
        created_at: new Date().toISOString(),
      } as ExpenseTemplate;

      setTemplates((prev) => [optimisticTemplate, ...prev]);

      try {
        const saved = await dataService.createTemplate(templateData);
        haptics.success();
        setTemplates((prev) => replaceById(prev, optimisticTemplate.id, saved));
        toast({ variant: 'success', title: 'Template saved' });
      } catch (error) {
        haptics.error();
        setTemplates((prev) =>
          prev.filter((t) => t.id !== optimisticTemplate.id),
        );
        Sentry.captureException(error, {
          tags: { operation: 'createTemplate' },
        });
        showErrorToast('Failed to save template');
        throw error;
      }
    },
    [isInitialized, setTemplates, showErrorToast, toast],
  );

  const handleTemplateDelete = useCallback(
    async (templateId: string) => {
      if (!isInitialized) return;

      haptics.warning();
      let previousTemplates: ExpenseTemplate[] = [];
      setTemplates((prev) => {
        previousTemplates = prev;

        return prev.filter((t) => t.id !== templateId);
      });

      try {
        await dataService.deleteTemplate(templateId);
        haptics.success();
      } catch (error) {
        haptics.error();
        setTemplates(previousTemplates);
        Sentry.captureException(error, {
          tags: { operation: 'deleteTemplate' },
        });
        showErrorToast('Failed to delete template');
        throw error;
      }
    },
    [isInitialized, setTemplates, showErrorToast],
  );

  return useMemo(
    () => ({ handleTemplateCreate, handleTemplateDelete }),
    [handleTemplateCreate, handleTemplateDelete],
  );
};
