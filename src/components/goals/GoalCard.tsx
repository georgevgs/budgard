import { useTranslation } from 'react-i18next';
import SurfaceCard from '@/components/common/SurfaceCard';
import { Badge } from '@/components/ui/badge';
import Target from 'lucide-react/dist/esm/icons/target';
import Calendar from 'lucide-react/dist/esm/icons/calendar';
import GoalProgressBar from '@/components/goals/GoalProgressBar';
import GoalCardActions from '@/components/goals/GoalCardActions';
import { useGoalProgress } from '@/hooks/useGoalProgress';
import { useDateLocale } from '@/hooks/useDateLocale';
import {
  useAccountsData,
  useCategoriesData,
  useTagsData,
} from '@/contexts/DataContext';
import type { Account } from '@/types/Account';
import type { Goal } from '@/types/Goal';
import { format, parseISO } from 'date-fns';
import type { Locale } from 'date-fns';
import type { GoalProgress } from '@/hooks/useGoalProgress';
import { getColorTint } from '@/lib/categoryColor';

type Props = {
  goal: Goal;
  onEdit: (goal: Goal) => void;
  onDelete: (id: string) => void;
};

const GoalCard = ({ goal, onEdit, onDelete }: Props) => {
  const { t } = useTranslation();
  const { categories } = useCategoriesData();
  const tags = useTagsData();
  const { accounts } = useAccountsData();
  const progress = useGoalProgress(goal);
  const dateLocale = useDateLocale();

  return (
    <SurfaceCard className="transition-colors hover:bg-muted/70">
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div
              className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
              style={{
                backgroundColor: getColorTint(goal.color),
                color: goal.color,
              }}
            >
              <Target className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium truncate">{goal.name}</p>
              {renderSourceLabel(goal, categories, tags, accounts, t)}
            </div>
          </div>
          <GoalCardActions goal={goal} onEdit={onEdit} onDelete={onDelete} />
        </div>

        <GoalProgressBar progress={progress} currency={goal.currency} />

        {renderFooter(goal, progress, dateLocale, t)}
      </div>
    </SurfaceCard>
  );
};

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
  accounts: Account[],
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

  if (goal.source_type === 'account') {
    const account = accounts.find(
      (candidate) => candidate.id === goal.linked_account_id,
    );
    if (!account) return null;

    return (
      <p className="text-xs text-muted-foreground truncate">
        {t('goals.sourceLabel.account', { name: account.name })}
      </p>
    );
  }

  return (
    <p className="text-xs text-muted-foreground truncate">
      {t('goals.sourceLabel.netDelta')}
    </p>
  );
};

const renderFooter = (
  goal: Goal,
  progress: GoalProgress,
  dateLocale: Locale,
  t: TranslateFunction,
) => {
  if (!goal.deadline) return null;

  const deadlineDate = parseISO(goal.deadline);
  const dateLabel = format(deadlineDate, 'PP', { locale: dateLocale });

  return (
    <div className="flex items-center justify-between text-xs">
      <div className="flex items-center gap-1 text-muted-foreground">
        <Calendar className="h-3 w-3" />
        <span>{t('goals.deadlineLabel', { date: dateLabel })}</span>
      </div>
      {renderPaceBadge(progress, t)}
    </div>
  );
};

const renderPaceBadge = (progress: GoalProgress, t: TranslateFunction) => {
  if (progress.percent >= 1) {
    return (
      <Badge
        variant="secondary"
        className="text-xs bg-income/10 text-income-ink"
      >
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
        className="text-xs bg-warning/10 text-warning-ink"
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
};
