import { useTranslation } from 'react-i18next';
import { Progress } from '@/common/ui/progress';
import { cn, formatCurrency } from '@/constants/utils';
import type { GoalProgress } from '@/common/hooks/useGoalProgress';

type GoalProgressBarProps = {
  progress: GoalProgress;
  currency: string;
};

export const GoalProgressBar = ({ progress, currency }: GoalProgressBarProps) => {
  const { t } = useTranslation();
  const percentLabel = Math.round(progress.percent * 100);
  const indicatorClass = pickIndicatorClass(progress);

  return (
    <div className="space-y-2">
      <Progress
        value={percentLabel}
        className="h-2 progress-fill"
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
};
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
    return 'bg-warning';
  }

  return 'bg-primary';
};

const getPercentClass = (progress: GoalProgress) => {
  if (progress.isOverachieved || progress.percent >= 1) {
    return 'text-income-ink font-semibold';
  }

  if (progress.isOverdue) {
    return 'text-destructive-ink font-medium';
  }

  return 'text-foreground';
};

const renderPercentLabel = (
  percent: number,
  progress: GoalProgress,
  t: TranslateFunction,
) => {
  if (progress.isOverachieved) {
    return t('goals.overachieved', { percent });
  }

  return t('goals.percentComplete', { percent });
};
