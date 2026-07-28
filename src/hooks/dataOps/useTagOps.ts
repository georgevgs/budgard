import { useCallback, useMemo } from 'react';
import * as Sentry from '@/lib/sentry';
import { useTranslation } from 'react-i18next';
import { useDataActions } from '@/contexts/DataContext';
import { dataService } from '@/services/dataService';
import { haptics } from '@/lib/haptics';
import type { Tag } from '@/types/Tag';
import type { Expense } from '@/types/Expense';
import { useShowErrorToast } from '@/hooks/dataOps/useShowErrorToast';

export const useTagOps = () => {
  const { setTags, setExpenses, refreshExpenses } = useDataActions();
  const { t } = useTranslation();
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
        showErrorToast(t('expenses.toasts.tagCreateFailed'), () => {
          void handleTagCreate(name, color).catch(() => undefined);
        });
        throw error;
      }
    },
    [setTags, showErrorToast, t],
  );

  const handleTagUpdate = useCallback(
    async (tagId: string, name: string) => {
      let previousTags: Tag[] = [];
      setTags((prev) => {
        previousTags = prev;

        return prev
          .map((tag) => renameTag(tag, tagId, name))
          .sort((a, b) => a.name.localeCompare(b.name));
      });
      setExpenses((prev) => prev.map((e) => renameTagRefs(e, tagId, name)));

      try {
        await dataService.updateTag(tagId, { name });
        haptics.success();
      } catch (error) {
        haptics.error();
        setTags(previousTags);
        refreshExpenses();
        Sentry.captureException(error, { tags: { operation: 'updateTag' } });
        showErrorToast(t('expenses.toasts.tagUpdateFailed'), () => {
          void handleTagUpdate(tagId, name).catch(() => undefined);
        });
        throw error;
      }
    },
    [setTags, setExpenses, refreshExpenses, showErrorToast, t],
  );

  const handleTagDelete = useCallback(
    async (tagId: string) => {
      let previousTags: Tag[] = [];
      setTags((prev) => {
        previousTags = prev;

        return prev.filter((tag) => tag.id !== tagId);
      });
      setExpenses((prev) => prev.map((e) => clearTagRefs(e, tagId)));

      try {
        await dataService.deleteTag(tagId);
        haptics.success();
      } catch (error) {
        haptics.error();
        setTags(previousTags);
        refreshExpenses();
        Sentry.captureException(error, { tags: { operation: 'deleteTag' } });
        showErrorToast(t('expenses.toasts.tagDeleteFailed'), () => {
          void handleTagDelete(tagId).catch(() => undefined);
        });
        throw error;
      }
    },
    [setTags, setExpenses, refreshExpenses, showErrorToast, t],
  );

  return useMemo(
    () => ({ handleTagCreate, handleTagUpdate, handleTagDelete }),
    [handleTagCreate, handleTagUpdate, handleTagDelete],
  );
};

// --- Helpers ---

const renameTag = (tag: Tag, tagId: string, name: string): Tag => {
  if (tag.id !== tagId) {
    return tag;
  }

  return { ...tag, name };
};

const renameTagRefs = (
  expense: Expense,
  tagId: string,
  name: string,
): Expense => {
  const touchesPrimary = expense.tag?.id === tagId;
  const touchesExtra = expense.extra_tags?.some((tag) => tag.id === tagId);
  if (!touchesPrimary && !touchesExtra) {
    return expense;
  }

  const next = { ...expense };
  if (touchesPrimary && next.tag) {
    next.tag = { ...next.tag, name };
  }
  if (touchesExtra && next.extra_tags) {
    next.extra_tags = next.extra_tags.map((tag) => {
      if (tag.id !== tagId) {
        return tag;
      }

      return { ...tag, name };
    });
  }

  return next;
};

const clearTagRefs = (expense: Expense, tagId: string): Expense => {
  const touchesPrimary = expense.tag_id === tagId;
  const touchesExtra = expense.extra_tags?.some((tag) => tag.id === tagId);
  if (!touchesPrimary && !touchesExtra) {
    return expense;
  }

  const next = { ...expense };
  if (touchesPrimary) {
    next.tag_id = undefined;
    next.tag = undefined;
  }
  if (touchesExtra && next.extra_tags) {
    next.extra_tags = next.extra_tags.filter((tag) => tag.id !== tagId);
  }

  return next;
};
