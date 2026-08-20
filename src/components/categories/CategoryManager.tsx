import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Pencil from 'lucide-react/dist/esm/icons/pencil';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import FolderOpen from 'lucide-react/dist/esm/icons/folder-open';
import { Button } from '@/components/ui/button';
import {
  DialogTitle,
  DialogHeader,
  DialogDescription,
} from '@/components/ui/dialog';
import ConfirmDestructiveDialog from '@/components/common/ConfirmDestructiveDialog';
import { useCategoriesData } from '@/contexts/DataContext';
import { useUpgradeDialog } from '@/contexts/UpgradeDialogContext';
import { useCategoryOps } from '@/hooks/dataOps/useCategoryOps';
import { useIsPro } from '@/hooks/useIsPro';
import { toast } from '@/hooks/useToast';
import { canAddCategory, FREE_CATEGORY_LIMIT } from '@/lib/proLimits';
import type { Category } from '@/types/Category';
import CategoryForm from '@/components/categories/CategoryForm';
import { getColorTint } from '@/lib/categoryColor';

type View = { type: 'list' } | { type: 'form'; category?: Category };
type CategoryType = 'expense' | 'income';

type CategoryManagerProps = {
  categoryType?: CategoryType;
};

export const CategoryManager = ({
  categoryType = 'expense',
}: CategoryManagerProps = {}) => {
  const { t } = useTranslation();
  const { expenseCategories, incomeCategories } = useCategoriesData();
  const { handleCategoryDelete } = useCategoryOps();
  const isPro = useIsPro();
  const { openUpgrade } = useUpgradeDialog();
  const [view, setView] = useState<View>({ type: 'list' });
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  const categories = pickCategories(
    categoryType,
    expenseCategories,
    incomeCategories,
  );

  // The free cap counts each type separately (expense vs income sources).
  const handleAddClick = () => {
    if (!canAddCategory(isPro, categories.length)) {
      toast({
        title: t('pro.gate.categoryLimit', { limit: FREE_CATEGORY_LIMIT }),
      });
      openUpgrade();

      return;
    }

    setView({ type: 'form' });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      await handleCategoryDelete(deleteTarget.id);
    } catch {
      // error toast handled by useCategoryOps
    }
    setDeleteTarget(null);
  };

  if (view.type === 'form') {
    return (
      <CategoryForm
        category={view.category}
        categoryType={categoryType}
        onBack={() => setView({ type: 'list' })}
        onClose={() => setView({ type: 'list' })}
      />
    );
  }

  return (
    <>
      <div
        className="flex justify-center pt-3 pb-2 sm:hidden shrink-0"
        data-drag-handle
      >
        <div className="w-12 h-1.5 bg-muted-foreground/20 rounded-full" />
      </div>

      <div className="px-4 sm:px-6 pt-2 sm:pt-4 pb-2 shrink-0">
        <DialogHeader data-draggable-area>
          <DialogTitle className="text-xl">
            {renderManagerTitle(categoryType, t)}
          </DialogTitle>
          <DialogDescription>
            {renderManagerDescription(categoryType, t)}
          </DialogDescription>
        </DialogHeader>
      </div>

      <div
        className="overflow-y-auto flex-1 min-h-0 px-4 sm:px-6 overscroll-contain"
        style={{ touchAction: 'pan-y' }}
      >
        {renderCategoryList(
          categories,
          categoryType,
          t,
          setView,
          setDeleteTarget,
        )}
      </div>

      <div className="px-4 sm:px-6 py-3 shrink-0 border-t border-border/50">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={handleAddClick}
        >
          <Plus className="h-4 w-4 mr-2" />
          {renderAddButtonLabel(categoryType, t)}
        </Button>
      </div>

      <ConfirmDestructiveDialog
        open={deleteTarget !== null}
        title={t('categories.deleteCategory')}
        description={t('categories.deleteConfirmation', {
          name: deleteTarget?.name,
        })}
        confirmLabel={t('common.delete')}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onConfirm={handleDelete}
      />
    </>
  );
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

type TFunc = (key: string, options?: Record<string, unknown>) => string;

const pickCategories = (
  type: CategoryType,
  expenseCategories: Category[],
  incomeCategories: Category[],
) => {
  if (type === 'income') return incomeCategories;

  return expenseCategories;
};

const renderManagerTitle = (type: CategoryType, t: TFunc) => {
  if (type === 'income') return t('income.manageSources');

  return t('categories.title');
};

const renderManagerDescription = (type: CategoryType, t: TFunc) => {
  if (type === 'income') return t('income.manageDescription');

  return t('categories.manageDescription');
};

const renderAddButtonLabel = (type: CategoryType, t: TFunc) => {
  if (type === 'income') return t('income.addSource');

  return t('categories.addCategory');
};

const renderCategoryList = (
  categories: Category[],
  type: CategoryType,
  t: TFunc,
  setView: (view: View) => void,
  setDeleteTarget: (category: Category) => void,
) => {
  if (categories.length === 0) {
    return renderEmptyState(type, t);
  }

  return (
    <div className="divide-y divide-border/30">
      {categories.map((category) => (
        <div
          key={category.id}
          className="flex items-center gap-2.5 py-2 group"
        >
          {renderCategoryIndicator(category)}
          <span className="flex-1 text-sm font-medium truncate min-w-0">
            {category.name}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 -my-1.5 text-muted-foreground hover:text-foreground shrink-0"
            onClick={() => setView({ type: 'form', category })}
            aria-label={t('categories.editCategory')}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 -my-1.5 text-muted-foreground hover:text-destructive-ink shrink-0"
            onClick={() => setDeleteTarget(category)}
            aria-label={t('categories.deleteCategory')}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
    </div>
  );
};

const renderEmptyState = (type: CategoryType, t: TFunc) => {
  return (
    <div className="flex flex-col items-center text-center py-12 px-4">
      <FolderOpen
        className="h-12 w-12 text-muted-foreground/50 mb-3"
        aria-hidden="true"
      />
      <p className="text-sm font-medium">{renderEmptyTitle(type, t)}</p>
      <p className="text-xs text-muted-foreground mt-1 max-w-[240px]">
        {renderEmptyHelp(type, t)}
      </p>
    </div>
  );
};

const renderEmptyTitle = (type: CategoryType, t: TFunc) => {
  if (type === 'income') return t('income.noSources');

  return t('categories.noCategories');
};

const renderEmptyHelp = (type: CategoryType, t: TFunc) => {
  if (type === 'income') return t('income.emptySourcesHelp');

  return t('categories.emptyHelp');
};

const renderCategoryIndicator = (category: Category) => {
  if (category.icon) {
    return (
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center text-sm shrink-0"
        style={{ backgroundColor: getColorTint(category.color) }}
      >
        {category.icon}
      </div>
    );
  }

  return (
    <div
      className="w-2.5 h-2.5 rounded-full shrink-0"
      style={{ backgroundColor: category.color }}
    />
  );
};
