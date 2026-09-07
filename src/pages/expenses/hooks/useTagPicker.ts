import { useMemo, useState, useTransition } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { useTagsData } from '@/common/contexts/DataContext';
import { useTagOps } from '@/common/hooks/dataOps/useTagOps';
import { useProGate } from '@/common/hooks/useProGate';
import { dataColors } from '@/design/palette';
import { collectExpenseTagIds } from '@/constants/expenseTags';
import type { Tag } from '@/types/Tag';
import type { ExpenseFormData } from '@/pages/expenses/validations';

export const useTagPicker = (form: UseFormReturn<ExpenseFormData>) => {
  const tags = useTagsData();
  const { handleTagCreate } = useTagOps();
  const { allow } = useProGate();
  const [isTagPopoverOpen, setIsTagPopoverOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState('');
  const [isCreatingTag, startTagCreation] = useTransition();

  const primaryTagId = form.watch('tag_id');
  const extraTagIds = form.watch('extra_tag_ids');
  const selectedTagIds = useMemo(
    () => collectExpenseTagIds(primaryTagId, extraTagIds),
    [primaryTagId, extraTagIds],
  );
  const selectedTags = useMemo(
    () => resolveSelectedTags(selectedTagIds, tags),
    [selectedTagIds, tags],
  );

  // Already-selected tags are hidden from the list — the combobox only adds.
  const filteredTags = useMemo(() => {
    const unselected = tags.filter((tag) => !selectedTagIds.includes(tag.id));
    if (!tagSearch) {
      return unselected;
    }

    const lower = tagSearch.toLowerCase();

    return unselected.filter((tag) => tag.name.toLowerCase().includes(lower));
  }, [tags, selectedTagIds, tagSearch]);

  const hasExactMatch = tags.some(
    (tag) => tag.name.toLowerCase() === tagSearch.toLowerCase(),
  );
  const shouldShowCreateOption = tagSearch.trim().length > 0 && !hasExactMatch;

  const applySelection = (ids: string[]) => {
    form.setValue('tag_id', ids[0], {
      shouldValidate: true,
      shouldDirty: true,
    });
    form.setValue('extra_tag_ids', ids.slice(1), {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  // Free tier: exactly one tag per expense. Adding a second fires the upsell
  // and blocks the add (mirrors RecurringExpensesList.handleAddClick).
  const guardTagLimit = (): boolean =>
    allow('tagsPerExpense', selectedTagIds.length, {
      // Close the picker first, or it sits on top of the upgrade dialog.
      onBlock: () => setIsTagPopoverOpen(false),
    });

  const handleTagSelect = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      return;
    }
    if (!guardTagLimit()) {
      return;
    }

    applySelection([...selectedTagIds, tagId]);
    setIsTagPopoverOpen(false);
    setTagSearch('');
  };

  const handleTagRemove = (tagId: string) => {
    applySelection(selectedTagIds.filter((id) => id !== tagId));
  };

  const handleTagCreateInline = () => {
    if (!tagSearch.trim() || isCreatingTag) {
      return;
    }
    if (!guardTagLimit()) {
      return;
    }

    startTagCreation(async () => {
      try {
        const color = dataColors[tags.length % dataColors.length];
        const newTag = await handleTagCreate(tagSearch.trim(), color);
        applySelection([...selectedTagIds, newTag.id]);
        setIsTagPopoverOpen(false);
        setTagSearch('');
      } catch {
        // error already shown via toast
      }
    });
  };

  return {
    isTagPopoverOpen,
    setIsTagPopoverOpen,
    tagSearch,
    setTagSearch,
    selectedTags,
    filteredTags,
    shouldShowCreateOption,
    isCreatingTag,
    handleTagSelect,
    handleTagRemove,
    handleTagCreateInline,
  };
};

export type UseTagPickerReturn = ReturnType<typeof useTagPicker>;

const resolveSelectedTags = (ids: string[], tags: Tag[]): Tag[] => {
  const resolved: Tag[] = [];
  for (const id of ids) {
    const tag = tags.find((candidate) => candidate.id === id);
    if (tag) {
      resolved.push(tag);
    }
  }

  return resolved;
};
