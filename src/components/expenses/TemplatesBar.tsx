import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
            className="h-6 px-2 text-xs text-muted-foreground"
            onClick={() => setIsManaging(!isManaging)}
          >
            {isManaging ? t('templates.done') : t('templates.manage')}
          </Button>
        </div>

        <div
          className={cn(
            'flex gap-2 overflow-x-auto pb-1 scrollbar-none',
            isManaging && 'pt-2 pr-2',
          )}
        >
          {templates.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => handleTemplateClick(template)}
              className={cn(
                'relative flex items-center gap-2 px-3 py-2 rounded-xl border border-border/50',
                'bg-card text-sm whitespace-nowrap shrink-0',
                'transition-colors',
                !isManaging &&
                  'hover:bg-accent/50 active:bg-accent cursor-pointer',
                isManaging && 'cursor-default',
              )}
              aria-label={t('templates.useTemplate', {
                description: template.description,
              })}
            >
              {renderCategoryIndicator(template)}
              <span className="font-medium">
                {template.description}
              </span>
              <span className="text-muted-foreground tabular-nums">
                {formatCurrency(
                  template.amount,
                  template.original_currency ?? defaultCurrency,
                )}
              </span>
              {renderDeleteButton(isManaging, template, handleDeleteClick, t)}
            </button>
          ))}
        </div>
      </div>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={() => setDeleteTarget(null)}
      >
        <AlertDialogContent
          className="sm:max-w-[425px]"
          onOpenChange={() => setDeleteTarget(null)}
        >
          <AlertDialogHeader data-draggable-area>
            <AlertDialogTitle>{t('templates.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('templates.deleteConfirmation')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TemplatesBar;

// ─── Helper render functions ──────────────────────────────────────────────────

const renderCategoryIndicator = (template: ExpenseTemplate) => {
  if (!template.category) return null;

  if (template.category.icon) {
    return <span className="text-sm">{template.category.icon}</span>;
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
      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
      aria-label={t('expenses.deleteTemplate', { name: template.description })}
    >
      <X className="h-3 w-3" />
    </button>
  );
};
