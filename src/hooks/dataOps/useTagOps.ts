import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useDataActions } from '@/contexts/DataContext';
import { dataService } from '@/services/dataService';
import type { Tag } from '@/types/Tag';
import type { Expense } from '@/types/Expense';
import { useMutationRunner } from '@/hooks/dataOps/useMutationRunner';
import { useFinancialSpace } from '@/contexts/FinancialSpaceContext';

// Tags stay sorted by name, and renaming or deleting one has to sweep the
// expense rows that embed it — so these keep bespoke optimistic closures
// rather than the id-based shape helpers.
export const useTagOps = () => {
  const { activeOwnerId } = useFinancialSpace();
  const { setTags, setExpenses, refreshExpenses } = useDataActions();
  const { t } = useTranslation();
  const runMutation = useMutationRunner();

  return useMemo(() => {
    const handleTagCreate = async (
      name: string,
      color: string,
    ): Promise<Tag> => {
      const optimisticTag: Tag = {
        id: `temp-${Date.now()}`,
        user_id: '',
        name,
        color,
        created_at: new Date().toISOString(),
      };

      const saved = await runMutation({
        operation: 'createTag',
        errorMessage: t('expenses.toasts.tagCreateFailed'),
        optimistic: () => {
          setTags((prev) => sortByName([...prev, optimisticTag]));

          return () =>
            setTags((prev) =>
              prev.filter((tag) => tag.id !== optimisticTag.id),
            );
        },
        perform: () => dataService.createTag({ name, color }, activeOwnerId),
        commit: (savedTag) =>
          setTags((prev) =>
            sortByName([
              ...prev.filter((tag) => tag.id !== optimisticTag.id),
              savedTag,
            ]),
          ),
      });

      // This mutation has no `skip`, so the runner always resolves with the
      // saved tag; the caller needs its id to select the tag it just made.
      return saved as Tag;
    };

    // Rolling back a tag edit puts the tag list back directly, but the expense
    // rows that embedded it are refetched — reversing the sweep by hand would
    // mean rebuilding embeds this hook does not own.
    const restoreTagsAndResync = (previousTags: Tag[]) => () => {
      setTags(previousTags);
      refreshExpenses();
    };

    const handleTagUpdate = (tagId: string, name: string) =>
      runMutation({
        operation: 'updateTag',
        errorMessage: t('expenses.toasts.tagUpdateFailed'),
        optimistic: () => {
          let previousTags: Tag[] = [];
          setTags((prev) => {
            previousTags = prev;

            return sortByName(prev.map((tag) => renameTag(tag, tagId, name)));
          });
          setExpenses((prev) => prev.map((e) => renameTagRefs(e, tagId, name)));

          return restoreTagsAndResync(previousTags);
        },
        perform: () => dataService.updateTag(tagId, { name }),
      });

    const handleTagDelete = (tagId: string) =>
      runMutation({
        operation: 'deleteTag',
        errorMessage: t('expenses.toasts.tagDeleteFailed'),
        optimistic: () => {
          let previousTags: Tag[] = [];
          setTags((prev) => {
            previousTags = prev;

            return prev.filter((tag) => tag.id !== tagId);
          });
          setExpenses((prev) => prev.map((e) => clearTagRefs(e, tagId)));

          return restoreTagsAndResync(previousTags);
        },
        perform: () => dataService.deleteTag(tagId),
      });

    return { handleTagCreate, handleTagUpdate, handleTagDelete };
  }, [activeOwnerId, setTags, setExpenses, refreshExpenses, runMutation, t]);
};

// --- Helpers ---

const sortByName = (tags: Tag[]): Tag[] =>
  [...tags].sort((a, b) => a.name.localeCompare(b.name));

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
