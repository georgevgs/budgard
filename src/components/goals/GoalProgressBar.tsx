import { useTranslation } from 'react-i18next';
import { Progress } from '@/components/ui/progress';
import { cn, formatCurrency } from '@/lib/utils';
import type { GoalProgress } from '@/hooks/useGoalProgress';

type Props = {
  progress: GoalProgress;
  currency: string;
}

const GoalProgressBar = ({ progress, currency }: Props) => {
  const { t } = useTranslation();
  const percentLabel = Math.round(progress.percent * 100);
  const indicatorClass = pickIndicatorClass(progress);

  return (
    <div className="space-y-2">
      <Progress
        value={percentLabel}
        className="h-2"
        indicatorClassName={indicatorClass}
      />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="font-medium text-foreground">
          {formatCurrency(progress.current, currency)}
          <span className="text-muted-foreground">
            {' / '}
            {formatCurrency(progress.target, currency)}
          </span>
        </span>
        <span className={cn('tabular-nums', getPercentClass(progress))}>
          {renderPercentLabel(percentLabel, progress, t)}
        </span>
      </div>
    </div>
  );
}

export default GoalProgressBar;

// --- Helpers ---

type TranslateFunction = (
  key: string,
  options?: Record<string, unknown>,
) => string;

const pickIndicatorClass = (progress: GoalProgress) => {
  if (progress.isOverachieved || progress.percent >= 1) {
    return 'bg-income';
  }

  if (progress.isOverdue) {
    return 'bg-destructive';
  }

  if (progress.isOnTrack === false) {
    return 'bg-amber-500';
  }

  return 'bg-primary';
}

const getPercentClass = (progress: GoalProgress) => {
  if (progress.isOverachieved || progress.percent >= 1) {
    return 'text-income font-semibold';
  }

  if (progress.isOverdue) {
    return 'text-destructive font-medium';
  }

  return 'text-foreground';
}

const renderPercentLabel = (
  percent: number,
  progress: GoalProgress,
  t: TranslateFunction,
) => {
  if (progress.isOverachieved) {
    return t('goals.overachieved', { percent });
  }

  return t('goals.percentComplete', { percent });
}
