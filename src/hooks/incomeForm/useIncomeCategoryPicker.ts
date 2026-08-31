import { useMemo, useState, useTransition } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { useAuth } from '@/contexts/AuthContext';
import { useCategoriesData } from '@/contexts/DataContext';
import { useCategoryOps } from '@/hooks/dataOps/useCategoryOps';
import { incomeColors } from '@/design/palette';
import type { IncomeFormData } from '@/lib/validations';

export const useIncomeCategoryPicker = (
  form: UseFormReturn<IncomeFormData>,
) => {
  const { session } = useAuth();
  const { incomeCategories } = useCategoriesData();
  const { handleCategoryAdd } = useCategoryOps();
  const [categoryPopoverOpen, setCategoryPopoverOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [isCreatingCategory, startCategoryCreation] = useTransition();
  const [isManagerOpen, setIsManagerOpen] = useState(false);

  const selectedCategoryId = form.watch('category_id');
  const selectedCategory = incomeCategories.find(
    (c) => c.id === selectedCategoryId,
  );

  const filteredCategories = useMemo(() => {
    if (!categorySearch) return incomeCategories;
    const lower = categorySearch.toLowerCase();

    return incomeCategories.filter((c) => c.name.toLowerCase().includes(lower));
  }, [incomeCategories, categorySearch]);

  const trimmedSearch = categorySearch.trim();
  const hasExactMatch = incomeCategories.some(
    (c) => c.name.toLowerCase() === trimmedSearch.toLowerCase(),
  );
  // When the user is typing a unique new name, the bottom row becomes a quick
  // "+ Create" action. Otherwise it's "Manage sources" (combined add + edit + delete).
  const showCreateOption = trimmedSearch.length > 0 && !hasExactMatch;

  const handleCategorySelect = (id: string) => {
    form.setValue('category_id', id, {
      shouldValidate: true,
      shouldDirty: true,
    });
    setCategoryPopoverOpen(false);
    setCategorySearch('');
  };

  const handleCategoryCreateInline = () => {
    if (!categorySearch.trim() || isCreatingCategory) return;
    if (!session?.user?.id) return;

    const userId = session.user.id;
    startCategoryCreation(async () => {
      try {
        await handleCategoryAdd({
          name: categorySearch.trim(),
          color: incomeColors[incomeCategories.length % incomeColors.length],
          icon: null,
          user_id: userId,
          type: 'income',
          kind: 'income',
        });
        setCategoryPopoverOpen(false);
        setCategorySearch('');
      } catch {
        // toast already shown
      }
    });
  };

  const handleOpenManager = () => {
    setCategoryPopoverOpen(false);
    setIsManagerOpen(true);
  };

  return {
    categoryPopoverOpen,
    setCategoryPopoverOpen,
    categorySearch,
    setCategorySearch,
    isCreatingCategory,
    isManagerOpen,
    setIsManagerOpen,
    selectedCategory,
    filteredCategories,
    trimmedSearch,
    showCreateOption,
    handleCategorySelect,
    handleCategoryCreateInline,
    handleOpenManager,
  };
};

export type IncomeCategoryPickerApi = ReturnType<
  typeof useIncomeCategoryPicker
>;
