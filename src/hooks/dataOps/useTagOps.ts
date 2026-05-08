import { useCallback, useMemo } from 'react';
import * as Sentry from '@sentry/react';
import { useDataActions } from '@/contexts/DataContext';
import { dataService } from '@/services/dataService';
import { haptics } from '@/lib/haptics';
import type { Tag } from '@/types/Tag';
import { useShowErrorToast } from './useShowErrorToast';

export const useTagOps = () => {
  const { setTags } = useDataActions();
  const showErrorToast = useShowErrorToast();

  const handleTagCreate = useCallback(
    async (name: string, color: string): Promise<Tag> => {
      const optimisticTag: Tag = {
        id: `temp-${Date.now()}`,
        user_id: '',
        name,
        color,
        created_at: new Date().toISOString(),
      };

      setTags((prev) =>
        [...prev, optimisticTag].sort((a, b) => a.name.localeCompare(b.name)),
      );

      try {
        const savedTag = await dataService.createTag({ name, color });
        haptics.success();
        setTags((prev) =>
          [...prev.filter((t) => t.id !== optimisticTag.id), savedTag].sort(
            (a, b) => a.name.localeCompare(b.name),
          ),
        );
        return savedTag;
      } catch (error) {
        haptics.error();
        setTags((prev) => prev.filter((t) => t.id !== optimisticTag.id));
        Sentry.captureException(error, { tags: { operation: 'createTag' } });
        showErrorToast('Failed to create tag');
        throw error;
      }
    },
    [setTags, showErrorToast],
  );

  return useMemo(() => ({ handleTagCreate }), [handleTagCreate]);
};
