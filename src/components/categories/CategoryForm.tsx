import type { ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Session } from '@supabase/supabase-js';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DialogTitle,
  DialogHeader,
  DialogDescription,
} from '@/components/ui/dialog';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useAuth } from '@/contexts/AuthContext';
import { useCategoryOps } from '@/hooks/dataOps/useCategoryOps';
import { useDataConfig } from '@/contexts/DataContext';
import { categorySchema, type CategoryFormData } from '@/lib/validations';
import type { Category } from '@/types/Category';
import CategoryColorPicker from '@/components/categories/CategoryColorPicker';
import CategoryIconPicker from '@/components/categories/CategoryIconPicker';
import CategoryKindSelector, {
  type CategoryKind,
} from '@/components/categories/CategoryKindSelector';

const DEFAULT_CATEGORY_COLOR = '#6366f1';
const DEFAULT_INCOME_COLOR = '#10b981';

type Props = {
  category?: Category;
  // For new categories: what type to create. Defaults to 'expense'.
  // For existing categories: ignored (we preserve the row's original type).
  categoryType?: 'expense' | 'income';
  onBack: () => void;
  onClose: () => void;
};

const CategoryForm = ({
  category,
  categoryType = 'expense',
  onBack,
  onClose,
}: Props) => {
  const { t } = useTranslation();
  const { session } = useAuth();
  const { handleCategoryAdd, handleCategoryUpdate } = useCategoryOps();
  const { isInitialized } = useDataConfig();

  const isEditing = Boolean(category);
  const isIncomeCategory = getIsIncomeCategory(category, categoryType);
  const editableKind = getEditableKind(category);
  const defaultColor = getDefaultColor(isIncomeCategory);

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: category?.name ?? '',
      color: category?.color ?? defaultColor,
      icon: category?.icon ?? undefined,
      kind: editableKind,
    },
  });

  const handleSubmit = async (values: CategoryFormData) => {
    if (!canSubmitForm(session, isInitialized)) return;
    if (!session) return;

    try {
      await persistCategory(
        category,
        values,
        isIncomeCategory,
        session.user.id,
        handleCategoryAdd,
        handleCategoryUpdate,
      );
      onClose();
    } catch {
      // Hook already shows error toast via useDataOperations
    }
  };

  const isDisabled = getIsFormDisabled(
    form.formState.isSubmitting,
    isInitialized,
  );

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div
        className="flex justify-center pt-3 pb-2 sm:hidden shrink-0"
        data-drag-handle
      >
        <div className="w-12 h-1.5 bg-muted-foreground/20 rounded-full" />
      </div>

      <div
        className="overflow-y-auto flex-1 min-h-0 px-4 sm:px-6 py-4 sm:py-2 overscroll-contain"
        style={{ touchAction: 'pan-y' }}
      >
        <DialogHeader className="pb-4" data-draggable-area>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="h-8 w-8 p-0"
              disabled={isDisabled}
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">{t('common.cancel')}</span>
            </Button>
            <DialogTitle className="text-xl">
              {renderFormTitle(isEditing, isIncomeCategory, t)}
            </DialogTitle>
          </div>
          <DialogDescription>
            {renderFormDescription(isEditing, isIncomeCategory, t)}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-5 pb-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      placeholder={renderNamePlaceholder(isIncomeCategory, t)}
                      {...field}
                      disabled={isDisabled}
                      aria-label={renderNamePlaceholder(isIncomeCategory, t)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    {t('categories.color')}
                  </FormLabel>
                  <FormControl>
                    <CategoryColorPicker
                      value={field.value}
                      onChange={field.onChange}
                      disabled={isDisabled}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    {t('categories.icon')}
                  </FormLabel>
                  <FormControl>
                    <CategoryIconPicker
                      value={field.value}
                      onChange={field.onChange}
                      disabled={isDisabled}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {renderKindField(isIncomeCategory, isDisabled, form)}

            <div className="flex gap-3 justify-end pt-2 pb-2">
              <Button
                type="button"
                variant="outline"
                onClick={onBack}
                disabled={isDisabled}
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={isDisabled}
                className={getSubmitButtonClass(isIncomeCategory)}
              >
                {getSubmitButtonText(form.formState.isSubmitting, isEditing, t)}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default CategoryForm;

// ─── Helpers ─────────────────────────────────────────────────────────────────

type TranslateFunction = (
  key: string,
  options?: Record<string, unknown>,
) => string;

type CategoryFormReturn = ReturnType<typeof useForm<CategoryFormData>>;

const getIsIncomeCategory = (
  category: Category | undefined,
  categoryType: 'expense' | 'income',
): boolean => {
  if (category?.type === 'income') return true;
  if (!category && categoryType === 'income') return true;

  return false;
};

const getEditableKind = (category: Category | undefined): CategoryKind | undefined => {
  if (category?.kind === 'need') return 'need';
  if (category?.kind === 'want') return 'want';
  if (category?.kind === 'savings') return 'savings';

  return undefined;
};

const getDefaultColor = (isIncomeCategory: boolean) => {
  if (isIncomeCategory) return DEFAULT_INCOME_COLOR;

  return DEFAULT_CATEGORY_COLOR;
};

const getSubmitButtonClass = (isIncomeCategory: boolean) => {
  if (isIncomeCategory) {
    return 'bg-income text-income-foreground hover:bg-income/90';
  }

  return '';
};

const renderFormTitle = (
  isEditing: boolean,
  isIncomeCategory: boolean,
  t: TranslateFunction,
) => {
  if (isIncomeCategory && isEditing) return t('income.editSource');
  if (isIncomeCategory) return t('income.addSource');
  if (isEditing) return t('categories.editCategory');

  return t('categories.addCategory');
};

const renderFormDescription = (
  isEditing: boolean,
  isIncomeCategory: boolean,
  t: TranslateFunction,
) => {
  if (isIncomeCategory && isEditing) return t('income.editSourceDescription');
  if (isIncomeCategory) return t('income.addSourceDescription');
  if (isEditing) return t('categories.editDescription');

  return t('categories.addDescription');
};

const renderNamePlaceholder = (
  isIncomeCategory: boolean,
  t: TranslateFunction,
) => {
  if (isIncomeCategory) return t('income.sourceName');

  return t('categories.categoryName');
};

const renderKindField = (
  isIncomeCategory: boolean,
  isDisabled: boolean,
  form: CategoryFormReturn,
) => {
  if (isIncomeCategory) return null;

  return (
    <FormField
      control={form.control}
      name="kind"
      render={({ field }) => (
        <FormItem>
          <FormControl>
            <CategoryKindSelector
              value={field.value as CategoryKind | undefined}
              onChange={field.onChange}
              disabled={isDisabled}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

const canSubmitForm = (
  session: Session | null,
  isInitialized: boolean,
): boolean => {
  if (!session?.user?.id) return false;
  if (!isInitialized) return false;

  return true;
};

const getIsFormDisabled = (
  isSubmitting: boolean,
  isInitialized: boolean,
): boolean => {
  if (isSubmitting) return true;
  if (!isInitialized) return true;

  return false;
};

const getSubmitButtonText = (
  isSubmitting: boolean,
  isEditing: boolean,
  t: TranslateFunction,
): ReactNode => {
  if (isSubmitting) {
    return (
      <>
        <Loader2 className="h-4 w-4 animate-spin" />
        {t('common.saving')}
      </>
    );
  }

  if (isEditing) return t('common.update');

  return t('common.add');
};

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

const persistCategory = async (
  existing: Category | undefined,
  values: CategoryFormData,
  isIncomeCategory: boolean,
  userId: string,
  handleAdd: (payload: CategoryAddPayload) => Promise<unknown>,
  handleUpdate: (id: string, payload: CategoryUpdatePayload) => Promise<unknown>,
) => {
  if (existing) {
    await handleUpdate(existing.id, buildUpdatePayload(values, isIncomeCategory));
    return;
  }

  await handleAdd(buildAddPayload(values, isIncomeCategory, userId));
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
