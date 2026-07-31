import type { Session } from '@supabase/supabase-js';
import { useAuth } from '@/contexts/AuthContext';
import { useCategoryOps } from '@/hooks/dataOps/useCategoryOps';
import { useDataConfig } from '@/contexts/DataContext';
import type { CategoryFormData } from '@/lib/validations';
import type { Category } from '@/types/Category';
import type { CategoryKind } from '@/components/categories/CategoryKindSelector';

type UseCategorySubmitArgs = {
  category: Category | undefined;
  isIncomeCategory: boolean;
  onClose: () => void;
};

export const useCategorySubmit = ({
  category,
  isIncomeCategory,
  onClose,
}: UseCategorySubmitArgs) => {
  const { session } = useAuth();
  const { handleCategoryAdd, handleCategoryUpdate } = useCategoryOps();
  const { isInitialized } = useDataConfig();

  const handleSubmit = async (values: CategoryFormData) => {
    if (!canSubmitForm(session, isInitialized)) return;
    if (!session) return;

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
    } catch {
      // Hook already shows error toast via useCategoryOps
    }
  };

  return { handleSubmit, isInitialized };
};

// --- Helpers ---

type CategoryAddPayload = {
  name: string;
  color: string;
  icon: string | null;
  user_id: string;
  type: 'expense' | 'income';
  kind: CategoryKind | 'income' | null;
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
  if (!session?.user?.id) return false;
  if (!isInitialized) return false;

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
