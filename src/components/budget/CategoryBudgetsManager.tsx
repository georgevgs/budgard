import { useTranslation } from 'react-i18next';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import FolderOpen from 'lucide-react/dist/esm/icons/folder-open';
import X from 'lucide-react/dist/esm/icons/x';
import CategoryIcon from '@/components/common/CategoryIcon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/utils';
import { getCurrencySymbol } from '@/lib/currencies';
import {
  useCategoryBudgetDrafts,
  type CategoryBudgetTotals,
} from '@/hooks/budget/useCategoryBudgetDrafts';
import type { Category } from '@/types/Category';
import { getColorTint } from '@/lib/categoryColor';

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

const CategoryBudgetsManager = ({ isOpen, onClose }: Props) => {
  const { t } = useTranslation();
  const manager = useCategoryBudgetDrafts(isOpen, onClose);

  return renderDialog({
    isOpen,
    onClose,
    sortedCategories: manager.sortedCategories,
    drafts: manager.drafts,
    totals: manager.totals,
    monthlyBudget: manager.monthlyBudget,
    defaultCurrency: manager.defaultCurrency,
    isSaving: manager.isSaving,
    error: manager.error,
    onUpdateDraft: manager.updateDraft,
    onClearDraft: manager.clearDraft,
    onSave: manager.handleSave,
    t,
  });
};

export default CategoryBudgetsManager;

// ─── Helpers ─────────────────────────────────────────────────────────────────

type TFunc = (key: string, options?: Record<string, unknown>) => string;

type DialogRenderProps = {
  isOpen: boolean;
  onClose: () => void;
  sortedCategories: Category[];
  drafts: Record<string, string>;
  totals: CategoryBudgetTotals;
  monthlyBudget: number | null;
  defaultCurrency: string;
  isSaving: boolean;
  error: string | null;
  onUpdateDraft: (categoryId: string, raw: string) => void;
  onClearDraft: (categoryId: string) => void;
  onSave: () => void;
  t: TFunc;
};

