import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
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
import GoalsLoadingState from '@/components/goals/GoalsLoading';

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

  if (!isInitialized || !isSecondaryLoaded) {
    return <GoalsLoadingState />;
  }

  return (
    <div className="container max-w-4xl mx-auto p-4 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">{t('goals.title')}</h2>
          {renderSubtitle(goals.length, t)}
        </div>
        <Button
          onClick={() => setIsFormOpen(true)}
          size="sm"
          className="shrink-0"
          aria-label={t('goals.addGoal')}
        >
          <Plus className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">{t('goals.addGoal')}</span>
        </Button>
      </div>

      <div className="grid gap-4">{renderGoalsOrEmpty(goals, handleEdit, handleDelete, setIsFormOpen, t)}</div>

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
}

export default GoalsList;

// --- Helpers ---

type TranslateFunction = (
  key: string,
  options?: Record<string, unknown>,
) => string;

const renderSubtitle = (count: number, t: TranslateFunction) => {
  if (count === 0) return null;

  return (
    <p className="text-sm text-muted-foreground">
      {t('goals.subtitle', { count })}
    </p>
  );
}

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
}

const renderEmptyState = (
  onOpenForm: (open: boolean) => void,
  t: TranslateFunction,
) => (
  <Card className="p-8 text-center overflow-hidden">
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
  </Card>
);
