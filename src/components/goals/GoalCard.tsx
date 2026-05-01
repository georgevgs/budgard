import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import MoreVertical from 'lucide-react/dist/esm/icons/more-vertical';
import Target from 'lucide-react/dist/esm/icons/target';
import Calendar from 'lucide-react/dist/esm/icons/calendar';
import GoalProgressBar from '@/components/goals/GoalProgressBar';
import { useGoalProgress } from '@/hooks/useGoalProgress';
import { useData } from '@/contexts/DataContext';
import type { Goal } from '@/types/Goal';
import { format, parseISO } from 'date-fns';
import { el, enUS } from 'date-fns/locale';
import type { Locale } from 'date-fns';
import type { GoalProgress } from '@/hooks/useGoalProgress';

type Props = {
  goal: Goal;
  onEdit: (goal: Goal) => void;
  onDelete: (id: string) => void;
}

const GoalCard = ({ goal, onEdit, onDelete }: Props) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { t, i18n } = useTranslation();
  const { categories, tags } = useData();
  const progress = useGoalProgress(goal);
  const dateLocale = i18n.language === 'el' ? el : enUS;

  const blurActiveElement = () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };

  const handleEditClick = () => {
    blurActiveElement();
    setDropdownOpen(false);
    setTimeout(() => onEdit(goal), 0);
  };

  const handleDeleteClick = () => {
    blurActiveElement();
    setDropdownOpen(false);
    setTimeout(() => setShowDeleteDialog(true), 0);
  };

  const handleConfirmDelete = () => {
    onDelete(goal.id);
    setShowDeleteDialog(false);
  };

  return (
    <>
      <Card className="border-border/50 rounded-2xl">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div
                className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${goal.color}20`, color: goal.color }}
              >
                <Target className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{goal.name}</p>
                {renderSourceLabel(goal, categories, tags, t)}
              </div>
            </div>
            <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
                >
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">{t('common.openMenu')}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-32">
                <DropdownMenuItem onClick={handleEditClick}>
                  {t('common.edit')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleDeleteClick}
                  className="text-destructive focus:text-destructive"
                >
                  {t('common.delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <GoalProgressBar progress={progress} currency={goal.currency} />

          {renderFooter(goal, progress, dateLocale, t)}
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent
          className="sm:max-w-[425px]"
          onOpenChange={setShowDeleteDialog}
        >
          <AlertDialogHeader data-draggable-area>
            <AlertDialogTitle>{t('goals.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('goals.deleteConfirmation', { name: goal.name })}
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
}

export default GoalCard;

// --- Helpers ---

type TranslateFunction = (
  key: string,
  options?: Record<string, unknown>,
) => string;

const renderSourceLabel = (
  goal: Goal,
  categories: { id: string; name: string }[],
  tags: { id: string; name: string }[],
  t: TranslateFunction,
) => {
  if (goal.source_type === 'category') {
    const category = categories.find((c) => c.id === goal.category_id);
    if (!category) return null;

    return (
      <p className="text-xs text-muted-foreground truncate">
        {t('goals.sourceLabel.category', { name: category.name })}
      </p>
    );
  }

  if (goal.source_type === 'tag') {
    const tag = tags.find((tg) => tg.id === goal.tag_id);
    if (!tag) return null;

    return (
      <p className="text-xs text-muted-foreground truncate">
        {t('goals.sourceLabel.tag', { name: tag.name })}
      </p>
    );
  }

  return (
    <p className="text-xs text-muted-foreground truncate">
      {t('goals.sourceLabel.netDelta')}
    </p>
  );
}

const renderFooter = (
  goal: Goal,
  progress: GoalProgress,
  dateLocale: Locale,
  t: TranslateFunction,
) => {
  if (!goal.deadline) return null;

  const deadlineDate = parseISO(goal.deadline);
  const dateLabel = format(deadlineDate, 'MMM d, yyyy', { locale: dateLocale });

  return (
    <div className="flex items-center justify-between text-xs">
      <div className="flex items-center gap-1 text-muted-foreground">
        <Calendar className="h-3 w-3" />
        <span>{t('goals.deadlineLabel', { date: dateLabel })}</span>
      </div>
      {renderPaceBadge(progress, t)}
    </div>
  );
}

const renderPaceBadge = (progress: GoalProgress, t: TranslateFunction) => {
  if (progress.percent >= 1) {
    return (
      <Badge variant="secondary" className="text-xs bg-income/10 text-income">
        {t('goals.reached')}
      </Badge>
    );
  }

  if (progress.isOverdue) {
    return (
      <Badge variant="destructive" className="text-xs">
        {t('goals.overdue')}
      </Badge>
    );
  }

  if (progress.daysRemaining !== null && progress.daysRemaining <= 30) {
    return (
      <Badge variant="secondary" className="text-xs">
        {t('goals.daysLeft', { days: progress.daysRemaining })}
      </Badge>
    );
  }

  if (progress.isOnTrack === false) {
    return (
      <Badge
        variant="secondary"
        className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400"
      >
        {t('goals.behind')}
      </Badge>
    );
  }

  if (progress.isOnTrack === true) {
    return (
      <Badge variant="secondary" className="text-xs">
        {t('goals.onTrack')}
      </Badge>
    );
  }

  return null;
}
