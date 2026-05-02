import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import FolderOpen from 'lucide-react/dist/esm/icons/folder-open';
import X from 'lucide-react/dist/esm/icons/x';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  formatCurrency,
  formatCurrencyInput,
  parseCurrencyInput,
} from '@/lib/utils';
import { getCurrencySymbol } from '@/lib/currencies';
import { useData } from '@/contexts/DataContext';
import { useDataOperations } from '@/hooks/useDataOperations';
import { useToast } from '@/hooks/useToast';
import type { Category } from '@/types/Category';
import type { CategoryBudget } from '@/types/CategoryBudget';

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

const CategoryBudgetsManager = ({ isOpen, onClose }: Props) => {
  const { t } = useTranslation();
  const { expenseCategories, categoryBudgets, defaultCurrency, monthlyBudget } =
    useData();
  const { handleCategoryBudgetUpsert, handleCategoryBudgetDelete } =
    useDataOperations();
  const { toast } = useToast();

  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset drafts whenever the dialog opens or the underlying caps change
  // (e.g. another tab updated them).
  useEffect(() => {
    if (!isOpen) return;
    setDrafts(buildInitialDrafts(expenseCategories, categoryBudgets));
    setError(null);
  }, [isOpen, expenseCategories, categoryBudgets]);

  const sortedCategories = useMemo(
    () =>
      [...expenseCategories].sort((a, b) => a.name.localeCompare(b.name)),
    [expenseCategories],
  );

  const totals = useMemo(
    () => computeTotals(expenseCategories, drafts),
    [expenseCategories, drafts],
  );

  const updateDraft = (categoryId: string, raw: string) => {
    setError(null);
    setDrafts((prev) => ({
      ...prev,
      [categoryId]: formatCurrencyInput(raw),
    }));
  };

  const handleSave = async () => {
    const diff = computeDiff(expenseCategories, categoryBudgets, drafts);

    if (diff.invalid) {
      setError(t('budget.categoryBudgets.invalidAmount'));
      return;
    }

    if (diff.upserts.length === 0 && diff.deletes.length === 0) {
      onClose();
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await Promise.all([
        ...diff.upserts.map(({ categoryId, amount }) =>
          handleCategoryBudgetUpsert(categoryId, amount),
        ),
        ...diff.deletes.map((categoryId) =>
          handleCategoryBudgetDelete(categoryId),
        ),
      ]);
      toast({
        variant: 'success',
        title: t('budget.categoryBudgets.savedTitle'),
      });
      onClose();
    } catch {
      // Error toast already handled by useDataOperations
    } finally {
      setIsSaving(false);
    }
  };

  const clearDraft = (categoryId: string) => {
    setError(null);
    setDrafts((prev) => ({ ...prev, [categoryId]: '' }));
  };

  return renderDialog({
    isOpen,
    onClose,
    sortedCategories,
    drafts,
    totals,
    monthlyBudget,
    defaultCurrency,
    isSaving,
    error,
    onUpdateDraft: updateDraft,
    onClearDraft: clearDraft,
    onSave: handleSave,
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
  totals: { allocated: number; withCap: number; total: number };
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
        className="sm:max-w-[480px] p-0 gap-0 max-h-[90vh] flex flex-col"
        onOpenChange={(open) => !open && onClose()}
      >
        <div
          className="flex justify-center pt-3 pb-2 sm:hidden shrink-0"
          data-drag-handle
        >
          <div className="w-12 h-1.5 bg-muted-foreground/20 rounded-full" />
        </div>

        <div className="px-6 pt-2 sm:pt-6 pb-3 shrink-0">
          <DialogHeader data-draggable-area>
            <DialogTitle>{t('budget.categoryBudgets.title')}</DialogTitle>
            <DialogDescription>
              {t('budget.categoryBudgets.description')}
            </DialogDescription>
          </DialogHeader>
        </div>

        {renderTotalsBar(totals, monthlyBudget, defaultCurrency, t)}

        <div
          className="overflow-y-auto flex-1 min-h-0 px-6 py-2 overscroll-contain"
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

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-border/50 shrink-0">
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

type Diff = {
  upserts: { categoryId: string; amount: number }[];
  deletes: string[];
  invalid: boolean;
};

const buildInitialDrafts = (
  categories: Category[],
  budgets: CategoryBudget[],
): Record<string, string> => {
  const map: Record<string, string> = {};
  const byCategoryId = new Map(budgets.map((b) => [b.category_id, b]));

  for (const cat of categories) {
    const existing = byCategoryId.get(cat.id);
    if (existing) {
      map[cat.id] = formatCurrencyInput(existing.monthly_amount.toString());
      continue;
    }
    map[cat.id] = '';
  }

  return map;
};

const computeTotals = (
  categories: Category[],
  drafts: Record<string, string>,
) => {
  let allocated = 0;
  let withCap = 0;

  for (const cat of categories) {
    const raw = drafts[cat.id] ?? '';
    if (!raw) continue;
    const amount = parseCurrencyInput(raw);
    if (amount > 0) {
      allocated += amount;
      withCap += 1;
    }
  }

  return { allocated, withCap, total: categories.length };
};

const computeDiff = (
  categories: Category[],
  budgets: CategoryBudget[],
  drafts: Record<string, string>,
): Diff => {
  const byCategoryId = new Map(budgets.map((b) => [b.category_id, b]));
  const upserts: { categoryId: string; amount: number }[] = [];
  const deletes: string[] = [];
  let invalid = false;

  for (const cat of categories) {
    const raw = drafts[cat.id] ?? '';
    const existing = byCategoryId.get(cat.id);

    if (raw === '') {
      if (existing) deletes.push(cat.id);
      continue;
    }

    const amount = parseCurrencyInput(raw);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 10000000) {
      invalid = true;
      continue;
    }

    if (!existing || existing.monthly_amount !== amount) {
      upserts.push({ categoryId: cat.id, amount });
    }
  }

  return { upserts, deletes, invalid };
};

const renderTotalsBar = (
  totals: { allocated: number; withCap: number; total: number },
  monthlyBudget: number | null,
  currency: string,
  t: TFunc,
) => {
  if (totals.total === 0) return null;

  const overGlobal =
    monthlyBudget !== null && totals.allocated > monthlyBudget;

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
    <p className="text-xs text-destructive mt-1">
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
          className="h-9 pl-6 pr-7 text-sm tabular-nums text-right"
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
      className="absolute right-1.5 top-1/2 -translate-y-1/2 h-6 w-6 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors disabled:opacity-50"
    >
      <X className="h-3.5 w-3.5" />
    </button>
  );
};

const pickAllocatedClass = (overGlobal: boolean) => {
  if (overGlobal) return 'text-destructive font-medium';

  return '';
};

const renderEmptyState = (t: TFunc) => {
  return (
    <div className="flex flex-col items-center text-center py-12 px-4">
      <FolderOpen
        className="h-10 w-10 text-muted-foreground/40 mb-3"
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
        className="w-7 h-7 rounded-full flex items-center justify-center text-sm shrink-0"
        style={{ backgroundColor: `${category.color}20` }}
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

const renderError = (error: string | null) => {
  if (!error) return null;

  return (
    <p className="text-xs text-destructive px-6 pb-2 shrink-0">{error}</p>
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
