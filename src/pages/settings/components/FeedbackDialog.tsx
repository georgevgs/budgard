import { useTranslation } from 'react-i18next';
import { Button } from '@/common/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/common/ui/dialog';
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

interface Props {
  open: boolean;
  kind: FeedbackKind;
  onClose: () => void;
}

const FeedbackDialog = ({ open, kind, onClose }: Props) => {
  const { t } = useTranslation();
  const feedback = useFeedbackForm({ kind, onSubmitted: onClose });

  return (
    <Dialog open={open} onOpenChange={(next) => closeWhenNeeded(next, onClose)}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{t(`settings.feedback.${kind}Title`)}</DialogTitle>
          <DialogDescription>
            {t(`settings.feedback.${kind}Description`)}
          </DialogDescription>
        </DialogHeader>
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
                disabled={
                  !feedback.form.formState.isValid || feedback.isSubmitting
                }
              >
                {getSubmitLabel(feedback.isSubmitting, t)}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default FeedbackDialog;

// --- Helpers ---

type TFunc = (key: string) => string;

const closeWhenNeeded = (open: boolean, onClose: () => void) => {
  if (!open) {
    onClose();
  }
};

const getSubmitLabel = (isSubmitting: boolean, t: TFunc): string => {
  if (isSubmitting) {
    return t('settings.feedback.sending');
  }

  return t('settings.feedback.submit');
};
