import { useTranslation } from 'react-i18next';
import { Button } from '@/common/ui/button';
import type { TranslateFunction } from '@/constants/translate';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/common/ui/form';
import { Textarea } from '@/common/ui/textarea';
import { useFeedbackForm } from '@/pages/settings/hooks/useFeedbackForm';
import type { FeedbackKind } from '@/common/api/feedbackService';

type FeedbackFormProps = {
  kind: FeedbackKind;
  onClose: () => void;
};

export const FeedbackForm = ({ kind, onClose }: FeedbackFormProps) => {
  const { t } = useTranslation();
  const feedback = useFeedbackForm({ kind, onSubmitted: onClose });

  return (
    <Form {...feedback.form}>
      <form onSubmit={feedback.submit} className="space-y-5">
        <FormField
          control={feedback.form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('settings.feedback.messageLabel')}</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  maxLength={2000}
                  rows={7}
                  placeholder={t('settings.feedback.placeholder')}
                  autoFocus
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            disabled={!feedback.form.formState.isValid || feedback.isSubmitting}
          >
            {getSubmitLabel(feedback.isSubmitting, t)}
          </Button>
        </div>
      </form>
    </Form>
  );
};

const getSubmitLabel = (
  isSubmitting: boolean,
  t: TranslateFunction,
): string => {
  if (isSubmitting) {
    return t('settings.feedback.sending');
  }

  return t('settings.feedback.submit');
};
