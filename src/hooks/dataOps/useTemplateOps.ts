import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useDataActions, useDataConfig } from '@/contexts/DataContext';
import { dataService } from '@/services/dataService';
import { haptics } from '@/lib/haptics';
import type { ExpenseTemplate } from '@/types/ExpenseTemplate';
import {
  prependOptimistic,
  removeOptimistic,
  replaceById,
} from '@/hooks/dataOps/helpers';
import { useMutationRunner } from '@/hooks/dataOps/useMutationRunner';

export const useTemplateOps = () => {
  const { isInitialized } = useDataConfig();
  const { setTemplates } = useDataActions();
  const { t } = useTranslation();
  const runMutation = useMutationRunner();

  return useMemo(() => {
    const skip = !isInitialized;

    const handleTemplateCreate = (templateData: Partial<ExpenseTemplate>) => {
      const optimistic = {
        ...templateData,
        id: `temp-${Date.now()}`,
        created_at: new Date().toISOString(),
      } as ExpenseTemplate;

      return runMutation({
        operation: 'createTemplate',
        skip,
        errorMessage: t('templates.saveFailed'),
        successMessage: t('templates.saved'),
        optimistic: () => prependOptimistic(setTemplates, optimistic),
        perform: () => dataService.createTemplate(templateData),
        commit: (saved) =>
          setTemplates((prev) => replaceById(prev, optimistic.id, saved)),
      });
    };

    const handleTemplateDelete = (templateId: string) =>
      runMutation({
        operation: 'deleteTemplate',
        skip,
        errorMessage: t('templates.deleteFailed'),
        onStart: () => haptics.warning(),
        optimistic: () => removeOptimistic(setTemplates, templateId),
        perform: () => dataService.deleteTemplate(templateId),
      });

    return { handleTemplateCreate, handleTemplateDelete };
  }, [isInitialized, setTemplates, runMutation, t]);
};
