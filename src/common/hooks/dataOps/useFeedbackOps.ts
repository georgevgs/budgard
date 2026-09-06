import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { captureException } from '@/config/sentry';
import { useToast } from '@/common/hooks/useToast';
import { haptics } from '@/constants/haptics';
import { feedbackService, type FeedbackKind } from '@/common/api/feedbackService';

type FeedbackInput = {
  kind: FeedbackKind;
  message: string;
  route: string;
};

export const useFeedbackOps = () => {
  const { t } = useTranslation();
  const { toast } = useToast();

  const submitFeedback = useCallback(
    async (input: FeedbackInput) => {
      try {
        await feedbackService.create({
          ...input,
          appVersion: __APP_VERSION__,
        });
        haptics.success();
        toast({
          variant: 'success',
          description: t('settings.feedback.success'),
        });
      } catch (error) {
        haptics.error();
        captureException(error, {
          tags: { operation: 'submitFeedback', kind: input.kind },
        });
        toast({
          variant: 'destructive',
          description: t('settings.feedback.failed'),
        });
        throw error;
      }
    },
    [t, toast],
  );

  return { submitFeedback };
};
