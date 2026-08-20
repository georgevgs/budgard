import { useMemo, useState, useTransition } from 'react';
import { useTranslation } from 'react-i18next';
import type { UseFormReturn } from 'react-hook-form';
import { useTagsData } from '@/contexts/DataContext';
import { useTagOps } from '@/hooks/dataOps/useTagOps';
import { useIsPro } from '@/hooks/useIsPro';
import { useUpgradeDialog } from '@/contexts/UpgradeDialogContext';
import { useToast } from '@/hooks/useToast';
import { dataColors } from '@/design/palette';
import { collectExpenseTagIds } from '@/lib/expenseTags';
import type { Tag } from '@/types/Tag';
import type { ExpenseFormData } from '@/lib/validations';

export const useTagPicker = (form: UseFormReturn<ExpenseFormData>) => {
  const { t } = useTranslation();
  const tags = useTagsData();
  const { handleTagCreate } = useTagOps();
  const isPro = useIsPro();
  const { openUpgrade } = useUpgradeDialog();
  const { toast } = useToast();
  const [tagPopoverOpen, setTagPopoverOpen] = useState(false);
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
    if (!tagSearch) return unselected;

    const lower = tagSearch.toLowerCase();

    return unselected.filter((tag) => tag.name.toLowerCase().includes(lower));
  }, [tags, selectedTagIds, tagSearch]);

  const hasExactMatch = tags.some(
    (tag) => tag.name.toLowerCase() === tagSearch.toLowerCase(),
  );
  const showCreateOption = tagSearch.trim().length > 0 && !hasExactMatch;

  const applySelection = (ids: string[]) => {
    form.setValue('tag_id', ids[0], { shouldValidate: true, shouldDirty: true });
    form.setValue('extra_tag_ids', ids.slice(1), { shouldValidate: true, shouldDirty: true });
  };

  // Free tier: exactly one tag per expense. Adding a second fires the upsell
  // and blocks the add (mirrors RecurringExpensesList.handleAddClick).
  const guardTagLimit = (): boolean => {
    if (isPro) return true;
    if (selectedTagIds.length === 0) return true;

    setTagPopoverOpen(false);
    toast({ title: t('pro.gate.tagLimit') });
    openUpgrade();

    return false;
  };

  const handleTagSelect = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) return;
    if (!guardTagLimit()) return;

    applySelection([...selectedTagIds, tagId]);
    setTagPopoverOpen(false);
    setTagSearch('');
  };

  const handleTagRemove = (tagId: string) => {
    applySelection(selectedTagIds.filter((id) => id !== tagId));
  };

  const handleTagCreateInline = () => {
    if (!tagSearch.trim() || isCreatingTag) return;
    if (!guardTagLimit()) return;

    startTagCreation(async () => {
      try {
        const color = dataColors[tags.length % dataColors.length];
        const newTag = await handleTagCreate(tagSearch.trim(), color);
        applySelection([...selectedTagIds, newTag.id]);
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
    selectedTags,
    filteredTags,
    showCreateOption,
    isCreatingTag,
    handleTagSelect,
    handleTagRemove,
    handleTagCreateInline,
  };
};

export type TagPickerApi = ReturnType<typeof useTagPicker>;

// --- Helpers ---

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
