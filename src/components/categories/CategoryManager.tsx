import { useTranslation } from 'react-i18next';
import Plus from 'lucide-react/dist/esm/icons/plus';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';
import Pencil from 'lucide-react/dist/esm/icons/pencil';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import FolderOpen from 'lucide-react/dist/esm/icons/folder-open';
import CategoryIcon from '@/components/common/CategoryIcon';
import { Button } from '@/components/ui/button';
import {
  DialogTitle,
  DialogHeader,
  DialogDescription,
} from '@/components/ui/dialog';
import ConfirmDestructiveDialog from '@/components/common/ConfirmDestructiveDialog';
import CategoryDeleteDialog from '@/components/categories/CategoryDeleteDialog';
import { useCategoryManager } from '@/hooks/categories/useCategoryManager';
import { useDataConfig } from '@/contexts/DataContext';
import type { Category, CategoryType } from '@/types/Category';
import CategoryForm from '@/components/categories/CategoryForm';
import { getColorTint } from '@/lib/categoryColor';

type CategoryManagerProps = {
  categoryType?: CategoryType;
  onBack?: () => void;
};

export const CategoryManager = ({
  categoryType = 'expense',
  onBack,
}: CategoryManagerProps = {}) => {
  const { t } = useTranslation();
  const { defaultCurrency } = useDataConfig();
  const manager = useCategoryManager(categoryType);

  if (manager.view.type === 'form') {
    return (
      <CategoryForm
        category={manager.view.category}
        categoryType={categoryType}
        onBack={manager.showList}
        onClose={manager.showList}
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

      <div className="shrink-0 px-4 pb-2 pt-2 sm:px-6 sm:pt-4">
        <div className="flex items-start gap-2" data-draggable-area>
          {renderBackButton(onBack, t)}
          <DialogHeader className="min-w-0 flex-1 pr-10">
            <DialogTitle className="text-xl">
              {renderManagerTitle(categoryType, t)}
            </DialogTitle>
            <DialogDescription>
              {renderManagerDescription(categoryType, t)}
            </DialogDescription>
          </DialogHeader>
        </div>
      </div>

      <div
        className="overflow-y-auto flex-1 min-h-0 px-4 sm:px-6 overscroll-contain"
        style={{ touchAction: 'pan-y' }}
      >
        {renderCategoryList(
          manager.categories,
          categoryType,
          t,
          manager.editCategory,
          manager.requestDelete,
        )}
      </div>

      <div className="shrink-0 border-t border-border/50 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:pb-3">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={manager.handleAddClick}
        >
          <Plus className="h-4 w-4 mr-2" />
          {renderAddButtonLabel(categoryType, t)}
        </Button>
      </div>

      {renderDeleteDialogs(manager, defaultCurrency, t)}
    </>
  );
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

type TFunc = (key: string, options?: Record<string, unknown>) => string;

const renderBackButton = (onBack: (() => void) | undefined, t: TFunc) => {
  if (!onBack) {
    return null;
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-11 w-11 shrink-0"
      onClick={onBack}
      aria-label={t('common.back')}
    >
      <ArrowLeft className="h-4 w-4" />
    </Button>
  );
};

// A category with nothing tied to it gets the plain "are you sure" dialog; one
// with expenses (or income rows) attached gets the impact-aware dialog, which
// also offers moving them into another category instead of going Uncategorized.
const renderDeleteDialogs = (
  manager: ReturnType<typeof useCategoryManager>,
  currency: string,
  t: TFunc,
) => {
  const hasImpact =
    manager.deleteImpact !== null && manager.deleteImpact.count > 0;

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      manager.cancelDelete();
    }
  };

  return (
    <>
      <ConfirmDestructiveDialog
        open={manager.deleteTarget !== null && !hasImpact}
        title={t('categories.deleteCategory')}
        description={t('categories.deleteConfirmation', {
          name: manager.deleteTarget?.name,
        })}
        confirmLabel={t('common.delete')}
        onOpenChange={handleOpenChange}
        onConfirm={() => manager.handleConfirmDelete(null)}
      />
      <CategoryDeleteDialog
        open={manager.deleteTarget !== null && hasImpact}
        category={manager.deleteTarget}
        impact={manager.deleteImpact}
        mergeCandidates={manager.mergeCandidates}
        currency={currency}
        onOpenChange={handleOpenChange}
        onConfirm={manager.handleConfirmDelete}
      />
    </>
  );
};

const renderManagerTitle = (type: CategoryType, t: TFunc) => {
  if (type === 'income') {
    return t('income.manageSources');
  }

  return t('categories.title');
};

const renderManagerDescription = (type: CategoryType, t: TFunc) => {
  if (type === 'income') {
    return t('income.manageDescription');
  }

  return t('categories.manageDescription');
};

const renderAddButtonLabel = (type: CategoryType, t: TFunc) => {
  if (type === 'income') {
    return t('income.addSource');
  }

  return t('categories.addCategory');
};

const renderCategoryList = (
  categories: Category[],
  type: CategoryType,
  t: TFunc,
  onEdit: (category: Category) => void,
  onDelete: (category: Category) => void,
) => {
  if (categories.length === 0) {
    return renderEmptyState(type, t);
  }

  return (
    <div className="divide-y divide-border/30">
      {categories.map((category) => (
        <div key={category.id} className="flex items-center gap-2.5 py-2 group">
          {renderCategoryIndicator(category)}
          <span className="flex-1 text-sm font-medium truncate min-w-0">
            {category.name}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="-my-1.5 h-11 w-11 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={() => onEdit(category)}
            aria-label={t('categories.editCategory')}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="-my-1.5 h-11 w-11 shrink-0 text-muted-foreground hover:text-destructive-ink"
            onClick={() => onDelete(category)}
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
  if (type === 'income') {
    return t('income.noSources');
  }

  return t('categories.noCategories');
};

const renderEmptyHelp = (type: CategoryType, t: TFunc) => {
  if (type === 'income') {
    return t('income.emptySourcesHelp');
  }

  return t('categories.emptyHelp');
};

const renderCategoryIndicator = (category: Category) => {
  if (category.icon) {
    return (
      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: getColorTint(category.color) }}
      >
        <CategoryIcon icon={category.icon} className="text-foreground/75" />
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
