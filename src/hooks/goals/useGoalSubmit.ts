import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useDataConfig } from '@/contexts/DataContext';
import { useGoalOps } from '@/hooks/dataOps/useGoalOps';
import { parseCurrencyInput } from '@/lib/utils';
import type { GoalFormData } from '@/lib/validations';
import type { Goal } from '@/types/Goal';

type UseGoalSubmitArgs = {
  selectedGoal: Goal | undefined;
  onDone: () => void;
};

export const useGoalSubmit = ({ selectedGoal, onDone }: UseGoalSubmitArgs) => {
  const { session } = useAuth();
  const { defaultCurrency } = useDataConfig();
  const { handleGoalCreate, handleGoalUpdate } = useGoalOps();

  const handleSubmit = async (values: GoalFormData) => {
    if (!session?.user?.id) return;

    let deadline: string | null = null;
    if (values.deadline) {
      deadline = format(values.deadline, 'yyyy-MM-dd');
    }

    let categoryId: string | null = null;
    if (values.source_type === 'category') {
      categoryId = values.category_id ?? null;
    }

    let tagId: string | null = null;
    if (values.source_type === 'tag') {
      tagId = values.tag_id ?? null;
    }

    const payload: Partial<Goal> = {
      name: values.name,
      target_amount: parseCurrencyInput(values.target_amount),
      currency: selectedGoal?.currency ?? defaultCurrency,
      deadline,
      source_type: values.source_type,
      category_id: categoryId,
      tag_id: tagId,
      icon: values.icon,
      color: values.color,
    };

    try {
      if (selectedGoal) {
        await handleGoalUpdate(selectedGoal.id, payload);
      } else {
        await handleGoalCreate({ ...payload, user_id: session.user.id });
      }

      onDone();
    } catch {
      // Error toast already shown in hook
    }
  };

  return { handleSubmit };
};
