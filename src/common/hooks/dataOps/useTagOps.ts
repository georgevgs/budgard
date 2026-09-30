import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useDataActions } from '@/common/contexts/DataContext';
import { dataService } from '@/common/api/dataService';
import type { Tag } from '@/types/Tag';
import type { Expense } from '@/types/Expense';
import { useMutationRunner } from '@/common/hooks/dataOps/useMutationRunner';
import { useFinancialSpace } from '@/common/contexts/FinancialSpaceContext';

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

      // This mutation has no `shouldSkip`, so the runner always resolves with the
      // saved tag; the caller needs its id to select the tag it just made.
      return saved as Tag;
    };

    // Rolling back a tag edit reverses only that tag in the list, but the
    // expense rows that embedded it are refetched — reversing the sweep by
    // hand would mean rebuilding embeds this hook does not own.
    //
    // What to reverse is read inside the updaters, when they run: the data
    // layer is a reducer and React runs its updaters lazily at render time.
    // Capturing the previous list up front captured the empty placeholder,
    // and a failed rename or delete wiped every tag. Reversing only this tag,
    // rather than restoring a snapshot, keeps an overlapping edit to another
    // tag from being undone with it.
    const handleTagUpdate = (tagId: string, name: string) =>
      runMutation({
        operation: 'updateTag',
        errorMessage: t('expenses.toasts.tagUpdateFailed'),
        optimistic: () => {
          let previousName: string | null = null;
          setTags((prev) => {
            previousName = prev.find((tag) => tag.id === tagId)?.name ?? null;

            return sortByName(prev.map((tag) => renameTag(tag, tagId, name)));
          });
          setExpenses((prev) => prev.map((e) => renameTagRefs(e, tagId, name)));

          return () => {
            setTags((prev) => {
              if (previousName === null) {
                return prev;
              }

              return sortByName(
                prev.map((tag) =>
                  renameTag(tag, tagId, previousName as string),
                ),
              );
            });
            refreshExpenses();
          };
        },
        perform: () => dataService.updateTag(tagId, { name }),
      });

    const handleTagDelete = (tagId: string) =>
      runMutation({
        operation: 'deleteTag',
        errorMessage: t('expenses.toasts.tagDeleteFailed'),
        optimistic: () => {
          let removed: Tag | undefined;
          setTags((prev) => {
            removed = prev.find((tag) => tag.id === tagId);

            return prev.filter((tag) => tag.id !== tagId);
          });
          setExpenses((prev) => prev.map((e) => clearTagRefs(e, tagId)));

          return () => {
            setTags((prev) => {
              if (!removed || prev.some((tag) => tag.id === tagId)) {
                return prev;
              }

              return sortByName([...prev, removed]);
            });
            refreshExpenses();
          };
        },
        perform: () => dataService.deleteTag(tagId),
      });

    return { handleTagCreate, handleTagUpdate, handleTagDelete };
  }, [activeOwnerId, setTags, setExpenses, refreshExpenses, runMutation, t]);
};

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
  const isPrimaryTag = expense.tag?.id === tagId;
  const hasExtraTag = expense.extra_tags?.some((tag) => tag.id === tagId);
  if (!isPrimaryTag && !hasExtraTag) {
    return expense;
  }

  const next = { ...expense };
  if (isPrimaryTag && next.tag) {
    next.tag = { ...next.tag, name };
  }
  if (hasExtraTag && next.extra_tags) {
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
  const isPrimaryTag = expense.tag_id === tagId;
  const hasExtraTag = expense.extra_tags?.some((tag) => tag.id === tagId);
  if (!isPrimaryTag && !hasExtraTag) {
    return expense;
  }

  const next = { ...expense };
  if (isPrimaryTag) {
    next.tag_id = undefined;
    next.tag = undefined;
  }
  if (hasExtraTag && next.extra_tags) {
    next.extra_tags = next.extra_tags.filter((tag) => tag.id !== tagId);
  }

  return next;
};
