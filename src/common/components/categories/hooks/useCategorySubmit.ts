import type { Session } from '@supabase/supabase-js';
import { useAuth } from '@/common/contexts/AuthContext';
import { useCategoryOps } from '@/common/hooks/dataOps/useCategoryOps';
import {
  useCategoriesData,
  useDataConfig,
} from '@/common/contexts/DataContext';
import { isCategoryNameTaken } from '@/common/components/categories/utils/categoryNames';
import { isNameConflictError } from '@/constants/names';
import type { CategoryFormData } from '@/common/components/categories/validations';
import type { Category } from '@/types/Category';
import type { CategoryKind } from '@/types/Category';

type UseCategorySubmitArgs = {
  category: Category | undefined;
  isIncomeCategory: boolean;
  onClose: () => void;
  // Marks the name field; the database would refuse the name as a duplicate.
  onNameTaken: () => void;
};

export const useCategorySubmit = ({
  category,
  isIncomeCategory,
  onClose,
  onNameTaken,
}: UseCategorySubmitArgs) => {
  const { session } = useAuth();
  const { categories } = useCategoriesData();
  const { handleCategoryAdd, handleCategoryUpdate } = useCategoryOps();
  const { isInitialized } = useDataConfig();

  const handleSubmit = async (values: CategoryFormData) => {
    if (!canSubmitForm(session, isInitialized)) {
      return;
    }
    if (!session) {
      return;
    }
    if (isCategoryNameTaken(values.name, categories, category)) {
      onNameTaken();

      return;
    }

    try {
      if (category) {
        await handleCategoryUpdate(
          category.id,
          buildUpdatePayload(values, isIncomeCategory),
        );
      } else {
        await handleCategoryAdd(
          buildAddPayload(values, isIncomeCategory, session.user.id),
        );
      }
      onClose();
    } catch (error) {
      // useCategoryOps already toasts; a stale list still deserves the field
      // saying why, so the retry is not the same doomed request.
      if (isNameConflictError(error)) {
        onNameTaken();
      }
    }
  };

  return { handleSubmit, isInitialized };
};

type CategoryAddPayload = {
  name: string;
  color: string;
  icon: string | null;
  user_id: string;
  type: 'expense' | 'income';
  kind: CategoryKind | null;
};

type CategoryUpdatePayload = {
  name: string;
  color: string;
  icon: string | null;
  kind?: CategoryKind | null;
};

const canSubmitForm = (
  session: Session | null,
  isInitialized: boolean,
): boolean => {
  if (!session?.user?.id) {
    return false;
  }
  if (!isInitialized) {
    return false;
  }

  return true;
};

const buildAddPayload = (
  values: CategoryFormData,
  isIncomeCategory: boolean,
  userId: string,
): CategoryAddPayload => {
  if (isIncomeCategory) {
    return {
      name: values.name,
      color: values.color,
      icon: values.icon ?? null,
      user_id: userId,
      type: 'income',
      kind: 'income',
    };
  }

  return {
    name: values.name,
    color: values.color,
    icon: values.icon ?? null,
    user_id: userId,
    type: 'expense',
    kind: values.kind ?? null,
  };
};

const buildUpdatePayload = (
  values: CategoryFormData,
  isIncomeCategory: boolean,
): CategoryUpdatePayload => {
  if (isIncomeCategory) {
    return {
      name: values.name,
      color: values.color,
      icon: values.icon ?? null,
    };
  }

  return {
    name: values.name,
    color: values.color,
    icon: values.icon ?? null,
    kind: values.kind ?? null,
  };
};
