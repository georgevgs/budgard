import { useCallback, useMemo } from 'react';
import * as Sentry from '@/lib/sentry';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/useToast';
import { useDataActions, useDataConfig } from '@/contexts/DataContext';
import { dataService } from '@/services/dataService';
import { haptics } from '@/lib/haptics';
import type { ExpenseTemplate } from '@/types/ExpenseTemplate';
import { replaceById } from '@/hooks/dataOps/helpers';
import { useShowErrorToast } from '@/hooks/dataOps/useShowErrorToast';

export const useTemplateOps = () => {
  const { isInitialized } = useDataConfig();
  const { setTemplates } = useDataActions();
  const { toast } = useToast();
  const { t } = useTranslation();
  const showErrorToast = useShowErrorToast();

  const handleTemplateCreate = useCallback(
    async (templateData: Partial<ExpenseTemplate>) => {
      const run = async () => {
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
          toast({ variant: 'success', title: t('templates.saved') });
        } catch (error) {
          haptics.error();
          setTemplates((prev) =>
            prev.filter((t) => t.id !== optimisticTemplate.id),
          );
          Sentry.captureException(error, {
            tags: { operation: 'createTemplate' },
          });
          showErrorToast(t('templates.saveFailed'), () => {
            void run().catch(() => undefined);
          });
          throw error;
        }
      };

      return run();
    },
    [isInitialized, setTemplates, showErrorToast, toast, t],
  );

  const handleTemplateDelete = useCallback(
    async (templateId: string) => {
      const run = async () => {
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
          showErrorToast(t('templates.deleteFailed'), () => {
            void run().catch(() => undefined);
          });
          throw error;
        }
      };

      return run();
    },
    [isInitialized, setTemplates, showErrorToast, t],
  );

  return useMemo(
    () => ({ handleTemplateCreate, handleTemplateDelete }),
    [handleTemplateCreate, handleTemplateDelete],
  );
};
