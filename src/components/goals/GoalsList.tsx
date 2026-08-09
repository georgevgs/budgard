import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import SurfaceCard from '@/components/common/SurfaceCard';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Target from 'lucide-react/dist/esm/icons/target';
import { useGoalsData, useDataConfig } from '@/contexts/DataContext';
import { useGoalOps } from '@/hooks/dataOps/useGoalOps';
import { useGoalSubmit } from '@/hooks/goals/useGoalSubmit';
import type { Goal } from '@/types/Goal';
import GoalCard from '@/components/goals/GoalCard';
import GoalForm from '@/components/goals/GoalForm';
import PageHeader from '@/components/common/PageHeader';
import GoalsLoadingState from '@/components/goals/GoalsLoading';
import { useDelayedLoading } from '@/hooks/useDelayedLoading';

const GoalsList = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | undefined>(undefined);
  const { t } = useTranslation();
  const goals = useGoalsData();
  const { isInitialized, isSecondaryLoaded } = useDataConfig();
  const { handleGoalDelete } = useGoalOps();
  const { handleSubmit } = useGoalSubmit({
    selectedGoal,
    onDone: () => {
      setIsFormOpen(false);
      setSelectedGoal(undefined);
    },
  });

  const handleEdit = (goal: Goal) => {
    setSelectedGoal(goal);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await handleGoalDelete(id);
    } catch {
      // Error toast already shown in hook
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setSelectedGoal(undefined);
  };

  const isLoading = !isInitialized || !isSecondaryLoaded;
  const showSkeleton = useDelayedLoading(isLoading);

  if (isLoading) {
    return renderLoading(showSkeleton);
  }

  return (
    <div className="page-shell space-y-4">
      <PageHeader
        title={t('goals.title')}
        subtitle={renderSubtitle(goals.length, t)}
        action={
          <Button
            onClick={() => setIsFormOpen(true)}
            size="sm"
            aria-label={t('goals.addGoal')}
          >
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">{t('goals.addGoal')}</span>
          </Button>
        }
      />

      <div className="grid gap-4">
        {renderGoalsOrEmpty(goals, handleEdit, handleDelete, setIsFormOpen, t)}
      </div>

      <Dialog open={isFormOpen} onOpenChange={handleFormClose}>
        <DialogContent
          className="sm:max-w-[500px] p-0 gap-0"
          onOpenChange={handleFormClose}
        >
          <GoalForm
            goal={selectedGoal}
            onSubmit={handleSubmit}
            onClose={handleFormClose}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GoalsList;

// --- Helpers ---

const renderLoading = (showSkeleton: boolean) => {
  if (!showSkeleton) {
    return null;
  }

  return <GoalsLoadingState />;
};

type TranslateFunction = (
  key: string,
  options?: Record<string, unknown>,
) => string;

const renderSubtitle = (
  count: number,
  t: TranslateFunction,
): string | undefined => {
  if (count === 0) {
    return undefined;
  }

  return t('goals.subtitle', { count });
};

const renderGoalsOrEmpty = (
  goals: Goal[],
  onEdit: (goal: Goal) => void,
  onDelete: (id: string) => void,
  onOpenForm: (open: boolean) => void,
  t: TranslateFunction,
) => {
  if (goals.length === 0) {
    return renderEmptyState(onOpenForm, t);
  }

  return goals.map((goal, index) => (
    <div
      key={goal.id}
      className="card-enter"
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
    >
      <GoalCard goal={goal} onEdit={onEdit} onDelete={onDelete} />
    </div>
  ));
};

const renderEmptyState = (
  onOpenForm: (open: boolean) => void,
  t: TranslateFunction,
) => (
  <SurfaceCard flush className="p-8 text-center">
    <div className="flex flex-col items-center gap-3">
      <Target className="h-12 w-12 text-muted-foreground/50" />
      <div className="max-w-[280px]">
        <p className="font-medium">{t('goals.empty.title')}</p>
        <p className="text-sm text-muted-foreground">
          {t('goals.empty.description')}
        </p>
      </div>
      <Button
        onClick={() => onOpenForm(true)}
        variant="outline"
        size="sm"
        className="mt-2 max-w-full"
      >
        <Plus className="h-4 w-4 mr-2 shrink-0" />
        <span className="truncate">{t('goals.empty.cta')}</span>
      </Button>
    </div>
  </SurfaceCard>
);
