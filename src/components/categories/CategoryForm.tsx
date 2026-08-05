import type { ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDialogDirty } from '@/hooks/useDialogDirty';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  DialogTitle,
  DialogHeader,
  DialogDescription,
} from '@/components/ui/dialog';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import { Form } from '@/components/ui/form';
import { useCategorySubmit } from '@/hooks/categories/useCategorySubmit';
import { categorySchema, type CategoryFormData } from '@/lib/validations';
import type { Category } from '@/types/Category';
import CategoryFormFields from '@/components/categories/CategoryFormFields';
import { type CategoryKind } from '@/components/categories/CategoryKindSelector';

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

  const isEditing = Boolean(category);
  const isIncomeCategory = getIsIncomeCategory(category, categoryType);
  const editableKind = getEditableKind(category);
  const defaultColor = getDefaultColor(isIncomeCategory);

  const { handleSubmit, isInitialized } = useCategorySubmit({
    category,
    isIncomeCategory,
    onClose,
  });

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    mode: 'onTouched',
    defaultValues: {
      name: category?.name ?? '',
      color: category?.color ?? defaultColor,
      icon: category?.icon ?? undefined,
      kind: editableKind,
    },
  });

  useDialogDirty(form.formState.isDirty);

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
        {renderHeader(isEditing, isIncomeCategory, isDisabled, onBack, t)}

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-5 pb-4"
          >
            <CategoryFormFields
              form={form}
              isIncomeCategory={isIncomeCategory}
              isDisabled={isDisabled}
            />

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
                disabled={isDisabled || !form.formState.isValid}
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

const getIsIncomeCategory = (
  category: Category | undefined,
  categoryType: 'expense' | 'income',
): boolean => {
  if (category?.type === 'income') return true;
  if (!category && categoryType === 'income') return true;

  return false;
};

const getEditableKind = (
  category: Category | undefined,
): CategoryKind | undefined => {
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

const renderHeader = (
  isEditing: boolean,
  isIncomeCategory: boolean,
  isDisabled: boolean,
  onBack: () => void,
  t: TranslateFunction,
) => (
  <DialogHeader className="pb-4" data-draggable-area>
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onBack}
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
);

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
