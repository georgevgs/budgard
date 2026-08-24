import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import CategoryIcon from '@/components/common/CategoryIcon';
import TemplateDeleteDialog from '@/components/expenses/TemplateDeleteDialog';
import X from 'lucide-react/dist/esm/icons/x';
import { cn, formatCurrency } from '@/lib/utils';
import type { ExpenseTemplate } from '@/types/ExpenseTemplate';

type TemplatesBarProps = {
  templates: ExpenseTemplate[];
  defaultCurrency: string;
  onUse: (template: ExpenseTemplate) => void;
  onDelete: (templateId: string) => void;
};

const TemplatesBar = ({
  templates,
  defaultCurrency,
  onUse,
  onDelete,
}: TemplatesBarProps) => {
  const { t } = useTranslation();
  const [isManaging, setIsManaging] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ExpenseTemplate | null>(
    null,
  );

  if (templates.length === 0) return null;

  const handleTemplateClick = (template: ExpenseTemplate) => {
    if (isManaging) return;
    onUse(template);
  };

  const handleDeleteClick = (
    e: React.MouseEvent,
    template: ExpenseTemplate,
  ) => {
    e.stopPropagation();
    setDeleteTarget(template);
  };

  const handleConfirmDelete = () => {
    if (deleteTarget) {
      onDelete(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">
            {t('templates.title')}
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="px-2 text-xs text-muted-foreground"
            onClick={() => setIsManaging(!isManaging)}
          >
            {renderManageLabel(isManaging, t)}
          </Button>
        </div>

        <div
          className={cn(
            'flex gap-2 overflow-x-auto pb-1 scrollbar-none',
            getTemplatesListClass(isManaging),
          )}
        >
          {templates.map((template) => (
            <div key={template.id} className="relative shrink-0">
              <button
                type="button"
                onClick={() => handleTemplateClick(template)}
                disabled={isManaging}
                className={cn(
                  'flex items-center gap-2 rounded-xl border border-border/50 px-3 py-2',
                  'bg-card text-sm whitespace-nowrap transition-colors',
                  getTemplateButtonStateClass(isManaging),
                )}
                aria-label={t('templates.useTemplate', {
                  description: template.description,
                })}
              >
                {renderCategoryIndicator(template)}
                <span className="font-medium">{template.description}</span>
                <span className="text-muted-foreground tabular-nums">
                  {formatCurrency(
                    template.amount,
                    template.original_currency ?? defaultCurrency,
                  )}
                </span>
              </button>
              {renderDeleteButton(isManaging, template, handleDeleteClick, t)}
            </div>
          ))}
        </div>
      </div>

      <TemplateDeleteDialog
        open={deleteTarget !== null}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
};

export default memo(TemplatesBar);

// ─── Helper render functions ──────────────────────────────────────────────────

const renderManageLabel = (
  isManaging: boolean,
  t: (key: string) => string,
): string => {
  if (isManaging) {
    return t('templates.done');
  }

  return t('templates.manage');
};

const getTemplateButtonStateClass = (isManaging: boolean): string => {
  if (isManaging) return 'cursor-default';

  return 'hover:bg-accent/50 active:bg-accent cursor-pointer';
};

const getTemplatesListClass = (isManaging: boolean): string | undefined => {
  if (isManaging) return 'pt-2 pr-2';

  return undefined;
};

const renderCategoryIndicator = (template: ExpenseTemplate) => {
  if (!template.category) return null;

  if (template.category.icon) {
    return <CategoryIcon icon={template.category.icon} />;
  }

  return (
    <div
      className="w-2.5 h-2.5 rounded-full shrink-0"
      style={{ backgroundColor: template.category.color }}
      aria-hidden="true"
    />
  );
};

const renderDeleteButton = (
  isManaging: boolean,
  template: ExpenseTemplate,
  onClick: (e: React.MouseEvent, template: ExpenseTemplate) => void,
  t: (key: string, options?: Record<string, unknown>) => string,
) => {
  if (!isManaging) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={(e) => onClick(e, template)}
      className="absolute -top-3 -right-3 flex h-11 w-11 items-center justify-center rounded-full bg-destructive text-destructive-foreground transition-colors hover:bg-destructive/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      aria-label={t('expenses.deleteTemplate', { name: template.description })}
    >
      <X className="h-3 w-3" />
    </button>
  );
};
