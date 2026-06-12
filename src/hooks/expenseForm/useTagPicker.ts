import { useMemo, useState, useTransition } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { useTagsData } from '@/contexts/DataContext';
import { useTagOps } from '@/hooks/dataOps/useTagOps';
import type { ExpenseFormData } from '@/lib/validations';

// Preset colors cycled when auto-assigning a color to a new tag
const TAG_COLORS = [
  '#6366f1',
  '#ec4899',
  '#f59e0b',
  '#10b981',
  '#3b82f6',
  '#ef4444',
  '#8b5cf6',
  '#14b8a6',
  '#f97316',
  '#06b6d4',
];

export const useTagPicker = (form: UseFormReturn<ExpenseFormData>) => {
  const tags = useTagsData();
  const { handleTagCreate } = useTagOps();
  const [tagPopoverOpen, setTagPopoverOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState('');
  const [isCreatingTag, startTagCreation] = useTransition();

  const selectedTagId = form.watch('tag_id');
  const selectedTag = tags.find((t) => t.id === selectedTagId);

  const filteredTags = useMemo(() => {
    if (!tagSearch) return tags;
    const lower = tagSearch.toLowerCase();

    return tags.filter((t) => t.name.toLowerCase().includes(lower));
  }, [tags, tagSearch]);

  const hasExactMatch = tags.some(
    (t) => t.name.toLowerCase() === tagSearch.toLowerCase(),
  );
  const showCreateOption = tagSearch.trim().length > 0 && !hasExactMatch;

  const handleTagSelect = (tagId: string) => {
    form.setValue('tag_id', tagId);
    setTagPopoverOpen(false);
    setTagSearch('');
  };

  const handleTagClear = () => {
    form.setValue('tag_id', undefined);
    setTagSearch('');
  };

  const handleTagCreateInline = () => {
    if (!tagSearch.trim() || isCreatingTag) return;
    startTagCreation(async () => {
      try {
        const color = TAG_COLORS[tags.length % TAG_COLORS.length];
        const newTag = await handleTagCreate(tagSearch.trim(), color);
        form.setValue('tag_id', newTag.id);
        setTagPopoverOpen(false);
        setTagSearch('');
      } catch {
        // error already shown via toast
      }
    });
  };

  return {
    tagPopoverOpen,
    setTagPopoverOpen,
    tagSearch,
    setTagSearch,
    selectedTag,
    filteredTags,
    showCreateOption,
    isCreatingTag,
    handleTagSelect,
    handleTagClear,
    handleTagCreateInline,
  };
};

export type TagPickerApi = ReturnType<typeof useTagPicker>;