const renderDialog = ({
  isOpen,
  onClose,
  sortedCategories,
  drafts,
  totals,
  monthlyBudget,
  defaultCurrency,
  isSaving,
  error,
  onUpdateDraft,
  onClearDraft,
  onSave,
  t,
}: DialogRenderProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="sm:max-w-[480px] p-0 gap-0 max-h-[90dvh] flex flex-col"
        onOpenChange={(open) => !open && onClose()}
      >
        <div
          className="flex justify-center pt-3 pb-2 sm:hidden shrink-0"
          data-drag-handle
        >
          <div className="w-12 h-1.5 bg-muted-foreground/20 rounded-full" />
        </div>

        <div className="shrink-0 px-4 pb-3 pt-2 sm:px-6 sm:pt-6">
          <DialogHeader className="pr-10" data-draggable-area>
            <DialogTitle>{t('budget.categoryBudgets.title')}</DialogTitle>
            <DialogDescription>
              {t('budget.categoryBudgets.description')}
            </DialogDescription>
          </DialogHeader>
        </div>

        {renderTotalsBar(totals, monthlyBudget, defaultCurrency, t)}

        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-2 sm:px-6"
          style={{ touchAction: 'pan-y' }}
        >
          {renderCategoryRows(
            sortedCategories,
            drafts,
            defaultCurrency,
            isSaving,
            onUpdateDraft,
            onClearDraft,
            t,
          )}
        </div>

        {renderError(error)}

        <div className="flex shrink-0 justify-end gap-2 border-t border-border/50 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pb-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
          >
            {t('common.cancel')}
          </Button>
          <Button type="button" onClick={onSave} disabled={isSaving}>
            {renderSaveContent(isSaving, t)}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const renderTotalsBar = (
  totals: CategoryBudgetTotals,
  monthlyBudget: number | null,
  currency: string,
  t: TFunc,
) => {
  if (totals.total === 0) {
    return null;
  }

  const overGlobal = monthlyBudget !== null && totals.allocated > monthlyBudget;

  return (
    <div className="px-6 pb-2 shrink-0">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {t('budget.categoryBudgets.allocated', {
            count: totals.withCap,
            total: totals.total,
          })}
        </span>
        <span className={pickAllocatedClass(overGlobal)}>
          {formatCurrency(totals.allocated, currency)}
          {renderGlobalRef(monthlyBudget, currency)}
        </span>
      </div>
      {renderOverWarning(overGlobal, t)}
    </div>
  );
};

const renderGlobalRef = (monthlyBudget: number | null, currency: string) => {
  if (monthlyBudget === null) return null;

  return (
    <span className="text-muted-foreground">
      {' '}
      / {formatCurrency(monthlyBudget, currency)}
    </span>
  );
};

const renderOverWarning = (overGlobal: boolean, t: TFunc) => {
  if (!overGlobal) return null;

  return (
    <p className="text-xs text-destructive-ink mt-1">
      {t('budget.categoryBudgets.overGlobal')}
    </p>
  );
};

const renderCategoryRows = (
  categories: Category[],
  drafts: Record<string, string>,
  currency: string,
  isSaving: boolean,
  updateDraft: (categoryId: string, raw: string) => void,
  clearDraft: (categoryId: string) => void,
  t: TFunc,
) => {
  if (categories.length === 0) {
    return renderEmptyState(t);
  }

  return (
    <div className="divide-y divide-border/30">
      {categories.map((category) =>
        renderCategoryRow(
          category,
          drafts[category.id] ?? '',
          currency,
          isSaving,
          updateDraft,
          clearDraft,
          t,
        ),
      )}
    </div>
  );
};

const renderCategoryRow = (
  category: Category,
  draft: string,
  currency: string,
  isSaving: boolean,
  updateDraft: (categoryId: string, raw: string) => void,
  clearDraft: (categoryId: string) => void,
  t: TFunc,
) => {
  const hasDraft = draft.length > 0;

  return (
    <div key={category.id} className="flex items-center gap-3 py-2.5">
      {renderCategoryIndicator(category)}
      <span className="flex-1 text-sm font-medium truncate min-w-0">
        {category.name}
      </span>
      <div className="relative w-36 shrink-0">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
          {getCurrencySymbol(currency)}
        </span>
        <Input
          value={draft}
          onChange={(e) => updateDraft(category.id, e.target.value)}
          placeholder={t('budget.categoryBudgets.noCap')}
          aria-label={t('budget.categoryBudgets.amountAriaLabel', {
            category: category.name,
          })}
          disabled={isSaving}
          inputMode="decimal"
          autoComplete="off"
          className="h-9 pl-6 pr-7 text-right text-base tabular-nums sm:text-sm"
        />
        {renderClearButton(hasDraft, isSaving, category, clearDraft, t)}
      </div>
    </div>
  );
};

const renderClearButton = (
  hasDraft: boolean,
  isSaving: boolean,
  category: Category,
  clearDraft: (categoryId: string) => void,
  t: TFunc,
) => {
  if (!hasDraft) return null;

  return (
    <button
      type="button"
      onClick={() => clearDraft(category.id)}
      disabled={isSaving}
      aria-label={t('budget.categoryBudgets.clearAriaLabel', {
        category: category.name,
      })}
      className="absolute right-1.5 top-1/2 -translate-y-1/2 h-6 w-6 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors disabled:opacity-50 after:absolute after:-inset-2.5 after:content-['']"
    >
      <X className="h-3.5 w-3.5" />
    </button>
  );
};

const pickAllocatedClass = (overGlobal: boolean) => {
  if (overGlobal) return 'text-destructive-ink font-medium';

  return '';
};

const renderEmptyState = (t: TFunc) => {
  return (
    <div className="flex flex-col items-center text-center py-12 px-4">
      <FolderOpen
        className="h-12 w-12 text-muted-foreground/50 mb-3"
        aria-hidden="true"
      />
      <p className="text-sm font-medium">
        {t('budget.categoryBudgets.noCategories')}
      </p>
      <p className="text-xs text-muted-foreground mt-1 max-w-[260px]">
        {t('budget.categoryBudgets.noCategoriesHelp')}
      </p>
    </div>
  );
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

const renderError = (error: string | null) => {
  if (!error) return null;

  return (
    <p role="alert" className="text-xs text-destructive-ink px-6 pb-2 shrink-0">
      {error}
    </p>
  );
};

const renderSaveContent = (isSaving: boolean, t: TFunc) => {
  if (isSaving) {
    return (
      <>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        {t('common.saving')}
      </>
    );
  }

  return t('common.save');
};
