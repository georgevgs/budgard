import type { ReactNode } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDialogDirty } from '@/hooks/useDialogDirty';
import { parseISO } from 'date-fns';
import { useTranslation } from 'react-i18next';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import {
  DialogTitle,
  DialogHeader,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import GoalFormFields from '@/components/goals/GoalFormFields';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrencyInput } from '@/lib/utils';
import { goalSchema, type GoalFormData } from '@/lib/validations';
import type { Goal } from '@/types/Goal';

const DEFAULT_GOAL_COLOR = '#f97316';
const DEFAULT_GOAL_ICON = 'target';

type Props = {
  goal?: Goal;
  onSubmit: (values: GoalFormData) => Promise<void>;
  onClose: () => void;
}

const GoalForm = ({ goal, onSubmit, onClose }: Props) => {
  const { t } = useTranslation();
  const { session } = useAuth();

  const form = useForm<GoalFormData>({
    resolver: zodResolver(goalSchema),
    mode: 'onTouched',
    defaultValues: {
      name: goal?.name ?? '',
      target_amount: resolveTargetAmount(goal),
      deadline: resolveDeadline(goal),
      source_type: goal?.source_type ?? 'net_delta',
      category_id: goal?.category_id ?? undefined,
      tag_id: goal?.tag_id ?? undefined,
      icon: goal?.icon ?? DEFAULT_GOAL_ICON,
      color: goal?.color ?? DEFAULT_GOAL_COLOR,
    },
  });

  useDialogDirty(form.formState.isDirty);

  const sourceType = useWatch({
    control: form.control,
    name: 'source_type',
  });
  const isEditing = Boolean(goal);

  const handleSubmit = async (values: GoalFormData) => {
    if (!session?.user?.id) return;
    await onSubmit(values);
  };

  return (
    <>
      <div
        className="flex justify-center pt-3 pb-2 sm:hidden shrink-0"
        data-drag-handle
      >
        <div className="w-12 h-1.5 bg-muted-foreground/20 rounded-full" />
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="flex flex-col flex-1 min-h-0"
        >
          <div
            className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 overscroll-contain"
            style={{ touchAction: 'pan-y' }}
          >
            <DialogHeader className="pb-4" data-draggable-area>
              <DialogTitle className="text-xl">
                {renderTitle(isEditing, t)}
              </DialogTitle>
              <DialogDescription>
                {t('goals.formDescription')}
              </DialogDescription>
            </DialogHeader>

            <GoalFormFields form={form} sourceType={sourceType} />
          </div>

          <div className="flex justify-end gap-2 px-4 sm:px-6 py-3 border-t border-border/50 shrink-0">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting || !form.formState.isValid}>
              {renderSubmitLabel(form.formState.isSubmitting, isEditing, t)}
            </Button>
          </div>
        </form>
      </Form>
    </>
  );
}

export default GoalForm;

// --- Helpers ---

type TranslateFunction = (
  key: string,
  options?: Record<string, unknown>,
) => string;

const resolveTargetAmount = (goal: Goal | undefined): string => {
  if (!goal) {
    return '';
  }

  return formatCurrencyInput(goal.target_amount.toString().replace('.', ','));
};

const resolveDeadline = (goal: Goal | undefined): Date | undefined => {
  if (!goal?.deadline) {
    return undefined;
  }

  return parseISO(goal.deadline);
};

const renderTitle = (isEditing: boolean, t: TranslateFunction) => {
  if (isEditing) return t('goals.editTitle');

  return t('goals.createTitle');
}

const renderSubmitLabel = (
  isSubmitting: boolean,
  isEditing: boolean,
  t: TranslateFunction,
): ReactNode => {
  if (isSubmitting) {
    return (
      <>
        <Loader2 className="h-4 w-4 animate-spin" />
        {t('common.saving')}
      </>
    );
  }

  if (isEditing) return t('common.update');

  return t('goals.create');
}
